-- Scrub PII from existing chat session metadata
UPDATE public.chat_sessions
SET metadata = coalesce(metadata, '{}'::jsonb) - 'customer_name' - 'customer_phone'
WHERE (metadata ? 'customer_name' OR metadata ? 'customer_phone');

-- Prevent future PII storage in chat_sessions.metadata
CREATE OR REPLACE FUNCTION public.strip_pii_from_chat_sessions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.metadata IS NULL THEN
    NEW.metadata := '{}'::jsonb;
  END IF;
  -- Remove common PII keys
  NEW.metadata := NEW.metadata - 'customer_name' - 'customer_phone' - 'email' - 'phone';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_strip_pii_from_chat_sessions ON public.chat_sessions;
CREATE TRIGGER trg_strip_pii_from_chat_sessions
BEFORE INSERT OR UPDATE ON public.chat_sessions
FOR EACH ROW EXECUTE FUNCTION public.strip_pii_from_chat_sessions();