import { useMemo, useRef, useState } from "react";
import { MapPin, CheckCircle2, AlertTriangle, Pause, Play } from "lucide-react";
import { Modal } from "@/components/ui/overlays";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/primitives";
import { useDemoData } from "@/lib/supabase";
import * as db from "@/lib/db";
import { geocodeAddress } from "@/lib/geocode";
import type { Account } from "@/types";

interface Props {
  open: boolean;
  accounts: Account[];
  onClose: () => void;
  onAccountsUpdated: (updated: Account[]) => void;
}

type Status = "idle" | "running" | "paused" | "done";

// Eligible : lat/lng manquants ET au moins un champ d'adresse rempli.
function needsGeocoding(a: Account): boolean {
  if (typeof a.latitude === "number" && typeof a.longitude === "number") return false;
  return !!(a.ville?.trim() || a.adresse?.trim() || a.codePostal?.trim());
}

export function GeocodeAccounts({ open, accounts, onClose, onAccountsUpdated }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<{ done: number; found: number; failed: number; current?: string }>({
    done: 0,
    found: 0,
    failed: 0,
  });
  const [errors, setErrors] = useState<string[]>([]);

  // Refs pour communication synchrone pendant le for-loop async
  const pauseRef = useRef(false);
  const abortRef = useRef(false);

  const eligible = useMemo(() => accounts.filter(needsGeocoding), [accounts]);
  const alreadyLocated = accounts.length - eligible.length;

  async function start() {
    if (useDemoData) {
      setErrors(["Mode démo : le géocodage écrit en base, il faut être connecté à Supabase."]);
      setStatus("done");
      return;
    }
    setStatus("running");
    setProgress({ done: 0, found: 0, failed: 0 });
    setErrors([]);
    pauseRef.current = false;
    abortRef.current = false;

    const updated: Account[] = [];
    const localErrors: string[] = [];

    for (let i = 0; i < eligible.length; i++) {
      if (abortRef.current) break;
      // Pause active : attente polling
      while (pauseRef.current && !abortRef.current) {
        setStatus("paused");
        await new Promise((r) => setTimeout(r, 400));
      }
      if (abortRef.current) break;
      setStatus("running");

      const acc = eligible[i];
      setProgress((p) => ({ ...p, done: i, current: acc.raisonSociale }));

      try {
        const geo = await geocodeAddress({
          adresse: acc.adresse,
          codePostal: acc.codePostal,
          ville: acc.ville,
          raisonSociale: acc.raisonSociale,
        });
        if (geo) {
          const patched = await db.updateAccount(acc.id, {
            latitude: geo.lat,
            longitude: geo.lng,
          });
          updated.push(patched);
          setProgress((p) => ({ ...p, found: p.found + 1 }));
        } else {
          localErrors.push(`${acc.raisonSociale} : aucun résultat trouvé`);
          setProgress((p) => ({ ...p, failed: p.failed + 1 }));
        }
      } catch (e) {
        localErrors.push(`${acc.raisonSociale} : ${(e as Error).message}`);
        setProgress((p) => ({ ...p, failed: p.failed + 1 }));
      }
    }

    setProgress((p) => ({ ...p, done: eligible.length, current: undefined }));
    setErrors(localErrors);
    setStatus("done");
    if (updated.length > 0) onAccountsUpdated(updated);
  }

  const totalPct = eligible.length > 0 ? Math.round((progress.done / eligible.length) * 100) : 0;

  return (
    <Modal
      open={open}
      onClose={status === "running" || status === "paused" ? () => {} : onClose}
      title="Géolocaliser les clients"
      size="md"
      footer={
        <>
          <div className="flex-1 text-[11px] text-slate-500">
            Source : OpenStreetMap (Nominatim) · 1 req/s · gratuit
          </div>
          {status === "idle" && (
            <>
              <Button variant="ghost" onClick={onClose}>Annuler</Button>
              <Button
                variant="primary"
                icon={MapPin}
                onClick={start}
                disabled={eligible.length === 0}
              >
                Lancer ({eligible.length})
              </Button>
            </>
          )}
          {status === "running" && (
            <Button variant="outline" icon={Pause} onClick={() => { pauseRef.current = true; }}>
              Pause
            </Button>
          )}
          {status === "paused" && (
            <>
              <Button
                variant="outline"
                onClick={() => { abortRef.current = true; pauseRef.current = false; }}
              >
                Arrêter
              </Button>
              <Button
                variant="primary"
                icon={Play}
                onClick={() => { pauseRef.current = false; }}
              >
                Reprendre
              </Button>
            </>
          )}
          {status === "done" && (
            <Button variant="primary" onClick={onClose}>Fermer</Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <StatBlock label="À géolocaliser" value={eligible.length} tone="amber" />
          <StatBlock label="Déjà positionnés" value={alreadyLocated} tone="emerald" />
          <StatBlock
            label="Durée estimée"
            value={eligible.length > 0 ? `~${Math.ceil((eligible.length * 1.1) / 60)} min` : "—"}
            tone="slate"
          />
        </div>

        {status === "idle" && eligible.length === 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs">
            <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
            <div>
              Tous les clients avec une adresse sont déjà géolocalisés. Pour en ajouter de nouveaux, renseigne l'adresse sur la fiche client.
            </div>
          </div>
        )}

        {status !== "idle" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400 truncate max-w-[70%]">
                {status === "done"
                  ? "Terminé"
                  : status === "paused"
                  ? "En pause"
                  : progress.current ?? "Démarrage…"}
              </span>
              <span className="font-semibold tabular-nums">
                {progress.done} / {eligible.length}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#C9A961] transition-all"
                style={{ width: `${totalPct}%` }}
              />
            </div>
            <div className="flex gap-2 text-[11px] flex-wrap">
              <Badge tone="emerald">{progress.found} trouvés</Badge>
              {progress.failed > 0 && <Badge tone="amber">{progress.failed} non trouvés</Badge>}
            </div>
          </div>
        )}

        {errors.length > 0 && status === "done" && (
          <div>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
              <AlertTriangle size={12} className="text-amber-500" />
              Adresses non trouvées ({errors.length})
            </div>
            <div className="max-h-[180px] overflow-y-auto text-xs space-y-1 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg">
              {errors.map((e, i) => (
                <div key={i} className="text-slate-600 dark:text-slate-400">{e}</div>
              ))}
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              Complète l'adresse sur la fiche client pour qu'ils apparaissent sur la carte.
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function StatBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "amber" | "emerald" | "slate";
}) {
  const toneClass =
    tone === "amber" ? "text-amber-600" : tone === "emerald" ? "text-emerald-600" : "text-slate-600";
  return (
    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className={`text-xl font-bold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}
