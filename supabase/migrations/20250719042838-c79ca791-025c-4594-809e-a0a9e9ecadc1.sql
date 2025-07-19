-- Try a direct insert to see what's failing
DO $$
BEGIN
  INSERT INTO public.payments (
    invoice_id,
    amount,
    payment_date,
    payment_method
  ) VALUES (
    'a48f302f-50d5-4157-b646-652b17e26812'::uuid,
    410::numeric,
    now(),
    'cash'
  );
  RAISE NOTICE 'Insert successful';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Insert failed: % %', SQLSTATE, SQLERRM;
END;
$$;