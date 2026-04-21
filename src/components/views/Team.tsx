import { useMemo, useState } from "react";
import { Plus, UserCog, Target, TrendingUp, UserPlus, Trophy, Gift, Info } from "lucide-react";
import { Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/overlays";
import { CommercialEditor } from "@/components/modals/CommercialEditor";
import { InviteUserModal } from "@/components/modals/InviteUserModal";
import { useAuth } from "@/hooks/useAuth";
import {
  caCommercialPeriode,
  calcCommissionMensuelle,
  calcBonusTrimestriel,
  monthBounds,
  quarterBounds,
  PALIERS_COMMISSION,
} from "@/lib/rem";
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
    const mois = monthBounds();
    const trim = quarterBounds();
    return state.commerciaux.map((c) => {
      const mensuel = caCommercialPeriode(c.id, mois.from, mois.to, state, settings);
      const trimestre = caCommercialPeriode(c.id, trim.from, trim.to, state, settings);
      const rem = calcCommissionMensuelle(mensuel.caTotal, settings.minimumGaranti);
      const bonusTrim = calcBonusTrimestriel(trimestre.nbAffaires);
      const objectif = c.objectifMensuel || settings.objectifMensuelDefaut;
      const progression = objectif > 0 ? mensuel.caTotal / objectif : 0;
      return { c, mensuel, trimestre, rem, bonusTrim, objectif, progression };
    });
  }, [state, settings]);

  return (
    <div className="space-y-4">
      {/* Bandeau explicatif plan de rem */}
      <Card className="p-4 bg-[#F8F0DC] dark:bg-[#C9A961]/10 border-[#C9A961]/40">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-[#8B7228] dark:text-[#C9A961] mt-0.5 flex-shrink-0" />
          <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <span className="font-semibold">Plan de rémunération 2026</span> — Minimum
            Garanti {fmtEUR(settings.minimumGaranti)} brut/mois · Objectif{" "}
            {fmtEUR(settings.objectifMensuelDefaut)} CA HT. Grille unique achat + leasing :{" "}
            {PALIERS_COMMISSION.filter((p) => p.taux > 0)
              .map((p) => `${fmtPct(p.taux).replace(/\s/g, "")} au-delà de ${fmtEUR(p.min)}`)
              .join(" · ")}
            . CA leasing = mensualité × 48.
          </div>
        </div>
      </Card>

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
          {stats.map(({ c, mensuel, trimestre, rem, bonusTrim, objectif, progression }) => {
            const pct = Math.min(100, progression * 100);
            const tone =
              progression >= 1
                ? "emerald"
                : progression >= 0.6
                  ? "gold"
                  : progression >= 0.3
                    ? "amber"
                    : "red";
            const mgOuCom = rem.commissionBrute >= rem.minimumGaranti ? "commissions" : "MG";
            // Les techniciens n'ont pas d'objectif ni de remuneration commerciale :
            // on affiche une fiche profil condensee (identite + telephone) seulement.
            const isTech = c.role === "technicien";
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

                {isTech && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    {c.telephone && <div>Tél : {c.telephone}</div>}
                    <div className="text-[11px] text-slate-500">
                      Assignable aux interventions et tâches dans l'agenda.
                    </div>
                  </div>
                )}

                {/* Progression objectif — masquee pour les techniciens */}
                {!isTech && (
                <>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-slate-600">
                      <Target size={12} /> CA du mois / objectif
                    </span>
                    <span className="font-medium tabular-nums">
                      {fmtEUR(mensuel.caTotal)} / {fmtEUR(objectif)}
                    </span>
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
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {mensuel.nbAffairesAchat}A + {mensuel.nbAffairesLeasing}L ={" "}
                      {mensuel.nbAffaires} affaire{mensuel.nbAffaires > 1 ? "s" : ""}
                    </span>
                    <span>{fmtPct(progression)}</span>
                  </div>
                </div>

                {/* Bloc rémunération estimée */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 flex items-center gap-1">
                      <TrendingUp size={11} /> Versement mensuel estimé
                    </span>
                    <span className="font-semibold tabular-nums text-emerald-600">
                      {fmtEUR(rem.versement)}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    MG {fmtEUR(rem.minimumGaranti)} · Commission brute{" "}
                    {fmtEUR(rem.commissionBrute)} · Palier {rem.palierAtteint.label}{" "}
                    <span className="italic">({mgOuCom} versé)</span>
                  </div>

                  {/* Breakdown paliers */}
                  {rem.breakdown.length > 0 && (
                    <div className="text-[10px] text-slate-400 space-y-0.5 pl-2 border-l-2 border-slate-100 dark:border-slate-800">
                      {rem.breakdown.map((b, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span>{b.palier.label}</span>
                          <span className="tabular-nums">
                            sur {fmtEUR(b.caDansPalier)} = {fmtEUR(b.commission)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bonus trimestre */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-600 flex items-center gap-1">
                    <Trophy size={11} /> Bonus trim ({trimestre.nbAffaires} aff.)
                  </span>
                  <span
                    className={cx(
                      "font-semibold tabular-nums",
                      bonusTrim > 0 ? "text-[#C9A961]" : "text-slate-400"
                    )}
                  >
                    {bonusTrim > 0 ? `+${fmtEUR(bonusTrim)}` : "—"}
                  </span>
                </div>

                {/* Détail leasing */}
                {mensuel.caLeasing > 0 && (
                  <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
                    <Gift size={10} />
                    Leasing mois : {fmtEUR(mensuel.caLeasing)} (×48)
                  </div>
                )}
                </>
                )}
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
