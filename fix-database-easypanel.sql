-- ================================================
-- Script para Corrigir Banco de Dados no EasyPanel
-- ================================================
--
-- Execute este script no PostgreSQL do EasyPanel para:
-- 1. Remover constraint antiga do provider
-- 2. Corrigir username de "Fe120784!" para "Felipe_Manieri"
-- 3. Adicionar número da FaleVono se não existir
--
-- Como executar:
-- 1. Acesse o EasyPanel
-- 2. Vá em Database > SQL Console
-- 3. Cole e execute este script
-- ================================================

-- 1. Remover constraint antiga do provider (se existir)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'voip_numbers_provider_check'
  ) THEN
    ALTER TABLE voip_numbers DROP CONSTRAINT voip_numbers_provider_check;
    RAISE NOTICE 'Constraint antiga removida com sucesso';
  END IF;
END $$;

-- 2. Adicionar nova constraint permitindo todos os providers usados pela aplicação
ALTER TABLE voip_numbers 
ADD CONSTRAINT voip_numbers_provider_check 
CHECK (provider IN ('falevono', 'sobreip', 'vapi', 'retell', 'twilio', 'mock'));

-- 3. Inserir número da FaleVono SE NÃO EXISTIR (não sobrescreve dados existentes)
INSERT INTO voip_numbers (
  name, 
  number, 
  provider, 
  sip_username, 
  sip_password, 
  sip_server, 
  is_default, 
  status
)
SELECT 
  'FaleVono - SP',
  '+5511920838833',
  'falevono',
  'Felipe_Manieri',
  'WILL_USE_ENV_VAR',
  'vono2.me:5060',
  true,
  'active'
WHERE NOT EXISTS (
  SELECT 1 FROM voip_numbers WHERE number = '+5511920838833'
);

-- 4. Atualizar APENAS o username se o número +5511920838833 já existir mas tem username errado
UPDATE voip_numbers 
SET sip_username = 'Felipe_Manieri',
    updated_at = CURRENT_TIMESTAMP
WHERE number = '+5511920838833'
  AND (sip_username = 'Fe120784!' OR sip_username IS NULL);

-- 5. (OPCIONAL) Marcar +5511920838833 como default APENAS se nenhum outro número for default
-- AVISO: Descomente APENAS se você quer que este número seja o padrão
-- UPDATE voip_numbers 
-- SET is_default = true
-- WHERE number = '+5511920838833'
--   AND NOT EXISTS (SELECT 1 FROM voip_numbers WHERE is_default = true AND number != '+5511920838833');

-- 6. Verificar resultado
SELECT 
  id,
  name,
  number,
  provider,
  sip_username,
  sip_server,
  is_default,
  status
FROM voip_numbers
ORDER BY is_default DESC, name ASC;

-- Mensagem de sucesso
DO $$ 
BEGIN
  RAISE NOTICE '✅ Banco de dados corrigido com sucesso!';
  RAISE NOTICE '✅ Username corrigido: Felipe_Manieri';
  RAISE NOTICE '✅ Providers permitidos: falevono, sobreip, vapi, retell, twilio, mock';
  RAISE NOTICE '📌 Apenas o número +5511920838833 foi modificado';
END $$;
