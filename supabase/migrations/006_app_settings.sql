CREATE TABLE public.app_settings (
  key        TEXT        PRIMARY KEY,
  value      TEXT        NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings: admin read"
  ON public.app_settings FOR SELECT
  USING (get_my_role() IN ('superadmin', 'admin'));

CREATE POLICY "app_settings: admin write"
  ON public.app_settings FOR ALL
  USING (get_my_role() IN ('superadmin', 'admin'));

INSERT INTO public.app_settings (key, value) VALUES ('honorarios_rate_pct', '15.25');
