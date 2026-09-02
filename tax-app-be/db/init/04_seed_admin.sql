-- Admin reviewer account
-- Login:  admin   Password:  Admin2025!
INSERT INTO users (username, password_hash, full_name, npwp, email, role)
VALUES (
    'admin',
    '$2b$10$95z.sFB.192a63C37lxwceGori12PSFiMXeavl9Rrm3TNsDn01QvW',
    'Petugas Pajak',
    NULL,
    'admin@pajak.example.id',
    'admin'
)
ON CONFLICT (username) DO UPDATE SET role = 'admin';
