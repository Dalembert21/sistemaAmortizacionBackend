import { Controller, Get, Post, Body, HttpCode, HttpStatus, Param } from '@nestjs/common';
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
}
