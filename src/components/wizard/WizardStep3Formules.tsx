import { CheckCircle2, Wrench, CreditCard, Repeat, Edit2, RotateCcw } from "lucide-react";
import { Card, Badge, Input } from "@/components/ui/primitives";
import { NIVEAUX_MAINTENANCE } from "@/lib/constants";
import { fmtEUR, fmtEURc, cx } from "@/lib/helpers";
import { calcDevisTotaux } from "@/lib/calculations";
import type { Quote, AppState, Settings, NiveauMaintenance } from "@/types";

interface Props {
  draft: Quote;
  setDraft: React.Dispatch<React.SetStateAction<Quote>>;
  state: AppState;
  settings: Settings;
}

// =============================================================================
// LES TROIS FORMULES COTE A COTE
// =============================================================================
export function WizardStep3Formules({ draft, setDraft, state, settings }: Props) {
  const totaux = calcDevisTotaux(draft, settings, state.products);
  // Mensualite auto, recalculee sans l'override pour toujours l'afficher a cote
  const mensualiteAuto = calcDevisTotaux(
    { ...draft, mensualiteLeasingOverride: null },
    settings,
    state.products
  ).mensualiteTotale;
  const hasOverride =
    typeof draft.mensualiteLeasingOverride === "number" && draft.mensualiteLeasingOverride > 0;

  function setNiveau(n: NiveauMaintenance) {
    setDraft((d) => ({ ...d, modeAchat: { maintenance: n } }));
  }
  function setDuree(duree: 36 | 48 | 60) {
    setDraft((d) => ({ ...d, modeLeasing: { duree } }));
  }
  function setOverride(v: number | null) {
    setDraft((d) => ({ ...d, mensualiteLeasingOverride: v }));
  }
  const grille =
    totaux.totalHT < settings.seuilLeasing ? "petit (CA < seuil)" : "grand (CA ≥ seuil)";

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
          Trois formules pour ton client
        </div>
        <div className="text-xs text-slate-500">
          Le total HT est {fmtEURc(totaux.totalHT)}. Chaque formule est recalculée en direct
          selon tes choix ci-dessous.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* FORMULE 1 — Achat sec */}
        <FormuleCard
          title="Achat sec"
          subtitle="Cash, propriété immédiate"
          icon={CreditCard}
          highlight={fmtEUR(totaux.totalHT)}
          highlightSub="HT"
          tone="navy"
        >
          <div className="space-y-2 text-xs">
            <Row label="Sous-total matériel" value={fmtEURc(totaux.sousTotalVente)} />
            <Row label="Main-d'œuvre" value={fmtEURc(totaux.coutMO)} />
            <Row label="Déplacement" value={fmtEURc(totaux.coutDepl)} />
            <hr className="border-slate-200 dark:border-slate-800" />
            <Row label="Total HT" value={fmtEURc(totaux.totalHT)} bold />
            <Row label="TVA 20 %" value={fmtEURc(totaux.totalTVA)} dim />
            <Row label="Total TTC" value={fmtEURc(totaux.totalTTC)} bold />
            {!settings.clientMode && (
              <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
                <Row
                  label="Marge brute"
                  value={fmtEURc(totaux.margeBrute)}
                  tone="emerald"
                />
                <Row
                  label="Commission"
                  value={fmtEURc(totaux.commissionAchat)}
                  dim
                />
              </div>
            )}
          </div>
          <ul className="mt-4 text-xs space-y-1">
            <Feature>Propriété immédiate du matériel</Feature>
            <Feature>Garantie constructeur 2 ans</Feature>
            <Feature muted>Pas de maintenance incluse</Feature>
          </ul>
        </FormuleCard>

        {/* FORMULE 2 — Achat + Maintenance */}
        <FormuleCard
          title="Achat + Maintenance"
          subtitle="Propriété + service annuel"
          icon={Wrench}
          highlight={fmtEUR(totaux.totalHT)}
          highlightSub={`+ ${fmtEUR(totaux.maintenanceAnnuelle)} / an`}
          tone="gold"
        >
          <div className="mb-3">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Niveau de maintenance
            </div>
            <div className="flex flex-col gap-1.5">
              {Object.values(NIVEAUX_MAINTENANCE).map((n) => {
                const active = draft.modeAchat.maintenance === n.id;
                const prix = totaux.totalHT * n.prixAnnuelRatio;
                return (
                  <button
                    key={n.id}
                    onClick={() => setNiveau(n.id)}
                    className={cx(
                      "flex items-center justify-between gap-2 p-2 rounded-lg text-left text-xs transition-colors border",
                      active
                        ? "bg-[#F8F0DC] border-[#C9A961] text-[#8B7228]"
                        : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{n.label}</div>
                      <div className="text-[10px] opacity-80">
                        {Math.round(n.prixAnnuelRatio * 100)} % du total HT / an
                      </div>
                    </div>
                    <div className="font-semibold tabular-nums">
                      {fmtEUR(prix)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <ul className="text-xs space-y-1">
            {NIVEAUX_MAINTENANCE[draft.modeAchat.maintenance].details.map((d) => (
              <Feature key={d}>{d}</Feature>
            ))}
          </ul>
        </FormuleCard>

        {/* FORMULE 3 — Leasing PGE */}
        <FormuleCard
          title="Prestation Globale Évolutive"
          subtitle="Leasing mensuel tout inclus"
          icon={Repeat}
          highlight={fmtEUR(totaux.mensualiteTotale)}
          highlightSub={`HT / mois · ${totaux.duree} mois`}
          tone="navy"
          accent
        >
          <div className="mb-3">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Durée d'engagement
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {([36, 48, 60] as const).map((d) => {
                const active = draft.modeLeasing.duree === d;
                return (
                  <button
                    key={d}
                    onClick={() => setDuree(d)}
                    className={cx(
                      "px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                      active
                        ? "bg-[#0B1E3F] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    )}
                  >
                    {d} mois
                  </button>
                );
              })}
            </div>
          </div>
          {/* Override manuel */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Edit2 size={10} />
                Forcer la mensualité (€/mois)
              </label>
              {hasOverride && (
                <button
                  onClick={() => setOverride(null)}
                  className="text-[10px] text-slate-400 hover:text-slate-600 inline-flex items-center gap-1"
                  title="Revenir au calcul automatique"
                >
                  <RotateCcw size={10} /> Auto
                </button>
              )}
            </div>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={draft.mensualiteLeasingOverride ?? ""}
              onChange={(e) =>
                setOverride(e.target.value === "" ? null : Number(e.target.value))
              }
              placeholder={`Auto : ${Math.round(mensualiteAuto)} €`}
            />
            {hasOverride && (
              <div className="text-[10px] text-slate-500 mt-1">
                Calcul auto : {fmtEUR(mensualiteAuto)} · forcé à {fmtEUR(totaux.mensualiteTotale)}
              </div>
            )}
          </div>
          {/* Detail interne (plus de breakdown, tout est dans le coef full-options) */}
          {!settings.clientMode && (
            <div className="space-y-1 text-xs mb-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-900">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Détail interne (full options)
              </div>
              <Row label="Mensualité auto" value={fmtEURc(mensualiteAuto)} />
              <Row label="Mensualité retenue" value={fmtEURc(totaux.mensualiteTotale)} bold />
              <Row label={`Total ${totaux.duree} mois`} value={fmtEURc(totaux.totalLeasing)} dim />
              <Row label={`Grille : ${grille}`} value={`×${totaux.totalHT < settings.seuilLeasing ? settings.coefMensuelPetit[totaux.duree] : settings.coefMensuel[totaux.duree]}`} dim />
              <Row label="Commission" value={fmtEURc(totaux.commissionLeasing)} dim />
            </div>
          )}
          <ul className="text-xs space-y-1">
            <Feature>Matériel dernière génération</Feature>
            <Feature>Installation + mise en service</Feature>
            <Feature>Maintenance préventive et curative</Feature>
            <Feature>Remplacement pièces inclus</Feature>
            <Feature>Évolutions provisionnées</Feature>
            <Feature>Mensualité fixe sans surprise</Feature>
          </ul>
        </FormuleCard>
      </div>

      <div className="text-[11px] text-slate-500 text-center">
        Ces trois options apparaissent côte à côte dans le PDF (mode Achat) et la formule
        Leasing dispose de son propre PDF sans prix unitaires ni marques.
      </div>
    </div>
  );
}

// =============================================================================
// HELPERS UI
// =============================================================================
function FormuleCard({
  title,
  subtitle,
  icon: Icon,
  highlight,
  highlightSub,
  tone,
  accent = false,
  children,
}: {
  title: string;
  subtitle: string;
  icon: typeof Wrench;
  highlight: string;
  highlightSub: string;
  tone: "navy" | "gold";
  accent?: boolean;
  children?: React.ReactNode;
}) {
  const badgeColor = tone === "gold" ? "gold" : "navy";
  return (
    <Card
      className={cx(
        "p-4 flex flex-col",
        accent && "ring-2 ring-[#C9A961] ring-offset-2 dark:ring-offset-slate-950"
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className={cx(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            tone === "gold"
              ? "bg-[#F8F0DC] text-[#8B7228]"
              : "bg-[#0B1E3F]/10 text-[#0B1E3F] dark:bg-[#C9A961]/20 dark:text-[#C9A961]"
          )}
        >
          <Icon size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
            {title}
          </div>
          <div className="text-[11px] text-slate-500 truncate">{subtitle}</div>
        </div>
        {accent && <Badge tone={badgeColor}>Phare</Badge>}
      </div>
      <div className="mb-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div
          className={cx(
            "text-2xl font-bold tabular-nums",
            tone === "gold" ? "text-[#8B7228]" : "text-[#0B1E3F] dark:text-[#C9A961]"
          )}
        >
          {highlight}
        </div>
        <div className="text-[11px] text-slate-500">{highlightSub}</div>
      </div>
      <div className="flex-1">{children}</div>
    </Card>
  );
}

function Row({
  label,
  value,
  bold = false,
  dim = false,
  tone,
}: {
  label: string;
  value: string;
  bold?: boolean;
  dim?: boolean;
  tone?: "emerald";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={cx(dim && "text-slate-500")}>{label}</span>
      <span
        className={cx(
          "tabular-nums",
          bold && "font-semibold",
          dim && "text-slate-500",
          tone === "emerald" && "text-emerald-600 font-semibold"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Feature({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <li className={cx("flex items-start gap-1.5", muted && "text-slate-400")}>
      <CheckCircle2
        size={12}
        className={cx("mt-0.5 flex-shrink-0", muted ? "text-slate-300" : "text-[#C9A961]")}
      />
      <span>{children}</span>
    </li>
  );
}
