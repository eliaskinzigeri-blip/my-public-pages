CREATE TABLE public.orders (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'En attente de paiement',
  customer jsonb NOT NULL,
  items jsonb NOT NULL,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  shipping numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  stripe_session_id text,
  session_url text,
  payment_intent text,
  tracking text
);
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;