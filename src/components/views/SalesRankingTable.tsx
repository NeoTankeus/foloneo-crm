import { useMemo, useState } from "react";
import { Trophy, ChevronUp, ChevronDown } from "lucide-react";
import { Card, Badge } from "@/components/ui/primitives";
import { calcCommissionMensuelle, calcBonusTrimestriel, caCommercialPeriode, monthBounds, quarterBounds } from "@/lib/rem";
import { fmtEUR, fmtPct, initials, cx } from "@/lib/helpers";
import type { AppState, Settings } from "@/types";

interface Props {
  state: AppState;
  settings: Settings;
  commercialFilter: string | "all";
  hideObjectives?: boolean;
}

type SortKey =
  | "rang"
  | "nom"
  | "caMois"
  | "nbAffaires"
  | "progression"
  | "commission"
  | "bonusTrim"
  | "caTrim";

interface Row {
  c: AppState["commerciaux"][number];
  caMois: number;
  caTrim: number;
  nbAffaires: number;
  nbAffairesTrim: number;
  progression: number;
  objectif: number;
  commission: number;
  bonusTrim: number;
  pipelineValeur: number;
  rang: number;
}

// Tableau sortable du classement des commerciaux.
// Colonnes : Rang, Commercial, CA mois, Affaires, Objectif %, Commission, Bonus trim, CA trim
// Toutes triables (clic sur l'entete). Trie par defaut : rang ASC (caMois DESC).
export function SalesRankingTable({ state, settings, commercialFilter, hideObjectives }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("rang");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const rows = useMemo<Row[]>(() => {
    const { from, to } = monthBounds();
    const qBounds = quarterBounds();
    const filtered = state.commerciaux
      .filter((c) => c.actif !== false)
      .filter((c) => commercialFilter === "all" || c.id === commercialFilter);

    // Calcul brut
    const raw = filtered.map((c) => {
      const mois = caCommercialPeriode(c.id, from, to, state, settings);
      const trim = caCommercialPeriode(c.id, qBounds.from, qBounds.to, state, settings);
      const rem = calcCommissionMensuelle(mois.caTotal, settings.minimumGaranti);
      const bonus = calcBonusTrimestriel(trim.nbAffaires);
      const objectif = c.objectifMensuel || settings.objectifMensuelDefaut;
      const progression = objectif > 0 ? mois.caTotal / objectif : 0;
      // Pipeline (deals actifs)
      const pipelineValeur = state.deals
        .filter((d) => d.commercialId === c.id && d.etape !== "signe" && d.etape !== "perdu")
        .reduce((s, d) => s + (d.valeur * d.probabilite) / 100, 0);
      return {
        c,
        caMois: mois.caTotal,
        caTrim: trim.caTotal,
        nbAffaires: mois.nbAffaires,
        nbAffairesTrim: trim.nbAffaires,
        progression,
        objectif,
        commission: rem.versement,
        bonusTrim: bonus,
        pipelineValeur,
      };
    });

    // Rang naturel : par CA mois decroissant
    const sortedByCA = [...raw].sort((a, b) => b.caMois - a.caMois);
    sortedByCA.forEach((r, i) => {
      (r as Row).rang = i + 1;
    });

    // Tri selon l'option active
    const sorted = [...(sortedByCA as Row[])];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "rang": cmp = a.rang - b.rang; break;
        case "nom": cmp = `${a.c.nom}${a.c.prenom}`.localeCompare(`${b.c.nom}${b.c.prenom}`); break;
        case "caMois": cmp = a.caMois - b.caMois; break;
        case "nbAffaires": cmp = a.nbAffaires - b.nbAffaires; break;
        case "progression": cmp = a.progression - b.progression; break;
        case "commission": cmp = a.commission - b.commission; break;
        case "bonusTrim": cmp = a.bonusTrim - b.bonusTrim; break;
        case "caTrim": cmp = a.caTrim - b.caTrim; break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [state, settings, commercialFilter, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      // Defaults : rang/nom ASC, chiffres DESC
      setSortDir(k === "rang" || k === "nom" ? "asc" : "desc");
    }
  }

  const totalCA = rows.reduce((s, r) => s + r.caMois, 0);
  const totalCom = rows.reduce((s, r) => s + r.commission, 0);
  const totalBonus = rows.reduce((s, r) => s + r.bonusTrim, 0);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Trophy size={14} className="text-[#C9A961]" />
          Classement des ventes
        </h2>
        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
          <span>CA mois total : <strong className="text-slate-900 dark:text-slate-100 tabular-nums">{fmtEUR(totalCA)}</strong></span>
          <span>·</span>
          <span>Commissions : <strong className="text-emerald-600 tabular-nums">{fmtEUR(totalCom)}</strong></span>
          {totalBonus > 0 && (
            <>
              <span>·</span>
              <span>Bonus trim : <strong className="text-[#C9A961] tabular-nums">{fmtEUR(totalBonus)}</strong></span>
            </>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-xs text-slate-500 py-6 text-center">Aucun commercial actif</div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <Th k="rang" sortKey={sortKey} sortDir={sortDir} toggle={toggleSort} className="w-10 text-center">#</Th>
                <Th k="nom" sortKey={sortKey} sortDir={sortDir} toggle={toggleSort}>Commercial</Th>
                <Th k="caMois" sortKey={sortKey} sortDir={sortDir} toggle={toggleSort} align="right">CA mois</Th>
                <Th k="nbAffaires" sortKey={sortKey} sortDir={sortDir} toggle={toggleSort} align="right">Affaires</Th>
                {!hideObjectives && (
                  <Th k="progression" sortKey={sortKey} sortDir={sortDir} toggle={toggleSort} align="right">Objectif</Th>
                )}
                <Th k="commission" sortKey={sortKey} sortDir={sortDir} toggle={toggleSort} align="right">Commission</Th>
                <Th k="bonusTrim" sortKey={sortKey} sortDir={sortDir} toggle={toggleSort} align="right">Bonus trim</Th>
                <Th k="caTrim" sortKey={sortKey} sortDir={sortDir} toggle={toggleSort} align="right" className="hidden md:table-cell">CA trim</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const medal = r.rang === 1 ? "🥇" : r.rang === 2 ? "🥈" : r.rang === 3 ? "🥉" : null;
                const progColor =
                  r.progression >= 1 ? "bg-emerald-500" :
                  r.progression >= 0.6 ? "bg-[#C9A961]" :
                  r.progression >= 0.3 ? "bg-amber-500" :
                  "bg-red-500";
                return (
                  <tr
                    key={r.c.id}
                    className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-2 text-center font-bold text-slate-600 dark:text-slate-300">
                      {medal ?? `#${r.rang}`}
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0"
                          style={{ background: r.c.couleur }}
                        >
                          {initials(r.c.prenom, r.c.nom)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{r.c.prenom} {r.c.nom}</div>
                          <div className="text-[10px] text-slate-500 capitalize truncate">{r.c.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 text-right tabular-nums font-semibold">{fmtEUR(r.caMois)}</td>
                    <td className="py-2 text-right tabular-nums">
                      <Badge tone="slate">{r.nbAffaires}</Badge>
                    </td>
                    {!hideObjectives && (
                      <td className="py-2 text-right">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={cx("h-full rounded-full", progColor)}
                              style={{ width: `${Math.min(100, r.progression * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium tabular-nums w-12 text-right">{fmtPct(r.progression)}</span>
                        </div>
                      </td>
                    )}
                    <td className="py-2 text-right tabular-nums text-emerald-600 font-semibold">{fmtEUR(r.commission)}</td>
                    <td className="py-2 text-right tabular-nums">
                      {r.bonusTrim > 0 ? (
                        <span className="text-[#C9A961] font-semibold">+{fmtEUR(r.bonusTrim)}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2 text-right tabular-nums hidden md:table-cell">
                      {fmtEUR(r.caTrim)}
                      <div className="text-[10px] text-slate-500">{r.nbAffairesTrim} aff.</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// Cellule d'entete triable.
function Th({
  k,
  sortKey,
  sortDir,
  toggle,
  children,
  align,
  className,
}: {
  k: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  toggle: (k: SortKey) => void;
  children: React.ReactNode;
  align?: "right" | "left";
  className?: string;
}) {
  const active = sortKey === k;
  return (
    <th
      onClick={() => toggle(k)}
      className={cx(
        "py-2 cursor-pointer select-none font-semibold hover:text-slate-900 dark:hover:text-slate-100",
        align === "right" && "text-right",
        active && "text-slate-900 dark:text-slate-100",
        className
      )}
    >
      <span className="inline-flex items-center gap-0.5">
        {children}
        {active && (sortDir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
      </span>
    </th>
  );
}
