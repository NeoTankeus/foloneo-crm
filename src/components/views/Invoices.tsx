import { useMemo, useState } from "react";
import { Plus, Search, Receipt, Download, FileText, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { Card, Input, Select, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { Stat, EmptyState } from "@/components/ui/overlays";
import { InvoiceEditor } from "@/components/modals/InvoiceEditor";
import { SellsyInvoiceImport } from "@/components/modals/SellsyInvoiceImport";
import { calcDevisTotaux } from "@/lib/calculations";
import {
  fmtEUR,
  fmtDate,
  daysUntil,
  upsertById,
  removeById,
  downloadFile,
  uid,
} from "@/lib/helpers";
import { useDemoData } from "@/lib/supabase";
import { celebrate } from "@/lib/celebrate";
import * as db from "@/lib/db";
import type { AppState, Invoice, InvoiceStatus, Quote, Settings } from "@/types";

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  settings: Settings;
}

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  brouillon: "Brouillon",
  emise: "Émise",
  payee: "Payée",
  retard: "En retard",
  litige: "Litige",
};

const STATUS_TONES: Record<InvoiceStatus, "slate" | "blue" | "emerald" | "red" | "amber"> = {
  brouillon: "slate",
  emise: "blue",
  payee: "emerald",
  retard: "red",
  litige: "amber",
};

export function InvoicesView({ state, setState, settings }: Props) {
  const [editor, setEditor] = useState<{ open: boolean; invoice: Invoice | null }>({
    open: false,
    invoice: null,
  });
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState<string>("");
  const [status, setStatus] = useState<InvoiceStatus | "all">("all");

  const kpis = useMemo(() => {
    const caEmis = state.invoices
      .filter((f) => f.status !== "brouillon")
      .reduce((s, f) => s + f.montantHT, 0);
    const encaisse = state.invoices
      .filter((f) => f.status === "payee")
      .reduce((s, f) => s + f.montantTTC, 0);
    const aEncaisser = state.invoices
      .filter((f) => f.status === "emise" || f.status === "retard")
      .reduce((s, f) => s + f.montantTTC, 0);
    const retards = state.invoices.filter((f) => f.status === "retard").length;
    return { caEmis, encaisse, aEncaisser, retards };
  }, [state.invoices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.invoices.filter((f) => {
      if (status !== "all" && f.status !== status) return false;
      if (q) {
        const acc = state.accounts.find((a) => a.id === f.accountId);
        const hay = `${f.numero} ${acc?.raisonSociale ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [state.invoices, state.accounts, search, status]);

  const quotesSansFacture = useMemo(() => {
    const invoicedQuoteIds = new Set(state.invoices.map((f) => f.quoteId).filter(Boolean));
    return state.quotes.filter(
      (q) =>
        (q.status === "signe_achat" || q.status === "signe_leasing") &&
        !invoicedQuoteIds.has(q.id)
    );
  }, [state.invoices, state.quotes]);

  async function createFromQuote(q: Quote) {
    const totaux = calcDevisTotaux(q, settings, state.products);
    let numero = `FA-${new Date().getFullYear()}-NEW`;
    try {
      numero = await db.nextInvoiceNumero();
    } catch {
      /* fallback */
    }
    const today = new Date().toISOString().slice(0, 10);
    const echeance = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const base: Omit<Invoice, "id"> = {
      numero,
      quoteId: q.id,
      accountId: q.accountId,
      commercialId: q.commercialId,
      montantHT: +totaux.totalHT.toFixed(2),
      montantTVA: +totaux.totalTVA.toFixed(2),
      montantTTC: +totaux.totalTTC.toFixed(2),
      status: "emise",
      type: q.status === "signe_leasing" ? "recurrente" : "ponctuelle",
      dateEmission: today,
      dateEcheance: echeance,
      lignes: q.lignes,
    };
    try {
      const saved: Invoice = useDemoData
        ? { ...base, id: uid("inv") }
        : await db.createInvoice(base);
      setState((s) => ({ ...s, invoices: upsertById(s.invoices, saved) }));
      celebrate("facture");
    } catch (e) {
      console.error(e);
      window.alert("Erreur lors de la création de la facture");
    }
  }

  function exportCsv() {
    const header = [
      "Numero",
      "DateEmission",
      "DateEcheance",
      "DatePaiement",
      "Client",
      "MontantHT",
      "MontantTVA",
      "MontantTTC",
      "Statut",
      "Type",
    ];
    const rows = state.invoices.map((f) => {
      const acc = state.accounts.find((a) => a.id === f.accountId);
      return [
        f.numero,
        f.dateEmission,
        f.dateEcheance,
        f.datePaiement ?? "",
        (acc?.raisonSociale ?? "").replace(/;/g, ","),
        f.montantHT.toFixed(2),
        f.montantTVA.toFixed(2),
        f.montantTTC.toFixed(2),
        STATUS_LABELS[f.status],
        f.type,
      ];
    });
    const csv = [header, ...rows].map((r) => r.join(";")).join("\n");
    const filename = `factures-foloneo-${new Date().toISOString().slice(0, 10)}.csv`;
    // BOM UTF-8 pour Excel
    downloadFile("\uFEFF" + csv, filename, "text/csv;charset=utf-8");
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="CA émis HT" value={fmtEUR(kpis.caEmis)} icon={Receipt} tone="navy" />
        <Stat label="Encaissé TTC" value={fmtEUR(kpis.encaisse)} icon={CheckCircle2} tone="emerald" />
        <Stat label="À encaisser" value={fmtEUR(kpis.aEncaisser)} icon={Receipt} tone="amber" />
        <Stat label="En retard" value={kpis.retards} icon={Receipt} tone="red" />
      </div>

      {/* Devis signés sans facture — action rapide */}
      {quotesSansFacture.length > 0 && (
        <Card className="p-4 border-l-4 border-[#C9A961]">
          <div className="text-sm font-semibold mb-2">
            Devis signés en attente de facturation ({quotesSansFacture.length})
          </div>
          <div className="space-y-1.5">
            {quotesSansFacture.slice(0, 5).map((q) => {
              const acc = state.accounts.find((a) => a.id === q.accountId);
              const totaux = calcDevisTotaux(q, settings, state.products);
              return (
                <div
                  key={q.id}
                  className="flex items-center gap-3 text-sm p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{q.numero}</span>{" "}
                    <span className="text-slate-500">· {acc?.raisonSociale}</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{fmtEUR(totaux.totalHT)} HT</span>
                  <Button
                    size="sm"
                    variant="gold"
                    icon={FileText}
                    onClick={() => createFromQuote(q)}
                  >
                    Facturer
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as InvoiceStatus | "all")}
          className="sm:max-w-[180px]"
        >
          <option value="all">Tous statuts</option>
          <option value="brouillon">Brouillons</option>
          <option value="emise">Émises</option>
          <option value="payee">Payées</option>
          <option value="retard">En retard</option>
          <option value="litige">Litige</option>
        </Select>
        <Button variant="outline" icon={Download} onClick={exportCsv} disabled={state.invoices.length === 0}>
          Export CSV
        </Button>
        <Button
          variant="outline"
          icon={FileSpreadsheet}
          onClick={() => setImportOpen(true)}
        >
          <span className="hidden sm:inline">Importer Sellsy</span>
          <span className="sm:hidden">Import</span>
        </Button>
        <Button
          variant="gold"
          icon={Plus}
          onClick={() => setEditor({ open: true, invoice: null })}
        >
          Nouvelle facture
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon={Receipt} title="Aucune facture" description="Aucun résultat." />
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((f) => {
            const acc = state.accounts.find((a) => a.id === f.accountId);
            const jours = daysUntil(f.dateEcheance);
            return (
              <Card
                key={f.id}
                hover
                onClick={() => setEditor({ open: true, invoice: f })}
                className="p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{f.numero}</span>
                      <Badge tone={STATUS_TONES[f.status]}>{STATUS_LABELS[f.status]}</Badge>
                      {f.type === "recurrente" && <Badge tone="gold">Récurrente</Badge>}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {acc?.raisonSociale ?? "—"}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Émise {fmtDate(f.dateEmission)} · échéance {fmtDate(f.dateEcheance)}
                      {f.status !== "payee" && f.status !== "brouillon" && (
                        <span className={jours < 0 ? "text-red-600" : ""}>
                          {" "}
                          · {jours < 0 ? `retard ${Math.abs(jours)}j` : `dans ${jours}j`}
                        </span>
                      )}
                      {f.datePaiement && ` · payée ${fmtDate(f.datePaiement)}`}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-lg tabular-nums">{fmtEUR(f.montantTTC)}</div>
                    <div className="text-[11px] text-slate-500">TTC</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <InvoiceEditor
        open={editor.open}
        invoice={editor.invoice}
        accounts={state.accounts}
        commerciaux={state.commerciaux}
        tva={settings.tva}
        onClose={() => setEditor({ open: false, invoice: null })}
        onSaved={(f) => setState((s) => ({ ...s, invoices: upsertById(s.invoices, f) }))}
        onDeleted={(id) =>
          setState((s) => ({ ...s, invoices: removeById(s.invoices, id) }))
        }
      />

      <SellsyInvoiceImport
        open={importOpen}
        accounts={state.accounts}
        onClose={() => setImportOpen(false)}
        onImported={({ invoices, newAccounts }) =>
          setState((s) => ({
            ...s,
            invoices: [...invoices, ...s.invoices],
            accounts: [...newAccounts, ...s.accounts],
          }))
        }
      />
    </div>
  );
}
