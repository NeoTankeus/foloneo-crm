# FOLONEO CRM

CRM métier sur-mesure pour FOLONEO — sécurité électronique, Toulon.

**Stack** : Vite + React 18 + TypeScript + Tailwind CSS + Supabase + lucide-react + recharts.

---

## 🚀 Démarrage rapide

### 1. Installation

```bash
cd foloneo-crm
npm install
```

### 2. Lancer en mode démo (sans Supabase)

```bash
npm run dev
```

L'app démarre sur `http://localhost:5173` avec les données de démonstration (`src/lib/demo-data.ts`). Pratique pour itérer sur l'UI sans se brancher à la base.

### 3. Brancher Supabase (mode production)

#### a. Créer le projet Supabase

1. Aller sur [supabase.com](https://supabase.com) → **New project**
2. Nom : `foloneo-crm` — Région : `eu-west-3 (Paris)` ou `eu-central-1 (Frankfurt)`
3. Noter l'URL du projet et la `anon` key (**Settings → API**)

#### b. Appliquer le schéma

Deux options :

**Option A — Via l'interface Supabase** (la plus simple) :
1. Ouvrir **SQL Editor** dans le dashboard Supabase
2. Copier-coller le contenu de `supabase/migrations/001_initial_schema.sql` → **Run**
3. Copier-coller le contenu de `supabase/migrations/002_seed_demo.sql` → **Run** (optionnel, pour avoir des données de test)

**Option B — Via le CLI Supabase** :
```bash
npx supabase login
npx supabase link --project-ref <ton-project-ref>
npx supabase db push
```

#### c. Configurer les variables d'environnement

```bash
cp .env.example .env.local
```

Éditer `.env.local` :

```env
VITE_SUPABASE_URL=https://<ton-projet>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_USE_DEMO_DATA=false
```

#### d. Créer ton compte utilisateur

Dans Supabase → **Authentication → Users → Add user**. Utiliser ton email pro Foloneo.

#### e. Redémarrer

```bash
npm run dev
```

Le bandeau "Mode démo" doit disparaître — tu es branché sur Supabase.

---

## 📂 Structure du projet

```
foloneo-crm/
├── public/                        # Assets statiques
├── src/
│   ├── main.tsx                   # Entry point React
│   ├── App.tsx                    # Racine de l'app, routing, layout
│   ├── index.css                  # Tailwind + styles globaux
│   │
│   ├── lib/
│   │   ├── supabase.ts            # Client Supabase
│   │   ├── constants.ts           # BRAND, ETAPES, SECTEURS, NIVEAUX_MAINTENANCE, DEFAULT_SETTINGS
│   │   ├── helpers.ts             # fmtEUR, fmtDate, cx, uid, downloadFile, …
│   │   ├── calculations.ts        # calcDevisTotaux (LA fonction métier centrale)
│   │   └── demo-data.ts           # Données de démo (utilisées si pas de Supabase)
│   │
│   ├── types/
│   │   ├── index.ts               # Types métier (Account, Deal, Quote, Invoice, …)
│   │   └── database.ts            # Types Supabase (à régénérer)
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx         # Variants: primary/gold/ghost/outline/danger/subtle
│   │   │   ├── primitives.tsx     # Card, Input, Select, Textarea, Badge
│   │   │   └── overlays.tsx       # Modal, Stat, EmptyState
│   │   ├── layout/                # Sidebar, TopBar, CommandPalette (à créer)
│   │   └── views/                 # Dashboard, Pipeline, Accounts, … (à créer)
│   │
│   └── legacy/
│       └── FoloneoAppMonolith.jsx # ⚠️ Référence : ancien fichier monolithique de 3500+ lignes
│                                  #    Utilisé par Claude Code comme source pour splitter.
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql # 14 tables, enums, triggers, RLS, vues
│       └── 002_seed_demo.sql      # Seed données démo
│
├── .env.example                   # Modèle pour .env.local
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── PROMPT_CLAUDE_CODE.md          # ⭐ Feuille de route pour Claude Code
└── README.md                      # Ce fichier
```

---

## 🤖 Finir avec Claude Code

Le projet est pré-câblé mais **toutes les vues métier restent à construire**. La plupart du code existe déjà dans `src/legacy/FoloneoAppMonolith.jsx` — il s'agit de le splitter et de le brancher à Supabase.

Lire **[PROMPT_CLAUDE_CODE.md](./PROMPT_CLAUDE_CODE.md)** pour la feuille de route complète.

**Lancement rapide** :
```bash
cd foloneo-crm
claude-code
```

Puis dans Claude Code :
```
Lis PROMPT_CLAUDE_CODE.md et commence par le module 1 (Pipeline).
```

---

## 🧪 Scripts disponibles

| Script | Description |
|---|---|
| `npm run dev` | Démarre le serveur de dev sur :5173 |
| `npm run build` | Build production dans `dist/` |
| `npm run preview` | Preview du build prod |
| `npm run typecheck` | Vérifie les types TypeScript |
| `npm run lint` | Lint ESLint |

---

## 🎨 Charte graphique

- **Bleu nuit Foloneo** : `#0B1E3F` → classe `bg-foloneo-navy`
- **Or** : `#C9A961` → classe `bg-foloneo-gold`
- **Fond** : `#F7F8FA` → classe `bg-foloneo-bg`
- **Rouge alerte** : `#E53E3E` → classe `bg-foloneo-red`
- **Font** : Inter (chargée depuis Google Fonts dans `index.html`)

---

## 🔐 Sécurité & RLS

La migration active Row Level Security sur toutes les tables avec une policy `authenticated_all` (tout utilisateur connecté peut tout lire/écrire). 

**À durcir en v2** selon les règles suivantes :
- Un **dirigeant** voit tout.
- Un **commercial** voit uniquement ses comptes, ses deals, ses devis (`commercial_id = auth.uid()`).
- Tout le monde voit le catalogue et les packs.
- Les factures sont restreintes au dirigeant.

---

## 📞 Support

Stéphane Pitaud — stephanepitaud@foloneo.fr
