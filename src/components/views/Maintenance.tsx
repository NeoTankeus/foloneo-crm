import { useMemo, useState } from "react";
import { Plus, Wrench, RefreshCw, AlertTriangle } from "lucide-react";
import { Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { Stat, EmptyState } from "@/components/ui/overlays";
import { ContractEditor } from "@/components/modals/ContractEditor";
import { NIVEAUX_MAINTENANCE } from "@/lib/constants";
import { fmtEUR, fmtDate, daysUntil, upsertById, removeById, cx } from "@/lib/helpers";
import { useDemoData } from "@/lib/supabase";
import * as db from "@/lib/db";
import type { AppState, Contrat } from "@/types";

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

export function MaintenanceView({ state, setState }: Props) {
  const [editor, setEditor] = useState<{ open: boolean; contract: Contrat | null }>({
    open: false,
    contract: null,
  });

  const kpis = useMemo(() => {
    const actifs = state.contrats.filter((c) => c.statut === "actif");
    const caRecurrent = actifs.reduce((s, c) => s + c.montantAnnuel, 0);
    const j60 = state.contrats.filter((c) => {
      const j = daysUntil(c.dateFin);
      return j <= 60 && j > 30 && c.statut !== "expire";
    });
    const j30 = state.contrats.filter((c) => {
      const j = daysUntil(c.dateFin);
      return j <= 30 && j > 15 && c.statut !== "expire";
    });
    const j15 = state.contrats.filter((c) => {
      const j = daysUntil(c.dateFin);
      return j <= 15 && j > 0 && c.statut !== "expire";
    });
    const expires = state.contrats.filter(
      (c) => c.statut === "expire" || daysUntil(c.dateFin) <= 0
    );
    return { actifs, caRecurrent, j60, j30, j15, expires };
  }, [state.contrats]);

  async function renouveler(c: Contrat) {
    const newDateFin = new Date(c.dateFin);
    newDateFin.setFullYear(newDateFin.getFullYear() + 1);
    const patch: Partial<Contrat> = {
      dateDebut: c.dateFin,
      dateFin: newDateFin.toISOString().slice(0, 10),
      statut: "actif",
    };
    const updated: Contrat = { ...c, ...patch };
    setState((s) => ({ ...s, contrats: upsertById(s.contrats, updated) }));
    if (!useDemoData) {
      try {
        await db.updateContract(c.id, patch);
      } catch (e) {
        console.error(e);
        setState((s) => ({ ...s, contrats: upsertById(s.contrats, c) }));
      }
    }
  }

  const sorted = [...state.contrats].sort(
    (a, b) => new Date(a.dateFin).getTime() - new Date(b.dateFin).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat
          label="Contrats actifs"
          value={kpis.actifs.length}
          icon={Wrench}
          tone="emerald"
          sub={`sur ${state.contrats.length} total`}
        />
        <Stat
          label="CA récurrent"
          value={fmtEUR(kpis.caRecurrent)}
          icon={RefreshCw}
          tone="gold"
          sub="par an"
        />
        <Stat
          label="À renouveler"
          value={kpis.j60.length + kpis.j30.length + kpis.j15.length}
          icon={AlertTriangle}
          tone="amber"
          sub="dans les 60 jours"
        />
        <Stat
          label="Expirés"
          value={kpis.expires.length}
          icon={AlertTriangle}
          tone="red"
        />
      </div>

      <div className="flex justify-end">
        <Button
          variant="gold"
          icon={Plus}
          onClick={() => setEditor({ open: true, contract: null })}
          disabled={state.accounts.length === 0}
        >
          Nouveau contrat
        </Button>
      </div>

      {state.contrats.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={Wrench}
            title="Aucun contrat"
            description="Crée ton premier contrat de maintenance."
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((c) => {
            const acc = state.accounts.find((a) => a.id === c.accountId);
            const jours = daysUntil(c.dateFin);
            const niveau = NIVEAUX_MAINTENANCE[c.niveau];
            let alertTone: "red" | "amber" | "emerald" | "slate" = "slate";
            let alertLabel = "";
            if (c.statut === "expire" || jours <= 0) {
              alertTone = "red";
              alertLabel = `Expiré depuis ${Math.abs(jours)}j`;
            } else if (jours <= 15) {
              alertTone = "red";
              alertLabel = `J-${jours} !`;
            } else if (jours <= 30) {
              alertTone = "amber";
              alertLabel = `J-${jours}`;
            } else if (jours <= 60) {
              alertTone = "amber";
              alertLabel = `J-${jours}`;
            } else {
              alertTone = "emerald";
              alertLabel = `${jours}j restants`;
            }
            const needsRenewal = jours <= 60 || c.statut === "a_renouveler" || c.statut === "expire";

            return (
              <Card key={c.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#F8F0DC] dark:bg-[#C9A961]/20 text-[#8B7228] dark:text-[#C9A961] flex items-center justify-center flex-shrink-0">
                    <Wrench size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setEditor({ open: true, contract: c })}
                        className="font-semibold text-slate-900 dark:text-slate-100 hover:underline truncate"
                      >
                        {acc?.raisonSociale ?? "—"}
                      </button>
                      <Badge tone="gold">{niveau.label}</Badge>
                      <Badge tone={alertTone}>{alertLabel}</Badge>
                      {c.statut === "a_renouveler" && (
                        <Badge tone="amber">À renouveler</Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Du {fmtDate(c.dateDebut)} au {fmtDate(c.dateFin)} ·{" "}
                      <span className="font-medium">{fmtEUR(c.montantAnnuel)}/an</span>
                    </div>
                  </div>
                  <div className={cx("flex gap-2", !needsRenewal && "opacity-50")}>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={RefreshCw}
                      onClick={() => renouveler(c)}
                      disabled={!needsRenewal}
                    >
                      Renouveler +1 an
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ContractEditor
        open={editor.open}
        contract={editor.contract}
        accounts={state.accounts}
        onClose={() => setEditor({ open: false, contract: null })}
        onSaved={(c) => setState((s) => ({ ...s, contrats: upsertById(s.contrats, c) }))}
        onDeleted={(id) => setState((s) => ({ ...s, contrats: removeById(s.contrats, id) }))}
      />
    </div>
  );
}
