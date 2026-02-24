-- ═══════════════════════════════════════════════════════════════════
-- MIGRACIÓN 001 — Comisión por servicio
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- 1. Agregar commission_pct a service_catalog
ALTER TABLE public.service_catalog
  ADD COLUMN IF NOT EXISTS commission_pct NUMERIC(5,2) NOT NULL DEFAULT 40.00;

COMMENT ON COLUMN public.service_catalog.commission_pct
  IS '% de comisión fijo del servicio. Se aplica a quien lo realice.';

-- 2. Eliminar tabla commission_rules (ya no se necesita)
DROP TABLE IF EXISTS public.commission_rules CASCADE;

-- 3. Reemplazar función resolve_commission por versión simplificada
CREATE OR REPLACE FUNCTION public.resolve_commission(
  p_service_id UUID,
  p_worker_id  UUID,      -- mantenido por compatibilidad, ya no se usa
  p_date       DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC(5,2)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT commission_pct
  FROM   public.service_catalog
  WHERE  id = p_service_id;
$$;

-- 4. Eliminar default_commission_pct de workers (ya no aplica)
--    Comentado por seguridad — descomentar solo si se confirma que no hay datos
-- ALTER TABLE public.workers DROP COLUMN IF EXISTS default_commission_pct;
