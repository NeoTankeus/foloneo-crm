import { useState } from "react";
import { FileText, Send, Check, AlertTriangle, Eye } from "lucide-react";
import { Card, Select, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { PrintView } from "@/components/PrintView";
import { fmtEUR, fmtEURc } from "@/lib/helpers";
import { calcDevisTotaux } from "@/lib/calculations";
import type { Quote, AppState, Settings, FormuleChoisie } from "@/types";

interface Props {
  draft: Quote;
  setDraft: React.Dispatch<React.SetStateAction<Quote>>;
  state: AppState;
  settings: Settings;
}

export function WizardStep4Generate({ draft, setDraft, state, settings }: Props) {
  const [previewMode, setPreviewMode] = useState<"achat" | "leasing" | null>(null);
  const totaux = calcDevisTotaux(draft, settings, state.products);
  const account = state.accounts.find((a) => a.id === draft.accountId);

  function markAsSent() {
    setDraft((d) => ({
      ...d,
      status: "envoye",
      sentAt: d.sentAt ?? new Date().toISOString(),
    }));
  }

  function markAsSigned(formule: FormuleChoisie) {
    if (!formule) return;
    setDraft((d) => ({
      ...d,
      status: formule === "leasing" ? "signe_leasing" : "signe_achat",
      formuleChoisie: formule,
      signedAt: d.signedAt ?? new Date().toISOString(),
    }));
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
          Génération et envoi
        </div>
        <div className="text-xs text-slate-500">
          Visualise les deux versions PDF avant d'envoyer au client.
        </div>
      </div>

      {/* Récap */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Client
            </div>
            <div className="font-semibold truncate">
              {account?.raisonSociale ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Numéro
            </div>
            <div className="font-semibold">{draft.numero}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Total HT
            </div>
            <div className="font-semibold tabular-nums">{fmtEURc(totaux.totalHT)}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Mensualité Leasing
            </div>
            <div className="font-semibold tabular-nums text-[#C9A961]">
              {fmtEUR(totaux.mensualiteTotale)} / mois
            </div>
          </div>
        </div>
      </Card>

      {/* Deux versions PDF */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0B1E3F]/10 text-[#0B1E3F] dark:bg-[#C9A961]/20 dark:text-[#C9A961] flex items-center justify-center flex-shrink-0">
              <FileText size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">Version Achat</div>
              <div className="text-xs text-slate-500">
                Détails complets : PU HT, totaux, maintenance en option.
              </div>
              <Button
                variant="primary"
                icon={Eye}
                size="sm"
                className="mt-3"
                onClick={() => setPreviewMode("achat")}
              >
                Prévisualiser PDF Achat
              </Button>
            </div>
          </div>
        </Card>
        <Card className="p-4 ring-2 ring-[#C9A961]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#F8F0DC] text-[#8B7228] flex items-center justify-center flex-shrink-0">
              <FileText size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">Version Leasing (PGE)</div>
              <div className="text-xs text-slate-500">
                Sans prix unitaire, sans marque. Mensualité {fmtEUR(totaux.mensualiteTotale)} /
                mois.
              </div>
              <Button
                variant="gold"
                icon={Eye}
                size="sm"
                className="mt-3"
                onClick={() => setPreviewMode("leasing")}
              >
                Prévisualiser PDF Leasing
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions de statut */}
      <Card className="p-4">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Statut du devis
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={draft.status} />
          {draft.formuleChoisie && (
            <Badge tone="emerald">
              Formule : {FORMULE_LABELS[draft.formuleChoisie]}
            </Badge>
          )}
          <div className="flex-1" />
          {draft.status === "brouillon" && (
            <Button variant="primary" icon={Send} onClick={markAsSent}>
              Marquer comme envoyé
            </Button>
          )}
          {draft.status === "envoye" && (
            <>
              <Select
                value=""
                onChange={(e) => markAsSigned(e.target.value as FormuleChoisie)}
                className="max-w-[220px]"
              >
                <option value="">Marquer signé…</option>
                <option value="achat">Signé — Achat</option>
                <option value="achat_maintenance">Signé — Achat + Maintenance</option>
                <option value="leasing">Signé — Leasing</option>
              </Select>
            </>
          )}
          {(draft.status === "signe_achat" || draft.status === "signe_leasing") && (
            <Badge tone="emerald">
              <Check size={12} /> Signé le{" "}
              {draft.signedAt && new Date(draft.signedAt).toLocaleDateString("fr-FR")}
            </Badge>
          )}
        </div>
      </Card>

      <div className="text-[11px] text-slate-500 flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
        <div>
          Le PDF Leasing masque automatiquement tous les prix unitaires et les marques
          fabricant. Le client voit uniquement la désignation commerciale et la mensualité
          globale.
        </div>
      </div>

      {/* Modale preview */}
      {previewMode && (
        <PrintView
          open
          quote={draft}
          state={state}
          settings={settings}
          mode={previewMode}
          onClose={() => setPreviewMode(null)}
        />
      )}
    </div>
  );
}

const FORMULE_LABELS: Record<NonNullable<FormuleChoisie>, string> = {
  achat: "Achat",
  achat_maintenance: "Achat + Maintenance",
  leasing: "Leasing",
};

function StatusBadge({ status }: { status: Quote["status"] }) {
  switch (status) {
    case "brouillon":
      return <Badge tone="slate">Brouillon</Badge>;
    case "envoye":
      return <Badge tone="violet">Envoyé</Badge>;
    case "signe_achat":
      return <Badge tone="emerald">Signé Achat</Badge>;
    case "signe_leasing":
      return <Badge tone="gold">Signé Leasing</Badge>;
    case "perdu":
      return <Badge tone="red">Perdu</Badge>;
    default:
      return <Badge tone="slate">{status}</Badge>;
  }
}
