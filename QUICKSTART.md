# ⚡ QUICKSTART FOLONEO CRM

> 3 commandes pour démarrer. Lis ça en 2 minutes et tu as l'app en local.

---

## 🏁 Option rapide : juste voir tourner l'app (2 min)

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer
npm run dev
```

👉 Ouvre http://localhost:5173 — tu dois voir le dashboard avec les données de démo.

---

## 🔌 Brancher Supabase (10 min)

### 1. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com) → **New project**
2. Nom : `foloneo-crm`
3. Région : **Paris** ou **Frankfurt**
4. Mot de passe DB : garde-le précieusement

### 2. Appliquer les migrations

Dans Supabase → **SQL Editor** → **New query** :

1. Copie-colle `supabase/migrations/001_initial_schema.sql` → **Run**
2. Copie-colle `supabase/migrations/002_seed_demo.sql` → **Run**

### 3. Récupérer tes clés

Dans Supabase → **Settings** → **API** :
- Copie **Project URL**
- Copie **anon public key**

### 4. Configurer le .env

```bash
cp .env.example .env.local
```

Ouvre `.env.local` et remplis :
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ....
VITE_USE_DEMO_DATA=false
```

### 5. Relancer

```bash
npm run dev
```

Le bandeau orange "Mode démo" doit avoir disparu.

---

## 🤖 Finir le projet avec Claude Code

```bash
# Installer Claude Code si pas déjà fait
npm install -g @anthropic-ai/claude-code

# Lancer dans le dossier du projet
cd foloneo-crm
claude-code
```

Puis dans Claude Code, dis-lui simplement :

> **"Lis PROMPT_CLAUDE_CODE.md et commence par le module 1."**

Il va lire le prompt, le legacy, et construire les vues une par une.

---

## 📂 Ce qui est déjà là

✅ **Projet Vite + React 18 + TS + Tailwind** configuré
✅ **Schéma Supabase complet** (14 tables, enums, RLS, triggers, seed)
✅ **Types métier** (`src/types/index.ts`) — Account, Deal, Quote, Invoice, etc.
✅ **Helpers & calculs** (`src/lib/helpers.ts`, `calculations.ts`)
✅ **Constantes métier** (`src/lib/constants.ts`) — ETAPES, SECTEURS, NIVEAUX_MAINTENANCE, DEFAULT_SETTINGS
✅ **Primitives UI** (`src/components/ui/*`) — Button, Card, Input, Modal, Stat, Badge
✅ **App.tsx minimal** avec Sidebar + TopBar + Dashboard basique
✅ **Données de démo** (`src/lib/demo-data.ts`) — 7 comptes, 8 deals, 3 devis, etc.
✅ **Legacy préservé** (`src/legacy/FoloneoAppMonolith.jsx`) — 3600 lignes à splitter

## 🚧 Ce qui reste à faire (Claude Code)

❌ Data layer Supabase (`src/lib/db/*.ts`)
❌ Auth Supabase (magic link)
❌ Vues métier : Pipeline, Accounts, Contacts, Quotes+Wizard, Catalog, Maintenance, Invoices, Team, Calendar, SAV, Settings
❌ Composants modaux (AccountEditor, DealEditor, etc.)
❌ PrintView pour PDF Achat et Leasing
❌ Dashboard enrichi (charts + VarMap)
❌ Command Palette Ctrl+K
❌ Tests & déploiement Vercel

---

## 🆘 Troubleshooting

**L'app ne démarre pas ?**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Les migrations Supabase échouent ?**
- Assure-toi de les exécuter dans l'ordre (001 puis 002)
- Extension `uuid-ossp` : dans Supabase, va dans **Database → Extensions** et active-la si besoin

**`npm run typecheck` râle ?**
- Probablement un import cassé — le projet attend que tous les fichiers soient là après le passage de Claude Code

---

Stéphane — t'as tout ce qu'il faut. Bonne build 🚀
