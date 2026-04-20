import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard, Users, Building2, Briefcase, FileText, Package, Wrench,
  Receipt, UserCog, Calendar, LifeBuoy, Settings, Search, Menu,
  Plus, ChevronRight, ChevronLeft, ChevronDown, X, Check, Edit2, Edit3, Trash2,
  Download, Upload, Eye, EyeOff, Send, Copy, Printer, Filter, MoreHorizontal,
  TrendingUp, AlertCircle, AlertTriangle, Phone, Mail, MapPin, Clock, Euro, Target,
  Award, Zap, Shield, ShieldCheck, ShieldAlert, Home, Store, Factory,
  Coffee, Hammer, Landmark, ArrowRight, ArrowUpRight, ArrowDownRight,
  Moon, Sun, Command, Bell, LogOut, CheckCircle2, XCircle, PauseCircle,
  Sparkles, Layers, GripVertical, Building, MessageSquare, Save,
  Calculator, Database, Globe, Headphones, RotateCw, FileCheck
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend
} from "recharts";

// ============================================================
// CONSTANTS & DEFAULTS
// ============================================================

const BRAND = {
  navy: "#0B1E3F",
  navyLight: "#142A52",
  gold: "#C9A961",
  goldLight: "#D9BC7A",
  bg: "#F7F8FA",
  bgDark: "#0A1325",
  red: "#E53E3E",
  green: "#10B981",
  amber: "#F59E0B",
  slate: "#64748B",
};

const DEFAULT_SETTINGS = {
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

const ETAPES = [
  { id: "prospection", label: "Prospection", color: "#94A3B8", proba: 10 },
  { id: "qualif", label: "Qualification", color: "#60A5FA", proba: 30 },
  { id: "devis_envoye", label: "Devis envoyé", color: "#A78BFA", proba: 50 },
  { id: "nego", label: "Négociation", color: "#F59E0B", proba: 75 },
  { id: "signe", label: "Signé", color: "#10B981", proba: 100 },
  { id: "perdu", label: "Perdu", color: "#EF4444", proba: 0 },
];

const SECTEURS = [
  { id: "restauration", label: "Restauration", icon: Coffee },
  { id: "artisan", label: "Artisan", icon: Hammer },
  { id: "retail", label: "Commerce / Retail", icon: Store },
  { id: "tertiaire", label: "Tertiaire / PME", icon: Building },
  { id: "particulier", label: "Particulier premium", icon: Home },
  { id: "architecte", label: "Architecte", icon: Landmark },
];

const SOURCES = [
  { id: "bni", label: "BNI" },
  { id: "reco", label: "Recommandation" },
  { id: "site", label: "Site web" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "salon", label: "Salon" },
  { id: "terrain", label: "Prospection terrain" },
];

const NIVEAUX_MAINTENANCE = {
  none: { label: "Aucune maintenance", prixAnnuelRatio: 0, details: [] },
  essentiel: {
    label: "Essentiel",
    prixAnnuelRatio: 0.08,
    details: [
      "1 visite de maintenance préventive par an",
      "Hotline technique heures ouvrées",
      "Remise 10 % sur pièces détachées",
      "Mise à jour logicielle incluse",
    ],
  },
  confort: {
    label: "Confort",
    prixAnnuelRatio: 0.14,
    details: [
      "2 visites de maintenance préventive par an",
      "Intervention sur site sous 48 h ouvrées",
      "Remise 20 % sur pièces détachées",
      "Support téléphonique prioritaire",
    ],
  },
  serenite: {
    label: "Sérénité",
    prixAnnuelRatio: 0.22,
    details: [
      "4 visites de maintenance préventive par an",
      "Intervention sur site sous 24 h ouvrées",
      "Pièces et main d'œuvre incluses (hors sinistre)",
      "Ligne dédiée 7j/7",
      "Rapport annuel de performance installation",
    ],
  },
};

// ============================================================
// HELPERS
// ============================================================

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const fmtEUR = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Math.round(n || 0));
const fmtEURc = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
const fmtNum = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0));
const fmtPct = (n) => `${Math.round((n || 0) * 100)} %`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
const fmtDateShort = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—";
const daysAgo = (d) => d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 0;
const daysUntil = (d) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : 0;

const calcPrixAchatAjax = (tarifSylis, coef = 0.45) => tarifSylis * coef;
const calcPrixAchatDahua = (prixMarche, div = 1.20, coef = 0.45) => (prixMarche / div) * coef;
const calcPrixVente = (achat, coefCat = 3.0) => achat * coefCat;
const calcMensualite = (montant, coefMensuel) => montant * coefMensuel;

function calcDevisTotaux(devis, settings, produits) {
  const lignes = devis.lignes || [];
  let sousTotalAchat = 0;
  let sousTotalVente = 0;
  lignes.forEach((l) => {
    sousTotalAchat += (l.prixAchatHT || 0) * (l.quantite || 0);
    sousTotalVente += (l.prixVenteHT || 0) * (l.quantite || 0);
  });
  const coutMO = (devis.heuresMO || 0) * (devis.tauxMO || settings.tauxMO);
  const coutDepl = devis.fraisDeplacement || 0;
  const totalHT = sousTotalVente + coutMO + coutDepl;
  const totalTVA = totalHT * settings.tva;
  const totalTTC = totalHT + totalTVA;
  const coutTotal = sousTotalAchat + coutMO + coutDepl;
  const margeBrute = totalHT - coutTotal;
  const tauxMarge = totalHT > 0 ? margeBrute / totalHT : 0;

  // Leasing
  const duree = devis.modeLeasing?.duree || 48;
  const coefMens = settings.coefMensuel[duree] || 0.0255;
  const mensualiteMateriel = totalHT * coefMens;
  const niveauLeasing = NIVEAUX_MAINTENANCE.serenite;
  const mensualiteMaintenance = (totalHT * niveauLeasing.prixAnnuelRatio) / 12;
  const mensualiteProvision = mensualiteMateriel * settings.provisionEvolutions;
  const mensualiteTotale = Math.round(mensualiteMateriel + mensualiteMaintenance + mensualiteProvision);
  const totalLeasing = mensualiteTotale * duree;

  // Maintenance achat
  const niveauAchat = NIVEAUX_MAINTENANCE[devis.modeAchat?.maintenance || "none"];
  const maintenanceAnnuelle = totalHT * niveauAchat.prixAnnuelRatio;

  return {
    sousTotalAchat, sousTotalVente, coutMO, coutDepl,
    totalHT, totalTVA, totalTTC, coutTotal, margeBrute, tauxMarge,
    mensualiteMateriel, mensualiteMaintenance, mensualiteProvision, mensualiteTotale,
    totalLeasing, maintenanceAnnuelle, niveauAchat, niveauLeasing,
    coefMens, duree,
  };
}

// ============================================================
// DEMO DATA
// ============================================================

const now = Date.now();
const daysFromNow = (d) => new Date(now + d * 86400000).toISOString();

const DEMO_COMMERCIAUX = [
  { id: "c1", nom: "Pitaud", prenom: "Stéphane", email: "stephanepitaud@foloneo.fr", telephone: "06 00 00 00 01", role: "dirigeant", objectifMensuel: 40000, commissionTaux: { achat: 0.06, leasing: 0.04, maintenance: 0.08 }, couleur: "#C9A961" },
  { id: "c2", nom: "Martin", prenom: "Julien", email: "julien.martin@foloneo.fr", telephone: "06 00 00 00 02", role: "commercial", objectifMensuel: 25000, commissionTaux: { achat: 0.08, leasing: 0.05, maintenance: 0.10 }, couleur: "#60A5FA" },
  { id: "c3", nom: "Laurent", prenom: "Sophie", email: "sophie.laurent@foloneo.fr", telephone: "06 00 00 00 03", role: "commercial", objectifMensuel: 22000, commissionTaux: { achat: 0.08, leasing: 0.05, maintenance: 0.10 }, couleur: "#A78BFA" },
];

const DEMO_ACCOUNTS = [
  { id: "a1", raisonSociale: "GODOT & FILS", siret: "123 456 789 00012", ape: "4777Z", adresse: "45 avenue République", codePostal: "83000", ville: "Toulon", telephone: "04 94 12 34 56", email: "contact@godot-fils.fr", secteur: "retail", source: "reco", lat: 43.124, lng: 5.928, createdAt: daysFromNow(-180), notes: "Négoce métaux précieux, sécurité maximale requise" },
  { id: "a2", raisonSociale: "Restaurant Le Cépage", siret: "234 567 890 00015", ape: "5610A", adresse: "12 rue des Arts", codePostal: "83000", ville: "Toulon", telephone: "04 94 23 45 67", email: "contact@lecepage.fr", secteur: "restauration", source: "bni", lat: 43.128, lng: 5.932, createdAt: daysFromNow(-90), notes: "Restaurant 60 couverts, problématique vol caisse" },
  { id: "a3", raisonSociale: "Boulangerie Brun", siret: "345 678 901 00018", ape: "1071C", adresse: "8 place du Marché", codePostal: "83100", ville: "La Valette-du-Var", telephone: "04 94 34 56 78", email: "j.brun@bouldebrun.fr", secteur: "artisan", source: "terrain", lat: 43.140, lng: 5.981, createdAt: daysFromNow(-45), notes: "Artisan boulanger, 2 points de vente" },
  { id: "a4", raisonSociale: "Cabinet Moreau Architecte", siret: "456 789 012 00021", ape: "7111Z", adresse: "34 boulevard de Strasbourg", codePostal: "83000", ville: "Toulon", telephone: "04 94 45 67 89", email: "m.moreau@moreau-archi.fr", secteur: "architecte", source: "linkedin", lat: 43.125, lng: 5.929, createdAt: daysFromNow(-30), notes: "Prescripteur Crestron Home, villa 450 m² en cours" },
  { id: "a5", raisonSociale: "Villa Les Oliviers (M. Dubois)", siret: "", ape: "", adresse: "Chemin des Oliviers", codePostal: "83100", ville: "Le Revest-les-Eaux", telephone: "06 12 34 56 78", email: "p.dubois@proton.me", secteur: "particulier", source: "reco", lat: 43.171, lng: 5.906, createdAt: daysFromNow(-20), notes: "Villa 380 m² avec piscine, client premium" },
  { id: "a6", raisonSociale: "Pharmacie du Port", siret: "567 890 123 00024", ape: "4773Z", adresse: "2 quai Cronstadt", codePostal: "83000", ville: "Toulon", telephone: "04 94 56 78 90", email: "contact@pharmaport.fr", secteur: "retail", source: "site", lat: 43.118, lng: 5.929, createdAt: daysFromNow(-60), notes: "Pharmacie centre-ville, renouvellement alarme" },
  { id: "a7", raisonSociale: "SARL Bâti-Var Construction", siret: "678 901 234 00027", ape: "4120A", adresse: "Zone Industrielle Toulon Est", codePostal: "83130", ville: "La Garde", telephone: "04 94 67 89 01", email: "contact@batti-var.fr", secteur: "tertiaire", source: "bni", lat: 43.124, lng: 6.014, createdAt: daysFromNow(-75), notes: "PME 35 salariés, bureau + entrepôt" },
];

const DEMO_CONTACTS = [
  { id: "ct1", accountId: "a1", nom: "Godot", prenom: "Pierre", role: "decideur", telephone: "06 11 11 11 11", email: "p.godot@godot-fils.fr" },
  { id: "ct2", accountId: "a1", nom: "Mercier", prenom: "Alain", role: "technique", telephone: "06 22 22 22 22", email: "a.mercier@godot-fils.fr" },
  { id: "ct3", accountId: "a2", nom: "Rossi", prenom: "Marco", role: "decideur", telephone: "06 33 33 33 33", email: "marco@lecepage.fr" },
  { id: "ct4", accountId: "a3", nom: "Brun", prenom: "Jérôme", role: "decideur", telephone: "06 44 44 44 44", email: "j.brun@bouldebrun.fr" },
  { id: "ct5", accountId: "a4", nom: "Moreau", prenom: "Catherine", role: "decideur", telephone: "06 55 55 55 55", email: "c.moreau@moreau-archi.fr" },
  { id: "ct6", accountId: "a5", nom: "Dubois", prenom: "Philippe", role: "decideur", telephone: "06 12 34 56 78", email: "p.dubois@proton.me" },
  { id: "ct7", accountId: "a6", nom: "Bernard", prenom: "Claire", role: "decideur", telephone: "06 66 66 66 66", email: "c.bernard@pharmaport.fr" },
  { id: "ct8", accountId: "a7", nom: "Lopez", prenom: "Frédéric", role: "decideur", telephone: "06 77 77 77 77", email: "f.lopez@batti-var.fr" },
  { id: "ct9", accountId: "a7", nom: "Vidal", prenom: "Nadia", role: "compta", telephone: "04 94 67 89 02", email: "compta@batti-var.fr" },
];

// Produits pré-remplis (marques internes, libellés commerciaux neutres pour client)
const DEMO_PRODUCTS = [
  // Ajax
  { id: "p1", refFabricant: "AJ-HUB2-PLUS", marque: "ajax", libelleInterne: "Hub 2 Plus", libelleCommercial: "Centrale d'alarme IP professionnelle bi-voie 2G/4G + Ethernet + Wi-Fi", categorie: "alarme", tarifFournisseur: 385, prixAchatHT: 173, prixVenteHT: 519, coefCategorie: 3.0, dureeGarantieMois: 24, icon: "Shield" },
  { id: "p2", refFabricant: "AJ-MOTIONCAM", marque: "ajax", libelleInterne: "MotionCam", libelleCommercial: "Détecteur de mouvement avec levée de doute photo intégrée", categorie: "alarme", tarifFournisseur: 155, prixAchatHT: 70, prixVenteHT: 210, coefCategorie: 3.0, dureeGarantieMois: 24, icon: "Eye" },
  { id: "p3", refFabricant: "AJ-DOORPROT", marque: "ajax", libelleInterne: "DoorProtect", libelleCommercial: "Détecteur d'ouverture magnétique sans fil", categorie: "alarme", tarifFournisseur: 62, prixAchatHT: 28, prixVenteHT: 84, coefCategorie: 3.0, dureeGarantieMois: 24, icon: "Lock" },
  { id: "p4", refFabricant: "AJ-FIREPROT", marque: "ajax", libelleInterne: "FireProtect", libelleCommercial: "Détecteur de fumée optique sans fil autonome", categorie: "alarme", tarifFournisseur: 95, prixAchatHT: 43, prixVenteHT: 129, coefCategorie: 3.0, dureeGarantieMois: 24, icon: "Flame" },
  { id: "p5", refFabricant: "AJ-STREETSIR", marque: "ajax", libelleInterne: "StreetSiren", libelleCommercial: "Sirène extérieure avec flash, autonome sur batterie", categorie: "alarme", tarifFournisseur: 145, prixAchatHT: 65, prixVenteHT: 195, coefCategorie: 3.0, dureeGarantieMois: 24, icon: "Volume2" },
  { id: "p6", refFabricant: "AJ-KEYPAD", marque: "ajax", libelleInterne: "KeyPad", libelleCommercial: "Clavier de commande rétroéclairé sans fil", categorie: "alarme", tarifFournisseur: 118, prixAchatHT: 53, prixVenteHT: 159, coefCategorie: 3.0, dureeGarantieMois: 24, icon: "Grid3x3" },
  { id: "p7", refFabricant: "AJ-SOLARBAT", marque: "ajax", libelleInterne: "Solar Battery", libelleCommercial: "Kit d'alimentation photovoltaïque autonome", categorie: "alarme", tarifFournisseur: 168, prixAchatHT: 76, prixVenteHT: 228, coefCategorie: 3.0, dureeGarantieMois: 24, icon: "Sun" },
  // Dahua
  { id: "p8", refFabricant: "DH-NVR8", marque: "dahua", libelleInterne: "NVR 8 voies 4K", libelleCommercial: "Enregistreur vidéo IP 8 voies 4K avec disque 4 To", categorie: "video", prixMarche: 520, prixAchatHT: 195, prixVenteHT: 585, coefCategorie: 3.0, dureeGarantieMois: 36, icon: "HardDrive" },
  { id: "p9", refFabricant: "DH-NVR16", marque: "dahua", libelleInterne: "NVR 16 voies 4K", libelleCommercial: "Enregistreur vidéo IP 16 voies 4K avec disque 8 To", categorie: "video", prixMarche: 890, prixAchatHT: 334, prixVenteHT: 1001, coefCategorie: 3.0, dureeGarantieMois: 36, icon: "HardDrive" },
  { id: "p10", refFabricant: "DH-TIOC4MP", marque: "dahua", libelleInterne: "Caméra bullet TiOC 4MP", libelleCommercial: "Caméra extérieure IA 4MP avec dissuasion active (lumière + alarme)", categorie: "video", prixMarche: 295, prixAchatHT: 111, prixVenteHT: 332, coefCategorie: 3.0, dureeGarantieMois: 36, icon: "Camera" },
  { id: "p11", refFabricant: "DH-TIOC8MP", marque: "dahua", libelleInterne: "Caméra bullet TiOC 8MP", libelleCommercial: "Caméra extérieure IA 4K avec dissuasion active (lumière + alarme)", categorie: "video", prixMarche: 445, prixAchatHT: 167, prixVenteHT: 500, coefCategorie: 3.0, dureeGarantieMois: 36, icon: "Camera" },
  { id: "p12", refFabricant: "DH-DOME4MP", marque: "dahua", libelleInterne: "Caméra dôme IR 4MP", libelleCommercial: "Caméra dôme intérieure 4MP vision nocturne infrarouge", categorie: "video", prixMarche: 215, prixAchatHT: 81, prixVenteHT: 242, coefCategorie: 3.0, dureeGarantieMois: 36, icon: "Camera" },
  { id: "p13", refFabricant: "DH-PTZ", marque: "dahua", libelleInterne: "Caméra PTZ 25x", libelleCommercial: "Caméra motorisée rotative avec zoom optique 25x", categorie: "video", prixMarche: 1450, prixAchatHT: 544, prixVenteHT: 1631, coefCategorie: 3.0, dureeGarantieMois: 36, icon: "Camera" },
  { id: "p14", refFabricant: "DH-VTO", marque: "dahua", libelleInterne: "Interphone VTO 4MP", libelleCommercial: "Interphone IP vidéo avec caméra 4MP et reconnaissance faciale", categorie: "interphonie", prixMarche: 680, prixAchatHT: 255, prixVenteHT: 765, coefCategorie: 3.0, dureeGarantieMois: 36, icon: "Mic" },
  // Vauban
  { id: "p15", refFabricant: "VB-CENTRAL-4", marque: "vauban", libelleInterne: "Centrale 4 portes", libelleCommercial: "Contrôleur d'accès IP 4 portes avec serveur web embarqué", categorie: "acces", prixAchatHT: 420, prixVenteHT: 1050, coefCategorie: 2.5, dureeGarantieMois: 24, icon: "Lock" },
  { id: "p16", refFabricant: "VB-LECT-MIFARE", marque: "vauban", libelleInterne: "Lecteur Mifare", libelleCommercial: "Lecteur de badges sans contact IP65 extérieur", categorie: "acces", prixAchatHT: 85, prixVenteHT: 212, coefCategorie: 2.5, dureeGarantieMois: 24, icon: "CreditCard" },
  { id: "p17", refFabricant: "VB-BADGE", marque: "vauban", libelleInterne: "Badge Mifare", libelleCommercial: "Badge de proximité sécurisé", categorie: "acces", prixAchatHT: 3.5, prixVenteHT: 12, coefCategorie: 3.5, dureeGarantieMois: 12, icon: "CreditCard" },
  { id: "p18", refFabricant: "VB-VENTOUSE", marque: "vauban", libelleInterne: "Ventouse 300 kg", libelleCommercial: "Ventouse électromagnétique 300 kg avec contact", categorie: "acces", prixAchatHT: 95, prixVenteHT: 237, coefCategorie: 2.5, dureeGarantieMois: 24, icon: "Magnet" },
  { id: "p19", refFabricant: "VB-GACHE", marque: "vauban", libelleInterne: "Gâche électrique", libelleCommercial: "Gâche électrique à émission, symétrique", categorie: "acces", prixAchatHT: 68, prixVenteHT: 170, coefCategorie: 2.5, dureeGarantieMois: 24, icon: "Key" },
];

const DEMO_PACKS = [
  {
    id: "pk1", nom: "Pack Alarme Commerce 100 m²", categorie: "alarme", description: "Solution complète alarme pour commerce < 100 m²",
    items: [{ productId: "p1", q: 1 }, { productId: "p2", q: 2 }, { productId: "p3", q: 4 }, { productId: "p4", q: 1 }, { productId: "p5", q: 1 }, { productId: "p6", q: 1 }],
  },
  {
    id: "pk2", nom: "Pack Vidéo Restaurant 6 caméras", categorie: "video", description: "Vidéosurveillance IA pour restaurant, intérieur + extérieur",
    items: [{ productId: "p8", q: 1 }, { productId: "p10", q: 4 }, { productId: "p12", q: 2 }],
  },
  {
    id: "pk3", nom: "Pack Accès PME 3 portes", categorie: "acces", description: "Contrôle d'accès pour PME avec 3 points d'accès",
    items: [{ productId: "p15", q: 1 }, { productId: "p16", q: 3 }, { productId: "p17", q: 25 }, { productId: "p18", q: 2 }, { productId: "p19", q: 1 }],
  },
  {
    id: "pk4", nom: "Pack Villa Premium Vidéo 4K", categorie: "video", description: "Vidéosurveillance 4K haute performance pour villa",
    items: [{ productId: "p9", q: 1 }, { productId: "p11", q: 8 }, { productId: "p14", q: 1 }],
  },
  {
    id: "pk5", nom: "Pack Alarme + Vidéo Bureau", categorie: "mixte", description: "Protection complète bureau, alarme + vidéo",
    items: [{ productId: "p1", q: 1 }, { productId: "p2", q: 3 }, { productId: "p3", q: 3 }, { productId: "p8", q: 1 }, { productId: "p10", q: 3 }, { productId: "p12", q: 2 }],
  },
];

const DEMO_DEALS = [
  { id: "d1", accountId: "a1", contactId: "ct1", title: "Protection vidéo showroom GODOT", etape: "nego", valeur: 18500, probabilite: 75, dateClotureEstimee: daysFromNow(14), commercialId: "c1", typeSite: "commerce", surface: 180, createdAt: daysFromNow(-45), notes: "Audit réalisé, devis envoyé, en négociation" },
  { id: "d2", accountId: "a2", contactId: "ct3", title: "Alarme + vidéo cuisine Le Cépage", etape: "devis_envoye", valeur: 8200, probabilite: 50, dateClotureEstimee: daysFromNow(21), commercialId: "c2", typeSite: "restaurant", surface: 120, createdAt: daysFromNow(-18), notes: "Intéressé par CashView caisse/vidéo" },
  { id: "d3", accountId: "a3", contactId: "ct4", title: "Renforcement sécurité Boulangerie Brun", etape: "qualif", valeur: 4800, probabilite: 30, dateClotureEstimee: daysFromNow(30), commercialId: "c2", typeSite: "commerce", surface: 80, createdAt: daysFromNow(-12), notes: "Deux points de vente à sécuriser" },
  { id: "d4", accountId: "a4", contactId: "ct5", title: "Villa premium prescription Crestron", etape: "qualif", valeur: 45000, probabilite: 30, dateClotureEstimee: daysFromNow(60), commercialId: "c1", typeSite: "villa", surface: 450, createdAt: daysFromNow(-25), notes: "Projet luxe via architecte, budget ouvert" },
  { id: "d5", accountId: "a5", contactId: "ct6", title: "Villa Dubois - sécurité globale", etape: "devis_envoye", valeur: 22000, probabilite: 60, dateClotureEstimee: daysFromNow(10), commercialId: "c1", typeSite: "villa", surface: 380, createdAt: daysFromNow(-20), notes: "Leasing pressenti - client sensible à la mensualité" },
  { id: "d6", accountId: "a6", contactId: "ct7", title: "Renouvellement alarme Pharmacie", etape: "signe", valeur: 6400, probabilite: 100, dateClotureEstimee: daysFromNow(-5), commercialId: "c3", typeSite: "commerce", surface: 140, createdAt: daysFromNow(-60), notes: "Signé - installation planifiée semaine prochaine" },
  { id: "d7", accountId: "a7", contactId: "ct8", title: "Bâti-Var - contrôle d'accès + vidéo", etape: "nego", valeur: 32500, probabilite: 75, dateClotureEstimee: daysFromNow(20), commercialId: "c3", typeSite: "bureau", surface: 1200, createdAt: daysFromNow(-40), notes: "Bureau + entrepôt, accès salariés à gérer" },
  { id: "d8", accountId: "a1", contactId: "ct1", title: "GODOT - extension coffre-fort", etape: "prospection", valeur: 9500, probabilite: 10, dateClotureEstimee: daysFromNow(90), commercialId: "c1", typeSite: "commerce", surface: 40, createdAt: daysFromNow(-8), notes: "À qualifier" },
];

const DEMO_QUOTES = [
  {
    id: "q1", numero: "DEV-2026-0142", dealId: "d1", accountId: "a1", contactId: "ct1", commercialId: "c1",
    lignes: [
      { id: uid(), productId: "p9", libelle: "Enregistreur vidéo IP 16 voies 4K avec disque 8 To", quantite: 1, prixAchatHT: 334, prixVenteHT: 1001 },
      { id: uid(), productId: "p11", libelle: "Caméra extérieure IA 4K avec dissuasion active (lumière + alarme)", quantite: 12, prixAchatHT: 167, prixVenteHT: 500 },
      { id: uid(), productId: "p12", libelle: "Caméra dôme intérieure 4MP vision nocturne infrarouge", quantite: 4, prixAchatHT: 81, prixVenteHT: 242 },
    ],
    heuresMO: 24, tauxMO: 65, fraisDeplacement: 160,
    modeAchat: { maintenance: "serenite" }, modeLeasing: { duree: 48 },
    status: "envoye", formuleChoisie: null, createdAt: daysFromNow(-12), sentAt: daysFromNow(-10),
  },
  {
    id: "q2", numero: "DEV-2026-0141", dealId: "d5", accountId: "a5", contactId: "ct6", commercialId: "c1",
    lignes: [
      { id: uid(), productId: "p1", libelle: "Centrale d'alarme IP professionnelle bi-voie 2G/4G + Ethernet + Wi-Fi", quantite: 1, prixAchatHT: 173, prixVenteHT: 519 },
      { id: uid(), productId: "p2", libelle: "Détecteur de mouvement avec levée de doute photo intégrée", quantite: 6, prixAchatHT: 70, prixVenteHT: 210 },
      { id: uid(), productId: "p3", libelle: "Détecteur d'ouverture magnétique sans fil", quantite: 8, prixAchatHT: 28, prixVenteHT: 84 },
      { id: uid(), productId: "p10", libelle: "Caméra extérieure IA 4MP avec dissuasion active (lumière + alarme)", quantite: 8, prixAchatHT: 111, prixVenteHT: 332 },
      { id: uid(), productId: "p8", libelle: "Enregistreur vidéo IP 8 voies 4K avec disque 4 To", quantite: 1, prixAchatHT: 195, prixVenteHT: 585 },
      { id: uid(), productId: "p14", libelle: "Interphone IP vidéo avec caméra 4MP et reconnaissance faciale", quantite: 1, prixAchatHT: 255, prixVenteHT: 765 },
    ],
    heuresMO: 32, tauxMO: 65, fraisDeplacement: 200,
    modeAchat: { maintenance: "serenite" }, modeLeasing: { duree: 60 },
    status: "envoye", formuleChoisie: null, createdAt: daysFromNow(-18), sentAt: daysFromNow(-17),
  },
  {
    id: "q3", numero: "DEV-2026-0140", dealId: "d6", accountId: "a6", contactId: "ct7", commercialId: "c3",
    lignes: [
      { id: uid(), productId: "p1", libelle: "Centrale d'alarme IP professionnelle bi-voie 2G/4G + Ethernet + Wi-Fi", quantite: 1, prixAchatHT: 173, prixVenteHT: 519 },
      { id: uid(), productId: "p2", libelle: "Détecteur de mouvement avec levée de doute photo intégrée", quantite: 4, prixAchatHT: 70, prixVenteHT: 210 },
      { id: uid(), productId: "p3", libelle: "Détecteur d'ouverture magnétique sans fil", quantite: 5, prixAchatHT: 28, prixVenteHT: 84 },
      { id: uid(), productId: "p5", libelle: "Sirène extérieure avec flash, autonome sur batterie", quantite: 1, prixAchatHT: 65, prixVenteHT: 195 },
      { id: uid(), productId: "p6", libelle: "Clavier de commande rétroéclairé sans fil", quantite: 1, prixAchatHT: 53, prixVenteHT: 159 },
    ],
    heuresMO: 12, tauxMO: 65, fraisDeplacement: 80,
    modeAchat: { maintenance: "confort" }, modeLeasing: { duree: 48 },
    status: "signe_achat", formuleChoisie: "achat_maintenance", createdAt: daysFromNow(-60), sentAt: daysFromNow(-58),
  },
];

const DEMO_INVOICES = [
  { id: "i1", numero: "FA-2026-0078", quoteId: "q3", accountId: "a6", commercialId: "c3", montantHT: 3614, montantTVA: 722.8, montantTTC: 4336.8, status: "payee", type: "ponctuelle", dateEmission: daysFromNow(-5), dateEcheance: daysFromNow(25), datePaiement: daysFromNow(-2) },
  { id: "i2", numero: "FA-2026-0077", quoteId: null, accountId: "a1", commercialId: "c1", montantHT: 1200, montantTVA: 240, montantTTC: 1440, status: "emise", type: "recurrente", dateEmission: daysFromNow(-8), dateEcheance: daysFromNow(22) },
  { id: "i3", numero: "FA-2026-0076", quoteId: null, accountId: "a2", commercialId: "c2", montantHT: 480, montantTVA: 96, montantTTC: 576, status: "retard", type: "recurrente", dateEmission: daysFromNow(-45), dateEcheance: daysFromNow(-15) },
];

const DEMO_CONTRATS = [
  { id: "mc1", accountId: "a6", niveau: "confort", montantAnnuel: 520, dateDebut: daysFromNow(-60), dateFin: daysFromNow(305), statut: "actif" },
  { id: "mc2", accountId: "a1", niveau: "serenite", montantAnnuel: 1680, dateDebut: daysFromNow(-330), dateFin: daysFromNow(35), statut: "a_renouveler" },
  { id: "mc3", accountId: "a7", niveau: "confort", montantAnnuel: 980, dateDebut: daysFromNow(-200), dateFin: daysFromNow(165), statut: "actif" },
];

const DEMO_EVENTS = [
  { id: "e1", type: "rdv", title: "RDV GODOT - validation devis", accountId: "a1", commercialId: "c1", date: daysFromNow(1), duree: 60, notes: "Apporter maquette caméras" },
  { id: "e2", type: "appel", title: "Appel Dubois - relance devis villa", accountId: "a5", commercialId: "c1", date: daysFromNow(0), duree: 15, notes: "" },
  { id: "e3", type: "visite", title: "Audit Bâti-Var - entrepôt", accountId: "a7", commercialId: "c3", date: daysFromNow(2), duree: 120, notes: "Prévoir matériel mesure" },
  { id: "e4", type: "rdv", title: "Présentation Crestron - Cabinet Moreau", accountId: "a4", commercialId: "c1", date: daysFromNow(3), duree: 90, notes: "" },
  { id: "e5", type: "rdv", title: "Installation Pharmacie du Port", accountId: "a6", commercialId: "c3", date: daysFromNow(5), duree: 240, notes: "Technicien + commercial" },
];

const DEMO_SAV = [
  { id: "s1", numero: "SAV-2026-0034", accountId: "a6", objet: "Détecteur zone 3 en défaut", description: "Le client signale un détecteur qui déclenche sans raison", status: "en_cours", createdAt: daysFromNow(-3) },
  { id: "s2", numero: "SAV-2026-0033", accountId: "a2", objet: "Caméra cuisine floue", description: "La caméra au-dessus du passe est floue depuis 2 jours", status: "ouvert", createdAt: daysFromNow(-1) },
];

const DEMO_INTERACTIONS = [
  { id: "it1", accountId: "a1", type: "appel", date: daysFromNow(-2), commercialId: "c1", contenu: "Relance devis - demande complément sur maintenance" },
  { id: "it2", accountId: "a5", type: "email", date: daysFromNow(-4), commercialId: "c1", contenu: "Envoi devis révisé avec option leasing 60 mois" },
  { id: "it3", accountId: "a2", type: "visite", date: daysFromNow(-8), commercialId: "c2", contenu: "Audit sur site - relevé technique" },
];

const INITIAL_STATE = {
  settings: DEFAULT_SETTINGS,
  accounts: DEMO_ACCOUNTS,
  contacts: DEMO_CONTACTS,
  products: DEMO_PRODUCTS,
  packs: DEMO_PACKS,
  deals: DEMO_DEALS,
  quotes: DEMO_QUOTES,
  invoices: DEMO_INVOICES,
  contrats: DEMO_CONTRATS,
  commerciaux: DEMO_COMMERCIAUX,
  events: DEMO_EVENTS,
  sav: DEMO_SAV,
  interactions: DEMO_INTERACTIONS,
};

// ============================================================
// UI PRIMITIVES
// ============================================================

const cx = (...args) => args.filter(Boolean).join(" ");

function Button({ variant = "primary", size = "md", icon: Icon, children, className = "", ...props }) {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-5 py-2.5 text-sm" };
  const variants = {
    primary: "bg-[#0B1E3F] text-white hover:bg-[#142A52] shadow-sm",
    gold: "bg-[#C9A961] text-[#0B1E3F] hover:bg-[#D9BC7A] shadow-sm font-semibold",
    ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
    outline: "border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400",
    subtle: "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
  };
  return (
    <button className={cx(base, sizes[size], variants[variant], className)} {...props}>
      {Icon && <Icon size={size === "sm" ? 14 : 16} strokeWidth={2} />}
      {children}
    </button>
  );
}

function Card({ children, className = "", hover = false, onClick }) {
  return (
    <div
      onClick={onClick}
      className={cx(
        "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl",
        hover && "hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

function Input({ label, error, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">{label}</span>}
      <input
        className={cx(
          "w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-[#0B1E3F] dark:focus:border-[#C9A961] focus:ring-2 focus:ring-[#0B1E3F]/10 dark:focus:ring-[#C9A961]/20 outline-none transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400",
          error && "border-red-400",
          className
        )}
        {...props}
      />
      {error && <span className="block text-xs text-red-500 mt-1">{error}</span>}
    </label>
  );
}

function Select({ label, options = [], className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">{label}</span>}
      <select
        className={cx(
          "w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-[#0B1E3F] dark:focus:border-[#C9A961] focus:ring-2 focus:ring-[#0B1E3F]/10 outline-none transition-all text-slate-900 dark:text-slate-100",
          className
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </label>
  );
}

function Textarea({ label, className = "", rows = 3, ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">{label}</span>}
      <textarea
        rows={rows}
        className={cx(
          "w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-[#0B1E3F] dark:focus:border-[#C9A961] focus:ring-2 focus:ring-[#0B1E3F]/10 outline-none transition-all text-slate-900 dark:text-slate-100 resize-none",
          className
        )}
        {...props}
      />
    </label>
  );
}

function Badge({ children, color = "slate", tone, className = "" }) {
  const c = tone || color;
  const colors = {
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    violet: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    red: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    gold: "bg-[#F8F0DC] text-[#8B7228] dark:bg-[#C9A961]/20 dark:text-[#C9A961]",
    navy: "bg-[#0B1E3F] text-white",
  };
  return <span className={cx("inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md", colors[c] || colors.slate, className)}>{children}</span>;
}

function Modal({ open, onClose, title, children, size = "md", footer }) {
  if (!open) return null;
  const sizes = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl", full: "max-w-[95vw]" };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cx("relative w-full bg-white dark:bg-slate-900 sm:rounded-2xl shadow-2xl max-h-[95vh] flex flex-col animate-[slideUp_0.2s_ease-out]", sizes[size])}>
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-auto">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, trend, icon: Icon, accent, tone }) {
  const toneMap = {
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
    red: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",
    gold: "bg-[#F8F0DC] text-[#8B7228] dark:bg-[#C9A961]/20 dark:text-[#C9A961]",
    navy: "bg-[#0B1E3F]/5 text-[#0B1E3F] dark:bg-[#C9A961]/10 dark:text-[#C9A961]",
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
  };
  const a = accent || (tone && toneMap[tone]) || toneMap.navy;
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</div>
          <div className="text-2xl font-semibold mt-1 text-slate-900 dark:text-slate-100 truncate">{value}</div>
          {sub && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</div>}
          {typeof trend === "number" && (
            <div className={cx("inline-flex items-center gap-1 text-xs font-medium mt-2", trend >= 0 ? "text-emerald-600" : "text-red-600")}>
              {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {trend >= 0 ? "+" : ""}{trend}%
            </div>
          )}
        </div>
        {Icon && (
          <div className={cx("p-2 rounded-lg", a)}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </Card>
  );
}

function EmptyState({ icon: Icon = Package, title, description, message, action }) {
  const text = description || message;
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
        <Icon size={28} className="text-slate-400" />
      </div>
      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {text && <p className="text-sm text-slate-500 mt-1 max-w-sm">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function Stepper({ steps, current }) {
  return (
    <div className="flex items-center w-full gap-2">
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <div className={cx(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1 min-w-0",
            i === current ? "bg-[#0B1E3F] text-white dark:bg-[#C9A961] dark:text-[#0B1E3F]" :
            i < current ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" :
            "bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          )}>
            <div className={cx(
              "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0",
              i === current ? "bg-white/20" : i < current ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
            )}>
              {i < current ? <Check size={12} /> : i + 1}
            </div>
            <span className="truncate hidden sm:inline">{step}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}


// ============================================================
// NAVIGATION
// ============================================================

const NAV_ITEMS = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "pipeline", label: "Pipeline", icon: Briefcase },
  { id: "accounts", label: "Comptes", icon: Building2 },
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "quotes", label: "Devis", icon: FileText, accent: true },
  { id: "catalog", label: "Catalogue", icon: Package },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
  { id: "invoices", label: "Facturation", icon: Receipt },
  { id: "team", label: "Équipe", icon: UserCog },
  { id: "calendar", label: "Agenda", icon: Calendar },
  { id: "sav", label: "SAV", icon: LifeBuoy },
  { id: "settings", label: "Paramètres", icon: Settings },
];

function Sidebar({ current, onChange, collapsed, onToggleCollapsed, mobile, onClose }) {
  return (
    <aside className={cx(
      "bg-[#0B1E3F] text-slate-300 flex flex-col h-full transition-all duration-200 flex-shrink-0",
      mobile ? "fixed inset-y-0 left-0 z-40 w-64 shadow-2xl" : collapsed ? "w-16" : "w-60",
      mobile ? "" : "hidden md:flex"
    )}>
      <div className="h-14 flex items-center px-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#C9A961] flex items-center justify-center flex-shrink-0">
            <Shield size={16} className="text-[#0B1E3F]" strokeWidth={2.5} />
          </div>
          {(!collapsed || mobile) && (
            <div className="min-w-0">
              <div className="font-bold text-white tracking-tight">FOLONEO</div>
              <div className="text-[10px] text-slate-400 -mt-0.5">Sécurité électronique</div>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { onChange(item.id); mobile && onClose?.(); }}
              title={collapsed ? item.label : undefined}
              className={cx(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white",
                item.accent && !active && "text-[#C9A961]/90"
              )}
            >
              <Icon size={16} strokeWidth={2} className="flex-shrink-0" />
              {(!collapsed || mobile) && <span className="truncate">{item.label}</span>}
              {item.accent && (!collapsed || mobile) && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#C9A961]" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className={cx("flex items-center gap-2.5", collapsed && !mobile && "justify-center")}>
          <div className="w-8 h-8 rounded-full bg-[#C9A961] text-[#0B1E3F] flex items-center justify-center font-semibold text-xs flex-shrink-0">SP</div>
          {(!collapsed || mobile) && (
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">Stéphane Pitaud</div>
              <div className="text-[10px] text-slate-400">Dirigeant</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function TopBar({ title, onMenu, state, updateSettings, openCommandPalette, filterCommercial, setFilterCommercial, periodFilter, setPeriodFilter, showFilters }) {
  const { settings, commerciaux } = state;
  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-3 md:px-5 gap-3 sticky top-0 z-30 flex-shrink-0">
      <button onClick={onMenu} className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
        <MoreHorizontal size={18} />
      </button>
      <h1 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">{title}</h1>

      <div className="ml-auto flex items-center gap-1.5 md:gap-2">
        {showFilters && (
          <>
            <select
              value={filterCommercial}
              onChange={(e) => setFilterCommercial(e.target.value)}
              className="hidden md:block px-3 py-1.5 text-sm rounded-lg bg-slate-100 dark:bg-slate-800 border-0 outline-none text-slate-700 dark:text-slate-200"
            >
              <option value="all">Tous commerciaux</option>
              {commerciaux.map((c) => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
            </select>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="hidden md:block px-3 py-1.5 text-sm rounded-lg bg-slate-100 dark:bg-slate-800 border-0 outline-none text-slate-700 dark:text-slate-200"
            >
              <option value="month">Mois en cours</option>
              <option value="quarter">Trimestre</option>
              <option value="year">Année</option>
              <option value="all">Tout l'historique</option>
            </select>
          </>
        )}

        <button
          onClick={() => updateSettings({ clientMode: !settings.clientMode })}
          className={cx(
            "hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors",
            settings.clientMode
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
          )}
          title="Mode client masque les marques et prix d'achat"
        >
          {settings.clientMode ? <Eye size={14} /> : <EyeOff size={14} />}
          <span>{settings.clientMode ? "Mode client" : "Mode interne"}</span>
        </button>

        <button onClick={openCommandPalette} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300" title="Ctrl+K">
          <Command size={16} />
        </button>
        <button
          onClick={() => updateSettings({ darkMode: !settings.darkMode })}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
        >
          {settings.darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}


// ============================================================
// DASHBOARD
// ============================================================

function Dashboard({ state, setView, setViewDetail, filterCommercial, periodFilter }) {
  const { deals, quotes, invoices, accounts, contrats, commerciaux, settings, events } = state;

  const filteredDeals = useMemo(() => {
    let d = deals;
    if (filterCommercial !== "all") d = d.filter((x) => x.commercialId === filterCommercial);
    if (periodFilter !== "all") {
      const cutoff = { month: 30, quarter: 90, year: 365 }[periodFilter];
      d = d.filter((x) => daysAgo(x.createdAt) <= cutoff);
    }
    return d;
  }, [deals, filterCommercial, periodFilter]);

  const pipeline = useMemo(() => {
    return ETAPES.filter(e => e.id !== "perdu").map((e) => {
      const items = filteredDeals.filter((d) => d.etape === e.id);
      const valeur = items.reduce((s, d) => s + (d.valeur || 0), 0);
      return { ...e, count: items.length, valeur };
    });
  }, [filteredDeals]);

  const caPrevisionnel = useMemo(() => {
    return filteredDeals
      .filter(d => d.etape !== "perdu" && d.etape !== "signe")
      .reduce((s, d) => s + (d.valeur * d.probabilite / 100), 0);
  }, [filteredDeals]);

  const caSigne = useMemo(() => filteredDeals.filter(d => d.etape === "signe").reduce((s, d) => s + d.valeur, 0), [filteredDeals]);

  const tauxTransfo = useMemo(() => {
    const total = filteredDeals.filter(d => ["signe", "perdu"].includes(d.etape)).length;
    const signes = filteredDeals.filter(d => d.etape === "signe").length;
    return total > 0 ? signes / total : 0;
  }, [filteredDeals]);

  const alertes = useMemo(() => {
    const list = [];
    quotes.filter(q => q.status === "envoye" && q.sentAt && daysAgo(q.sentAt) > 15).forEach(q => {
      const acc = accounts.find(a => a.id === q.accountId);
      list.push({ type: "devis", severity: "warn", titre: `Devis ${q.numero} sans relance depuis ${daysAgo(q.sentAt)} j`, sub: acc?.raisonSociale, onClick: () => setViewDetail({ type: "quote", id: q.id }) });
    });
    contrats.filter(c => c.statut === "actif" || c.statut === "a_renouveler").forEach(c => {
      const d = daysUntil(c.dateFin);
      if (d < 60 && d > 0) {
        const acc = accounts.find(a => a.id === c.accountId);
        list.push({ type: "maint", severity: d < 30 ? "high" : "warn", titre: `Contrat ${NIVEAUX_MAINTENANCE[c.niveau].label} échéance J-${d}`, sub: acc?.raisonSociale });
      }
    });
    invoices.filter(i => i.status === "retard").forEach(i => {
      const acc = accounts.find(a => a.id === i.accountId);
      list.push({ type: "fact", severity: "high", titre: `Facture ${i.numero} en retard`, sub: `${acc?.raisonSociale} — ${fmtEUR(i.montantTTC)}` });
    });
    return list.slice(0, 6);
  }, [quotes, contrats, invoices, accounts, setViewDetail]);

  // CA mensuel sur 6 mois
  const caMensuel = useMemo(() => {
    const mois = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleDateString("fr-FR", { month: "short" });
      const ca = invoices.filter(inv => {
        const di = new Date(inv.dateEmission);
        return di.getMonth() === d.getMonth() && di.getFullYear() === d.getFullYear() && ["payee", "emise"].includes(inv.status);
      }).reduce((s, inv) => s + inv.montantHT, 0);
      const objectif = commerciaux.reduce((s, c) => s + c.objectifMensuel, 0);
      mois.push({ mois: label, CA: Math.round(ca), Objectif: objectif });
    }
    // ajouter un mois en cours avec simulation
    const current = mois[mois.length - 1];
    if (current && current.CA === 0) current.CA = Math.round(caSigne);
    return mois;
  }, [invoices, commerciaux, caSigne]);

  const classementCom = useMemo(() => {
    return commerciaux.map(c => {
      const ds = deals.filter(d => d.commercialId === c.id);
      const dsSignes = ds.filter(d => d.etape === "signe");
      const dsCloses = ds.filter(d => ["signe", "perdu"].includes(d.etape));
      const ca = dsSignes.reduce((s, d) => s + d.valeur, 0);
      const rdv = events.filter(e => e.commercialId === c.id).length;
      const devis = quotes.filter(q => q.commercialId === c.id).length;
      const tt = dsCloses.length > 0 ? dsSignes.length / dsCloses.length : 0;
      const commission = ca * 0.065; // approximation
      return { ...c, ca, rdv, devis, tauxTransfo: tt, commission, progression: c.objectifMensuel > 0 ? ca / c.objectifMensuel : 0 };
    }).sort((a, b) => b.ca - a.ca);
  }, [commerciaux, deals, events, quotes]);

  const agendaDuJour = events.filter(e => {
    const d = new Date(e.date);
    const t = new Date();
    return d.toDateString() === t.toDateString();
  });

  const mesDevisEnAttente = quotes.filter(q => q.status === "envoye" && (filterCommercial === "all" || q.commercialId === filterCommercial));

  return (
    <div className="space-y-4 md:space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Stat label="CA prévisionnel" value={fmtEUR(caPrevisionnel)} sub={`${filteredDeals.filter(d => !["perdu","signe"].includes(d.etape)).length} affaires en cours`} icon={TrendingUp} accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400" trend={12} />
        <Stat label="CA signé" value={fmtEUR(caSigne)} sub={`${filteredDeals.filter(d => d.etape === "signe").length} affaires gagnées`} icon={Award} accent="bg-[#C9A961]/15 text-[#8B7228] dark:bg-[#C9A961]/15 dark:text-[#C9A961]" />
        <Stat label="Taux transformation" value={fmtPct(tauxTransfo)} sub="sur affaires closes" icon={Target} accent="bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400" />
        <Stat label="Pipeline total" value={fmtEUR(pipeline.reduce((s, p) => s + p.valeur, 0))} sub={`${filteredDeals.filter(d => d.etape !== "perdu" && d.etape !== "signe").length} opportunités`} icon={Zap} accent="bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400" />
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CA vs Objectif */}
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Chiffre d'affaires</h3>
              <p className="text-xs text-slate-500">6 derniers mois — objectif équipe vs réalisé</p>
            </div>
          </div>
          <div className="h-60 -mx-2">
            <ResponsiveContainer>
              <AreaChart data={caMensuel}>
                <defs>
                  <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C9A961" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#C9A961" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0B1E3F", border: "none", borderRadius: 8, fontSize: 12, color: "white" }}
                  formatter={(v) => fmtEUR(v)}
                  labelStyle={{ color: "#C9A961" }}
                />
                <Area type="monotone" dataKey="Objectif" stroke="#94A3B8" strokeDasharray="4 4" fill="transparent" strokeWidth={1.5} />
                <Area type="monotone" dataKey="CA" stroke="#C9A961" fill="url(#caGrad)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Alertes */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-500" />
              Alertes
            </h3>
            <Badge color="amber">{alertes.length}</Badge>
          </div>
          <div className="space-y-2">
            {alertes.length === 0 && (
              <div className="text-sm text-slate-500 py-4 text-center">Aucune alerte, tout est en ordre.</div>
            )}
            {alertes.map((a, i) => (
              <button
                key={i}
                onClick={a.onClick}
                className="w-full flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors"
              >
                <div className={cx(
                  "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                  a.severity === "high" ? "bg-red-500" : "bg-amber-500"
                )} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{a.titre}</div>
                  <div className="text-xs text-slate-500 truncate">{a.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Pipeline */}
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Pipeline par étape</h3>
            <button onClick={() => setView("pipeline")} className="text-xs text-[#C9A961] font-medium flex items-center gap-1 hover:underline">
              Voir le pipeline <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2.5">
            {pipeline.map((p) => {
              const maxValeur = Math.max(...pipeline.map(x => x.valeur), 1);
              return (
                <div key={p.id} className="group">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="font-medium text-slate-700 dark:text-slate-300">{p.label}</span>
                      <span className="text-slate-400">({p.count})</span>
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{fmtEUR(p.valeur)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(p.valeur / maxValeur) * 100}%`, backgroundColor: p.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Agenda */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Aujourd'hui</h3>
            <button onClick={() => setView("calendar")} className="text-xs text-[#C9A961] font-medium flex items-center gap-1 hover:underline">
              Agenda <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {agendaDuJour.length === 0 ? (
              <div className="text-sm text-slate-500 py-4 text-center">Aucun rendez-vous aujourd'hui.</div>
            ) : agendaDuJour.map((e) => {
              const acc = accounts.find(a => a.id === e.accountId);
              return (
                <div key={e.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="w-9 text-center flex-shrink-0">
                    <div className="text-xs font-semibold text-[#C9A961]">{new Date(e.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
                    <div className="text-[10px] text-slate-500">{e.duree} min</div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{e.title}</div>
                    <div className="text-xs text-slate-500 truncate">{acc?.raisonSociale}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Classement commerciaux */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Classement commerciaux</h3>
            <p className="text-xs text-slate-500">Progression sur objectif mensuel</p>
          </div>
          <button onClick={() => setView("team")} className="text-xs text-[#C9A961] font-medium flex items-center gap-1 hover:underline">
            Équipe <ArrowRight size={12} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase tracking-wide">
                <th className="text-left py-2 px-2 font-medium">Commercial</th>
                <th className="text-right py-2 px-2 font-medium">RDV</th>
                <th className="text-right py-2 px-2 font-medium">Devis</th>
                <th className="text-right py-2 px-2 font-medium">Taux T.</th>
                <th className="text-right py-2 px-2 font-medium">CA signé</th>
                <th className="text-right py-2 px-2 font-medium">Commission</th>
                <th className="text-left py-2 px-2 font-medium min-w-[160px]">Objectif</th>
              </tr>
            </thead>
            <tbody>
              {classementCom.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0" style={{ backgroundColor: c.couleur }}>
                        {c.prenom[0]}{c.nom[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 dark:text-slate-100 truncate">{c.prenom} {c.nom}</div>
                        <div className="text-xs text-slate-500 capitalize">{c.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-right py-3 px-2 tabular-nums">{c.rdv}</td>
                  <td className="text-right py-3 px-2 tabular-nums">{c.devis}</td>
                  <td className="text-right py-3 px-2 tabular-nums">{fmtPct(c.tauxTransfo)}</td>
                  <td className="text-right py-3 px-2 tabular-nums font-semibold">{fmtEUR(c.ca)}</td>
                  <td className="text-right py-3 px-2 tabular-nums text-[#C9A961] font-medium">{fmtEUR(c.commission)}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, c.progression * 100)}%`,
                            backgroundColor: c.progression >= 1 ? "#10B981" : c.progression >= 0.5 ? "#C9A961" : "#94A3B8",
                          }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-slate-500 w-10 text-right">{Math.round(c.progression * 100)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Carte affaires */}
      <Card className="p-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Carte des affaires en cours - Var</h3>
        <VarMap deals={filteredDeals.filter(d => d.etape !== "perdu" && d.etape !== "signe")} accounts={accounts} />
      </Card>

      {/* Devis en attente */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Devis en attente de signature</h3>
          <button onClick={() => setView("quotes")} className="text-xs text-[#C9A961] font-medium flex items-center gap-1 hover:underline">
            Tous les devis <ArrowRight size={12} />
          </button>
        </div>
        <div className="space-y-2">
          {mesDevisEnAttente.length === 0 ? (
            <EmptyState icon={FileText} title="Aucun devis en attente" description="Tous vos devis ont été traités." />
          ) : mesDevisEnAttente.map((q) => {
            const acc = accounts.find(a => a.id === q.accountId);
            const totaux = calcDevisTotaux(q, settings, state.products);
            const jours = q.sentAt ? daysAgo(q.sentAt) : 0;
            return (
              <div key={q.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-[#C9A961]/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{q.numero}</span>
                    <Badge color="violet">Envoyé</Badge>
                    {jours > 15 && <Badge color="amber">Relance — J+{jours}</Badge>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{acc?.raisonSociale} — {fmtEUR(totaux.totalHT)} HT</div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button variant="outline" size="sm" onClick={() => setViewDetail({ type: "quote", id: q.id })}>Voir</Button>
                  <Button variant="gold" size="sm" icon={Phone}>Relancer</Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// Carte Var simple (SVG stylisée)
function VarMap({ deals, accounts }) {
  // Bounding box approximatif pour le Var
  const BBOX = { minLat: 43.08, maxLat: 43.28, minLng: 5.80, maxLng: 6.15 };
  const W = 700, H = 280;
  const project = (lat, lng) => {
    const x = ((lng - BBOX.minLng) / (BBOX.maxLng - BBOX.minLng)) * W;
    const y = H - ((lat - BBOX.minLat) / (BBOX.maxLat - BBOX.minLat)) * H;
    return { x, y };
  };

  const points = deals.map(d => {
    const acc = accounts.find(a => a.id === d.accountId);
    if (!acc?.lat) return null;
    const p = project(acc.lat, acc.lng);
    const etape = ETAPES.find(e => e.id === d.etape);
    return { ...p, deal: d, acc, color: etape?.color || "#94A3B8" };
  }).filter(Boolean);

  return (
    <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-900">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* Fond stylisé côte méditerranéenne */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8F0" strokeWidth="0.5" opacity="0.5" />
          </pattern>
          <linearGradient id="seaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E0F2FE" />
            <stop offset="100%" stopColor="#BFDBFE" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />
        {/* Mer en bas */}
        <path d={`M 0 ${H * 0.75} Q ${W * 0.3} ${H * 0.82} ${W * 0.6} ${H * 0.78} T ${W} ${H * 0.72} L ${W} ${H} L 0 ${H} Z`} fill="url(#seaGrad)" opacity="0.6" />
        <text x={20} y={H - 20} fill="#60A5FA" fontSize="11" fontWeight="600" opacity="0.7">Méditerranée</text>
        {/* Labels villes */}
        <text x={project(43.124, 5.928).x} y={project(43.124, 5.928).y + 35} fill="#64748B" fontSize="10" textAnchor="middle" fontWeight="500">Toulon</text>
        <text x={project(43.140, 5.981).x} y={project(43.140, 5.981).y - 12} fill="#64748B" fontSize="9" textAnchor="middle">La Valette</text>
        <text x={project(43.171, 5.906).x} y={project(43.171, 5.906).y - 12} fill="#64748B" fontSize="9" textAnchor="middle">Le Revest</text>
        <text x={project(43.124, 6.014).x} y={project(43.124, 6.014).y + 16} fill="#64748B" fontSize="9" textAnchor="middle">La Garde</text>

        {/* Pins */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="12" fill={p.color} opacity="0.2">
              <animate attributeName="r" values="10;16;10" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx={p.x} cy={p.y} r="6" fill={p.color} stroke="white" strokeWidth="2">
              <title>{p.acc.raisonSociale} — {fmtEUR(p.deal.valeur)}</title>
            </circle>
          </g>
        ))}
      </svg>
      {/* Légende */}
      <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-lg p-2 text-xs space-y-1">
        {ETAPES.filter(e => e.id !== "perdu" && e.id !== "signe").map(e => (
          <div key={e.id} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
            <span className="text-slate-600 dark:text-slate-300">{e.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


// ============================================================
// PIPELINE (Kanban)
// ============================================================

function Pipeline({ state, updateDeal, setViewDetail, onCreateDeal, onNewQuoteFromDeal }) {
  const { deals, accounts, commerciaux } = state;
  const [filterCom, setFilterCom] = useState("all");
  const [dragging, setDragging] = useState(null);

  const list = filterCom === "all" ? deals : deals.filter(d => d.commercialId === filterCom);

  const byEtape = useMemo(() => {
    const m = {};
    ETAPES.forEach(e => { m[e.id] = list.filter(d => d.etape === e.id); });
    return m;
  }, [list]);

  const handleDrop = (etapeId) => {
    if (dragging && dragging.etape !== etapeId) {
      const et = ETAPES.find(e => e.id === etapeId);
      updateDeal(dragging.id, { etape: etapeId, probabilite: et?.proba ?? dragging.probabilite });
    }
    setDragging(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <select value={filterCom} onChange={(e) => setFilterCom(e.target.value)} className="px-3 py-1.5 text-sm rounded-lg bg-slate-100 dark:bg-slate-800 border-0 outline-none">
            <option value="all">Tous commerciaux</option>
            {commerciaux.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
          </select>
        </div>
        <Button variant="gold" icon={Plus} onClick={onCreateDeal}>Nouvelle affaire</Button>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-max">
          {ETAPES.map(etape => {
            const items = byEtape[etape.id] || [];
            const total = items.reduce((s, d) => s + d.valeur, 0);
            return (
              <div
                key={etape.id}
                className="w-72 flex-shrink-0"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(etape.id)}
              >
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: etape.color }} />
                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{etape.label}</span>
                    <span className="text-xs text-slate-500">({items.length})</span>
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{fmtEUR(total)}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2 space-y-2 min-h-[200px]">
                  {items.map(d => {
                    const acc = accounts.find(a => a.id === d.accountId);
                    const com = commerciaux.find(c => c.id === d.commercialId);
                    return (
                      <div
                        key={d.id}
                        draggable
                        onDragStart={() => setDragging(d)}
                        onDragEnd={() => setDragging(null)}
                        className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-[#C9A961]/40 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2">{d.title}</div>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0" style={{ backgroundColor: com?.couleur }}>
                            {com?.prenom?.[0]}{com?.nom?.[0]}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 mb-2 truncate">{acc?.raisonSociale}</div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{fmtEUR(d.valeur)}</span>
                          <Badge color="slate">{d.probabilite}%</Badge>
                        </div>
                        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <button onClick={() => setViewDetail({ type: "deal", id: d.id })} className="flex-1 text-xs text-slate-600 hover:text-[#C9A961]">Voir</button>
                          <button onClick={() => onNewQuoteFromDeal(d)} className="flex-1 text-xs text-[#C9A961] font-medium">+ Devis</button>
                        </div>
                      </div>
                    );
                  })}
                  {items.length === 0 && <div className="text-xs text-slate-400 text-center py-8">—</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ACCOUNTS
// ============================================================

function AccountsView({ state, onCreate, onEdit, setViewDetail, onImport, onExport }) {
  const { accounts, contacts, deals } = state;
  const [search, setSearch] = useState("");
  const [filterSecteur, setFilterSecteur] = useState("all");
  const [filterSource, setFilterSource] = useState("all");

  const filtered = accounts.filter(a => {
    if (search && !a.raisonSociale.toLowerCase().includes(search.toLowerCase()) && !a.ville.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterSecteur !== "all" && a.secteur !== filterSecteur) return false;
    if (filterSource !== "all" && a.source !== filterSource) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2 md:items-center">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Rechercher par nom ou ville..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-[#0B1E3F] dark:focus:border-[#C9A961] outline-none"
          />
        </div>
        <div className="flex gap-2">
          <select value={filterSecteur} onChange={(e) => setFilterSecteur(e.target.value)} className="px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none">
            <option value="all">Tous secteurs</option>
            {SECTEURS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none">
            <option value="all">Toutes sources</option>
            {SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <Button variant="outline" icon={Upload} onClick={onImport} className="hidden sm:inline-flex">Importer</Button>
          <Button variant="gold" icon={Plus} onClick={onCreate}>Nouveau</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(a => {
          const sec = SECTEURS.find(s => s.id === a.secteur);
          const Icon = sec?.icon || Building2;
          const nbContacts = contacts.filter(c => c.accountId === a.id).length;
          const nbDeals = deals.filter(d => d.accountId === a.id && d.etape !== "perdu").length;
          const valeur = deals.filter(d => d.accountId === a.id && d.etape !== "perdu").reduce((s, d) => s + d.valeur, 0);
          return (
            <Card key={a.id} hover onClick={() => setViewDetail({ type: "account", id: a.id })} className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#0B1E3F]/5 text-[#0B1E3F] dark:bg-[#C9A961]/15 dark:text-[#C9A961] flex-shrink-0">
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{a.raisonSociale}</div>
                  <div className="text-xs text-slate-500 truncate">{a.ville} — {sec?.label}</div>
                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Users size={12} />{nbContacts}</span>
                    <span className="flex items-center gap-1"><Briefcase size={12} />{nbDeals}</span>
                    <span className="ml-auto font-semibold text-slate-900 dark:text-slate-100">{fmtEUR(valeur)}</span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {filtered.length === 0 && <EmptyState icon={Building2} title="Aucun compte trouvé" description="Modifiez vos filtres ou créez un nouveau compte." />}
    </div>
  );
}

// ============================================================
// CONTACTS
// ============================================================

function ContactsView({ state, onCreate, onEdit, setViewDetail }) {
  const { contacts, accounts } = state;
  const [search, setSearch] = useState("");
  const filtered = contacts.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.nom.toLowerCase().includes(s) || c.prenom.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s);
  });
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Rechercher un contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none"
          />
        </div>
        <Button variant="gold" icon={Plus} onClick={onCreate}>Contact</Button>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase tracking-wide bg-slate-50 dark:bg-slate-800/40">
                <th className="text-left py-3 px-4 font-medium">Nom</th>
                <th className="text-left py-3 px-4 font-medium">Société</th>
                <th className="text-left py-3 px-4 font-medium">Rôle</th>
                <th className="text-left py-3 px-4 font-medium">Téléphone</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Email</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const acc = accounts.find(a => a.id === c.accountId);
                return (
                  <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer" onClick={() => onEdit(c)}>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">{c.prenom} {c.nom}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{acc?.raisonSociale}</td>
                    <td className="py-3 px-4"><Badge color={c.role === "decideur" ? "gold" : c.role === "technique" ? "blue" : "slate"}>{c.role}</Badge></td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 tabular-nums">{c.telephone}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 hidden md:table-cell">{c.email}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {filtered.length === 0 && <EmptyState icon={Users} title="Aucun contact" description="Créez votre premier contact." />}
    </div>
  );
}


// ============================================================
// QUOTES LIST
// ============================================================

function QuotesView({ state, onOpenWizard, setViewDetail, onDuplicate, onDelete, onChangeStatus, filterCommercial }) {
  const { quotes, accounts, settings, products, commerciaux } = state;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = quotes.filter(q => {
    if (filterCommercial !== "all" && q.commercialId !== filterCommercial) return false;
    if (statusFilter !== "all" && q.status !== statusFilter) return false;
    if (search) {
      const acc = accounts.find(a => a.id === q.accountId);
      const s = search.toLowerCase();
      return q.numero.toLowerCase().includes(s) || acc?.raisonSociale.toLowerCase().includes(s);
    }
    return true;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const statusConfig = {
    brouillon: { label: "Brouillon", color: "slate" },
    envoye: { label: "Envoyé", color: "violet" },
    signe_achat: { label: "Signé - Achat", color: "green" },
    signe_leasing: { label: "Signé - Leasing", color: "gold" },
    perdu: { label: "Perdu", color: "red" },
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Rechercher par numéro ou client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none">
          <option value="all">Tous statuts</option>
          {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <Button variant="gold" icon={Plus} onClick={() => onOpenWizard()}>Nouveau devis</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase tracking-wide bg-slate-50 dark:bg-slate-800/40">
                <th className="text-left py-3 px-4 font-medium">Numéro</th>
                <th className="text-left py-3 px-4 font-medium">Client</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Commercial</th>
                <th className="text-right py-3 px-4 font-medium">Total HT</th>
                <th className="text-center py-3 px-4 font-medium">Statut</th>
                <th className="text-left py-3 px-4 font-medium hidden sm:table-cell">Date</th>
                <th className="text-right py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(q => {
                const acc = accounts.find(a => a.id === q.accountId);
                const com = commerciaux.find(c => c.id === q.commercialId);
                const totaux = calcDevisTotaux(q, settings, products);
                const sc = statusConfig[q.status] || statusConfig.brouillon;
                return (
                  <tr key={q.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4">
                      <button onClick={() => setViewDetail({ type: "quote", id: q.id })} className="font-medium text-slate-900 dark:text-slate-100 hover:text-[#C9A961]">{q.numero}</button>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{acc?.raisonSociale}</td>
                    <td className="py-3 px-4 text-slate-500 hidden md:table-cell">{com?.prenom} {com?.nom}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-semibold text-slate-900 dark:text-slate-100">{fmtEUR(totaux.totalHT)}</td>
                    <td className="py-3 px-4 text-center"><Badge color={sc.color}>{sc.label}</Badge></td>
                    <td className="py-3 px-4 text-slate-500 hidden sm:table-cell">{fmtDateShort(q.createdAt)}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button onClick={() => setViewDetail({ type: "quote", id: q.id })} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title="Voir"><Eye size={14} /></button>
                      <button onClick={() => onDuplicate(q)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title="Dupliquer"><Copy size={14} /></button>
                      <button onClick={() => onOpenWizard(q)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title="Modifier"><Edit3 size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {filtered.length === 0 && <EmptyState icon={FileText} title="Aucun devis" description="Créez votre premier devis." action={<Button variant="gold" icon={Plus} onClick={() => onOpenWizard()}>Nouveau devis</Button>} />}
    </div>
  );
}

// ============================================================
// QUOTE WIZARD — LE CŒUR DU CRM
// ============================================================

function QuoteWizard({ open, onClose, onSave, initial, state, onPrint }) {
  const { accounts, contacts, products, packs, commerciaux, settings, deals } = state;
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() => initial || {
    id: uid(),
    numero: `DEV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(4, "0")}`,
    dealId: null,
    accountId: "",
    contactId: "",
    commercialId: commerciaux[0]?.id,
    lignes: [],
    heuresMO: 8,
    tauxMO: settings.tauxMO,
    fraisDeplacement: settings.fraisDeplacement,
    modeAchat: { maintenance: "confort" },
    modeLeasing: { duree: 48 },
    status: "brouillon",
    formuleChoisie: null,
    typeSite: "commerce",
    surface: 100,
    nbOuvrants: 3,
    contraintes: "",
    createdAt: new Date().toISOString(),
  });

  useEffect(() => {
    if (initial) { setDraft(initial); setStep(0); }
  }, [initial]);

  const totaux = calcDevisTotaux(draft, settings, products);

  const steps = ["Client & affaire", "Matériel", "Formule commerciale", "Génération"];

  const canNext = () => {
    if (step === 0) return draft.accountId;
    if (step === 1) return draft.lignes.length > 0;
    return true;
  };

  const save = () => { onSave(draft); };

  const account = accounts.find(a => a.id === draft.accountId);

  return (
    <Modal open={open} onClose={onClose} title={initial ? `Modifier ${draft.numero}` : "Nouveau devis"} size="full" footer={
      <div className="flex items-center gap-2 w-full">
        <div className="hidden sm:block text-xs text-slate-500 mr-auto">
          Total HT: <span className="font-semibold text-slate-900 dark:text-slate-100">{fmtEUR(totaux.totalHT)}</span>
          {" · "}
          Mensuel leasing: <span className="font-semibold text-[#C9A961]">{fmtEUR(totaux.mensualiteTotale)}/mois</span>
        </div>
        {step > 0 && <Button variant="outline" icon={ChevronLeft} onClick={() => setStep(step - 1)}>Précédent</Button>}
        <Button variant="subtle" icon={Save} onClick={save}>Enregistrer brouillon</Button>
        {step < steps.length - 1 ? (
          <Button variant="gold" onClick={() => canNext() && setStep(step + 1)} disabled={!canNext()}>Suivant <ChevronRight size={16} /></Button>
        ) : null}
      </div>
    }>
      <div className="p-4 md:p-5 space-y-5">
        <Stepper steps={steps} current={step} />

        {step === 0 && (
          <WizardStep1 draft={draft} setDraft={setDraft} accounts={accounts} contacts={contacts} commerciaux={commerciaux} deals={deals} />
        )}
        {step === 1 && (
          <WizardStep2 draft={draft} setDraft={setDraft} products={products} packs={packs} settings={settings} />
        )}
        {step === 2 && (
          <WizardStep3 draft={draft} setDraft={setDraft} totaux={totaux} settings={settings} />
        )}
        {step === 3 && (
          <WizardStep4 draft={draft} setDraft={setDraft} totaux={totaux} account={account} state={state} onPrint={onPrint} onSave={save} />
        )}
      </div>
    </Modal>
  );
}

function WizardStep1({ draft, setDraft, accounts, contacts, commerciaux, deals }) {
  const accountContacts = contacts.filter(c => c.accountId === draft.accountId);
  const accountDeals = deals.filter(d => d.accountId === draft.accountId && d.etape !== "perdu" && d.etape !== "signe");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Client</h3>
        <Select label="Compte client" value={draft.accountId} onChange={(e) => setDraft({ ...draft, accountId: e.target.value, contactId: "" })}
          options={[{ value: "", label: "— Sélectionner un compte —" }, ...accounts.map(a => ({ value: a.id, label: a.raisonSociale }))]}
        />
        <Select label="Contact" value={draft.contactId} onChange={(e) => setDraft({ ...draft, contactId: e.target.value })}
          options={[{ value: "", label: "— Sélectionner un contact —" }, ...accountContacts.map(c => ({ value: c.id, label: `${c.prenom} ${c.nom} (${c.role})` }))]}
        />
        <Select label="Affaire rattachée (optionnel)" value={draft.dealId || ""} onChange={(e) => setDraft({ ...draft, dealId: e.target.value || null })}
          options={[{ value: "", label: "— Aucune affaire —" }, ...accountDeals.map(d => ({ value: d.id, label: `${d.title} (${fmtEUR(d.valeur)})` }))]}
        />
        <Select label="Commercial affecté" value={draft.commercialId} onChange={(e) => setDraft({ ...draft, commercialId: e.target.value })}
          options={commerciaux.map(c => ({ value: c.id, label: `${c.prenom} ${c.nom}` }))}
        />
      </Card>
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Site à protéger</h3>
        <Select label="Type de site" value={draft.typeSite} onChange={(e) => setDraft({ ...draft, typeSite: e.target.value })}
          options={[
            { value: "commerce", label: "Commerce" },
            { value: "restaurant", label: "Restaurant" },
            { value: "bureau", label: "Bureau / PME" },
            { value: "villa", label: "Villa / résidence" },
            { value: "entrepot", label: "Entrepôt / ERP" },
            { value: "autre", label: "Autre" },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Surface (m²)" type="number" value={draft.surface} onChange={(e) => setDraft({ ...draft, surface: Number(e.target.value) })} />
          <Input label="Nb ouvrants" type="number" value={draft.nbOuvrants} onChange={(e) => setDraft({ ...draft, nbOuvrants: Number(e.target.value) })} />
        </div>
        <Textarea label="Contraintes / observations" value={draft.contraintes} onChange={(e) => setDraft({ ...draft, contraintes: e.target.value })} placeholder="Ex. local classé, conduits apparents interdits, intervention en heures ouvrées..." />
      </Card>
    </div>
  );
}

function WizardStep2({ draft, setDraft, products, packs, settings }) {
  const [searchProduct, setSearchProduct] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  const addProduct = (p, q = 1) => {
    const existing = draft.lignes.find(l => l.productId === p.id);
    if (existing) {
      setDraft({ ...draft, lignes: draft.lignes.map(l => l.productId === p.id ? { ...l, quantite: l.quantite + q } : l) });
    } else {
      setDraft({ ...draft, lignes: [...draft.lignes, {
        id: uid(),
        productId: p.id,
        libelle: p.libelleCommercial,
        quantite: q,
        prixAchatHT: p.prixAchatHT,
        prixVenteHT: p.prixVenteHT,
      }] });
    }
  };

  const addPack = (pack) => {
    const lignes = [...draft.lignes];
    pack.items.forEach(it => {
      const p = products.find(x => x.id === it.productId);
      if (!p) return;
      const idx = lignes.findIndex(l => l.productId === p.id);
      if (idx >= 0) lignes[idx] = { ...lignes[idx], quantite: lignes[idx].quantite + it.q };
      else lignes.push({ id: uid(), productId: p.id, libelle: p.libelleCommercial, quantite: it.q, prixAchatHT: p.prixAchatHT, prixVenteHT: p.prixVenteHT });
    });
    setDraft({ ...draft, lignes });
  };

  const updateLigne = (id, upd) => setDraft({ ...draft, lignes: draft.lignes.map(l => l.id === id ? { ...l, ...upd } : l) });
  const removeLigne = (id) => setDraft({ ...draft, lignes: draft.lignes.filter(l => l.id !== id) });

  const filteredProducts = products.filter(p => {
    if (catFilter !== "all" && p.categorie !== catFilter) return false;
    if (searchProduct) {
      const s = searchProduct.toLowerCase();
      return p.libelleCommercial.toLowerCase().includes(s) || (!settings.clientMode && p.libelleInterne?.toLowerCase().includes(s));
    }
    return true;
  });

  const sousTotal = draft.lignes.reduce((s, l) => s + (l.prixVenteHT || 0) * (l.quantite || 0), 0);
  const coutMO = (draft.heuresMO || 0) * (draft.tauxMO || settings.tauxMO);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Catalogue */}
      <div className="lg:col-span-2 space-y-3">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Packs pré-configurés</h3>
          <div className="grid grid-cols-1 gap-2">
            {packs.map(pk => (
              <button key={pk.id} onClick={() => addPack(pk)} className="text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-[#C9A961] hover:bg-[#C9A961]/5 transition-all">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{pk.nom}</div>
                    <div className="text-xs text-slate-500 truncate">{pk.items.length} références</div>
                  </div>
                  <Plus size={16} className="text-[#C9A961] flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Ajouter ligne à ligne</h3>
          <div className="flex gap-2 mb-2">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Rechercher un produit..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none"
              />
            </div>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="px-2 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none">
              <option value="all">Tout</option>
              <option value="alarme">Alarme</option>
              <option value="video">Vidéo</option>
              <option value="acces">Accès</option>
              <option value="interphonie">Interphonie</option>
            </select>
          </div>
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg max-h-80 overflow-y-auto">
            {filteredProducts.map(p => (
              <button key={p.id} onClick={() => addProduct(p)} className="w-full flex items-center justify-between gap-2 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-slate-900 dark:text-slate-100 line-clamp-1">{p.libelleCommercial}</div>
                  {!settings.clientMode && <div className="text-[10px] text-slate-500 mt-0.5">{p.marque.toUpperCase()} · {p.libelleInterne}</div>}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100">{fmtEUR(p.prixVenteHT)}</div>
                  {!settings.clientMode && <div className="text-[10px] text-slate-500 tabular-nums">achat {fmtEUR(p.prixAchatHT)}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lignes sélectionnées */}
      <div className="lg:col-span-3 space-y-3">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Matériel sélectionné ({draft.lignes.length})</h3>
        <Card>
          {draft.lignes.length === 0 ? (
            <EmptyState icon={Package} title="Aucune ligne" description="Ajoutez des produits ou un pack pour commencer." />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {draft.lignes.map(l => {
                const p = products.find(x => x.id === l.productId);
                return (
                  <div key={l.id} className="p-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2">{l.libelle}</div>
                      {!settings.clientMode && p && <div className="text-[10px] text-slate-500 mt-0.5">{p.marque.toUpperCase()} · Achat {fmtEUR(l.prixAchatHT)}</div>}
                    </div>
                    <input type="number" min="1" value={l.quantite} onChange={(e) => updateLigne(l.id, { quantite: Math.max(1, Number(e.target.value)) })}
                      className="w-16 px-2 py-1 text-sm rounded border border-slate-200 dark:border-slate-700 outline-none text-center tabular-nums bg-white dark:bg-slate-900" />
                    <input type="number" step="0.01" value={l.prixVenteHT} onChange={(e) => updateLigne(l.id, { prixVenteHT: Number(e.target.value) })}
                      className="w-24 px-2 py-1 text-sm rounded border border-slate-200 dark:border-slate-700 outline-none text-right tabular-nums bg-white dark:bg-slate-900" />
                    <div className="w-24 text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">{fmtEUR(l.prixVenteHT * l.quantite)}</div>
                    <button onClick={() => removeLigne(l.id)} className="p-1 rounded hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-4 space-y-3">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Main d'œuvre & déplacement</h4>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Heures MO" type="number" value={draft.heuresMO} onChange={(e) => setDraft({ ...draft, heuresMO: Number(e.target.value) })} />
            <Input label="Taux horaire (€)" type="number" value={draft.tauxMO} onChange={(e) => setDraft({ ...draft, tauxMO: Number(e.target.value) })} />
            <Input label="Déplacement (€)" type="number" value={draft.fraisDeplacement} onChange={(e) => setDraft({ ...draft, fraisDeplacement: Number(e.target.value) })} />
          </div>
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>Matériel HT</span><span className="tabular-nums">{fmtEUR(sousTotal)}</span></div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>Main d'œuvre</span><span className="tabular-nums">{fmtEUR(coutMO)}</span></div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>Déplacement</span><span className="tabular-nums">{fmtEUR(draft.fraisDeplacement)}</span></div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100">
              <span>Total HT</span><span className="tabular-nums">{fmtEUR(sousTotal + coutMO + draft.fraisDeplacement)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function WizardStep3({ draft, setDraft, totaux, settings }) {
  const niveaux = ["essentiel", "confort", "serenite"];
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Trois formules à comparer</h3>
        <p className="text-xs text-slate-500 mt-1">Présentez au client la proposition qui correspond à ses priorités. Toutes les formules sont générables.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Achat sec */}
        <Card className="p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Formule A</div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">Achat sec</h4>
            </div>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800"><ShieldAlert size={16} className="text-slate-500" /></div>
          </div>
          <div className="py-4 text-center border-y border-slate-100 dark:border-slate-800 mb-3">
            <div className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{fmtEUR(totaux.totalHT)}</div>
            <div className="text-xs text-slate-500 mt-1">HT — paiement unique</div>
            <div className="text-xs text-slate-400 mt-0.5">{fmtEUR(totaux.totalTTC)} TTC</div>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 flex-1">
            <li className="flex items-start gap-2"><Check size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />Matériel et pose inclus</li>
            <li className="flex items-start gap-2"><Check size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />Garantie fabricant</li>
            <li className="flex items-start gap-2"><Check size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />Formation à la prise en main</li>
            <li className="flex items-start gap-2"><XCircle size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />Aucun contrat de maintenance</li>
            <li className="flex items-start gap-2"><XCircle size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />Évolutions facturées</li>
          </ul>
          <div className="mt-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500">
            PDF détaillé avec liste matériel, quantités et prix unitaires.
          </div>
        </Card>

        {/* Achat + Maintenance */}
        <Card className={cx("p-4 flex flex-col ring-2 ring-[#0B1E3F]/10 dark:ring-[#C9A961]/20")}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Formule B</div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">Achat + Maintenance</h4>
            </div>
            <div className="p-2 rounded-lg bg-[#0B1E3F]/10 dark:bg-[#C9A961]/15"><Shield size={16} className="text-[#0B1E3F] dark:text-[#C9A961]" /></div>
          </div>
          <div className="py-4 text-center border-y border-slate-100 dark:border-slate-800 mb-3">
            <div className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{fmtEUR(totaux.totalHT)}</div>
            <div className="text-xs text-slate-500 mt-1">HT + <span className="font-semibold text-[#0B1E3F] dark:text-[#C9A961]">{fmtEUR(totaux.maintenanceAnnuelle)}/an</span></div>
            <div className="text-xs text-slate-400 mt-0.5">soit {fmtEUR(totaux.maintenanceAnnuelle / 12)}/mois</div>
          </div>

          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Niveau maintenance</label>
          <div className="grid grid-cols-3 gap-1 mb-3">
            {niveaux.map(n => (
              <button key={n} onClick={() => setDraft({ ...draft, modeAchat: { maintenance: n } })}
                className={cx(
                  "px-2 py-1.5 text-xs font-medium rounded-md transition-all",
                  draft.modeAchat.maintenance === n ? "bg-[#0B1E3F] text-white dark:bg-[#C9A961] dark:text-[#0B1E3F]" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                )}>
                {NIVEAUX_MAINTENANCE[n].label}
              </button>
            ))}
          </div>

          <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 flex-1">
            {NIVEAUX_MAINTENANCE[draft.modeAchat.maintenance].details.map((d, i) => (
              <li key={i} className="flex items-start gap-2"><Check size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />{d}</li>
            ))}
          </ul>
          <div className="mt-3 p-2 rounded-lg bg-[#0B1E3F]/5 dark:bg-[#C9A961]/5 text-xs text-slate-500">
            Meilleur compromis pour la majorité des clients.
          </div>
        </Card>

        {/* Leasing */}
        <Card className="p-4 flex flex-col bg-gradient-to-br from-[#0B1E3F] to-[#142A52] text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-[#C9A961] font-semibold">Formule C</div>
              <h4 className="font-semibold text-white">Prestation Globale Évolutive</h4>
            </div>
            <div className="p-2 rounded-lg bg-[#C9A961]/20"><Sparkles size={16} className="text-[#C9A961]" /></div>
          </div>
          <div className="py-4 text-center border-y border-white/10 mb-3">
            <div className="text-3xl font-bold tabular-nums text-[#C9A961]">{fmtEUR(totaux.mensualiteTotale)}</div>
            <div className="text-xs text-slate-300 mt-1">HT / mois — tout inclus</div>
            <div className="text-[10px] text-slate-400 mt-0.5">engagement {totaux.duree} mois</div>
          </div>

          <label className="block text-xs font-medium text-slate-300 mb-1.5">Durée d'engagement</label>
          <div className="grid grid-cols-3 gap-1 mb-3">
            {[36, 48, 60].map(d => (
              <button key={d} onClick={() => setDraft({ ...draft, modeLeasing: { duree: d } })}
                className={cx(
                  "px-2 py-1.5 text-xs font-medium rounded-md transition-all",
                  draft.modeLeasing.duree === d ? "bg-[#C9A961] text-[#0B1E3F]" : "bg-white/10 text-slate-300 hover:bg-white/15"
                )}>
                {d} mois
              </button>
            ))}
          </div>

          <ul className="space-y-1.5 text-xs text-slate-300 flex-1">
            <li className="flex items-start gap-2"><Check size={12} className="text-[#C9A961] mt-0.5 flex-shrink-0" />Investissement initial : <strong className="text-white">0 €</strong></li>
            <li className="flex items-start gap-2"><Check size={12} className="text-[#C9A961] mt-0.5 flex-shrink-0" />Maintenance Sérénité incluse</li>
            <li className="flex items-start gap-2"><Check size={12} className="text-[#C9A961] mt-0.5 flex-shrink-0" />Évolutions matérielles incluses</li>
            <li className="flex items-start gap-2"><Check size={12} className="text-[#C9A961] mt-0.5 flex-shrink-0" />Interventions illimitées</li>
            <li className="flex items-start gap-2"><Check size={12} className="text-[#C9A961] mt-0.5 flex-shrink-0" />Formation utilisateurs incluse</li>
          </ul>
          <div className="mt-3 p-2 rounded-lg bg-white/5 text-xs text-slate-300">
            PDF sans prix unitaires ni marques. Mensualité unique.
          </div>
        </Card>
      </div>

      {/* Détail calcul leasing */}
      <Card className="p-4">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Décomposition mensualité leasing (interne)</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div className="text-xs text-slate-500">Montant financé</div>
            <div className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{fmtEUR(totaux.totalHT)}</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div className="text-xs text-slate-500">Coef mensuel ({totaux.duree} m)</div>
            <div className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{(totaux.coefMens * 100).toFixed(2)} %</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div className="text-xs text-slate-500">Mensualité matériel</div>
            <div className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{fmtEURc(totaux.mensualiteMateriel)}</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div className="text-xs text-slate-500">+ Maintenance + Évol.</div>
            <div className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{fmtEURc(totaux.mensualiteMaintenance + totaux.mensualiteProvision)}</div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 md:col-span-2">
            <div className="text-xs text-emerald-700 dark:text-emerald-400">Marge brute estimée</div>
            <div className="font-semibold tabular-nums text-emerald-900 dark:text-emerald-300">{fmtEUR(totaux.margeBrute)} ({fmtPct(totaux.tauxMarge)})</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0B1E3F]/5 dark:bg-[#C9A961]/10 md:col-span-2">
            <div className="text-xs text-slate-500">Total revenu leasing sur la durée</div>
            <div className="font-semibold tabular-nums text-[#0B1E3F] dark:text-[#C9A961]">{fmtEUR(totaux.totalLeasing)}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function WizardStep4({ draft, setDraft, totaux, account, state, onPrint, onSave }) {
  const [modePrint, setModePrint] = useState("achat");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Proposition Achat</h3>
            <p className="text-xs text-slate-500">Devis détaillé ligne par ligne</p>
          </div>
          <div className="p-2 rounded-lg bg-[#0B1E3F]/5 dark:bg-[#C9A961]/10"><FileText size={18} className="text-[#0B1E3F] dark:text-[#C9A961]" /></div>
        </div>
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between"><span className="text-slate-500">Client</span><span className="font-medium">{account?.raisonSociale}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Lignes</span><span className="font-medium">{draft.lignes.length}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Total HT</span><span className="font-bold text-slate-900 dark:text-slate-100">{fmtEUR(totaux.totalHT)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Total TTC</span><span className="font-medium">{fmtEUR(totaux.totalTTC)}</span></div>
          <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800"><span className="text-slate-500">Maintenance {totaux.niveauAchat.label}</span><span className="font-medium">{fmtEUR(totaux.maintenanceAnnuelle)}/an</span></div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" icon={Printer} onClick={() => onPrint({ ...draft, _printMode: "achat" })} className="flex-1">Générer PDF Achat</Button>
          <Button variant="outline" icon={Send} onClick={() => {
            const mailto = `mailto:${state.contacts.find(c => c.id === draft.contactId)?.email || ""}?subject=${encodeURIComponent(`Proposition ${draft.numero} - ${account?.raisonSociale || ""}`)}&body=${encodeURIComponent(`Bonjour,\n\nVeuillez trouver ci-joint notre proposition commerciale.\n\nTotal HT : ${fmtEUR(totaux.totalHT)}\n\nBien cordialement,\n${state.commerciaux.find(c => c.id === draft.commercialId)?.prenom || ""} ${state.commerciaux.find(c => c.id === draft.commercialId)?.nom || ""}\nFOLONEO`)}`;
            window.open(mailto, "_self");
            onSave({ ...draft, status: "envoye", sentAt: new Date().toISOString(), formuleChoisie: "achat_maintenance" });
          }}>Envoyer</Button>
        </div>
      </Card>

      <Card className="p-5 bg-gradient-to-br from-[#0B1E3F] to-[#142A52] text-white border-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-white">Prestation Globale Évolutive</h3>
            <p className="text-xs text-slate-300">Leasing tout inclus - sans prix unitaires</p>
          </div>
          <div className="p-2 rounded-lg bg-[#C9A961]/20"><Sparkles size={18} className="text-[#C9A961]" /></div>
        </div>
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between"><span className="text-slate-300">Client</span><span className="font-medium text-white">{account?.raisonSociale}</span></div>
          <div className="flex justify-between"><span className="text-slate-300">Engagement</span><span className="font-medium text-white">{totaux.duree} mois</span></div>
          <div className="flex justify-between text-base pt-1"><span className="text-slate-300">Mensualité</span><span className="font-bold text-[#C9A961]">{fmtEUR(totaux.mensualiteTotale)} /mois</span></div>
          <div className="flex justify-between pt-2 border-t border-white/10"><span className="text-slate-300">Total engagement</span><span className="font-medium text-white">{fmtEUR(totaux.totalLeasing)}</span></div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="gold" icon={Printer} onClick={() => onPrint({ ...draft, _printMode: "leasing" })} className="flex-1">Générer PDF Leasing</Button>
          <Button variant="outline" icon={Send} className="!border-white/30 !text-white hover:!bg-white/10" onClick={() => {
            const mailto = `mailto:${state.contacts.find(c => c.id === draft.contactId)?.email || ""}?subject=${encodeURIComponent(`Proposition de Prestation de Service Global Évolutive - ${account?.raisonSociale || ""}`)}&body=${encodeURIComponent(`Bonjour,\n\nVeuillez trouver ci-joint notre proposition de prestation de service global évolutive.\n\nMensualité : ${fmtEUR(totaux.mensualiteTotale)}/mois sur ${totaux.duree} mois, tout inclus.\n\nBien cordialement,\nFOLONEO`)}`;
            window.open(mailto, "_self");
            onSave({ ...draft, status: "envoye", sentAt: new Date().toISOString(), formuleChoisie: "leasing" });
          }}>Envoyer</Button>
        </div>
      </Card>

      <Card className="p-4 lg:col-span-2">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Récapitulatif global</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-slate-500">Numéro</div><div className="font-semibold">{draft.numero}</div></div>
          <div><div className="text-xs text-slate-500">Commercial</div><div className="font-semibold">{state.commerciaux.find(c => c.id === draft.commercialId)?.prenom} {state.commerciaux.find(c => c.id === draft.commercialId)?.nom}</div></div>
          <div><div className="text-xs text-slate-500">Date</div><div className="font-semibold">{fmtDate(draft.createdAt)}</div></div>
          <div><div className="text-xs text-slate-500">Marge brute</div><div className="font-semibold text-emerald-600">{fmtEUR(totaux.margeBrute)} ({fmtPct(totaux.tauxMarge)})</div></div>
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// CATALOGUE
// ============================================================================
function CatalogView({ state, setState, clientMode, settings }) {
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("tous");
  const [tab, setTab] = React.useState("produits");
  const [editing, setEditing] = React.useState(null);
  const [editingPack, setEditingPack] = React.useState(null);

  const products = state.products.filter(p => {
    if (typeFilter !== "tous" && p.type !== typeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (p.libelleCommercial || "").toLowerCase().includes(s)
        || (p.libelleInterne || "").toLowerCase().includes(s)
        || (p.refFabricant || "").toLowerCase().includes(s);
    }
    return true;
  });

  const saveProduct = (p) => {
    const prixAchat = p.marque === "ajax" ? calcPrixAchatAjax(p.prixSylis || 0, settings.coefAjax)
                     : p.marque === "dahua" ? calcPrixAchatDahua(p.prixMarche || 0, settings.dahuaDiv, settings.coefDahua)
                     : p.prixAchatHT || 0;
    const prixVente = p.prixVenteHT || +(prixAchat * settings.coefCategorieDefault).toFixed(2);
    const produit = { ...p, prixAchatHT: prixAchat, prixVenteHT: prixVente };
    if (p.id) {
      setState(s => ({ ...s, products: s.products.map(x => x.id === p.id ? produit : x) }));
    } else {
      setState(s => ({ ...s, products: [...s.products, { ...produit, id: uid("p") }] }));
    }
    setEditing(null);
  };

  const deleteProduct = (id) => {
    if (!confirm("Supprimer ce produit du catalogue ?")) return;
    setState(s => ({ ...s, products: s.products.filter(p => p.id !== id) }));
  };

  const savePack = (pk) => {
    if (pk.id && state.packs.some(x => x.id === pk.id)) {
      setState(s => ({ ...s, packs: s.packs.map(x => x.id === pk.id ? pk : x) }));
    } else {
      setState(s => ({ ...s, packs: [...s.packs, { ...pk, id: pk.id || uid("pk") }] }));
    }
    setEditingPack(null);
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Catalogue</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Produits, coefficients et packs pré-configurés</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={Plus} onClick={() => tab === "produits" ? setEditing({}) : setEditingPack({ lignes: [] })}>
            Nouveau {tab === "produits" ? "produit" : "pack"}
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {["produits", "packs"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab === t ? "border-[#C9A961] text-[#0B1E3F] dark:text-[#C9A961]" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t === "produits" ? "Produits" : "Packs"}
          </button>
        ))}
      </div>

      {tab === "produits" ? (
        <>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un produit..." className="!pl-9" />
            </div>
            <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="tous">Tous les types</option>
              <option value="alarme">Alarme</option>
              <option value="video">Vidéosurveillance</option>
              <option value="acces">Contrôle d'accès</option>
              <option value="incendie">Incendie</option>
              <option value="accessoire">Accessoire</option>
            </Select>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="text-left p-3">Produit</th>
                    {!clientMode && <th className="text-left p-3">Marque</th>}
                    {!clientMode && <th className="text-right p-3">Achat HT</th>}
                    <th className="text-right p-3">Vente HT</th>
                    {!clientMode && <th className="text-right p-3">Marge</th>}
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => {
                    const marge = p.prixVenteHT - p.prixAchatHT;
                    const margePct = p.prixVenteHT > 0 ? marge / p.prixVenteHT : 0;
                    return (
                      <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="p-3">
                          <div className="font-medium text-slate-900 dark:text-slate-100">{clientMode ? p.libelleCommercial : p.libelleInterne}</div>
                          {!clientMode && <div className="text-xs text-slate-500">{p.refFabricant}</div>}
                        </td>
                        {!clientMode && <td className="p-3"><Badge tone="navy">{p.marque?.toUpperCase() || "—"}</Badge></td>}
                        {!clientMode && <td className="p-3 text-right text-slate-600 dark:text-slate-400">{fmtEUR(p.prixAchatHT)}</td>}
                        <td className="p-3 text-right font-medium">{fmtEUR(p.prixVenteHT)}</td>
                        {!clientMode && <td className="p-3 text-right text-emerald-600">{fmtPct(margePct)}</td>}
                        <td className="p-3 text-right">
                          <button onClick={() => setEditing(p)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><Edit2 size={14} /></button>
                          <button onClick={() => deleteProduct(p.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {products.length === 0 && <EmptyState icon={Package} title="Aucun produit" message="Ajoute un premier produit à ton catalogue." />}
            </div>
          </Card>
        </>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {state.packs.map(pk => (
            <Card key={pk.id} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">{pk.nom}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{pk.description}</p>
                </div>
                <Badge tone="gold">{pk.cible}</Badge>
              </div>
              <div className="space-y-1 mb-3 text-xs text-slate-600 dark:text-slate-400">
                {pk.lignes?.map((l, i) => {
                  const p = state.products.find(x => x.id === l.productId);
                  return <div key={i} className="flex justify-between"><span>{l.quantite}× {clientMode ? p?.libelleCommercial : p?.libelleInterne}</span></div>;
                })}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="text-sm font-semibold text-[#0B1E3F] dark:text-[#C9A961]">{fmtEUR(pk.prixIndicatif || 0)}</div>
                <button onClick={() => setEditingPack(pk)} className="text-xs text-slate-500 hover:text-slate-900">Modifier</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && <ProductEditor product={editing} settings={settings} onSave={saveProduct} onClose={() => setEditing(null)} />}
      {editingPack && <PackEditor pack={editingPack} products={state.products} clientMode={clientMode} onSave={savePack} onClose={() => setEditingPack(null)} />}
    </div>
  );
}

function ProductEditor({ product, settings, onSave, onClose }) {
  const [p, setP] = React.useState({
    refFabricant: "", libelleInterne: "", libelleCommercial: "", marque: "ajax",
    type: "alarme", prixSylis: 0, prixMarche: 0, prixAchatHT: 0, prixVenteHT: 0,
    ...product,
  });
  const autoPrix = React.useMemo(() => {
    if (p.marque === "ajax") return calcPrixAchatAjax(p.prixSylis || 0, settings.coefAjax);
    if (p.marque === "dahua") return calcPrixAchatDahua(p.prixMarche || 0, settings.dahuaDiv, settings.coefDahua);
    return p.prixAchatHT || 0;
  }, [p.marque, p.prixSylis, p.prixMarche, p.prixAchatHT]);

  return (
    <Modal open onClose={onClose} title={p.id ? "Modifier le produit" : "Nouveau produit"} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="primary" onClick={() => onSave(p)}>Enregistrer</Button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Référence fabricant" value={p.refFabricant} onChange={e => setP({ ...p, refFabricant: e.target.value })} />
          <Select label="Marque" value={p.marque} onChange={e => setP({ ...p, marque: e.target.value })}>
            <option value="ajax">Ajax</option>
            <option value="dahua">Dahua</option>
            <option value="vauban">Vauban Systems</option>
            <option value="autre">Autre</option>
          </Select>
        </div>
        <Input label="Libellé interne" value={p.libelleInterne} onChange={e => setP({ ...p, libelleInterne: e.target.value })} />
        <Input label="Libellé commercial (visible client)" value={p.libelleCommercial} onChange={e => setP({ ...p, libelleCommercial: e.target.value })} hint="Neutre, sans marque" />
        <Select label="Type" value={p.type} onChange={e => setP({ ...p, type: e.target.value })}>
          <option value="alarme">Alarme / Intrusion</option>
          <option value="video">Vidéosurveillance</option>
          <option value="acces">Contrôle d'accès</option>
          <option value="incendie">Incendie</option>
          <option value="accessoire">Accessoire</option>
        </Select>
        <div className="grid grid-cols-2 gap-3">
          {p.marque === "ajax" && <Input type="number" label="Prix Sylis HT" value={p.prixSylis} onChange={e => setP({ ...p, prixSylis: +e.target.value })} />}
          {p.marque === "dahua" && <Input type="number" label="Prix marché TTC" value={p.prixMarche} onChange={e => setP({ ...p, prixMarche: +e.target.value })} />}
          {(p.marque === "vauban" || p.marque === "autre") && <Input type="number" label="Prix achat HT" value={p.prixAchatHT} onChange={e => setP({ ...p, prixAchatHT: +e.target.value })} />}
          <Input type="number" label="Prix vente HT" value={p.prixVenteHT || +(autoPrix * settings.coefCategorieDefault).toFixed(2)} onChange={e => setP({ ...p, prixVenteHT: +e.target.value })} />
        </div>
        <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
          Prix achat calculé : <strong>{fmtEUR(autoPrix)}</strong> • Coef appliqué : {p.marque === "ajax" ? settings.coefAjax : p.marque === "dahua" ? `÷${settings.dahuaDiv} × ${settings.coefDahua}` : "direct"}
        </div>
      </div>
    </Modal>
  );
}

function PackEditor({ pack, products, clientMode, onSave, onClose }) {
  const [pk, setPk] = React.useState({ nom: "", description: "", cible: "PME", lignes: [], prixIndicatif: 0, ...pack });
  const addLine = (productId) => setPk({ ...pk, lignes: [...(pk.lignes || []), { productId, quantite: 1 }] });
  const updateLine = (i, q) => setPk({ ...pk, lignes: pk.lignes.map((l, idx) => idx === i ? { ...l, quantite: q } : l) });
  const removeLine = (i) => setPk({ ...pk, lignes: pk.lignes.filter((_, idx) => idx !== i) });

  const totalAuto = (pk.lignes || []).reduce((s, l) => {
    const p = products.find(x => x.id === l.productId);
    return s + (p?.prixVenteHT || 0) * l.quantite;
  }, 0);

  return (
    <Modal open onClose={onClose} title={pk.id ? "Modifier le pack" : "Nouveau pack"} size="xl"
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="primary" onClick={() => onSave({ ...pk, prixIndicatif: pk.prixIndicatif || totalAuto })}>Enregistrer</Button></>}>
      <div className="space-y-3">
        <Input label="Nom du pack" value={pk.nom} onChange={e => setPk({ ...pk, nom: e.target.value })} />
        <Textarea label="Description" rows={2} value={pk.description} onChange={e => setPk({ ...pk, description: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Cible" value={pk.cible} onChange={e => setPk({ ...pk, cible: e.target.value })}>
            <option value="Particulier">Particulier</option>
            <option value="Commerce">Commerce</option>
            <option value="PME">PME</option>
            <option value="Premium">Premium</option>
          </Select>
          <Input type="number" label="Prix indicatif HT" value={pk.prixIndicatif} onChange={e => setPk({ ...pk, prixIndicatif: +e.target.value })} hint={`Auto : ${fmtEUR(totalAuto)}`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Composition</label>
          <div className="space-y-1 mb-2">
            {(pk.lignes || []).map((l, i) => {
              const p = products.find(x => x.id === l.productId);
              return (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex-1 text-sm">{clientMode ? p?.libelleCommercial : p?.libelleInterne}</div>
                  <Input type="number" className="!w-20" value={l.quantite} onChange={e => updateLine(i, +e.target.value)} />
                  <button onClick={() => removeLine(i)} className="p-1.5 rounded hover:bg-red-50 text-red-600"><X size={14} /></button>
                </div>
              );
            })}
          </div>
          <Select onChange={e => { if (e.target.value) { addLine(e.target.value); e.target.value = ""; } }}>
            <option value="">+ Ajouter un produit…</option>
            {products.map(p => <option key={p.id} value={p.id}>{clientMode ? p.libelleCommercial : p.libelleInterne}</option>)}
          </Select>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// MAINTENANCE
// ============================================================================
function MaintenanceView({ state, setState, settings }) {
  const [filter, setFilter] = React.useState("tous");
  const today = new Date();
  const allContrats = state.contrats || state.contracts || [];
  const contrats = allContrats.filter(c => {
    if (filter === "tous") return true;
    return c.statut === filter;
  }).map(c => {
    const endDate = new Date(c.dateFin);
    const jours = Math.ceil((endDate - today) / 86400000);
    let alerte = null;
    if (jours < 0) alerte = "expire";
    else if (jours <= 15) alerte = "urgent";
    else if (jours <= 30) alerte = "proche";
    else if (jours <= 60) alerte = "a_preparer";
    return { ...c, joursRestants: jours, alerte };
  }).sort((a, b) => a.joursRestants - b.joursRestants);

  const kpis = {
    total: allContrats.length,
    actifs: allContrats.filter(c => c.statut === "actif").length,
    aRenouveler: allContrats.filter(c => {
      const j = Math.ceil((new Date(c.dateFin) - today) / 86400000);
      return j <= 60 && j > 0;
    }).length,
    caAnnuel: allContrats.filter(c => c.statut === "actif").reduce((s, c) => s + (c.montantAnnuel || 0), 0),
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Maintenance</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Contrats actifs et renouvellements à venir</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Contrats actifs" value={kpis.actifs} icon={ShieldCheck} tone="emerald" />
        <Stat label="À renouveler <60j" value={kpis.aRenouveler} icon={AlertTriangle} tone="amber" />
        <Stat label="Total contrats" value={kpis.total} icon={FileCheck} tone="navy" />
        <Stat label="CA annuel récurrent" value={fmtEUR(kpis.caAnnuel)} icon={TrendingUp} tone="gold" />
      </div>

      <div className="flex gap-2 flex-wrap">
        {["tous", "actif", "a_renouveler", "expire"].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${filter === f ? "bg-[#0B1E3F] text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"}`}>
            {f === "tous" ? "Tous" : f === "actif" ? "Actifs" : f === "a_renouveler" ? "À renouveler" : "Expirés"}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left p-3">Contrat</th>
                <th className="text-left p-3">Client</th>
                <th className="text-left p-3">Niveau</th>
                <th className="text-right p-3">Montant/an</th>
                <th className="text-left p-3">Échéance</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contrats.map(c => {
                const acc = state.accounts.find(a => a.id === c.accountId);
                const niveau = NIVEAUX_MAINTENANCE[c.niveau] || {};
                return (
                  <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="p-3 font-mono text-xs text-slate-600">{c.numero || c.id}</td>
                    <td className="p-3 font-medium">{acc?.raisonSociale}</td>
                    <td className="p-3"><Badge tone="navy">{niveau.label || c.niveau}</Badge></td>
                    <td className="p-3 text-right font-medium">{fmtEUR(c.montantAnnuel)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-700 dark:text-slate-300">{fmtDate(c.dateFin)}</span>
                        {c.alerte === "expire" && <Badge tone="red">Expiré</Badge>}
                        {c.alerte === "urgent" && <Badge tone="red">J{c.joursRestants >= 0 ? "-" : "+"}{Math.abs(c.joursRestants)}</Badge>}
                        {c.alerte === "proche" && <Badge tone="amber">J-{c.joursRestants}</Badge>}
                        {c.alerte === "a_preparer" && <Badge tone="slate">J-{c.joursRestants}</Badge>}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" icon={RotateCw} onClick={() => {
                        const newDateFin = new Date(c.dateFin); newDateFin.setFullYear(newDateFin.getFullYear() + 1);
                        setState(s => ({ ...s, contrats: (s.contrats || []).map(x => x.id === c.id ? { ...x, dateFin: newDateFin.toISOString().slice(0, 10), statut: "actif" } : x) }));
                      }}>Renouveler</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {contrats.length === 0 && <EmptyState icon={ShieldCheck} title="Aucun contrat" message="Les contrats de maintenance apparaîtront ici." />}
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// FACTURATION
// ============================================================================
function InvoicesView({ state, setState, settings }) {
  const [filter, setFilter] = React.useState("toutes");
  const factures = state.invoices.filter(f => filter === "toutes" || f.status === filter);

  const kpis = {
    total: state.invoices.reduce((s, f) => s + (f.montantTTC || 0), 0),
    emises: state.invoices.filter(f => f.status === "emise").reduce((s, f) => s + (f.montantTTC || 0), 0),
    payees: state.invoices.filter(f => f.status === "payee").reduce((s, f) => s + (f.montantTTC || 0), 0),
    retard: state.invoices.filter(f => f.status === "retard").reduce((s, f) => s + (f.montantTTC || 0), 0),
  };

  const transformerDevis = (quoteId) => {
    const q = state.quotes.find(x => x.id === quoteId);
    if (!q) return;
    const totaux = calcDevisTotaux(q, state.settings, state.products);
    const num = `FA-${new Date().getFullYear()}-${String(state.invoices.length + 79).padStart(4, "0")}`;
    const facture = {
      id: uid("inv"), numero: num, accountId: q.accountId, dealId: q.dealId, quoteId: q.id,
      commercialId: q.commercialId,
      dateEmission: new Date().toISOString().slice(0, 10),
      dateEcheance: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      status: "emise", type: "ponctuelle",
      montantHT: totaux.totalHT, montantTVA: totaux.tva, montantTTC: totaux.totalTTC,
      lignes: q.lignes,
    };
    setState(s => ({ ...s, invoices: [...s.invoices, facture] }));
  };

  const exportFEC = () => {
    const lignes = state.invoices.map(f => {
      const acc = state.accounts.find(a => a.id === f.accountId);
      return [f.dateEmission, f.numero, "411000", acc?.raisonSociale || "", (f.montantTTC || 0).toFixed(2), "0.00", f.status].join(";");
    });
    const csv = "Date;Piece;Compte;Libelle;Debit;Credit;Statut\n" + lignes.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `FEC-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Facturation</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Factures, récurrences et export FEC</p>
        </div>
        <Button variant="outline" icon={Download} onClick={exportFEC}>Export CSV FEC</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Total facturé" value={fmtEUR(kpis.total)} icon={Receipt} tone="navy" />
        <Stat label="Émises" value={fmtEUR(kpis.emises)} icon={Send} tone="slate" />
        <Stat label="Payées" value={fmtEUR(kpis.payees)} icon={CheckCircle2} tone="emerald" />
        <Stat label="En retard" value={fmtEUR(kpis.retard)} icon={AlertTriangle} tone="red" />
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {["toutes", "brouillon", "emise", "payee", "retard"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${filter === f ? "bg-[#0B1E3F] text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"}`}>
              {f === "toutes" ? "Toutes" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <Select onChange={e => { if (e.target.value) { transformerDevis(e.target.value); e.target.value = ""; } }}>
          <option value="">+ Transformer un devis signé…</option>
          {state.quotes.filter(q => q.status === "signe" && !state.invoices.some(f => f.quoteId === q.id)).map(q => {
            const a = state.accounts.find(x => x.id === q.accountId);
            return <option key={q.id} value={q.id}>{q.numero} — {a?.raisonSociale}</option>;
          })}
        </Select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left p-3">Numéro</th>
                <th className="text-left p-3">Client</th>
                <th className="text-left p-3">Émission</th>
                <th className="text-left p-3">Échéance</th>
                <th className="text-right p-3">Total TTC</th>
                <th className="text-left p-3">Statut</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {factures.map(f => {
                const acc = state.accounts.find(a => a.id === f.accountId);
                return (
                  <tr key={f.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="p-3 font-mono text-xs">{f.numero}</td>
                    <td className="p-3 font-medium">{acc?.raisonSociale}</td>
                    <td className="p-3">{fmtDate(f.dateEmission)}</td>
                    <td className="p-3">{fmtDate(f.dateEcheance)}</td>
                    <td className="p-3 text-right font-medium">{fmtEUR(f.montantTTC)}</td>
                    <td className="p-3">
                      {f.status === "payee" && <Badge tone="emerald">Payée</Badge>}
                      {f.status === "emise" && <Badge tone="navy">Émise</Badge>}
                      {f.status === "brouillon" && <Badge tone="slate">Brouillon</Badge>}
                      {f.status === "retard" && <Badge tone="red">Retard</Badge>}
                      {f.status === "litige" && <Badge tone="amber">Litige</Badge>}
                    </td>
                    <td className="p-3 text-right">
                      {f.status === "emise" && (
                        <Button size="sm" variant="outline" icon={CheckCircle2} onClick={() => setState(s => ({ ...s, invoices: s.invoices.map(x => x.id === f.id ? { ...x, status: "payee", datePaiement: new Date().toISOString().slice(0, 10) } : x) }))}>Marquer payée</Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {factures.length === 0 && <EmptyState icon={Receipt} title="Aucune facture" message="Transforme un devis signé pour créer une facture." />}
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// ÉQUIPE
// ============================================================================
function TeamView({ state, setState, settings }) {
  const [editing, setEditing] = React.useState(null);
  const today = new Date();
  const moisCourant = today.getMonth(); const anneeCourante = today.getFullYear();

  const stats = state.commerciaux.map(c => {
    const devis = state.quotes.filter(q => q.commercialId === c.id);
    const signes = devis.filter(q => q.status === "signe");
    const caSigne = signes.reduce((s, q) => {
      const t = calcDevisTotaux(q, state.products, settings);
      return s + (q.formuleChoisie === "leasing" ? t.totalLeasing : t.totalHT);
    }, 0);
    const signesMois = signes.filter(q => {
      const d = new Date(q.signedAt || q.createdAt); return d.getMonth() === moisCourant && d.getFullYear() === anneeCourante;
    });
    const caMois = signesMois.reduce((s, q) => {
      const t = calcDevisTotaux(q, state.products, settings);
      return s + (q.formuleChoisie === "leasing" ? t.totalLeasing : t.totalHT);
    }, 0);
    const tauxObj = c.commissionTaux || settings.commissionTaux || {};
    const tauxAchat = typeof tauxObj === "number" ? tauxObj : (tauxObj.achat || 0);
    const commission = caMois * tauxAchat;
    const rdvs = state.events.filter(e => e.commercialId === c.id && e.type === "rdv").length;
    return { ...c, caSigne, caMois, commission, rdvs, nbDevis: devis.length, nbSignes: signes.length, tauxTransfo: devis.length > 0 ? signes.length / devis.length : 0 };
  });

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Équipe commerciale</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Objectifs, commissions et performance</p>
        </div>
        <Button variant="outline" icon={Plus} onClick={() => setEditing({})}>Nouveau commercial</Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {stats.map(c => {
          const progression = c.objectifMensuel > 0 ? c.caMois / c.objectifMensuel : 0;
          return (
            <Card key={c.id} className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm`} style={{ background: c.couleur || "#0B1E3F" }}>
                  {c.prenom?.[0]}{c.nom?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{c.prenom} {c.nom}</div>
                  <div className="text-xs text-slate-500">{c.role === "dirigeant" ? "Dirigeant" : "Commercial"}</div>
                </div>
                <button onClick={() => setEditing(c)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><Edit2 size={14} /></button>
              </div>
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Objectif mensuel</span>
                  <span className="font-medium">{fmtEUR(c.caMois)} / {fmtEUR(c.objectifMensuel || settings.objectifMensuelDefaut)}</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, progression * 100)}%`, background: progression >= 1 ? "#10b981" : progression >= 0.7 ? "#C9A961" : "#0B1E3F" }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-slate-500">RDV</div>
                  <div className="font-semibold">{c.rdvs}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-slate-500">Devis</div>
                  <div className="font-semibold">{c.nbDevis}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-slate-500">Transfo</div>
                  <div className="font-semibold">{fmtPct(c.tauxTransfo)}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-slate-500">Commission</div>
                  <div className="font-semibold text-[#C9A961]">{fmtEUR(c.commission)}</div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                Taux commission achat : <span className="font-medium text-slate-700 dark:text-slate-300">{fmtPct((c.commissionTaux && c.commissionTaux.achat) || (settings.commissionTaux && settings.commissionTaux.achat) || 0)}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {editing && <CommercialEditor commercial={editing} onSave={(c) => {
        if (c.id) setState(s => ({ ...s, commerciaux: s.commerciaux.map(x => x.id === c.id ? c : x) }));
        else setState(s => ({ ...s, commerciaux: [...s.commerciaux, { ...c, id: uid("com"), actif: true }] }));
        setEditing(null);
      }} onClose={() => setEditing(null)} settings={settings} />}
    </div>
  );
}

function CommercialEditor({ commercial, onSave, onClose, settings }) {
  const [c, setC] = React.useState({
    prenom: "", nom: "", email: "", telephone: "", role: "commercial",
    objectifMensuel: settings.objectifMensuelDefaut, commissionTaux: settings.commissionTaux || { achat: 0.08, leasing: 0.05, maintenance: 0.10 },
    couleur: "#0B1E3F", ...commercial,
  });
  const couleurs = ["#0B1E3F", "#C9A961", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#14b8a6"];

  return (
    <Modal open onClose={onClose} title={c.id ? "Modifier le commercial" : "Nouveau commercial"} size="md"
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="primary" onClick={() => onSave(c)}>Enregistrer</Button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Prénom" value={c.prenom} onChange={e => setC({ ...c, prenom: e.target.value })} />
          <Input label="Nom" value={c.nom} onChange={e => setC({ ...c, nom: e.target.value })} />
        </div>
        <Input label="Email" type="email" value={c.email} onChange={e => setC({ ...c, email: e.target.value })} />
        <Input label="Téléphone" value={c.telephone} onChange={e => setC({ ...c, telephone: e.target.value })} />
        <Select label="Rôle" value={c.role} onChange={e => setC({ ...c, role: e.target.value })}>
          <option value="commercial">Commercial</option>
          <option value="dirigeant">Dirigeant</option>
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input type="number" label="Objectif mensuel HT" value={c.objectifMensuel} onChange={e => setC({ ...c, objectifMensuel: +e.target.value })} />
          <Input type="number" step="0.01" label="Commission achat" value={(c.commissionTaux && c.commissionTaux.achat) ?? 0.08} onChange={e => setC({ ...c, commissionTaux: { ...(c.commissionTaux || {}), achat: +e.target.value } })} hint="0.08 = 8%" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input type="number" step="0.01" label="Commission leasing" value={(c.commissionTaux && c.commissionTaux.leasing) ?? 0.05} onChange={e => setC({ ...c, commissionTaux: { ...(c.commissionTaux || {}), leasing: +e.target.value } })} />
          <Input type="number" step="0.01" label="Commission maintenance" value={(c.commissionTaux && c.commissionTaux.maintenance) ?? 0.10} onChange={e => setC({ ...c, commissionTaux: { ...(c.commissionTaux || {}), maintenance: +e.target.value } })} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Couleur</label>
          <div className="flex gap-2 flex-wrap">
            {couleurs.map(col => (
              <button key={col} onClick={() => setC({ ...c, couleur: col })} className={`w-8 h-8 rounded-full border-2 transition ${c.couleur === col ? "border-slate-900 dark:border-white scale-110" : "border-transparent"}`} style={{ background: col }} />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// AGENDA
// ============================================================================
function CalendarView({ state, setState }) {
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [editing, setEditing] = React.useState(null);
  const today = new Date();
  const [viewMonth, setViewMonth] = React.useState(today.getMonth());
  const [viewYear, setViewYear] = React.useState(today.getFullYear());

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startWeekDay = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const eventsByDate = React.useMemo(() => {
    const map = {};
    state.events.forEach(e => {
      const key = (e.date || e.dateDebut || "").slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [state.events]);

  const selectedEvents = (eventsByDate[selectedDate] || []).sort((a, b) => (a.date || a.dateDebut || "").localeCompare(b.date || b.dateDebut || ""));

  const moisLabel = firstDay.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const cells = [];
  for (let i = 0; i < startWeekDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Agenda</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">RDV, interventions et rappels</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setEditing({ dateDebut: `${selectedDate}T09:00`, type: "rdv" })}>Nouvel événement</Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold text-slate-900 dark:text-slate-100 capitalize">{moisLabel}</div>
            <div className="flex gap-1">
              <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } else setViewMonth(viewMonth - 1); }} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronLeft size={16} /></button>
              <button onClick={() => { setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); }} className="px-2 text-xs text-slate-500 hover:text-slate-900">Aujourd'hui</button>
              <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } else setViewMonth(viewMonth + 1); }} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-xs text-slate-500 mb-1">
            {["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"].map(d => <div key={d} className="text-center p-1 font-medium">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const evs = eventsByDate[dateStr] || [];
              const isToday = dateStr === today.toISOString().slice(0, 10);
              const isSelected = dateStr === selectedDate;
              return (
                <button key={i} onClick={() => setSelectedDate(dateStr)} className={`aspect-square rounded-lg p-1 text-xs transition relative ${isSelected ? "bg-[#0B1E3F] text-white" : isToday ? "bg-[#C9A961]/20 text-[#0B1E3F] dark:text-[#C9A961]" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                  <div className="font-medium">{d}</div>
                  {evs.length > 0 && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {evs.slice(0, 3).map((_, idx) => <div key={idx} className={`w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-[#C9A961]"}`} />)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-slate-900 dark:text-slate-100">{fmtDate(selectedDate)}</div>
            <Badge tone="slate">{selectedEvents.length} événement{selectedEvents.length > 1 ? "s" : ""}</Badge>
          </div>
          <div className="space-y-2">
            {selectedEvents.map(e => {
              const com = state.commerciaux.find(c => c.id === e.commercialId);
              const acc = state.accounts.find(a => a.id === e.accountId);
              const heure = (e.date || e.dateDebut || "").slice(11, 16);
              return (
                <div key={e.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setEditing(e)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-500">{heure}</div>
                      <div className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">{e.title || e.titre}</div>
                      {acc && <div className="text-xs text-slate-500 truncate">{acc.raisonSociale}</div>}
                    </div>
                    {com && <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: com.couleur }}>{com.prenom?.[0]}</div>}
                  </div>
                </div>
              );
            })}
            {selectedEvents.length === 0 && <div className="text-sm text-slate-500 text-center py-8">Aucun événement prévu</div>}
          </div>
        </Card>
      </div>

      {editing && <EventEditor event={editing} state={state} onSave={(ev) => {
        if (ev.id) setState(s => ({ ...s, events: s.events.map(x => x.id === ev.id ? ev : x) }));
        else setState(s => ({ ...s, events: [...s.events, { ...ev, id: uid("ev") }] }));
        setEditing(null);
      }} onDelete={(id) => { setState(s => ({ ...s, events: s.events.filter(x => x.id !== id) })); setEditing(null); }} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EventEditor({ event, state, onSave, onDelete, onClose }) {
  const [e, setE] = React.useState({ title: "", type: "rdv", date: "", duree: 60, lieu: "", notes: "", ...event, title: event?.title || event?.titre || "", date: event?.date || event?.dateDebut || "", duree: event?.duree || event?.dureeMin || 60 });
  return (
    <Modal open onClose={onClose} title={e.id ? "Modifier l'événement" : "Nouvel événement"} size="md"
      footer={<div className="flex items-center justify-between w-full">
        {e.id ? <Button variant="danger" icon={Trash2} onClick={() => onDelete(e.id)}>Supprimer</Button> : <div />}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={() => onSave(e)}>Enregistrer</Button>
        </div>
      </div>}>
      <div className="space-y-3">
        <Input label="Titre" value={e.title} onChange={ev => setE({ ...e, title: ev.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Type" value={e.type} onChange={ev => setE({ ...e, type: ev.target.value })}>
            <option value="rdv">Rendez-vous</option>
            <option value="appel">Appel</option>
            <option value="visite">Visite</option>
            <option value="intervention">Intervention</option>
            <option value="rappel">Rappel</option>
            <option value="tache">Tâche</option>
          </Select>
          <Input type="number" label="Durée (min)" value={e.duree} onChange={ev => setE({ ...e, duree: +ev.target.value })} />
        </div>
        <Input type="datetime-local" label="Date & heure" value={e.date} onChange={ev => setE({ ...e, date: ev.target.value })} />
        <Select label="Commercial" value={e.commercialId || ""} onChange={ev => setE({ ...e, commercialId: ev.target.value })}>
          <option value="">—</option>
          {state.commerciaux.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
        </Select>
        <Select label="Compte" value={e.accountId || ""} onChange={ev => setE({ ...e, accountId: ev.target.value })}>
          <option value="">—</option>
          {state.accounts.map(a => <option key={a.id} value={a.id}>{a.raisonSociale}</option>)}
        </Select>
        <Input label="Lieu" value={e.lieu} onChange={ev => setE({ ...e, lieu: ev.target.value })} />
        <Textarea label="Notes" rows={2} value={e.notes} onChange={ev => setE({ ...e, notes: ev.target.value })} />
      </div>
    </Modal>
  );
}

// ============================================================================
// SAV
// ============================================================================
function SavView({ state, setState }) {
  const [filter, setFilter] = React.useState("tous");
  const [editing, setEditing] = React.useState(null);
  const tickets = state.sav.filter(t => filter === "tous" || t.status === filter);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">SAV</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Tickets d'intervention et suivi</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setEditing({ status: "ouvert", priorite: "normale" })}>Nouveau ticket</Button>
      </div>

      <Card className="p-4 bg-gradient-to-br from-[#0B1E3F] to-[#142A52] text-white border-0">
        <div className="flex items-start gap-3">
          <Headphones size={20} className="text-[#C9A961] mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-white">Contact SAV Foloneo</h3>
            <p className="text-xs text-slate-300 mb-2">Les clients peuvent aussi remonter leurs demandes directement</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2"><Mail size={14} className="text-[#C9A961]" /><span>sav@foloneo.fr</span></div>
              <div className="flex items-center gap-2"><Phone size={14} className="text-[#C9A961]" /><span>04 XX XX XX XX</span></div>
              <div className="flex items-center gap-2"><Globe size={14} className="text-[#C9A961]" /><span>foloneo.fr / section SAV</span></div>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex gap-2 flex-wrap">
        {["tous", "ouvert", "en_cours", "resolu"].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${filter === f ? "bg-[#0B1E3F] text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"}`}>
            {f === "tous" ? "Tous" : f === "ouvert" ? "Ouverts" : f === "en_cours" ? "En cours" : "Résolus"}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {tickets.map(t => {
          const acc = state.accounts.find(a => a.id === t.accountId);
          return (
            <Card key={t.id} className="p-4 cursor-pointer" onClick={() => setEditing(t)}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {t.priorite === "urgente" && <Badge tone="red">Urgent</Badge>}
                    {t.priorite === "haute" && <Badge tone="amber">Haute</Badge>}
                    {t.status === "ouvert" && <Badge tone="navy">Ouvert</Badge>}
                    {t.status === "en_cours" && <Badge tone="amber">En cours</Badge>}
                    {t.status === "resolu" && <Badge tone="emerald">Résolu</Badge>}
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{t.objet || t.titre}</div>
                  <div className="text-xs text-slate-500 truncate">{acc?.raisonSociale}</div>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{t.description}</p>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Ouvert {fmtDate(t.createdAt)}</span>
                {t.status !== "resolu" && (
                  <button onClick={(e) => { e.stopPropagation(); setState(s => ({ ...s, sav: s.sav.map(x => x.id === t.id ? { ...x, status: "resolu", resolvedAt: new Date().toISOString() } : x) })); }} className="text-emerald-600 font-medium hover:underline">Marquer résolu</button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      {tickets.length === 0 && <EmptyState icon={Headphones} title="Aucun ticket" message="Pas de demande SAV en cours." />}

      {editing && <SavEditor ticket={editing} state={state} onSave={(t) => {
        if (t.id) setState(s => ({ ...s, sav: s.sav.map(x => x.id === t.id ? t : x) }));
        else setState(s => ({ ...s, sav: [...s.sav, { ...t, id: uid("sav"), createdAt: new Date().toISOString() }] }));
        setEditing(null);
      }} onClose={() => setEditing(null)} />}
    </div>
  );
}

function SavEditor({ ticket, state, onSave, onClose }) {
  const [t, setT] = React.useState({ objet: "", description: "", status: "ouvert", priorite: "normale", ...ticket, objet: ticket?.objet || ticket?.titre || "" });
  return (
    <Modal open onClose={onClose} title={t.id ? "Ticket SAV" : "Nouveau ticket"} size="md"
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="primary" onClick={() => onSave(t)}>Enregistrer</Button></>}>
      <div className="space-y-3">
        <Input label="Objet" value={t.objet} onChange={e => setT({ ...t, objet: e.target.value })} />
        <Textarea label="Description" rows={4} value={t.description} onChange={e => setT({ ...t, description: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Priorité" value={t.priorite} onChange={e => setT({ ...t, priorite: e.target.value })}>
            <option value="basse">Basse</option>
            <option value="normale">Normale</option>
            <option value="haute">Haute</option>
            <option value="urgente">Urgente</option>
          </Select>
          <Select label="Statut" value={t.status} onChange={e => setT({ ...t, status: e.target.value })}>
            <option value="ouvert">Ouvert</option>
            <option value="en_cours">En cours</option>
            <option value="resolu">Résolu</option>
          </Select>
        </div>
        <Select label="Compte" value={t.accountId || ""} onChange={e => setT({ ...t, accountId: e.target.value })}>
          <option value="">—</option>
          {state.accounts.map(a => <option key={a.id} value={a.id}>{a.raisonSociale}</option>)}
        </Select>
      </div>
    </Modal>
  );
}

// ============================================================================
// PARAMÈTRES
// ============================================================================
function SettingsView({ state, setState, settings, setSettings }) {
  const [local, setLocal] = React.useState(settings);
  const [message, setMessage] = React.useState(null);

  const save = () => {
    setSettings(local);
    setMessage({ type: "success", text: "Paramètres enregistrés" });
    setTimeout(() => setMessage(null), 2000);
  };

  const exportJSON = () => {
    const data = JSON.stringify({ state, settings: local, exportedAt: new Date().toISOString(), version: "1.0" }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `foloneo-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
    setMessage({ type: "success", text: "Export JSON téléchargé" });
    setTimeout(() => setMessage(null), 2000);
  };

  const importJSON = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.state && data.settings) {
          if (!confirm("Remplacer toutes les données actuelles par ce backup ?")) return;
          setState(data.state); setSettings(data.settings); setLocal(data.settings);
          setMessage({ type: "success", text: "Import réussi" });
        } else {
          setMessage({ type: "error", text: "Fichier invalide" });
        }
      } catch (err) {
        setMessage({ type: "error", text: "Erreur de lecture du fichier" });
      }
      setTimeout(() => setMessage(null), 3000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Paramètres</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Coefficients, tarifs et configuration</p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === "success" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"}`}>
          {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {message.text}
        </div>
      )}

      <Card className="p-5">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2"><Building2 size={16} className="text-[#C9A961]" />Société</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <Input label="Raison sociale" value={local.societe?.nom || ""} onChange={e => setLocal({ ...local, societe: { ...local.societe, nom: e.target.value } })} />
          <Input label="SIRET" value={local.societe?.siret || ""} onChange={e => setLocal({ ...local, societe: { ...local.societe, siret: e.target.value } })} />
          <Input label="Adresse" value={local.societe?.adresse || ""} onChange={e => setLocal({ ...local, societe: { ...local.societe, adresse: e.target.value } })} />
          <Input label="Téléphone" value={local.societe?.telephone || ""} onChange={e => setLocal({ ...local, societe: { ...local.societe, telephone: e.target.value } })} />
          <Input label="Email" value={local.societe?.email || ""} onChange={e => setLocal({ ...local, societe: { ...local.societe, email: e.target.value } })} />
          <Input label="Site web" value={local.societe?.siteweb || ""} onChange={e => setLocal({ ...local, societe: { ...local.societe, siteweb: e.target.value } })} />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2"><Calculator size={16} className="text-[#C9A961]" />Coefficients d'achat</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <Input type="number" step="0.01" label="Coef Ajax (× Sylis)" value={local.coefAjax} onChange={e => setLocal({ ...local, coefAjax: +e.target.value })} hint="Défaut : 0.45" />
          <Input type="number" step="0.01" label="Coef Dahua" value={local.coefDahua} onChange={e => setLocal({ ...local, coefDahua: +e.target.value })} hint="Défaut : 0.45" />
          <Input type="number" step="0.01" label="Diviseur Dahua TTC→HT" value={local.dahuaDiv} onChange={e => setLocal({ ...local, dahuaDiv: +e.target.value })} hint="Défaut : 1.20" />
          <Input type="number" step="0.1" label="Coef catégorie par défaut" value={local.coefCategorieDefault} onChange={e => setLocal({ ...local, coefCategorieDefault: +e.target.value })} hint="Prix vente = achat × coef" />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2"><Briefcase size={16} className="text-[#C9A961]" />Main-d'œuvre & déplacement</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <Input type="number" label="Taux horaire MO (HT)" value={local.tauxMO} onChange={e => setLocal({ ...local, tauxMO: +e.target.value })} />
          <Input type="number" label="Frais déplacement forfait" value={local.fraisDeplacement} onChange={e => setLocal({ ...local, fraisDeplacement: +e.target.value })} />
          <Input type="number" step="0.01" label="Taux TVA" value={local.tva} onChange={e => setLocal({ ...local, tva: +e.target.value })} hint="0.20 = 20%" />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2"><Sparkles size={16} className="text-[#C9A961]" />Leasing — Prestation Globale Évolutive</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <Input type="number" step="0.0001" label="Coef mensuel 36 mois" value={local.coefMensuel?.[36]} onChange={e => setLocal({ ...local, coefMensuel: { ...local.coefMensuel, 36: +e.target.value } })} />
          <Input type="number" step="0.0001" label="Coef mensuel 48 mois" value={local.coefMensuel?.[48]} onChange={e => setLocal({ ...local, coefMensuel: { ...local.coefMensuel, 48: +e.target.value } })} />
          <Input type="number" step="0.0001" label="Coef mensuel 60 mois" value={local.coefMensuel?.[60]} onChange={e => setLocal({ ...local, coefMensuel: { ...local.coefMensuel, 60: +e.target.value } })} />
          <Input type="number" step="0.01" label="Provision évolutions" value={local.provisionEvolutions} onChange={e => setLocal({ ...local, provisionEvolutions: +e.target.value })} hint="8% = 0.08" />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2"><Users size={16} className="text-[#C9A961]" />Équipe — valeurs par défaut</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <Input type="number" label="Objectif mensuel par défaut" value={local.objectifMensuelDefaut} onChange={e => setLocal({ ...local, objectifMensuelDefaut: +e.target.value })} />
          <Input type="number" step="0.01" label="Commission achat" value={(local.commissionTaux && local.commissionTaux.achat) ?? 0.08} onChange={e => setLocal({ ...local, commissionTaux: { ...(local.commissionTaux || {}), achat: +e.target.value } })} hint="0.08 = 8%" />
        </div>
        <div className="grid md:grid-cols-2 gap-3 mt-2">
          <Input type="number" step="0.01" label="Commission leasing" value={(local.commissionTaux && local.commissionTaux.leasing) ?? 0.05} onChange={e => setLocal({ ...local, commissionTaux: { ...(local.commissionTaux || {}), leasing: +e.target.value } })} />
          <Input type="number" step="0.01" label="Commission maintenance" value={(local.commissionTaux && local.commissionTaux.maintenance) ?? 0.10} onChange={e => setLocal({ ...local, commissionTaux: { ...(local.commissionTaux || {}), maintenance: +e.target.value } })} />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2"><Database size={16} className="text-[#C9A961]" />Sauvegarde & import</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" icon={Download} onClick={exportJSON}>Exporter tout (JSON)</Button>
          <label className="inline-flex">
            <input type="file" accept=".json" onChange={importJSON} className="hidden" />
            <span className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-2"><Upload size={16} />Importer</span>
          </label>
        </div>
        <p className="text-xs text-slate-500 mt-2">L'import remplace intégralement les données actuelles. Fais un export avant pour garder une copie.</p>
      </Card>

      <div className="sticky bottom-0 bg-[#F7F8FA] dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-3 -mx-4 lg:-mx-6 px-4 lg:px-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setLocal(settings)}>Annuler</Button>
        <Button variant="primary" icon={Save} onClick={save}>Enregistrer les paramètres</Button>
      </div>
    </div>
  );
}

// ============================================================================
// MODALS DE CRÉATION/ÉDITION COMPTE / CONTACT / DEAL
// ============================================================================
function AccountEditor({ account, state, onSave, onClose }) {
  const [a, setA] = React.useState({
    raisonSociale: "", secteur: "PME", source: "recommandation", adresse: "", codePostal: "", ville: "",
    telephone: "", email: "", siret: "", latitude: 43.12, longitude: 5.93, notes: "",
    ...account,
  });
  return (
    <Modal open onClose={onClose} title={a.id ? "Modifier le compte" : "Nouveau compte"} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="primary" onClick={() => onSave(a)}>Enregistrer</Button></>}>
      <div className="space-y-3">
        <Input label="Raison sociale" value={a.raisonSociale} onChange={e => setA({ ...a, raisonSociale: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Secteur" value={a.secteur} onChange={e => setA({ ...a, secteur: e.target.value })}>{SECTEURS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</Select>
          <Select label="Source" value={a.source} onChange={e => setA({ ...a, source: e.target.value })}>{SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</Select>
        </div>
        <Input label="Adresse" value={a.adresse} onChange={e => setA({ ...a, adresse: e.target.value })} />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Code postal" value={a.codePostal} onChange={e => setA({ ...a, codePostal: e.target.value })} />
          <Input label="Ville" value={a.ville} onChange={e => setA({ ...a, ville: e.target.value })} className="col-span-2" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Téléphone" value={a.telephone} onChange={e => setA({ ...a, telephone: e.target.value })} />
          <Input label="Email" value={a.email} onChange={e => setA({ ...a, email: e.target.value })} />
        </div>
        <Input label="SIRET" value={a.siret} onChange={e => setA({ ...a, siret: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input type="number" step="0.0001" label="Latitude" value={a.latitude} onChange={e => setA({ ...a, latitude: +e.target.value })} />
          <Input type="number" step="0.0001" label="Longitude" value={a.longitude} onChange={e => setA({ ...a, longitude: +e.target.value })} />
        </div>
        <Textarea label="Notes" rows={2} value={a.notes} onChange={e => setA({ ...a, notes: e.target.value })} />
      </div>
    </Modal>
  );
}

function ContactEditor({ contact, state, onSave, onClose }) {
  const [c, setC] = React.useState({ prenom: "", nom: "", fonction: "", email: "", telephone: "", role: "decideur", ...contact });
  return (
    <Modal open onClose={onClose} title={c.id ? "Modifier le contact" : "Nouveau contact"} size="md"
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="primary" onClick={() => onSave(c)}>Enregistrer</Button></>}>
      <div className="space-y-3">
        <Select label="Compte" value={c.accountId || ""} onChange={e => setC({ ...c, accountId: e.target.value })}>
          <option value="">—</option>
          {state.accounts.map(a => <option key={a.id} value={a.id}>{a.raisonSociale}</option>)}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Prénom" value={c.prenom} onChange={e => setC({ ...c, prenom: e.target.value })} />
          <Input label="Nom" value={c.nom} onChange={e => setC({ ...c, nom: e.target.value })} />
        </div>
        <Input label="Fonction" value={c.fonction} onChange={e => setC({ ...c, fonction: e.target.value })} />
        <Select label="Rôle" value={c.role} onChange={e => setC({ ...c, role: e.target.value })}>
          <option value="decideur">Décideur</option>
          <option value="technique">Technique</option>
          <option value="compta">Comptabilité</option>
          <option value="autre">Autre</option>
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Email" value={c.email} onChange={e => setC({ ...c, email: e.target.value })} />
          <Input label="Téléphone" value={c.telephone} onChange={e => setC({ ...c, telephone: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}

function DealEditor({ deal, state, onSave, onClose }) {
  const [d, setD] = React.useState({
    titre: "", etape: "prospection", probabilite: 20, valeur: 0, formulePreferee: "achat",
    dateCible: "", ...deal,
  });
  const etape = ETAPES.find(e => e.id === d.etape);
  return (
    <Modal open onClose={onClose} title={d.id ? "Modifier l'affaire" : "Nouvelle affaire"} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="primary" onClick={() => onSave(d)}>Enregistrer</Button></>}>
      <div className="space-y-3">
        <Input label="Titre de l'affaire" value={d.titre} onChange={e => setD({ ...d, titre: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Compte" value={d.accountId || ""} onChange={e => setD({ ...d, accountId: e.target.value })}>
            <option value="">—</option>
            {state.accounts.map(a => <option key={a.id} value={a.id}>{a.raisonSociale}</option>)}
          </Select>
          <Select label="Contact principal" value={d.contactId || ""} onChange={e => setD({ ...d, contactId: e.target.value })}>
            <option value="">—</option>
            {state.contacts.filter(c => c.accountId === d.accountId).map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
          </Select>
        </div>
        <Select label="Commercial" value={d.commercialId || ""} onChange={e => setD({ ...d, commercialId: e.target.value })}>
          <option value="">—</option>
          {state.commerciaux.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
        </Select>
        <div className="grid grid-cols-3 gap-3">
          <Select label="Étape" value={d.etape} onChange={e => { const et = ETAPES.find(x => x.id === e.target.value); setD({ ...d, etape: e.target.value, probabilite: et?.proba || d.probabilite }); }}>
            {ETAPES.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
          </Select>
          <Input type="number" label="Probabilité (%)" value={d.probabilite} onChange={e => setD({ ...d, probabilite: +e.target.value })} />
          <Input type="number" label="Valeur HT" value={d.valeur} onChange={e => setD({ ...d, valeur: +e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Formule préférée" value={d.formulePreferee} onChange={e => setD({ ...d, formulePreferee: e.target.value })}>
            <option value="achat">Achat sec</option>
            <option value="achat_maintenance">Achat + Maintenance</option>
            <option value="leasing">Prestation Globale Évolutive</option>
          </Select>
          <Input type="date" label="Date cible closing" value={d.dateCible || ""} onChange={e => setD({ ...d, dateCible: e.target.value })} />
        </div>
        <Textarea label="Notes" rows={2} value={d.notes || ""} onChange={e => setD({ ...d, notes: e.target.value })} />
      </div>
    </Modal>
  );
}

// ============================================================================
// PRINT TEMPLATES (PDF via window.print)
// ============================================================================
function PrintView({ quote, state, settings, mode, onClose }) {
  const totaux = calcDevisTotaux(quote, state.products, settings);
  const account = state.accounts.find(a => a.id === quote.accountId);
  const contact = state.contacts.find(c => c.id === quote.contactId);
  const commercial = state.commerciaux.find(c => c.id === quote.commercialId);

  React.useEffect(() => {
    const original = document.title;
    document.title = `${quote.numero}-${mode}`;
    const timer = setTimeout(() => window.print(), 400);
    return () => { document.title = original; clearTimeout(timer); };
  }, []);

  const styles = `@media print {
    body * { visibility: hidden !important; }
    .print-area, .print-area * { visibility: visible !important; }
    .print-area { position: absolute; left: 0; top: 0; width: 210mm; }
    .print-page { page-break-after: always; }
    .no-print { display: none !important; }
  } .print-area { background: white; color: #0B1E3F; font-family: system-ui, -apple-system, sans-serif; }`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 overflow-auto">
      <style>{styles}</style>
      <div className="no-print sticky top-0 bg-[#0B1E3F] text-white p-3 flex items-center justify-between z-10">
        <div className="font-semibold">Aperçu PDF — {mode === "leasing" ? "Prestation Globale" : "Achat"}</div>
        <div className="flex gap-2">
          <Button variant="gold" icon={Printer} onClick={() => window.print()}>Imprimer / PDF</Button>
          <Button variant="outline" onClick={onClose} className="!text-white !border-white/30 hover:!bg-white/10">Fermer</Button>
        </div>
      </div>
      <div className="print-area p-12 max-w-[210mm] mx-auto my-4 bg-white shadow-xl" style={{ minHeight: "297mm" }}>
        <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-[#C9A961]">
          <div>
            <div className="text-2xl font-bold text-[#0B1E3F] tracking-tight">FOLONEO</div>
            <div className="text-xs text-slate-600 mt-1">{settings.societe?.adresse}</div>
            <div className="text-xs text-slate-600">{settings.societe?.telephone} • {settings.societe?.email}</div>
            <div className="text-xs text-slate-600">SIRET : {settings.societe?.siret}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider">{mode === "leasing" ? "Proposition Prestation Globale" : "Proposition Commerciale"}</div>
            <div className="text-lg font-bold text-[#0B1E3F]">{quote.numero}</div>
            <div className="text-xs text-slate-600">Date : {fmtDate(quote.createdAt)}</div>
            <div className="text-xs text-slate-600">Validité : 30 jours</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <div className="text-[10px] uppercase text-slate-500 tracking-wider mb-1">Émis par</div>
            <div className="text-sm font-semibold text-[#0B1E3F]">{commercial?.prenom} {commercial?.nom}</div>
            <div className="text-xs text-slate-600">{commercial?.email}</div>
            <div className="text-xs text-slate-600">{commercial?.telephone}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-500 tracking-wider mb-1">Destinataire</div>
            <div className="text-sm font-semibold text-[#0B1E3F]">{account?.raisonSociale}</div>
            {contact && <div className="text-xs text-slate-600">À l'attention de {contact.prenom} {contact.nom}</div>}
            <div className="text-xs text-slate-600">{account?.adresse}</div>
            <div className="text-xs text-slate-600">{account?.codePostal} {account?.ville}</div>
          </div>
        </div>

        {mode === "achat" && (
          <>
            <div className="mb-6">
              <div className="text-sm font-bold text-[#0B1E3F] mb-2 pb-1 border-b border-slate-200">DÉTAIL DE LA PROPOSITION</div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#0B1E3F] text-white">
                    <th className="text-left p-2">Désignation</th>
                    <th className="text-right p-2 w-12">Qté</th>
                    <th className="text-right p-2 w-24">PU HT</th>
                    <th className="text-right p-2 w-24">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.lignes?.map((l, i) => {
                    const p = state.products.find(x => x.id === l.productId);
                    return (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="p-2">{p?.libelleCommercial || l.designation}</td>
                        <td className="p-2 text-right">{l.quantite}</td>
                        <td className="p-2 text-right">{fmtEUR(l.prixUnitaire || p?.prixVenteHT || 0)}</td>
                        <td className="p-2 text-right font-medium">{fmtEUR((l.prixUnitaire || p?.prixVenteHT || 0) * l.quantite)}</td>
                      </tr>
                    );
                  })}
                  {quote.heuresMO > 0 && (
                    <tr className="border-b border-slate-100">
                      <td className="p-2">Main-d'œuvre installation</td>
                      <td className="p-2 text-right">{quote.heuresMO} h</td>
                      <td className="p-2 text-right">{fmtEUR(quote.tauxMO || settings.tauxMO)}</td>
                      <td className="p-2 text-right font-medium">{fmtEUR(quote.heuresMO * (quote.tauxMO || settings.tauxMO))}</td>
                    </tr>
                  )}
                  {quote.fraisDeplacement > 0 && (
                    <tr className="border-b border-slate-100">
                      <td className="p-2">Frais de déplacement</td>
                      <td className="p-2 text-right">1</td>
                      <td className="p-2 text-right">{fmtEUR(quote.fraisDeplacement)}</td>
                      <td className="p-2 text-right font-medium">{fmtEUR(quote.fraisDeplacement)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mb-6">
              <div className="w-64 text-sm">
                <div className="flex justify-between py-1"><span className="text-slate-600">Total HT</span><span className="font-medium">{fmtEUR(totaux.totalHT)}</span></div>
                <div className="flex justify-between py-1"><span className="text-slate-600">TVA {Math.round(settings.tva * 100)}%</span><span className="font-medium">{fmtEUR(totaux.tva)}</span></div>
                <div className="flex justify-between py-2 border-t-2 border-[#0B1E3F] text-base font-bold text-[#0B1E3F]"><span>Total TTC</span><span>{fmtEUR(totaux.totalTTC)}</span></div>
                {quote.formuleChoisie === "achat_maintenance" && (
                  <div className="flex justify-between py-1 pt-3 text-xs"><span className="text-slate-600">+ Maintenance {totaux.niveauAchat.label}</span><span className="font-medium">{fmtEUR(totaux.maintenanceAnnuelle)}/an</span></div>
                )}
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-200 text-[10px] text-slate-600 leading-relaxed">
              <div className="font-bold text-[#0B1E3F] mb-2">CONDITIONS GÉNÉRALES DE VENTE</div>
              <p>Acompte de 30% à la commande. Solde à la mise en service. Garantie constructeur 2 ans minimum sur les équipements. Installation réalisée par nos techniciens certifiés. Matériel NFA2P certifié. Toute intervention supplémentaire hors périmètre sera facturée au taux horaire en vigueur. Le client s'engage à fournir un accès libre aux zones d'installation. La présente proposition est valable 30 jours à compter de sa date d'émission.</p>
            </div>
          </>
        )}

        {mode === "leasing" && (
          <>
            <div className="mb-8 p-6 rounded-xl bg-gradient-to-br from-[#0B1E3F] to-[#142A52] text-white">
              <div className="text-xs uppercase tracking-wider text-[#C9A961] mb-2">Prestation de Service Global Évolutive</div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs text-slate-300">Votre investissement</div>
                  <div className="text-4xl font-bold text-[#C9A961]">{fmtEUR(totaux.mensualiteTotale)}<span className="text-lg font-normal text-slate-300"> /mois HT</span></div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-300">Engagement</div>
                  <div className="text-2xl font-bold">{totaux.duree} mois</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 text-xs text-slate-300">Solution tout-inclus sans investissement initial — matériel, installation, maintenance et évolutions comprises</div>
            </div>
            <div className="mb-6">
              <div className="text-sm font-bold text-[#0B1E3F] mb-3 pb-1 border-b border-slate-200">COMPOSITION DE VOTRE SOLUTION</div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left p-2">Désignation</th>
                    <th className="text-right p-2 w-20">Quantité</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.lignes?.map((l, i) => {
                    const p = state.products.find(x => x.id === l.productId);
                    return (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="p-2">{p?.libelleCommercial || l.designation}</td>
                        <td className="p-2 text-right">{l.quantite}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-[10px] text-slate-500 italic mt-2">Les équipements sont sélectionnés par nos experts selon le niveau de performance requis par votre cahier des charges.</p>
            </div>
            <div className="mb-6">
              <div className="text-sm font-bold text-[#0B1E3F] mb-3 pb-1 border-b border-slate-200">SERVICES INCLUS</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {["Matériel haut de gamme", "Installation par techniciens certifiés", "Paramétrage & mise en service", "Formation utilisateurs", "Maintenance préventive annuelle", "Télémaintenance & supervision", "Remplacement matériel défectueux", "Évolutions du système incluses", "Mises à jour firmware", "Support technique prioritaire"].map((s, i) => (
                  <div key={i} className="flex items-start gap-2"><span className="text-[#C9A961] mt-0.5">✓</span><span>{s}</span></div>
                ))}
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-200 text-[10px] text-slate-600 leading-relaxed">
              <div className="font-bold text-[#0B1E3F] mb-2">ENGAGEMENT & CONDITIONS</div>
              <p>Contrat d'engagement de {totaux.duree} mois, mensualité fixe {fmtEUR(totaux.mensualiteTotale)} HT. Sans apport initial. Maintenance préventive et curative incluses, pièces et main-d'œuvre. Évolutions du système incluses dans la limite de 15% de la valeur matériel par an. À l'issue de l'engagement, possibilité de renouvellement avec matériel de dernière génération. Télésurveillance optionnelle via notre partenaire agréé. Proposition établie le {fmtDate(quote.createdAt)}, valable 30 jours.</p>
            </div>
          </>
        )}

        <div className="mt-auto pt-12 flex justify-between items-end text-xs">
          <div>
            <div className="text-slate-500 mb-8">Bon pour accord,</div>
            <div className="border-t border-slate-300 w-48 pt-1 text-slate-600">Date et signature</div>
          </div>
          <div className="text-right text-slate-400">FOLONEO — Sécurité électronique — Toulon, Var</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMMAND PALETTE
// ============================================================================
function CommandPalette({ open, onClose, onNavigate, onNewQuote }) {
  const [search, setSearch] = React.useState("");
  const items = [
    { id: "new_quote", label: "Nouveau devis", icon: FileText, shortcut: "N", action: () => { onNewQuote(); onClose(); } },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, action: () => { onNavigate("dashboard"); onClose(); } },
    { id: "pipeline", label: "Pipeline", icon: Target, action: () => { onNavigate("pipeline"); onClose(); } },
    { id: "accounts", label: "Comptes", icon: Building2, action: () => { onNavigate("accounts"); onClose(); } },
    { id: "contacts", label: "Contacts", icon: Users, action: () => { onNavigate("contacts"); onClose(); } },
    { id: "quotes", label: "Devis", icon: FileText, action: () => { onNavigate("quotes"); onClose(); } },
    { id: "catalog", label: "Catalogue", icon: Package, action: () => { onNavigate("catalog"); onClose(); } },
    { id: "maintenance", label: "Maintenance", icon: ShieldCheck, action: () => { onNavigate("maintenance"); onClose(); } },
    { id: "invoices", label: "Facturation", icon: Receipt, action: () => { onNavigate("invoices"); onClose(); } },
    { id: "team", label: "Équipe", icon: Users, action: () => { onNavigate("team"); onClose(); } },
    { id: "calendar", label: "Agenda", icon: Calendar, action: () => { onNavigate("calendar"); onClose(); } },
    { id: "sav", label: "SAV", icon: Headphones, action: () => { onNavigate("sav"); onClose(); } },
    { id: "settings", label: "Paramètres", icon: Settings, action: () => { onNavigate("settings"); onClose(); } },
  ];
  const filtered = items.filter(i => !search || i.label.toLowerCase().includes(search.toLowerCase()));

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-20 px-4" onClick={onClose}>
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 p-3 border-b border-slate-200 dark:border-slate-800">
          <Search size={18} className="text-slate-400" />
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une action ou une page…" className="flex-1 bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400" />
          <kbd className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.map(i => (
            <button key={i.id} onClick={i.action} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left">
              <i.icon size={16} className="text-slate-500" />
              <span className="flex-1 text-sm text-slate-900 dark:text-slate-100">{i.label}</span>
              {i.shortcut && <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{i.shortcut}</kbd>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// APP ROOT
// ============================================================================
const NAV_TITLES = {
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

const VIEWS_WITH_FILTERS = new Set(["dashboard", "pipeline", "quotes"]);

export default function FoloneoApp() {
  // Le "state" global combine toutes les données ET les settings (attendu par TopBar / Dashboard / QuoteWizard)
  const [state, setState] = useState(() => ({
    ...INITIAL_STATE,
    settings: { ...DEFAULT_SETTINGS, ...(INITIAL_STATE.settings || {}) },
    contrats: INITIAL_STATE.contracts || INITIAL_STATE.contrats || [],
  }));

  const [view, setView] = useState("dashboard");
  const [viewDetail, setViewDetail] = useState(null); // { type: 'account'|'deal'|'quote', id }
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobile, setSidebarMobile] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [quoteWizard, setQuoteWizard] = useState({ open: false, initial: null });
  const [printQuote, setPrintQuote] = useState(null);
  const [accountEditor, setAccountEditor] = useState(null);
  const [contactEditor, setContactEditor] = useState(null);
  const [dealEditor, setDealEditor] = useState(null);
  const [filterCommercial, setFilterCommercial] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("month");

  // Helper: merge partial settings updates
  const updateSettings = useCallback((patch) => {
    setState(s => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  // Helper: update setter for the sub-state sections used by legacy views
  // setState peut recevoir soit un objet complet (remplacement total = import JSON),
  // soit une fonction. Les vues appellent setState(s => ({ ...s, quotes: [...] })) directement.

  // ============ Actions sur les données ============
  const updateDeal = (id, patch) => setState(s => ({ ...s, deals: s.deals.map(d => d.id === id ? { ...d, ...patch } : d) }));
  const createDeal = () => setDealEditor({});
  const editDeal = (d) => setDealEditor(d);
  const saveDeal = (d) => {
    setState(s => d.id && s.deals.some(x => x.id === d.id)
      ? { ...s, deals: s.deals.map(x => x.id === d.id ? d : x) }
      : { ...s, deals: [...s.deals, { ...d, id: d.id || uid("deal"), createdAt: new Date().toISOString() }] }
    );
    setDealEditor(null);
  };

  const saveAccount = (a) => {
    setState(s => a.id && s.accounts.some(x => x.id === a.id)
      ? { ...s, accounts: s.accounts.map(x => x.id === a.id ? a : x) }
      : { ...s, accounts: [...s.accounts, { ...a, id: a.id || uid("acc"), createdAt: new Date().toISOString() }] }
    );
    setAccountEditor(null);
  };
  const saveContact = (c) => {
    setState(s => c.id && s.contacts.some(x => x.id === c.id)
      ? { ...s, contacts: s.contacts.map(x => x.id === c.id ? c : x) }
      : { ...s, contacts: [...s.contacts, { ...c, id: c.id || uid("con") }] }
    );
    setContactEditor(null);
  };

  const openQuoteWizard = (initial) => {
    const initQuote = initial || {
      id: uid("dev"),
      numero: `DEV-${new Date().getFullYear()}-${String(state.quotes.length + 143).padStart(4, "0")}`,
      dealId: null, accountId: "", contactId: "",
      commercialId: state.commerciaux[0]?.id,
      lignes: [], heuresMO: 8,
      tauxMO: state.settings.tauxMO, fraisDeplacement: state.settings.fraisDeplacement,
      modeAchat: { maintenance: "confort" }, modeLeasing: { duree: 48 },
      status: "brouillon", formuleChoisie: null,
      typeSite: "commerce", surface: 100, nbOuvrants: 3, contraintes: "",
      createdAt: new Date().toISOString(),
    };
    setQuoteWizard({ open: true, initial: initQuote });
  };

  const saveQuote = (q) => {
    setState(s => s.quotes.some(x => x.id === q.id)
      ? { ...s, quotes: s.quotes.map(x => x.id === q.id ? q : x) }
      : { ...s, quotes: [...s.quotes, q] }
    );
  };
  const duplicateQuote = (q) => {
    const copy = { ...q, id: uid("dev"), numero: `DEV-${new Date().getFullYear()}-${String(state.quotes.length + 144).padStart(4, "0")}`, status: "brouillon", createdAt: new Date().toISOString() };
    saveQuote(copy);
  };
  const deleteQuote = (id) => {
    if (!confirm("Supprimer ce devis ?")) return;
    setState(s => ({ ...s, quotes: s.quotes.filter(q => q.id !== id) }));
  };
  const changeQuoteStatus = (id, status) => setState(s => ({ ...s, quotes: s.quotes.map(q => q.id === id ? { ...q, status } : q) }));

  const openNewQuoteFromDeal = (deal) => {
    const numero = `DEV-${new Date().getFullYear()}-${String(state.quotes.length + 143).padStart(4, "0")}`;
    const initQuote = {
      id: uid("dev"), numero, dealId: deal.id, accountId: deal.accountId, contactId: deal.contactId,
      commercialId: deal.commercialId || state.commerciaux[0]?.id,
      lignes: [], heuresMO: 8,
      tauxMO: state.settings.tauxMO, fraisDeplacement: state.settings.fraisDeplacement,
      modeAchat: { maintenance: "confort" }, modeLeasing: { duree: 48 },
      status: "brouillon", formuleChoisie: null,
      typeSite: "commerce", surface: 100, nbOuvrants: 3, contraintes: "",
      createdAt: new Date().toISOString(),
    };
    setQuoteWizard({ open: true, initial: initQuote });
  };

  // ============ Export / Import ============
  const importJSON = (data) => {
    if (!data || !data.state) return;
    setState({ ...data.state, settings: { ...DEFAULT_SETTINGS, ...(data.state.settings || {}), ...(data.settings || {}) } });
  };
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ state, exportedAt: new Date().toISOString(), version: "1.0" }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `foloneo-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  // ============ Raccourcis clavier ============
  useEffect(() => {
    const onKey = (e) => {
      const isInput = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCommandOpen(true); }
      if (e.key === "Escape") { setCommandOpen(false); }
      if (!isInput && !commandOpen && !quoteWizard.open && e.key.toLowerCase() === "n") {
        e.preventDefault(); openQuoteWizard();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commandOpen, quoteWizard.open, state.quotes.length]);

  // Dark mode
  useEffect(() => {
    const root = document.documentElement;
    if (state.settings.darkMode) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [state.settings.darkMode]);

  // ============ Rendu des vues ============
  const renderView = () => {
    switch (view) {
      case "dashboard":
        return <Dashboard state={state} setView={setView} setViewDetail={setViewDetail}
          filterCommercial={filterCommercial} periodFilter={periodFilter} />;
      case "pipeline":
        return <Pipeline state={state} updateDeal={updateDeal} setViewDetail={setViewDetail}
          onCreateDeal={createDeal} onNewQuoteFromDeal={openNewQuoteFromDeal} />;
      case "accounts":
        return <AccountsView state={state} onCreate={() => setAccountEditor({})}
          onEdit={(a) => setAccountEditor(a)} setViewDetail={setViewDetail}
          onImport={() => document.getElementById("file-import")?.click()} onExport={exportJSON} />;
      case "contacts":
        return <ContactsView state={state} onCreate={() => setContactEditor({})}
          onEdit={(c) => setContactEditor(c)} setViewDetail={setViewDetail} />;
      case "quotes":
        return <QuotesView state={state} onOpenWizard={openQuoteWizard} setViewDetail={setViewDetail}
          onDuplicate={duplicateQuote} onDelete={deleteQuote} onChangeStatus={changeQuoteStatus}
          filterCommercial={filterCommercial} />;
      case "catalog":
        return <CatalogView state={state} setState={setState} clientMode={state.settings.clientMode} settings={state.settings} />;
      case "maintenance":
        return <MaintenanceView state={state} setState={setState} settings={state.settings} />;
      case "invoices":
        return <InvoicesView state={state} setState={setState} settings={state.settings} />;
      case "team":
        return <TeamView state={state} setState={setState} settings={state.settings} />;
      case "calendar":
        return <CalendarView state={state} setState={setState} />;
      case "sav":
        return <SavView state={state} setState={setState} />;
      case "settings":
        return <SettingsView state={state} setState={setState}
          settings={state.settings} setSettings={(patch) => {
            const next = typeof patch === "function" ? patch(state.settings) : patch;
            updateSettings(next);
          }} />;
      default:
        return <Dashboard state={state} setView={setView} setViewDetail={setViewDetail}
          filterCommercial={filterCommercial} periodFilter={periodFilter} />;
    }
  };

  return (
    <div className={state.settings.darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-[#F7F8FA] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
        {/* Sidebar desktop */}
        <Sidebar current={view} onChange={setView}
          collapsed={sidebarCollapsed} onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
          mobile={false} />
        {/* Sidebar mobile overlay */}
        {sidebarMobile && (
          <>
            <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSidebarMobile(false)} />
            <Sidebar current={view} onChange={setView} mobile onClose={() => setSidebarMobile(false)} />
          </>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <TopBar
            title={NAV_TITLES[view] || ""}
            onMenu={() => setSidebarMobile(true)}
            state={state}
            updateSettings={updateSettings}
            openCommandPalette={() => setCommandOpen(true)}
            filterCommercial={filterCommercial} setFilterCommercial={setFilterCommercial}
            periodFilter={periodFilter} setPeriodFilter={setPeriodFilter}
            showFilters={VIEWS_WITH_FILTERS.has(view)}
          />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{renderView()}</main>
        </div>

        {/* Input caché pour l'import JSON */}
        <input id="file-import" type="file" accept=".json" className="hidden" onChange={(e) => {
          const file = e.target.files?.[0]; if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => { try { importJSON(JSON.parse(ev.target.result)); } catch { alert("Fichier invalide"); } };
          reader.readAsText(file);
          e.target.value = "";
        }} />

        <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)}
          onNavigate={setView} onNewQuote={() => openQuoteWizard()} />

        <QuoteWizard
          open={quoteWizard.open}
          onClose={() => setQuoteWizard({ open: false, initial: null })}
          onSave={(q) => { saveQuote(q); setQuoteWizard({ open: false, initial: null }); }}
          initial={quoteWizard.initial}
          state={state}
          onPrint={(q, mode) => { saveQuote(q); setPrintQuote({ ...q, _printMode: mode }); setQuoteWizard({ open: false, initial: null }); }}
        />

        {printQuote && (
          <PrintView quote={printQuote} state={state} settings={state.settings}
            mode={printQuote._printMode || "achat"} onClose={() => setPrintQuote(null)} />
        )}

        {accountEditor && <AccountEditor account={accountEditor} state={state} onSave={saveAccount} onClose={() => setAccountEditor(null)} />}
        {contactEditor && <ContactEditor contact={contactEditor} state={state} onSave={saveContact} onClose={() => setContactEditor(null)} />}
        {dealEditor && <DealEditor deal={dealEditor} state={state} onSave={saveDeal} onClose={() => setDealEditor(null)} />}
      </div>
    </div>
  );
}
