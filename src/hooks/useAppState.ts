import { useCallback, useEffect, useState } from "react";
import type { AppState, Settings } from "@/types";
import { DEMO_STATE } from "@/lib/demo-data";
import { useDemoData } from "@/lib/supabase";
import * as db from "@/lib/db";

// Hook central : charge tout le state applicatif (DB ou demo) au boot.
// Expose aussi un updater setState (optimistic) et un reload() pour refetch.
export function useAppState() {
  const [state, setState] = useState<AppState>(DEMO_STATE);
  const [loading, setLoading] = useState<boolean>(!useDemoData);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (useDemoData) {
      setState(DEMO_STATE);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [
        settings,
        commerciaux,
        accounts,
        contacts,
        products,
        packs,
        deals,
        quotes,
        invoices,
        contrats,
        events,
        sav,
        interactions,
      ] = await Promise.all([
        db.getSettings(),
        db.listCommerciaux(),
        db.listAccounts(),
        db.listContacts(),
        db.listProducts(),
        db.listPacks(),
        db.listDeals(),
        db.listQuotes(),
        db.listInvoices(),
        db.listContracts(),
        db.listEvents(),
        db.listSav(),
        db.listInteractions(),
      ]);
      setState({
        settings,
        commerciaux,
        accounts,
        contacts,
        products,
        packs,
        deals,
        quotes,
        invoices,
        contrats,
        events,
        sav,
        interactions,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur de chargement";
      setError(msg);
      console.error("[useAppState] load failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Helper : met a jour UNIQUEMENT le state local (pas de persistance).
  // Utilise pour clientMode / darkMode / editions optimistes.
  const updateSettingsLocal = useCallback((patch: Partial<Settings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  return { state, setState, loading, error, reload: load, updateSettingsLocal };
}

export type UseAppState = ReturnType<typeof useAppState>;
