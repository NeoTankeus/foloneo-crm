import { useMemo } from "react";
import {
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Wrench,
  Receipt,
  MapPin,
} from "lucide-react";
import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, Badge } from "@/components/ui/primitives";
import { Stat } from "@/components/ui/overlays";
import { ETAPES } from "@/lib/constants";
import { calcCommissionMensuelle, caCommercialPeriode, monthBounds } from "@/lib/rem";
import { fmtEUR, fmtPct, daysAgo, daysUntil, initials } from "@/lib/helpers";
import { VarMap3D } from "./VarMap3D";
import type { AppState, Settings } from "@/types";

interface DashboardProps {
  state: AppState;
  settings: Settings;
  commercialFilter: string | "all";
  periodFilter: "month" | "quarter" | "year" | "6months";
}

export function Dashboard({ state, settings, commercialFilter, periodFilter }: DashboardProps) {
  // Periode de filtre
  const periodStart = useMemo(() => {
    const now = new Date();
    const d = new Date(now);
    if (periodFilter === "month") {
      d.setDate(1);
    } else if (periodFilter === "quarter") {
      const q = Math.floor(now.getMonth() / 3) * 3;
      d.setMonth(q, 1);
    } else if (periodFilter === "year") {
      d.setMonth(0, 1);
    } else {
      d.setMonth(now.getMonth() - 5, 1);
    }
    d.setHours(0, 0, 0, 0);
    return d;
  }, [periodFilter]);

  // Filtrage deals/quotes/invoices par commercial
  const deals = useMemo(
    () =>
      state.deals.filter(
        (d) => commercialFilter === "all" || d.commercialId === commercialFilter
      ),
    [state.deals, commercialFilter]
  );
  const quotes = useMemo(
    () =>
      state.quotes.filter(
        (q) => commercialFilter === "all" || q.commercialId === commercialFilter
      ),
    [state.quotes, commercialFilter]
  );
  const invoices = useMemo(
    () =>
      state.invoices.filter(
        (f) => commercialFilter === "all" || f.commercialId === commercialFilter
      ),
    [state.invoices, commercialFilter]
  );

  // KPIs
  const kpis = useMemo(() => {
    const pipelineValeur = deals
      .filter((d) => d.etape !== "signe" && d.etape !== "perdu")
      .reduce((s, d) => s + (d.valeur * d.probabilite) / 100, 0);
    const signes = deals.filter((d) => d.etape === "signe");
    const caSigne = signes
      .filter((d) => new Date(d.createdAt) >= periodStart)
      .reduce((s, d) => s + d.valeur, 0);
    const closed = deals.filter(
      (d) => (d.etape === "signe" || d.etape === "perdu") && new Date(d.createdAt) >= periodStart
    );
    const closedSignes = closed.filter((d) => d.etape === "signe");
    const tauxTransfo = closed.length > 0 ? closedSignes.length / closed.length : 0;
    const devisARelancer = quotes.filter(
      (q) => q.status === "envoye" && daysAgo(q.sentAt || q.createdAt) > 15
    ).length;
    const facturesRetard = invoices.filter((f) => f.status === "retard").length;
    const contratsARenouveler = state.contrats.filter((c) => {
      const j = daysUntil(c.dateFin);
      return j <= 60 && j > 0;
    }).length;
    return {
      pipelineValeur,
      caSigne,
      tauxTransfo,
      devisARelancer,
      facturesRetard,
      contratsARenouveler,
    };
  }, [deals, quotes, invoices, state.contrats, periodStart]);

  // Chart CA 6 derniers mois
  const chartData = useMemo(() => {
    const now = new Date();
    const months: { label: string; ca: number; objectif: number; start: Date; end: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      months.push({
        label: d.toLocaleDateString("fr-FR", { month: "short" }),
        ca: 0,
        objectif: 0,
        start,
        end,
      });
    }
    // CA depuis deals signes
    deals
      .filter((d) => d.etape === "signe")
      .forEach((d) => {
        const dt = new Date(d.createdAt);
        const m = months.find((mm) => dt >= mm.start && dt < mm.end);
        if (m) m.ca += d.valeur;
      });
    // Objectif : somme des objectifs mensuels des commerciaux filtres
    const commerciauxConcernes =
      commercialFilter === "all"
        ? state.commerciaux.filter((c) => c.actif !== false)
        : state.commerciaux.filter((c) => c.id === commercialFilter);
    const objectifMensuel = commerciauxConcernes.reduce(
      (s, c) => s + c.objectifMensuel,
      0
    );
    months.forEach((m) => (m.objectif = objectifMensuel));
    return months;
  }, [deals, state.commerciaux, commercialFilter]);

  // Pipeline par etape
  const pipelineByEtape = useMemo(
    () =>
      ETAPES.map((e) => ({
        ...e,
        count: deals.filter((d) => d.etape === e.id).length,
        valeur: deals.filter((d) => d.etape === e.id).reduce((s, d) => s + d.valeur, 0),
      })),
    [deals]
  );

  // Classement commerciaux — utilise la grille de remuneration 2026
  const ranking = useMemo(() => {
    const { from, to } = monthBounds();
    return state.commerciaux
      .filter((c) => c.actif !== false)
      .map((c) => {
        const period = caCommercialPeriode(c.id, from, to, state, settings);
        const rem = calcCommissionMensuelle(period.caTotal, settings.minimumGaranti);
        const objectif = c.objectifMensuel || settings.objectifMensuelDefaut;
        const progress = objectif > 0 ? period.caTotal / objectif : 0;
        return { c, caMois: period.caTotal, progress, commission: rem.versement, nbAffaires: period.nbAffaires };
      })
      .sort((a, b) => b.caMois - a.caMois);
  }, [state, settings]);

  // Alertes
  const alertes = useMemo(() => {
    const list: {
      key: string;
      kind: "devis" | "contrat" | "facture";
      label: string;
      sub: string;
    }[] = [];
    quotes
      .filter((q) => q.status === "envoye" && daysAgo(q.sentAt || q.createdAt) > 15)
      .forEach((q) => {
        const acc = state.accounts.find((a) => a.id === q.accountId);
        list.push({
          key: `q-${q.id}`,
          kind: "devis",
          label: `${q.numero} · ${acc?.raisonSociale ?? "—"}`,
          sub: `Envoyé il y a ${daysAgo(q.sentAt || q.createdAt)} jours`,
        });
      });
    state.contrats
      .filter((c) => {
        const j = daysUntil(c.dateFin);
        return j <= 60 && j > 0;
      })
      .forEach((c) => {
        const acc = state.accounts.find((a) => a.id === c.accountId);
        const j = daysUntil(c.dateFin);
        list.push({
          key: `c-${c.id}`,
          kind: "contrat",
          label: `${acc?.raisonSociale ?? "—"} · ${c.niveau}`,
          sub: `Échéance dans ${j} jours`,
        });
      });
    invoices
      .filter((f) => f.status === "retard")
      .forEach((f) => {
        const acc = state.accounts.find((a) => a.id === f.accountId);
        list.push({
          key: `f-${f.id}`,
          kind: "facture",
          label: `${f.numero} · ${acc?.raisonSociale ?? "—"}`,
          sub: `Retard ${Math.abs(daysUntil(f.dateEcheance))} jours · ${fmtEUR(f.montantTTC)}`,
        });
      });
    return list.slice(0, 10);
  }, [quotes, invoices, state.contrats, state.accounts]);

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="Pipeline pondéré"
          value={fmtEUR(kpis.pipelineValeur)}
          icon={TrendingUp}
          tone="gold"
          sub={`${deals.filter((d) => d.etape !== "signe" && d.etape !== "perdu").length} affaires`}
        />
        <Stat
          label="CA période"
          value={fmtEUR(kpis.caSigne)}
          icon={CheckCircle2}
          tone="emerald"
          sub="signés"
        />
        <Stat
          label="Taux transfo"
          value={fmtPct(kpis.tauxTransfo)}
          icon={Target}
          tone="blue"
          sub="période"
        />
        <Stat
          label="À traiter"
          value={kpis.devisARelancer + kpis.facturesRetard + kpis.contratsARenouveler}
          icon={AlertTriangle}
          tone="amber"
          sub="devis / factures / contrats"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart CA vs objectif */}
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Évolution du CA · 6 derniers mois</h2>
            <Badge tone="gold">Objectif mensuel : {fmtEUR(chartData[0]?.objectif ?? 0)}</Badge>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C9A961" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#C9A961" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" fontSize={11} stroke="#94a3b8" />
                <YAxis
                  fontSize={11}
                  stroke="#94a3b8"
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip
                  formatter={(v: number) => fmtEUR(v)}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="ca"
                  stroke="#C9A961"
                  strokeWidth={2}
                  fill="url(#gGold)"
                  name="CA signé"
                />
                <Area
                  type="monotone"
                  dataKey="objectif"
                  stroke="#0B1E3F"
                  strokeDasharray="4 3"
                  fillOpacity={0}
                  name="Objectif"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Carte 3D des devis signés */}
        <Card className="p-4">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <MapPin size={14} className="text-[#C9A961]" />
            Implantations signées
          </h2>
          <VarMap3D state={state} settings={settings} commercialFilter={commercialFilter} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline par etape */}
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Pipeline par étape</h2>
            <Badge tone="slate">{deals.length} affaires</Badge>
          </div>
          <div className="space-y-2">
            {pipelineByEtape.map((e) => (
              <div key={e.id} className="flex items-center gap-3">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: e.color }}
                />
                <div className="text-xs font-medium w-28 flex-shrink-0">{e.label}</div>
                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (e.count / Math.max(...pipelineByEtape.map((x) => x.count), 1)) * 100)}%`,
                      background: e.color,
                    }}
                  />
                </div>
                <div className="text-xs text-slate-500 w-12 text-right tabular-nums">{e.count}</div>
                <div className="text-xs font-medium w-20 text-right tabular-nums">
                  {fmtEUR(e.valeur)}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Classement commerciaux */}
        <Card className="p-4">
          <h2 className="font-semibold text-sm mb-3">Classement du mois</h2>
          <div className="space-y-2">
            {ranking.length === 0 && (
              <div className="text-xs text-slate-500">Aucun commercial actif</div>
            )}
            {ranking.map(({ c, caMois, progress, commission, nbAffaires }, i) => (
              <div
                key={c.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50"
              >
                <div className="w-5 text-xs font-bold text-slate-400">#{i + 1}</div>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                  style={{ background: c.couleur }}
                >
                  {initials(c.prenom, c.nom)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate">
                    {c.prenom} {c.nom}
                  </div>
                  <div className="text-[10px] text-slate-500 tabular-nums">
                    {fmtEUR(caMois)} · {fmtPct(progress)} · {nbAffaires} aff.
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-semibold text-emerald-600 tabular-nums">
                    {fmtEUR(commission)}
                  </div>
                  <div className="text-[9px] text-slate-400">à verser</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Alertes actives */}
      {alertes.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />
              Alertes actives
            </h2>
            <Badge tone="amber">{alertes.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {alertes.map((a) => {
              const Icon = a.kind === "devis" ? FileText : a.kind === "contrat" ? Wrench : Receipt;
              return (
                <div
                  key={a.key}
                  className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                >
                  <Icon size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{a.label}</div>
                    <div className="text-[10px] text-slate-500">{a.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

