import { supabase, useDemoData } from "@/lib/supabase";
import { DEMO_STATE } from "@/lib/demo-data";
import type { Product } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const fromRow = (r: any): Product => ({
  id: r.id,
  refFabricant: r.ref_fabricant,
  libelleInterne: r.libelle_interne,
  libelleCommercial: r.libelle_commercial,
  marque: r.marque,
  type: r.type,
  prixSylis: r.prix_sylis !== null && r.prix_sylis !== undefined ? Number(r.prix_sylis) : undefined,
  prixMarche:
    r.prix_marche !== null && r.prix_marche !== undefined ? Number(r.prix_marche) : undefined,
  prixAchatHT: Number(r.prix_achat_ht),
  prixVenteHT: Number(r.prix_vente_ht),
});

const toRow = (p: Partial<Product>): Record<string, unknown> => ({
  ref_fabricant: p.refFabricant,
  libelle_interne: p.libelleInterne,
  libelle_commercial: p.libelleCommercial,
  marque: p.marque,
  type: p.type,
  prix_sylis: p.prixSylis ?? null,
  prix_marche: p.prixMarche ?? null,
  prix_achat_ht: p.prixAchatHT,
  prix_vente_ht: p.prixVenteHT,
});

export async function listProducts(): Promise<Product[]> {
  if (useDemoData || !supabase) return DEMO_STATE.products;
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("actif", true)
    .order("marque")
    .order("libelle_interne");
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function createProduct(p: Omit<Product, "id">): Promise<Product> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { data, error } = await supabase.from("products").insert(toRow(p)).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateProduct(id: string, patch: Partial<Product>): Promise<Product> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { data, error } = await supabase
    .from("products")
    .update(toRow(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteProduct(id: string): Promise<void> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}
