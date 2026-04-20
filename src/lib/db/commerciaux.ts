import { supabase, useDemoData } from "@/lib/supabase";
import { DEMO_STATE } from "@/lib/demo-data";
import type { Commercial } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const fromRow = (r: any): Commercial => ({
  id: r.id,
  nom: r.nom,
  prenom: r.prenom,
  email: r.email,
  telephone: r.telephone ?? "",
  role: r.role,
  objectifMensuel: Number(r.objectif_mensuel),
  commissionTaux: {
    achat: Number(r.commission_achat),
    leasing: Number(r.commission_leasing),
    maintenance: Number(r.commission_maintenance),
  },
  couleur: r.couleur,
  actif: r.actif ?? true,
});

const toRow = (c: Partial<Commercial>): Record<string, unknown> => {
  const row: Record<string, unknown> = {
    nom: c.nom,
    prenom: c.prenom,
    email: c.email,
    telephone: c.telephone ?? null,
    role: c.role,
    objectif_mensuel: c.objectifMensuel,
    couleur: c.couleur,
    actif: c.actif ?? true,
  };
  if (c.commissionTaux) {
    row.commission_achat = c.commissionTaux.achat;
    row.commission_leasing = c.commissionTaux.leasing;
    row.commission_maintenance = c.commissionTaux.maintenance;
  }
  return row;
};

export async function listCommerciaux(): Promise<Commercial[]> {
  if (useDemoData || !supabase) return DEMO_STATE.commerciaux;
  const { data, error } = await supabase.from("commerciaux").select("*").order("nom");
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function createCommercial(c: Omit<Commercial, "id">): Promise<Commercial> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { data, error } = await supabase.from("commerciaux").insert(toRow(c)).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateCommercial(id: string, patch: Partial<Commercial>): Promise<Commercial> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { data, error } = await supabase
    .from("commerciaux")
    .update(toRow(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteCommercial(id: string): Promise<void> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { error } = await supabase.from("commerciaux").delete().eq("id", id);
  if (error) throw error;
}

export async function getCommercialByEmail(email: string): Promise<Commercial | null> {
  if (useDemoData || !supabase) {
    return DEMO_STATE.commerciaux.find((c) => c.email === email) ?? null;
  }
  const { data, error } = await supabase
    .from("commerciaux")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data) : null;
}
