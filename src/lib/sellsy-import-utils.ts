// Utilitaires partages par les imports Sellsy (accounts / devis / factures).
// Tout ce qui est commun (normalisation, lecture xlsx, detection colonnes)
// vit ici pour eviter la duplication entre les 3 modales.

import * as XLSX from "xlsx";
import type { Account } from "@/types";
import * as db from "@/lib/db";

// -------------------------------------------------------------------------
// Normalisation et correspondance floue
// -------------------------------------------------------------------------

export function normalize(s: string | undefined | null): string {
  if (!s) return "";
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Detection automatique des colonnes par recherche d'indices dans l'entete.
// Le premier field qui matche gagne ; chaque field n'est utilise qu'une fois.
// IG : type litteral de la valeur "ignore" (ex: "__ignore__").
export function autoDetectMapping<F extends string, IG extends string = "__ignore__">(
  headers: string[],
  hints: Record<F, string[]>,
  ignoreValue: IG = "__ignore__" as IG
): Record<string, F | IG> {
  const mapping: Record<string, F | IG> = {};
  const used = new Set<string>();
  for (const h of headers) {
    const n = normalize(h);
    let best: F | IG = ignoreValue;
    for (const [field, hintList] of Object.entries(hints) as [F, string[]][]) {
      if (used.has(field)) continue;
      if (hintList.some((hint) => n.includes(hint))) {
        best = field;
        break;
      }
    }
    if (best !== ignoreValue) used.add(best);
    mapping[h] = best;
  }
  return mapping;
}

// -------------------------------------------------------------------------
// Lecture fichier
// -------------------------------------------------------------------------

export type ParsedFile = {
  filename: string;
  headers: string[];
  rows: Record<string, unknown>[];
};

export async function parseSpreadsheet(f: File): Promise<ParsedFile> {
  const buffer = await f.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) throw new Error("Aucune feuille trouvée.");
  const ws = wb.Sheets[firstSheet];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, {
    defval: "",
    raw: false,
  });
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  return { filename: f.name, headers, rows };
}

// -------------------------------------------------------------------------
// Resolution compte client (raison sociale -> Account existant OU nouveau)
// -------------------------------------------------------------------------

export type ResolvedAccount = { account: Account; created: boolean } | null;

export function matchAccountByName(name: string, accounts: Account[]): Account | null {
  const n = normalize(name);
  if (!n) return null;
  // 1. Match strict
  const strict = accounts.find((a) => normalize(a.raisonSociale) === n);
  if (strict) return strict;
  // 2. Match par SIRET si saisie semble numerique
  if (/^\d{9,14}$/.test(n.replace(/\s/g, ""))) {
    const bySiret = accounts.find((a) => normalize(a.siret ?? "") === n.replace(/\s/g, ""));
    if (bySiret) return bySiret;
  }
  // 3. Match flou : l'un contient l'autre (premiers 20 chars pour eviter les faux positifs)
  const n20 = n.slice(0, 20);
  const fuzzy = accounts.find((a) => {
    const an = normalize(a.raisonSociale).slice(0, 20);
    if (an.length < 4 || n20.length < 4) return false;
    return an.includes(n20) || n20.includes(an);
  });
  return fuzzy ?? null;
}

// Trouve un compte ou en cree un minimal (raison sociale uniquement).
export async function resolveOrCreateAccount(
  rawName: string,
  accounts: Account[]
): Promise<ResolvedAccount> {
  const name = (rawName ?? "").trim();
  if (!name) return null;
  const existing = matchAccountByName(name, accounts);
  if (existing) return { account: existing, created: false };
  // Creation minimaliste. Les secteurs/sources par defaut seront pris
  // depuis le schema DB. raisonSociale est l'unique champ requis a ce stade.
  const created = await db.createAccount({
    raisonSociale: name,
    secteur: "tertiaire",
    source: "partenaire",
    adresse: "",
    codePostal: "",
    ville: "",
  });
  return { account: created, created: true };
}

// -------------------------------------------------------------------------
// Parsing des valeurs usuelles (nombre FR, date)
// -------------------------------------------------------------------------

// Sellsy exporte les montants en format FR ("1 234,56 €") ou "1234.56"
export function parseNumberFR(raw: unknown): number {
  if (raw === null || raw === undefined || raw === "") return 0;
  if (typeof raw === "number") return raw;
  const s = String(raw)
    .replace(/[\s\u00A0\u202F]/g, "") // espaces (normaux, insecables)
    .replace(/[€$£]/g, "")
    .replace(/,/g, ".");
  // Si plusieurs points, le dernier est le decimal
  const parts = s.split(".");
  if (parts.length > 2) {
    const dec = parts.pop();
    const int = parts.join("");
    const n = Number(`${int}.${dec}`);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// Sellsy exporte les dates en "JJ/MM/AAAA" ou ISO. Retourne ISO (YYYY-MM-DD)
// ou null si parsing impossible.
export function parseDateAny(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const s = String(raw).trim();
  // ISO complet
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // JJ/MM/AAAA (ou JJ-MM-AAAA)
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (m) {
    const d = m[1].padStart(2, "0");
    const mo = m[2].padStart(2, "0");
    let y = m[3];
    if (y.length === 2) y = Number(y) < 50 ? `20${y}` : `19${y}`;
    return `${y}-${mo}-${d}`;
  }
  // Date JS-parsable
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  return null;
}
