import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService, type PublicUser } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  private readonly cookieName: string;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService,
  ) {
    this.cookieName = config.get<string>('SESSION_COOKIE') ?? 'coretax_session';
  }

  /** Open a session for `user` and set the httpOnly session cookie. */
  private async startSession(user: PublicUser, res: Response) {
    const { token, expiresAt } = await this.auth.createSession(user.id);

    res.cookie(this.cookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: expiresAt,
    });

    return {
      ok: true,
      user: {
        id: user.id,
        name: user.full_name,
        username: user.username,
        npwp: user.npwp,
        role: user.role,
      },
    };
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!dto.captcha) {
      throw new UnauthorizedException('Verifikasi wajib dilakukan.');
    }
    const user = await this.auth.validateUser(dto.username.trim(), dto.password);
    return this.startSession(user, res);
  }

  /** Self-service sign-up; signs the new taxpayer straight in. */
  @Post('register')
  @HttpCode(201)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!dto.captcha) {
      throw new UnauthorizedException('Verifikasi wajib dilakukan.');
    }
    const user = await this.auth.register({
      username: dto.username.trim(),
      password: dto.password,
      fullName: dto.fullName.trim(),
      email: dto.email.trim().toLowerCase(),
      npwp: dto.npwp,
    });
    return this.startSession(user, res);
  }

  @Get('me')
  async me(@Req() req: Request) {
    const token = req.cookies?.[this.cookieName] as string | undefined;
    const user = await this.auth.userForToken(token);
    if (!user) throw new UnauthorizedException('Sesi tidak valid.');
    return {
      id: user.id,
      name: user.full_name,
      username: user.username,
      npwp: user.npwp,
      email: user.email,
      role: user.role,
    };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[this.cookieName] as string | undefined;
    await this.auth.destroySession(token);
    res.clearCookie(this.cookieName, { path: '/' });
    return { ok: true };
  }
}
