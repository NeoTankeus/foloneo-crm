import { supabase, useDemoData } from "@/lib/supabase";
import { DEMO_STATE } from "@/lib/demo-data";
import type { CalendarEvent } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const fromRow = (r: any): CalendarEvent => ({
  id: r.id,
  type: r.type,
  title: r.title,
  accountId: r.account_id ?? undefined,
  commercialId: r.commercial_id ?? undefined,
  date: r.date,
  duree: Number(r.duree),
  lieu: r.lieu ?? undefined,
  notes: r.notes ?? undefined,
  done: !!r.done,
});

const toRow = (e: Partial<CalendarEvent>): Record<string, unknown> => {
  const row: Record<string, unknown> = {
    type: e.type,
    title: e.title,
    account_id: e.accountId ?? null,
    commercial_id: e.commercialId ?? null,
    date: e.date,
    duree: e.duree ?? 60,
    lieu: e.lieu ?? null,
    notes: e.notes ?? null,
  };
  // done est envoye uniquement si explicite, pour ne pas ecraser la valeur
  // existante lors d'un update partiel qui ne touche pas au statut.
  if (e.done !== undefined) row.done = e.done;
  return row;
};

export async function listEvents(): Promise<CalendarEvent[]> {
  if (useDemoData || !supabase) return DEMO_STATE.events;
  const { data, error } = await supabase.from("events").select("*").order("date");
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function createEvent(e: Omit<CalendarEvent, "id">): Promise<CalendarEvent> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { data, error } = await supabase.from("events").insert(toRow(e)).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateEvent(
  id: string,
  patch: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { data, error } = await supabase
    .from("events")
    .update(toRow(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteEvent(id: string): Promise<void> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}
