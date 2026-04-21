import { useMemo, useState } from "react";
import { Plus, Calendar as CalendarIcon, User } from "lucide-react";
import { Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { DealEditor } from "@/components/modals/DealEditor";
import { ETAPES } from "@/lib/constants";
import { fmtEUR, fmtDateShort, cx, upsertById, removeById } from "@/lib/helpers";
import { useDemoData } from "@/lib/supabase";
import * as db from "@/lib/db";
import type { AppState, Deal, EtapeId } from "@/types";

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

export function Pipeline({ state, setState }: Props) {
  const [editor, setEditor] = useState<{ open: boolean; deal: Deal | null }>({
    open: false,
    deal: null,
  });
  const [dragging, setDragging] = useState<string | null>(null);

  const byEtape = useMemo(() => {
    const m: Record<EtapeId, Deal[]> = {
      prospection: [],
      qualif: [],
      devis_envoye: [],
      nego: [],
      signe: [],
      perdu: [],
    };
    state.deals.forEach((d) => m[d.etape].push(d));
    return m;
  }, [state.deals]);

  const account = (id: string) => state.accounts.find((a) => a.id === id);
  const commercial = (id?: string) =>
    id ? state.commerciaux.find((c) => c.id === id) : undefined;

  async function moveDeal(dealId: string, target: EtapeId) {
    const deal = state.deals.find((d) => d.id === dealId);
    if (!deal || deal.etape === target) return;
    const newProba = ETAPES.find((e) => e.id === target)?.proba ?? deal.probabilite;
    const updated: Deal = { ...deal, etape: target, probabilite: newProba };
    // Optimiste
    setState((s) => ({ ...s, deals: upsertById(s.deals, updated) }));
    if (!useDemoData) {
      try {
        await db.updateDeal(dealId, { etape: target, probabilite: newProba });
      } catch (e) {
        console.error("updateDeal failed", e);
        // Rollback
        setState((s) => ({ ...s, deals: upsertById(s.deals, deal) }));
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          {state.deals.length} affaire{state.deals.length > 1 ? "s" : ""} au pipeline
        </div>
        <Button
          variant="gold"
          icon={Plus}
          onClick={() => setEditor({ open: true, deal: null })}
        >
          Nouvelle affaire
        </Button>
      </div>

      {/* Kanban : scroll horizontal sur mobile */}
      <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 md:mx-0 md:px-0">
        {ETAPES.map((etape) => {
          const list = byEtape[etape.id];
          const total = list.reduce((s, d) => s + d.valeur, 0);
          return (
            <div
              key={etape.id}
              className={cx(
                "flex-shrink-0 w-72 bg-slate-100 dark:bg-slate-900/50 rounded-xl p-3 transition-colors",
                dragging && "ring-2 ring-transparent hover:ring-[#C9A961]/50"
              )}
              onDragOver={(e) => {
                if (dragging) {
                  e.preventDefault();
                  e.currentTarget.classList.add("ring-[#C9A961]");
                }
              }}
              onDragLeave={(e) => e.currentTarget.classList.remove("ring-[#C9A961]")}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("ring-[#C9A961]");
                if (dragging) void moveDeal(dragging, etape.id);
                setDragging(null);
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: etape.color }}
                  />
                  <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                    {etape.label}
                  </div>
                  <Badge tone="slate">{list.length}</Badge>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 mb-3 tabular-nums">
                {fmtEUR(total)} · {etape.proba}%
              </div>
              <div className="space-y-2 min-h-[40px]">
                {list.map((d) => {
                  const acc = account(d.accountId);
                  const com = commercial(d.commercialId);
                  return (
                    <Card
                      key={d.id}
                      hover
                      draggable
                      onDragStart={() => setDragging(d.id)}
                      onDragEnd={() => setDragging(null)}
                      onClick={() => setEditor({ open: true, deal: d })}
                      className={cx(
                        "p-3 cursor-grab active:cursor-grabbing",
                        dragging === d.id && "opacity-50"
                      )}
                    >
                      <div className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                        {d.titre}
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">
                        {acc?.raisonSociale ?? "—"}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="font-semibold text-sm text-[#0B1E3F] dark:text-[#C9A961] tabular-nums">
                          {fmtEUR(d.valeur)}
                        </div>
                        <Badge tone={d.formulePreferee === "leasing" ? "gold" : "slate"}>
                          {d.formulePreferee === "achat"
                            ? "Achat"
                            : d.formulePreferee === "leasing"
                              ? "Leasing"
                              : "Maint."}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                        {d.dateCible && (
                          <div className="flex items-center gap-1">
                            <CalendarIcon size={10} />
                            {fmtDateShort(d.dateCible)}
                          </div>
                        )}
                        {com && (
                          <div className="flex items-center gap-1">
                            <User size={10} />
                            <span
                              className="inline-block w-2 h-2 rounded-full"
                              style={{ background: com.couleur }}
                            />
                            {com.prenom}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
                {list.length === 0 && (
                  <div className="text-[11px] text-slate-400 text-center py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                    Glisse une affaire ici
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <DealEditor
        open={editor.open}
        deal={editor.deal}
        accounts={state.accounts}
        contacts={state.contacts}
        commerciaux={state.commerciaux}
        onClose={() => setEditor({ open: false, deal: null })}
        onSaved={(d) => setState((s) => ({ ...s, deals: upsertById(s.deals, d) }))}
        onDeleted={(id) => setState((s) => ({ ...s, deals: removeById(s.deals, id) }))}
        onAccountsRefreshed={(accounts) => setState((s) => ({ ...s, accounts }))}
      />
    </div>
  );
}
