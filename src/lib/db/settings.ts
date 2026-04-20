import { supabase, useDemoData } from "@/lib/supabase";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import type { Settings } from "@/types";

// Settings est stocke en "flat" cote DB (colonnes atomiques) mais imbrique cote TS.
// clientMode et darkMode ne sont pas persistes en DB (UI-state uniquement).

/* eslint-disable @typescript-eslint/no-explicit-any */
const fromRow = (r: any, clientMode = true, darkMode = false): Settings => ({
  clientMode,
  darkMode,
  coefAjax: Number(r.coef_ajax),
  coefDahua: Number(r.coef_dahua),
  dahuaDiv: Number(r.dahua_div),
  coefCategorieDefault: Number(r.coef_categorie_default),
  coefMensuel: {
    36: Number(r.coef_mensuel_36),
    48: Number(r.coef_mensuel_48),
    60: Number(r.coef_mensuel_60),
  },
  coefMensuelPetit: {
    // Fallback sur la grille "grand" si la colonne n'existe pas encore (migration 003 pas appliquee)
    36: r.coef_mensuel_petit_36 !== undefined && r.coef_mensuel_petit_36 !== null ? Number(r.coef_mensuel_petit_36) : Number(r.coef_mensuel_36),
    48: r.coef_mensuel_petit_48 !== undefined && r.coef_mensuel_petit_48 !== null ? Number(r.coef_mensuel_petit_48) : Number(r.coef_mensuel_48),
    60: r.coef_mensuel_petit_60 !== undefined && r.coef_mensuel_petit_60 !== null ? Number(r.coef_mensuel_petit_60) : Number(r.coef_mensuel_60),
  },
  seuilLeasing: r.seuil_leasing !== undefined && r.seuil_leasing !== null ? Number(r.seuil_leasing) : 10000,
  provisionEvolutions: Number(r.provision_evolutions),
  tauxMO: Number(r.taux_mo),
  fraisDeplacement: Number(r.frais_deplacement),
  objectifMensuelDefaut: Number(r.objectif_mensuel_defaut),
  commissionTaux: {
    achat: Number(r.commission_achat),
    leasing: Number(r.commission_leasing),
    maintenance: Number(r.commission_maintenance),
  },
  tva: Number(r.tva),
  societe: {
    nom: r.societe_nom ?? "",
    adresse: r.societe_adresse ?? "",
    telephone: r.societe_telephone ?? "",
    email: r.societe_email ?? "",
    siret: r.societe_siret ?? "",
    ape: r.societe_ape ?? "",
    sav: r.societe_sav ?? "",
    site: r.societe_site ?? "",
  },
});

const toRow = (s: Partial<Settings>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (s.coefAjax !== undefined) row.coef_ajax = s.coefAjax;
  if (s.coefDahua !== undefined) row.coef_dahua = s.coefDahua;
  if (s.dahuaDiv !== undefined) row.dahua_div = s.dahuaDiv;
  if (s.coefCategorieDefault !== undefined) row.coef_categorie_default = s.coefCategorieDefault;
  if (s.coefMensuel) {
    row.coef_mensuel_36 = s.coefMensuel[36];
    row.coef_mensuel_48 = s.coefMensuel[48];
    row.coef_mensuel_60 = s.coefMensuel[60];
  }
  if (s.coefMensuelPetit) {
    row.coef_mensuel_petit_36 = s.coefMensuelPetit[36];
    row.coef_mensuel_petit_48 = s.coefMensuelPetit[48];
    row.coef_mensuel_petit_60 = s.coefMensuelPetit[60];
  }
  if (s.seuilLeasing !== undefined) row.seuil_leasing = s.seuilLeasing;
  if (s.provisionEvolutions !== undefined) row.provision_evolutions = s.provisionEvolutions;
  if (s.tauxMO !== undefined) row.taux_mo = s.tauxMO;
  if (s.fraisDeplacement !== undefined) row.frais_deplacement = s.fraisDeplacement;
  if (s.objectifMensuelDefaut !== undefined) row.objectif_mensuel_defaut = s.objectifMensuelDefaut;
  if (s.commissionTaux) {
    row.commission_achat = s.commissionTaux.achat;
    row.commission_leasing = s.commissionTaux.leasing;
    row.commission_maintenance = s.commissionTaux.maintenance;
  }
  if (s.tva !== undefined) row.tva = s.tva;
  if (s.societe) {
    row.societe_nom = s.societe.nom;
    row.societe_adresse = s.societe.adresse;
    row.societe_telephone = s.societe.telephone;
    row.societe_email = s.societe.email;
    row.societe_siret = s.societe.siret;
    row.societe_ape = s.societe.ape;
    row.societe_sav = s.societe.sav;
    row.societe_site = s.societe.site;
  }
  return row;
};

export async function getSettings(): Promise<Settings> {
  if (useDemoData || !supabase) return DEFAULT_SETTINGS;
  const { data, error } = await supabase.from("settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  if (useDemoData || !supabase) throw new Error("Mode demo : Supabase n'est pas connecte");
  const { data, error } = await supabase
    .from("settings")
    .update(toRow(patch))
    .eq("id", 1)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data, patch.clientMode, patch.darkMode);
}
