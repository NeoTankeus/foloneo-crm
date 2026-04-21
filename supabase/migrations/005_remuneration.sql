-- ============================================================================
-- FOLONEO CRM — Migration 005 : plan de remuneration 2026
-- Ajoute le Minimum Garanti mensuel commercial terrain
-- Ajuste l'objectif mensuel par defaut a 24 000 EUR
-- ============================================================================

alter table public.settings
  add column if not exists minimum_garanti numeric(10,2) not null default 1823;

update public.settings
set
  minimum_garanti = 1823,
  objectif_mensuel_defaut = 24000
where id = 1;

-- Optionnel : aligner aussi les objectifs des commerciaux existants a 24 000
-- Decommente la ligne suivante si tu veux forcer cet alignement pour tous.
-- update public.commerciaux set objectif_mensuel = 24000;
