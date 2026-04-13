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
      identifier: 'sistema-financiero-db',
      config: {
        institutionName: 'Sistema Financiero DB',
        logoBase64: '',
        credits: [
          { id: 1, name: 'Crédito de Consumo', minRate: 10, maxRate: 16.5, minAmount: 500, maxAmount: 20000 },
          { id: 2, name: 'Crédito Hipotecario', minRate: 8, maxRate: 11, minAmount: 20000, maxAmount: 500000 },
          { id: 3, name: 'Crédito Educativo', minRate: 7, maxRate: 9, minAmount: 1000, maxAmount: 30000 },
        ],
        investments: [
          { id: 1, name: 'Corto Plazo', minAmount: 100, maxAmount: 10000, minTerm: 1, maxTerm: 12 },
          { id: 2, name: 'Largo Plazo', minAmount: 5000, maxAmount: 100000, minTerm: 12, maxTerm: 120 },
          { id: 3, name: 'Ahora Flex', minAmount: 50, maxAmount: 50000, minTerm: 1, maxTerm: 60 }
        ],
        insuranceRate: 0.1,
        donationSolca: 2.0,
        indirectCharges: [
          {
            id: 1,
            name: 'Seguro de Desgravamen',
            chargeType: 'PERCENTAGE',
            value: 0.1,
            calculationBase: 'CURRENT_BALANCE',
            isActive: true
          },
          {
            id: 2,
            name: 'Donación SOLCA',
            chargeType: 'PERCENTAGE',
            value: 2.0,
            calculationBase: 'INITIAL_BALANCE',
            isActive: true
          }
        ]
      }
    }
  ];

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl!, supabaseKey!);
      console.log("Conectado a Supabase exitosamente.");
    } else {
      console.log("Modo memoria activado para pruebas locales.");
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
      const { data: investmentsData } = await this.supabase.from('investments').select('*').eq('org_id', orgId);
      
      if (!orgData) throw new NotFoundException('Organización no encontrada');
      
      // Try to get indirect charges from a separate table, fallback to JSON field
      let indirectCharges = [];
      try {
        console.log(`Backend - Querying indirect_charges for org: ${orgId}`);
        const { data: chargesData, error } = await this.supabase.from('indirect_charges').select('*').eq('org_id', orgId);
        console.log(`Backend - chargesData:`, chargesData);
        console.log(`Backend - error:`, error);
        
        if (chargesData && chargesData.length > 0) {
          console.log(`Backend - Found ${chargesData.length} indirect charges`);
          indirectCharges = chargesData.map(c => ({
            id: c.id,
            name: c.name,
            chargeType: c.charge_type,
            value: Number(c.value),
            calculationBase: c.calculation_base,
            isActive: c.is_active
          }));
          console.log(`Backend - Mapped charges:`, indirectCharges);
        } else {
          console.log(`Backend - No charges found, checking JSON field`);
          if (orgData.indirect_charges) {
            indirectCharges = orgData.indirect_charges;
            console.log(`Backend - Using JSON field:`, indirectCharges);
          }
        }
      } catch (error) {
        console.log(`Backend - Error querying indirect_charges table:`, error);
        // If indirect_charges table doesn't exist, try JSON field
        if (orgData.indirect_charges) {
          indirectCharges = orgData.indirect_charges;
          console.log(`Backend - Using JSON field fallback:`, indirectCharges);
        }
      }
      
      return {
        institutionName: orgData.institution_name || 'Sistema Financiero DB',
        logoBase64: orgData.logo_base_64,
        insuranceRate: Number(orgData.insurance_rate),
        donationSolca: Number(orgData.donation_solca),
        credits: (creditsData || []).map(c => ({
          id: c.id,
          name: c.name,
          minRate: Number(c.min_rate),
          maxRate: Number(c.max_rate),
          minAmount: Number(c.min_amount),
          maxAmount: Number(c.max_amount)
        })),
        investments: (investmentsData || []).map(i => ({
          id: i.id,
          name: i.name,
          minAmount: Number(i.min_amount),
          maxAmount: Number(i.max_amount),
          minTerm: Number(i.min_term),
          maxTerm: Number(i.max_term)
        })),
        indirectCharges
      };
    } else {
      const org = this.memoryOrgs.find(o => o.id === orgId);
      if (!org) throw new NotFoundException('Organización no encontrada');
      return org.config;
    }
  }

  async updateConfig(orgId: string, newConfig: any) {
    if (this.supabase) {
      const { error: updateError } = await this.supabase.from('organizations').update({
        institution_name: newConfig.institutionName,
        logo_base_64: newConfig.logoBase64 || '',
        insurance_rate: newConfig.insuranceRate,
        donation_solca: newConfig.donationSolca,
        indirect_charges: newConfig.indirectCharges || []
      }).eq('id', orgId);
      
      if (updateError) {
        console.error("Supabase Update Error:", updateError);
        // Fallback silente o lanzar exepcion según diseño backend, aquí logeamos para no romper frontend si hay mismatch.
      }

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

      await this.supabase.from('investments').delete().eq('org_id', orgId);
      if (newConfig.investments && newConfig.investments.length > 0) {
        const investmentsToInsert = newConfig.investments.map((i: any) => ({
          org_id: orgId,
          name: i.name,
          min_amount: i.minAmount,
          max_amount: i.maxAmount,
          min_term: i.minTerm,
          max_term: i.maxTerm
        }));
        await this.supabase.from('investments').insert(investmentsToInsert);
      }

      // Handle indirect charges - try to use separate table first, fallback to JSON
      try {
        await this.supabase.from('indirect_charges').delete().eq('org_id', orgId);
        if (newConfig.indirectCharges && newConfig.indirectCharges.length > 0) {
          const chargesToInsert = newConfig.indirectCharges.map((c: any) => ({
            org_id: orgId,
            name: c.name,
            charge_type: c.chargeType,
            value: c.value,
            calculation_base: c.calculationBase,
            is_active: c.isActive
          }));
          await this.supabase.from('indirect_charges').insert(chargesToInsert);
        }
      } catch (error) {
        // If indirect_charges table doesn't exist, the JSON field in organizations table will be used
        console.log('indirect_charges table not found, using JSON field');
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
      const { data, error } = await this.supabase.from('organizations').select('id, admin_user, institution_name');
      const result = data?.map(o => ({
        id: o.id,
        adminUser: o.admin_user,
        institutionName: o.institution_name
      })) || [];
      return result;
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
      const identifier = this.generateIdentifier(data.institutionName);
      const { data: insertedOrg } = await this.supabase.from('organizations').insert({
        admin_user: data.adminUser,
        admin_pass: data.adminPass,
        institution_name: data.institutionName,
        identifier: identifier
      }).select().single();
      
      return insertedOrg;
    } else {
      const identifier = this.generateIdentifier(data.institutionName);
      const newOrg = {
        id: `11111111-1111-1111-1111-${Math.floor(Math.random() * 1000000000000)}`,
        adminUser: data.adminUser,
        adminPass: data.adminPass,
        identifier: identifier,
        config: {
          institutionName: data.institutionName,
          logoBase64: '',
          credits: [],
          investments: [],
          insuranceRate: 0,
          donationSolca: 0,
          indirectCharges: []
        }
      };
      this.memoryOrgs.push(newOrg);
      return newOrg;
    }
  }

  // Generar identificador URL-friendly a partir del nombre
  private generateIdentifier(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  }

  // Buscar organización por identificador URL-friendly
  async getOrgByIdentifier(identifier: string) {
    if (this.supabase) {
      const { data } = await this.supabase
        .from('organizations')
        .select('id')
        .eq('identifier', identifier)
        .maybeSingle();
      
      if (data) {
        return { orgId: data.id };
      }
      return null;
    } else {
      const org = this.memoryOrgs.find(o => o.identifier === identifier);
      if (org) {
        return { orgId: org.id };
      }
      return null;
    }
  }

  // Eliminar organización (solo SuperAdmin)
  async deleteOrganization(orgId: string) {
    if (this.supabase) {
      // Eliminar en orden para evitar problemas de foreign keys
      try {
        // 1. Eliminar créditos asociados
        await this.supabase.from('credits').delete().eq('org_id', orgId);
        
        // 2. Eliminar inversiones asociadas
        await this.supabase.from('investments').delete().eq('org_id', orgId);
        
        // 3. Eliminar cobros indirectos asociados
        try {
          await this.supabase.from('indirect_charges').delete().eq('org_id', orgId);
        } catch (error) {
          // Table might not exist, continue
          console.log('indirect_charges table not found, continuing');
        }
        
        // 4. Eliminar la organización
        const { error: deleteError } = await this.supabase
          .from('organizations')
          .delete()
          .eq('id', orgId);
        
        if (deleteError) {
          throw new Error('Error al eliminar organización: ' + deleteError.message);
        }
        
        return { success: true, message: 'Organización eliminada exitosamente' };
      } catch (error) {
        console.error('Error detallado al eliminar organización:', error);
        throw new Error('Error al eliminar organización y sus datos asociados');
      }
    } else {
      const orgIndex = this.memoryOrgs.findIndex(o => o.id === orgId);
      if (orgIndex === -1) {
        throw new NotFoundException('Organización no encontrada');
      }
      
      // No permitir eliminar la organización por defecto
      if (this.memoryOrgs[orgIndex].id === '11111111-1111-1111-1111-111111111111') {
        throw new Error('No se puede eliminar la organización por defecto');
      }
      
      this.memoryOrgs.splice(orgIndex, 1);
      return { success: true, message: 'Organización eliminada exitosamente' };
    }
  }
}
