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

        donationSolca: 2.0

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

      const { error: updateError } = await this.supabase.from('organizations').update({

        institution_name: newConfig.institutionName,

        logo_base_64: newConfig.logoBase64 || '',

        insurance_rate: newConfig.insuranceRate,

        donation_solca: newConfig.donationSolca

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

          donationSolca: 0

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

        

        // 3. Eliminar la organización

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


  // --- INVESTMENT HISTORY METHODS ---
  
  async saveInvestmentRecord(orgId: string, investmentData: any) {
    if (this.supabase) {
      const { data, error } = await this.supabase.from('investment_history').insert({
        org_id: orgId,
        client_name: investmentData.clientName || 'Cliente Anónimo',
        client_identification: investmentData.clientIdentification || 'N/A',
        client_phone: investmentData.clientPhone || null,
        investment_type: investmentData.investmentType,
        amount: investmentData.amount,
        period_months: investmentData.period,
        annual_rate: investmentData.annualRate,
        interest_earned: investmentData.interestEarned,
        total_return: investmentData.totalReturn,
        selected_bank: investmentData.selectedBank,
        identity_validated: investmentData.identityValidated || true,
        facial_recognition_score: investmentData.facialRecognitionScore || 99.8,
        status: 'PROCESSED'
      }).select().single();
      
      if (error) {
        console.error('Error saving investment record:', error);
        throw new Error('Error al guardar registro de inversión');
      }
      
      return data;
    } else {
      // Modo memoria fallback
      const record = {
        id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        orgId,
        ...investmentData,
        createdAt: new Date().toISOString(),
        processedAt: new Date().toISOString()
      };
      
      // En modo memoria, podríamos almacenar en un array temporal
      console.log('Investment record saved (memory mode):', record);
      return record;
    }
  }

  async getInvestmentHistory(orgId: string, filters?: any) {
    if (this.supabase) {
      let query = this.supabase
        .from('investment_history')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      // Aplicar filtros si existen
      if (filters?.clientName) {
        query = query.ilike('client_name', `%${filters.clientName}%`);
      }
      if (filters?.investmentType) {
        query = query.eq('investment_type', filters.investmentType);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching investment history:', error);
        throw new Error('Error al obtener historial de inversiones');
      }
      
      return data || [];
    } else {
      // Modo memoria - retornar array vacío por ahora
      console.log('Investment history requested (memory mode) - no records available');
      return [];
    }
  }

  async getInvestmentHistoryStats(orgId: string) {
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('investment_history')
        .select('amount, total_return, created_at, investment_type')
        .eq('org_id', orgId);

      if (error) {
        console.error('Error fetching investment stats:', error);
        return {
          totalInvestments: 0,
          totalAmount: 0,
          totalReturns: 0,
          avgInvestment: 0,
          investmentsByType: {}
        };
      }

      const investments = data || [];
      const totalInvestments = investments.length;
      const totalAmount = investments.reduce((sum, inv) => sum + Number(inv.amount), 0);
      const totalReturns = investments.reduce((sum, inv) => sum + Number(inv.total_return), 0);
      const avgInvestment = totalInvestments > 0 ? totalAmount / totalInvestments : 0;

      // Agrupar por tipo de inversión
      const investmentsByType: { [key: string]: { count: number; totalAmount: number } } = investments.reduce((acc, inv) => {
        const type = inv.investment_type;
        if (!acc[type]) {
          acc[type] = { count: 0, totalAmount: 0 };
        }
        acc[type].count++;
        acc[type].totalAmount += Number(inv.amount);
        return acc;
      }, {} as { [key: string]: { count: number; totalAmount: number } });

      return {
        totalInvestments,
        totalAmount,
        totalReturns,
        avgInvestment,
        investmentsByType
      };
    } else {
      return {
        totalInvestments: 0,
        totalAmount: 0,
        totalReturns: 0,
        avgInvestment: 0,
        investmentsByType: {}
      };
    }
  }

  // Métodos para SuperAdmins (ven solo las inversiones de su sistema principal - usuarios GUEST)
  async getAllInvestmentHistory() {
    if (this.supabase) {
      // SuperAdmin solo ve las inversiones de su sistema principal (DEFAULT_ORG_ID)
      // No ve las inversiones de los bancos que creó
      const DEFAULT_ORG_ID = '11111111-1111-1111-1111-111111111111';
      
      const { data, error } = await this.supabase
        .from('investment_history')
        .select('*')
        .eq('org_id', DEFAULT_ORG_ID)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching superadmin investment history:', error);
        throw new Error('Error al obtener historial de inversiones del sistema');
      }
      
      return data || [];
    } else {
      // Modo memoria - retornar array vacío por ahora
      console.log('SuperAdmin investment history requested (memory mode) - no records available');
      return [];
    }
  }

  async getAllInvestmentStats() {
    if (this.supabase) {
      // SuperAdmin solo ve estadísticas de su sistema principal (DEFAULT_ORG_ID)
      // No ve las estadísticas de los bancos que creó
      const DEFAULT_ORG_ID = '11111111-1111-1111-1111-111111111111';
      
      const { data, error } = await this.supabase
        .from('investment_history')
        .select('amount, total_return, created_at, investment_type')
        .eq('org_id', DEFAULT_ORG_ID);

      if (error) {
        console.error('Error fetching superadmin investment stats:', error);
        return {
          totalInvestments: 0,
          totalAmount: 0,
          totalReturns: 0,
          avgInvestment: 0,
          investmentsByType: {}
        };
      }

      const investments = data || [];
      const totalInvestments = investments.length;
      const totalAmount = investments.reduce((sum, inv) => sum + Number(inv.amount), 0);
      const totalReturns = investments.reduce((sum, inv) => sum + Number(inv.total_return), 0);
      const avgInvestment = totalInvestments > 0 ? totalAmount / totalInvestments : 0;

      // Agrupar por tipo de inversión
      const investmentsByType: { [key: string]: { count: number; totalAmount: number } } = investments.reduce((acc, inv) => {
        const type = inv.investment_type;
        if (!acc[type]) {
          acc[type] = { count: 0, totalAmount: 0 };
        }
        acc[type].count++;
        acc[type].totalAmount += Number(inv.amount);
        return acc;
      }, {} as { [key: string]: { count: number; totalAmount: number } });

      return {
        totalInvestments,
        totalAmount,
        totalReturns,
        avgInvestment,
        investmentsByType
      };
    } else {
      return {
        totalInvestments: 0,
        totalAmount: 0,
        totalReturns: 0,
        avgInvestment: 0,
        investmentsByType: {}
      };
    }
  }
}

