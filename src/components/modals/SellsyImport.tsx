import { useMemo, useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import * as XLSX from "xlsx";
import { Modal } from "@/components/ui/overlays";
import { Button } from "@/components/ui/Button";
import { Badge, Select } from "@/components/ui/primitives";
import * as db from "@/lib/db";
import { SECTEURS, SOURCES } from "@/lib/constants";
import { useDemoData } from "@/lib/supabase";
import type { Account, Secteur, Source } from "@/types";

// -----------------------------------------------------------------------------
// Mapping auto-detect : on cherche des mots-cles dans l'entete de chaque
// colonne (insensible a la casse/accents) pour proposer un mapping. L'utilisateur
// peut corriger avant import.
// -----------------------------------------------------------------------------
type FieldKey =
  | "raisonSociale"
  | "siret"
  | "adresse"
  | "codePostal"
  | "ville"
  | "telephone"
  | "email"
  | "secteur"
  | "notes"
  | "__ignore__";

const FIELD_LABELS: Record<Exclude<FieldKey, "__ignore__">, string> = {
  raisonSociale: "Raison sociale *",
  siret: "SIRET",
  adresse: "Adresse",
  codePostal: "Code postal",
  ville: "Ville",
  telephone: "Téléphone",
  email: "Email",
  secteur: "Secteur",
  notes: "Notes",
};

// Synonymes Sellsy-like (FR + EN). L'ordre est important : le plus specifique d'abord.
const HEADER_HINTS: Record<Exclude<FieldKey, "__ignore__">, string[]> = {
  raisonSociale: ["raison sociale", "raison_sociale", "nom client", "nom commercial", "company", "nom de l'entreprise", "nom entreprise", "societe", "client", "nom"],
  siret: ["siret", "siren"],
  adresse: ["adresse 1", "adresse", "address", "rue", "street"],
  codePostal: ["code postal", "code_postal", "cp", "zip", "postal code", "postcode"],
  ville: ["ville", "city", "localite", "commune"],
  telephone: ["telephone", "téléphone", "tel", "tél.", "phone", "tel.", "mobile", "portable"],
  email: ["e-mail", "email", "courriel", "mail"],
  secteur: ["secteur", "activite", "activité", "industry", "sector"],
  notes: ["note", "commentaire", "remarque", "memo"],
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function autoDetectMapping(headers: string[]): Record<string, FieldKey> {
  const mapping: Record<string, FieldKey> = {};
  const used = new Set<string>();
  for (const h of headers) {
    const n = normalize(h);
    let best: FieldKey = "__ignore__";
    for (const [field, hints] of Object.entries(HEADER_HINTS)) {
      if (used.has(field)) continue;
      if (hints.some((hint) => n.includes(hint))) {
        best = field as FieldKey;
        break;
      }
    }
    if (best !== "__ignore__") used.add(best);
    mapping[h] = best;
  }
  return mapping;
}

// Essaie de rattacher un secteur brut (libre) a un id de la liste SECTEURS.
function matchSecteur(raw: string): Secteur | null {
  const n = normalize(raw);
  if (!n) return null; // input vide -> pas de fallback "restauration" trompeur
  // Match direct sur l'id
  const direct = SECTEURS.find((s) => s.id === n);
  if (direct) return direct.id;
  // Match sur le label (strict : les deux non-vides pour eviter includes("") = true)
  const byLabel = SECTEURS.find((s) => {
    const label = normalize(s.label);
    return label.length > 0 && (label.includes(n) || n.includes(label));
  });
  if (byLabel) return byLabel.id;
  // Heuristiques FR
  if (/resto|restaur|bar|cafe|brasser|pizzer/.test(n)) return "restauration";
  if (/archi|maitre/.test(n)) return "architecte";
  if (/boutique|magasin|commerce|retail/.test(n)) return "retail";
  if (/usine|industri|fabric/.test(n)) return "industriel";
  if (/bureau|tertiar|cabinet/.test(n)) return "tertiaire";
  if (/particulier|residen|villa|maison/.test(n)) return "residentiel";
  if (/artisa/.test(n)) return "artisan";
  return null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: (accounts: Account[]) => void;
}

type Row = Record<string, unknown>;
type ParsedFile = {
  filename: string;
  headers: string[];
  rows: Row[];
};

export function SellsyImport({ open, onClose, onImported }: Props) {
  const [file, setFile] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Record<string, FieldKey>>({});
  const [defaultSource, setDefaultSource] = useState<Source>("partenaire");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; skipped: number; errors: string[] } | null>(null);

  const missingRaisonSociale = useMemo(
    () => !Object.values(mapping).includes("raisonSociale"),
    [mapping]
  );

  async function handleFile(f: File) {
    setResult(null);
    try {
      const buffer = await f.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const firstSheet = wb.SheetNames[0];
      if (!firstSheet) throw new Error("Aucune feuille trouvée.");
      const ws = wb.Sheets[firstSheet];
      const json: Row[] = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
      if (json.length === 0) {
        setFile({ filename: f.name, headers: [], rows: [] });
        return;
      }
      const headers = Object.keys(json[0]);
      setFile({ filename: f.name, headers, rows: json });
      setMapping(autoDetectMapping(headers));
    } catch (e) {
      setResult({ ok: 0, skipped: 0, errors: [`Lecture impossible : ${(e as Error).message}`] });
    }
  }

  function buildAccountFromRow(r: Row): Omit<Account, "id" | "createdAt"> | null {
    const get = (field: FieldKey): string => {
      const col = Object.entries(mapping).find(([, f]) => f === field)?.[0];
      if (!col) return "";
      const v = r[col];
      return v === null || v === undefined ? "" : String(v).trim();
    };
    const raisonSociale = get("raisonSociale");
    if (!raisonSociale) return null; // ligne sans nom -> ignoree
    const secteurMatched = matchSecteur(get("secteur")) ?? "tertiaire";
    return {
      raisonSociale,
      secteur: secteurMatched,
      source: defaultSource,
      adresse: get("adresse"),
      codePostal: get("codePostal"),
      ville: get("ville"),
      telephone: get("telephone") || undefined,
      email: get("email") || undefined,
      siret: get("siret") || undefined,
      notes: get("notes") || undefined,
    };
  }

  async function doImport() {
    if (!file) return;
    setImporting(true);
    const errors: string[] = [];
    let ok = 0;
    let skipped = 0;
    const created: Account[] = [];

    for (let i = 0; i < file.rows.length; i++) {
      const row = file.rows[i];
      const payload = buildAccountFromRow(row);
      if (!payload) {
        skipped++;
        continue;
      }
      try {
        if (useDemoData) {
          // Mode demo : on simule sans ecrire en DB, juste pour preview.
          created.push({
            ...payload,
            id: `demo_a_${Date.now()}_${i}`,
            createdAt: new Date().toISOString(),
          });
          ok++;
        } else {
          const saved = await db.createAccount(payload);
          created.push(saved);
          ok++;
        }
      } catch (e) {
        errors.push(`Ligne ${i + 2} (${payload.raisonSociale}) : ${(e as Error).message}`);
      }
    }

    setResult({ ok, skipped, errors });
    setImporting(false);
    if (created.length > 0) onImported(created);
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
        reset();
        onClose();
      }}
      title="Importer des clients depuis Sellsy"
      size="lg"
      footer={
        <>
          <div className="flex-1 text-[11px] text-slate-500">
            Formats acceptés : <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong>. Exporte tes clients depuis Sellsy → Clients → <em>Exporter</em>.
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
// DropZone : input file + drag-drop
// -----------------------------------------------------------------------------
function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
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
          Déposer un export Sellsy
        </div>
        <div className="text-xs text-slate-500 mt-1">
          ou cliquer pour choisir un fichier (.xlsx, .xls, .csv)
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
// MappingView : mapping colonnes + preview
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
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {missingRaisonSociale && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          Aucune colonne n'est mappée sur <strong>Raison sociale</strong>. Sélectionnez-en une ci-dessous — c'est le seul champ obligatoire.
        </div>
      )}

      <div>
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
          Correspondance des colonnes (modifiable)
        </div>
        <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
          {file.headers.map((h) => (
            <div key={h} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
              <div className="text-xs text-slate-700 dark:text-slate-200 truncate font-medium">
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
                {Object.entries(FIELD_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
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
                    <th
                      key={h}
                      className="text-left px-2 py-1.5 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap"
                    >
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
                      <td
                        key={h}
                        className="px-2 py-1 text-slate-600 dark:text-slate-300 whitespace-nowrap max-w-[180px] truncate"
                      >
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
// ResultView : bilan apres import
// -----------------------------------------------------------------------------
function ResultView({
  result,
  onReset,
}: {
  result: { ok: number; skipped: number; errors: string[] };
  onReset: () => void;
}) {
  const hasErrors = result.errors.length > 0;
  return (
    <div className="space-y-4">
      <div
        className={`flex items-start gap-3 p-4 rounded-xl ${
          hasErrors
            ? "bg-amber-50 dark:bg-amber-950/30"
            : "bg-emerald-50 dark:bg-emerald-950/30"
        }`}
      >
        {hasErrors ? (
          <AlertTriangle size={22} className="text-amber-600 flex-shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 size={22} className="text-emerald-600 flex-shrink-0 mt-0.5" />
        )}
        <div className="text-sm">
          <div className="font-semibold text-slate-900 dark:text-slate-100">
            {result.ok} compte{result.ok > 1 ? "s" : ""} importé{result.ok > 1 ? "s" : ""}
          </div>
          {result.skipped > 0 && (
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {result.skipped} ligne{result.skipped > 1 ? "s" : ""} ignorée{result.skipped > 1 ? "s" : ""} (raison sociale manquante)
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
              <div key={i} className="text-red-600 dark:text-red-400">
                {e}
              </div>
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
