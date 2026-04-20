// ============================================================================
// TYPES MÉTIER FOLONEO
// ============================================================================

export type Role = "dirigeant" | "commercial" | "technicien";
export type Marque = "ajax" | "dahua" | "vauban" | "autre";
export type ProductType = "alarme" | "video" | "acces" | "incendie" | "accessoire";
export type EtapeId = "prospection" | "qualif" | "devis_envoye" | "nego" | "signe" | "perdu";
export type QuoteStatus = "brouillon" | "envoye" | "signe_achat" | "signe_leasing" | "perdu";
export type InvoiceStatus = "brouillon" | "emise" | "payee" | "retard" | "litige";
export type InvoiceType = "ponctuelle" | "recurrente";
export type ContratStatut = "actif" | "a_renouveler" | "expire" | "suspendu";
export type SavStatus = "ouvert" | "en_cours" | "resolu";
export type FormuleChoisie = "achat" | "achat_maintenance" | "leasing" | null;
export type NiveauMaintenance = "essentiel" | "confort" | "serenite";
export type Secteur = "restauration" | "artisan" | "retail" | "tertiaire" | "residentiel" | "industriel" | "architecte";
export type Source = "recommandation" | "web" | "terrain" | "bni" | "partenaire" | "ancien_client";

export interface CommissionTaux {
  achat: number;
  leasing: number;
  maintenance: number;
}

export interface Commercial {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  role: Role;
  objectifMensuel: number;
  commissionTaux: CommissionTaux;
  couleur: string;
  actif?: boolean;
}

export interface Account {
  id: string;
  raisonSociale: string;
  secteur: Secteur;
  source: Source;
  adresse: string;
  codePostal: string;
  ville: string;
  telephone?: string;
  email?: string;
  siret?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  accountId: string;
  prenom: string;
  nom: string;
  fonction?: string;
  email?: string;
  telephone?: string;
  role: "decideur" | "technique" | "compta" | "autre";
}

export interface Product {
  id: string;
  refFabricant: string;
  libelleInterne: string;
  libelleCommercial: string;
  marque: Marque;
  type: ProductType;
  prixSylis?: number;
  prixMarche?: number;
  prixAchatHT: number;
  prixVenteHT: number;
}

export interface Pack {
  id: string;
  nom: string;
  description: string;
  cible: string;
  lignes: { productId: string; quantite: number }[];
  prixIndicatif: number;
}

export interface Deal {
  id: string;
  titre: string;
  accountId: string;
  contactId?: string;
  commercialId?: string;
  etape: EtapeId;
  probabilite: number;
  valeur: number;
  formulePreferee: "achat" | "achat_maintenance" | "leasing";
  dateCible?: string;
  notes?: string;
  createdAt: string;
}

export interface QuoteLine {
  id: string;
  productId?: string;
  libelle: string;
  quantite: number;
  prixAchatHT: number;
  prixVenteHT: number;
}

export interface Quote {
  id: string;
  numero: string;
  dealId?: string | null;
  accountId: string;
  contactId?: string;
  commercialId: string;
  lignes: QuoteLine[];
  heuresMO: number;
  tauxMO: number;
  fraisDeplacement: number;
  modeAchat: { maintenance: NiveauMaintenance };
  modeLeasing: { duree: 36 | 48 | 60 };
  status: QuoteStatus;
  formuleChoisie: FormuleChoisie;
  typeSite?: string;
  surface?: number;
  nbOuvrants?: number;
  contraintes?: string;
  createdAt: string;
  sentAt?: string;
  signedAt?: string;
}

export interface Invoice {
  id: string;
  numero: string;
  quoteId?: string | null;
  accountId: string;
  commercialId?: string;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  status: InvoiceStatus;
  type: InvoiceType;
  dateEmission: string;
  dateEcheance: string;
  datePaiement?: string;
  lignes?: QuoteLine[];
}

export interface Contrat {
  id: string;
  numero?: string;
  accountId: string;
  niveau: NiveauMaintenance;
  montantAnnuel: number;
  dateDebut: string;
  dateFin: string;
  statut: ContratStatut;
}

export interface CalendarEvent {
  id: string;
  type: "rdv" | "appel" | "visite" | "intervention" | "rappel" | "tache";
  title: string;
  accountId?: string;
  commercialId?: string;
  date: string;
  duree: number; // minutes
  lieu?: string;
  notes?: string;
}

export interface SavTicket {
  id: string;
  numero?: string;
  accountId: string;
  objet: string;
  description: string;
  status: SavStatus;
  priorite?: "basse" | "normale" | "haute" | "urgente";
  createdAt: string;
  resolvedAt?: string;
}

export interface Interaction {
  id: string;
  accountId: string;
  type: "appel" | "email" | "visite" | "sms";
  date: string;
  commercialId?: string;
  contenu: string;
}

export interface Settings {
  clientMode: boolean;
  darkMode: boolean;
  coefAjax: number;
  coefDahua: number;
  dahuaDiv: number;
  coefCategorieDefault: number;
  coefMensuel: { 36: number; 48: number; 60: number };
  provisionEvolutions: number;
  tauxMO: number;
  fraisDeplacement: number;
  objectifMensuelDefaut: number;
  commissionTaux: CommissionTaux;
  tva: number;
  societe: {
    nom: string;
    adresse: string;
    telephone: string;
    email: string;
    siret: string;
    ape: string;
    sav: string;
    site: string;
  };
}

export interface AppState {
  settings: Settings;
  accounts: Account[];
  contacts: Contact[];
  products: Product[];
  packs: Pack[];
  deals: Deal[];
  quotes: Quote[];
  invoices: Invoice[];
  contrats: Contrat[];
  commerciaux: Commercial[];
  events: CalendarEvent[];
  sav: SavTicket[];
  interactions: Interaction[];
}
