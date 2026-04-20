import { supabase, useDemoData } from "@/lib/supabase";
import { DEMO_STATE } from "@/lib/demo-data";
import type { Pack } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const fromRow = (r: any): Pack => ({
  id: r.id,
  nom: r.nom,
  description: r.description ?? "",
  cible: r.cible,
  lignes: Array.isArray(r.lignes) ? r.lignes : [],
  prixIndicatif: Number(r.prix_indicatif),
});

const toRow = (p: Partial<Pack>): Record<string, unknown> => ({
  nom: p.nom,
  description: p.description ?? null,
  cible: p.cible,
  lignes: p.lignes ?? [],
  prix_indicatif: p.prixIndicatif,
});

export async function listPacks(): Promise<Pack[]> {
  if (useDemoData || !supabase) return DEMO_STATE.packs;
  const { data, error } = await supabase.from("packs").select("*").order("nom");
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function createPack(p: Omit<Pack, "id">): Promise<Pack> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { data, error } = await supabase.from("packs").insert(toRow(p)).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updatePack(id: string, patch: Partial<Pack>): Promise<Pack> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { data, error } = await supabase
    .from("packs")
    .update(toRow(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deletePack(id: string): Promise<void> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { error } = await supabase.from("packs").delete().eq("id", id);
  if (error) throw error;
}
