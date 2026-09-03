import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';

export interface PublicUser {
  id: string;
  username: string;
  full_name: string;
  npwp: string | null;
  email: string | null;
  role: string;
}

const SESSION_TTL_DAYS = 7;

@Injectable()
export class AuthService {
  constructor(private readonly db: DatabaseService) {}

  /** Validate credentials and return the public user, or throw 401. */
  async validateUser(username: string, password: string): Promise<PublicUser> {
    const rows = await this.db.query<PublicUser & { password_hash: string }>(
      `SELECT id, username, full_name, npwp, email, role, password_hash
         FROM users WHERE username = $1 LIMIT 1`,
      [username],
    );
    const row = rows[0];
    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      throw new UnauthorizedException('ID Pengguna atau Kata Sandi salah.');
    }
    const { password_hash: _hash, ...user } = row;
    void _hash;
    return user;
  }

  /** Look a user up by username without touching the password hash. Used by
   *  the flag-gated demo login, which never compares a password. */
  async findByUsername(username: string): Promise<PublicUser | null> {
    const rows = await this.db.query<PublicUser>(
      `SELECT id, username, full_name, npwp, email, role
         FROM users WHERE username = $1 LIMIT 1`,
      [username],
    );
    return rows[0] ?? null;
  }

  /**
   * Self-service sign-up. Always creates a `wajib_pajak` — the admin role is
   * only ever granted by the seed, never by this endpoint.
   */
  async register(input: {
    username: string;
    password: string;
    fullName: string;
    email: string;
    npwp?: string;
  }): Promise<PublicUser> {
    const hash = await bcrypt.hash(input.password, 10);
    // ON CONFLICT keeps the unique-username check and the insert atomic, so
    // two simultaneous sign-ups can't both slip through.
    const rows = await this.db.query<PublicUser>(
      `INSERT INTO users (username, password_hash, full_name, npwp, email, role)
       VALUES ($1, $2, $3, $4, $5, 'wajib_pajak')
       ON CONFLICT (username) DO NOTHING
       RETURNING id, username, full_name, npwp, email, role`,
      [
        input.username,
        hash,
        input.fullName,
        input.npwp?.trim() || null,
        input.email,
      ],
    );
    const user = rows[0];
    if (!user) {
      throw new ConflictException('ID Pengguna sudah terdaftar.');
    }
    return user;
  }

  /** Create a session row; returns the token + its expiry. */
  async createSession(
    userId: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 864e5);
    await this.db.query(
      `INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)`,
      [token, userId, expiresAt],
    );
    return { token, expiresAt };
  }

  /** Resolve the user for a session token, or null if invalid/expired. */
  async userForToken(token: string | undefined): Promise<PublicUser | null> {
    if (!token) return null;
    const rows = await this.db.query<PublicUser>(
      `SELECT u.id, u.username, u.full_name, u.npwp, u.email, u.role
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token = $1 AND s.expires_at > now()
        LIMIT 1`,
      [token],
    );
    return rows[0] ?? null;
  }

  async destroySession(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.db.query(`DELETE FROM sessions WHERE token = $1`, [token]);
  }
}
