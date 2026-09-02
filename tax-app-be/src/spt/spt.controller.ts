import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AuthService, PublicUser } from '../auth/auth.service';
import { CreateSptDto, RejectSptDto, UpdateSptDto } from './dto/spt.dto';
import { SptService } from './spt.service';

@Controller('spt')
export class SptController {
  private readonly cookieName: string;

  constructor(
    private readonly spt: SptService,
    private readonly auth: AuthService,
    config: ConfigService,
  ) {
    this.cookieName = config.get<string>('SESSION_COOKIE') ?? 'coretax_session';
  }

  private async currentUser(req: Request): Promise<PublicUser> {
    const token = req.cookies?.[this.cookieName] as string | undefined;
    const user = await this.auth.userForToken(token);
    if (!user) throw new UnauthorizedException('Sesi tidak valid.');
    return user;
  }

  private async requireAdmin(req: Request): Promise<PublicUser> {
    const user = await this.currentUser(req);
    if (user.role !== 'admin') {
      throw new ForbiddenException('Khusus petugas.');
    }
    return user;
  }

  // ---- Taxpayer ----

  @Get()
  async list(@Req() req: Request) {
    const user = await this.currentUser(req);
    return this.spt.listForUser(user.id);
  }

  @Post()
  async create(@Req() req: Request, @Body() dto: CreateSptDto) {
    const user = await this.currentUser(req);
    return this.spt.createDraft(user.id, dto.taxYear, dto.formType ?? '1770 S');
  }

  @Get(':id')
  async getOne(@Req() req: Request, @Param('id') id: string) {
    const user = await this.currentUser(req);
    return this.spt.getOne(id, user.id, user.role === 'admin');
  }

  @Put(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateSptDto,
  ) {
    const user = await this.currentUser(req);
    return this.spt.updateDraft(id, user.id, dto.data);
  }

  @Post(':id/submit')
  @HttpCode(200)
  async submit(@Req() req: Request, @Param('id') id: string) {
    const user = await this.currentUser(req);
    return this.spt.submit(id, user.id);
  }

  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    const user = await this.currentUser(req);
    return this.spt.deleteDraft(id, user.id);
  }

  // ---- Admin ----

  @Get('admin/all')
  async adminList(@Req() req: Request, @Query('status') status?: string) {
    await this.requireAdmin(req);
    return this.spt.listAll(status);
  }

  @Post(':id/approve')
  @HttpCode(200)
  async approve(@Req() req: Request, @Param('id') id: string) {
    const admin = await this.requireAdmin(req);
    return this.spt.approve(id, admin.id);
  }

  @Post(':id/reject')
  @HttpCode(200)
  async reject(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: RejectSptDto,
  ) {
    const admin = await this.requireAdmin(req);
    return this.spt.reject(id, admin.id, dto.reason);
  }
}
