UPDATE auth.users
SET 
  confirmation_token = '',
  recovery_token = '',
  email_change_token_new = '',
  email_change = '',
  email_change_token_current = '',
  email_change_confirm_status = 0,
  reauthentication_token = '',
  phone_change = '',
  phone_change_token = '',
  email_confirmed_at = NOW(),
  raw_user_meta_data = jsonb_build_object(
    'email', 'vamshikrishnav@gmail.com',
    'email_verified', true,
    'phone_verified', false,
    'sub', id::text
  )
WHERE email = 'vamshikrishnav@gmail.com';
