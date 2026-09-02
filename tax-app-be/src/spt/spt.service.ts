import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { computeSpt, SptComputation, SptData } from './tax';

export type SptStatus =
  | 'DRAFT'
  | 'WAITING_PAYMENT'
  | 'REPORTED'
  | 'REJECTED';

export interface SptRow {
  id: string;
  user_id: string;
  tax_year: number;
  form_type: string;
  status: SptStatus;
  data: SptData;
  pph_owed: number;
  pph_credit: number;
  balance_due: number;
  payment_status: string | null;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  taxpayer_name?: string;
  taxpayer_npwp?: string | null;
  taxpayer_username?: string;
}

const SELECT_COLS = `id, user_id, tax_year, form_type, status, data,
  pph_owed, pph_credit, balance_due, payment_status, rejection_reason,
  reviewed_by, reviewed_at, submitted_at, created_at, updated_at`;

const SELECT_COLS_S = SELECT_COLS.split(',')
  .map((c) => 's.' + c.trim())
  .join(', ');

@Injectable()
export class SptService {
  constructor(private readonly db: DatabaseService) {}

  private withComputation(row: SptRow): SptRow & { computed: SptComputation } {
    return { ...row, computed: computeSpt(row.data ?? {}) };
  }

  /** All returns for one taxpayer (newest first). */
  async listForUser(userId: string) {
    const rows = await this.db.query<SptRow>(
      `SELECT ${SELECT_COLS} FROM spt_returns
        WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return rows.map((r) => this.withComputation(r));
  }

  /** One return, enforcing ownership unless admin. */
  async getOne(id: string, userId: string, isAdmin: boolean) {
    const rows = await this.db.query<SptRow>(
      `SELECT ${SELECT_COLS_S},
              u.full_name AS taxpayer_name, u.npwp AS taxpayer_npwp,
              u.username AS taxpayer_username
         FROM spt_returns s JOIN users u ON u.id = s.user_id
        WHERE s.id = $1 LIMIT 1`,
      [id],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException('SPT tidak ditemukan.');
    if (!isAdmin && row.user_id !== userId) {
      throw new ForbiddenException('Anda tidak memiliki akses ke SPT ini.');
    }
    return this.withComputation(row);
  }

  /** Create a fresh draft, prefilling identity from the user record. */
  async createDraft(userId: string, taxYear: number, formType: string) {
    const data: SptData = {
      identity: { ptkp: 'TK/0', signer: 'wp' },
      header: {
        status: 'Normal',
        method: 'Pencatatan',
        periodStart: 1,
        periodEnd: 12,
        source: 'Pekerjaan',
      },
      income: {},
      deductions: {},
      credits: {},
      answers: {
        q1a: 'tidak',
        q1b: 'tidak',
        q1c: 'tidak',
        q1d: 'tidak',
        q3: 'tidak',
        q8: 'tidak',
        q10a: 'tidak',
        q10d: 'tidak',
        q11b: 'tidak',
        q13a: 'tidak',
        q13b: 'tidak',
        q13c: 'tidak',
        q14b: 'tidak',
        q14c: 'tidak',
        q14d: 'tidak',
        q14e: 'tidak',
        q14f: 'tidak',
        q14g: 'tidak',
      },
      assets: [],
      debts: [],
      family: [],
      employmentSlips: [],
      withholdingSlips: [],
      declarationAgree: false,
    };
    const rows = await this.db.query<SptRow>(
      `INSERT INTO spt_returns (user_id, tax_year, form_type, status, data)
       VALUES ($1, $2, $3, 'DRAFT', $4)
       RETURNING ${SELECT_COLS}`,
      [userId, taxYear, formType, JSON.stringify(data)],
    );
    return this.withComputation(rows[0]);
  }

  private async loadOwned(id: string, userId: string): Promise<SptRow> {
    const rows = await this.db.query<SptRow>(
      `SELECT ${SELECT_COLS} FROM spt_returns WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException('SPT tidak ditemukan.');
    if (row.user_id !== userId) {
      throw new ForbiddenException('Anda tidak memiliki akses ke SPT ini.');
    }
    return row;
  }

  /** Update draft data + recompute totals. Only DRAFT/REJECTED are editable. */
  async updateDraft(id: string, userId: string, data: SptData) {
    const row = await this.loadOwned(id, userId);
    if (row.status !== 'DRAFT' && row.status !== 'REJECTED') {
      throw new BadRequestException(
        'SPT yang sudah dikirim tidak dapat diubah.',
      );
    }
    const c = computeSpt(data);
    const rows = await this.db.query<SptRow>(
      `UPDATE spt_returns
          SET data = $2, status = 'DRAFT', pph_owed = $3, pph_credit = $4,
              balance_due = $5, payment_status = $6, rejection_reason = NULL,
              updated_at = now()
        WHERE id = $1
        RETURNING ${SELECT_COLS}`,
      [id, JSON.stringify(data), c.pphOwed, c.pphCredit, c.balanceDue, c.paymentStatus],
    );
    return this.withComputation(rows[0]);
  }

  /** Submit a draft for review → WAITING_PAYMENT. */
  async submit(id: string, userId: string) {
    const row = await this.loadOwned(id, userId);
    if (row.status !== 'DRAFT' && row.status !== 'REJECTED') {
      throw new BadRequestException('SPT ini sudah dikirim.');
    }
    if (!row.data?.declarationAgree) {
      throw new BadRequestException(
        'Anda harus menyetujui pernyataan sebelum mengirim SPT.',
      );
    }
    const c = computeSpt(row.data);
    const rows = await this.db.query<SptRow>(
      `UPDATE spt_returns
          SET status = 'WAITING_PAYMENT', submitted_at = now(),
              pph_owed = $2, pph_credit = $3, balance_due = $4,
              payment_status = $5, updated_at = now()
        WHERE id = $1
        RETURNING ${SELECT_COLS}`,
      [id, c.pphOwed, c.pphCredit, c.balanceDue, c.paymentStatus],
    );
    return this.withComputation(rows[0]);
  }

  async deleteDraft(id: string, userId: string) {
    const row = await this.loadOwned(id, userId);
    if (row.status !== 'DRAFT') {
      throw new BadRequestException('Hanya konsep yang dapat dihapus.');
    }
    await this.db.query(`DELETE FROM spt_returns WHERE id = $1`, [id]);
    return { ok: true };
  }

  // ---- Admin ----

  /** All returns awaiting review or already reviewed (admin view). */
  async listAll(status?: string) {
    const params: unknown[] = [];
    let where = `WHERE s.status <> 'DRAFT'`;
    if (status) {
      params.push(status);
      where = `WHERE s.status = $1`;
    }
    const rows = await this.db.query<SptRow>(
      `SELECT ${SELECT_COLS_S},
              u.full_name AS taxpayer_name, u.npwp AS taxpayer_npwp,
              u.username AS taxpayer_username
         FROM spt_returns s JOIN users u ON u.id = s.user_id
         ${where}
        ORDER BY s.submitted_at DESC NULLS LAST, s.created_at DESC`,
      params,
    );
    return rows.map((r) => this.withComputation(r));
  }

  async approve(id: string, adminId: string) {
    const rows = await this.db.query<SptRow>(
      `UPDATE spt_returns
          SET status = 'REPORTED', reviewed_by = $2, reviewed_at = now(),
              rejection_reason = NULL, updated_at = now()
        WHERE id = $1 AND status = 'WAITING_PAYMENT'
        RETURNING ${SELECT_COLS}`,
      [id, adminId],
    );
    if (!rows[0]) {
      throw new BadRequestException(
        'SPT tidak dapat disetujui (status bukan Menunggu Pembayaran).',
      );
    }
    return this.withComputation(rows[0]);
  }

  async reject(id: string, adminId: string, reason: string) {
    if (!reason?.trim()) {
      throw new BadRequestException('Alasan penolakan wajib diisi.');
    }
    const rows = await this.db.query<SptRow>(
      `UPDATE spt_returns
          SET status = 'REJECTED', reviewed_by = $2, reviewed_at = now(),
              rejection_reason = $3, updated_at = now()
        WHERE id = $1 AND status = 'WAITING_PAYMENT'
        RETURNING ${SELECT_COLS}`,
      [id, adminId, reason.trim()],
    );
    if (!rows[0]) {
      throw new BadRequestException(
        'SPT tidak dapat ditolak (status bukan Menunggu Pembayaran).',
      );
    }
    return this.withComputation(rows[0]);
  }
}
