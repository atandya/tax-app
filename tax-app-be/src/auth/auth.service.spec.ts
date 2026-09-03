import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../database/database.service';
import { AuthService } from './auth.service';

class FakeDb {
  lastSql = '';
  lastParams: unknown[] = [];
  constructor(private readonly rows: unknown[]) {}
  async query<T>(text: string, params: unknown[] = []): Promise<T[]> {
    this.lastSql = text;
    this.lastParams = params;
    return this.rows as T[];
  }
}

describe('AuthService.findByUsername', () => {
  it('returns the public user without the password hash', async () => {
    const db = new FakeDb([
      {
        id: 'u1',
        username: '0000000000000000',
        full_name: 'Synthetic Taxpayer',
        npwp: null,
        email: 'synthetic@example.test',
        role: 'wajib_pajak',
      },
    ]);
    const auth = new AuthService(db as unknown as DatabaseService);
    const user = await auth.findByUsername('0000000000000000');
    expect(user).toEqual({
      id: 'u1',
      username: '0000000000000000',
      full_name: 'Synthetic Taxpayer',
      npwp: null,
      email: 'synthetic@example.test',
      role: 'wajib_pajak',
    });
    expect(db.lastSql).not.toContain('password_hash');
    expect(db.lastParams).toEqual(['0000000000000000']);
  });

  it('returns null when the user does not exist', async () => {
    const auth = new AuthService(new FakeDb([]) as unknown as DatabaseService);
    expect(await auth.findByUsername('missing')).toBeNull();
  });
});
