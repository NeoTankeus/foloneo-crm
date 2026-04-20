-- ============================================================================
-- FOLONEO CRM — Seed de données démo
-- À appliquer APRÈS 001_initial_schema.sql
-- ============================================================================

-- Commerciaux
insert into public.commerciaux (id, nom, prenom, email, telephone, role, objectif_mensuel, commission_achat, commission_leasing, commission_maintenance, couleur)
values
  ('11111111-1111-1111-1111-111111111111', 'Pitaud', 'Stéphane', 'stephanepitaud@foloneo.fr', '06 00 00 00 01', 'dirigeant', 40000, 0.06, 0.04, 0.08, '#C9A961'),
  ('22222222-2222-2222-2222-222222222222', 'Martin', 'Julien', 'julien.martin@foloneo.fr', '06 00 00 00 02', 'commercial', 25000, 0.08, 0.05, 0.10, '#60A5FA'),
  ('33333333-3333-3333-3333-333333333333', 'Laurent', 'Sophie', 'sophie.laurent@foloneo.fr', '06 00 00 00 03', 'commercial', 22000, 0.08, 0.05, 0.10, '#A78BFA')
on conflict (id) do nothing;

-- Produits (sélection — Claude Code complétera avec le catalogue complet depuis DEMO_PRODUCTS du legacy)
insert into public.products (ref_fabricant, libelle_interne, libelle_commercial, marque, type, prix_sylis, prix_achat_ht, prix_vente_ht)
values
  ('HUB2PLUS', 'Hub 2 Plus Ajax', 'Centrale d''alarme connectée 4G/Wi-Fi', 'ajax', 'alarme', 339, 152.55, 458),
  ('MOTIONCAM', 'MotionCam Ajax', 'Détecteur de mouvement avec photo-vérification', 'ajax', 'alarme', 119, 53.55, 160),
  ('DOORPROTECT', 'DoorProtect Ajax', 'Détecteur d''ouverture sans fil', 'ajax', 'alarme', 29, 13.05, 39),
  ('FIREPROTECT', 'FireProtect Ajax', 'Détecteur de fumée et température', 'ajax', 'incendie', 59, 26.55, 80)
on conflict do nothing;

insert into public.products (ref_fabricant, libelle_interne, libelle_commercial, marque, type, prix_marche, prix_achat_ht, prix_vente_ht)
values
  ('NVR4108', 'NVR 8 voies Dahua', 'Enregistreur numérique 8 voies 4K', 'dahua', 'video', 480, 180, 540),
  ('IPC-HDW3541T', 'Dôme 4MP TiOC Dahua', 'Caméra dôme 4MP intelligente dissuasion active', 'dahua', 'video', 299, 112.13, 336)
on conflict do nothing;

-- Comptes démo
insert into public.accounts (id, raison_sociale, secteur, source, adresse, code_postal, ville, telephone, email, latitude, longitude, commercial_id)
values
  ('a1111111-1111-1111-1111-111111111111', 'GODOT & FILS', 'retail', 'recommandation', '15 rue des Métaux', '83000', 'Toulon', '04 94 00 00 01', 'contact@godotfils.fr', 43.1242, 5.9285, '11111111-1111-1111-1111-111111111111'),
  ('a2222222-2222-2222-2222-222222222222', 'Le Cépage', 'restauration', 'terrain', '8 place Puget', '83000', 'Toulon', '04 94 00 00 02', 'gerant@lecepage.fr', 43.1248, 5.9301, '22222222-2222-2222-2222-222222222222'),
  ('a3333333-3333-3333-3333-333333333333', 'Boulangerie Brun', 'artisan', 'bni', '22 avenue de la République', '83500', 'La Seyne-sur-Mer', '04 94 00 00 03', NULL, 43.1024, 5.8831, '22222222-2222-2222-2222-222222222222'),
  ('a4444444-4444-4444-4444-444444444444', 'Cabinet Moreau', 'architecte', 'partenaire', '5 cours Lafayette', '83000', 'Toulon', '04 94 00 00 04', 'contact@cabinet-moreau.fr', 43.1231, 5.9295, '11111111-1111-1111-1111-111111111111'),
  ('a5555555-5555-5555-5555-555555555555', 'Villa Dubois', 'residentiel', 'ancien_client', 'Chemin de la corniche', '83110', 'Sanary-sur-Mer', '06 00 00 00 05', NULL, 43.1178, 5.8003, '11111111-1111-1111-1111-111111111111'),
  ('a6666666-6666-6666-6666-666666666666', 'Pharmacie du Port', 'retail', 'web', '2 quai Cronstadt', '83000', 'Toulon', '04 94 00 00 06', NULL, 43.1200, 5.9312, '33333333-3333-3333-3333-333333333333'),
  ('a7777777-7777-7777-7777-777777777777', 'Bâti-Var', 'industriel', 'terrain', 'ZA La Poulasse', '83140', 'Six-Fours-les-Plages', '04 94 00 00 07', 'direction@bati-var.fr', 43.0944, 5.8389, '33333333-3333-3333-3333-333333333333')
on conflict (id) do nothing;

-- Contacts
insert into public.contacts (account_id, prenom, nom, fonction, email, telephone, role)
values
  ('a1111111-1111-1111-1111-111111111111', 'Alain', 'Godot', 'Gérant', 'alain.godot@godotfils.fr', '06 10 00 00 01', 'decideur'),
  ('a2222222-2222-2222-2222-222222222222', 'Bernard', 'Pascal', 'Gérant', 'b.pascal@lecepage.fr', '06 10 00 00 02', 'decideur'),
  ('a3333333-3333-3333-3333-333333333333', 'Marie', 'Brun', 'Boulangère', 'm.brun@gmail.com', '06 10 00 00 03', 'decideur'),
  ('a4444444-4444-4444-4444-444444444444', 'Thomas', 'Moreau', 'Architecte', 't.moreau@cabinet-moreau.fr', '06 10 00 00 04', 'decideur'),
  ('a6666666-6666-6666-6666-666666666666', 'Claire', 'Vidal', 'Pharmacienne', 'c.vidal@pharmaport.fr', '06 10 00 00 06', 'decideur'),
  ('a7777777-7777-7777-7777-777777777777', 'Julien', 'Rossi', 'DAF', 'j.rossi@bati-var.fr', '06 10 00 00 07', 'decideur')
on conflict do nothing;

-- Deals (affaires en cours)
insert into public.deals (titre, account_id, commercial_id, etape, probabilite, valeur, formule_preferee, date_cible)
values
  ('Équipement boutique principale', 'a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'devis_envoye', 50, 12500, 'achat_maintenance', current_date + interval '30 days'),
  ('Rénovation restaurant', 'a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'qualif', 30, 5800, 'leasing', current_date + interval '45 days'),
  ('Alarme boulangerie', 'a3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'nego', 75, 3200, 'achat', current_date + interval '14 days'),
  ('Intégration Crestron Home', 'a4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'prospection', 10, 45000, 'leasing', current_date + interval '90 days'),
  ('Villa - sécurité complète', 'a5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'devis_envoye', 50, 18500, 'achat_maintenance', current_date + interval '30 days'),
  ('Pharmacie - mise aux normes', 'a6666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 'signe', 100, 3614, 'achat_maintenance', current_date - interval '5 days'),
  ('Entrepôt Bâti-Var', 'a7777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', 'qualif', 30, 8900, 'leasing', current_date + interval '60 days')
on conflict do nothing;

-- Contrat maintenance en cours (pharmacie signée)
insert into public.maintenance_contracts (account_id, niveau, montant_annuel, date_debut, date_fin, statut)
values
  ('a6666666-6666-6666-6666-666666666666', 'confort', 520, current_date - interval '60 days', current_date + interval '305 days', 'actif'),
  ('a1111111-1111-1111-1111-111111111111', 'serenite', 1680, current_date - interval '330 days', current_date + interval '35 days', 'a_renouveler'),
  ('a7777777-7777-7777-7777-777777777777', 'confort', 980, current_date - interval '200 days', current_date + interval '165 days', 'actif')
on conflict do nothing;

-- Événements agenda
insert into public.events (type, title, account_id, commercial_id, date, duree, notes)
values
  ('rdv', 'RDV GODOT - validation devis', 'a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', now() + interval '1 day', 60, 'Apporter maquette caméras'),
  ('appel', 'Appel Dubois - relance devis villa', 'a5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', now(), 15, ''),
  ('visite', 'Audit Bâti-Var - entrepôt', 'a7777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', now() + interval '2 days', 120, 'Prévoir matériel mesure'),
  ('rdv', 'Présentation Crestron - Cabinet Moreau', 'a4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', now() + interval '3 days', 90, ''),
  ('intervention', 'Installation Pharmacie du Port', 'a6666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', now() + interval '5 days', 240, 'Technicien + commercial')
on conflict do nothing;

-- SAV tickets en cours
insert into public.sav_tickets (account_id, objet, description, status, priorite)
values
  ('a6666666-6666-6666-6666-666666666666', 'Détecteur zone 3 en défaut', 'Le client signale un détecteur qui déclenche sans raison', 'en_cours', 'normale'),
  ('a2222222-2222-2222-2222-222222222222', 'Caméra cuisine floue', 'La caméra au-dessus du passe est floue depuis 2 jours', 'ouvert', 'haute')
on conflict do nothing;
