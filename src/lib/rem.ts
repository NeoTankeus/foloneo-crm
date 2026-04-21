// ============================================================================
// PLAN DE REMUNERATION FOLONEO 2026 — Commercial Terrain
// ----------------------------------------------------------------------------
// Reference : foloneo_plan_remuneration_v3.pdf
// Grille unique achat + leasing, paliers progressifs sur le CA HT cumule
// du mois. Min Garanti versé si commissions < MG. Bonus trimestriels + primes
// complementaires s'ajoutent toujours.
// ============================================================================

import type { AppState, Quote, Settings } from "@/types";
import { calcDevisTotaux } from "@/lib/calculations";

// ============================================================================
// GRILLE DE COMMISSIONS (paliers progressifs)
// ============================================================================
export interface Palier {
  min: number; // seuil bas inclus
  max: number | null; // seuil haut exclu ; null = pas de limite haute
  taux: number; // 0.025 = 2.5 %
  label: string;
}

export const PALIERS_COMMISSION: Palier[] = [
  { min: 0, max: 1823, taux: 0, label: "MG (0 %)" },
  { min: 1823, max: 8000, taux: 0.025, label: "2,5 %" },
  { min: 8000, max: 24000, taux: 0.05, label: "5 %" },
  { min: 24000, max: 40000, taux: 0.1, label: "10 %" },
  { min: 40000, max: null, taux: 0.15, label: "15 %" },
];

// ============================================================================
// BONUS TRIMESTRIEL selon le nombre d'affaires signees
// ============================================================================
export const BONUS_TRIMESTRIELS: { affaires: number; montant: number }[] = [
  { affaires: 16, montant: 1500 },
  { affaires: 12, montant: 1000 },
  { affaires: 8, montant: 500 },
];

// ============================================================================
// PRIMES COMPLEMENTAIRES
// ============================================================================
export const PRIMES = {
  avisGoogle: 50, // par avis 5 etoiles
  telesurveillance: { seuilContrats: 10, montant: 500 }, // par trimestre
  accessoires: { seuilCAHT: 2000, montant: 1000 }, // par trimestre
} as const;

// ============================================================================
// CALCUL DE LA COMMISSION MENSUELLE SELON LE CA CUMULE
// ============================================================================
export interface CommissionBreakdown {
  ca: number;
  commissionBrute: number;
  versement: number; // max(MG, commissionBrute)
  minimumGaranti: number;
  breakdown: { palier: Palier; caDansPalier: number; commission: number }[];
  palierAtteint: Palier; // le dernier palier touche
}

export function calcCommissionMensuelle(
  caMois: number,
  minimumGaranti: number,
  paliers: Palier[] = PALIERS_COMMISSION
): CommissionBreakdown {
  let commissionBrute = 0;
  const breakdown: CommissionBreakdown["breakdown"] = [];
  let palierAtteint = paliers[0];

  for (const p of paliers) {
    const haut = p.max ?? Number.POSITIVE_INFINITY;
    if (caMois <= p.min) break;
    const caDansPalier = Math.min(caMois, haut) - p.min;
    const commission = caDansPalier * p.taux;
    commissionBrute += commission;
    breakdown.push({ palier: p, caDansPalier, commission });
    palierAtteint = p;
    if (caMois <= haut) break;
  }

  const versement = Math.max(minimumGaranti, commissionBrute);
  return {
    ca: caMois,
    commissionBrute: +commissionBrute.toFixed(2),
    versement: +versement.toFixed(2),
    minimumGaranti,
    breakdown,
    palierAtteint,
  };
}

// ============================================================================
// CONVERSION QUOTE -> CA HT POUR COMMISSION
// Achat / Achat+Maint : totalHT du devis.
// Leasing : mensualite * 48 (peu importe la duree du contrat, conformement au
// plan de remuneration 2026).
// ============================================================================
export function caForCommission(
  quote: Quote,
  settings: Settings,
  state: AppState
): number {
  const t = calcDevisTotaux(quote, settings, state.products);
  if (quote.formuleChoisie === "leasing") {
    return +(t.mensualiteTotale * 48).toFixed(2);
  }
  return +t.totalHT.toFixed(2);
}

// ============================================================================
// CA D'UN COMMERCIAL SUR UNE PERIODE
// On regarde les quotes signees (status signe_achat / signe_leasing) avec
// signedAt dans l'intervalle.
// ============================================================================
export interface CaPeriode {
  caTotal: number;
  caAchat: number;
  caLeasing: number;
  nbAffaires: number;
  nbAffairesAchat: number;
  nbAffairesLeasing: number;
}

export function caCommercialPeriode(
  commercialId: string,
  from: Date,
  to: Date,
  state: AppState,
  settings: Settings
): CaPeriode {
  let caTotal = 0;
  let caAchat = 0;
  let caLeasing = 0;
  let nbAffaires = 0;
  let nbAffairesAchat = 0;
  let nbAffairesLeasing = 0;

  state.quotes
    .filter(
      (q) =>
        q.commercialId === commercialId &&
        (q.status === "signe_achat" || q.status === "signe_leasing") &&
        q.signedAt
    )
    .forEach((q) => {
      const d = new Date(q.signedAt!);
      if (d < from || d >= to) return;
      const ca = caForCommission(q, settings, state);
      caTotal += ca;
      nbAffaires++;
      if (q.formuleChoisie === "leasing") {
        caLeasing += ca;
        nbAffairesLeasing++;
      } else {
        caAchat += ca;
        nbAffairesAchat++;
      }
    });

  return {
    caTotal: +caTotal.toFixed(2),
    caAchat: +caAchat.toFixed(2),
    caLeasing: +caLeasing.toFixed(2),
    nbAffaires,
    nbAffairesAchat,
    nbAffairesLeasing,
  };
}

// ============================================================================
// BONUS TRIMESTRIEL selon nb affaires sur 3 mois
// ============================================================================
export function calcBonusTrimestriel(
  nbAffaires: number,
  paliers = BONUS_TRIMESTRIELS
): number {
  // paliers triés decroissant
  for (const p of paliers) {
    if (nbAffaires >= p.affaires) return p.montant;
  }
  return 0;
}

// ============================================================================
// BORNES DE PERIODES
// ============================================================================
export function monthBounds(d: Date = new Date()): { from: Date; to: Date } {
  const from = new Date(d.getFullYear(), d.getMonth(), 1);
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { from, to };
}

export function quarterBounds(d: Date = new Date()): { from: Date; to: Date } {
  const q = Math.floor(d.getMonth() / 3);
  const from = new Date(d.getFullYear(), q * 3, 1);
  const to = new Date(d.getFullYear(), q * 3 + 3, 1);
  return { from, to };
}
