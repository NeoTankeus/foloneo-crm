import type { AppState } from "@/types";
import { DEFAULT_SETTINGS } from "./constants";
import { daysFromNow } from "./helpers";

// ============================================================================
// DONNÉES DE DÉMO — utilisées si Supabase non configuré
// ============================================================================

export const DEMO_STATE: AppState = {
  settings: DEFAULT_SETTINGS,

  commerciaux: [
    { id: "c1", nom: "Pitaud", prenom: "Stéphane", email: "stephanepitaud@foloneo.fr", telephone: "06 00 00 00 01", role: "dirigeant", objectifMensuel: 40000, commissionTaux: { achat: 0.06, leasing: 0.04, maintenance: 0.08 }, couleur: "#C9A961", actif: true },
    { id: "c2", nom: "Martin", prenom: "Julien", email: "julien.martin@foloneo.fr", telephone: "06 00 00 00 02", role: "commercial", objectifMensuel: 25000, commissionTaux: { achat: 0.08, leasing: 0.05, maintenance: 0.10 }, couleur: "#60A5FA", actif: true },
    { id: "c3", nom: "Laurent", prenom: "Sophie", email: "sophie.laurent@foloneo.fr", telephone: "06 00 00 00 03", role: "commercial", objectifMensuel: 22000, commissionTaux: { achat: 0.08, leasing: 0.05, maintenance: 0.10 }, couleur: "#A78BFA", actif: true },
  ],

  accounts: [
    { id: "a1", raisonSociale: "GODOT & FILS", secteur: "retail", source: "recommandation", adresse: "15 rue des Métaux", codePostal: "83000", ville: "Toulon", telephone: "04 94 00 00 01", email: "contact@godotfils.fr", latitude: 43.1242, longitude: 5.9285, createdAt: daysFromNow(-120) },
    { id: "a2", raisonSociale: "Le Cépage", secteur: "restauration", source: "terrain", adresse: "8 place Puget", codePostal: "83000", ville: "Toulon", telephone: "04 94 00 00 02", email: "gerant@lecepage.fr", latitude: 43.1248, longitude: 5.9301, createdAt: daysFromNow(-90) },
    { id: "a3", raisonSociale: "Boulangerie Brun", secteur: "artisan", source: "bni", adresse: "22 avenue de la République", codePostal: "83500", ville: "La Seyne-sur-Mer", telephone: "04 94 00 00 03", latitude: 43.1024, longitude: 5.8831, createdAt: daysFromNow(-60) },
    { id: "a4", raisonSociale: "Cabinet Moreau", secteur: "architecte", source: "partenaire", adresse: "5 cours Lafayette", codePostal: "83000", ville: "Toulon", telephone: "04 94 00 00 04", email: "contact@cabinet-moreau.fr", latitude: 43.1231, longitude: 5.9295, createdAt: daysFromNow(-45) },
    { id: "a5", raisonSociale: "Villa Dubois", secteur: "residentiel", source: "ancien_client", adresse: "Chemin de la corniche", codePostal: "83110", ville: "Sanary-sur-Mer", telephone: "06 00 00 00 05", latitude: 43.1178, longitude: 5.8003, createdAt: daysFromNow(-30) },
    { id: "a6", raisonSociale: "Pharmacie du Port", secteur: "retail", source: "web", adresse: "2 quai Cronstadt", codePostal: "83000", ville: "Toulon", latitude: 43.1200, longitude: 5.9312, createdAt: daysFromNow(-200) },
    { id: "a7", raisonSociale: "Bâti-Var", secteur: "industriel", source: "terrain", adresse: "ZA La Poulasse", codePostal: "83140", ville: "Six-Fours-les-Plages", telephone: "04 94 00 00 07", email: "direction@bati-var.fr", latitude: 43.0944, longitude: 5.8389, createdAt: daysFromNow(-15) },
  ],

  contacts: [
    { id: "ct1", accountId: "a1", prenom: "Alain", nom: "Godot", fonction: "Gérant", email: "alain.godot@godotfils.fr", telephone: "06 10 00 00 01", role: "decideur" },
    { id: "ct2", accountId: "a2", prenom: "Bernard", nom: "Pascal", fonction: "Gérant", email: "b.pascal@lecepage.fr", telephone: "06 10 00 00 02", role: "decideur" },
    { id: "ct3", accountId: "a3", prenom: "Marie", nom: "Brun", fonction: "Boulangère", email: "m.brun@gmail.com", telephone: "06 10 00 00 03", role: "decideur" },
    { id: "ct4", accountId: "a4", prenom: "Thomas", nom: "Moreau", fonction: "Architecte", email: "t.moreau@cabinet-moreau.fr", telephone: "06 10 00 00 04", role: "decideur" },
    { id: "ct6", accountId: "a6", prenom: "Claire", nom: "Vidal", fonction: "Pharmacienne", email: "c.vidal@pharmaport.fr", telephone: "06 10 00 00 06", role: "decideur" },
    { id: "ct7", accountId: "a7", prenom: "Julien", nom: "Rossi", fonction: "DAF", email: "j.rossi@bati-var.fr", telephone: "06 10 00 00 07", role: "decideur" },
  ],

  products: [
    // Ajax - Alarmes
    { id: "p1", refFabricant: "HUB2PLUS", libelleInterne: "Hub 2 Plus Ajax", libelleCommercial: "Centrale d'alarme connectée 4G/Wi-Fi", marque: "ajax", type: "alarme", prixSylis: 339, prixAchatHT: 152.55, prixVenteHT: 458 },
    { id: "p2", refFabricant: "MOTIONCAM", libelleInterne: "MotionCam Ajax", libelleCommercial: "Détecteur de mouvement avec photo-vérification", marque: "ajax", type: "alarme", prixSylis: 119, prixAchatHT: 53.55, prixVenteHT: 160 },
    { id: "p3", refFabricant: "DOORPROTECT", libelleInterne: "DoorProtect Ajax", libelleCommercial: "Détecteur d'ouverture sans fil", marque: "ajax", type: "alarme", prixSylis: 29, prixAchatHT: 13.05, prixVenteHT: 39 },
    { id: "p4", refFabricant: "FIREPROTECT", libelleInterne: "FireProtect Ajax", libelleCommercial: "Détecteur de fumée et température", marque: "ajax", type: "incendie", prixSylis: 59, prixAchatHT: 26.55, prixVenteHT: 80 },
    { id: "p5", refFabricant: "STREETSIREN", libelleInterne: "StreetSiren DoubleDeck Ajax", libelleCommercial: "Sirène extérieure sans fil avec flash", marque: "ajax", type: "alarme", prixSylis: 145, prixAchatHT: 65.25, prixVenteHT: 195 },
    { id: "p6", refFabricant: "KEYPAD", libelleInterne: "KeyPad Plus Ajax", libelleCommercial: "Clavier de commande rétroéclairé", marque: "ajax", type: "alarme", prixSylis: 119, prixAchatHT: 53.55, prixVenteHT: 159 },
    // Dahua - Vidéo
    { id: "p10", refFabricant: "NVR4108", libelleInterne: "NVR 8 voies Dahua", libelleCommercial: "Enregistreur numérique 8 voies 4K", marque: "dahua", type: "video", prixMarche: 480, prixAchatHT: 180, prixVenteHT: 540 },
    { id: "p11", refFabricant: "NVR4116", libelleInterne: "NVR 16 voies Dahua", libelleCommercial: "Enregistreur numérique 16 voies 4K", marque: "dahua", type: "video", prixMarche: 720, prixAchatHT: 270, prixVenteHT: 810 },
    { id: "p12", refFabricant: "IPC-HDW3541T", libelleInterne: "Dôme 4MP TiOC Dahua", libelleCommercial: "Caméra dôme 4MP dissuasion active", marque: "dahua", type: "video", prixMarche: 299, prixAchatHT: 112.13, prixVenteHT: 336 },
    { id: "p13", refFabricant: "IPC-HDW3841T", libelleInterne: "Dôme 8MP TiOC Dahua", libelleCommercial: "Caméra dôme 8MP ultra HD dissuasion active", marque: "dahua", type: "video", prixMarche: 449, prixAchatHT: 168.38, prixVenteHT: 505 },
    { id: "p14", refFabricant: "SD49225", libelleInterne: "PTZ 2MP Dahua", libelleCommercial: "Caméra motorisée PTZ zoom 25×", marque: "dahua", type: "video", prixMarche: 890, prixAchatHT: 333.75, prixVenteHT: 1001 },
    { id: "p15", refFabricant: "VTO2211", libelleInterne: "Interphone VTO Dahua", libelleCommercial: "Interphone vidéo IP", marque: "dahua", type: "video", prixMarche: 329, prixAchatHT: 123.38, prixVenteHT: 370 },
    // Vauban - Contrôle d'accès
    { id: "p20", refFabricant: "V-CEN-4", libelleInterne: "Centrale 4 portes Vauban", libelleCommercial: "Centrale de contrôle d'accès 4 portes", marque: "vauban", type: "acces", prixAchatHT: 380, prixVenteHT: 1140 },
    { id: "p21", refFabricant: "V-LEC-M", libelleInterne: "Lecteur Mifare Vauban", libelleCommercial: "Lecteur de badge Mifare", marque: "vauban", type: "acces", prixAchatHT: 85, prixVenteHT: 255 },
    { id: "p22", refFabricant: "V-BADGE", libelleInterne: "Badge Mifare Vauban", libelleCommercial: "Badge utilisateur Mifare", marque: "vauban", type: "accessoire", prixAchatHT: 2.5, prixVenteHT: 12 },
    { id: "p23", refFabricant: "V-VENT", libelleInterne: "Ventouse 300kg Vauban", libelleCommercial: "Ventouse électromagnétique 300 kg", marque: "vauban", type: "acces", prixAchatHT: 95, prixVenteHT: 285 },
    { id: "p24", refFabricant: "V-GACHE", libelleInterne: "Gâche électrique Vauban", libelleCommercial: "Gâche électrique fail secure", marque: "vauban", type: "acces", prixAchatHT: 78, prixVenteHT: 234 },
  ],

  packs: [
    { id: "pk1", nom: "Pack Commerce Essentiel", description: "Alarme sans fil pour petit commerce", cible: "Commerce", lignes: [{ productId: "p1", quantite: 1 }, { productId: "p2", quantite: 2 }, { productId: "p3", quantite: 3 }, { productId: "p5", quantite: 1 }, { productId: "p6", quantite: 1 }], prixIndicatif: 1870 },
    { id: "pk2", nom: "Pack Restaurant Vidéo", description: "Vidéosurveillance 8 caméras + enregistreur", cible: "Commerce", lignes: [{ productId: "p10", quantite: 1 }, { productId: "p12", quantite: 8 }], prixIndicatif: 3228 },
    { id: "pk3", nom: "Pack Villa Premium", description: "Sécurité complète villa haut de gamme", cible: "Premium", lignes: [{ productId: "p1", quantite: 1 }, { productId: "p2", quantite: 4 }, { productId: "p3", quantite: 6 }, { productId: "p4", quantite: 2 }, { productId: "p5", quantite: 2 }, { productId: "p6", quantite: 2 }, { productId: "p10", quantite: 1 }, { productId: "p13", quantite: 4 }], prixIndicatif: 4720 },
    { id: "pk4", nom: "Pack PME Contrôle d'accès", description: "Contrôle d'accès 4 portes avec badges", cible: "PME", lignes: [{ productId: "p20", quantite: 1 }, { productId: "p21", quantite: 4 }, { productId: "p23", quantite: 4 }, { productId: "p22", quantite: 20 }], prixIndicatif: 2520 },
  ],

  deals: [
    { id: "d1", titre: "Équipement boutique principale", accountId: "a1", contactId: "ct1", commercialId: "c1", etape: "devis_envoye", probabilite: 50, valeur: 12500, formulePreferee: "achat_maintenance", dateCible: daysFromNow(30).slice(0, 10), createdAt: daysFromNow(-25) },
    { id: "d2", titre: "Rénovation restaurant", accountId: "a2", contactId: "ct2", commercialId: "c2", etape: "qualif", probabilite: 30, valeur: 5800, formulePreferee: "leasing", dateCible: daysFromNow(45).slice(0, 10), createdAt: daysFromNow(-12) },
    { id: "d3", titre: "Alarme boulangerie", accountId: "a3", contactId: "ct3", commercialId: "c2", etape: "nego", probabilite: 75, valeur: 3200, formulePreferee: "achat", dateCible: daysFromNow(14).slice(0, 10), createdAt: daysFromNow(-35) },
    { id: "d4", titre: "Intégration Crestron Home", accountId: "a4", contactId: "ct4", commercialId: "c1", etape: "prospection", probabilite: 10, valeur: 45000, formulePreferee: "leasing", dateCible: daysFromNow(90).slice(0, 10), createdAt: daysFromNow(-5) },
    { id: "d5", titre: "Villa - sécurité complète", accountId: "a5", commercialId: "c1", etape: "devis_envoye", probabilite: 50, valeur: 18500, formulePreferee: "achat_maintenance", dateCible: daysFromNow(30).slice(0, 10), createdAt: daysFromNow(-18) },
    { id: "d6", titre: "Pharmacie - mise aux normes", accountId: "a6", contactId: "ct6", commercialId: "c3", etape: "signe", probabilite: 100, valeur: 3614, formulePreferee: "achat_maintenance", dateCible: daysFromNow(-5).slice(0, 10), createdAt: daysFromNow(-65) },
    { id: "d7", titre: "Entrepôt Bâti-Var", accountId: "a7", contactId: "ct7", commercialId: "c3", etape: "qualif", probabilite: 30, valeur: 8900, formulePreferee: "leasing", dateCible: daysFromNow(60).slice(0, 10), createdAt: daysFromNow(-8) },
    { id: "d8", titre: "Mise à niveau vidéo Le Cépage", accountId: "a2", contactId: "ct2", commercialId: "c2", etape: "perdu", probabilite: 0, valeur: 2400, formulePreferee: "achat", createdAt: daysFromNow(-80) },
  ],

  quotes: [
    {
      id: "q1", numero: "DEV-2026-0140", dealId: "d1", accountId: "a1", contactId: "ct1", commercialId: "c1",
      lignes: [
        { id: "ql1", productId: "p1", libelle: "Centrale d'alarme connectée 4G/Wi-Fi", quantite: 1, prixAchatHT: 152.55, prixVenteHT: 458 },
        { id: "ql2", productId: "p2", libelle: "Détecteur de mouvement photo-vérification", quantite: 4, prixAchatHT: 53.55, prixVenteHT: 160 },
        { id: "ql3", productId: "p3", libelle: "Détecteur d'ouverture sans fil", quantite: 6, prixAchatHT: 13.05, prixVenteHT: 39 },
        { id: "ql4", productId: "p10", libelle: "Enregistreur numérique 8 voies 4K", quantite: 1, prixAchatHT: 180, prixVenteHT: 540 },
        { id: "ql5", productId: "p12", libelle: "Caméra dôme 4MP dissuasion active", quantite: 6, prixAchatHT: 112.13, prixVenteHT: 336 },
      ],
      heuresMO: 16, tauxMO: 65, fraisDeplacement: 120,
      modeAchat: { maintenance: "confort" }, modeLeasing: { duree: 48 },
      status: "envoye", formuleChoisie: null,
      typeSite: "commerce", surface: 180, nbOuvrants: 6,
      createdAt: daysFromNow(-18), sentAt: daysFromNow(-17),
    },
    {
      id: "q2", numero: "DEV-2026-0141", dealId: "d5", accountId: "a5", commercialId: "c1",
      lignes: [
        { id: "ql10", productId: "p1", libelle: "Centrale d'alarme connectée 4G/Wi-Fi", quantite: 1, prixAchatHT: 152.55, prixVenteHT: 458 },
        { id: "ql11", productId: "p2", libelle: "Détecteur de mouvement photo-vérification", quantite: 6, prixAchatHT: 53.55, prixVenteHT: 160 },
        { id: "ql12", productId: "p13", libelle: "Caméra dôme 8MP ultra HD dissuasion active", quantite: 8, prixAchatHT: 168.38, prixVenteHT: 505 },
        { id: "ql13", productId: "p11", libelle: "Enregistreur 16 voies 4K", quantite: 1, prixAchatHT: 270, prixVenteHT: 810 },
      ],
      heuresMO: 24, tauxMO: 65, fraisDeplacement: 150,
      modeAchat: { maintenance: "serenite" }, modeLeasing: { duree: 60 },
      status: "envoye", formuleChoisie: null,
      typeSite: "residentiel", surface: 350, nbOuvrants: 12,
      createdAt: daysFromNow(-12), sentAt: daysFromNow(-11),
    },
    {
      id: "q3", numero: "DEV-2026-0142", dealId: "d6", accountId: "a6", contactId: "ct6", commercialId: "c3",
      lignes: [
        { id: "ql20", productId: "p1", libelle: "Centrale d'alarme connectée 4G/Wi-Fi", quantite: 1, prixAchatHT: 152.55, prixVenteHT: 458 },
        { id: "ql21", productId: "p2", libelle: "Détecteur de mouvement photo-vérification", quantite: 3, prixAchatHT: 53.55, prixVenteHT: 160 },
        { id: "ql22", productId: "p3", libelle: "Détecteur d'ouverture sans fil", quantite: 4, prixAchatHT: 13.05, prixVenteHT: 39 },
        { id: "ql23", productId: "p4", libelle: "Détecteur de fumée et température", quantite: 2, prixAchatHT: 26.55, prixVenteHT: 80 },
        { id: "ql24", productId: "p5", libelle: "Sirène extérieure sans fil avec flash", quantite: 1, prixAchatHT: 65.25, prixVenteHT: 195 },
        { id: "ql25", productId: "p6", libelle: "Clavier rétroéclairé", quantite: 1, prixAchatHT: 53.55, prixVenteHT: 159 },
      ],
      heuresMO: 12, tauxMO: 65, fraisDeplacement: 80,
      modeAchat: { maintenance: "confort" }, modeLeasing: { duree: 48 },
      status: "signe_achat", formuleChoisie: "achat_maintenance",
      createdAt: daysFromNow(-60), sentAt: daysFromNow(-58), signedAt: daysFromNow(-5),
    },
  ],

  invoices: [
    { id: "i1", numero: "FA-2026-0078", quoteId: "q3", accountId: "a6", commercialId: "c3", montantHT: 3614, montantTVA: 722.8, montantTTC: 4336.8, status: "payee", type: "ponctuelle", dateEmission: daysFromNow(-5).slice(0, 10), dateEcheance: daysFromNow(25).slice(0, 10), datePaiement: daysFromNow(-2).slice(0, 10) },
    { id: "i2", numero: "FA-2026-0077", accountId: "a1", commercialId: "c1", montantHT: 1200, montantTVA: 240, montantTTC: 1440, status: "emise", type: "recurrente", dateEmission: daysFromNow(-8).slice(0, 10), dateEcheance: daysFromNow(22).slice(0, 10) },
    { id: "i3", numero: "FA-2026-0076", accountId: "a2", commercialId: "c2", montantHT: 480, montantTVA: 96, montantTTC: 576, status: "retard", type: "recurrente", dateEmission: daysFromNow(-45).slice(0, 10), dateEcheance: daysFromNow(-15).slice(0, 10) },
  ],

  contrats: [
    { id: "mc1", accountId: "a6", niveau: "confort", montantAnnuel: 520, dateDebut: daysFromNow(-60).slice(0, 10), dateFin: daysFromNow(305).slice(0, 10), statut: "actif" },
    { id: "mc2", accountId: "a1", niveau: "serenite", montantAnnuel: 1680, dateDebut: daysFromNow(-330).slice(0, 10), dateFin: daysFromNow(35).slice(0, 10), statut: "a_renouveler" },
    { id: "mc3", accountId: "a7", niveau: "confort", montantAnnuel: 980, dateDebut: daysFromNow(-200).slice(0, 10), dateFin: daysFromNow(165).slice(0, 10), statut: "actif" },
  ],

  events: [
    { id: "e1", type: "rdv", title: "RDV GODOT - validation devis", accountId: "a1", commercialId: "c1", date: daysFromNow(1), duree: 60, notes: "Apporter maquette caméras" },
    { id: "e2", type: "appel", title: "Appel Dubois - relance devis villa", accountId: "a5", commercialId: "c1", date: daysFromNow(0), duree: 15, notes: "" },
    { id: "e3", type: "visite", title: "Audit Bâti-Var - entrepôt", accountId: "a7", commercialId: "c3", date: daysFromNow(2), duree: 120, notes: "Prévoir matériel mesure" },
    { id: "e4", type: "rdv", title: "Présentation Crestron - Cabinet Moreau", accountId: "a4", commercialId: "c1", date: daysFromNow(3), duree: 90, notes: "" },
    { id: "e5", type: "intervention", title: "Installation Pharmacie du Port", accountId: "a6", commercialId: "c3", date: daysFromNow(5), duree: 240, notes: "Technicien + commercial" },
  ],

  sav: [
    { id: "s1", numero: "SAV-2026-0034", accountId: "a6", objet: "Détecteur zone 3 en défaut", description: "Le client signale un détecteur qui déclenche sans raison", status: "en_cours", priorite: "normale", createdAt: daysFromNow(-3) },
    { id: "s2", numero: "SAV-2026-0033", accountId: "a2", objet: "Caméra cuisine floue", description: "La caméra au-dessus du passe est floue depuis 2 jours", status: "ouvert", priorite: "haute", createdAt: daysFromNow(-1) },
  ],

  interactions: [
    { id: "it1", accountId: "a1", type: "appel", date: daysFromNow(-2), commercialId: "c1", contenu: "Relance devis - demande complément sur maintenance" },
    { id: "it2", accountId: "a5", type: "email", date: daysFromNow(-4), commercialId: "c1", contenu: "Envoi devis révisé avec option leasing 60 mois" },
    { id: "it3", accountId: "a2", type: "visite", date: daysFromNow(-8), commercialId: "c2", contenu: "Audit sur site - relevé technique" },
  ],
};
