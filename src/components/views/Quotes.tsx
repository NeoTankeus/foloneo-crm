import { useEffect, useMemo, useState } from "react";
import { Plus, Search, FileText, Copy, Eye, Send, CheckCircle2 } from "lucide-react";
import { Card, Input, Select, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/overlays";
import { QuoteWizard } from "@/components/wizard/QuoteWizard";
import { PrintView } from "@/components/PrintView";
import { calcDevisTotaux } from "@/lib/calculations";
import { fmtEUR, fmtDate, upsertById, uid } from "@/lib/helpers";
import { useDemoData } from "@/lib/supabase";
import * as db from "@/lib/db";
import type { AppState, Settings, Quote, QuoteStatus } from "@/types";

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  settings: Settings;
  openWizardSignal?: number;
}

const STATUS_LABELS: Record<QuoteStatus, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  signe_achat: "Signé Achat",
  signe_leasing: "Signé Leasing",
  perdu: "Perdu",
};

export function QuotesView({ state, setState, settings, openWizardSignal }: Props) {
  const [wizard, setWizard] = useState<{ open: boolean; quote: Quote | null }>({
    open: false,
    quote: null,
  });
  useEffect(() => {
    if (openWizardSignal && openWizardSignal > 0) {
      setWizard({ open: true, quote: null });
    }
  }, [openWizardSignal]);
  const [preview, setPreview] = useState<{ quote: Quote; mode: "achat" | "leasing" } | null>(null);
  const [search, setSearch] = useState<string>("");
  const [status, setStatus] = useState<QuoteStatus | "all">("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.quotes.filter((quote) => {
      if (status !== "all" && quote.status !== status) return false;
      if (q) {
        const acc = state.accounts.find((a) => a.id === quote.accountId);
        const hay = `${quote.numero} ${acc?.raisonSociale ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [state.quotes, state.accounts, search, status]);

  async function duplicate(q: Quote) {
    const year = new Date().getFullYear();
    let numero = `DEV-${year}-DUP-${Math.floor(Math.random() * 9999)}`;
    try {
      numero = await db.nextQuoteNumero();
    } catch {
      /* fallback */
    }
    const copy: Quote = {
      ...q,
      id: useDemoData ? uid("q") : "",
      numero,
      status: "brouillon",
      formuleChoisie: null,
      createdAt: new Date().toISOString(),
      sentAt: undefined,
      signedAt: undefined,
      lignes: q.lignes.map((l) => ({ ...l, id: uid("ql") })),
    };
    setWizard({ open: true, quote: copy });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (numéro, client)…"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as QuoteStatus | "all")}
          className="sm:max-w-[180px]"
        >
          <option value="all">Tous statuts</option>
          <option value="brouillon">Brouillons</option>
          <option value="envoye">Envoyés</option>
          <option value="signe_achat">Signés Achat</option>
          <option value="signe_leasing">Signés Leasing</option>
          <option value="perdu">Perdus</option>
        </Select>
        <Button
          variant="gold"
          icon={Plus}
          onClick={() => setWizard({ open: true, quote: null })}
        >
          Nouveau devis
        </Button>
      </div>

      <div className="text-xs text-slate-500">
        {filtered.length} devis
        {filtered.length !== state.quotes.length && ` / ${state.quotes.length}`}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={FileText}
            title="Aucun devis"
            description={search || status !== "all" ? "Aucun résultat avec ces filtres." : "Crée ton premier devis pour démarrer."}
            action={
              <Button
                variant="primary"
                icon={Plus}
                size="sm"
                onClick={() => setWizard({ open: true, quote: null })}
              >
                Créer un devis
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((q) => {
            const acc = state.accounts.find((a) => a.id === q.accountId);
            const com = state.commerciaux.find((c) => c.id === q.commercialId);
            const totaux = calcDevisTotaux(q, settings, state.products);
            const tone =
              q.status === "signe_achat"
                ? "emerald"
                : q.status === "signe_leasing"
                  ? "gold"
                  : q.status === "envoye"
                    ? "violet"
                    : q.status === "perdu"
                      ? "red"
                      : "slate";
            return (
              <Card key={q.id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {q.numero}
                      </div>
                      <Badge tone={tone}>{STATUS_LABELS[q.status]}</Badge>
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {acc?.raisonSociale ?? "—"}
                      {com && ` · ${com.prenom} ${com.nom}`}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Créé {fmtDate(q.createdAt)}
                      {q.sentAt && ` · envoyé ${fmtDate(q.sentAt)}`}
                      {q.signedAt && ` · signé ${fmtDate(q.signedAt)}`}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-lg text-[#0B1E3F] dark:text-[#C9A961] tabular-nums">
                      {fmtEUR(totaux.totalHT)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      ou {fmtEUR(totaux.mensualiteTotale)}/mois
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button
                    variant="ghost"
                    icon={Eye}
                    size="sm"
                    onClick={() => setPreview({ quote: q, mode: "achat" })}
                  >
                    PDF Achat
                  </Button>
                  <Button
                    variant="ghost"
                    icon={Eye}
                    size="sm"
                    onClick={() => setPreview({ quote: q, mode: "leasing" })}
                  >
                    PDF Leasing
                  </Button>
                  <Button
                    variant="ghost"
                    icon={Copy}
                    size="sm"
                    onClick={() => duplicate(q)}
                  >
                    Dupliquer
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="primary"
                    size="sm"
                    icon={q.status === "brouillon" ? Send : CheckCircle2}
                    onClick={() => setWizard({ open: true, quote: q })}
                  >
                    Modifier
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <QuoteWizard
        open={wizard.open}
        quote={wizard.quote}
        state={state}
        setState={setState}
        settings={settings}
        onClose={() => setWizard({ open: false, quote: null })}
        onSaved={(q) => setState((s) => ({ ...s, quotes: upsertById(s.quotes, q) }))}
      />

      {preview && (
        <PrintView
          open
          quote={preview.quote}
          state={state}
          settings={settings}
          mode={preview.mode}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
