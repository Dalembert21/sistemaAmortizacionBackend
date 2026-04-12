-- Agregar campo identifier a la tabla organizations
ALTER TABLE organizations ADD COLUMN identifier TEXT;

-- Generar identifiers para organizaciones existentes
UPDATE organizations SET identifier = 'sistema-financiero-db' WHERE institution_name = 'Sistema Financiero DB';
UPDATE organizations SET identifier = LOWER(REGEXP_REPLACE(institution_name, '[^a-zA-Z0-9\s-]', '', 'g')) WHERE identifier IS NULL;
UPDATE organizations SET identifier = REGEXP_REPLACE(identifier, '\s+', '-', 'g') WHERE identifier IS NOT NULL;

-- Crear índice para búsquedas rápidas
CREATE INDEX idx_organizations_identifier ON organizations(identifier);
