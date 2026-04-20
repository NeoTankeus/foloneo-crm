import { useEffect, useMemo, useState } from "react";
import { Save, Trash2, AlertTriangle, Calculator } from "lucide-react";
import { Modal } from "@/components/ui/overlays";
import { Input, Select } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { calcPrixAchat } from "@/lib/calculations";
import { uid } from "@/lib/helpers";
import { useDemoData } from "@/lib/supabase";
import * as db from "@/lib/db";
import type { Product, Settings, Marque, ProductType } from "@/types";

interface Props {
  open: boolean;
  product: Product | null;
  settings: Settings;
  onClose: () => void;
  onSaved: (p: Product) => void;
  onDeleted?: (id: string) => void;
}

const EMPTY: Omit<Product, "id"> = {
  refFabricant: "",
  libelleInterne: "",
  libelleCommercial: "",
  marque: "autre",
  type: "alarme",
  prixSylis: undefined,
  prixMarche: undefined,
  prixAchatHT: 0,
  prixVenteHT: 0,
};

export function ProductEditor({ open, product, settings, onClose, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState<Omit<Product, "id">>(EMPTY);
  const [autoCalc, setAutoCalc] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      const { id: _id, ...rest } = product;
      setForm(rest);
    } else {
      setForm(EMPTY);
    }
    setError(null);
    setAutoCalc(true);
  }, [product, open]);

  function patch<K extends keyof Product>(k: K, v: Product[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  // Recalcul automatique du prix d'achat selon la marque
  const calculatedPA = useMemo(
    () =>
      calcPrixAchat(
        {
          marque: form.marque,
          prixSylis: form.prixSylis,
          prixMarche: form.prixMarche,
          prixAchatHT: form.prixAchatHT,
        },
        settings
      ),
    [form.marque, form.prixSylis, form.prixMarche, form.prixAchatHT, settings]
  );

  useEffect(() => {
    if (autoCalc && (form.marque === "ajax" || form.marque === "dahua")) {
      setForm((s) => ({ ...s, prixAchatHT: calculatedPA }));
    }
  }, [calculatedPA, autoCalc, form.marque]);

  // Auto coef categorie pour le prix de vente si PA change
  const suggestedPV = useMemo(
    () => +(form.prixAchatHT * settings.coefCategorieDefault).toFixed(2),
    [form.prixAchatHT, settings.coefCategorieDefault]
  );

  async function save() {
    setSaving(true);
    setError(null);
    try {
      let saved: Product;
      if (product) {
        saved = useDemoData ? { ...product, ...form } : await db.updateProduct(product.id, form);
      } else {
        saved = useDemoData ? { ...form, id: uid("p") } : await db.createProduct(form);
      }
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!product) return;
    if (!window.confirm(`Supprimer le produit "${product.libelleInterne}" ?`)) return;
    setSaving(true);
    try {
      if (!useDemoData) await db.deleteProduct(product.id);
      onDeleted?.(product.id);
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
      title={product ? "Modifier le produit" : "Nouveau produit"}
      size="lg"
      footer={
        <>
          {product && onDeleted && (
            <Button variant="danger" icon={Trash2} onClick={remove} disabled={saving}>
              Supprimer
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button
            variant="primary"
            icon={Save}
            onClick={save}
            disabled={saving || !form.libelleInterne || !form.libelleCommercial}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Référence fabricant"
            value={form.refFabricant}
            onChange={(e) => patch("refFabricant", e.target.value)}
            placeholder="HUB2PLUS"
          />
          <Select
            label="Marque"
            value={form.marque}
            onChange={(e) => patch("marque", e.target.value as Marque)}
          >
            <option value="ajax">Ajax</option>
            <option value="dahua">Dahua</option>
            <option value="vauban">Vauban</option>
            <option value="autre">Autre</option>
          </Select>
        </div>
        <Input
          label="Libellé interne (avec marque)"
          required
          value={form.libelleInterne}
          onChange={(e) => patch("libelleInterne", e.target.value)}
          placeholder="Hub 2 Plus Ajax"
          hint="Utilisé en mode interne et dans les vues d'équipe"
        />
        <Input
          label="Libellé commercial (sans marque)"
          required
          value={form.libelleCommercial}
          onChange={(e) => patch("libelleCommercial", e.target.value)}
          placeholder="Centrale d'alarme connectée 4G/Wi-Fi"
          hint="Affiché en mode client et sur les PDF"
        />
        <Select
          label="Type"
          value={form.type}
          onChange={(e) => patch("type", e.target.value as ProductType)}
        >
          <option value="alarme">Alarme</option>
          <option value="video">Vidéosurveillance</option>
          <option value="acces">Contrôle d'accès</option>
          <option value="incendie">Incendie</option>
          <option value="accessoire">Accessoire</option>
        </Select>

        {/* Pricing selon marque */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Tarification
            </div>
            {(form.marque === "ajax" || form.marque === "dahua") && (
              <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCalc}
                  onChange={(e) => setAutoCalc(e.target.checked)}
                  className="accent-[#C9A961]"
                />
                Calcul automatique
              </label>
            )}
          </div>
          {form.marque === "ajax" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Prix Sylis (€)"
                type="number"
                min={0}
                step="0.01"
                value={form.prixSylis ?? ""}
                onChange={(e) =>
                  patch("prixSylis", e.target.value ? Number(e.target.value) : undefined)
                }
                hint={`Prix achat = prixSylis × ${settings.coefAjax}`}
              />
              <Input
                label="Prix achat HT (€)"
                type="number"
                min={0}
                step="0.01"
                value={form.prixAchatHT}
                onChange={(e) => {
                  setAutoCalc(false);
                  patch("prixAchatHT", Number(e.target.value));
                }}
                hint={autoCalc ? "Calculé auto depuis prix Sylis" : "Manuel"}
              />
            </div>
          )}
          {form.marque === "dahua" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Prix marché TTC (€)"
                type="number"
                min={0}
                step="0.01"
                value={form.prixMarche ?? ""}
                onChange={(e) =>
                  patch("prixMarche", e.target.value ? Number(e.target.value) : undefined)
                }
                hint={`Prix achat = (prixMarché / ${settings.dahuaDiv}) × ${settings.coefDahua}`}
              />
              <Input
                label="Prix achat HT (€)"
                type="number"
                min={0}
                step="0.01"
                value={form.prixAchatHT}
                onChange={(e) => {
                  setAutoCalc(false);
                  patch("prixAchatHT", Number(e.target.value));
                }}
                hint={autoCalc ? "Calculé auto depuis prix marché" : "Manuel"}
              />
            </div>
          )}
          {(form.marque === "vauban" || form.marque === "autre") && (
            <Input
              label="Prix achat HT (€)"
              type="number"
              min={0}
              step="0.01"
              value={form.prixAchatHT}
              onChange={(e) => patch("prixAchatHT", Number(e.target.value))}
            />
          )}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <Input
              label="Prix de vente HT (€)"
              type="number"
              min={0}
              step="0.01"
              value={form.prixVenteHT}
              onChange={(e) => patch("prixVenteHT", Number(e.target.value))}
            />
            <Button
              variant="outline"
              icon={Calculator}
              size="sm"
              onClick={() => patch("prixVenteHT", suggestedPV)}
              disabled={form.prixAchatHT <= 0}
            >
              Suggérer PV = {suggestedPV} €
            </Button>
          </div>
          {form.prixAchatHT > 0 && form.prixVenteHT > 0 && (
            <div className="mt-2 text-xs text-slate-500">
              Marge brute : <span className="font-semibold text-emerald-600">
                {(((form.prixVenteHT - form.prixAchatHT) / form.prixVenteHT) * 100).toFixed(1)} %
              </span>{" "}
              · Coef : ×{(form.prixVenteHT / form.prixAchatHT).toFixed(2)}
            </div>
          )}
        </div>

        {error && (
          <div className="text-xs text-red-600 flex items-center gap-1">
            <AlertTriangle size={12} /> {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
