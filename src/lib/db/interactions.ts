import { supabase, useDemoData } from "@/lib/supabase";
import { DEMO_STATE } from "@/lib/demo-data";
import type { Interaction } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const fromRow = (r: any): Interaction => ({
  id: r.id,
  accountId: r.account_id,
  type: r.type,
  date: r.date,
  commercialId: r.commercial_id ?? undefined,
  contenu: r.contenu,
});

const toRow = (i: Partial<Interaction>): Record<string, unknown> => ({
  account_id: i.accountId,
  type: i.type,
  date: i.date,
  commercial_id: i.commercialId ?? null,
  contenu: i.contenu,
});

export async function listInteractions(): Promise<Interaction[]> {
  if (useDemoData || !supabase) return DEMO_STATE.interactions;
  const { data, error } = await supabase
    .from("interactions")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function createInteraction(i: Omit<Interaction, "id">): Promise<Interaction> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { data, error } = await supabase.from("interactions").insert(toRow(i)).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteInteraction(id: string): Promise<void> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { error } = await supabase.from("interactions").delete().eq("id", id);
  if (error) throw error;
}
