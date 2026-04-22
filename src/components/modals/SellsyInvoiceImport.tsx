import { useMemo, useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, Info } from "lucide-react";
import { Modal } from "@/components/ui/overlays";
import { Button } from "@/components/ui/Button";
import { Badge, Select } from "@/components/ui/primitives";
import { ImportProgress, type ImportProgressState } from "@/components/ui/ImportProgress";
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
import type { Account, Invoice, InvoiceStatus } from "@/types";

// -----------------------------------------------------------------------------
// Mapping
// -----------------------------------------------------------------------------

type FieldKey =
  | "numero"
  | "dateEmission"
  | "dateEcheance"
  | "datePaiement"
  | "raisonSociale"
  | "montantHT"
  | "montantTVA"
  | "montantTTC"
  | "statut"
  | "libelle"
  | "quantite"
  | "prixUnitHT"
  | "totalLigneHT"
  | "adresse"
  | "codePostal"
  | "ville"
  | "telephone"
  | "email"
  | "__ignore__";

const FIELD_LABELS: Record<Exclude<FieldKey, "__ignore__">, string> = {
  numero: "Numéro de facture *",
  dateEmission: "Date d'émission *",
  dateEcheance: "Date d'échéance",
  datePaiement: "Date de paiement",
  raisonSociale: "Client (raison sociale) *",
  montantHT: "Montant HT *",
  montantTVA: "Montant TVA",
  montantTTC: "Montant TTC",
  statut: "Statut",
  libelle: "Libellé / Désignation (ligne)",
  quantite: "Quantité (ligne)",
  prixUnitHT: "Prix unitaire HT (ligne)",
  totalLigneHT: "Total HT de la ligne",
  adresse: "Adresse client",
  codePostal: "Code postal client",
  ville: "Ville client",
  telephone: "Téléphone client",
  email: "Email client",
};

const HEADER_HINTS: Record<Exclude<FieldKey, "__ignore__">, string[]> = {
  numero: ["numero facture", "numero de facture", "n facture", "num facture", "numero", "reference", "reference facture", "invoice number"],
  dateEmission: ["date emission", "date facturation", "date facture", "date d'emission", "issued", "cree le"],
  dateEcheance: ["date echeance", "echeance", "date d'echeance", "due date"],
  datePaiement: ["date paiement", "date de paiement", "paye le", "payment date", "paid at"],
  raisonSociale: ["raison sociale", "client", "nom client", "societe", "company", "destinataire"],
  montantHT: ["montant ht total", "total general ht", "montant ht", "total ht", "amount ht"],
  montantTVA: ["montant tva total", "montant tva", "total tva", "tva", "amount tax", "vat"],
  montantTTC: ["montant ttc total", "total general ttc", "montant ttc", "total ttc", "ttc", "amount ttc", "total"],
  statut: ["statut", "etat", "status", "payee", "paye"],
  libelle: ["designation", "libelle", "description", "produit", "article", "intitule", "item"],
  quantite: ["quantite", "qte", "qty", "quantity"],
  prixUnitHT: ["prix unitaire ht", "prix unit ht", "pu ht", "unit price ht", "tarif unitaire"],
  totalLigneHT: ["total ligne ht", "total ligne", "sous total ligne", "line total"],
  adresse: ["adresse 1", "adresse", "address", "rue", "street"],
  codePostal: ["code postal client", "code postal", "code_postal", "cp", "zip", "postal code"],
  ville: ["ville client", "ville", "city", "commune"],
  telephone: ["telephone client", "tel client", "telephone", "tel.", "tel ", "phone"],
  email: ["email client", "e-mail client", "email", "courriel"],
};

function mapStatut(raw: string, datePaiement: string | null): InvoiceStatus {
  // Si date de paiement renseignee, c'est paye peu importe le statut brut
  if (datePaiement) return "payee";
  const n = normalize(raw);
  if (!n) return "emise";
  if (/paye|paid|regl|encaisse/.test(n)) return "payee";
  if (/litige|contest|dispute/.test(n)) return "litige";
  if (/retard|impay|overdue|en retard/.test(n)) return "retard";
  if (/emise|envoy|sent|attente/.test(n)) return "emise";
  if (/brouillon|draft/.test(n)) return "brouillon";
  return "emise";
}

// -----------------------------------------------------------------------------
// Composant
// -----------------------------------------------------------------------------

interface Props {
  open: boolean;
  accounts: Account[];
  onClose: () => void;
  onImported: (result: { invoices: Invoice[]; newAccounts: Account[] }) => void;
}

type ImportResult = {
  ok: number;
  skipped: number;
  createdAccounts: number;
  errors: string[];
};

export function SellsyInvoiceImport({ open, accounts, onClose, onImported }: Props) {
  const { currentCommercial } = useAuth();
  const [file, setFile] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Record<string, FieldKey>>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgressState>({ done: 0, total: 0 });
  const [result, setResult] = useState<ImportResult | null>(null);

  const missingRequired = useMemo(() => {
    const vals = Object.values(mapping);
    const missing: string[] = [];
    if (!vals.includes("numero")) missing.push("Numéro de facture");
    if (!vals.includes("raisonSociale")) missing.push("Client (raison sociale)");
    if (!vals.includes("dateEmission")) missing.push("Date d'émission");
    const hasLibelle = vals.includes("libelle");
    const hasPrixOuTotal = vals.includes("prixUnitHT") || vals.includes("totalLigneHT");
    const detailMode = hasLibelle && hasPrixOuTotal;
    if (!detailMode && !vals.includes("montantHT")) missing.push("Montant HT");
    return missing;
  }, [mapping]);

  const stats = useMemo(() => {
    if (!file) return { nbFactures: 0, nbLignes: 0, isDetail: false };
    const numCol = Object.entries(mapping).find(([, f]) => f === "numero")?.[0];
    if (!numCol) return { nbFactures: 0, nbLignes: file.rows.length, isDetail: false };
    const uniq = new Set<string>();
    for (const r of file.rows) {
      const v = r[numCol];
      if (v !== null && v !== undefined && String(v).trim()) uniq.add(String(v).trim());
    }
    return { nbFactures: uniq.size, nbLignes: file.rows.length, isDetail: file.rows.length > uniq.size };
  }, [file, mapping]);

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
    if (!file) return;
    setImporting(true);
    const errors: string[] = [];
    let ok = 0;
    let skipped = 0;
    let createdAccounts = 0;
    let totalLignesDetail = 0;
    const imported: Invoice[] = [];
    const newAccounts: Account[] = [];
    const accountsPool: Account[] = [...accounts];

    const getCol = (row: Record<string, unknown>, field: FieldKey): string => {
      const col = Object.entries(mapping).find(([, f]) => f === field)?.[0];
      if (!col) return "";
      const v = row[col];
      return v === null || v === undefined ? "" : String(v).trim();
    };

    // Regroupement par numero (detail -> plusieurs lignes par numero)
    const groups = new Map<string, Record<string, unknown>[]>();
    for (const row of file.rows) {
      const numero = getCol(row, "numero");
      if (!numero) {
        skipped++;
        continue;
      }
      if (!groups.has(numero)) groups.set(numero, []);
      groups.get(numero)!.push(row);
    }

    const mapped = Object.values(mapping);
    const hasLibelle = mapped.includes("libelle");
    const hasPrixOuTotal = mapped.includes("prixUnitHT") || mapped.includes("totalLigneHT");

    setProgress({ done: 0, total: groups.size, current: "Préparation…" });
    let progressIdx = 0;
    for (const [numero, rows] of groups.entries()) {
      progressIdx++;
      setProgress({ done: progressIdx - 1, total: groups.size, current: `Facture ${numero}` });
      if (progressIdx % 3 === 0) await new Promise((r) => setTimeout(r, 0));
      const firstRow = rows[0];
      const raisonSociale = getCol(firstRow, "raisonSociale");
      const dateEmission = parseDateAny(getCol(firstRow, "dateEmission"));

      if (!raisonSociale || !dateEmission) {
        skipped += rows.length;
        continue;
      }

      try {
        const hints = {
          adresse: getCol(firstRow, "adresse"),
          codePostal: getCol(firstRow, "codePostal"),
          ville: getCol(firstRow, "ville"),
          telephone: getCol(firstRow, "telephone"),
          email: getCol(firstRow, "email"),
        };
        const resolved = useDemoData
          ? { account: accountsPool[0] ?? ({ id: "demo" } as Account), created: false }
          : await resolveOrCreateAccount(raisonSociale, accountsPool, hints);
        if (!resolved) {
          skipped += rows.length;
          continue;
        }
        if (resolved.created) {
          accountsPool.push(resolved.account);
          newAccounts.push(resolved.account);
          createdAccounts++;
        }

        // Construire les lignes si colonnes ligne mappees
        const lignesDetail: { id: string; libelle: string; quantite: number; prixAchatHT: number; prixVenteHT: number }[] = [];
        if (hasLibelle && hasPrixOuTotal) {
          for (const r of rows) {
            const libelle = getCol(r, "libelle");
            if (!libelle) continue;
            const quantite = parseNumberFR(getCol(r, "quantite")) || 1;
            const puht = parseNumberFR(getCol(r, "prixUnitHT"));
            const totalHT = parseNumberFR(getCol(r, "totalLigneHT"));
            const prix = puht > 0 ? puht : quantite > 0 ? totalHT / quantite : 0;
            lignesDetail.push({
              id: crypto.randomUUID(),
              libelle,
              quantite,
              prixAchatHT: 0,
              prixVenteHT: prix,
            });
          }
          totalLignesDetail += lignesDetail.length;
        }

        // Montants : ceux fournis ou recalcules depuis les lignes
        let montantHT = parseNumberFR(getCol(firstRow, "montantHT"));
        const montantTVA = parseNumberFR(getCol(firstRow, "montantTVA"));
        let montantTTC = parseNumberFR(getCol(firstRow, "montantTTC"));
        if (montantHT === 0 && lignesDetail.length > 0) {
          montantHT = lignesDetail.reduce((s, l) => s + l.prixVenteHT * l.quantite, 0);
        }
        if (montantTTC === 0 && montantHT > 0) {
          montantTTC = montantHT + (montantTVA > 0 ? montantTVA : montantHT * 0.2);
        }

        const datePaiement = parseDateAny(getCol(firstRow, "datePaiement"));
        const dateEcheance =
          parseDateAny(getCol(firstRow, "dateEcheance")) ??
          new Date(new Date(dateEmission).getTime() + 30 * 86400000).toISOString().slice(0, 10);

        const statut = mapStatut(getCol(firstRow, "statut"), datePaiement);

        const payload: Omit<Invoice, "id"> = {
          numero,
          accountId: resolved.account.id,
          commercialId: currentCommercial?.id,
          montantHT,
          montantTVA: montantTVA > 0 ? montantTVA : Math.max(0, montantTTC - montantHT),
          montantTTC,
          status: statut,
          type: "ponctuelle",
          dateEmission,
          dateEcheance,
          datePaiement: datePaiement ?? undefined,
          lignes: lignesDetail,
        };

        let saved: Invoice;
        if (useDemoData) {
          saved = { ...payload, id: `demo_f_${Date.now()}_${ok}` };
        } else {
          saved = await db.createInvoice(payload);
        }
        imported.push(saved);
        ok++;
      } catch (e) {
        errors.push(`Facture ${numero} : ${(e as Error).message}`);
      }
    }

    if (totalLignesDetail > 0) {
      errors.unshift(`${totalLignesDetail} ligne${totalLignesDetail > 1 ? "s" : ""} de détail importée${totalLignesDetail > 1 ? "s" : ""}.`);
    }

    setResult({ ok, skipped, createdAccounts, errors });
    setImporting(false);
    if (imported.length > 0 || newAccounts.length > 0) {
      onImported({ invoices: imported, newAccounts });
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
      title="Importer des factures depuis Sellsy"
      size="lg"
      footer={
        <>
          <div className="flex-1 text-[11px] text-slate-500">
            Formats : <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong>. Export Sellsy → Factures → <em>Exporter</em>.
          </div>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }} disabled={importing}>
            {result ? "Fermer" : "Annuler"}
          </Button>
          {file && !result && (
            <Button
              variant="primary"
              icon={ArrowRight}
              onClick={doImport}
              disabled={importing || missingRequired.length > 0}
            >
              {importing ? "Import…" : `Importer ${stats.nbFactures || file.rows.length} factures`}
            </Button>
          )}
        </>
      }
    >
      {!file ? (
        <DropZone onFile={handleFile} />
      ) : importing ? (
        <ImportProgress state={progress} />
      ) : result ? (
        <ResultView result={result} onReset={reset} />
      ) : (
        <MappingView
          file={file}
          mapping={mapping}
          setMapping={setMapping}
          missingRequired={missingRequired}
          stats={stats}
        />
      )}
    </Modal>
  );
}

// -----------------------------------------------------------------------------
// Sous-composants
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
            Déposer un export Sellsy (factures)
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
          <strong>Note :</strong> l'import PDF n'est pas supporté. Depuis Sellsy : <em>Documents → Factures → Exporter</em> (colonnes recommandées : Numéro, Date émission, Date échéance, Raison sociale, Montant HT, TVA, TTC, Statut, Date paiement).
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
  stats,
}: {
  file: ParsedFile;
  mapping: Record<string, FieldKey>;
  setMapping: React.Dispatch<React.SetStateAction<Record<string, FieldKey>>>;
  missingRequired: string[];
  stats: { nbFactures: number; nbLignes: number; isDetail: boolean };
}) {
  const preview = file.rows.slice(0, 5);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <FileSpreadsheet size={16} className="text-[#C9A961]" />
        <span className="font-semibold">{file.filename}</span>
        <Badge tone="slate">{stats.nbFactures} factures</Badge>
        {stats.isDetail && (
          <Badge tone="gold">Export détaillé : {stats.nbLignes} lignes</Badge>
        )}
      </div>
      {stats.isDetail && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs">
          <Info size={14} className="flex-shrink-0 mt-0.5" />
          <div>
            <strong>Export détaillé détecté</strong> : lignes de produits reconstruites depuis les colonnes <em>Libellé / Quantité / Prix unit HT</em>.
          </div>
        </div>
      )}

      {missingRequired.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <div>
            Colonnes manquantes : <strong>{missingRequired.join(", ")}</strong>.
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
            {result.ok} facture{result.ok > 1 ? "s" : ""} importée{result.ok > 1 ? "s" : ""}
          </div>
          {result.createdAccounts > 0 && (
            <div className="text-xs text-slate-600 dark:text-slate-400">
              + {result.createdAccounts} compte{result.createdAccounts > 1 ? "s" : ""} client créé{result.createdAccounts > 1 ? "s" : ""} automatiquement.
            </div>
          )}
          {result.skipped > 0 && (
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {result.skipped} ligne{result.skipped > 1 ? "s" : ""} ignorée{result.skipped > 1 ? "s" : ""} (numéro, client ou date vide).
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
