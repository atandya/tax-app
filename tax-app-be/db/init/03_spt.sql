-- Roles + SPT returns
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'wajib_pajak';

-- SPT status flow:
--   DRAFT           = Konsep SPT
--   WAITING_PAYMENT = SPT Menunggu Pembayaran (submitted, awaiting admin review)
--   REPORTED        = SPT Dilaporkan (approved by admin)
--   REJECTED        = SPT Ditolak (rejected by admin)
CREATE TABLE IF NOT EXISTS spt_returns (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tax_year         INT NOT NULL,
    form_type        TEXT NOT NULL DEFAULT '1770 S',
    status           TEXT NOT NULL DEFAULT 'DRAFT',
    data             JSONB NOT NULL DEFAULT '{}'::jsonb,
    pph_owed         BIGINT NOT NULL DEFAULT 0,
    pph_credit       BIGINT NOT NULL DEFAULT 0,
    balance_due      BIGINT NOT NULL DEFAULT 0,   -- >0 kurang bayar, <0 lebih bayar, 0 nihil
    payment_status   TEXT,                        -- Nihil | Kurang Bayar | Lebih Bayar
    rejection_reason TEXT,
    reviewed_by      UUID REFERENCES users(id),
    reviewed_at      TIMESTAMPTZ,
    submitted_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spt_user   ON spt_returns(user_id);
CREATE INDEX IF NOT EXISTS idx_spt_status ON spt_returns(status);
