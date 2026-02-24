-- ═══════════════════════════════════════════════════════════════════
-- CAFUNE PAY — Schema inicial
-- PostgreSQL / Supabase
-- Ejecutar en orden: tipos → tablas → índices → funciones → triggers → RLS
-- ═══════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────
-- EXTENSIONES
-- ─────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ─────────────────────────────────────────
-- TIPOS PERSONALIZADOS
-- ─────────────────────────────────────────
CREATE TYPE user_role      AS ENUM ('superadmin', 'admin', 'worker');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'transfer', 'mixed');
CREATE TYPE receipt_status AS ENUM ('open', 'completed', 'voided');
CREATE TYPE period_status  AS ENUM ('open', 'closed', 'paid');


-- ═══════════════════════════════════════════════════════════════════
-- TABLAS
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────
-- USUARIOS
-- El id es el mismo que auth.users de Supabase
-- ─────────────────────────────────────────
CREATE TABLE public.users (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL UNIQUE,
  role        user_role   NOT NULL DEFAULT 'worker',
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.users IS 'Usuarios del sistema. Vinculados 1:1 con auth.users de Supabase.';


-- ─────────────────────────────────────────
-- TRABAJADORAS
-- ─────────────────────────────────────────
CREATE TABLE public.workers (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID        UNIQUE REFERENCES public.users(id) ON DELETE SET NULL,
  full_name TEXT        NOT NULL,
  phone     TEXT,
  email     TEXT,
  is_active BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.workers.email IS 'Correo para enviar resumen de nómina.';


-- ─────────────────────────────────────────
-- CLIENTES (opcionales en boleta)
-- ─────────────────────────────────────────
CREATE TABLE public.clients (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   TEXT        NOT NULL,
  phone       TEXT,
  email       TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─────────────────────────────────────────
-- CATÁLOGO DE SERVICIOS
-- ─────────────────────────────────────────
CREATE TABLE public.service_catalog (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT          NOT NULL,
  description    TEXT,
  base_price     NUMERIC(10,2) NOT NULL,
  commission_pct NUMERIC(5,2)  NOT NULL DEFAULT 40.00,
  qr_code        TEXT,
  is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.service_catalog.base_price     IS 'Precio de referencia. El precio real se captura en receipt_services.price_charged.';
COMMENT ON COLUMN public.service_catalog.commission_pct IS '% de comisión fijo del servicio. Se aplica a quien lo realice.';
COMMENT ON COLUMN public.service_catalog.qr_code        IS 'URL o payload para generar QR del servicio.';


-- ─────────────────────────────────────────
-- CATÁLOGO DE PRODUCTOS
-- ─────────────────────────────────────────
CREATE TABLE public.product_catalog (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT         NOT NULL,
  barcode     TEXT         UNIQUE,
  price       NUMERIC(10,2) NOT NULL,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);


-- ─────────────────────────────────────────
-- REGLAS DE COMISIÓN
-- Prioridad: worker específico > global (worker_id NULL) > worker.default_commission_pct
-- ─────────────────────────────────────────
CREATE TABLE public.commission_rules (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id     UUID         NOT NULL REFERENCES public.service_catalog(id) ON DELETE CASCADE,
  worker_id      UUID         REFERENCES public.workers(id) ON DELETE CASCADE, -- NULL = todas
  commission_pct NUMERIC(5,2) NOT NULL,
  valid_from     DATE         NOT NULL DEFAULT CURRENT_DATE,
  valid_until    DATE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT unique_commission_rule UNIQUE (service_id, worker_id, valid_from)
);
COMMENT ON COLUMN public.commission_rules.worker_id  IS 'NULL = regla aplica a todas las trabajadoras.';
COMMENT ON COLUMN public.commission_rules.valid_until IS 'NULL = vigente indefinidamente.';


-- ─────────────────────────────────────────
-- BOLETAS (cabecera del ticket)
-- ─────────────────────────────────────────
CREATE TABLE public.receipts (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID           REFERENCES public.clients(id) ON DELETE SET NULL,
  created_by     UUID           NOT NULL REFERENCES public.users(id),
  status         receipt_status NOT NULL DEFAULT 'open',
  payment_method payment_method NOT NULL DEFAULT 'cash',
  notes          TEXT,
  issued_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  -- Totales: se actualizan al agregar/quitar líneas y al cerrar la boleta
  total_services NUMERIC(10,2)  NOT NULL DEFAULT 0,
  total_products NUMERIC(10,2)  NOT NULL DEFAULT 0,
  total_amount   NUMERIC(10,2)  GENERATED ALWAYS AS (total_services + total_products) STORED,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.receipts.total_services IS 'Suma de price_charged en receipt_services. Actualizar desde la app al cerrar.';
COMMENT ON COLUMN public.receipts.total_products IS 'Suma de subtotal en receipt_products. Actualizar desde la app al cerrar.';


-- ─────────────────────────────────────────
-- LÍNEAS DE SERVICIO EN BOLETA
-- ─────────────────────────────────────────
CREATE TABLE public.receipt_services (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id     UUID         NOT NULL REFERENCES public.receipts(id)       ON DELETE CASCADE,
  service_id     UUID         NOT NULL REFERENCES public.service_catalog(id),
  worker_id      UUID         NOT NULL REFERENCES public.workers(id),
  price_charged  NUMERIC(10,2) NOT NULL,
  -- Snapshot del % en el momento de la venta (inmutable)
  commission_pct NUMERIC(5,2)  NOT NULL,
  commission_amt NUMERIC(10,2) GENERATED ALWAYS AS
                   (ROUND(price_charged * commission_pct / 100, 2)) STORED,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.receipt_services.commission_pct IS 'Snapshot al momento de venta. Usar resolve_commission() al insertar.';


-- ─────────────────────────────────────────
-- LÍNEAS DE PRODUCTO EN BOLETA
-- ─────────────────────────────────────────
CREATE TABLE public.receipt_products (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID         NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  product_id UUID         NOT NULL REFERENCES public.product_catalog(id),
  quantity   INTEGER      NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  subtotal   NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.receipt_products.unit_price IS 'Snapshot del precio al momento de venta.';


-- ─────────────────────────────────────────
-- PERÍODOS DE NÓMINA
-- ─────────────────────────────────────────
CREATE TABLE public.payroll_periods (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT          NOT NULL,
  start_date DATE          NOT NULL,
  end_date   DATE          NOT NULL,
  status     period_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT valid_period CHECK (start_date <= end_date)
);


-- ─────────────────────────────────────────
-- ENTRADAS DE NÓMINA (snapshot al cerrar período)
-- ─────────────────────────────────────────
CREATE TABLE public.payroll_entries (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id          UUID        NOT NULL REFERENCES public.payroll_periods(id),
  worker_id          UUID        NOT NULL REFERENCES public.workers(id),
  total_services_amt NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_commission   NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_paid            BOOLEAN     NOT NULL DEFAULT FALSE,
  paid_at            TIMESTAMPTZ,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_payroll_entry UNIQUE (period_id, worker_id)
);
COMMENT ON TABLE public.payroll_entries IS 'Snapshot contable. Una vez cerrado el período, estos valores no deben modificarse.';


-- ─────────────────────────────────────────
-- AUDITORÍA
-- ─────────────────────────────────────────
CREATE TABLE public.audit_log (
  id          BIGSERIAL   PRIMARY KEY,
  table_name  TEXT        NOT NULL,
  record_id   UUID        NOT NULL,
  action      TEXT        NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by  UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  old_data    JSONB,
  new_data    JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════════════
-- ÍNDICES
-- ═══════════════════════════════════════════════════════════════════

-- Trabajadoras
CREATE INDEX idx_workers_user_id           ON public.workers(user_id);

-- Boletas
CREATE INDEX idx_receipts_issued_at        ON public.receipts(issued_at);
CREATE INDEX idx_receipts_status           ON public.receipts(status);
CREATE INDEX idx_receipts_created_by       ON public.receipts(created_by);

-- Líneas de boleta
CREATE INDEX idx_receipt_services_receipt  ON public.receipt_services(receipt_id);
CREATE INDEX idx_receipt_services_worker   ON public.receipt_services(worker_id);
CREATE INDEX idx_receipt_services_service  ON public.receipt_services(service_id);
CREATE INDEX idx_receipt_products_receipt  ON public.receipt_products(receipt_id);

-- Comisiones
CREATE INDEX idx_commission_rules_lookup   ON public.commission_rules(service_id, worker_id, valid_from);

-- Nómina
CREATE INDEX idx_payroll_entries_period    ON public.payroll_entries(period_id);
CREATE INDEX idx_payroll_entries_worker    ON public.payroll_entries(worker_id);

-- Auditoría
CREATE INDEX idx_audit_table_record        ON public.audit_log(table_name, record_id);
CREATE INDEX idx_audit_occurred            ON public.audit_log(occurred_at);

-- Otros
CREATE INDEX idx_product_barcode           ON public.product_catalog(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_clients_phone             ON public.clients(phone)           WHERE phone   IS NOT NULL;


-- ═══════════════════════════════════════════════════════════════════
-- FUNCIONES AUXILIARES
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────
-- Rol del usuario autenticado
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;


-- ─────────────────────────────────────────
-- Worker ID del usuario autenticado
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_worker_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.workers WHERE user_id = auth.uid();
$$;


-- ─────────────────────────────────────────
-- Resolver comisión vigente para un servicio × trabajadora
-- Prioridad: regla específica → regla global → % por defecto de la trabajadora
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_commission(
  p_service_id UUID,
  p_worker_id  UUID,
  p_date       DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC(5,2)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    -- 1. Regla específica para esta trabajadora
    (SELECT commission_pct
     FROM   public.commission_rules
     WHERE  service_id = p_service_id
       AND  worker_id  = p_worker_id
       AND  valid_from <= p_date
       AND  (valid_until IS NULL OR valid_until >= p_date)
     ORDER BY valid_from DESC
     LIMIT 1),

    -- 2. Regla global del servicio (aplica a todas)
    (SELECT commission_pct
     FROM   public.commission_rules
     WHERE  service_id = p_service_id
       AND  worker_id  IS NULL
       AND  valid_from <= p_date
       AND  (valid_until IS NULL OR valid_until >= p_date)
     ORDER BY valid_from DESC
     LIMIT 1),

    -- 3. Comisión por defecto de la trabajadora
    (SELECT default_commission_pct
     FROM   public.workers
     WHERE  id = p_worker_id)
  );
$$;
COMMENT ON FUNCTION public.resolve_commission IS
  'Llamar al insertar en receipt_services para obtener el commission_pct correcto.';


-- ═══════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────
-- updated_at automático
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_workers_updated_at
  BEFORE UPDATE ON public.workers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_service_catalog_updated_at
  BEFORE UPDATE ON public.service_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_product_catalog_updated_at
  BEFORE UPDATE ON public.product_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_receipts_updated_at
  BEFORE UPDATE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_payroll_periods_updated_at
  BEFORE UPDATE ON public.payroll_periods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_payroll_entries_updated_at
  BEFORE UPDATE ON public.payroll_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─────────────────────────────────────────
-- Auditoría automática en tablas críticas
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (table_name, record_id, action, changed_by, old_data, new_data)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_receipts
  AFTER INSERT OR UPDATE OR DELETE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_receipt_services
  AFTER INSERT OR UPDATE OR DELETE ON public.receipt_services
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_commission_rules
  AFTER INSERT OR UPDATE OR DELETE ON public.commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_payroll_entries
  AFTER INSERT OR UPDATE OR DELETE ON public.payroll_entries
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();


-- ─────────────────────────────────────────
-- Crear public.users automáticamente al registrar un auth.user
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'worker'
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- ═══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log       ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────
-- POLÍTICAS: users
-- ─────────────────────────────────────────

-- Superadmin: control total
CREATE POLICY "users: superadmin all"
  ON public.users FOR ALL
  USING (get_my_role() = 'superadmin');

-- Admin: lee todos, actualiza (no borra)
CREATE POLICY "users: admin read all"
  ON public.users FOR SELECT
  USING (get_my_role() = 'admin');

CREATE POLICY "users: admin update"
  ON public.users FOR UPDATE
  USING (get_my_role() = 'admin');

-- Worker: solo su propio perfil
CREATE POLICY "users: worker read own"
  ON public.users FOR SELECT
  USING (get_my_role() = 'worker' AND id = auth.uid());

CREATE POLICY "users: worker update own"
  ON public.users FOR UPDATE
  USING (get_my_role() = 'worker' AND id = auth.uid());


-- ─────────────────────────────────────────
-- POLÍTICAS: workers
-- ─────────────────────────────────────────

CREATE POLICY "workers: admin full"
  ON public.workers FOR ALL
  USING (get_my_role() IN ('superadmin', 'admin'));

-- Worker: ve todas las activas (necesita asignarlas en boleta)
CREATE POLICY "workers: worker read active"
  ON public.workers FOR SELECT
  USING (get_my_role() = 'worker' AND is_active = TRUE);

-- Worker: actualiza solo su propio perfil
CREATE POLICY "workers: worker update own"
  ON public.workers FOR UPDATE
  USING (get_my_role() = 'worker' AND user_id = auth.uid());


-- ─────────────────────────────────────────
-- POLÍTICAS: clients
-- ─────────────────────────────────────────

CREATE POLICY "clients: admin full"
  ON public.clients FOR ALL
  USING (get_my_role() IN ('superadmin', 'admin'));

CREATE POLICY "clients: worker read"
  ON public.clients FOR SELECT
  USING (get_my_role() = 'worker');

CREATE POLICY "clients: worker insert"
  ON public.clients FOR INSERT
  WITH CHECK (get_my_role() = 'worker');


-- ─────────────────────────────────────────
-- POLÍTICAS: service_catalog
-- ─────────────────────────────────────────

CREATE POLICY "service_catalog: admin full"
  ON public.service_catalog FOR ALL
  USING (get_my_role() IN ('superadmin', 'admin'));

CREATE POLICY "service_catalog: worker read active"
  ON public.service_catalog FOR SELECT
  USING (get_my_role() = 'worker' AND is_active = TRUE);


-- ─────────────────────────────────────────
-- POLÍTICAS: product_catalog
-- ─────────────────────────────────────────

CREATE POLICY "product_catalog: admin full"
  ON public.product_catalog FOR ALL
  USING (get_my_role() IN ('superadmin', 'admin'));

CREATE POLICY "product_catalog: worker read active"
  ON public.product_catalog FOR SELECT
  USING (get_my_role() = 'worker' AND is_active = TRUE);


-- ─────────────────────────────────────────
-- POLÍTICAS: commission_rules
-- ─────────────────────────────────────────

CREATE POLICY "commission_rules: admin full"
  ON public.commission_rules FOR ALL
  USING (get_my_role() IN ('superadmin', 'admin'));

-- Worker: solo ve sus reglas propias o las globales
CREATE POLICY "commission_rules: worker read own"
  ON public.commission_rules FOR SELECT
  USING (
    get_my_role() = 'worker'
    AND (worker_id = get_my_worker_id() OR worker_id IS NULL)
  );


-- ─────────────────────────────────────────
-- POLÍTICAS: receipts
-- ─────────────────────────────────────────

CREATE POLICY "receipts: admin full"
  ON public.receipts FOR ALL
  USING (get_my_role() IN ('superadmin', 'admin'));

-- Worker: solo sus propias boletas
CREATE POLICY "receipts: worker read own"
  ON public.receipts FOR SELECT
  USING (get_my_role() = 'worker' AND created_by = auth.uid());

CREATE POLICY "receipts: worker insert"
  ON public.receipts FOR INSERT
  WITH CHECK (get_my_role() = 'worker' AND created_by = auth.uid());

-- Worker: edita solo boletas propias y abiertas
CREATE POLICY "receipts: worker update open"
  ON public.receipts FOR UPDATE
  USING (
    get_my_role() = 'worker'
    AND created_by = auth.uid()
    AND status = 'open'
  );


-- ─────────────────────────────────────────
-- POLÍTICAS: receipt_services
-- ─────────────────────────────────────────

CREATE POLICY "receipt_services: admin full"
  ON public.receipt_services FOR ALL
  USING (get_my_role() IN ('superadmin', 'admin'));

-- Worker: ve servicios donde ella es la asignada O que están en sus boletas
CREATE POLICY "receipt_services: worker read own"
  ON public.receipt_services FOR SELECT
  USING (
    get_my_role() = 'worker'
    AND (
      worker_id = get_my_worker_id()
      OR receipt_id IN (
        SELECT id FROM public.receipts WHERE created_by = auth.uid()
      )
    )
  );

-- Worker: inserta solo en boletas propias abiertas
CREATE POLICY "receipt_services: worker insert"
  ON public.receipt_services FOR INSERT
  WITH CHECK (
    get_my_role() = 'worker'
    AND receipt_id IN (
      SELECT id FROM public.receipts
      WHERE created_by = auth.uid() AND status = 'open'
    )
  );

-- Worker: borra solo de boletas propias abiertas
CREATE POLICY "receipt_services: worker delete"
  ON public.receipt_services FOR DELETE
  USING (
    get_my_role() = 'worker'
    AND receipt_id IN (
      SELECT id FROM public.receipts
      WHERE created_by = auth.uid() AND status = 'open'
    )
  );


-- ─────────────────────────────────────────
-- POLÍTICAS: receipt_products
-- ─────────────────────────────────────────

CREATE POLICY "receipt_products: admin full"
  ON public.receipt_products FOR ALL
  USING (get_my_role() IN ('superadmin', 'admin'));

CREATE POLICY "receipt_products: worker read own"
  ON public.receipt_products FOR SELECT
  USING (
    get_my_role() = 'worker'
    AND receipt_id IN (
      SELECT id FROM public.receipts WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "receipt_products: worker insert"
  ON public.receipt_products FOR INSERT
  WITH CHECK (
    get_my_role() = 'worker'
    AND receipt_id IN (
      SELECT id FROM public.receipts
      WHERE created_by = auth.uid() AND status = 'open'
    )
  );

CREATE POLICY "receipt_products: worker delete"
  ON public.receipt_products FOR DELETE
  USING (
    get_my_role() = 'worker'
    AND receipt_id IN (
      SELECT id FROM public.receipts
      WHERE created_by = auth.uid() AND status = 'open'
    )
  );


-- ─────────────────────────────────────────
-- POLÍTICAS: payroll_periods
-- ─────────────────────────────────────────

CREATE POLICY "payroll_periods: admin full"
  ON public.payroll_periods FOR ALL
  USING (get_my_role() IN ('superadmin', 'admin'));

-- Worker: solo lectura (para ver en qué período está)
CREATE POLICY "payroll_periods: worker read"
  ON public.payroll_periods FOR SELECT
  USING (get_my_role() = 'worker');


-- ─────────────────────────────────────────
-- POLÍTICAS: payroll_entries
-- ─────────────────────────────────────────

CREATE POLICY "payroll_entries: admin full"
  ON public.payroll_entries FOR ALL
  USING (get_my_role() IN ('superadmin', 'admin'));

-- Worker: solo ve su propia entrada de nómina
CREATE POLICY "payroll_entries: worker read own"
  ON public.payroll_entries FOR SELECT
  USING (
    get_my_role() = 'worker'
    AND worker_id = get_my_worker_id()
  );


-- ─────────────────────────────────────────
-- POLÍTICAS: audit_log
-- ─────────────────────────────────────────

-- Superadmin: acceso total
CREATE POLICY "audit_log: superadmin all"
  ON public.audit_log FOR ALL
  USING (get_my_role() = 'superadmin');

-- Admin: solo lectura
CREATE POLICY "audit_log: admin read"
  ON public.audit_log FOR SELECT
  USING (get_my_role() = 'admin');

-- Workers no tienen acceso al audit_log
