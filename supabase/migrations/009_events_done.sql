-- ============================================================================
-- FOLONEO CRM — Migration 009 : events.done pour les rappels/tâches
--
-- Objectif : permettre de cocher un evenement comme "fait" sans avoir a le
-- supprimer. Utilise par le widget "Mes rappels" du dashboard pour afficher
-- les rappels et taches en cours.
-- ============================================================================

alter table public.events
  add column if not exists done boolean not null default false;

-- Index pour accelerer la requete du dashboard : "rappels/taches non faits
-- de tel commercial, tries par date".
create index if not exists idx_events_pending
  on public.events (commercial_id, date)
  where done = false and type in ('rappel', 'tache');
