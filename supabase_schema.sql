-- --------------------------------------------------------
-- Supabase Schema - Crea estas tablas en el SQL Editor
-- --------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de Organizaciones (Bancos / Cooperativas)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user TEXT UNIQUE NOT NULL,
    admin_pass TEXT NOT NULL,
    institution_name TEXT NOT NULL,
    logo_base_64 TEXT DEFAULT '',
    insurance_rate NUMERIC DEFAULT 0,
    donation_solca NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de los distintos Catálogos de Crédito por Organización
CREATE TABLE credits (
    id SERIAL PRIMARY KEY,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    min_rate NUMERIC NOT NULL,
    max_rate NUMERIC NOT NULL,
    min_amount NUMERIC NOT NULL,
    max_amount NUMERIC NOT NULL
);

-- Tabla de Tipos de Inversión
CREATE TABLE investments (
    id SERIAL PRIMARY KEY,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    min_amount NUMERIC NOT NULL,
    max_amount NUMERIC NOT NULL,
    min_term NUMERIC NOT NULL,
    max_term NUMERIC NOT NULL
);

-- --------------------------------------------------------
-- Datos Semilla (Para que no empieces en blanco)
-- --------------------------------------------------------

INSERT INTO organizations (id, admin_user, admin_pass, institution_name, insurance_rate, donation_solca)
VALUES ('11111111-1111-1111-1111-111111111111', 'admin_financo', 'admin123', 'Sistema Financiero DB', 0.1, 2.0);

INSERT INTO credits (org_id, name, min_rate, max_rate, min_amount, max_amount)
VALUES 
('11111111-1111-1111-1111-111111111111', 'Crédito de Consumo', 10, 16.5, 500, 20000),
('11111111-1111-1111-1111-111111111111', 'Crédito Hipotecario', 8, 11, 20000, 500000),
('11111111-1111-1111-1111-111111111111', 'Crédito Educativo', 7, 9, 1000, 30000);

INSERT INTO investments (org_id, name, min_amount, max_amount, min_term, max_term)
VALUES 
('11111111-1111-1111-1111-111111111111', 'Corto Plazo', 100, 10000, 1, 12),
('11111111-1111-1111-1111-111111111111', 'Largo Plazo', 5000, 100000, 12, 120),
('11111111-1111-1111-1111-111111111111', 'Ahora Flex', 50, 50000, 1, 60);

-- --------------------------------------------------------
-- Súper Administrador Global
-- --------------------------------------------------------
CREATE TABLE superadmins (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
);

INSERT INTO superadmins (username, password) 
VALUES ('1850149905', 'Dalembertbravo1919');
