import { useMemo, useState } from "react";
import { Plus, Search, Package, Layers } from "lucide-react";
import { Card, Input, Select, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/overlays";
import { ProductEditor } from "@/components/modals/ProductEditor";
import { PackEditor } from "@/components/modals/PackEditor";
import { fmtEUR, cx, upsertById, removeById } from "@/lib/helpers";
import type { AppState, Settings, Product, Pack, Marque, ProductType } from "@/types";

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  settings: Settings;
}

const MARQUE_TONES: Record<Marque, "gold" | "blue" | "violet" | "slate"> = {
  ajax: "gold",
  dahua: "blue",
  vauban: "violet",
  autre: "slate",
};

const TYPE_LABELS: Record<ProductType, string> = {
  alarme: "Alarme",
  video: "Vidéo",
  acces: "Accès",
  incendie: "Incendie",
  accessoire: "Accessoire",
};

export function CatalogView({ state, setState, settings }: Props) {
  const [tab, setTab] = useState<"products" | "packs">("products");
  const [search, setSearch] = useState<string>("");
  const [marque, setMarque] = useState<Marque | "all">("all");
  const [type, setType] = useState<ProductType | "all">("all");

  const [productEditor, setProductEditor] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  });
  const [packEditor, setPackEditor] = useState<{ open: boolean; pack: Pack | null }>({
    open: false,
    pack: null,
  });

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.products.filter((p) => {
      if (marque !== "all" && p.marque !== marque) return false;
      if (type !== "all" && p.type !== type) return false;
      if (q) {
        const hay =
          `${settings.clientMode ? "" : p.marque + " " + p.libelleInterne + " " + p.refFabricant + " "}${p.libelleCommercial}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [state.products, search, marque, type, settings.clientMode]);

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setTab("products")}
          className={cx(
            "px-4 py-2 text-sm font-semibold border-b-2 -mb-px",
            tab === "products"
              ? "border-[#C9A961] text-[#0B1E3F] dark:text-[#C9A961]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <Package size={14} className="inline mr-1.5" />
          Produits ({state.products.length})
        </button>
        <button
          onClick={() => setTab("packs")}
          className={cx(
            "px-4 py-2 text-sm font-semibold border-b-2 -mb-px",
            tab === "packs"
              ? "border-[#C9A961] text-[#0B1E3F] dark:text-[#C9A961]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <Layers size={14} className="inline mr-1.5" />
          Packs ({state.packs.length})
        </button>
      </div>

      {tab === "products" && (
        <>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="pl-9"
              />
            </div>
            {!settings.clientMode && (
              <Select
                value={marque}
                onChange={(e) => setMarque(e.target.value as Marque | "all")}
                className="sm:max-w-[160px]"
              >
                <option value="all">Toutes marques</option>
                <option value="ajax">Ajax</option>
                <option value="dahua">Dahua</option>
                <option value="vauban">Vauban</option>
                <option value="autre">Autre</option>
              </Select>
            )}
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as ProductType | "all")}
              className="sm:max-w-[160px]"
            >
              <option value="all">Tous types</option>
              <option value="alarme">Alarme</option>
              <option value="video">Vidéosurveillance</option>
              <option value="acces">Contrôle d'accès</option>
              <option value="incendie">Incendie</option>
              <option value="accessoire">Accessoire</option>
            </Select>
            <Button
              variant="gold"
              icon={Plus}
              onClick={() => setProductEditor({ open: true, product: null })}
            >
              Nouveau produit
            </Button>
          </div>

          {filteredProducts.length === 0 ? (
            <Card className="p-6">
              <EmptyState
                icon={Package}
                title="Aucun produit"
                description="Ajoute ton premier produit au catalogue."
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredProducts.map((p) => {
                const marge = p.prixVenteHT > 0 ? (p.prixVenteHT - p.prixAchatHT) / p.prixVenteHT : 0;
                return (
                  <Card
                    key={p.id}
                    hover
                    onClick={() => setProductEditor({ open: true, product: p })}
                    className="p-4"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate">
                          {settings.clientMode ? p.libelleCommercial : p.libelleInterne}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {TYPE_LABELS[p.type]}
                          {!settings.clientMode && p.refFabricant && ` · ${p.refFabricant}`}
                        </div>
                      </div>
                      {!settings.clientMode && (
                        <Badge tone={MARQUE_TONES[p.marque]}>{p.marque}</Badge>
                      )}
                    </div>
                    <div className="flex items-end justify-between mt-3">
                      <div>
                        <div className="text-xs text-slate-500">Prix de vente</div>
                        <div className="text-lg font-bold tabular-nums">{fmtEUR(p.prixVenteHT)}</div>
                      </div>
                      {!settings.clientMode && (
                        <div className="text-right">
                          <div className="text-xs text-slate-500">Achat</div>
                          <div className="text-sm font-medium tabular-nums">
                            {fmtEUR(p.prixAchatHT)}
                          </div>
                          <div className="text-[11px] text-emerald-600 font-medium">
                            +{Math.round(marge * 100)}%
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "packs" && (
        <>
          <div className="flex justify-end">
            <Button
              variant="gold"
              icon={Plus}
              onClick={() => setPackEditor({ open: true, pack: null })}
              disabled={state.products.length === 0}
            >
              Nouveau pack
            </Button>
          </div>

          {state.packs.length === 0 ? (
            <Card className="p-6">
              <EmptyState
                icon={Layers}
                title="Aucun pack"
                description={
                  state.products.length === 0
                    ? "Crée d'abord des produits avant de composer des packs."
                    : "Compose ton premier pack pour accélérer tes devis."
                }
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {state.packs.map((pk) => (
                <Card
                  key={pk.id}
                  hover
                  onClick={() => setPackEditor({ open: true, pack: pk })}
                  className="p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#F8F0DC] dark:bg-[#C9A961]/20 text-[#8B7228] dark:text-[#C9A961] flex items-center justify-center flex-shrink-0">
                      <Layers size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{pk.nom}</div>
                      <div className="text-[11px] text-slate-500 truncate">{pk.cible}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                        {pk.description}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <Badge tone="slate">{pk.lignes.length} lignes</Badge>
                    <div className="font-bold tabular-nums">{fmtEUR(pk.prixIndicatif)}</div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <ProductEditor
        open={productEditor.open}
        product={productEditor.product}
        settings={settings}
        onClose={() => setProductEditor({ open: false, product: null })}
        onSaved={(p) => setState((s) => ({ ...s, products: upsertById(s.products, p) }))}
        onDeleted={(id) => setState((s) => ({ ...s, products: removeById(s.products, id) }))}
      />
      <PackEditor
        open={packEditor.open}
        pack={packEditor.pack}
        products={state.products}
        settings={settings}
        onClose={() => setPackEditor({ open: false, pack: null })}
        onSaved={(p) => setState((s) => ({ ...s, packs: upsertById(s.packs, p) }))}
        onDeleted={(id) => setState((s) => ({ ...s, packs: removeById(s.packs, id) }))}
      />
    </div>
  );
}
