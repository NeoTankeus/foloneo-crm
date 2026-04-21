import { useMemo, useState } from "react";
import { Plus, UserCog, Target, TrendingUp, UserPlus } from "lucide-react";
import { Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/overlays";
import { CommercialEditor } from "@/components/modals/CommercialEditor";
import { InviteUserModal } from "@/components/modals/InviteUserModal";
import { useAuth } from "@/hooks/useAuth";
import { calcDevisTotaux } from "@/lib/calculations";
import { fmtEUR, fmtPct, initials, upsertById, removeById, cx } from "@/lib/helpers";
import type { AppState, Settings, Commercial } from "@/types";

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  settings: Settings;
}

export function TeamView({ state, setState, settings }: Props) {
  const { currentCommercial } = useAuth();
  const isDirigeant = currentCommercial?.role === "dirigeant";
  const [editor, setEditor] = useState<{ open: boolean; commercial: Commercial | null }>({
    open: false,
    commercial: null,
  });
  const [inviteOpen, setInviteOpen] = useState(false);

  const stats = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    return state.commerciaux.map((c) => {
      const dealsSignes = state.deals.filter(
        (d) => d.commercialId === c.id && d.etape === "signe"
      );
      const caMois = dealsSignes
        .filter((d) => new Date(d.createdAt) >= monthStart)
        .reduce((s, d) => s + d.valeur, 0);
      const caTotal = dealsSignes.reduce((s, d) => s + d.valeur, 0);
      const progress = c.objectifMensuel > 0 ? caMois / c.objectifMensuel : 0;
      // Commissions estimees sur devis signes
      const quotesSignes = state.quotes.filter((q) => q.commercialId === c.id);
      const commissionMois = quotesSignes
        .filter((q) => q.signedAt && new Date(q.signedAt) >= monthStart)
        .reduce((s, q) => {
          const t = calcDevisTotaux(q, settings, state.products);
          if (q.formuleChoisie === "leasing") return s + t.commissionLeasing;
          return s + t.commissionAchat;
        }, 0);
      return { c, caMois, caTotal, progress, commissionMois, dealsSignes: dealsSignes.length };
    });
  }, [state.commerciaux, state.deals, state.quotes, state.products, settings]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-xs text-slate-500">
          {state.commerciaux.length} membre{state.commerciaux.length > 1 ? "s" : ""}
        </div>
        <div className="flex items-center gap-2">
          {isDirigeant && (
            <Button variant="gold" icon={UserPlus} onClick={() => setInviteOpen(true)}>
              Inviter par email
            </Button>
          )}
          <Button
            variant="outline"
            icon={Plus}
            onClick={() => setEditor({ open: true, commercial: null })}
          >
            Ajouter (sans mail)
          </Button>
        </div>
      </div>

      {state.commerciaux.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon={UserCog} title="Aucun membre d'équipe" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.map(({ c, caMois, progress, commissionMois, dealsSignes }) => {
            const pct = Math.min(100, progress * 100);
            const tone =
              progress >= 1 ? "emerald" : progress >= 0.6 ? "gold" : progress >= 0.3 ? "amber" : "red";
            return (
              <Card
                key={c.id}
                hover
                onClick={() => setEditor({ open: true, commercial: c })}
                className={cx("p-4", !c.actif && "opacity-60")}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
                    style={{ background: c.couleur }}
                  >
                    {initials(c.prenom, c.nom)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">
                      {c.prenom} {c.nom}
                    </div>
                    <div className="text-xs text-slate-500 capitalize">{c.role}</div>
                    <div className="text-[11px] text-slate-400 truncate">{c.email}</div>
                  </div>
                  {!c.actif && <Badge tone="slate">Inactif</Badge>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-slate-600">
                      <Target size={12} /> Objectif mensuel
                    </span>
                    <span className="font-medium tabular-nums">{fmtEUR(c.objectifMensuel)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={cx(
                        "h-full rounded-full transition-all",
                        tone === "emerald" && "bg-emerald-500",
                        tone === "gold" && "bg-[#C9A961]",
                        tone === "amber" && "bg-amber-500",
                        tone === "red" && "bg-red-500"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">CA du mois</span>
                    <span className="font-semibold tabular-nums">
                      {fmtEUR(caMois)} · {fmtPct(progress)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <div className="text-slate-500 flex items-center gap-1">
                      <TrendingUp size={11} /> Commission
                    </div>
                    <div className="font-semibold tabular-nums text-emerald-600">
                      {fmtEUR(commissionMois)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Deals signés</div>
                    <div className="font-semibold">{dealsSignes}</div>
                  </div>
                </div>

                <div className="mt-3 flex gap-1 flex-wrap text-[10px] text-slate-500">
                  <Badge tone="slate">Achat {fmtPct(c.commissionTaux.achat)}</Badge>
                  <Badge tone="slate">Leasing {fmtPct(c.commissionTaux.leasing)}</Badge>
                  <Badge tone="slate">Maint {fmtPct(c.commissionTaux.maintenance)}</Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CommercialEditor
        open={editor.open}
        commercial={editor.commercial}
        onClose={() => setEditor({ open: false, commercial: null })}
        onSaved={(c) =>
          setState((s) => ({ ...s, commerciaux: upsertById(s.commerciaux, c) }))
        }
        onDeleted={(id) =>
          setState((s) => ({ ...s, commerciaux: removeById(s.commerciaux, id) }))
        }
      />
      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={(c) =>
          setState((s) => ({ ...s, commerciaux: upsertById(s.commerciaux, c) }))
        }
      />
    </div>
  );
}
