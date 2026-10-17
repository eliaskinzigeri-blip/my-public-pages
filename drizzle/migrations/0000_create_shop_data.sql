CREATE TABLE public.shop_data (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_data TO anon;
GRANT SELECT ON public.shop_data TO authenticated;
GRANT ALL ON public.shop_data TO service_role;
ALTER TABLE public.shop_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read shop data" ON public.shop_data FOR SELECT TO anon, authenticated USING (true);