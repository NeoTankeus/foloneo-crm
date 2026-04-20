-- ============================================================================
-- FOLONEO CRM — Migration 003 : grilles leasing + override mensualite
-- A appliquer APRES 001 et 002
-- ============================================================================

-- Ajout du seuil de bucket + grille "petit" (< seuil)
alter table public.settings
  add column if not exists seuil_leasing numeric(10,2) not null default 10000,
  add column if not exists coef_mensuel_petit_36 numeric(6,5) not null default 0.03170,
  add column if not exists coef_mensuel_petit_48 numeric(6,5) not null default 0.02500,
  add column if not exists coef_mensuel_petit_60 numeric(6,5) not null default 0.02050;

-- Ajustement des coefs "grand" (>= seuil) aux valeurs reelles FOLONEO
update public.settings
set coef_mensuel_36 = 0.03160,
    coef_mensuel_48 = 0.02480,
    coef_mensuel_60 = 0.02020
where id = 1;

-- Override manuel de la mensualite leasing sur chaque devis
alter table public.quotes
  add column if not exists mensualite_leasing_override numeric(10,2);
