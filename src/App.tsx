import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Briefcase,
  Building2,
  Users,
  FileText,
  Package,
  Wrench,
  Receipt,
  UserCog,
  Calendar,
  LifeBuoy,
  Settings as SettingsIcon,
  Shield,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Command,
  Menu,
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { Stat, EmptyState } from "@/components/ui/overlays";
import { ETAPES, NAV_TITLES, VIEWS_WITH_FILTERS } from "@/lib/constants";
import { fmtEUR, fmtPct, cx, daysAgo, initials } from "@/lib/helpers";
import { calcDevisTotaux } from "@/lib/calculations";
import { useDemoData } from "@/lib/supabase";
import { useAppState } from "@/hooks/useAppState";
import { useAuth } from "@/hooks/useAuth";
import { AccountsView } from "@/components/views/Accounts";
import { ContactsView } from "@/components/views/Contacts";
import { Pipeline } from "@/components/views/Pipeline";
import type { AppState, Settings, Commercial } from "@/types";

// ============================================================================
// NAVIGATION ITEMS
// ============================================================================
const NAV_ITEMS = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "pipeline", label: "Pipeline", icon: Briefcase },
  { id: "accounts", label: "Comptes", icon: Building2 },
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "quotes", label: "Devis", icon: FileText, accent: true },
  { id: "catalog", label: "Catalogue", icon: Package },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
  { id: "invoices", label: "Facturation", icon: Receipt },
  { id: "team", label: "Équipe", icon: UserCog },
  { id: "calendar", label: "Agenda", icon: Calendar },
  { id: "sav", label: "SAV", icon: LifeBuoy },
  { id: "settings", label: "Paramètres", icon: SettingsIcon },
];

// ============================================================================
// APP
// ============================================================================
export default function App() {
  const { state, setState, loading, error, reload, updateSettingsLocal } = useAppState();
  const [view, setView] = useState<string>("dashboard");
  const [sidebarMobile, setSidebarMobile] = useState(false);

  // Dark mode toggle
  useEffect(() => {
    const root = document.documentElement;
    if (state.settings.darkMode) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [state.settings.darkMode]);

  return (
    <div className={state.settings.darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-[#F7F8FA] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
        <Sidebar view={view} setView={setView} />

        {sidebarMobile && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-30 md:hidden"
              onClick={() => setSidebarMobile(false)}
            />
            <div className="md:hidden">
              <Sidebar
                view={view}
                setView={(v) => {
                  setView(v);
                  setSidebarMobile(false);
                }}
                mobile
              />
            </div>
          </>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <TopBar
            title={NAV_TITLES[view] || ""}
            onMenu={() => setSidebarMobile(true)}
            settings={state.settings}
            updateSettings={updateSettingsLocal}
            showFilters={VIEWS_WITH_FILTERS.has(view)}
          />

          {useDemoData && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 px-4 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle size={14} />
              Mode démo — les modifications ne sont pas persistées. Passe
              {" "}
              <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">
                VITE_USE_DEMO_DATA=false
              </code>
              {" "}dans .env.local une fois les migrations Supabase appliquées.
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900 px-4 py-2 text-xs text-red-800 dark:text-red-300 flex items-center gap-2">
              <AlertTriangle size={14} />
              Erreur de chargement&nbsp;: {error}
              <button
                onClick={reload}
                className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900"
              >
                <RefreshCw size={12} /> Réessayer
              </button>
            </div>
          )}

          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {loading ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                <RefreshCw size={16} className="animate-spin mr-2" />
                Chargement…
              </div>
            ) : view === "dashboard" ? (
              <Dashboard state={state} settings={state.settings} />
            ) : view === "pipeline" ? (
              <Pipeline state={state} setState={setState} />
            ) : view === "accounts" ? (
              <AccountsView state={state} setState={setState} />
            ) : view === "contacts" ? (
              <ContactsView state={state} setState={setState} />
            ) : (
              <Placeholder view={view} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SIDEBAR
// ============================================================================
function Sidebar({
  view,
  setView,
  mobile = false,
}: {
  view: string;
  setView: (v: string) => void;
  mobile?: boolean;
}) {
  return (
    <aside
      className={cx(
        "bg-[#0B1E3F] text-slate-300 flex flex-col h-full transition-all duration-200 flex-shrink-0 w-60",
        mobile ? "fixed inset-y-0 left-0 z-40 shadow-2xl" : "hidden md:flex"
      )}
    >
      <div className="h-14 flex items-center px-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#C9A961] flex items-center justify-center flex-shrink-0">
            <Shield size={16} className="text-[#0B1E3F]" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-bold text-white tracking-tight">FOLONEO</div>
            <div className="text-[10px] text-slate-400 -mt-0.5">Sécurité électronique</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cx(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon size={16} strokeWidth={2} />
              <span className="truncate">{item.label}</span>
              {item.accent && !active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#C9A961]" />
              )}
            </button>
          );
        })}
      </nav>

      <SidebarFooter />
    </aside>
  );
}

function SidebarFooter() {
  const { currentCommercial, signOut, isDemoMode } = useAuth();
  const c: Commercial | null = currentCommercial;
  const label = c ? `${c.prenom} ${c.nom}` : "—";
  const role = c?.role ?? "commercial";
  const couleur = c?.couleur ?? "#C9A961";

  return (
    <div className="p-3 border-t border-white/10">
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs text-[#0B1E3F]"
          style={{ background: couleur }}
        >
          {c ? initials(c.prenom, c.nom) : "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-white truncate">{label}</div>
          <div className="text-[10px] text-slate-400 capitalize">
            {role}
            {isDemoMode && " · démo"}
          </div>
        </div>
        {!isDemoMode && (
          <button
            onClick={() => void signOut()}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white"
            title="Se déconnecter"
          >
            <LogOut size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TOPBAR
// ============================================================================
function TopBar({
  title,
  onMenu,
  settings,
  updateSettings,
  showFilters: _showFilters,
}: {
  title: string;
  onMenu: () => void;
  settings: Settings;
  updateSettings: (p: Partial<Settings>) => void;
  showFilters: boolean;
}) {
  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-3 md:px-5 gap-3 sticky top-0 z-30 flex-shrink-0">
      <button
        onClick={onMenu}
        className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
      >
        <Menu size={18} />
      </button>
      <h1 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
        {title}
      </h1>

      <div className="ml-auto flex items-center gap-1.5 md:gap-2">
        <button
          onClick={() => updateSettings({ clientMode: !settings.clientMode })}
          className={cx(
            "hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors",
            settings.clientMode
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
          )}
          title="Mode client masque les marques et prix d'achat"
        >
          {settings.clientMode ? <Eye size={14} /> : <EyeOff size={14} />}
          <span>{settings.clientMode ? "Mode client" : "Mode interne"}</span>
        </button>

        <button
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          title="Ctrl+K"
        >
          <Command size={16} />
        </button>
        <button
          onClick={() => updateSettings({ darkMode: !settings.darkMode })}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
        >
          {settings.darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}

// ============================================================================
// DASHBOARD — minimal, enrichi au Module 8
// ============================================================================
function Dashboard({ state, settings }: { state: AppState; settings: Settings }) {
  const { deals, quotes, invoices, contrats } = state;

  const pipelineValeur = deals
    .filter((d) => d.etape !== "signe" && d.etape !== "perdu")
    .reduce((s, d) => s + (d.valeur * d.probabilite) / 100, 0);

  const signes = deals.filter((d) => d.etape === "signe");
  const caSigne = signes.reduce((s, d) => s + d.valeur, 0);

  const closed = deals.filter((d) => d.etape === "signe" || d.etape === "perdu");
  const tauxTransfo = closed.length > 0 ? signes.length / closed.length : 0;

  const devisARelancer = quotes.filter(
    (q) => q.status === "envoye" && daysAgo(q.sentAt || q.createdAt) > 15
  ).length;

  const facturesRetard = invoices.filter((f) => f.status === "retard").length;
  const contratsARenouveler = contrats.filter((c) => {
    const jours = Math.ceil((new Date(c.dateFin).getTime() - Date.now()) / 86_400_000);
    return jours <= 60 && jours > 0;
  }).length;

  const pipelineByEtape = ETAPES.map((e) => ({
    ...e,
    count: deals.filter((d) => d.etape === e.id).length,
    valeur: deals.filter((d) => d.etape === e.id).reduce((s, d) => s + d.valeur, 0),
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="Pipeline pondéré"
          value={fmtEUR(pipelineValeur)}
          icon={TrendingUp}
          tone="gold"
          sub={`${deals.filter((d) => d.etape !== "signe" && d.etape !== "perdu").length} affaires`}
        />
        <Stat
          label="CA signé"
          value={fmtEUR(caSigne)}
          icon={CheckCircle2}
          tone="emerald"
          sub={`${signes.length} contrats`}
        />
        <Stat
          label="Taux transfo"
          value={fmtPct(tauxTransfo)}
          icon={Target}
          tone="blue"
          sub={`sur ${closed.length} affaires closes`}
        />
        <Stat
          label="À traiter"
          value={devisARelancer + facturesRetard + contratsARenouveler}
          icon={AlertTriangle}
          tone="amber"
          sub="devis / factures / contrats"
        />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Pipeline par étape</h2>
          <Badge tone="slate">{deals.length} affaires total</Badge>
        </div>
        <div className="space-y-3">
          {pipelineByEtape.map((e) => (
            <div key={e.id} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: e.color }}
              />
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300 w-32">
                {e.label}
              </div>
              <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (e.count / Math.max(...pipelineByEtape.map((x) => x.count), 1)) * 100)}%`,
                    background: e.color,
                  }}
                />
              </div>
              <div className="text-sm text-slate-500 w-16 text-right tabular-nums">{e.count}</div>
              <div className="text-sm font-medium w-24 text-right tabular-nums text-slate-900 dark:text-slate-100">
                {fmtEUR(e.valeur)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Devis récents</h2>
        <div className="space-y-2">
          {quotes.slice(0, 5).map((q) => {
            const acc = state.accounts.find((a) => a.id === q.accountId);
            const totaux = calcDevisTotaux(q, settings, state.products);
            return (
              <div
                key={q.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm text-slate-900 dark:text-slate-100">
                    {q.numero}
                  </div>
                  <div className="text-xs text-slate-500">
                    {acc?.raisonSociale} — {fmtEUR(totaux.totalHT)} HT
                  </div>
                </div>
                {q.status === "signe_achat" && <Badge tone="emerald">Signé</Badge>}
                {q.status === "envoye" && <Badge tone="violet">Envoyé</Badge>}
                {q.status === "brouillon" && <Badge tone="slate">Brouillon</Badge>}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// PLACEHOLDER pour les vues non encore reconstruites
// ============================================================================
function Placeholder({ view }: { view: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <EmptyState
        icon={Package}
        title={`Vue « ${NAV_TITLES[view] || view} »`}
        description="Cette vue sera branchée dans un module à venir."
        action={
          <Button variant="outline" size="sm">
            Bientôt
          </Button>
        }
      />
    </div>
  );
}
