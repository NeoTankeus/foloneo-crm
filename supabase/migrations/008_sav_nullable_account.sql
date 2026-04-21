-- ============================================================================
-- FOLONEO CRM — Migration 008 : SAV ad-hoc
--
-- Permet de créer un ticket SAV sans rattacher un compte client existant.
-- Cas d'usage : appel entrant d'un client non encore enregistré, urgence
-- terrain, etc. Les informations du client peuvent être saisies directement
-- dans le ticket ; le rattachement à un compte reste possible a posteriori.
-- ============================================================================

begin;

-- 1. account_id devient optionnel
alter table public.sav_tickets
  alter column account_id drop not null;

-- 2. Champs ad-hoc (utilises uniquement si account_id est null)
alter table public.sav_tickets
  add column if not exists client_nom text,
  add column if not exists client_telephone text,
  add column if not exists client_email text;

-- 3. Contrainte : soit un compte rattache, soit au moins un nom de client
alter table public.sav_tickets
  drop constraint if exists sav_tickets_client_check;
alter table public.sav_tickets
  add constraint sav_tickets_client_check
  check (account_id is not null or (client_nom is not null and length(trim(client_nom)) > 0));

commit;

-- Verification
select column_name, is_nullable, data_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'sav_tickets'
  order by ordinal_position;
