-- ============================================================================
-- FOLONEO CRM — Migration 004 : reset des donnees commerciales
-- Supprime les accounts/deals/quotes/factures/events/sav/interactions/contrats
-- CONSERVE : settings (tes coefs), products + packs (le catalogue), commerciaux
-- ============================================================================

-- Ordre important : on part des dependances vers les parents
delete from public.interactions;
delete from public.sav_tickets;
delete from public.events;
delete from public.maintenance_contracts;
delete from public.invoices;
delete from public.quote_lines;
delete from public.quotes;
delete from public.deals;
delete from public.contacts;
delete from public.accounts;

-- Optionnel : supprimer les commerciaux demo (Julien Martin, Sophie Laurent)
-- en gardant Stephane. Decommente la ligne suivante si tu veux demarrer seul.
-- delete from public.commerciaux where email != 'stephanepitaud@foloneo.fr';
