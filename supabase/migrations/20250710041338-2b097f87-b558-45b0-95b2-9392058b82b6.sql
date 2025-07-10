-- Fix the search_path security warning for get_chat_lead_source function
CREATE OR REPLACE FUNCTION public.get_chat_lead_source(page_path text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF page_path LIKE '/mobile-home/%' THEN 
    RETURN 'Mobile Home Detail Chat';
  ELSIF page_path = '/' THEN 
    RETURN 'Homepage Chat';
  ELSIF page_path LIKE '/faq%' THEN 
    RETURN 'FAQ Chat';
  ELSIF page_path LIKE '/support%' THEN 
    RETURN 'Support Chat';
  ELSIF page_path LIKE '/admin%' THEN 
    RETURN 'Admin Chat';
  ELSE 
    RETURN 'Website Chat';
  END IF;
END;
$function$;