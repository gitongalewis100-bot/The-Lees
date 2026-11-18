-- Lock-screen lines: one line, or several that take turns. Applied live 2026-11-19.
alter table public.pair_settings add column if not exists taglines text[] not null default '{}';
alter table public.pair_settings add column if not exists tagline_mode text not null default 'one';
alter table public.pair_settings add constraint pair_settings_tagline_mode_check check (tagline_mode in ('one','rotate'));
alter table public.pair_settings add constraint pair_settings_taglines_len check (array_length(taglines, 1) is null or array_length(taglines, 1) <= 12);
