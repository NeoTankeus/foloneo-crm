import { useMemo, useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, Info } from "lucide-react";
import { Modal } from "@/components/ui/overlays";
import { Button } from "@/components/ui/Button";
import { Badge, Select } from "@/components/ui/primitives";
import { useAuth } from "@/hooks/useAuth";
import * as db from "@/lib/db";
import { useDemoData } from "@/lib/supabase";
import {
  autoDetectMapping,
  normalize,
  parseDateAny,
  parseNumberFR,
  parseSpreadsheet,
  resolveOrCreateAccount,
  type ParsedFile,
} from "@/lib/sellsy-import-utils";
import type { Account, Quote, QuoteStatus } from "@/types";

// -----------------------------------------------------------------------------
// Mapping colonnes Sellsy -> champs Quote
// -----------------------------------------------------------------------------

type FieldKey =
  | "numero"
  | "dateEmission"
  | "raisonSociale"
  | "montantHT"
  | "montantTTC"
  | "statut"
  | "__ignore__";

const FIELD_LABELS: Record<Exclude<FieldKey, "__ignore__">, string> = {
  numero: "Numéro du devis *",
  dateEmission: "Date d'émission",
  raisonSociale: "Client (raison sociale) *",
  montantHT: "Montant HT *",
  montantTTC: "Montant TTC",
  statut: "Statut",
};

// Synonymes pour auto-detection (FR + EN). Ordre : plus specifique d'abord.
const HEADER_HINTS: Record<Exclude<FieldKey, "__ignore__">, string[]> = {
  numero: ["numero devis", "numero de devis", "n devis", "num devis", "numero", "reference", "reference devis", "number"],
  dateEmission: ["date emission", "date creation", "date d'emission", "date", "issued", "cree le"],
  raisonSociale: ["raison sociale", "client", "nom client", "societe", "company"],
  montantHT: ["montant ht", "total ht", "ht", "amount ht", "base ht"],
  montantTTC: ["montant ttc", "total ttc", "ttc", "amount ttc"],
  statut: ["statut", "etat", "status"],
};

// Map un statut Sellsy vers notre QuoteStatus. Valeurs robustes au francais.
function mapStatut(raw: string): QuoteStatus {
  const n = normalize(raw);
  if (!n) return "brouillon";
  if (/perdu|refuse|annule|rejete|decline/.test(n)) return "perdu";
  if (/leasing/.test(n) && /signe|accept|valide|gagne/.test(n)) return "signe_leasing";
  if (/signe|accept|valide|gagne|paye/.test(n)) return "signe_achat";
  if (/envoy|sent|attente|en cours|en attente/.test(n)) return "envoye";
  return "brouillon";
}

// -----------------------------------------------------------------------------
// Composant
// -----------------------------------------------------------------------------

interface Props {
  open: boolean;
  accounts: Account[];
  onClose: () => void;
  // Appele avec la liste des devis crees + les nouveaux comptes (pour upsert UI)
  onImported: (result: { quotes: Quote[]; newAccounts: Account[] }) => void;
}

type ImportResult = {
  ok: number;
  skipped: number;
  createdAccounts: number;
  errors: string[];
};

export function SellsyQuoteImport({ open, accounts, onClose, onImported }: Props) {
  const { currentCommercial } = useAuth();
  const [file, setFile] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Record<string, FieldKey>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const missingRequired = useMemo(() => {
    const vals = Object.values(mapping);
    const missing: string[] = [];
    if (!vals.includes("numero")) missing.push("Numéro du devis");
    if (!vals.includes("raisonSociale")) missing.push("Client (raison sociale)");
    if (!vals.includes("montantHT")) missing.push("Montant HT");
    return missing;
  }, [mapping]);

  async function handleFile(f: File) {
    setResult(null);
    try {
      const parsed = await parseSpreadsheet(f);
      setFile(parsed);
      setMapping(autoDetectMapping<Exclude<FieldKey, "__ignore__">>(parsed.headers, HEADER_HINTS));
    } catch (e) {
      setResult({
        ok: 0,
        skipped: 0,
        createdAccounts: 0,
        errors: [`Lecture impossible : ${(e as Error).message}`],
      });
    }
  }

  async function doImport() {
    if (!file || !currentCommercial) return;
    setImporting(true);
    const errors: string[] = [];
    let ok = 0;
    let skipped = 0;
    let createdAccounts = 0;
    const importedQuotes: Quote[] = [];
    const newAccounts: Account[] = [];

    // Pool de comptes qui grandit au fil de l'import pour eviter les doublons
    // (si 2 devis Sellsy pour le meme client nouveau, un seul compte cree)
    const accountsPool: Account[] = [...accounts];

    const getCol = (row: Record<string, unknown>, field: FieldKey): string => {
      const col = Object.entries(mapping).find(([, f]) => f === field)?.[0];
      if (!col) return "";
      const v = row[col];
      return v === null || v === undefined ? "" : String(v).trim();
    };

    for (let i = 0; i < file.rows.length; i++) {
      const row = file.rows[i];
      const numero = getCol(row, "numero");
      const raisonSociale = getCol(row, "raisonSociale");
      const montantHT = parseNumberFR(getCol(row, "montantHT"));

      if (!numero || !raisonSociale) {
        skipped++;
        continue;
      }
      if (montantHT <= 0) {
        // On tolere montant nul (devis brouillon) mais on prefere signaler
        errors.push(`Ligne ${i + 2} (${numero}) : montant HT nul ou illisible — devis importé à 0 €.`);
      }

      try {
        // 1. Resoudre / creer le compte
        const resolved = useDemoData
          ? { account: accountsPool[0] ?? ({ id: "demo" } as Account), created: false }
          : await resolveOrCreateAccount(raisonSociale, accountsPool);
        if (!resolved) {
          errors.push(`Ligne ${i + 2} (${numero}) : raison sociale vide.`);
          skipped++;
          continue;
        }
        if (resolved.created) {
          accountsPool.push(resolved.account);
          newAccounts.push(resolved.account);
          createdAccounts++;
        }

        // 2. Construire la ligne synthetique pour preserver le total
        const ligneSynthetique = {
          id: crypto.randomUUID(),
          libelle: `Devis importé depuis Sellsy — ${numero}`,
          quantite: 1,
          prixAchatHT: 0,
          prixVenteHT: montantHT,
        };

        const statut = mapStatut(getCol(row, "statut"));
        const dateIso = parseDateAny(getCol(row, "dateEmission"));

        const payload: Omit<Quote, "id" | "createdAt"> = {
          numero,
          accountId: resolved.account.id,
          commercialId: currentCommercial.id,
          lignes: [ligneSynthetique],
          heuresMO: 0,
          tauxMO: 65,
          fraisDeplacement: 0,
          modeAchat: { maintenance: "confort" },
          modeLeasing: { duree: 48 },
          status: statut,
          formuleChoisie: null,
          sentAt: statut !== "brouillon" && dateIso ? dateIso : undefined,
          signedAt: /signe/.test(statut) && dateIso ? dateIso : undefined,
        };

        let saved: Quote;
        if (useDemoData) {
          saved = {
            ...payload,
            id: `demo_q_${Date.now()}_${i}`,
            createdAt: dateIso ?? new Date().toISOString(),
          };
        } else {
          saved = await db.createQuote(payload);
        }
        importedQuotes.push(saved);
        ok++;
      } catch (e) {
        errors.push(`Ligne ${i + 2} (${numero || "?"}) : ${(e as Error).message}`);
      }
    }

    setResult({ ok, skipped, createdAccounts, errors });
    setImporting(false);
    if (importedQuotes.length > 0 || newAccounts.length > 0) {
      onImported({ quotes: importedQuotes, newAccounts });
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
        reset();
        onClose();
      }}
      title="Importer des devis depuis Sellsy"
      size="lg"
      footer={
        <>
          <div className="flex-1 text-[11px] text-slate-500">
            Formats : <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong>. Export Sellsy → Devis → <em>Exporter</em>.
          </div>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }} disabled={importing}>
            {result ? "Fermer" : "Annuler"}
          </Button>
          {file && !result && (
            <Button
              variant="primary"
              icon={ArrowRight}
              onClick={doImport}
              disabled={importing || missingRequired.length > 0 || !currentCommercial}
            >
              {importing ? "Import…" : `Importer ${file.rows.length} devis`}
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
          missingRequired={missingRequired}
        />
      )}
    </Modal>
  );
}

// -----------------------------------------------------------------------------
// Sous-composants (DropZone / MappingView / ResultView)
// -----------------------------------------------------------------------------

function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <div className="space-y-3">
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
            Déposer un export Sellsy (devis)
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
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 text-xs">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <div>
          <strong>Note :</strong> l'import PDF n'est pas supporté (extraction non fiable). Depuis Sellsy, va dans <em>Documents → Devis → Exporter</em> pour générer un fichier Excel avec toutes les colonnes.
        </div>
      </div>
    </div>
  );
}

function MappingView({
  file,
  mapping,
  setMapping,
  missingRequired,
}: {
  file: ParsedFile;
  mapping: Record<string, FieldKey>;
  setMapping: React.Dispatch<React.SetStateAction<Record<string, FieldKey>>>;
  missingRequired: string[];
}) {
  const preview = file.rows.slice(0, 5);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <FileSpreadsheet size={16} className="text-[#C9A961]" />
        <span className="font-semibold">{file.filename}</span>
        <Badge tone="slate">{file.rows.length} devis</Badge>
      </div>

      {missingRequired.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <div>
            Colonnes manquantes : <strong>{missingRequired.join(", ")}</strong>.
            Sélectionnez-les dans les dropdowns ci-dessous.
          </div>
        </div>
      )}

      <div>
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
          Correspondance des colonnes
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
                  <option key={k} value={k}>{label}</option>
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

function ResultView({ result, onReset }: { result: ImportResult; onReset: () => void }) {
  const hasErrors = result.errors.length > 0;
  return (
    <div className="space-y-4">
      <div className={`flex items-start gap-3 p-4 rounded-xl ${hasErrors ? "bg-amber-50 dark:bg-amber-950/30" : "bg-emerald-50 dark:bg-emerald-950/30"}`}>
        {hasErrors ? (
          <AlertTriangle size={22} className="text-amber-600 flex-shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 size={22} className="text-emerald-600 flex-shrink-0 mt-0.5" />
        )}
        <div className="text-sm space-y-1">
          <div className="font-semibold text-slate-900 dark:text-slate-100">
            {result.ok} devis importé{result.ok > 1 ? "s" : ""}
          </div>
          {result.createdAccounts > 0 && (
            <div className="text-xs text-slate-600 dark:text-slate-400">
              + {result.createdAccounts} compte{result.createdAccounts > 1 ? "s" : ""} client créé{result.createdAccounts > 1 ? "s" : ""} automatiquement.
            </div>
          )}
          {result.skipped > 0 && (
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {result.skipped} ligne{result.skipped > 1 ? "s" : ""} ignorée{result.skipped > 1 ? "s" : ""} (numéro ou client vide).
            </div>
          )}
        </div>
      </div>
      {hasErrors && (
        <div>
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
            Notes / erreurs ({result.errors.length})
          </div>
          <div className="max-h-[220px] overflow-y-auto text-xs space-y-1 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg">
            {result.errors.map((e, i) => (
              <div key={i} className="text-amber-700 dark:text-amber-400">{e}</div>
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
