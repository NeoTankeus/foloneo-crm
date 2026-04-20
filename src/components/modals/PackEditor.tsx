import { useEffect, useState } from "react";
import { Save, Trash2, AlertTriangle, Plus, X } from "lucide-react";
import { Modal } from "@/components/ui/overlays";
import { Input, Select, Textarea, Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { uid, fmtEUR } from "@/lib/helpers";
import { useDemoData } from "@/lib/supabase";
import * as db from "@/lib/db";
import type { Pack, Product, Settings } from "@/types";

interface Props {
  open: boolean;
  pack: Pack | null;
  products: Product[];
  settings: Settings;
  onClose: () => void;
  onSaved: (p: Pack) => void;
  onDeleted?: (id: string) => void;
}

const EMPTY: Omit<Pack, "id"> = {
  nom: "",
  description: "",
  cible: "PME",
  lignes: [],
  prixIndicatif: 0,
};

export function PackEditor({
  open,
  pack,
  products,
  settings,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const [form, setForm] = useState<Omit<Pack, "id">>(EMPTY);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pack) {
      const { id: _id, ...rest } = pack;
      setForm(rest);
    } else {
      setForm(EMPTY);
    }
    setError(null);
    setSelectedProduct("");
  }, [pack, open]);

  function addLine() {
    if (!selectedProduct) return;
    if (form.lignes.some((l) => l.productId === selectedProduct)) return;
    setForm((s) => ({
      ...s,
      lignes: [...s.lignes, { productId: selectedProduct, quantite: 1 }],
    }));
    setSelectedProduct("");
  }

  function removeLine(productId: string) {
    setForm((s) => ({ ...s, lignes: s.lignes.filter((l) => l.productId !== productId) }));
  }

  function updateQty(productId: string, quantite: number) {
    setForm((s) => ({
      ...s,
      lignes: s.lignes.map((l) => (l.productId === productId ? { ...l, quantite } : l)),
    }));
  }

  function recalcPrixIndicatif() {
    const total = form.lignes.reduce((s, l) => {
      const p = products.find((pp) => pp.id === l.productId);
      return s + (p?.prixVenteHT ?? 0) * l.quantite;
    }, 0);
    setForm((s) => ({ ...s, prixIndicatif: Math.round(total) }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      let saved: Pack;
      if (pack) {
        saved = useDemoData ? { ...pack, ...form } : await db.updatePack(pack.id, form);
      } else {
        saved = useDemoData ? { ...form, id: uid("pk") } : await db.createPack(form);
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
    if (!pack) return;
    if (!window.confirm(`Supprimer le pack "${pack.nom}" ?`)) return;
    setSaving(true);
    try {
      if (!useDemoData) await db.deletePack(pack.id);
      onDeleted?.(pack.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de suppression");
    } finally {
      setSaving(false);
    }
  }

  const totalCalcul = form.lignes.reduce((s, l) => {
    const p = products.find((pp) => pp.id === l.productId);
    return s + (p?.prixVenteHT ?? 0) * l.quantite;
  }, 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={pack ? "Modifier le pack" : "Nouveau pack"}
      size="lg"
      footer={
        <>
          {pack && onDeleted && (
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
            disabled={saving || !form.nom || form.lignes.length === 0}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input
          label="Nom du pack"
          required
          value={form.nom}
          onChange={(e) => setForm((s) => ({ ...s, nom: e.target.value }))}
        />
        <Input
          label="Cible"
          value={form.cible}
          onChange={(e) => setForm((s) => ({ ...s, cible: e.target.value }))}
          placeholder="Commerce, PME, Premium, Résidentiel…"
        />
        <Textarea
          label="Description"
          rows={2}
          value={form.description}
          onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
        />

        <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Composition
          </div>
          <div className="flex gap-2 mb-3">
            <Select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="flex-1"
            >
              <option value="">— Ajouter un produit —</option>
              {products
                .filter((p) => !form.lignes.some((l) => l.productId === p.id))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {settings.clientMode ? p.libelleCommercial : p.libelleInterne}
                  </option>
                ))}
            </Select>
            <Button variant="gold" icon={Plus} onClick={addLine} disabled={!selectedProduct}>
              Ajouter
            </Button>
          </div>
          {form.lignes.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
              Aucun produit dans le pack
            </div>
          ) : (
            <Card className="divide-y divide-slate-100 dark:divide-slate-800">
              {form.lignes.map((l) => {
                const p = products.find((pp) => pp.id === l.productId);
                const lineTotal = (p?.prixVenteHT ?? 0) * l.quantite;
                return (
                  <div key={l.productId} className="flex items-center gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {p
                          ? settings.clientMode
                            ? p.libelleCommercial
                            : p.libelleInterne
                          : "—"}
                      </div>
                      {p && !settings.clientMode && (
                        <div className="text-[11px] text-slate-500">
                          {p.marque} · {fmtEUR(p.prixVenteHT)}/unité
                        </div>
                      )}
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={l.quantite}
                      onChange={(e) => updateQty(l.productId, Number(e.target.value))}
                      className="w-20 text-right"
                    />
                    <div className="w-24 text-right text-sm font-medium tabular-nums">
                      {fmtEUR(lineTotal)}
                    </div>
                    <button
                      onClick={() => removeLine(l.productId)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Input
            label="Prix indicatif (€)"
            type="number"
            min={0}
            value={form.prixIndicatif}
            onChange={(e) =>
              setForm((s) => ({ ...s, prixIndicatif: Number(e.target.value) }))
            }
            hint={`Total calculé : ${fmtEUR(totalCalcul)}`}
          />
          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={recalcPrixIndicatif}
              disabled={form.lignes.length === 0}
            >
              Utiliser total calculé ({fmtEUR(totalCalcul)})
            </Button>
          </div>
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
