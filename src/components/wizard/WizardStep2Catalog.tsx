import { useMemo, useState } from "react";
import { Plus, Trash2, Search, Package, Layers } from "lucide-react";
import { Input, Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/overlays";
import { uid, fmtEURc, fmtEUR, cx } from "@/lib/helpers";
import type { Quote, AppState, Settings, Product, QuoteLine } from "@/types";

interface Props {
  draft: Quote;
  setDraft: React.Dispatch<React.SetStateAction<Quote>>;
  state: AppState;
  settings: Settings;
}

export function WizardStep2Catalog({ draft, setDraft, state, settings }: Props) {
  const [showProducts, setShowProducts] = useState(false);
  const [showPacks, setShowPacks] = useState(false);
  const [searchProducts, setSearchProducts] = useState<string>("");
  // Quantite en cours par produit dans le selecteur (avant ajout)
  const [qtyByProduct, setQtyByProduct] = useState<Record<string, number>>({});
  const getQty = (id: string) => qtyByProduct[id] ?? 1;
  const setQty = (id: string, q: number) =>
    setQtyByProduct((m) => ({ ...m, [id]: Math.max(1, q) }));

  const filteredProducts = useMemo(() => {
    const q = searchProducts.trim().toLowerCase();
    if (!q) return state.products;
    return state.products.filter((p) => {
      const hay =
        `${settings.clientMode ? "" : p.marque + " " + p.libelleInterne + " "}${p.libelleCommercial}`.toLowerCase();
      return hay.includes(q);
    });
  }, [state.products, searchProducts, settings.clientMode]);

  function addProduct(p: Product, quantite = 1) {
    const existing = draft.lignes.find((l) => l.productId === p.id);
    if (existing) {
      // Si le produit est deja dans le devis, on cumule les quantites
      setDraft((d) => ({
        ...d,
        lignes: d.lignes.map((l) =>
          l.id === existing.id ? { ...l, quantite: l.quantite + quantite } : l
        ),
      }));
    } else {
      const line: QuoteLine = {
        id: uid("ql"),
        productId: p.id,
        libelle: settings.clientMode ? p.libelleCommercial : p.libelleInterne,
        quantite,
        prixAchatHT: p.prixAchatHT,
        prixVenteHT: p.prixVenteHT,
      };
      setDraft((d) => ({ ...d, lignes: [...d.lignes, line] }));
    }
    // Reset la quantite du selecteur apres ajout
    setQtyByProduct((m) => {
      const copy = { ...m };
      delete copy[p.id];
      return copy;
    });
  }

  function addPack(packId: string) {
    const pack = state.packs.find((p) => p.id === packId);
    if (!pack) return;
    const newLines: QuoteLine[] = pack.lignes
      .map((pl) => {
        const prod = state.products.find((p) => p.id === pl.productId);
        if (!prod) return null;
        return {
          id: uid("ql"),
          productId: prod.id,
          libelle: settings.clientMode ? prod.libelleCommercial : prod.libelleInterne,
          quantite: pl.quantite,
          prixAchatHT: prod.prixAchatHT,
          prixVenteHT: prod.prixVenteHT,
        } as QuoteLine;
      })
      .filter((l): l is QuoteLine => l !== null);
    setDraft((d) => ({ ...d, lignes: [...d.lignes, ...newLines] }));
    setShowPacks(false);
  }

  function updateLine(id: string, patch: Partial<QuoteLine>) {
    setDraft((d) => ({
      ...d,
      lignes: d.lignes.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  }

  function removeLine(id: string) {
    setDraft((d) => ({ ...d, lignes: d.lignes.filter((l) => l.id !== id) }));
  }

  function addLigneLibre() {
    const line: QuoteLine = {
      id: uid("ql"),
      libelle: "Prestation personnalisée",
      quantite: 1,
      prixAchatHT: 0,
      prixVenteHT: 0,
    };
    setDraft((d) => ({ ...d, lignes: [...d.lignes, line] }));
  }

  const sousTotal = draft.lignes.reduce((s, l) => s + l.prixVenteHT * l.quantite, 0);
  const coutMO = (draft.heuresMO || 0) * (draft.tauxMO || 0);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
          Catalogue et main-d'œuvre
        </div>
        <div className="text-xs text-slate-500">
          Ajoute tes produits, packs ou une ligne libre puis complète la main-d'œuvre.
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="gold"
          icon={Package}
          size="sm"
          onClick={() => {
            setShowProducts((v) => !v);
            setShowPacks(false);
          }}
        >
          Ajouter un produit
        </Button>
        <Button
          variant="outline"
          icon={Layers}
          size="sm"
          onClick={() => {
            setShowPacks((v) => !v);
            setShowProducts(false);
          }}
        >
          Ajouter un pack
        </Button>
        <Button variant="ghost" icon={Plus} size="sm" onClick={addLigneLibre}>
          Ligne libre
        </Button>
      </div>

      {/* Panneau produits */}
      {showProducts && (
        <Card className="p-3">
          <div className="relative mb-2">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <Input
              value={searchProducts}
              onChange={(e) => setSearchProducts(e.target.value)}
              placeholder="Filtrer par nom…"
              className="pl-9"
            />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-1">
            {filteredProducts.map((p) => {
              const qty = getQty(p.id);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {settings.clientMode ? p.libelleCommercial : p.libelleInterne}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      {!settings.clientMode && (
                        <>
                          <Badge tone="slate">{p.marque}</Badge>
                          <span>{p.refFabricant}</span>
                        </>
                      )}
                      <span className="tabular-nums">
                        {fmtEUR(p.prixVenteHT)} HT
                        {!settings.clientMode && ` · achat ${fmtEUR(p.prixAchatHT)}`}
                      </span>
                    </div>
                  </div>
                  {/* Stepper quantite */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setQty(p.id, qty - 1)}
                      disabled={qty <= 1}
                      className="w-7 h-7 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 flex items-center justify-center"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={qty}
                      onChange={(e) => setQty(p.id, Number(e.target.value) || 1)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addProduct(p, qty);
                        }
                      }}
                      className="w-12 h-7 text-center text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 tabular-nums"
                    />
                    <button
                      onClick={() => setQty(p.id, qty + 1)}
                      className="w-7 h-7 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => addProduct(p, qty)}
                    className="inline-flex items-center gap-1 px-2.5 h-7 rounded-md bg-[#C9A961] text-[#0B1E3F] text-xs font-semibold hover:bg-[#D4B570] flex-shrink-0"
                    title={`Ajouter ${qty} × ${settings.clientMode ? p.libelleCommercial : p.libelleInterne}`}
                  >
                    <Plus size={12} /> Ajouter
                  </button>
                </div>
              );
            })}
            {filteredProducts.length === 0 && (
              <div className="text-xs text-slate-500 text-center py-4">Aucun produit</div>
            )}
          </div>
        </Card>
      )}

      {/* Panneau packs */}
      {showPacks && (
        <Card className="p-3">
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {state.packs.map((pk) => (
              <button
                key={pk.id}
                onClick={() => addPack(pk.id)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {pk.nom}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {pk.description} · {pk.lignes.length} lignes · ~{fmtEUR(pk.prixIndicatif)} HT
                  </div>
                </div>
                <Plus size={14} className="text-[#C9A961]" />
              </button>
            ))}
            {state.packs.length === 0 && (
              <div className="text-xs text-slate-500 text-center py-4">Aucun pack</div>
            )}
          </div>
        </Card>
      )}

      {/* Lignes du devis */}
      {draft.lignes.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={Package}
            title="Aucune ligne"
            description="Ajoute au moins un produit, un pack ou une ligne libre."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-900/50">
            <div className="col-span-6">Désignation</div>
            <div className="col-span-2 text-right">Qté</div>
            <div className="col-span-2 text-right">PU HT</div>
            <div className="col-span-2 text-right">Total</div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {draft.lignes.map((l) => {
              const product = l.productId
                ? state.products.find((p) => p.id === l.productId)
                : undefined;
              return (
                <div
                  key={l.id}
                  className="grid grid-cols-12 gap-2 p-3 items-center"
                >
                  <div className="col-span-12 md:col-span-6 min-w-0">
                    <Input
                      value={l.libelle}
                      onChange={(e) => updateLine(l.id, { libelle: e.target.value })}
                      className="text-sm"
                    />
                    {!settings.clientMode && product && (
                      <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                        <Badge tone="slate">{product.marque}</Badge>
                        {product.refFabricant}
                      </div>
                    )}
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.5"
                      value={l.quantite}
                      onChange={(e) => updateLine(l.id, { quantite: Number(e.target.value) })}
                      className="text-right"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={l.prixVenteHT}
                      onChange={(e) => updateLine(l.id, { prixVenteHT: Number(e.target.value) })}
                      className="text-right"
                    />
                  </div>
                  <div className="col-span-3 md:col-span-1 text-sm tabular-nums text-right font-medium">
                    {fmtEURc(l.quantite * l.prixVenteHT)}
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      onClick={() => removeLine(l.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div
            className={cx(
              "px-3 py-2 text-right text-sm font-semibold bg-slate-50 dark:bg-slate-900/50"
            )}
          >
            Sous-total matériel :{" "}
            <span className="tabular-nums">{fmtEURc(sousTotal)}</span>
          </div>
        </Card>
      )}

      {/* Main-d'oeuvre + déplacement */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
        <Input
          label="Heures de main-d'œuvre"
          type="number"
          min={0}
          step="0.5"
          value={draft.heuresMO}
          onChange={(e) =>
            setDraft((d) => ({ ...d, heuresMO: Number(e.target.value) }))
          }
        />
        <Input
          label={`Taux horaire MO (défaut ${settings.tauxMO} €)`}
          type="number"
          min={0}
          value={draft.tauxMO}
          onChange={(e) => setDraft((d) => ({ ...d, tauxMO: Number(e.target.value) }))}
        />
        <Input
          label={`Frais déplacement (défaut ${settings.fraisDeplacement} €)`}
          type="number"
          min={0}
          value={draft.fraisDeplacement}
          onChange={(e) =>
            setDraft((d) => ({ ...d, fraisDeplacement: Number(e.target.value) }))
          }
        />
      </div>
      {(coutMO > 0 || draft.fraisDeplacement > 0) && (
        <div className="text-xs text-slate-500 text-right">
          MO {fmtEURc(coutMO)} + Déplacement {fmtEURc(draft.fraisDeplacement)}
        </div>
      )}
    </div>
  );
}
