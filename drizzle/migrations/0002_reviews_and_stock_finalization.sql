BEGIN;

CREATE TABLE IF NOT EXISTS public.review_submissions (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  moderated_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 32),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text NOT NULL CHECK (length(btrim(review_text)) BETWEEN 3 AND 500),
  size text CHECK (size IS NULL OR length(size) <= 12),
  product_id text CHECK (product_id IS NULL OR length(product_id) <= 80)
);
CREATE INDEX IF NOT EXISTS review_submissions_pending_created_idx
  ON public.review_submissions (created_at DESC) WHERE status = 'pending';
ALTER TABLE public.review_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.review_submissions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.review_submissions TO service_role;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_decremented_at timestamptz;

CREATE OR REPLACE FUNCTION public.decrement_product_size(
  p_products jsonb,
  p_product_id text,
  p_size text,
  p_qty integer
) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_products jsonb := COALESCE(p_products, '[]'::jsonb);
  v_item record;
  v_stock integer;
  v_product jsonb;
BEGIN
  FOR v_item IN
    SELECT value, ordinality FROM jsonb_array_elements(v_products) WITH ORDINALITY
    WHERE value->>'id' = p_product_id
  LOOP
    IF COALESCE(jsonb_typeof(v_item.value->'sizes'), '') <> 'object' OR NOT COALESCE(((v_item.value->'sizes') ? p_size), false) THEN
      RETURN v_products;
    END IF;
    v_stock := GREATEST(0, COALESCE(NULLIF(v_item.value->'sizes'->>p_size, '')::integer, 0));
    v_product := jsonb_set(v_item.value, ARRAY['sizes', p_size], to_jsonb(GREATEST(0, v_stock - GREATEST(p_qty, 0))), true);
    RETURN jsonb_set(v_products, ARRAY[(v_item.ordinality - 1)::text], v_product, false);
  END LOOP;
  RETURN v_products;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_order_stock(
  p_order_id text,
  p_session_id text DEFAULT NULL,
  p_payment_intent text DEFAULT NULL,
  p_manual boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_shop jsonb;
  v_products jsonb;
  v_item jsonb;
  v_product jsonb;
  v_component0 jsonb;
  v_component1 jsonb;
  v_component_id0 text;
  v_component_id1 text;
  v_item_id text;
  v_size text;
  v_qty integer;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'order_not_found'); END IF;
  IF p_manual THEN
    IF v_order.stripe_session_id IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'stripe_order'); END IF;
  ELSIF v_order.stripe_session_id IS DISTINCT FROM p_session_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'session_mismatch');
  END IF;
  IF v_order.stock_decremented_at IS NOT NULL THEN
    UPDATE public.orders SET status = 'Payée', payment_intent = COALESCE(p_payment_intent, payment_intent) WHERE id = p_order_id;
    RETURN jsonb_build_object('ok', true, 'already_applied', true);
  END IF;

  SELECT data INTO v_shop FROM public.shop_data WHERE id = 1 FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'shop_data_missing'); END IF;
  v_products := COALESCE(v_shop->'products', '[]'::jsonb);
  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(v_order.items, '[]'::jsonb)) LOOP
    v_item_id := v_item->>'id';
    v_size := COALESCE(v_item->>'size', '');
    v_qty := GREATEST(0, COALESCE(NULLIF(v_item->>'qty', '')::integer, 0));
    IF v_item_id IS NULL OR v_qty = 0 THEN CONTINUE; END IF;
    SELECT value INTO v_product FROM jsonb_array_elements(v_products) WHERE value->>'id' = v_item_id LIMIT 1;
    IF NOT FOUND THEN CONTINUE; END IF;
    IF v_product->>'category' = 'ensemble' AND jsonb_typeof(v_product->'components') = 'array' THEN
      v_component0 := v_product->'components'->0;
      v_component1 := v_product->'components'->1;
      v_component_id0 := CASE WHEN jsonb_typeof(v_component0) = 'string' THEN trim(both '"' from v_component0::text) ELSE v_component0->>'id' END;
      v_component_id1 := CASE WHEN jsonb_typeof(v_component1) = 'string' THEN trim(both '"' from v_component1::text) ELSE v_component1->>'id' END;
      v_products := public.decrement_product_size(v_products, v_component_id0, split_part(v_size, ' / ', 1), v_qty);
      v_products := public.decrement_product_size(v_products, v_component_id1, split_part(v_size, ' / ', 2), v_qty);
    ELSE
      v_products := public.decrement_product_size(v_products, v_item_id, v_size, v_qty);
    END IF;
  END LOOP;

  UPDATE public.shop_data
    SET data = jsonb_set(v_shop, '{products}', v_products, true), updated_at = now()
    WHERE id = 1;
  UPDATE public.orders
    SET status = 'Payée', payment_intent = COALESCE(p_payment_intent, payment_intent), stock_decremented_at = now()
    WHERE id = p_order_id;
  RETURN jsonb_build_object('ok', true, 'already_applied', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_review_submission(p_review_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_review public.review_submissions%ROWTYPE;
  v_shop jsonb;
  v_reviews jsonb;
  v_published_review jsonb;
BEGIN
  SELECT * INTO v_review FROM public.review_submissions
    WHERE id = p_review_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT data INTO v_shop FROM public.shop_data WHERE id = 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'shop_data_missing'; END IF;
  v_reviews := CASE WHEN jsonb_typeof(v_shop->'reviews') = 'array' THEN v_shop->'reviews' ELSE '[]'::jsonb END;
  v_published_review := jsonb_build_object(
    'id', v_review.id::text,
    'name', v_review.name,
    'rating', v_review.rating,
    'text', v_review.review_text,
    'size', COALESCE(v_review.size, ''),
    'productId', COALESCE(v_review.product_id, ''),
    'date', to_char(v_review.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
    'approved', true,
    'featured', false,
    'pending', false
  );
  UPDATE public.shop_data
    SET data = jsonb_set(v_shop, '{reviews}', jsonb_build_array(v_published_review) || v_reviews, true), updated_at = now()
    WHERE id = 1;
  UPDATE public.review_submissions SET status = 'approved', moderated_at = now() WHERE id = p_review_id;
  RETURN v_published_review;
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_product_size(jsonb, text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_order_stock(text, text, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_review_submission(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_order_stock(text, text, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_review_submission(uuid) TO service_role;

COMMIT;
