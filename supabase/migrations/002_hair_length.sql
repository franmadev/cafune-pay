-- ═══════════════════════════════════════════════════════════════════
-- MIGRACIÓN 002 — Largo de cabello en variantes y clientas
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- 1. Agregar columnas de rango de largo a service_variants
ALTER TABLE public.service_variants
  ADD COLUMN IF NOT EXISTS hair_length_min INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hair_length_max INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.service_variants.hair_length_min IS 'Largo mínimo en cm para esta variante. NULL = sin límite inferior.';
COMMENT ON COLUMN public.service_variants.hair_length_max IS 'Largo máximo en cm para esta variante. NULL = sin límite superior.';

-- 2. Constraint de validación de rangos
ALTER TABLE public.service_variants
  ADD CONSTRAINT chk_hair_length_range
    CHECK (
      (hair_length_min IS NULL OR hair_length_min >= 0) AND
      (hair_length_max IS NULL OR hair_length_max >= 0) AND
      (hair_length_min IS NULL OR hair_length_max IS NULL OR hair_length_min <= hair_length_max)
    );

-- 3. Agregar largo de cabello a clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS hair_length_cm INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.clients.hair_length_cm IS 'Último largo de cabello registrado en cm.';
