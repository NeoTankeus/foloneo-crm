-- ============================================================================
-- FOLONEO CRM — Migration 007 : demarrage propre
--
-- Objectif : remettre la base a blanc pour usage reel, sans aucune donnee demo
-- residuelle (comptes fictifs, devis, deals, factures, stats artificielles...).
--
-- Conserve : commerciaux (Stephane uniquement), products, packs, settings.
-- Supprime : accounts, contacts, deals, quotes, quote_lines, invoices, events,
--            sav_tickets, maintenance_contracts, interactions, + autres comptes
--            commerciaux demo (Julien Martin, Sophie Laurent).
--
-- Transactionnel : si une seule commande echoue, rien n'est applique.
-- ============================================================================

begin;

-- Ordre des DELETE : des enfants vers les parents pour respecter les FK
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

-- Ne garder qu'un seul commercial (toi). Change l'email ici si besoin.
delete from public.commerciaux where email <> 'stephanepitaud@foloneo.fr';

-- Objectif mensuel neutre : laisse le dashboard a zero plutot que d'afficher
-- un chiffre residuel de la demo (40000 EUR). Modifiable ensuite dans Equipe.
update public.commerciaux
  set objectif_mensuel = 0
  where email = 'stephanepitaud@foloneo.fr';

commit;

-- ============================================================================
-- Verification — a executer apres le commit pour confirmer l'etat propre
-- ============================================================================
select 'accounts'              as table_name, count(*) as n from public.accounts
union all select 'contacts',              count(*) from public.contacts
union all select 'deals',                 count(*) from public.deals
union all select 'quotes',                count(*) from public.quotes
union all select 'quote_lines',           count(*) from public.quote_lines
union all select 'invoices',              count(*) from public.invoices
union all select 'events',                count(*) from public.events
union all select 'sav_tickets',           count(*) from public.sav_tickets
union all select 'maintenance_contracts', count(*) from public.maintenance_contracts
union all select 'interactions',          count(*) from public.interactions
union all select 'commerciaux',           count(*) from public.commerciaux
union all select 'products',              count(*) from public.products
union all select 'packs',                 count(*) from public.packs;
-- Attendu : toutes les lignes a 0 sauf commerciaux=1, products et packs inchanges.
