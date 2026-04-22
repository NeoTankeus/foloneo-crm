import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap, Marker, Popup, LngLatBoundsLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Maximize2, Minimize2, Filter } from "lucide-react";
import { fmtEUR } from "@/lib/helpers";
import { calcDevisTotaux } from "@/lib/calculations";
import type { AppState, Settings } from "@/types";

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

// Trois niveaux visuels :
//  - signed : client avec au moins un devis signé ou une facture payée
//  - active : client avec au moins un devis envoyé ou une facture en cours
//  - client : client enregistré (importé depuis Sellsy ou source "ancien_client")
// Le niveau "prospect" n'existe plus : un compte en base = un client.
type Tier = "signed" | "active" | "client";

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

// Couleurs par niveau d'activite.
const TIER_COLOR: Record<Tier, string> = {
  signed: "#C9A961",
  active: "#3B82F6",
  client: "#64748B",
};

const TIER_LABEL: Record<Tier, string> = {
  signed: "Signés",
  active: "Actifs",
  client: "Clients",
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
  // Filtre par niveau : l'utilisateur peut masquer les prospects / actifs / signes
  const [activeTiers, setActiveTiers] = useState<Record<Tier, boolean>>({
    signed: true,
    active: true,
    client: true,
  });

  // Agrege : tous les comptes avec lat/lng renseignes, avec stats rattachees.
  // Niveau du compte :
  //  - signed : au moins un devis signe_achat/signe_leasing OU facture payee
  //  - active : au moins un devis envoye OU une facture
  //  - client : compte enregistre sans activite courante (tous les comptes
  //    importes de Sellsy ou saisis manuellement le sont par defaut — ce
  //    sont deja des clients)
  const markers = useMemo<ClientMarker[]>(() => {
    const out: ClientMarker[] = [];
    for (const acc of state.accounts) {
      if (typeof acc.latitude !== "number" || typeof acc.longitude !== "number") continue;

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
      const activeQuotes = accountQuotes.filter((q) => q.status === "envoye");

      const totalSignedHT = signedQuotes.reduce(
        (s, q) => s + calcDevisTotaux(q, settings, state.products).totalHT,
        0
      );
      const totalInvoicedHT = accountInvoices.reduce((s, f) => s + f.montantHT, 0);
      const totalPaidHT = accountInvoices
        .filter((f) => f.status === "payee")
        .reduce((s, f) => s + f.montantHT, 0);

      let tier: Tier;
      if (signedQuotes.length > 0 || accountInvoices.some((f) => f.status === "payee")) {
        tier = "signed";
      } else if (activeQuotes.length > 0 || accountInvoices.length > 0) {
        tier = "active";
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
    state.products,
    state.commerciaux,
    settings,
    commercialFilter,
    activeTiers,
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
      // Taille selon le tier : signed = plus gros, prospect = discret
      const size = m.tier === "signed" ? 32 : m.tier === "active" ? 28 : 22;
      const badgeText =
        m.tier === "signed"
          ? String(m.nbSignedQuotes || m.nbInvoices || 1)
          : m.tier === "active"
            ? String(m.nbQuotes + m.nbInvoices)
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

  // Stats globales affichees sous la carte
  const counts = useMemo(() => {
    const byTier = { signed: 0, active: 0, client: 0 };
    let totalSigned = 0;
    let totalInvoiced = 0;
    for (const m of markers) {
      byTier[m.tier]++;
      totalSigned += m.totalSignedHT;
      totalInvoiced += m.totalInvoicedHT;
    }
    return { byTier, totalSigned, totalInvoiced, total: markers.length };
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

        {markers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm pointer-events-none p-4">
            <div className="text-center text-xs text-slate-500 max-w-[280px]">
              Aucun client géolocalisé.<br />
              <span className="text-[10px] opacity-70">
                Renseigne l'adresse dans la fiche client puis clique sur «&nbsp;Géolocaliser&nbsp;» dans la vue Comptes.
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

        {/* Toggles tiers (en haut a droite de la carte, sous la nav MapLibre) */}
        <div className="absolute top-2 right-12 z-10 flex flex-col gap-1">
          {(["signed", "active", "client"] as const).map((t) => (
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
        {markers.length > 0 && (
          <div className="flex items-center gap-3 tabular-nums">
            {counts.totalSigned > 0 && (
              <span className="font-semibold text-[#C9A961]">
                {fmtEUR(counts.totalSigned)} HT signés
              </span>
            )}
            {counts.totalInvoiced > 0 && (
              <span className="font-semibold text-blue-600">
                {fmtEUR(counts.totalInvoiced)} HT facturés
              </span>
            )}
          </div>
        )}
      </div>
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
