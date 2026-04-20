# Déploiement — FOLONEO CRM

## 1. Supabase (une fois)

### 1.1 Créer le projet
1. https://supabase.com/dashboard → **New project**
2. Nom : `foloneo-crm`, région **eu-west-3 (Paris)** ou **eu-central-1 (Frankfurt)**
3. Noter le mot de passe DB

### 1.2 Appliquer le schéma
Dans le dashboard Supabase → **SQL Editor** → **New query** :
1. Copier-coller l'intégralité de `supabase/migrations/001_initial_schema.sql` → **Run**
2. Copier-coller `supabase/migrations/002_seed_demo.sql` → **Run** (optionnel — données démo)

### 1.3 Récupérer les clés
**Settings → API** :
- `Project URL` → `VITE_SUPABASE_URL`
- `anon` / `publishable key` → `VITE_SUPABASE_ANON_KEY`

## 2. Local

```bash
cp .env.example .env.local
```

Remplir `.env.local` :
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_USE_DEMO_DATA=false
```

Puis :
```bash
npm install
npm run dev
```

Tant que les migrations ne sont pas appliquées, garder `VITE_USE_DEMO_DATA=true` pour voir l'app tourner avec les données de démo.

## 3. Déploiement Vercel

### 3.1 Via l'interface web (plus simple)
1. https://vercel.com/new
2. Importer le repo GitHub `foloneo-crm`
3. Framework preset : **Vite** (auto-détecté)
4. Build command : `npm run build`
5. Output directory : `dist`
6. Environment variables :
   - `VITE_SUPABASE_URL` = `https://xxxxx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_...`
   - `VITE_USE_DEMO_DATA` = `false`
7. Deploy

### 3.2 Via CLI
```bash
npm install -g vercel
vercel login
vercel
# Suivre les questions, puis :
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_USE_DEMO_DATA    # valeur : false
vercel --prod
```

### 3.3 Configurer le redirect Supabase magic-link
Dans le dashboard Supabase → **Authentication → URL Configuration** :
- **Site URL** : `https://<ton-projet>.vercel.app`
- **Redirect URLs** : ajoute `https://<ton-projet>.vercel.app/**`

Sans ça, le lien magique enverra vers `localhost:5173` au lieu de ton domaine.

## 4. Création du premier compte

1. Aller sur l'URL Vercel
2. Entrer l'email Foloneo (ex: `stephanepitaud@foloneo.fr`)
3. Cliquer le lien reçu dans la boîte mail
4. L'app détecte qu'il n'existe pas de commercial pour cet email → formulaire "Création de ton profil"
5. Remplir (prénom, nom, rôle=Dirigeant) → profil créé, app accessible

## 5. Durcissement Row Level Security (optionnel, V2)

Par défaut la migration 001 active RLS avec une policy `authenticated_all` : tout utilisateur
connecté peut lire/écrire. Pour limiter (dirigeant vs commercial), éditer les policies
dans Supabase → **Authentication → Policies**.

Exemple minimal (dirigeants voient tout, commerciaux voient leurs propres deals) :
```sql
drop policy "authenticated_all" on public.deals;
create policy deals_all_dirigeant on public.deals for all to authenticated
  using (exists(select 1 from public.commerciaux where user_id = auth.uid() and role = 'dirigeant'))
  with check (exists(select 1 from public.commerciaux where user_id = auth.uid() and role = 'dirigeant'));
create policy deals_own_commercial on public.deals for all to authenticated
  using (commercial_id in (select id from public.commerciaux where user_id = auth.uid()))
  with check (commercial_id in (select id from public.commerciaux where user_id = auth.uid()));
```

## 6. Troubleshooting

**`npm run dev` plante** : `rm -rf node_modules package-lock.json && npm install`.

**Magic link ouvre localhost en prod** : vérifier les Redirect URLs dans Supabase.

**"relation X does not exist"** : les migrations n'ont pas été appliquées. Re-run les deux fichiers `.sql` dans Supabase SQL Editor.

**Les 927 KB du bundle** : pour réduire, `vite.config.ts` → `build.rollupOptions.output.manualChunks` ou dynamic imports. Pas critique en V1.
