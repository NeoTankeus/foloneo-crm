import type { Quote, Product, Settings } from "@/types";
import { NIVEAUX_MAINTENANCE } from "./constants";

// ============================================================================
// CALCUL PRIX D'ACHAT
// ============================================================================

/** Ajax : prix d'achat = prix Sylis × coef (défaut 0.45) */
export const calcPrixAchatAjax = (prixSylis: number, coef: number): number =>
  +(prixSylis * coef).toFixed(2);

/** Dahua : prix d'achat = (prix marché TTC ÷ dahuaDiv) × coef */
export const calcPrixAchatDahua = (
  prixMarche: number,
  dahuaDiv: number,
  coef: number
): number => +((prixMarche / dahuaDiv) * coef).toFixed(2);

/** Calcul automatique selon la marque */
export const calcPrixAchat = (
  product: Pick<Product, "marque" | "prixSylis" | "prixMarche" | "prixAchatHT">,
  settings: Settings
): number => {
  if (product.marque === "ajax") {
    return calcPrixAchatAjax(product.prixSylis || 0, settings.coefAjax);
  }
  if (product.marque === "dahua") {
    return calcPrixAchatDahua(
      product.prixMarche || 0,
      settings.dahuaDiv,
      settings.coefDahua
    );
  }
  return product.prixAchatHT || 0;
};

// ============================================================================
// CALCUL D'UN DEVIS COMPLET — fonction centrale
// ============================================================================

export interface DevisTotaux {
  // Base
  sousTotalAchat: number;
  sousTotalVente: number;
  coutMO: number;
  coutDepl: number;
  coutTotal: number;
  // Achat
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  margeBrute: number;
  tauxMarge: number;
  // Maintenance achat
  niveauAchat: (typeof NIVEAUX_MAINTENANCE)[keyof typeof NIVEAUX_MAINTENANCE];
  maintenanceAnnuelle: number;
  // Leasing
  duree: 36 | 48 | 60;
  niveauLeasing: (typeof NIVEAUX_MAINTENANCE)[keyof typeof NIVEAUX_MAINTENANCE];
  mensualiteMateriel: number;
  mensualiteMaintenance: number;
  mensualiteEvolutions: number;
  mensualiteTotale: number;
  totalLeasing: number;
  // Commissions
  commissionAchat: number;
  commissionLeasing: number;
}

export function calcDevisTotaux(
  devis: Quote,
  settings: Settings,
  produits: Product[]
): DevisTotaux {
  // --- Sommes lignes ---
  let sousTotalAchat = 0;
  let sousTotalVente = 0;

  (devis.lignes || []).forEach((l) => {
    const prod = l.productId ? produits.find((p) => p.id === l.productId) : null;
    const pa = l.prixAchatHT ?? prod?.prixAchatHT ?? 0;
    const pv = l.prixVenteHT ?? prod?.prixVenteHT ?? 0;
    const q = l.quantite || 0;
    sousTotalAchat += pa * q;
    sousTotalVente += pv * q;
  });

  // --- MO et déplacement ---
  const heuresMO = devis.heuresMO || 0;
  const tauxMO = devis.tauxMO ?? settings.tauxMO;
  const coutMO = heuresMO * tauxMO;
  const coutDepl = devis.fraisDeplacement ?? settings.fraisDeplacement;

  // --- Coût total Foloneo ---
  const coutTotal = sousTotalAchat + coutMO * 0.5 + coutDepl * 0.5;

  // --- Total HT / TTC ---
  const totalHT = sousTotalVente + coutMO + coutDepl;
  const totalTVA = totalHT * settings.tva;
  const totalTTC = totalHT + totalTVA;

  // --- Marge ---
  const margeBrute = totalHT - coutTotal;
  const tauxMarge = totalHT > 0 ? margeBrute / totalHT : 0;

  // --- Maintenance (achat) ---
  const niveauAchatKey = devis.modeAchat?.maintenance || "confort";
  const niveauAchat = NIVEAUX_MAINTENANCE[niveauAchatKey];
  const maintenanceAnnuelle = totalHT * niveauAchat.prixAnnuelRatio;

  // --- Leasing ---
  const duree = (devis.modeLeasing?.duree || 48) as 36 | 48 | 60;
  const coefMens = settings.coefMensuel[duree];
  const niveauLeasing = NIVEAUX_MAINTENANCE.confort; // niveau confort inclus par défaut en leasing
  const mensualiteMateriel = totalHT * coefMens;
  const mensualiteMaintenance = (totalHT * niveauLeasing.prixAnnuelRatio) / 12;
  const mensualiteEvolutions =
    (totalHT * settings.provisionEvolutions) / 12;
  const mensualiteTotale =
    mensualiteMateriel + mensualiteMaintenance + mensualiteEvolutions;
  const totalLeasing = mensualiteTotale * duree;

  // --- Commissions ---
  const commissionAchat = totalHT * settings.commissionTaux.achat;
  const commissionLeasing = totalLeasing * settings.commissionTaux.leasing;

  return {
    sousTotalAchat,
    sousTotalVente,
    coutMO,
    coutDepl,
    coutTotal,
    totalHT,
    totalTVA,
    totalTTC,
    margeBrute,
    tauxMarge,
    niveauAchat,
    maintenanceAnnuelle,
    duree,
    niveauLeasing,
    mensualiteMateriel,
    mensualiteMaintenance,
    mensualiteEvolutions,
    mensualiteTotale,
    totalLeasing,
    commissionAchat,
    commissionLeasing,
  };
}
