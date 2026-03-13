CREATE TABLE public.commission_rules (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id       UUID          NOT NULL REFERENCES public.service_catalog(id) ON DELETE CASCADE,
  worker_id        UUID          REFERENCES public.workers(id) ON DELETE CASCADE,
  commission_type  TEXT          NOT NULL DEFAULT 'percentage'
                                 CHECK (commission_type IN ('percentage', 'fixed')),
  commission_value NUMERIC(10,2) NOT NULL,
  valid_from       DATE          NOT NULL DEFAULT CURRENT_DATE,
  valid_until      DATE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT unique_commission_rule UNIQUE (service_id, worker_id, valid_from)
);

CREATE INDEX idx_commission_rules_lookup
  ON public.commission_rules(service_id, worker_id, valid_from);

ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commission_rules: admin full"
  ON public.commission_rules FOR ALL
  USING (get_my_role() IN ('superadmin', 'admin'));

CREATE POLICY "commission_rules: worker read own"
  ON public.commission_rules FOR SELECT
  USING (
    get_my_role() = 'worker'
    AND (worker_id = get_my_worker_id() OR worker_id IS NULL)
  );
