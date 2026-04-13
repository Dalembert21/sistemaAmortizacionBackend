import { Controller, Get, Post, Delete, Body, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { user: string, pass: string }) {
    return await this.appService.login(body.user, body.pass);
  }

  // Rutas del Admin
  @Get('config/:orgId')
  async getConfig(@Param('orgId') orgId: string) {
    return await this.appService.getConfig(orgId);
  }

  @Post('config/:orgId')
  @HttpCode(HttpStatus.OK)
  async updateConfig(@Param('orgId') orgId: string, @Body() body: any) {
    return await this.appService.updateConfig(orgId, body);
  }

  // Rutas del SuperAdmin
  @Get('orgs')
  async getOrgs() {
    return await this.appService.getAllOrganizations();
  }

  @Post('orgs')
  async createOrg(@Body() body: any) {
    return await this.appService.createOrganization(body);
  }

  @Delete('orgs/:orgId')
  async deleteOrg(@Param('orgId') orgId: string) {
    return await this.appService.deleteOrganization(orgId);
  }

  // Ruta para buscar organización por identificador (URL-friendly)
  @Get('org/by-name/:identifier')
  async getOrgByIdentifier(@Param('identifier') identifier: string) {
    return await this.appService.getOrgByIdentifier(identifier);
  }

  // Rutas para SuperAdmins (ven todas las inversiones de todas las instituciones)
  @Get('investment/all/history')
  async getAllInvestmentHistory() {
    return await this.appService.getAllInvestmentHistory();
  }

  @Get('investment/all/stats')
  async getAllInvestmentStats() {
    return await this.appService.getAllInvestmentStats();
  }

  // Rutas para historial de inversiones
  @Post('investment/:orgId')
  @HttpCode(HttpStatus.OK)
  async saveInvestment(@Param('orgId') orgId: string, @Body() body: any) {
    return await this.appService.saveInvestmentRecord(orgId, body);
  }

  @Get('investment/:orgId/history')
  async getInvestmentHistory(@Param('orgId') orgId: string, @Body() body: { filters?: any }) {
    return await this.appService.getInvestmentHistory(orgId, body?.filters);
  }

  @Get('investment/:orgId/stats')
  async getInvestmentStats(@Param('orgId') orgId: string) {
    return await this.appService.getInvestmentHistoryStats(orgId);
  }
}
