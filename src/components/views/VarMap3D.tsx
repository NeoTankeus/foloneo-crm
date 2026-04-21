import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap, Marker, Popup, LngLatBoundsLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Maximize2, Minimize2 } from "lucide-react";
import { fmtEUR } from "@/lib/helpers";
import { calcDevisTotaux } from "@/lib/calculations";
import type { AppState, Settings, Quote } from "@/types";

// -----------------------------------------------------------------------------
// Style de carte : OpenFreeMap "Liberty" = vector tiles gratuites, style clair,
// couche buildings avec hauteurs pour l'extrusion 3D. Aucune cle API requise.
// -----------------------------------------------------------------------------
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

// Centre par defaut : golfe du Var (Toulon), pitch 45 pour le rendu 3D.
const DEFAULT_CENTER: [number, number] = [5.93, 43.12];
const DEFAULT_ZOOM = 10;
const DEFAULT_PITCH = 45;
const DEFAULT_BEARING = -15;

type SignedMarker = {
  accountId: string;
  raisonSociale: string;
  ville: string;
  lng: number;
  lat: number;
  quotes: Quote[];
  totalHT: number;
  color: string;
};

interface Props {
  state: AppState;
  settings: Settings;
  commercialFilter: string | "all";
}

export function VarMap3D({ state, settings, commercialFilter }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [fullscreen, setFullscreen] = useState(false);

  // Agrege les devis signes par compte et filtre par commercial si demande.
  // "En fonction des documents de signature" : un compte apparait uniquement
  // s'il a au moins un devis avec status signe_achat ou signe_leasing.
  const markers = useMemo<SignedMarker[]>(() => {
    const byAccount = new Map<string, Quote[]>();
    for (const q of state.quotes) {
      if (q.status !== "signe_achat" && q.status !== "signe_leasing") continue;
      if (commercialFilter !== "all" && q.commercialId !== commercialFilter) continue;
      const arr = byAccount.get(q.accountId) ?? [];
      arr.push(q);
      byAccount.set(q.accountId, arr);
    }
    const out: SignedMarker[] = [];
    byAccount.forEach((quotes, accountId) => {
      const acc = state.accounts.find((a) => a.id === accountId);
      if (!acc || typeof acc.latitude !== "number" || typeof acc.longitude !== "number") return;
      const total = quotes.reduce((s, q) => s + calcDevisTotaux(q, settings, state.products).totalHT, 0);
      const com = state.commerciaux.find((c) => c.id === quotes[0].commercialId);
      out.push({
        accountId,
        raisonSociale: acc.raisonSociale,
        ville: [acc.codePostal, acc.ville].filter(Boolean).join(" "),
        lng: acc.longitude,
        lat: acc.latitude,
        quotes,
        totalHT: total,
        color: com?.couleur ?? "#C9A961",
      });
    });
    return out;
  }, [state.quotes, state.accounts, state.commerciaux, state.products, settings, commercialFilter]);

  // Initialisation unique de la MapLibre.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: DEFAULT_PITCH,
      bearing: DEFAULT_BEARING,
      attributionControl: { compact: true },
      cooperativeGestures: true, // evite les scroll-lock sur mobile
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    map.on("load", () => {
      // Active l'extrusion 3D des batiments si la couche existe dans le style.
      const layers = map.getStyle().layers ?? [];
      const buildingLayer = layers.find(
        (l) => l.type === "fill" && /build/i.test(l.id)
      );
      if (buildingLayer && !map.getLayer("3d-buildings")) {
        try {
          map.addLayer({
            id: "3d-buildings",
            source: (buildingLayer as { source?: string }).source ?? "openmaptiles",
            "source-layer": "building",
            type: "fill-extrusion",
            minzoom: 13,
            paint: {
              "fill-extrusion-color": "#d6d3c4",
              "fill-extrusion-height": [
                "interpolate",
                ["linear"],
                ["zoom"],
                13,
                0,
                15.05,
                ["coalesce", ["get", "render_height"], ["get", "height"], 6],
              ],
              "fill-extrusion-base": [
                "coalesce",
                ["get", "render_min_height"],
                ["get", "min_height"],
                0,
              ],
              "fill-extrusion-opacity": 0.85,
            },
          });
        } catch {
          /* certaines sources refusent l'ajout a chaud — on ignore silencieusement */
        }
      }
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Rafraichit les markers a chaque changement du set filtre.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    markers.forEach((m) => {
      const el = document.createElement("div");
      el.className = "foloneo-marker";
      el.style.cssText = `
        width: 30px; height: 30px; border-radius: 50%;
        background: ${m.color}; border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.35), 0 0 0 4px ${m.color}33;
        display: flex; align-items: center; justify-content: center;
        color: white; font-weight: 700; font-size: 11px; cursor: pointer;
        font-family: Inter, system-ui, sans-serif;
      `;
      el.textContent = String(m.quotes.length);

      const nQuotes = m.quotes.length;
      const popupHtml = `
        <div style="font-family: Inter, system-ui, sans-serif; min-width: 200px;">
          <div style="font-weight: 700; color: #0B1E3F; font-size: 13px; margin-bottom: 2px;">
            ${escapeHtml(m.raisonSociale)}
          </div>
          <div style="font-size: 11px; color: #64748B; margin-bottom: 6px;">
            ${escapeHtml(m.ville)}
          </div>
          <div style="font-size: 11px; color: #334155;">
            <strong>${nQuotes}</strong> devis signé${nQuotes > 1 ? "s" : ""} ·
            <strong style="color: #C9A961;">${fmtEUR(m.totalHT)}</strong> HT
          </div>
        </div>
      `;

      const marker = new Marker({ element: el, anchor: "center" })
        .setLngLat([m.lng, m.lat])
        .setPopup(new Popup({ offset: 22, closeButton: false }).setHTML(popupHtml))
        .addTo(map);
      markersRef.current.push(marker);
    });

    // Ajuste la vue pour englober tous les markers (si au moins 1).
    if (markers.length > 0) {
      const bounds = markers.reduce(
        (b, m) => b.extend([m.lng, m.lat]),
        new maplibregl.LngLatBounds(
          [markers[0].lng, markers[0].lat],
          [markers[0].lng, markers[0].lat]
        )
      );
      map.fitBounds(bounds as LngLatBoundsLike, {
        padding: 60,
        maxZoom: 14,
        duration: 800,
      });
    } else {
      map.flyTo({
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        pitch: DEFAULT_PITCH,
        bearing: DEFAULT_BEARING,
        duration: 600,
      });
    }
  }, [markers]);

  // Resize quand on toggle fullscreen (le conteneur change de taille).
  useEffect(() => {
    const id = window.setTimeout(() => mapRef.current?.resize(), 260);
    return () => window.clearTimeout(id);
  }, [fullscreen]);

  const totalSigned = markers.reduce((s, m) => s + m.totalHT, 0);

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-50 bg-white dark:bg-slate-950 p-2 sm:p-4 flex flex-col"
          : "relative"
      }
    >
      <div
        className={
          fullscreen
            ? "flex-1 rounded-xl overflow-hidden relative shadow-xl"
            : "rounded-lg overflow-hidden relative shadow-sm h-[280px] sm:h-[320px]"
        }
      >
        <div ref={containerRef} className="absolute inset-0" />

        {markers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-slate-950/70 backdrop-blur-sm pointer-events-none">
            <div className="text-center text-xs text-slate-500">
              Aucun devis signé géolocalisé.<br />
              <span className="text-[10px]">
                Les comptes doivent avoir latitude/longitude renseignés.
              </span>
            </div>
          </div>
        )}

        <button
          onClick={() => setFullscreen((v) => !v)}
          className="absolute top-2 left-2 z-10 p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-md hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200"
          aria-label={fullscreen ? "Quitter le plein ecran" : "Plein ecran"}
          title={fullscreen ? "Quitter le plein écran" : "Plein écran"}
        >
          {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between flex-wrap gap-2 text-[11px]">
        <div className="text-slate-500">
          {markers.length} compte{markers.length > 1 ? "s" : ""} signé{markers.length > 1 ? "s" : ""}
        </div>
        {markers.length > 0 && (
          <div className="font-semibold text-[#C9A961] tabular-nums">
            {fmtEUR(totalSigned)} HT
          </div>
        )}
      </div>
    </div>
  );
}

// Echappement HTML minimaliste pour prevenir l'injection via donnees DB.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
