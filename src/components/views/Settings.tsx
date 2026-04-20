import { useState } from "react";
import { Save, Download, Upload, AlertTriangle, Building2, Calculator, Percent, Mail } from "lucide-react";
import { Card, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { downloadFile } from "@/lib/helpers";
import { useDemoData } from "@/lib/supabase";
import * as db from "@/lib/db";
import type { AppState, Settings } from "@/types";

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  reload: () => Promise<void>;
}

export function SettingsView({ state, setState, reload }: Props) {
  const [form, setForm] = useState<Settings>(state.settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function patch<K extends keyof Settings>(k: K, v: Settings[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function patchCoefMensuel(k: 36 | 48 | 60, v: number) {
    setForm((s) => ({ ...s, coefMensuel: { ...s.coefMensuel, [k]: v } }));
  }

  function patchCoefMensuelPetit(k: 36 | 48 | 60, v: number) {
    setForm((s) => ({ ...s, coefMensuelPetit: { ...s.coefMensuelPetit, [k]: v } }));
  }

  function patchCommission(k: keyof Settings["commissionTaux"], v: number) {
    setForm((s) => ({ ...s, commissionTaux: { ...s.commissionTaux, [k]: v } }));
  }

  function patchSociete<K extends keyof Settings["societe"]>(k: K, v: Settings["societe"][K]) {
    setForm((s) => ({ ...s, societe: { ...s.societe, [k]: v } }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      let saved: Settings = form;
      if (!useDemoData) {
        saved = await db.updateSettings(form);
      }
      setState((s) => ({ ...s, settings: saved }));
      setSuccess("Paramètres enregistrés");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    if (!window.confirm("Restaurer les valeurs par défaut ? La société n'est pas réinitialisée.")) return;
    setForm((s) => ({
      ...DEFAULT_SETTINGS,
      societe: s.societe,
      clientMode: s.clientMode,
      darkMode: s.darkMode,
    }));
  }

  function exportJson() {
    const snapshot = { exportedAt: new Date().toISOString(), state };
    downloadFile(
      JSON.stringify(snapshot, null, 2),
      `foloneo-export-${new Date().toISOString().slice(0, 10)}.json`,
      "application/json"
    );
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = String(ev.target?.result ?? "");
        const parsed = JSON.parse(raw) as { state?: AppState };
        const imported = parsed.state ?? (parsed as unknown as AppState);
        if (!imported || !Array.isArray(imported.accounts)) {
          throw new Error("Format de fichier invalide");
        }
        if (!window.confirm("Remplacer toutes les données par l'import ?")) return;
        setState(imported);
        setSuccess("Données importées");
        setTimeout(() => setSuccess(null), 3000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de parsing JSON");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Société */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={16} className="text-[#C9A961]" />
          <h2 className="font-semibold">Société</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Nom" value={form.societe.nom} onChange={(e) => patchSociete("nom", e.target.value)} />
          <Input label="SIRET" value={form.societe.siret} onChange={(e) => patchSociete("siret", e.target.value)} />
          <Input label="Adresse" value={form.societe.adresse} onChange={(e) => patchSociete("adresse", e.target.value)} />
          <Input label="Code APE" value={form.societe.ape} onChange={(e) => patchSociete("ape", e.target.value)} />
          <Input label="Téléphone" value={form.societe.telephone} onChange={(e) => patchSociete("telephone", e.target.value)} />
          <Input label="Email" type="email" value={form.societe.email} onChange={(e) => patchSociete("email", e.target.value)} />
          <Input label="Email SAV" type="email" value={form.societe.sav} onChange={(e) => patchSociete("sav", e.target.value)} />
          <Input label="Site web" value={form.societe.site} onChange={(e) => patchSociete("site", e.target.value)} />
        </div>
      </Card>

      {/* Coefficients d'achat */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Calculator size={16} className="text-[#C9A961]" />
          <h2 className="font-semibold">Coefficients d'achat</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="Coef Ajax (× prix Sylis)"
            type="number"
            min={0}
            step="0.01"
            value={form.coefAjax}
            onChange={(e) => patch("coefAjax", Number(e.target.value))}
            hint="Défaut 0.45"
          />
          <Input
            label="Coef Dahua"
            type="number"
            min={0}
            step="0.01"
            value={form.coefDahua}
            onChange={(e) => patch("coefDahua", Number(e.target.value))}
            hint="Défaut 0.45"
          />
          <Input
            label="Diviseur Dahua"
            type="number"
            min={0.01}
            step="0.01"
            value={form.dahuaDiv}
            onChange={(e) => patch("dahuaDiv", Number(e.target.value))}
            hint="TTC → HT ~= 1.20"
          />
          <Input
            label="Coef catégorie défaut (PA → PV)"
            type="number"
            min={1}
            step="0.1"
            value={form.coefCategorieDefault}
            onChange={(e) => patch("coefCategorieDefault", Number(e.target.value))}
            hint="Multiplicateur de vente"
          />
          <Input
            label="TVA"
            type="number"
            min={0}
            max={1}
            step="0.01"
            value={form.tva}
            onChange={(e) => patch("tva", Number(e.target.value))}
            hint="0.20 = 20 %"
          />
        </div>
      </Card>

      {/* Coefficients leasing — deux grilles selon le seuil CA */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Calculator size={16} className="text-[#C9A961]" />
          <h2 className="font-semibold">Coefficients leasing "full options"</h2>
        </div>
        <div className="text-[11px] text-slate-500 mb-4">
          Mensualité = totalHT × coef selon la durée. Grille appliquée selon le seuil CA
          ci-dessous. Full options : matériel + maintenance + évolutions inclus.
        </div>
        <div className="mb-3">
          <Input
            label="Seuil CA de bascule entre les deux grilles (€)"
            type="number"
            min={0}
            step="100"
            value={form.seuilLeasing}
            onChange={(e) => patch("seuilLeasing", Number(e.target.value))}
            hint={`En-dessous : grille "petit CA" · à partir de : grille "grand CA"`}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
            <div className="text-xs font-semibold text-amber-900 dark:text-amber-300 mb-2">
              Grille petit CA (&lt; {form.seuilLeasing} €) — taux ~7 %
            </div>
            <div className="space-y-2">
              <Input
                label="Coef 36 mois"
                type="number"
                min={0}
                step="0.00001"
                value={form.coefMensuelPetit[36]}
                onChange={(e) => patchCoefMensuelPetit(36, Number(e.target.value))}
              />
              <Input
                label="Coef 48 mois"
                type="number"
                min={0}
                step="0.00001"
                value={form.coefMensuelPetit[48]}
                onChange={(e) => patchCoefMensuelPetit(48, Number(e.target.value))}
              />
              <Input
                label="Coef 60 mois"
                type="number"
                min={0}
                step="0.00001"
                value={form.coefMensuelPetit[60]}
                onChange={(e) => patchCoefMensuelPetit(60, Number(e.target.value))}
              />
            </div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
            <div className="text-xs font-semibold text-emerald-900 dark:text-emerald-300 mb-2">
              Grille grand CA (≥ {form.seuilLeasing} €) — taux ~5 %
            </div>
            <div className="space-y-2">
              <Input
                label="Coef 36 mois"
                type="number"
                min={0}
                step="0.00001"
                value={form.coefMensuel[36]}
                onChange={(e) => patchCoefMensuel(36, Number(e.target.value))}
              />
              <Input
                label="Coef 48 mois"
                type="number"
                min={0}
                step="0.00001"
                value={form.coefMensuel[48]}
                onChange={(e) => patchCoefMensuel(48, Number(e.target.value))}
              />
              <Input
                label="Coef 60 mois"
                type="number"
                min={0}
                step="0.00001"
                value={form.coefMensuel[60]}
                onChange={(e) => patchCoefMensuel(60, Number(e.target.value))}
              />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <Input
            label="Provision évolutions (annuel, legacy)"
            type="number"
            min={0}
            max={1}
            step="0.01"
            value={form.provisionEvolutions}
            onChange={(e) => patch("provisionEvolutions", Number(e.target.value))}
            hint="Non utilisé en formule full-options, conservé pour historique"
          />
        </div>
      </Card>

      {/* Installation */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Percent size={16} className="text-[#C9A961]" />
          <h2 className="font-semibold">Installation et objectifs</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="Taux horaire MO (€/h)"
            type="number"
            min={0}
            value={form.tauxMO}
            onChange={(e) => patch("tauxMO", Number(e.target.value))}
          />
          <Input
            label="Frais déplacement (€)"
            type="number"
            min={0}
            value={form.fraisDeplacement}
            onChange={(e) => patch("fraisDeplacement", Number(e.target.value))}
          />
          <Input
            label="Objectif mensuel défaut (€)"
            type="number"
            min={0}
            value={form.objectifMensuelDefaut}
            onChange={(e) => patch("objectifMensuelDefaut", Number(e.target.value))}
          />
        </div>
      </Card>

      {/* Commissions */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Percent size={16} className="text-[#C9A961]" />
          <h2 className="font-semibold">Commissions par défaut</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="Achat %"
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={+(form.commissionTaux.achat * 100).toFixed(1)}
            onChange={(e) => patchCommission("achat", Number(e.target.value) / 100)}
          />
          <Input
            label="Leasing %"
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={+(form.commissionTaux.leasing * 100).toFixed(1)}
            onChange={(e) => patchCommission("leasing", Number(e.target.value) / 100)}
          />
          <Input
            label="Maintenance %"
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={+(form.commissionTaux.maintenance * 100).toFixed(1)}
            onChange={(e) => patchCommission("maintenance", Number(e.target.value) / 100)}
          />
        </div>
      </Card>

      {/* Export / Import */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Mail size={16} className="text-[#C9A961]" />
          <h2 className="font-semibold">Sauvegarde et import</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={Download} onClick={exportJson}>
            Exporter JSON complet
          </Button>
          <label className="inline-flex">
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importJson(f);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              icon={Upload}
              onClick={(e) => {
                (e.currentTarget.previousElementSibling as HTMLInputElement | null)?.click();
              }}
            >
              Importer JSON
            </Button>
          </label>
          <Button variant="ghost" onClick={() => void reload()}>
            Recharger depuis Supabase
          </Button>
        </div>
        <div className="text-[11px] text-slate-500 mt-2">
          L'import remplace TOUTES les données (comptes, deals, devis, etc.). Recommandé
          pour la migration depuis un autre outil.
        </div>
      </Card>

      {/* Actions */}
      {error && (
        <div className="text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle size={12} /> {error}
        </div>
      )}
      {success && (
        <div className="text-xs text-emerald-600 flex items-center gap-1">
          ✓ {success}
        </div>
      )}
      <div className="flex items-center gap-2 pt-2 sticky bottom-0 bg-[#F7F8FA] dark:bg-slate-950 py-3 -mx-4 md:-mx-6 px-4 md:px-6 border-t border-slate-200 dark:border-slate-800">
        <Button variant="ghost" onClick={reset} disabled={saving}>
          Réinitialiser aux valeurs par défaut
        </Button>
        <div className="flex-1" />
        <Button variant="primary" icon={Save} onClick={save} disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer les paramètres"}
        </Button>
      </div>
    </div>
  );
}
