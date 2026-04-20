-- ============================================================================
-- FOLONEO CRM — Schéma initial
-- ============================================================================
-- À appliquer via : npx supabase db push  (ou Supabase Studio > SQL Editor)
-- ============================================================================

-- Enable uuid-ossp for uuid_generate_v4
create extension if not exists "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================
create type role_commercial as enum ('dirigeant', 'commercial', 'technicien');
create type marque_produit as enum ('ajax', 'dahua', 'vauban', 'autre');
create type type_produit as enum ('alarme', 'video', 'acces', 'incendie', 'accessoire');
create type etape_deal as enum ('prospection', 'qualif', 'devis_envoye', 'nego', 'signe', 'perdu');
create type status_quote as enum ('brouillon', 'envoye', 'signe_achat', 'signe_leasing', 'perdu');
create type status_invoice as enum ('brouillon', 'emise', 'payee', 'retard', 'litige');
create type type_invoice as enum ('ponctuelle', 'recurrente');
create type statut_contrat as enum ('actif', 'a_renouveler', 'expire', 'suspendu');
create type status_sav as enum ('ouvert', 'en_cours', 'resolu');
create type formule_choisie as enum ('achat', 'achat_maintenance', 'leasing');
create type niveau_maintenance as enum ('essentiel', 'confort', 'serenite');
create type secteur_activite as enum ('restauration', 'artisan', 'retail', 'tertiaire', 'residentiel', 'industriel', 'architecte');
create type source_prospect as enum ('recommandation', 'web', 'terrain', 'bni', 'partenaire', 'ancien_client');
create type role_contact as enum ('decideur', 'technique', 'compta', 'autre');
create type type_evenement as enum ('rdv', 'appel', 'visite', 'intervention', 'rappel', 'tache');
create type type_interaction as enum ('appel', 'email', 'visite', 'sms');
create type priorite_sav as enum ('basse', 'normale', 'haute', 'urgente');

-- ============================================================================
-- TABLE: commerciaux
-- ============================================================================
create table public.commerciaux (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  nom text not null,
  prenom text not null,
  email text not null unique,
  telephone text,
  role role_commercial not null default 'commercial',
  objectif_mensuel numeric(10,2) not null default 25000,
  commission_achat numeric(5,4) not null default 0.08,
  commission_leasing numeric(5,4) not null default 0.05,
  commission_maintenance numeric(5,4) not null default 0.10,
  couleur text not null default '#0B1E3F',
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- TABLE: accounts (comptes clients)
-- ============================================================================
create table public.accounts (
  id uuid primary key default uuid_generate_v4(),
  raison_sociale text not null,
  secteur secteur_activite not null default 'tertiaire',
  source source_prospect not null default 'recommandation',
  adresse text,
  code_postal text,
  ville text,
  telephone text,
  email text,
  siret text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  notes text,
  commercial_id uuid references public.commerciaux(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_accounts_commercial on public.accounts(commercial_id);
create index idx_accounts_secteur on public.accounts(secteur);
create index idx_accounts_ville on public.accounts(ville);

-- ============================================================================
-- TABLE: contacts
-- ============================================================================
create table public.contacts (
  id uuid primary key default uuid_generate_v4(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  prenom text not null,
  nom text not null,
  fonction text,
  email text,
  telephone text,
  role role_contact not null default 'decideur',
  created_at timestamptz not null default now()
);

create index idx_contacts_account on public.contacts(account_id);

-- ============================================================================
-- TABLE: products (catalogue)
-- ============================================================================
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  ref_fabricant text not null,
  libelle_interne text not null,
  libelle_commercial text not null,
  marque marque_produit not null default 'autre',
  type type_produit not null default 'alarme',
  prix_sylis numeric(10,2),
  prix_marche numeric(10,2),
  prix_achat_ht numeric(10,2) not null default 0,
  prix_vente_ht numeric(10,2) not null default 0,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_products_marque on public.products(marque);
create index idx_products_type on public.products(type);

-- ============================================================================
-- TABLE: packs
-- ============================================================================
create table public.packs (
  id uuid primary key default uuid_generate_v4(),
  nom text not null,
  description text,
  cible text not null default 'PME',
  lignes jsonb not null default '[]'::jsonb,
  prix_indicatif numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- TABLE: deals (affaires)
-- ============================================================================
create table public.deals (
  id uuid primary key default uuid_generate_v4(),
  titre text not null,
  account_id uuid not null references public.accounts(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  commercial_id uuid references public.commerciaux(id) on delete set null,
  etape etape_deal not null default 'prospection',
  probabilite smallint not null default 10 check (probabilite between 0 and 100),
  valeur numeric(12,2) not null default 0,
  formule_preferee formule_choisie not null default 'achat',
  date_cible date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_deals_account on public.deals(account_id);
create index idx_deals_commercial on public.deals(commercial_id);
create index idx_deals_etape on public.deals(etape);

-- ============================================================================
-- TABLE: quotes (devis)
-- ============================================================================
create table public.quotes (
  id uuid primary key default uuid_generate_v4(),
  numero text not null unique,
  deal_id uuid references public.deals(id) on delete set null,
  account_id uuid not null references public.accounts(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  commercial_id uuid not null references public.commerciaux(id) on delete restrict,
  heures_mo numeric(6,2) not null default 0,
  taux_mo numeric(8,2) not null default 65,
  frais_deplacement numeric(8,2) not null default 80,
  niveau_maintenance niveau_maintenance not null default 'confort',
  duree_leasing smallint not null default 48,
  status status_quote not null default 'brouillon',
  formule_choisie formule_choisie,
  type_site text,
  surface numeric(8,2),
  nb_ouvrants smallint,
  contraintes text,
  total_ht numeric(12,2),
  total_tva numeric(12,2),
  total_ttc numeric(12,2),
  marge_brute numeric(12,2),
  mensualite_leasing numeric(10,2),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  signed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index idx_quotes_account on public.quotes(account_id);
create index idx_quotes_commercial on public.quotes(commercial_id);
create index idx_quotes_status on public.quotes(status);
create index idx_quotes_deal on public.quotes(deal_id);

-- ============================================================================
-- TABLE: quote_lines
-- ============================================================================
create table public.quote_lines (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  libelle text not null,
  quantite numeric(8,2) not null default 1,
  prix_achat_ht numeric(10,2) not null default 0,
  prix_vente_ht numeric(10,2) not null default 0,
  ordre smallint not null default 0,
  created_at timestamptz not null default now()
);

create index idx_quote_lines_quote on public.quote_lines(quote_id);

-- ============================================================================
-- TABLE: invoices (factures)
-- ============================================================================
create table public.invoices (
  id uuid primary key default uuid_generate_v4(),
  numero text not null unique,
  quote_id uuid references public.quotes(id) on delete set null,
  account_id uuid not null references public.accounts(id) on delete cascade,
  commercial_id uuid references public.commerciaux(id) on delete set null,
  montant_ht numeric(12,2) not null default 0,
  montant_tva numeric(12,2) not null default 0,
  montant_ttc numeric(12,2) not null default 0,
  status status_invoice not null default 'brouillon',
  type type_invoice not null default 'ponctuelle',
  date_emission date not null default current_date,
  date_echeance date not null,
  date_paiement date,
  lignes jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_invoices_account on public.invoices(account_id);
create index idx_invoices_status on public.invoices(status);
create index idx_invoices_date_echeance on public.invoices(date_echeance);

-- ============================================================================
-- TABLE: maintenance_contracts (contrats de maintenance)
-- ============================================================================
create table public.maintenance_contracts (
  id uuid primary key default uuid_generate_v4(),
  numero text unique,
  account_id uuid not null references public.accounts(id) on delete cascade,
  niveau niveau_maintenance not null default 'confort',
  montant_annuel numeric(10,2) not null default 0,
  date_debut date not null,
  date_fin date not null,
  statut statut_contrat not null default 'actif',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_contracts_account on public.maintenance_contracts(account_id);
create index idx_contracts_date_fin on public.maintenance_contracts(date_fin);
create index idx_contracts_statut on public.maintenance_contracts(statut);

-- ============================================================================
-- TABLE: events (agenda)
-- ============================================================================
create table public.events (
  id uuid primary key default uuid_generate_v4(),
  type type_evenement not null default 'rdv',
  title text not null,
  account_id uuid references public.accounts(id) on delete set null,
  commercial_id uuid references public.commerciaux(id) on delete set null,
  date timestamptz not null,
  duree smallint not null default 60,
  lieu text,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_events_date on public.events(date);
create index idx_events_commercial on public.events(commercial_id);

-- ============================================================================
-- TABLE: sav_tickets
-- ============================================================================
create table public.sav_tickets (
  id uuid primary key default uuid_generate_v4(),
  numero text unique,
  account_id uuid not null references public.accounts(id) on delete cascade,
  objet text not null,
  description text,
  status status_sav not null default 'ouvert',
  priorite priorite_sav not null default 'normale',
  commercial_id uuid references public.commerciaux(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_sav_account on public.sav_tickets(account_id);
create index idx_sav_status on public.sav_tickets(status);

-- ============================================================================
-- TABLE: interactions (journal d'activité compte)
-- ============================================================================
create table public.interactions (
  id uuid primary key default uuid_generate_v4(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  type type_interaction not null,
  date timestamptz not null default now(),
  commercial_id uuid references public.commerciaux(id) on delete set null,
  contenu text not null
);

create index idx_interactions_account on public.interactions(account_id);
create index idx_interactions_date on public.interactions(date desc);

-- ============================================================================
-- TABLE: settings (mono-ligne, configuration globale)
-- ============================================================================
create table public.settings (
  id smallint primary key default 1 check (id = 1),
  coef_ajax numeric(5,4) not null default 0.45,
  coef_dahua numeric(5,4) not null default 0.45,
  dahua_div numeric(5,4) not null default 1.20,
  coef_categorie_default numeric(5,2) not null default 3.0,
  coef_mensuel_36 numeric(6,5) not null default 0.0325,
  coef_mensuel_48 numeric(6,5) not null default 0.0255,
  coef_mensuel_60 numeric(6,5) not null default 0.0215,
  provision_evolutions numeric(5,4) not null default 0.08,
  taux_mo numeric(8,2) not null default 65,
  frais_deplacement numeric(8,2) not null default 80,
  objectif_mensuel_defaut numeric(10,2) not null default 25000,
  commission_achat numeric(5,4) not null default 0.08,
  commission_leasing numeric(5,4) not null default 0.05,
  commission_maintenance numeric(5,4) not null default 0.10,
  tva numeric(5,4) not null default 0.20,
  societe_nom text not null default 'FOLONEO',
  societe_adresse text not null default 'Toulon, Var (83)',
  societe_telephone text not null default '',
  societe_email text not null default 'contact@foloneo.fr',
  societe_siret text not null default '',
  societe_ape text not null default '8020Z',
  societe_sav text not null default 'sav@foloneo.fr',
  societe_site text not null default 'foloneo.fr',
  updated_at timestamptz not null default now()
);

insert into public.settings (id) values (1) on conflict do nothing;

-- ============================================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================================
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create trigger tg_commerciaux_updated before update on public.commerciaux for each row execute function public.tg_set_updated_at();
create trigger tg_accounts_updated before update on public.accounts for each row execute function public.tg_set_updated_at();
create trigger tg_deals_updated before update on public.deals for each row execute function public.tg_set_updated_at();
create trigger tg_quotes_updated before update on public.quotes for each row execute function public.tg_set_updated_at();
create trigger tg_invoices_updated before update on public.invoices for each row execute function public.tg_set_updated_at();
create trigger tg_contracts_updated before update on public.maintenance_contracts for each row execute function public.tg_set_updated_at();
create trigger tg_sav_updated before update on public.sav_tickets for each row execute function public.tg_set_updated_at();
create trigger tg_settings_updated before update on public.settings for each row execute function public.tg_set_updated_at();

-- ============================================================================
-- RLS: Row Level Security
-- Stratégie v1 : tout utilisateur authentifié peut lire/écrire.
-- À durcir plus tard (dirigeant = tout, commercial = son périmètre).
-- ============================================================================
alter table public.commerciaux enable row level security;
alter table public.accounts enable row level security;
alter table public.contacts enable row level security;
alter table public.products enable row level security;
alter table public.packs enable row level security;
alter table public.deals enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_lines enable row level security;
alter table public.invoices enable row level security;
alter table public.maintenance_contracts enable row level security;
alter table public.events enable row level security;
alter table public.sav_tickets enable row level security;
alter table public.interactions enable row level security;
alter table public.settings enable row level security;

-- Policy générique : tout utilisateur authentifié
do $$
declare t text;
begin
  for t in select unnest(array[
    'commerciaux','accounts','contacts','products','packs','deals',
    'quotes','quote_lines','invoices','maintenance_contracts','events',
    'sav_tickets','interactions','settings'
  ]) loop
    execute format('create policy "authenticated_all" on public.%I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ============================================================================
-- VUE: dashboard_kpis — pour accélérer le dashboard côté dirigeant
-- ============================================================================
create or replace view public.dashboard_kpis as
select
  (select count(*) from public.deals where etape not in ('signe','perdu')) as deals_actifs,
  (select coalesce(sum(valeur), 0) from public.deals where etape not in ('signe','perdu')) as pipeline_valeur,
  (select count(*) from public.quotes where status = 'envoye' and created_at < now() - interval '15 days') as devis_a_relancer,
  (select count(*) from public.maintenance_contracts where date_fin between current_date and current_date + interval '60 days' and statut = 'actif') as contrats_a_renouveler,
  (select count(*) from public.invoices where status = 'retard') as factures_retard,
  (select coalesce(sum(montant_ttc), 0) from public.invoices where status in ('emise','retard')) as ca_a_encaisser;
