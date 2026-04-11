import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class AppService {
  private supabase: SupabaseClient | null = null;

  // Fallback DB en caso de no conectar Supabase pronto
  private memoryOrgs = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      adminUser: 'admin_financo',
      adminPass: 'admin123',
      config: {
        institutionName: 'Sistema Financiero DB',
        logoBase64: '',
        primaryColor: '#E6621F',
        credits: [
          { id: 1, name: 'Crédito de Consumo', minRate: 10, maxRate: 16.5, minAmount: 500, maxAmount: 20000 },
          { id: 2, name: 'Crédito Hipotecario', minRate: 8, maxRate: 11, minAmount: 20000, maxAmount: 500000 },
          { id: 3, name: 'Crédito Educativo', minRate: 7, maxRate: 9, minAmount: 1000, maxAmount: 30000 },
        ],
        insuranceRate: 0.1,
        donationSolca: 2.0
      }
    }
  ];

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log("Conectado a Supabase exitosamente.");
    } else {
      console.log("⚠️ No se encontraron variables SUPABASE_URL ni SUPABASE_KEY. Usando base de datos en memoria.");
    }
  }

  async login(user: string, pass: string) {
    if (this.supabase) {
      // 1. Validar primero si existe en la tabla superadmins
      const { data: saData } = await this.supabase
        .from('superadmins')
        .select('id')
        .eq('username', user)
        .eq('password', pass)
        .maybeSingle();

      if (saData) {
        return { token: 'superadmin-token', role: 'SUPERADMIN', success: true };
      }

      // 2. Si no es súper admin, validar si es administrador de cooperativa
      const { data: orgData } = await this.supabase
        .from('organizations')
        .select('id')
        .eq('admin_user', user)
        .eq('admin_pass', pass)
        .maybeSingle();
      
      if (orgData) return { token: `admin-token-${orgData.id}`, role: 'ADMIN', orgId: orgData.id, success: true };
    } else {
      // Modo memoria fallback para pruebas sin red
      // Solo en memoria dejamos este backdoor provisional
      if (user === '1850149905' && pass === 'Dalembertbravo1919') {
        return { token: 'superadmin-token', role: 'SUPERADMIN', success: true };
      }
      const org = this.memoryOrgs.find(o => o.adminUser === user && o.adminPass === pass);
      if (org) return { token: `admin-token-${org.id}`, role: 'ADMIN', orgId: org.id, success: true };
    }

    throw new UnauthorizedException('Credenciales incorrectas');
  }

  // --- ADMIN METHODS ---
  async getConfig(orgId: string) {
    if (this.supabase) {
      const { data: orgData } = await this.supabase.from('organizations').select('*').eq('id', orgId).single();
      const { data: creditsData } = await this.supabase.from('credits').select('*').eq('org_id', orgId);
      
      if (!orgData) throw new NotFoundException('Organización no encontrada');
      
      const finalName = (
        orgData.institution_name === 'Financiera Financo' || 
        orgData.institution_name === 'Cooperativa Financo' ||
        orgData.institution_name === 'Banco Pichincha'
      ) 
        ? 'Sistema Financiero DB' 
        : orgData.institution_name;
        
      return {
        institutionName: finalName,
        logoBase64: orgData.logo_base_64,
        primaryColor: orgData.primary_color || '#E6621F',
        insuranceRate: Number(orgData.insurance_rate),
        donationSolca: Number(orgData.donation_solca),
        credits: (creditsData || []).map(c => ({
          id: c.id,
          name: c.name,
          minRate: Number(c.min_rate),
          maxRate: Number(c.max_rate),
          minAmount: Number(c.min_amount),
          maxAmount: Number(c.max_amount)
        }))
      };
    } else {
      const org = this.memoryOrgs.find(o => o.id === orgId);
      if (!org) throw new NotFoundException('Organización no encontrada');
      return org.config;
    }
  }

  async updateConfig(orgId: string, newConfig: any) {
    if (this.supabase) {
      await this.supabase.from('organizations').update({
        institution_name: newConfig.institutionName,
        logo_base_64: newConfig.logoBase64 || '',
        primary_color: newConfig.primaryColor,
        insurance_rate: newConfig.insuranceRate,
        donation_solca: newConfig.donationSolca
      }).eq('id', orgId);

      // Handle credits 
      // For simplicity in sync, remove old credits and insert new ones
      await this.supabase.from('credits').delete().eq('org_id', orgId);
      if (newConfig.credits && newConfig.credits.length > 0) {
        const creditsToInsert = newConfig.credits.map((c: any) => ({
          org_id: orgId,
          name: c.name,
          min_rate: c.minRate,
          max_rate: c.maxRate,
          min_amount: c.minAmount,
          max_amount: c.maxAmount
        }));
        await this.supabase.from('credits').insert(creditsToInsert);
      }
      return newConfig;
    } else {
      const orgIndex = this.memoryOrgs.findIndex(o => o.id === orgId);
      if (orgIndex === -1) throw new NotFoundException('Organización no encontrada');
      this.memoryOrgs[orgIndex].config = { ...this.memoryOrgs[orgIndex].config, ...newConfig };
      return this.memoryOrgs[orgIndex].config;
    }
  }

  // --- SUPERADMIN METHODS ---
  async getAllOrganizations() {
    if (this.supabase) {
      const { data } = await this.supabase.from('organizations').select('id, admin_user, institution_name');
      return data?.map(o => ({
        id: o.id,
        adminUser: o.admin_user,
        institutionName: o.institution_name
      })) || [];
    } else {
      return this.memoryOrgs.map(o => ({
        id: o.id,
        adminUser: o.adminUser,
        institutionName: o.config.institutionName
      }));
    }
  }

  async createOrganization(data: any) {
    if (this.supabase) {
      const { data: insertedOrg } = await this.supabase.from('organizations').insert({
        admin_user: data.adminUser,
        admin_pass: data.adminPass,
        institution_name: data.institutionName
      }).select().single();
      
      return insertedOrg;
    } else {
      const newOrg = {
        id: `11111111-1111-1111-1111-${Math.floor(Math.random() * 1000000000000)}`,
        adminUser: data.adminUser,
        adminPass: data.adminPass,
        config: {
          institutionName: data.institutionName,
          logoBase64: '',
          primaryColor: '#E6621F',
          credits: [],
          insuranceRate: 0,
          donationSolca: 0
        }
      };
      this.memoryOrgs.push(newOrg);
      return newOrg;
    }
  }
}
