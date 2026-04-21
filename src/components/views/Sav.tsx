import { useMemo, useState } from "react";
import { Plus, Search, LifeBuoy, Mail, AlertCircle } from "lucide-react";
import { Card, Input, Select, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { Stat, EmptyState } from "@/components/ui/overlays";
import { SavEditor } from "@/components/modals/SavEditor";
import { fmtDate, daysAgo, upsertById, removeById } from "@/lib/helpers";
import type { AppState, Settings, SavTicket, SavStatus } from "@/types";

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  settings: Settings;
}

const STATUS_LABELS: Record<SavStatus, string> = {
  ouvert: "Ouvert",
  en_cours: "En cours",
  resolu: "Résolu",
};

const STATUS_TONES: Record<SavStatus, "red" | "amber" | "emerald"> = {
  ouvert: "red",
  en_cours: "amber",
  resolu: "emerald",
};

const PRIO_TONES: Record<
  NonNullable<SavTicket["priorite"]>,
  "slate" | "amber" | "red"
> = {
  basse: "slate",
  normale: "slate",
  haute: "amber",
  urgente: "red",
};

export function SavView({ state, setState, settings }: Props) {
  const [editor, setEditor] = useState<{ open: boolean; ticket: SavTicket | null }>({
    open: false,
    ticket: null,
  });
  const [search, setSearch] = useState<string>("");
  const [status, setStatus] = useState<SavStatus | "all">("all");

  const kpis = useMemo(() => {
    const ouverts = state.sav.filter((t) => t.status === "ouvert").length;
    const enCours = state.sav.filter((t) => t.status === "en_cours").length;
    const urgents = state.sav.filter((t) => t.priorite === "urgente" && t.status !== "resolu").length;
    return { ouverts, enCours, urgents };
  }, [state.sav]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.sav.filter((t) => {
      if (status !== "all" && t.status !== status) return false;
      if (q) {
        const acc = t.accountId ? state.accounts.find((a) => a.id === t.accountId) : null;
        // Recherche aussi sur le client ad-hoc (clientNom/clientTelephone/clientEmail)
        const hay = [
          t.objet,
          t.description,
          acc?.raisonSociale ?? "",
          t.clientNom ?? "",
          t.clientTelephone ?? "",
          t.clientEmail ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [state.sav, state.accounts, search, status]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Ouverts" value={kpis.ouverts} icon={LifeBuoy} tone="red" />
        <Stat label="En cours" value={kpis.enCours} icon={LifeBuoy} tone="amber" />
        <Stat label="Urgents" value={kpis.urgents} icon={AlertCircle} tone="red" />
        <Card className="p-4">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Contact SAV
          </div>
          <a
            href={`mailto:${settings.societe.sav}`}
            className="font-semibold text-[#0B1E3F] dark:text-[#C9A961] text-sm mt-1 flex items-center gap-1"
          >
            <Mail size={14} />
            {settings.societe.sav}
          </a>
          <div className="text-xs text-slate-500 mt-1">Adresse dédiée SAV</div>
        </Card>
      </div>

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
          onChange={(e) => setStatus(e.target.value as SavStatus | "all")}
          className="sm:max-w-[160px]"
        >
          <option value="all">Tous statuts</option>
          <option value="ouvert">Ouverts</option>
          <option value="en_cours">En cours</option>
          <option value="resolu">Résolus</option>
        </Select>
        <Button
          variant="gold"
          icon={Plus}
          onClick={() => setEditor({ open: true, ticket: null })}
        >
          Nouveau ticket
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon={LifeBuoy} title="Aucun ticket SAV" />
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const acc = t.accountId ? state.accounts.find((a) => a.id === t.accountId) : null;
            // Libelle client : soit la raison sociale rattachee, soit le nom ad-hoc
            const clientLabel = acc?.raisonSociale ?? t.clientNom ?? "—";
            const clientContact = [t.clientTelephone, t.clientEmail].filter(Boolean).join(" · ");
            return (
              <Card
                key={t.id}
                hover
                onClick={() => setEditor({ open: true, ticket: t })}
                className="p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                    <LifeBuoy size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {t.objet}
                      </div>
                      <Badge tone={STATUS_TONES[t.status]}>{STATUS_LABELS[t.status]}</Badge>
                      {t.priorite && t.priorite !== "normale" && (
                        <Badge tone={PRIO_TONES[t.priorite]}>{t.priorite}</Badge>
                      )}
                      {!acc && t.clientNom && (
                        <Badge tone="slate">client libre</Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {clientLabel}
                      {!acc && clientContact && (
                        <span className="text-slate-400"> · {clientContact}</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
                      {t.description}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Créé {fmtDate(t.createdAt)} · il y a {daysAgo(t.createdAt)}j
                      {t.resolvedAt && ` · résolu ${fmtDate(t.resolvedAt)}`}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <SavEditor
        open={editor.open}
        ticket={editor.ticket}
        accounts={state.accounts}
        onClose={() => setEditor({ open: false, ticket: null })}
        onSaved={(t) => setState((s) => ({ ...s, sav: upsertById(s.sav, t) }))}
        onDeleted={(id) => setState((s) => ({ ...s, sav: removeById(s.sav, id) }))}
      />
    </div>
  );
}
