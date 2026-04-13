-- Tabla para almacenar el historial de inversiones de clientes
CREATE TABLE IF NOT EXISTS investment_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  client_name VARCHAR(255) NOT NULL,
  client_identification VARCHAR(50) NOT NULL,
  client_phone VARCHAR(20),
  investment_type VARCHAR(100) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  period_months INTEGER NOT NULL,
  annual_rate DECIMAL(5,2) NOT NULL,
  interest_earned DECIMAL(12,2) NOT NULL,
  total_return DECIMAL(12,2) NOT NULL,
  selected_bank VARCHAR(255) NOT NULL,
  identity_validated BOOLEAN DEFAULT true,
  facial_recognition_score DECIMAL(3,1) DEFAULT 99.8,
  status VARCHAR(50) DEFAULT 'PROCESSED',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_investment_history_org_id ON investment_history(org_id);
CREATE INDEX idx_investment_history_client_id ON investment_history(client_identification);
CREATE INDEX idx_investment_history_created_at ON investment_history(created_at);
CREATE INDEX idx_investment_history_status ON investment_history(status);

-- Comentario para documentación
COMMENT ON TABLE investment_history IS 'Historial de inversiones procesadas por clientes';
COMMENT ON COLUMN investment_history.client_identification IS 'Identificación del cliente (cédula, RUC, etc.)';
COMMENT ON COLUMN investment_history.facial_recognition_score IS 'Porcentaje de validación facial obtenida';
