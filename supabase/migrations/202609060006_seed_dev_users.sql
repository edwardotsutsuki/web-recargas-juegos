-- Seed initial dev admin and reseller users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001') THEN
    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      'authenticated',
      'authenticated',
      'admin@xtremeplay.me',
      '',
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Super Admin XtremePlay"}',
      now(),
      now()
    );
    UPDATE public.profiles SET role = 'admin', full_name = 'Super Admin XtremePlay' WHERE id = '00000000-0000-0000-0000-000000000001';
    INSERT INTO public.wallets (user_id, currency, balance_minor)
    VALUES ('00000000-0000-0000-0000-000000000001', 'USD', 500000)
    ON CONFLICT (user_id, currency) DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000002') THEN
    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (
      '00000000-0000-0000-0000-000000000002',
      'authenticated',
      'authenticated',
      'reseller@xtremeplay.me',
      '',
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Reseller Gamer Pro"}',
      now(),
      now()
    );
    UPDATE public.profiles SET role = 'client', full_name = 'Reseller Gamer Pro' WHERE id = '00000000-0000-0000-0000-000000000002';
    INSERT INTO public.wallets (user_id, currency, balance_minor)
    VALUES ('00000000-0000-0000-0000-000000000002', 'USD', 12550)
    ON CONFLICT (user_id, currency) DO NOTHING;
  END IF;
END $$;

