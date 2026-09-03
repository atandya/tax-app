import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller';
import { AuthService, type PublicUser } from './auth.service';

const DEMO_USER: PublicUser = {
  id: 'u-demo',
  username: '0912345678901234',
  full_name: 'Synthetic Taxpayer',
  npwp: null,
  email: null,
  role: 'wajib_pajak',
};

function build(
  env: Record<string, string | undefined>,
  user: PublicUser | null = DEMO_USER,
) {
  const auth = {
    findByUsername: vi.fn(async () => user),
    createSession: vi.fn(async () => ({
      token: 'session-token',
      expiresAt: new Date('2030-01-01'),
    })),
  };
  const config = { get: (key: string) => env[key] } as unknown as ConfigService;
  const cookie = vi.fn();
  const res = { cookie } as unknown as Response;
  const controller = new AuthController(auth as unknown as AuthService, config);
  return { controller, auth, res, cookie };
}

describe('POST /auth/demo-login', () => {
  it('is not found when DEMO_LOGIN_ENABLED is unset', async () => {
    const { controller, auth, res } = build({});
    await expect(controller.demoLogin(res)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(auth.findByUsername).not.toHaveBeenCalled();
  });

  it('is not found when DEMO_LOGIN_ENABLED is anything but "true"', async () => {
    const { controller, res } = build({ DEMO_LOGIN_ENABLED: 'yes' });
    await expect(controller.demoLogin(res)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('is not found when DEMO_LOGIN_ENABLED is not a string', async () => {
    const { controller, auth, res } = build({
      DEMO_LOGIN_ENABLED: true as unknown as string,
    });
    await expect(controller.demoLogin(res)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(auth.findByUsername).not.toHaveBeenCalled();
  });

  it('opens a session for the default demo username when enabled', async () => {
    const { controller, auth, res, cookie } = build({
      DEMO_LOGIN_ENABLED: 'true',
    });
    const body = await controller.demoLogin(res);
    expect(auth.findByUsername).toHaveBeenCalledWith('0912345678901234');
    expect(auth.createSession).toHaveBeenCalledWith('u-demo');
    expect(cookie).toHaveBeenCalledWith('coretax_session', 'session-token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      expires: new Date('2030-01-01'),
    });
    expect(body).toEqual({
      ok: true,
      user: {
        id: 'u-demo',
        name: 'Synthetic Taxpayer',
        username: '0912345678901234',
        npwp: null,
        role: 'wajib_pajak',
      },
    });
  });

  it('honours DEMO_LOGIN_USERNAME', async () => {
    const { controller, auth, res } = build({
      DEMO_LOGIN_ENABLED: 'true',
      DEMO_LOGIN_USERNAME: '1111111111111111',
    });
    await controller.demoLogin(res);
    expect(auth.findByUsername).toHaveBeenCalledWith('1111111111111111');
  });

  it('falls back to the default username when DEMO_LOGIN_USERNAME is empty', async () => {
    const { controller, auth, res } = build({
      DEMO_LOGIN_ENABLED: 'true',
      DEMO_LOGIN_USERNAME: '',
    });
    await controller.demoLogin(res);
    expect(auth.findByUsername).toHaveBeenCalledWith('0912345678901234');
  });

  it('is not found when the demo user is missing', async () => {
    const { controller, auth, res } = build(
      { DEMO_LOGIN_ENABLED: 'true' },
      null,
    );
    await expect(controller.demoLogin(res)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(auth.createSession).not.toHaveBeenCalled();
  });

  it('is not found when the demo user is not a taxpayer', async () => {
    const { controller, auth, res } = build(
      { DEMO_LOGIN_ENABLED: 'true' },
      {
        ...DEMO_USER,
        role: 'admin',
      },
    );
    await expect(controller.demoLogin(res)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(auth.createSession).not.toHaveBeenCalled();
  });
});
