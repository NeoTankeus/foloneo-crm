import {
  Coffee,
  Hammer,
  Store,
  Building,
  Home,
  Factory,
  Landmark,
  type LucideIcon,
} from "lucide-react";
import type { Settings, EtapeId, Secteur, Source, NiveauMaintenance } from "@/types";

// ============================================================================
// CHARTE GRAPHIQUE FOLONEO
// ============================================================================
export const BRAND = {
  navy: "#0B1E3F",
  navyLight: "#142A52",
  gold: "#C9A961",
  goldLight: "#F8F0DC",
  bg: "#F7F8FA",
  red: "#E53E3E",
} as const;

// ============================================================================
// PARAMÈTRES PAR DÉFAUT
// ============================================================================
export const DEFAULT_SETTINGS: Settings = {
  clientMode: true,
  darkMode: false,
  coefAjax: 0.45,
  coefDahua: 0.45,
  dahuaDiv: 1.20,
  coefCategorieDefault: 3.0,
  coefMensuel: { 36: 0.0325, 48: 0.0255, 60: 0.0215 },
  provisionEvolutions: 0.08,
  tauxMO: 65,
  fraisDeplacement: 80,
  objectifMensuelDefaut: 25000,
  commissionTaux: { achat: 0.08, leasing: 0.05, maintenance: 0.10 },
  tva: 0.20,
  societe: {
    nom: "FOLONEO",
    adresse: "Toulon, Var (83)",
    telephone: "04 XX XX XX XX",
    email: "contact@foloneo.fr",
    siret: "XXX XXX XXX XXXXX",
    ape: "8020Z",
    sav: "sav@foloneo.fr",
    site: "foloneo.fr",
  },
};

// ============================================================================
// ÉTAPES DU PIPELINE
// ============================================================================
export interface EtapeConfig {
  id: EtapeId;
  label: string;
  color: string;
  proba: number;
}

export const ETAPES: EtapeConfig[] = [
  { id: "prospection", label: "Prospection", color: "#94A3B8", proba: 10 },
  { id: "qualif", label: "Qualification", color: "#60A5FA", proba: 30 },
  { id: "devis_envoye", label: "Devis envoyé", color: "#A78BFA", proba: 50 },
  { id: "nego", label: "Négociation", color: "#F59E0B", proba: 75 },
  { id: "signe", label: "Signé", color: "#10B981", proba: 100 },
  { id: "perdu", label: "Perdu", color: "#EF4444", proba: 0 },
];

// ============================================================================
// SECTEURS D'ACTIVITÉ
// ============================================================================
export interface SecteurConfig {
  id: Secteur;
  label: string;
  icon: LucideIcon;
}

export const SECTEURS: SecteurConfig[] = [
  { id: "restauration", label: "Restauration", icon: Coffee },
  { id: "artisan", label: "Artisan", icon: Hammer },
  { id: "retail", label: "Commerce / Retail", icon: Store },
  { id: "tertiaire", label: "Tertiaire / PME", icon: Building },
  { id: "residentiel", label: "Résidentiel", icon: Home },
  { id: "industriel", label: "Industriel", icon: Factory },
  { id: "architecte", label: "Architecte / Premium", icon: Landmark },
];

// ============================================================================
// SOURCES PROSPECT
// ============================================================================
export const SOURCES: { id: Source; label: string }[] = [
  { id: "recommandation", label: "Recommandation" },
  { id: "web", label: "Site web" },
  { id: "terrain", label: "Terrain" },
  { id: "bni", label: "BNI" },
  { id: "partenaire", label: "Partenaire" },
  { id: "ancien_client", label: "Ancien client" },
];

// ============================================================================
// NIVEAUX DE MAINTENANCE
// ============================================================================
export interface NiveauConfig {
  id: NiveauMaintenance;
  label: string;
  prixAnnuelRatio: number; // % du total HT en maintenance annuelle
  details: string[];
}

export const NIVEAUX_MAINTENANCE: Record<NiveauMaintenance, NiveauConfig> = {
  essentiel: {
    id: "essentiel",
    label: "Essentiel",
    prixAnnuelRatio: 0.05,
    details: [
      "Visite annuelle de contrôle",
      "Support téléphonique",
      "Mise à jour firmware",
    ],
  },
  confort: {
    id: "confort",
    label: "Confort",
    prixAnnuelRatio: 0.08,
    details: [
      "2 visites annuelles",
      "Télémaintenance",
      "Main-d'œuvre incluse",
      "Support prioritaire",
    ],
  },
  serenite: {
    id: "serenite",
    label: "Sérénité",
    prixAnnuelRatio: 0.12,
    details: [
      "Interventions illimitées",
      "Télémaintenance + supervision",
      "Remplacement matériel inclus",
      "Support 7j/7",
      "Évolutions incluses",
    ],
  },
};

// ============================================================================
// NAVIGATION
// ============================================================================
export const VIEWS_WITH_FILTERS = new Set(["dashboard", "pipeline", "quotes"]);

export const NAV_TITLES: Record<string, string> = {
  dashboard: "Tableau de bord",
  pipeline: "Pipeline",
  accounts: "Comptes",
  contacts: "Contacts",
  quotes: "Devis",
  catalog: "Catalogue",
  maintenance: "Maintenance",
  invoices: "Facturation",
  team: "Équipe",
  calendar: "Agenda",
  sav: "SAV",
  settings: "Paramètres",
};
