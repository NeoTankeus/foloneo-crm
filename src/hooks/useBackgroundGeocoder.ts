import { useEffect, useRef, useState } from "react";
import { useDemoData } from "@/lib/supabase";
import * as db from "@/lib/db";
import { geocodeAddress } from "@/lib/geocode";
import { upsertById } from "@/lib/helpers";
import type { Account, AppState } from "@/types";

// Hook qui lance automatiquement le geocodage des comptes ayant une
// adresse mais pas de coordonnees GPS. Respecte la limite 1 req/s de
// Nominatim. Met a jour le state react au fur et a mesure : les
// markers apparaissent progressivement sur la carte.
//
// Utilisation : a appeler une fois dans Dashboard (ou toute vue qui
// contient la carte). Si l'utilisateur navigue ailleurs, le hook stoppe
// proprement et reprendra la prochaine fois qu'il reviendra.

export interface GeocoderStatus {
  active: boolean;
  done: number;
  total: number;
  // Nom du compte en cours, utile pour un bandeau UX
  current?: string;
}

function needsGeocoding(a: Account): boolean {
  if (typeof a.latitude === "number" && typeof a.longitude === "number") return false;
  return !!(a.ville?.trim() || a.adresse?.trim() || a.codePostal?.trim());
}

export function useBackgroundGeocoder(
  accounts: Account[],
  setState: React.Dispatch<React.SetStateAction<AppState>>
): GeocoderStatus {
  const [status, setStatus] = useState<GeocoderStatus>({
    active: false,
    done: 0,
    total: 0,
  });
  // Ref pour couper proprement a l'unmount sans race condition
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (useDemoData) return;
    stoppedRef.current = false;

    const eligible = accounts.filter(needsGeocoding);
    if (eligible.length === 0) {
      setStatus({ active: false, done: 0, total: 0 });
      return;
    }

    setStatus({ active: true, done: 0, total: eligible.length });

    // Copie du snapshot pour la boucle. Si de nouveaux comptes arrivent
    // en cours de route, ils seront traites au prochain cycle useEffect.
    const queue = [...eligible];

    (async () => {
      for (let i = 0; i < queue.length; i++) {
        if (stoppedRef.current) return;
        const acc = queue[i];
        setStatus({
          active: true,
          done: i,
          total: queue.length,
          current: acc.raisonSociale,
        });
        try {
          const geo = await geocodeAddress({
            adresse: acc.adresse,
            codePostal: acc.codePostal,
            ville: acc.ville,
            raisonSociale: acc.raisonSociale,
          });
          if (stoppedRef.current) return;
          if (geo) {
            const patched = await db.updateAccount(acc.id, {
              latitude: geo.lat,
              longitude: geo.lng,
            });
            // Optimiste : on injecte dans le state partage pour que la carte
            // affiche immediatement le nouveau marker.
            setState((s) => ({ ...s, accounts: upsertById(s.accounts, patched) }));
          }
        } catch (e) {
          // On continue : une erreur sur un compte ne doit pas stopper la file
          console.warn("[geocoder] failed for", acc.raisonSociale, e);
        }
      }
      if (!stoppedRef.current) {
        setStatus({ active: false, done: queue.length, total: queue.length });
      }
    })();

    return () => {
      stoppedRef.current = true;
    };
    // Relance la boucle quand la liste des comptes change "significativement"
    // (nouveau compte importe). On se base sur la longueur + la signature
    // des ids pour detecter un delta reel sans refetch inutile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts.length, accounts.filter(needsGeocoding).length]);

  return status;
}
