import { useMemo, useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { Modal } from "@/components/ui/overlays";
import { Button } from "@/components/ui/Button";
import { Badge, Select } from "@/components/ui/primitives";
import * as db from "@/lib/db";
import { SECTEURS, SOURCES } from "@/lib/constants";
import { useDemoData } from "@/lib/supabase";
import { parseSpreadsheet, normalize, matchAccountByName } from "@/lib/sellsy-import-utils";
import type { Account, Contact, Secteur, Source } from "@/types";

// =============================================================================
// Mapping fields — aligne sur l'export Sellsy "clients complet"
// =============================================================================
//
// L'utilisateur peut mapper chaque colonne de son CSV vers un des champs
// ci-dessous. Les libelles sont calques sur ceux qu'emploie Sellsy pour
// faciliter la reconnaissance visuelle.
//
// Plusieurs niveaux :
//   - Société : ce qui va sur l'Account
//   - Adresse : champs postaux, concatenes si plusieurs parties
//   - Contact : si un nom/prenom est mappe -> creation d'un Contact lie
//   - Flags : contact principal / facturation / relance -> role
//   - Extras : stockes dans account.notes (readonly, lecture libre)

type FieldKey =
  // --- Société / Account ---
  | "sellsyIdSociete"
  | "typeSociete"
  | "raisonSociale"
  | "siret"
  | "secteur"
  | "emailSociete"
  | "telephoneSociete"
  // --- Adresse ---
  | "nomAdresse"
  | "adressePartie1"
  | "adressePartie2"
  | "adressePartie3"
  | "adressePartie4"
  | "codePostal"
  | "ville"
  | "etat"
  | "codePays"
  | "sellsyIdAdresse"
  // --- Contact ---
  | "sellsyIdContact"
  | "civiliteContact"
  | "prenomContact"
  | "nomContact"
  | "fonctionContact"
  | "emailContact"
  | "telephoneContact"
  | "mobileContact"
  | "faxContact"
  | "webContact"
  | "anniversaireContact"
  | "noteContact"
  // --- Réseaux ---
  | "twitterContact"
  | "linkedinContact"
  | "facebookContact"
  | "viadeoContact"
  // --- Marketing ---
  | "smartTags"
  | "inscritEmail"
  | "inscritSms"
  // --- Rôles contact ---
  | "contactPrincipal"
  | "contactFacturation"
  | "contactRelance"
  // --- Dates Sellsy (info seulement) ---
  | "dateCreation"
  | "dateModification"
  | "__ignore__";

// Libelles affiches dans le dropdown. L'asterisque * = requis (raison sociale).
const FIELD_LABELS: Record<Exclude<FieldKey, "__ignore__">, string> = {
  // Société
  sellsyIdSociete: "ID société Sellsy",
  typeSociete: "Type société (juridique)",
  raisonSociale: "Nom société / Raison sociale *",
  siret: "SIRET",
  secteur: "Secteur d'activité",
  emailSociete: "Email société",
  telephoneSociete: "Téléphone société",
  // Adresse
  nomAdresse: "Nom adresse",
  adressePartie1: "Adresse partie 1",
  adressePartie2: "Adresse partie 2",
  adressePartie3: "Adresse partie 3",
  adressePartie4: "Adresse partie 4",
  codePostal: "Code postal",
  ville: "Ville",
  etat: "État / Région",
  codePays: "Code pays",
  sellsyIdAdresse: "ID adresse Sellsy",
  // Contact
  sellsyIdContact: "ID contact Sellsy",
  civiliteContact: "Civilité contact",
  prenomContact: "Prénom contact",
  nomContact: "Nom contact",
  fonctionContact: "Fonction contact",
  emailContact: "Email contact",
  telephoneContact: "Téléphone contact",
  mobileContact: "Mobile contact",
  faxContact: "Fax contact",
  webContact: "Web contact",
  anniversaireContact: "Anniversaire contact",
  noteContact: "Note contact",
  // Réseaux
  twitterContact: "Twitter contact",
  linkedinContact: "LinkedIn contact",
  facebookContact: "Facebook contact",
  viadeoContact: "Viadeo contact",
  // Marketing
  smartTags: "Smart Tags",
  inscritEmail: "Inscrit campagnes email",
  inscritSms: "Inscrit campagnes SMS",
  // Flags roles
  contactPrincipal: "Contact principal (oui/non)",
  contactFacturation: "Contact de facturation (oui/non)",
  contactRelance: "Contact de relance (oui/non)",
  // Dates
  dateCreation: "Date de création",
  dateModification: "Date de dernière modification",
};

// Groupes (optgroup) pour presenter le dropdown proprement
const FIELD_GROUPS: { label: string; fields: Exclude<FieldKey, "__ignore__">[] }[] = [
  {
    label: "Société",
    fields: ["raisonSociale", "sellsyIdSociete", "typeSociete", "siret", "secteur", "emailSociete", "telephoneSociete"],
  },
  {
    label: "Adresse",
    fields: ["nomAdresse", "adressePartie1", "adressePartie2", "adressePartie3", "adressePartie4", "codePostal", "ville", "etat", "codePays", "sellsyIdAdresse"],
  },
  {
    label: "Contact",
    fields: ["sellsyIdContact", "civiliteContact", "prenomContact", "nomContact", "fonctionContact", "emailContact", "telephoneContact", "mobileContact", "faxContact", "webContact", "anniversaireContact", "noteContact"],
  },
  {
    label: "Réseaux sociaux",
    fields: ["twitterContact", "linkedinContact", "facebookContact", "viadeoContact"],
  },
  {
    label: "Marketing",
    fields: ["smartTags", "inscritEmail", "inscritSms"],
  },
  {
    label: "Rôle du contact",
    fields: ["contactPrincipal", "contactFacturation", "contactRelance"],
  },
  {
    label: "Dates Sellsy",
    fields: ["dateCreation", "dateModification"],
  },
];

// Synonymes pour auto-detection. L'exact match Sellsy est prioritaire.
// Note : toutes ces chaines sont normalisees (minuscules, sans accents) avant comparaison.
const HEADER_HINTS: Record<Exclude<FieldKey, "__ignore__">, string[]> = {
  // Société
  sellsyIdSociete: ["id societe sellsy", "id sellsy societe", "sellsy id societe", "sellsy client id"],
  typeSociete: ["type societe", "type de societe", "forme juridique"],
  raisonSociale: [
    "nom societe", "raison sociale", "raison_sociale", "nom client",
    "nom commercial", "company", "nom de l'entreprise", "nom entreprise",
    "societe", "client", "denomination",
  ],
  siret: ["siret", "siren"],
  secteur: ["secteur d'activite", "secteur", "activite", "industry", "sector"],
  emailSociete: ["email societe", "mail societe", "e-mail societe", "courriel societe"],
  telephoneSociete: ["telephone societe", "tel societe", "phone company"],
  // Adresse
  nomAdresse: ["nom adresse", "libelle adresse", "adresse nom"],
  adressePartie1: ["adresse partie 1", "adresse 1", "adresse ligne 1", "adresse principale", "rue", "street", "address line 1"],
  adressePartie2: ["adresse partie 2", "adresse 2", "adresse ligne 2", "complement adresse", "address line 2"],
  adressePartie3: ["adresse partie 3", "adresse 3", "adresse ligne 3"],
  adressePartie4: ["adresse partie 4", "adresse 4", "adresse ligne 4"],
  codePostal: ["code postal", "code_postal", "cp", "zip", "postal code", "postcode"],
  ville: ["ville", "city", "localite", "commune"],
  etat: ["etat", "region", "departement", "state"],
  codePays: ["code pays", "pays", "country"],
  sellsyIdAdresse: ["id adresse sellsy", "sellsy id adresse"],
  // Contact
  sellsyIdContact: ["contact id", "id contact", "sellsy id contact", "id contact sellsy"],
  civiliteContact: ["civilite contact", "civilite", "titre"],
  prenomContact: ["prenom contact", "prenom"],
  nomContact: ["nom contact", "nom de famille"],
  fonctionContact: ["fonction contact", "fonction", "poste", "titre fonction"],
  emailContact: ["email contact", "e-mail contact", "email", "courriel", "mail"],
  telephoneContact: ["telephone contact", "tel contact", "telephone fixe", "telephone", "phone"],
  mobileContact: ["mobile contact", "mobile", "portable", "gsm"],
  faxContact: ["fax contact", "fax"],
  webContact: ["web contact", "site web contact", "site web", "website"],
  anniversaireContact: ["anniversaire contact", "anniversaire", "date de naissance", "birthdate"],
  noteContact: ["contact note", "note contact", "note du contact", "notes contact"],
  // Reseaux
  twitterContact: ["twitter contact", "twitter", "x.com"],
  linkedinContact: ["linkedin contact", "linkedin"],
  facebookContact: ["facebook contact", "facebook"],
  viadeoContact: ["viadeo contact", "viadeo"],
  // Marketing
  smartTags: ["smart tags", "smart_tags", "tags", "etiquettes"],
  inscritEmail: ["inscrit campagnes email", "inscrit email", "opt-in email"],
  inscritSms: ["inscrit campagnes sms", "inscrit sms", "opt-in sms"],
  // Roles
  contactPrincipal: ["contact principal"],
  contactFacturation: ["contact de facturation", "contact facturation"],
  contactRelance: ["contact de relance", "contact relance"],
  // Dates
  dateCreation: ["date de creation", "date creation", "created at"],
  dateModification: ["date de derniere modification", "date modification", "updated at", "last modified"],
};

// Algo en 2 passes pour eviter les matches trompeurs (ex: "NOM CONTACT"
// hijacke par le hint loose "nom" de raisonSociale). Pass 1 : match exact.
// Pass 2 : match par substring — seulement pour les headers non encore mappes.
function autoDetectMapping(headers: string[]): Record<string, FieldKey> {
  const mapping: Record<string, FieldKey> = Object.fromEntries(
    headers.map((h) => [h, "__ignore__"])
  ) as Record<string, FieldKey>;
  const used = new Set<string>();

  // --- Pass 1 : exact match (n === hint)
  for (const h of headers) {
    const n = normalize(h);
    for (const [field, hints] of Object.entries(HEADER_HINTS)) {
      if (used.has(field)) continue;
      if (hints.some((hint) => n === hint)) {
        mapping[h] = field as FieldKey;
        used.add(field);
        break;
      }
    }
  }

  // --- Pass 2 : substring match, uniquement pour headers encore non mappes
  for (const h of headers) {
    if (mapping[h] !== "__ignore__") continue;
    const n = normalize(h);
    for (const [field, hints] of Object.entries(HEADER_HINTS)) {
      if (used.has(field)) continue;
      if (hints.some((hint) => n.includes(hint))) {
        mapping[h] = field as FieldKey;
        used.add(field);
        break;
      }
    }
  }

  return mapping;
}

// Rattache un secteur brut a un id SECTEURS.
function matchSecteur(raw: string): Secteur | null {
  const n = normalize(raw);
  if (!n) return null;
  const direct = SECTEURS.find((s) => s.id === n);
  if (direct) return direct.id;
  const byLabel = SECTEURS.find((s) => {
    const label = normalize(s.label);
    return label.length > 0 && (label.includes(n) || n.includes(label));
  });
  if (byLabel) return byLabel.id;
  if (/resto|restaur|bar|cafe|brasser|pizzer/.test(n)) return "restauration";
  if (/archi|maitre/.test(n)) return "architecte";
  if (/boutique|magasin|commerce|retail/.test(n)) return "retail";
  if (/usine|industri|fabric/.test(n)) return "industriel";
  if (/bureau|tertiar|cabinet/.test(n)) return "tertiaire";
  if (/particulier|residen|villa|maison/.test(n)) return "residentiel";
  if (/artisa/.test(n)) return "artisan";
  return null;
}

// Parse "oui"/"non"/"1"/"0"/"true"/"false" -> boolean
function parseBool(raw: string): boolean {
  const n = normalize(raw);
  return /^(oui|yes|y|true|1|vrai|o)$/.test(n);
}

// =============================================================================
// Composant
// =============================================================================

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: (result: { accounts: Account[]; contacts: Contact[] }) => void;
}

type Row = Record<string, unknown>;
type ParsedFile = { filename: string; headers: string[]; rows: Row[] };

type ImportResult = {
  ok: number;
  createdContacts: number;
  skipped: number;
  errors: string[];
};

export function SellsyImport({ open, onClose, onImported }: Props) {
  const [file, setFile] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Record<string, FieldKey>>({});
  const [defaultSource, setDefaultSource] = useState<Source>("ancien_client");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const missingRaisonSociale = useMemo(
    () => !Object.values(mapping).includes("raisonSociale"),
    [mapping]
  );

  async function handleFile(f: File) {
    setResult(null);
    try {
      const parsed = await parseSpreadsheet(f);
      setFile(parsed);
      setMapping(autoDetectMapping(parsed.headers));
    } catch (e) {
      setResult({ ok: 0, createdContacts: 0, skipped: 0, errors: [`Lecture impossible : ${(e as Error).message}`] });
    }
  }

  async function doImport() {
    if (!file) return;
    setImporting(true);
    const errors: string[] = [];
    let ok = 0;
    let skipped = 0;
    let createdContacts = 0;
    const createdAccounts: Account[] = [];
    const createdContactsList: Contact[] = [];

    // Pool : liste vivante des comptes (pre-existants + crees pendant l'import)
    const accountsPool: Account[] = useDemoData ? [] : await db.listAccounts();

    const getCol = (row: Row, field: FieldKey): string => {
      const col = Object.entries(mapping).find(([, f]) => f === field)?.[0];
      if (!col) return "";
      const v = row[col];
      return v === null || v === undefined ? "" : String(v).trim();
    };

    for (let i = 0; i < file.rows.length; i++) {
      const row = file.rows[i];
      const raisonSociale = getCol(row, "raisonSociale");
      if (!raisonSociale) {
        skipped++;
        continue;
      }

      try {
        // -------- Adresse : concatener les parties renseignees --------
        const adresseParts = [
          getCol(row, "adressePartie1"),
          getCol(row, "adressePartie2"),
          getCol(row, "adressePartie3"),
          getCol(row, "adressePartie4"),
        ].filter((s) => s.length > 0);
        const adresse = adresseParts.join(", ");

        // -------- Notes extras : rassembler les champs sans place ailleurs --
        const extras: string[] = [];
        const pushExtra = (label: string, val: string) => {
          if (val) extras.push(`${label}: ${val}`);
        };
        pushExtra("ID Sellsy", getCol(row, "sellsyIdSociete"));
        pushExtra("Type société", getCol(row, "typeSociete"));
        pushExtra("État/Région", getCol(row, "etat"));
        pushExtra("Pays", getCol(row, "codePays"));
        pushExtra("Smart Tags", getCol(row, "smartTags"));
        pushExtra("Site web", getCol(row, "webContact"));
        pushExtra("LinkedIn", getCol(row, "linkedinContact"));
        pushExtra("Twitter", getCol(row, "twitterContact"));
        pushExtra("Facebook", getCol(row, "facebookContact"));
        pushExtra("Viadeo", getCol(row, "viadeoContact"));
        pushExtra("Fax", getCol(row, "faxContact"));
        pushExtra("Anniversaire contact", getCol(row, "anniversaireContact"));
        pushExtra("Note contact", getCol(row, "noteContact"));
        pushExtra("Créé le (Sellsy)", getCol(row, "dateCreation"));
        pushExtra("Modifié le (Sellsy)", getCol(row, "dateModification"));

        const accountPayload: Omit<Account, "id" | "createdAt"> = {
          raisonSociale,
          secteur: matchSecteur(getCol(row, "secteur")) ?? "tertiaire",
          source: defaultSource,
          adresse,
          codePostal: getCol(row, "codePostal"),
          ville: getCol(row, "ville"),
          telephone: getCol(row, "telephoneSociete") || undefined,
          email: getCol(row, "emailSociete") || undefined,
          siret: getCol(row, "siret") || undefined,
          notes: extras.length > 0 ? extras.join(" | ") : undefined,
        };

        // -------- Creation/matching du compte --------
        let savedAccount: Account;
        if (useDemoData) {
          savedAccount = {
            ...accountPayload,
            id: `demo_a_${Date.now()}_${i}`,
            createdAt: new Date().toISOString(),
          };
        } else {
          const existing = matchAccountByName(raisonSociale, accountsPool);
          if (existing) {
            // Compte existant : completer uniquement les champs vides
            const patch: Partial<Account> = {};
            if (!existing.adresse?.trim() && adresse) patch.adresse = adresse;
            if (!existing.codePostal?.trim() && accountPayload.codePostal) patch.codePostal = accountPayload.codePostal;
            if (!existing.ville?.trim() && accountPayload.ville) patch.ville = accountPayload.ville;
            if (!existing.telephone && accountPayload.telephone) patch.telephone = accountPayload.telephone;
            if (!existing.email && accountPayload.email) patch.email = accountPayload.email;
            if (!existing.siret && accountPayload.siret) patch.siret = accountPayload.siret;
            if (!existing.notes && accountPayload.notes) patch.notes = accountPayload.notes;
            if (Object.keys(patch).length > 0) {
              savedAccount = await db.updateAccount(existing.id, patch);
              const idx = accountsPool.indexOf(existing);
              if (idx >= 0) accountsPool[idx] = savedAccount;
            } else {
              savedAccount = existing;
            }
          } else {
            savedAccount = await db.createAccount(accountPayload);
            accountsPool.push(savedAccount);
            createdAccounts.push(savedAccount);
          }
        }

        // -------- Contact : cree si prenom ou nom contact mappe --------
        const prenom = getCol(row, "prenomContact");
        const nom = getCol(row, "nomContact");
        if (prenom || nom) {
          const civilite = getCol(row, "civiliteContact");
          // Civilite prefixe le prenom si present ("M. Jean")
          const prenomFinal = civilite ? `${civilite} ${prenom}`.trim() : prenom;
          // Role : contact principal -> decideur, facturation -> compta, sinon autre
          const isPrincipal = parseBool(getCol(row, "contactPrincipal"));
          const isFacturation = parseBool(getCol(row, "contactFacturation"));
          const role: Contact["role"] = isPrincipal
            ? "decideur"
            : isFacturation
            ? "compta"
            : "autre";
          // Telephone : mobile prioritaire, fallback fixe
          const telephone = getCol(row, "mobileContact") || getCol(row, "telephoneContact");

          const contactPayload: Omit<Contact, "id"> = {
            accountId: savedAccount.id,
            prenom: prenomFinal || "—",
            nom: nom || "—",
            fonction: getCol(row, "fonctionContact") || undefined,
            email: getCol(row, "emailContact") || undefined,
            telephone: telephone || undefined,
            role,
          };
          try {
            if (useDemoData) {
              createdContactsList.push({ ...contactPayload, id: `demo_c_${Date.now()}_${i}` });
            } else {
              const savedContact = await db.createContact(contactPayload);
              createdContactsList.push(savedContact);
            }
            createdContacts++;
          } catch (e) {
            errors.push(`Ligne ${i + 2} (${raisonSociale}) — contact non créé : ${(e as Error).message}`);
          }
        }

        ok++;
      } catch (e) {
        errors.push(`Ligne ${i + 2} (${raisonSociale}) : ${(e as Error).message}`);
      }
    }

    setResult({ ok, createdContacts, skipped, errors });
    setImporting(false);
    if (createdAccounts.length > 0 || createdContactsList.length > 0) {
      onImported({ accounts: createdAccounts, contacts: createdContactsList });
    }
  }

  function reset() {
    setFile(null);
    setMapping({});
    setResult(null);
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (importing) return;
        reset();
        onClose();
      }}
      title="Importer des clients depuis Sellsy"
      size="lg"
      footer={
        <>
          <div className="flex-1 text-[11px] text-slate-500">
            Formats : <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong>. Sellsy → Clients → <em>Exporter</em>.
          </div>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }} disabled={importing}>
            {result ? "Fermer" : "Annuler"}
          </Button>
          {file && !result && (
            <Button
              variant="primary"
              icon={ArrowRight}
              onClick={doImport}
              disabled={importing || missingRaisonSociale || file.rows.length === 0}
            >
              {importing ? "Import…" : `Importer ${file.rows.length} ligne${file.rows.length > 1 ? "s" : ""}`}
            </Button>
          )}
        </>
      }
    >
      {!file ? (
        <DropZone onFile={handleFile} />
      ) : result ? (
        <ResultView result={result} onReset={reset} />
      ) : (
        <MappingView
          file={file}
          mapping={mapping}
          setMapping={setMapping}
          defaultSource={defaultSource}
          setDefaultSource={setDefaultSource}
          missingRaisonSociale={missingRaisonSociale}
        />
      )}
    </Modal>
  );
}

// -----------------------------------------------------------------------------
// DropZone
// -----------------------------------------------------------------------------
function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 cursor-pointer transition-colors ${
        dragging
          ? "border-[#C9A961] bg-[#F8F0DC]/30"
          : "border-slate-300 dark:border-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30"
      }`}
    >
      <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800">
        <Upload size={22} className="text-slate-500" />
      </div>
      <div className="text-center">
        <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
          Déposer un export Sellsy (clients + contacts)
        </div>
        <div className="text-xs text-slate-500 mt-1">
          ou cliquer pour choisir (.xlsx, .xls, .csv)
        </div>
      </div>
      <input
        type="file"
        accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </label>
  );
}

// -----------------------------------------------------------------------------
// MappingView
// -----------------------------------------------------------------------------
function MappingView({
  file,
  mapping,
  setMapping,
  defaultSource,
  setDefaultSource,
  missingRaisonSociale,
}: {
  file: ParsedFile;
  mapping: Record<string, FieldKey>;
  setMapping: React.Dispatch<React.SetStateAction<Record<string, FieldKey>>>;
  defaultSource: Source;
  setDefaultSource: (s: Source) => void;
  missingRaisonSociale: boolean;
}) {
  const preview = file.rows.slice(0, 5);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <FileSpreadsheet size={16} className="text-[#C9A961]" />
          <span className="font-semibold">{file.filename}</span>
          <Badge tone="slate">{file.rows.length} lignes</Badge>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Source par défaut :</label>
          <Select
            value={defaultSource}
            onChange={(e) => setDefaultSource(e.target.value as Source)}
            className="h-8 text-xs py-0 min-w-[160px]"
          >
            {SOURCES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </Select>
        </div>
      </div>

      {missingRaisonSociale && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          Aucune colonne n'est mappée sur <strong>Nom société / Raison sociale</strong>. Sélectionnez-en une — c'est le seul champ obligatoire.
        </div>
      )}

      <div>
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
          Correspondance des colonnes
        </div>
        <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
          {file.headers.map((h) => (
            <div key={h} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
              <div className="text-xs text-slate-700 dark:text-slate-200 truncate font-medium" title={h}>
                {h}
              </div>
              <Select
                value={mapping[h] ?? "__ignore__"}
                onChange={(e) =>
                  setMapping((m) => ({ ...m, [h]: e.target.value as FieldKey }))
                }
                className="h-9 text-xs py-0"
              >
                <option value="__ignore__">— Ignorer —</option>
                {FIELD_GROUPS.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.fields.map((f) => (
                      <option key={f} value={f}>
                        {FIELD_LABELS[f]}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </div>
          ))}
        </div>
      </div>

      {preview.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
            Aperçu (5 premières lignes)
          </div>
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="text-xs w-full">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  {file.headers.map((h) => (
                    <th key={h} className="text-left px-2 py-1.5 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {h}
                      {mapping[h] && mapping[h] !== "__ignore__" && (
                        <span className="block text-[9px] font-normal text-[#C9A961] -mt-0.5">
                          → {FIELD_LABELS[mapping[h] as Exclude<FieldKey, "__ignore__">]}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                    {file.headers.map((h) => (
                      <td key={h} className="px-2 py-1 text-slate-600 dark:text-slate-300 whitespace-nowrap max-w-[180px] truncate">
                        {String(r[h] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// ResultView
// -----------------------------------------------------------------------------
function ResultView({ result, onReset }: { result: ImportResult; onReset: () => void }) {
  const hasErrors = result.errors.length > 0;
  return (
    <div className="space-y-4">
      <div className={`flex items-start gap-3 p-4 rounded-xl ${
        hasErrors ? "bg-amber-50 dark:bg-amber-950/30" : "bg-emerald-50 dark:bg-emerald-950/30"
      }`}>
        {hasErrors ? (
          <AlertTriangle size={22} className="text-amber-600 flex-shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 size={22} className="text-emerald-600 flex-shrink-0 mt-0.5" />
        )}
        <div className="text-sm space-y-1">
          <div className="font-semibold text-slate-900 dark:text-slate-100">
            {result.ok} ligne{result.ok > 1 ? "s" : ""} importée{result.ok > 1 ? "s" : ""}
          </div>
          {result.createdContacts > 0 && (
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {result.createdContacts} contact{result.createdContacts > 1 ? "s" : ""} créé{result.createdContacts > 1 ? "s" : ""} et rattaché{result.createdContacts > 1 ? "s" : ""} aux comptes.
            </div>
          )}
          {result.skipped > 0 && (
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {result.skipped} ligne{result.skipped > 1 ? "s" : ""} ignorée{result.skipped > 1 ? "s" : ""} (raison sociale manquante).
            </div>
          )}
        </div>
      </div>

      {hasErrors && (
        <div>
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
            Erreurs ({result.errors.length})
          </div>
          <div className="max-h-[220px] overflow-y-auto text-xs space-y-1 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg">
            {result.errors.map((e, i) => (
              <div key={i} className="text-red-600 dark:text-red-400">{e}</div>
            ))}
          </div>
        </div>
      )}

      <Button variant="outline" onClick={onReset} size="sm">
        Importer un autre fichier
      </Button>
    </div>
  );
}
