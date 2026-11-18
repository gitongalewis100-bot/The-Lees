-- Our special days (anniversary, birthdays, custom), shared by both sides. Applied live 2026-11-19.
alter table public.pair_settings add column if not exists special_days jsonb not null default '[]'::jsonb;
alter table public.pair_settings add constraint pair_settings_special_days_len check (jsonb_typeof(special_days) = 'array' and jsonb_array_length(special_days) <= 30);
