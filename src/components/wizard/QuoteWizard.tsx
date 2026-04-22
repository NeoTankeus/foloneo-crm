import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Save, Trash2, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/overlays";
import { Button } from "@/components/ui/Button";
import { WizardStep1Client } from "./WizardStep1Client";
import { WizardStep2Catalog } from "./WizardStep2Catalog";
import { WizardStep3Formules } from "./WizardStep3Formules";
import { WizardStep4Generate } from "./WizardStep4Generate";
import { calcDevisTotaux } from "@/lib/calculations";
import { upsertById, removeById, cx, fmtEUR } from "@/lib/helpers";
import { useDemoData } from "@/lib/supabase";
import * as db from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import type { AppState, Quote, Settings } from "@/types";

interface Props {
  open: boolean;
  quote: Quote | null; // null = nouveau devis
  defaultAccountId?: string;
  defaultDealId?: string;
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  settings: Settings;
  onClose: () => void;
  onSaved?: (q: Quote) => void;
}

const STEPS = [
  { id: 1, label: "Client" },
  { id: 2, label: "Catalogue" },
  { id: 3, label: "Formules" },
  { id: 4, label: "Générer" },
];

export function QuoteWizard({
  open,
  quote,
  defaultAccountId,
  defaultDealId,
  state,
  setState,
  settings,
  onClose,
  onSaved,
}: Props) {
  const { currentCommercial } = useAuth();
  const [draft, setDraft] = useState<Quote | null>(null);
  const [step, setStep] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialise le draft UNIQUEMENT quand la modale s'ouvre (false -> true)
  // ou quand le devis cible change. On NE reset PAS si les autres props
  // (settings, commerciaux, currentCommercial...) changent pendant la saisie,
  // sinon l'utilisateur perd tout a chaque mise a jour d'etat parente.
  useEffect(() => {
    if (!open) return;
    (async () => {
      if (quote) {
        setDraft(quote);
        setStep(0);
      } else {
        const numero = await safeNextNumero();
        const initial: Quote = {
          id: "",
          numero,
          dealId: defaultDealId ?? null,
          accountId: defaultAccountId ?? "",
          commercialId: currentCommercial?.id ?? state.commerciaux[0]?.id ?? "",
          lignes: [],
          heuresMO: 0,
          tauxMO: settings.tauxMO,
          fraisDeplacement: settings.fraisDeplacement,
          modeAchat: { maintenance: "confort" },
          modeLeasing: { duree: 48 },
          status: "brouillon",
          formuleChoisie: null,
          createdAt: new Date().toISOString(),
        };
        setDraft(initial);
        setStep(0);
      }
      setError(null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quote]);

  const totaux = useMemo(
    () => (draft ? calcDevisTotaux(draft, settings, state.products) : null),
    [draft, settings, state.products]
  );

  if (!draft) return null;

  function canGoNext(): boolean {
    if (!draft) return false;
    // Step 0 : le compte peut etre vide (auto-cree a la sauvegarde) ; seul le commercial est requis.
    if (step === 0) return !!draft.commercialId;
    if (step === 1) return draft.lignes.length > 0;
    return true;
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      let saved: Quote;
      const autoCreateAccount = !draft.accountId;
      if (quote && quote.id) {
        saved = useDemoData ? { ...draft } : await db.updateQuote(quote.id, draft);
      } else {
        saved = useDemoData
          ? { ...draft, id: `demo_q_${Date.now()}` }
          : await db.createQuote(draft);
      }
      // Si un compte a ete cree automatiquement cote DB, on recharge la liste
      // pour que l'UI (vues Clients, wizard, etc.) voie le nouveau compte.
      let accountsPatch: Awaited<ReturnType<typeof db.listAccounts>> | null = null;
      if (autoCreateAccount && !useDemoData) {
        try {
          accountsPatch = await db.listAccounts();
        } catch {
          /* refresh best-effort */
        }
      }
      setState((s) => ({
        ...s,
        quotes: upsertById(s.quotes, saved),
        accounts: accountsPatch ?? s.accounts,
      }));
      onSaved?.(saved);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!quote || !quote.id) return;
    if (!window.confirm(`Supprimer le devis ${quote.numero} ?`)) return;
    setSaving(true);
    try {
      if (!useDemoData) await db.deleteQuote(quote.id);
      setState((s) => ({ ...s, quotes: removeById(s.quotes, quote.id) }));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de suppression");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="full"
      title={`${quote ? "Modifier" : "Nouveau"} devis — ${draft.numero}`}
      footer={
        <>
          {quote && quote.id && (
            <Button variant="danger" icon={Trash2} onClick={remove} disabled={saving}>
              Supprimer
            </Button>
          )}
          <div className="flex-1" />
          {/* Totaux toujours visibles */}
          {totaux && (
            <div className="hidden sm:flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400 mr-3">
              <span>
                Total HT :{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {fmtEUR(totaux.totalHT)}
                </span>
              </span>
              <span>
                Leasing :{" "}
                <span className="font-semibold text-[#C9A961] tabular-nums">
                  {fmtEUR(totaux.mensualiteTotale)}/mois
                </span>
              </span>
            </div>
          )}
          {step > 0 ? (
            <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep(step - 1)}>
              Précédent
            </Button>
          ) : (
            <Button variant="ghost" onClick={onClose}>
              Annuler
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              variant="primary"
              icon={ArrowRight}
              onClick={() => setStep(step + 1)}
              disabled={!canGoNext()}
            >
              Suivant
            </Button>
          ) : (
            <Button variant="gold" icon={Save} onClick={save} disabled={saving || !canGoNext()}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          )}
        </>
      }
    >
      {/* Stepper */}
      <div className="mb-5 border-b border-slate-200 dark:border-slate-800 -mx-5 px-5 pb-4">
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => {
            const active = i === step;
            const done = i < step;
            return (
              <button
                key={s.id}
                onClick={() => {
                  if (i <= step) setStep(i);
                }}
                className={cx(
                  "flex-1 h-10 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors",
                  active && "bg-[#0B1E3F] text-white",
                  done && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
                  !active && !done && "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                )}
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                  {s.id}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      {step === 0 && <WizardStep1Client draft={draft} setDraft={setDraft as React.Dispatch<React.SetStateAction<Quote>>} state={state} />}
      {step === 1 && (
        <WizardStep2Catalog
          draft={draft}
          setDraft={setDraft as React.Dispatch<React.SetStateAction<Quote>>}
          state={state}
          settings={settings}
        />
      )}
      {step === 2 && (
        <WizardStep3Formules
          draft={draft}
          setDraft={setDraft as React.Dispatch<React.SetStateAction<Quote>>}
          state={state}
          settings={settings}
        />
      )}
      {step === 3 && (
        <WizardStep4Generate
          draft={draft}
          setDraft={setDraft as React.Dispatch<React.SetStateAction<Quote>>}
          state={state}
          settings={settings}
        />
      )}

      {error && (
        <div className="mt-3 text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle size={12} /> {error}
        </div>
      )}
    </Modal>
  );
}

async function safeNextNumero(): Promise<string> {
  try {
    return await db.nextQuoteNumero();
  } catch {
    const year = new Date().getFullYear();
    return `DEV-${year}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;
  }
}
