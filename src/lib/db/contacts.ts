import { supabase, useDemoData } from "@/lib/supabase";
import { DEMO_STATE } from "@/lib/demo-data";
import type { Contact } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const fromRow = (r: any): Contact => ({
  id: r.id,
  accountId: r.account_id,
  prenom: r.prenom,
  nom: r.nom,
  fonction: r.fonction ?? undefined,
  email: r.email ?? undefined,
  telephone: r.telephone ?? undefined,
  role: r.role,
});

const toRow = (c: Partial<Contact>): Record<string, unknown> => ({
  account_id: c.accountId,
  prenom: c.prenom,
  nom: c.nom,
  fonction: c.fonction ?? null,
  email: c.email ?? null,
  telephone: c.telephone ?? null,
  role: c.role,
});

export async function listContacts(): Promise<Contact[]> {
  if (useDemoData || !supabase) return DEMO_STATE.contacts;
  const { data, error } = await supabase.from("contacts").select("*").order("nom");
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function createContact(c: Omit<Contact, "id">): Promise<Contact> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { data, error } = await supabase.from("contacts").insert(toRow(c)).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateContact(id: string, patch: Partial<Contact>): Promise<Contact> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { data, error } = await supabase
    .from("contacts")
    .update(toRow(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteContact(id: string): Promise<void> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw error;
}
