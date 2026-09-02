-- Demo taxpayer account
-- Login:  0912345678901234   Password:  Wajib2025!
INSERT INTO users (username, password_hash, full_name, npwp, email)
VALUES (
    '0912345678901234',
    '$2b$10$sNu1.EI6mkIyDe2oUSgRD./lkQgJV0XsninONV9O7n9GGxhqcBqBO',
    'Budi Santoso',
    '09.123.456.7-890.000',
    'budi.santoso@example.id'
)
ON CONFLICT (username) DO NOTHING;
