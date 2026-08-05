-- Add date_of_birth column to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Update the handle_new_user function to handle date_of_birth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
  v_full_name TEXT;
  v_phone TEXT;
  v_age INTEGER;
  v_gender TEXT;
  v_date_of_birth DATE;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_phone := NULLIF(NEW.raw_user_meta_data->>'phone', '');
  v_gender := NULLIF(NEW.raw_user_meta_data->>'gender', '');
  v_date_of_birth := NULLIF(NEW.raw_user_meta_data->>'date_of_birth', '')::DATE;
  BEGIN
    v_age := NULLIF(NEW.raw_user_meta_data->>'age', '')::INTEGER;
  EXCEPTION WHEN OTHERS THEN
    v_age := NULL;
  END;
  v_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'patient')::public.app_role;

  INSERT INTO public.profiles (id, full_name, phone, age, gender, date_of_birth)
  VALUES (NEW.id, v_full_name, v_phone, v_age, v_gender, v_date_of_birth);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT DO NOTHING;

  IF v_role = 'doctor' THEN
    INSERT INTO public.doctors (id, specialty, phone_number)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'specialty', 'General Practitioner'), v_phone)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
