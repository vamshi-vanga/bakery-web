DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
  user_email TEXT := 'vamshikrishnav@gmail.com';
  user_pw TEXT := 'Vamshi_098';
  encrypted_pw TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    UPDATE auth.users
    SET 
      encrypted_password = extensions.crypt(user_pw, extensions.gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW()
    WHERE email = user_email;
  ELSE
    encrypted_pw := extensions.crypt(user_pw, extensions.gen_salt('bf'));
    
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      user_email,
      encrypted_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      NOW(),
      NOW(),
      FALSE
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      new_user_id,
      new_user_id,
      jsonb_build_object('sub', new_user_id::text, 'email', user_email),
      'email',
      user_email,
      NOW(),
      NOW(),
      NOW()
    );
  END IF;
END $$;
