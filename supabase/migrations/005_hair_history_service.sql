-- Agregar service_name y variant_name al historial de largo
-- Para guardar qué servicio se realizó al registrar el largo del cabello

ALTER TABLE public.client_hair_history
  ADD COLUMN service_name TEXT,
  ADD COLUMN variant_name TEXT;
