import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../database/database.service';
import { SptData } from './tax';
import { SptRow, SptService, SptStatus } from './spt.service';

const editableData: SptData = {
  identity: { ptkp: 'K/1', signer: 'wp' },
  income: { employment: 100_000_000 },
  deductions: { zakat: 0 },
  credits: { withholding: 500_000 },
  declarationAgree: false,
};

function row(overrides: Partial<SptRow> = {}): SptRow {
  return {
    id: 'return-1',
    user_id: 'taxpayer-1',
    tax_year: 2025,
    form_type: '1770 S',
    status: 'DRAFT',
    data: editableData,
    pph_owed: 0,
    pph_credit: 0,
    balance_due: 0,
    payment_status: null,
    rejection_reason: null,
    reviewed_by: null,
    reviewed_at: null,
    submitted_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

class StatefulSptDatabase {
  current: SptRow | undefined;
  updateCount = 0;

  constructor(initial?: SptRow) {
    this.current = initial;
  }

  async query<T>(text: string, params: unknown[] = []): Promise<T[]> {
    if (text.includes('SELECT') && text.includes('FROM spt_returns')) {
      return (this.current ? [{ ...this.current }] : []) as T[];
    }

    if (text.includes('UPDATE spt_returns')) {
      if (!this.current) return [];
      this.updateCount += 1;
      this.current = {
        ...this.current,
        data: JSON.parse(params[1] as string) as SptData,
        status: 'DRAFT',
        pph_owed: params[2] as number,
        pph_credit: params[3] as number,
        balance_due: params[4] as number,
        payment_status: params[5] as string,
        rejection_reason: null,
      };
      return [{ ...this.current }] as T[];
    }

    throw new Error(`Unexpected database query: ${text}`);
  }
}

function serviceFor(initial?: SptRow) {
  const db = new StatefulSptDatabase(initial);
  const service = new SptService(db as unknown as DatabaseService);
  return { db, service };
}

describe('SptService.updateDraft', () => {
  it('updates an owned draft and returns the server-authoritative PTKP calculation', async () => {
    const { db, service } = serviceFor(row());

    const result = await service.updateDraft(
      'return-1',
      'taxpayer-1',
      editableData,
    );

    expect(result.status).toBe('DRAFT');
    expect(result.data).toEqual(editableData);
    expect(result.computed).toEqual({
      totalNet: 100_000_000,
      netAfterDeduction: 100_000_000,
      ptkpAmount: 63_000_000,
      taxableIncome: 37_000_000,
      pphOwed: 1_850_000,
      pphCredit: 500_000,
      balanceDue: 1_350_000,
      paymentStatus: 'Kurang Bayar',
    });
    expect(db.current).toMatchObject({
      pph_owed: 1_850_000,
      pph_credit: 500_000,
      balance_due: 1_350_000,
      payment_status: 'Kurang Bayar',
    });
  });

  it('turns an owned rejected return back into a draft and clears rejection state', async () => {
    const { db, service } = serviceFor(
      row({ status: 'REJECTED', rejection_reason: 'Needs correction' }),
    );

    const result = await service.updateDraft(
      'return-1',
      'taxpayer-1',
      editableData,
    );

    expect(result.status).toBe('DRAFT');
    expect(result.rejection_reason).toBeNull();
    expect(db.current?.rejection_reason).toBeNull();
  });

  it('rejects an update from a different taxpayer without persisting anything', async () => {
    const { db, service } = serviceFor(row());

    await expect(
      service.updateDraft('return-1', 'taxpayer-2', editableData),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.updateCount).toBe(0);
  });

  it.each<SptStatus>(['WAITING_PAYMENT', 'REPORTED'])(
    'rejects an update when the return is %s',
    async (status) => {
      const { db, service } = serviceFor(row({ status }));

      await expect(
        service.updateDraft('return-1', 'taxpayer-1', editableData),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.updateCount).toBe(0);
    },
  );

  it('reports a missing return without attempting an update', async () => {
    const { db, service } = serviceFor();

    await expect(
      service.updateDraft('missing', 'taxpayer-1', editableData),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.updateCount).toBe(0);
  });
});
