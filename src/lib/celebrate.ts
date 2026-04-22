import confetti from "canvas-confetti";

// Utilitaire de celebration : confetti + son synthetise Web Audio.
// Declenche sur :
//  - Passage d'une affaire a l'etape "signé" dans le pipeline
//  - Creation d'une nouvelle facture
//  - Signature d'un devis (bascule de status a signe_achat / signe_leasing)
//
// Respecte prefers-reduced-motion (skip animation) et coupe le son si
// l'utilisateur a un onglet muet.

const BRAND_COLORS = ["#C9A961", "#0B1E3F", "#10B981", "#F8F0DC", "#ffffff"];

type CelebrateKind = "signature" | "facture" | "devis";

export function celebrate(kind: CelebrateKind = "signature"): void {
  if (typeof window === "undefined") return;
  // Respecter l'accessibilite : pas d'animation si l'utilisateur le demande
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (!reduceMotion) {
    fireConfetti(kind);
  }
  // Le son est autorise tant qu'on est dans un click handler (unlocks AudioContext)
  playSound(kind);
}

function fireConfetti(kind: CelebrateKind): void {
  // Burst principal : centre-bas de l'ecran, grande dispersion
  const duration = kind === "signature" ? 1500 : 900;
  const end = Date.now() + duration;

  // Eruption immediate : 2 cotes en V
  confetti({
    particleCount: kind === "signature" ? 120 : 80,
    spread: 75,
    startVelocity: 55,
    origin: { y: 0.65, x: 0.2 },
    colors: BRAND_COLORS,
    zIndex: 9999,
  });
  confetti({
    particleCount: kind === "signature" ? 120 : 80,
    spread: 75,
    startVelocity: 55,
    origin: { y: 0.65, x: 0.8 },
    colors: BRAND_COLORS,
    zIndex: 9999,
  });

  // Seconde salve centrale pour les signatures (plus festif)
  if (kind === "signature") {
    setTimeout(() => {
      confetti({
        particleCount: 90,
        spread: 140,
        startVelocity: 40,
        origin: { y: 0.55 },
        colors: BRAND_COLORS,
        zIndex: 9999,
      });
    }, 220);
  }

  // Pluie continue jusqu'a la fin (effet feu d'artifice)
  const interval = window.setInterval(() => {
    if (Date.now() > end) {
      window.clearInterval(interval);
      return;
    }
    confetti({
      particleCount: 8,
      spread: 55,
      startVelocity: 30,
      origin: { x: Math.random(), y: Math.random() * 0.3 + 0.1 },
      colors: BRAND_COLORS,
      zIndex: 9999,
    });
  }, 160);
}

// -----------------------------------------------------------------------------
// Sons synthetises via Web Audio (pas d'asset externe, pas de CORS, offline-ready)
// -----------------------------------------------------------------------------

// Une cache globale pour ne pas recreer le contexte audio a chaque appel
let audioCtxRef: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioCtxRef) return audioCtxRef;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    audioCtxRef = new AC();
    return audioCtxRef;
  } catch {
    return null;
  }
}

function playSound(kind: CelebrateKind): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Notes : on joue des accords arpeges "majeurs" pour un effet festif.
  // kind "signature" : fanfare montante C-E-G-C8 (victoire)
  // kind "facture"   : accord court E-G (encaissement)
  // kind "devis"     : ding simple (notification)
  const scores: Record<CelebrateKind, { freqs: number[]; stepMs: number; lenSec: number; gain: number }> = {
    signature: { freqs: [523.25, 659.25, 783.99, 1046.5, 1318.5], stepMs: 85, lenSec: 0.45, gain: 0.22 },
    facture:   { freqs: [659.25, 830.6, 987.77, 1318.5], stepMs: 75, lenSec: 0.4, gain: 0.2 },
    devis:     { freqs: [783.99, 1046.5], stepMs: 100, lenSec: 0.3, gain: 0.18 },
  };
  const score = scores[kind];

  const now = ctx.currentTime;
  score.freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle"; // plus doux que sine pur, pas agressif
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const startTime = now + (i * score.stepMs) / 1000;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(score.gain, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + score.lenSec);
    osc.start(startTime);
    osc.stop(startTime + score.lenSec);
  });
}
