# 🤖 PROMPT CLAUDE CODE — FOLONEO CRM

> **Tu es Claude Code.** Ce document est ta feuille de route pour finaliser le CRM Foloneo.
> Le projet est pré-câblé mais les vues métier sont à construire.
> Tu trouveras tout le code source d'origine dans `src/legacy/FoloneoAppMonolith.jsx` (≈3600 lignes).

---

## 🎯 Mission

Finir un CRM métier opérationnel pour **FOLONEO** (société de sécurité électronique, Toulon) qui remplace Sellsy.

**Stack** : Vite + React 18 + TypeScript + Tailwind + Supabase + lucide-react + recharts.

**Contrainte absolue** : le code doit être **typé strict**, **sans any implicite**, **testable**, **mobile-first (375px)**.

---

## 📐 Règles métier NON-NÉGOCIABLES

1. **Mode client vs interne** : quand `settings.clientMode === true`, **jamais** afficher :
   - Les marques (Ajax, Dahua, Vauban) → utiliser `libelleCommercial` uniquement
   - Les prix d'achat HT
   - Les marges
   - Les références fabricant
   
   En mode interne, tout est visible.

2. **Trois formules de vente** (dans QuoteWizard étape 3) :
   - **Achat sec** : client paie tout cash, pas de maintenance
   - **Achat + Maintenance** : cash + contrat annuel (Essentiel 5% / Confort 8% / Sérénité 12% du total HT par an)
   - **Leasing "Prestation de Service Global Évolutive"** : mensualité fixe sur 36/48/60 mois, tout inclus
   
   Le PDF Leasing ne montre **jamais** les prix unitaires ni les marques.

3. **Calcul des prix d'achat** :
   - Ajax : `prixSylis × coefAjax` (défaut 0.45)
   - Dahua : `(prixMarché_TTC / dahuaDiv) × coefDahua` (défaut 1.20 / 0.45)
   - Tous les coefficients sont éditables dans Settings → `DEFAULT_SETTINGS` dans `src/lib/constants.ts`

4. **Calcul leasing** (fonction `calcDevisTotaux` dans `src/lib/calculations.ts` — déjà implémentée et testable) :
   ```
   mensualité_matériel      = totalHT × coefMensuel[durée]
   mensualité_maintenance   = (totalHT × 0.08) / 12   (niveau confort par défaut)
   mensualité_évolutions    = (totalHT × 0.08) / 12   (provision)
   mensualité_totale        = somme des 3
   ```

5. **Tutoiement** (`tu`, jamais `vous`) partout, tone pro mais direct.

6. **Charte graphique** : navy `#0B1E3F`, or `#C9A961`, fond `#F7F8FA`.

---

## 🗺️ Roadmap — ordre d'exécution

Construit les modules dans **cet ordre précis**. Chaque module doit compiler (`npm run typecheck`) et tourner (`npm run dev`) avant de passer au suivant.

### Module 0 : Audit & warm-up (⏱ 15 min)

```
1. Lire README.md, ce fichier, et src/types/index.ts intégralement
2. Lire src/legacy/FoloneoAppMonolith.jsx en entier (c'est la source de vérité pour le métier)
3. Lancer `npm install && npm run dev` — vérifier que le Dashboard minimal s'affiche
4. Lancer `npm run typecheck` — doit passer
```

### Module 1 : Data layer Supabase (⏱ 1h)

**Objectif** : remplacer le `DEMO_STATE` en dur par de vraies requêtes Supabase, avec fallback démo si non configuré.

**Fichiers à créer** :
- `src/lib/db/accounts.ts` — CRUD comptes
- `src/lib/db/contacts.ts` — CRUD contacts
- `src/lib/db/deals.ts` — CRUD deals
- `src/lib/db/quotes.ts` — CRUD devis + quote_lines
- `src/lib/db/invoices.ts` — CRUD factures
- `src/lib/db/contracts.ts` — CRUD contrats maintenance
- `src/lib/db/products.ts` — CRUD produits + packs
- `src/lib/db/events.ts` — CRUD agenda
- `src/lib/db/sav.ts` — CRUD tickets SAV
- `src/lib/db/commerciaux.ts` — CRUD équipe
- `src/lib/db/settings.ts` — read/update settings (mono-ligne id=1)
- `src/lib/db/index.ts` — barrel export

**Template** pour chaque fichier (exemple accounts.ts) :
```ts
import { supabase, useDemoData } from "@/lib/supabase";
import { DEMO_STATE } from "@/lib/demo-data";
import type { Account } from "@/types";

// Mapping DB snake_case → TS camelCase
const fromRow = (r: any): Account => ({
  id: r.id,
  raisonSociale: r.raison_sociale,
  secteur: r.secteur,
  source: r.source,
  adresse: r.adresse,
  codePostal: r.code_postal,
  ville: r.ville,
  telephone: r.telephone,
  email: r.email,
  siret: r.siret,
  latitude: r.latitude,
  longitude: r.longitude,
  notes: r.notes,
  createdAt: r.created_at,
});

const toRow = (a: Partial<Account>): any => ({
  raison_sociale: a.raisonSociale,
  secteur: a.secteur,
  source: a.source,
  // ...
});

export async function listAccounts(): Promise<Account[]> {
  if (useDemoData || !supabase) return DEMO_STATE.accounts;
  const { data, error } = await supabase.from("accounts").select("*").order("raison_sociale");
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function createAccount(a: Omit<Account, "id" | "createdAt">): Promise<Account> {
  if (useDemoData || !supabase) throw new Error("Mode démo : activer Supabase pour créer");
  const { data, error } = await supabase.from("accounts").insert(toRow(a)).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateAccount(id: string, patch: Partial<Account>): Promise<Account> {
  if (useDemoData || !supabase) throw new Error("Mode démo");
  const { data, error } = await supabase.from("accounts").update(toRow(patch)).eq("id", id).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteAccount(id: string): Promise<void> {
  if (useDemoData || !supabase) throw new Error("Mode démo");
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw error;
}
```

**Puis** : créer un hook `src/hooks/useAppState.ts` qui charge tout au boot et expose un state global + setters. Remplacer `useState<AppState>(DEMO_STATE)` dans `App.tsx` par ce hook.

### Module 2 : Auth Supabase (⏱ 30 min)

- Créer `src/components/AuthGate.tsx` : écran de login simple (email magic link Supabase).
- Enrober `<App />` dans `<AuthGate>` dans `main.tsx`.
- Ajouter le bouton de déconnexion dans la Sidebar (footer utilisateur).
- Le `user_id` Supabase doit correspondre à `commerciaux.user_id` — si aucun commercial n'existe pour cet email, proposer à Stéphane de créer son compte.

### Module 3 : Pipeline + Comptes + Contacts (⏱ 2h)

**Créer** :
- `src/components/views/Pipeline.tsx` — Kanban drag & drop entre étapes
- `src/components/views/Accounts.tsx` — Liste + filtres secteur/source + CRUD
- `src/components/views/Contacts.tsx` — Liste + filtres rôle + CRUD
- `src/components/modals/AccountEditor.tsx` — Modal CRUD compte
- `src/components/modals/ContactEditor.tsx` — Modal CRUD contact
- `src/components/modals/DealEditor.tsx` — Modal CRUD deal

**Source** : les fonctions `Pipeline`, `AccountsView`, `ContactsView`, `AccountEditor`, `ContactEditor`, `DealEditor` dans `src/legacy/FoloneoAppMonolith.jsx`. Les récupérer, les typer en TS, les brancher aux fonctions DB du Module 1.

### Module 4 : Générateur de devis 4 étapes (⏱ 3h — LE morceau critique)

**Créer** :
- `src/components/views/Quotes.tsx` — Liste des devis avec filtres status
- `src/components/wizard/QuoteWizard.tsx` — Modal 4 étapes
- `src/components/wizard/WizardStep1Client.tsx` — Client + site
- `src/components/wizard/WizardStep2Catalog.tsx` — Ajout produits/packs/MO
- `src/components/wizard/WizardStep3Formules.tsx` — Les 3 cards Achat/Achat+Maintenance/Leasing
- `src/components/wizard/WizardStep4Generate.tsx` — Générer PDF + envoyer
- `src/components/PrintView.tsx` — Templates PDF Achat (1 page) et Leasing (4 pages)

**Règles** :
- L'étape 3 doit recalculer en live quand on change : qté d'un produit, niveau de maintenance, durée leasing.
- Le footer de la modal affiche toujours Total HT + mensualité leasing.
- **Critical** : le PDF Leasing ne doit **JAMAIS** contenir de prix unitaire ni de marque. Test : chercher "Ajax", "Dahua", "Vauban", "€" devant un chiffre unitaire → doit retourner 0 match.

**Source** : `QuoteWizard`, `WizardStep1-4`, `PrintView`, `calcDevisTotaux` dans le legacy.

### Module 5 : Catalogue + Packs (⏱ 1h30)

- `src/components/views/Catalog.tsx`
- `src/components/modals/ProductEditor.tsx` — avec calcul auto du prix d'achat selon marque
- `src/components/modals/PackEditor.tsx` — composition de pack

### Module 6 : Maintenance + Facturation (⏱ 2h)

- `src/components/views/Maintenance.tsx` — Liste contrats + alertes J-60/J-30/J-15 + renouvellement 1-clic
- `src/components/views/Invoices.tsx` — Liste factures + transformation devis→facture + export CSV FEC

### Module 7 : Équipe + Agenda + SAV (⏱ 1h30)

- `src/components/views/Team.tsx` — Fiches commerciaux + objectifs + commissions par mode
- `src/components/views/Calendar.tsx` — Vue mois + liste événements du jour
- `src/components/views/Sav.tsx` — Tickets + contact SAV (sav@foloneo.fr)

### Module 8 : Dashboard enrichi (⏱ 1h)

Enrichir le Dashboard minimal actuel :
- Graphique AreaChart 6 mois CA vs objectif (recharts)
- Alertes actives (devis >15j / contrats <60j / factures retard)
- Classement commerciaux avec objectifs et commissions
- VarMap SVG des prospects géolocalisés dans le Var
- Filtres commercial + période (déjà prévus dans la TopBar)

### Module 9 : Settings + Export/Import + Command Palette (⏱ 1h)

- `src/components/views/Settings.tsx` — Éditer tous les coefficients + info société + Export/Import JSON
- `src/components/layout/CommandPalette.tsx` — Ctrl+K avec navigation rapide + "N" pour nouveau devis

### Module 10 : Tests & déploiement (⏱ 1h)

- Vérifier les 7 critères d'acceptation (voir ci-dessous)
- Déployer sur Vercel : `npm run build`, brancher le repo, ajouter les env vars Supabase

---

## ✅ Critères d'acceptation (à valider en fin de parcours)

1. ✅ Créer un compte → ajouter contact → créer affaire → générer devis avec 5 produits → voir formules Achat ET Leasing côte à côte
2. ✅ PDF Leasing généré : aucun prix unitaire, aucune marque mentionnée
3. ✅ Toggle "Mode client" dans la TopBar masque/affiche marques et prix d'achat instantanément partout
4. ✅ Dashboard filtrable par commercial + période
5. ✅ UI utilisable au pouce sur viewport 375px (iPhone 13 mini)
6. ✅ Export JSON complet → import → données identiques
7. ✅ `npm run typecheck` passe sans erreur, `npm run build` passe sans erreur, zéro `console.log`, zéro `TODO` restant

---

## 🗃️ Ressources & conventions

### Types métier
Tous dans `src/types/index.ts`. **Ne pas dupliquer, ne pas renommer.**

### Appeler Supabase
Toujours via `src/lib/db/*.ts`, **jamais** directement `supabase.from(...)` dans un composant.

### Formatage
Toujours utiliser les helpers dans `src/lib/helpers.ts` : `fmtEUR`, `fmtDate`, `fmtPct`, `cx`, `uid`.

### Calculs devis
**Toujours** passer par `calcDevisTotaux()` dans `src/lib/calculations.ts`. Ne pas recalculer à la main dans les composants.

### Icônes
Toutes depuis `lucide-react`. Pas d'emoji dans l'interface pro.

### Erreurs
Utiliser un toast ou une `<Card tone="red">` inline, jamais `alert()`.

### RLS
En v1, policy `authenticated_all` partout. V2 à faire plus tard (dirigeant vs commercial scoping).

---

## 🚫 Ce qu'il ne faut PAS faire

- ❌ Utiliser `any` ou `as any` autrement qu'en commentant précisément pourquoi
- ❌ Ajouter `localStorage` ou `sessionStorage` (Supabase gère la persistance)
- ❌ Ajouter des dépendances sans raison (Lodash, moment, etc. — utiliser le natif ou helpers existants)
- ❌ Modifier `src/legacy/` — c'est de la lecture seule, juste une référence
- ❌ Créer des composants sans types de props explicites
- ❌ Oublier les cas d'erreur et de loading dans les appels async
- ❌ Faire du CSS inline sauf pour les couleurs dynamiques (étapes pipeline, couleurs commerciaux)

---

## 🔧 Snippets utiles

### Hook useAppState (à créer en Module 1)
```ts
// src/hooks/useAppState.ts
import { useEffect, useState } from "react";
import type { AppState } from "@/types";
import { DEMO_STATE } from "@/lib/demo-data";
import { useDemoData } from "@/lib/supabase";
import * as db from "@/lib/db";

export function useAppState() {
  const [state, setState] = useState<AppState>(DEMO_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (useDemoData) { setLoading(false); return; }
    (async () => {
      try {
        const [accounts, contacts, products, packs, deals, quotes, invoices, contrats, commerciaux, events, sav, settings] = await Promise.all([
          db.listAccounts(), db.listContacts(), db.listProducts(), db.listPacks(),
          db.listDeals(), db.listQuotes(), db.listInvoices(), db.listContracts(),
          db.listCommerciaux(), db.listEvents(), db.listSav(), db.getSettings(),
        ]);
        setState({ settings, accounts, contacts, products, packs, deals, quotes, invoices, contrats, commerciaux, events, sav, interactions: [] });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { state, setState, loading, error };
}
```

### Pattern optimistic update
```ts
const saveDeal = async (d: Deal) => {
  // Optimistic : update UI avant la DB
  setState(s => ({ ...s, deals: s.deals.some(x => x.id === d.id) 
    ? s.deals.map(x => x.id === d.id ? d : x) 
    : [...s.deals, d] 
  }));
  try {
    d.id ? await db.updateDeal(d.id, d) : await db.createDeal(d);
  } catch (e) {
    // Rollback + notifier
    console.error(e);
    // TODO: reload state ou afficher un toast
  }
};
```

---

## 📋 Checklist de démarrage

Avant de coder, confirme à Stéphane :

- [ ] Le projet Supabase est créé et les migrations appliquées
- [ ] Le fichier `.env.local` contient les bonnes clés
- [ ] `npm run dev` affiche le Dashboard sans erreur console
- [ ] `npm run typecheck` passe
- [ ] Tu as bien lu `src/legacy/FoloneoAppMonolith.jsx` en entier

Puis annonce le planning : "Je commence par le Module 1 (data layer Supabase), tu veux que je te valide à la fin de chaque module ou je continue en autonomie ?"

---

## 💬 Style de communication attendu

- Français, tutoiement systématique
- Direct, sans chichis, avec touche d'humour
- Explications courtes, step-by-step pour les intégrations
- Pas d'emojis dans le code, OK dans les commits

---

**Bonne chance. Stéphane attend un CRM qui remplace Sellsy — pas un jouet.**
