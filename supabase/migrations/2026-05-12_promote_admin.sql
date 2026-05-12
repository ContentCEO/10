-- Promote the owner email to admin contractor.
-- Idempotent: only updates if the profile row exists (created on signup).
UPDATE public.profiles
SET is_admin = true,
    account_type = 'contractor'
WHERE email = 'davichavespb2025@gmail.com';
