import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap, Marker, Popup, LngLatBoundsLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Maximize2, Minimize2, Filter, Loader2 } from "lucide-react";
import { fmtEUR } from "@/lib/helpers";
import { calcDevisTotaux } from "@/lib/calculations";
import { SECTEURS } from "@/lib/constants";
import type { AppState, Settings, Secteur } from "@/types";
import type { GeocoderStatus } from "@/hooks/useBackgroundGeocoder";

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

// Quatre niveaux alignes sur la terminologie metier demandee :
//  - facture   : client avec au moins une facture emise (= signe, CA reel)
//  - devis     : client avec au moins un devis (mais pas encore de facture)
//  - pipeline  : client avec une affaire en cours (deal non signe/perdu)
//  - client    : compte enregistre sans activite actuelle
// Priorite (du plus fort au plus faible) : facture > devis > pipeline > client
type Tier = "facture" | "devis" | "pipeline" | "client";

type ClientMarker = {
  accountId: string;
  raisonSociale: string;
  ville: string;
  adresse?: string;
  lng: number;
  lat: number;
  tier: Tier;
  color: string;
  // Stats agregees
  nbQuotes: number;
  nbSignedQuotes: number;
  nbInvoices: number;
  totalSignedHT: number;
  totalInvoicedHT: number;
  totalPaidHT: number;
  secteur?: string;
  commercialNom?: string;
};

const TIER_COLOR: Record<Tier, string> = {
  facture: "#C9A961",   // or  — CA reel facture
  devis:   "#3B82F6",   // bleu — devis en circulation
  pipeline:"#A78BFA",   // violet — affaire en prospection pipeline
  client:  "#94A3B8",   // gris  — client enregistre, aucune activite
};

const TIER_LABEL: Record<Tier, string> = {
  facture: "Facturés",
  devis:   "Devis",
  pipeline:"Pipeline",
  client:  "Clients",
};

interface Props {
  state: AppState;
  settings: Settings;
  commercialFilter: string | "all";
  geocoderStatus?: GeocoderStatus;
}

export function VarMap3D({ state, settings, commercialFilter, geocoderStatus }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  // Filtre par niveau : l'utilisateur peut masquer les prospects / actifs / signes
  const [activeTiers, setActiveTiers] = useState<Record<Tier, boolean>>({
    facture: true,
    devis: true,
    pipeline: true,
    client: true,
  });
  // Filtre par secteur
  const [sectorFilter, setSectorFilter] = useState<Secteur | "all">("all");

  // Agrege : tous les comptes avec lat/lng renseignes, avec stats rattachees.
  // Niveau du compte (priorite du plus fort au plus faible) :
  //  - facture  : au moins une facture emise (CA reel, signe = facture)
  //  - devis    : au moins un devis cree (hors perdu) mais pas encore facture
  //  - pipeline : au moins une affaire dans le pipeline (deal en cours)
  //  - client   : compte sans activite courante
  const markers = useMemo<ClientMarker[]>(() => {
    const out: ClientMarker[] = [];
    for (const acc of state.accounts) {
      if (typeof acc.latitude !== "number" || typeof acc.longitude !== "number") continue;
      if (sectorFilter !== "all" && acc.secteur !== sectorFilter) continue;

      const accountQuotes = state.quotes.filter((q) => q.accountId === acc.id);
      const accountInvoices = state.invoices.filter((f) => f.accountId === acc.id);

      // Filtre commercial : on ne montre le compte que s'il a au moins une
      // interaction avec ce commercial (devis/facture/ou compte assigne).
      if (commercialFilter !== "all") {
        const matches =
          accountQuotes.some((q) => q.commercialId === commercialFilter) ||
          accountInvoices.some((f) => f.commercialId === commercialFilter);
        if (!matches) continue;
      }

      const signedQuotes = accountQuotes.filter(
        (q) => q.status === "signe_achat" || q.status === "signe_leasing"
      );
      const activeQuotes = accountQuotes.filter((q) => q.status !== "perdu");
      const accountDealsActifs = state.deals.filter(
        (d) => d.accountId === acc.id && d.etape !== "signe" && d.etape !== "perdu"
      );

      const totalSignedHT = signedQuotes.reduce(
        (s, q) => s + calcDevisTotaux(q, settings, state.products).totalHT,
        0
      );
      const totalInvoicedHT = accountInvoices.reduce((s, f) => s + f.montantHT, 0);
      const totalPaidHT = accountInvoices
        .filter((f) => f.status === "payee")
        .reduce((s, f) => s + f.montantHT, 0);

      // Priorite : facture > devis > pipeline > client
      let tier: Tier;
      if (accountInvoices.length > 0) {
        tier = "facture";
      } else if (activeQuotes.length > 0) {
        tier = "devis";
      } else if (accountDealsActifs.length > 0) {
        tier = "pipeline";
      } else {
        tier = "client";
      }

      if (!activeTiers[tier]) continue;

      const com = accountQuotes[0]?.commercialId
        ? state.commerciaux.find((c) => c.id === accountQuotes[0].commercialId)
        : undefined;

      out.push({
        accountId: acc.id,
        raisonSociale: acc.raisonSociale,
        ville: [acc.codePostal, acc.ville].filter(Boolean).join(" "),
        adresse: acc.adresse,
        lng: acc.longitude,
        lat: acc.latitude,
        tier,
        color: TIER_COLOR[tier],
        nbQuotes: accountQuotes.length,
        nbSignedQuotes: signedQuotes.length,
        nbInvoices: accountInvoices.length,
        totalSignedHT,
        totalInvoicedHT,
        totalPaidHT,
        secteur: acc.secteur,
        commercialNom: com ? `${com.prenom} ${com.nom}` : undefined,
      });
    }
    return out;
  }, [
    state.accounts,
    state.quotes,
    state.invoices,
    state.deals,
    state.products,
    state.commerciaux,
    settings,
    commercialFilter,
    activeTiers,
    sectorFilter,
  ]);

  // Init MapLibre
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
      cooperativeGestures: true,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    map.on("load", () => {
      const layers = map.getStyle().layers ?? [];
      const buildingLayer = layers.find((l) => l.type === "fill" && /build/i.test(l.id));
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
                13, 0,
                15.05, ["coalesce", ["get", "render_height"], ["get", "height"], 6],
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
          /* ignore */
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

  // Rafraichit les markers a chaque changement
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    markers.forEach((m) => {
      const el = document.createElement("div");
      el.className = "foloneo-marker";
      // Taille selon le tier : facture = plus gros, client = discret
      const size = m.tier === "facture" ? 32 : m.tier === "devis" ? 28 : m.tier === "pipeline" ? 24 : 22;
      const badgeText =
        m.tier === "facture"
          ? String(m.nbInvoices || 1)
          : m.tier === "devis"
            ? String(m.nbQuotes || 1)
            : m.tier === "pipeline"
              ? "P"
              : "";
      el.style.cssText = `
        width: ${size}px; height: ${size}px; border-radius: 50%;
        background: ${m.color}; border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.35), 0 0 0 4px ${m.color}33;
        display: flex; align-items: center; justify-content: center;
        color: white; font-weight: 700; font-size: 11px; cursor: pointer;
        font-family: Inter, system-ui, sans-serif;
      `;
      el.textContent = badgeText;
      el.title = m.raisonSociale;

      const popupHtml = buildPopupHtml(m);

      const marker = new Marker({ element: el, anchor: "center" })
        .setLngLat([m.lng, m.lat])
        .setPopup(new Popup({ offset: 22, closeButton: true, maxWidth: "280px" }).setHTML(popupHtml))
        .addTo(map);
      markersRef.current.push(marker);
    });

    if (markers.length > 0) {
      const bounds = markers.reduce(
        (b, m) => b.extend([m.lng, m.lat]),
        new maplibregl.LngLatBounds([markers[0].lng, markers[0].lat], [markers[0].lng, markers[0].lat])
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

  useEffect(() => {
    const id = window.setTimeout(() => mapRef.current?.resize(), 260);
    return () => window.clearTimeout(id);
  }, [fullscreen]);

  const counts = useMemo(() => {
    const byTier = { facture: 0, devis: 0, pipeline: 0, client: 0 };
    let totalSigned = 0;
    let totalInvoiced = 0;
    for (const m of markers) {
      byTier[m.tier]++;
      totalSigned += m.totalSignedHT;
      totalInvoiced += m.totalInvoicedHT;
    }
    return { byTier, totalSigned, totalInvoiced, total: markers.length };
  }, [markers]);

  // Top secteurs : quels secteurs concentrent le plus de signatures (factures+devis signes)
  const topSecteurs = useMemo(() => {
    const bySecteur = new Map<string, { count: number; totalHT: number; label: string }>();
    for (const m of markers) {
      if (m.tier !== "facture") continue;
      const secteur = m.secteur ?? "autre";
      const label = SECTEURS.find((s) => s.id === secteur)?.label ?? secteur;
      const cur = bySecteur.get(secteur) ?? { count: 0, totalHT: 0, label };
      cur.count++;
      cur.totalHT += m.totalInvoicedHT;
      bySecteur.set(secteur, cur);
    }
    return [...bySecteur.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.totalHT - a.totalHT)
      .slice(0, 5);
  }, [markers]);

  function toggleTier(t: Tier) {
    setActiveTiers((prev) => ({ ...prev, [t]: !prev[t] }));
  }

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
            : "rounded-lg overflow-hidden relative shadow-sm h-[280px] sm:h-[360px]"
        }
      >
        <div ref={containerRef} className="absolute inset-0" />

        {markers.length === 0 && !geocoderStatus?.active && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm pointer-events-none p-4">
            <div className="text-center text-xs text-slate-500 max-w-[280px]">
              Aucun client géolocalisé pour l'instant.<br />
              <span className="text-[10px] opacity-70">
                Les comptes avec une adresse sont géolocalisés automatiquement.
                Pour les comptes sans adresse, ré-importe ton CSV Sellsy (adresse/CP/ville seront complétés, aucun doublon créé).
              </span>
            </div>
          </div>
        )}

        {/* Bandeau geocodage en cours */}
        {geocoderStatus?.active && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-md rounded-lg px-3 py-2 text-[11px] flex items-center gap-2 max-w-[92%]">
            <Loader2 size={12} className="animate-spin text-[#C9A961] flex-shrink-0" />
            <span className="font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
              Géolocalisation
            </span>
            <span className="text-slate-600 dark:text-slate-400 tabular-nums">
              {geocoderStatus.done}/{geocoderStatus.total}
            </span>
            {geocoderStatus.current && (
              <span className="text-slate-500 truncate hidden sm:inline">
                · {geocoderStatus.current}
              </span>
            )}
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

        {/* Toggles tiers (en haut a droite de la carte, sous la nav MapLibre) */}
        <div className="absolute top-2 right-12 z-10 flex flex-col gap-1">
          {(["facture", "devis", "pipeline", "client"] as const).map((t) => (
            <button
              key={t}
              onClick={() => toggleTier(t)}
              title={`${TIER_LABEL[t]} : ${activeTiers[t] ? "visible" : "masqué"}`}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold backdrop-blur-sm shadow-sm transition-opacity ${
                activeTiers[t]
                  ? "bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200"
                  : "bg-white/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500"
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: TIER_COLOR[t], opacity: activeTiers[t] ? 1 : 0.3 }}
              />
              {TIER_LABEL[t]} ({counts.byTier[t]})
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between flex-wrap gap-2 text-[11px]">
        <div className="flex items-center gap-2 text-slate-500">
          <Filter size={11} className="opacity-70" />
          {markers.length} client{markers.length > 1 ? "s" : ""} géolocalisé{markers.length > 1 ? "s" : ""}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtre secteur */}
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value as Secteur | "all")}
            className="h-7 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#C9A961]"
          >
            <option value="all">Tous secteurs</option>
            {SECTEURS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          {markers.length > 0 && (
            <div className="flex items-center gap-3 tabular-nums text-[11px]">
              {counts.totalInvoiced > 0 && (
                <span className="font-semibold text-blue-600">
                  {fmtEUR(counts.totalInvoiced)} facturés
                </span>
              )}
              {counts.totalSigned > 0 && counts.totalSigned !== counts.totalInvoiced && (
                <span className="font-semibold text-[#C9A961]">
                  {fmtEUR(counts.totalSigned)} signés
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Top secteurs signés (visible uniquement en mode "tous secteurs") */}
      {sectorFilter === "all" && topSecteurs.length > 0 && !fullscreen && (
        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Top secteurs facturés
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topSecteurs.map((s) => (
              <button
                key={s.id}
                onClick={() => setSectorFilter(s.id as Secteur)}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-800/50 hover:bg-[#C9A961]/10 border border-slate-200 dark:border-slate-700 text-[10px] font-medium transition-colors"
                title={`Filtrer la carte sur ${s.label}`}
              >
                <span className="capitalize text-slate-700 dark:text-slate-200">{s.label}</span>
                <span className="text-slate-500">·</span>
                <span className="tabular-nums text-[#C9A961] font-semibold">{fmtEUR(s.totalHT)}</span>
                <span className="text-[9px] text-slate-400">({s.count})</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Popup enrichie : nom, secteur, adresse, commercial, stats devis/factures
// -----------------------------------------------------------------------------
function buildPopupHtml(m: ClientMarker): string {
  const rows: string[] = [];
  if (m.nbSignedQuotes > 0) {
    rows.push(
      `<div><span style="color:#64748B;">Signés :</span> <strong>${m.nbSignedQuotes}</strong> · <strong style="color:#C9A961;">${escapeHtml(fmtEUR(m.totalSignedHT))}</strong> HT</div>`
    );
  }
  const activeQuotes = m.nbQuotes - m.nbSignedQuotes;
  if (activeQuotes > 0) {
    rows.push(
      `<div><span style="color:#64748B;">En cours :</span> <strong>${activeQuotes}</strong> devis</div>`
    );
  }
  if (m.nbInvoices > 0) {
    const paidPct = m.totalInvoicedHT > 0 ? Math.round((m.totalPaidHT / m.totalInvoicedHT) * 100) : 0;
    rows.push(
      `<div><span style="color:#64748B;">Factures :</span> <strong>${m.nbInvoices}</strong> · <strong style="color:#3B82F6;">${escapeHtml(fmtEUR(m.totalInvoicedHT))}</strong> HT (${paidPct}% payé)</div>`
    );
  }
  if (rows.length === 0) {
    rows.push(`<div style="color:#64748B; font-style:italic;">Client enregistré — aucune activité courante</div>`);
  }

  const commercialLine = m.commercialNom
    ? `<div style="color:#64748B; margin-top:4px;">Suivi : ${escapeHtml(m.commercialNom)}</div>`
    : "";

  const adresseLine = m.adresse
    ? `<div style="color:#64748B; font-size:10px;">${escapeHtml(m.adresse)}</div>`
    : "";

  const secteurBadge = m.secteur
    ? `<span style="display:inline-block;background:#F1F5F9;color:#475569;font-size:9px;padding:1px 6px;border-radius:4px;margin-left:4px;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(m.secteur)}</span>`
    : "";

  return `
    <div style="font-family: Inter, system-ui, sans-serif; min-width: 220px; padding: 2px;">
      <div style="font-weight: 700; color: #0B1E3F; font-size: 13px; margin-bottom: 1px;">
        ${escapeHtml(m.raisonSociale)}${secteurBadge}
      </div>
      ${adresseLine}
      <div style="font-size: 11px; color: #64748B; margin-bottom: 8px;">
        ${escapeHtml(m.ville)}
      </div>
      <div style="font-size: 11px; color: #334155; display: flex; flex-direction: column; gap: 3px;">
        ${rows.join("")}
      </div>
      ${commercialLine}
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
