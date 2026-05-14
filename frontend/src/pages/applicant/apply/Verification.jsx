// Step 6 — liveness and face match verification using MediaPipe. Checks 3D geometry, iris movement, specular highlights, and rPPG heartbeat signal to block static photos.
import { useState, useEffect, useRef, memo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import * as faceapi from "face-api.js";
import StepLayout from "../../../components/layout/StepLayout";
import StepCard from "../../../components/apply/StepCard";
import StepNav from "../../../components/apply/StepNav";
import { BRAND } from "../../../config/theme";
import api from "../../../services/api";
import { useAppState } from "../../../context/ApplicationContext";
import coatOfArms from "../../../assets/coat-of-arms.png";

const FACEAPI_MODELS_URL   = "/models";
const HOLD_SECONDS         = 4;
const MIN_STABLE_FRAMES    = 10;
const MAX_ATTEMPTS         = 3;
const CHALLENGE_TIMEOUT    = 14000; // 14s — generous window for real users
const MIN_COVERAGE         = 0.12;
const DISTANCE_DEBOUNCE    = 8;   // consecutive frames before a distance-state change commits
const CONSEC_FRAMES        = 6;     // kept for reference

// EMA smoothing factor for gaze signal — 0.35 = moderate smoothing, removes jitter without lag
const EMA_ALPHA = 0.35;

const LEFT_EYE   = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE  = [362, 385, 387, 263, 373, 380];
const LEFT_IRIS  = [468, 469, 470, 471, 472];
const RIGHT_IRIS = [473, 474, 475, 476, 477];
const NOSE_TIP   = 4;
const MOUTH_LEFT  = 61;
const MOUTH_RIGHT = 291;

// Gaze-only pool — all require iris to move independently of the eye socket corner.
// On a flat photo/passport the iris and corner are on the same surface, so they move
// together and gazeIsolatedH fails. 8 challenges choose 3 = 336 ordered permutations.
// Smile added back: a passport cannot smile; startMouthW guard prevents tilting faking it.
const CHALLENGE_POOL = [
  { id: "look_left",         label: "Look LEFT"         },
  { id: "look_right",        label: "Look RIGHT"        },
  { id: "look_up",           label: "Look UP"           },
  { id: "look_down",         label: "Look DOWN"         },
  { id: "look_top_left",     label: "Look TOP-LEFT"     },
  { id: "look_top_right",    label: "Look TOP-RIGHT"    },
  { id: "look_bottom_left",  label: "Look BOTTOM-LEFT"  },
  { id: "look_bottom_right", label: "Look BOTTOM-RIGHT" },
  { id: "smile",             label: "Smile naturally"   },
];

// Animated SVG demonstrations
// Each returns an SVG that loops to show exactly what the user should do.
// Gaze: only irises move. Turn: whole face rotates/foreshortens. Nod: head tilts.
// Change 1: neutral skin tone — #fde8cc→#d0d0d0, #d4a06a→#888888, #a0856a→#888888, #c08060→#888888, iris #3b4da8→#444444, blush #f9a8a8→rgba(255,255,255,0.2)
function ChallengeAnim({ id }) {
  // The video feed is scaleX(-1) (mirrored). The SVG is NOT mirrored — instead we
  // animate irises in the direction the user actually needs to look, which matches
  // what they see in the mirrored preview. Arrow directions match the mirrored view too.
  const s = { width: "100%", height: "100%" };
  // Shared SMIL keySpline ease
  const ks = "0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1";
  const kt = "0;0.3;0.6;0.8;1";

  // Iris pair animated on one axis — renders iris + pupil stacked
  const IrisPair = ({ lx, rx, y, animAttr, vals }) => <>
    <circle r="3.5" fill="#444">
      <animate attributeName={animAttr === "cx" ? "cx" : "cy"}
        values={animAttr === "cx" ? vals.l : `${y};${vals.l};${vals.l};${y};${y}`}
        keyTimes={kt} dur="2s" repeatCount="indefinite" calcMode="spline" keySplines={ks}/>
      {animAttr === "cx"
        ? <animate attributeName="cy" values={`${y};${y};${y};${y};${y}`} keyTimes={kt} dur="2s" repeatCount="indefinite"/>
        : <animate attributeName="cx" values={`${lx};${lx};${lx};${lx};${lx}`} keyTimes={kt} dur="2s" repeatCount="indefinite"/>}
    </circle>
    <circle r="1.8" fill="#111">
      <animate attributeName={animAttr === "cx" ? "cx" : "cy"}
        values={animAttr === "cx" ? vals.l : `${y};${vals.l};${vals.l};${y};${y}`}
        keyTimes={kt} dur="2s" repeatCount="indefinite" calcMode="spline" keySplines={ks}/>
      {animAttr === "cx"
        ? <animate attributeName="cy" values={`${y};${y};${y};${y};${y}`} keyTimes={kt} dur="2s" repeatCount="indefinite"/>
        : <animate attributeName="cx" values={`${lx};${lx};${lx};${lx};${lx}`} keyTimes={kt} dur="2s" repeatCount="indefinite"/>}
    </circle>
    <circle r="3.5" fill="#444">
      <animate attributeName={animAttr === "cx" ? "cx" : "cy"}
        values={animAttr === "cx" ? vals.r : `${y};${vals.r};${vals.r};${y};${y}`}
        keyTimes={kt} dur="2s" repeatCount="indefinite" calcMode="spline" keySplines={ks}/>
      {animAttr === "cx"
        ? <animate attributeName="cy" values={`${y};${y};${y};${y};${y}`} keyTimes={kt} dur="2s" repeatCount="indefinite"/>
        : <animate attributeName="cx" values={`${rx};${rx};${rx};${rx};${rx}`} keyTimes={kt} dur="2s" repeatCount="indefinite"/>}
    </circle>
    <circle r="1.8" fill="#111">
      <animate attributeName={animAttr === "cx" ? "cx" : "cy"}
        values={animAttr === "cx" ? vals.r : `${y};${vals.r};${vals.r};${y};${y}`}
        keyTimes={kt} dur="2s" repeatCount="indefinite" calcMode="spline" keySplines={ks}/>
      {animAttr === "cx"
        ? <animate attributeName="cy" values={`${y};${y};${y};${y};${y}`} keyTimes={kt} dur="2s" repeatCount="indefinite"/>
        : <animate attributeName="cx" values={`${rx};${rx};${rx};${rx};${rx}`} keyTimes={kt} dur="2s" repeatCount="indefinite"/>}
    </circle>
  </>;

  // Diagonal iris pair — animates both cx and cy simultaneously
  const DiagIris = ({ startX, startY, endX, endY }) => <>
    <circle r="3.5" fill="#444">
      <animate attributeName="cx" values={`${startX};${endX};${endX};${startX};${startX}`} keyTimes={kt} dur="2s" repeatCount="indefinite" calcMode="spline" keySplines={ks}/>
      <animate attributeName="cy" values={`${startY};${endY};${endY};${startY};${startY}`} keyTimes={kt} dur="2s" repeatCount="indefinite" calcMode="spline" keySplines={ks}/>
    </circle>
    <circle r="1.8" fill="#111">
      <animate attributeName="cx" values={`${startX};${endX};${endX};${startX};${startX}`} keyTimes={kt} dur="2s" repeatCount="indefinite" calcMode="spline" keySplines={ks}/>
      <animate attributeName="cy" values={`${startY};${endY};${endY};${startY};${startY}`} keyTimes={kt} dur="2s" repeatCount="indefinite" calcMode="spline" keySplines={ks}/>
    </circle>
  </>;

  // Shared face shell
  const Head = () => <>
    <ellipse cx="50" cy="52" rx="28" ry="36" fill="#d0d0d0" stroke="#888" strokeWidth="2"/>
    <ellipse cx="38" cy="46" rx="8" ry="5" fill="white" stroke="#888" strokeWidth="1.2"/>
    <ellipse cx="62" cy="46" rx="8" ry="5" fill="white" stroke="#888" strokeWidth="1.2"/>
    <path d="M42 66 Q50 70 58 66" stroke="#888" strokeWidth="1.5" strokeLinecap="round"/>
  </>;

  // Fading arrow
  const Arrow = ({ children }) => (
    <g opacity="0">
      <animate attributeName="opacity" values="0;0.85;0.85;0;0" keyTimes="0;0.25;0.55;0.7;1" dur="2s" repeatCount="indefinite"/>
      {children}
    </g>
  );

  switch (id) {
    // Arrow direction matches the label — "Look LEFT" = left-pointing arrow.
    // Iris animation: camera is mirrored so the user's eyes appear on the opposite side,
    // but the iris moves toward the label direction in the SVG (matches natural expectation).
    case "look_left": return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={s}>
        <Head/>
        <IrisPair lx={38} rx={62} y={46} animAttr="cx" vals={{ l:"38;32;32;38;38", r:"62;56;56;62;62" }}/>
        <Arrow><line x1="22" y1="46" x2="10" y2="46" stroke="white" strokeWidth="2" strokeLinecap="round"/><polyline points="15,41 10,46 15,51" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/></Arrow>
      </svg>
    );
    case "look_right": return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={s}>
        <Head/>
        <IrisPair lx={38} rx={62} y={46} animAttr="cx" vals={{ l:"38;44;44;38;38", r:"62;68;68;62;62" }}/>
        <Arrow><line x1="78" y1="46" x2="90" y2="46" stroke="white" strokeWidth="2" strokeLinecap="round"/><polyline points="85,41 90,46 85,51" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/></Arrow>
      </svg>
    );
    case "look_up": return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={s}>
        <Head/>
        <IrisPair lx={38} rx={62} y={46} animAttr="cy" vals={{ l:"41", r:"41" }}/>
        <Arrow><line x1="50" y1="20" x2="50" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round"/><polyline points="45,13 50,8 55,13" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/></Arrow>
      </svg>
    );
    case "look_down": return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={s}>
        <Head/>
        <IrisPair lx={38} rx={62} y={46} animAttr="cy" vals={{ l:"50", r:"50" }}/>
        <Arrow><line x1="50" y1="80" x2="50" y2="92" stroke="white" strokeWidth="2" strokeLinecap="round"/><polyline points="45,87 50,92 55,87" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/></Arrow>
      </svg>
    );
    case "look_top_left": return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={s}>
        <Head/>
        <DiagIris startX={38} startY={46} endX={32} endY={41}/>
        <DiagIris startX={62} startY={46} endX={56} endY={41}/>
        <Arrow><line x1="22" y1="22" x2="12" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/><polyline points="18,12 12,12 12,18" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/></Arrow>
      </svg>
    );
    case "look_top_right": return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={s}>
        <Head/>
        <DiagIris startX={38} startY={46} endX={44} endY={41}/>
        <DiagIris startX={62} startY={46} endX={68} endY={41}/>
        <Arrow><line x1="78" y1="22" x2="88" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/><polyline points="82,12 88,12 88,18" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/></Arrow>
      </svg>
    );
    case "look_bottom_left": return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={s}>
        <Head/>
        <DiagIris startX={38} startY={46} endX={32} endY={50}/>
        <DiagIris startX={62} startY={46} endX={56} endY={50}/>
        <Arrow><line x1="22" y1="78" x2="12" y2="88" stroke="white" strokeWidth="2" strokeLinecap="round"/><polyline points="18,88 12,88 12,82" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/></Arrow>
      </svg>
    );
    case "look_bottom_right": return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={s}>
        <Head/>
        <DiagIris startX={38} startY={46} endX={44} endY={50}/>
        <DiagIris startX={62} startY={46} endX={68} endY={50}/>
        <Arrow><line x1="78" y1="78" x2="88" y2="88" stroke="white" strokeWidth="2" strokeLinecap="round"/><polyline points="82,88 88,88 88,82" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/></Arrow>
      </svg>
    );
    case "blink": return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={s}>
        <Head/>
        <circle cx="38" cy="46" r="3.5" fill="#444"/>
        <circle cx="62" cy="46" r="3.5" fill="#444"/>
        <circle cx="38" cy="46" r="1.8" fill="#111"/>
        <circle cx="62" cy="46" r="1.8" fill="#111"/>
        <ellipse cx="38" cy="46" rx="8" ry="0" fill="#d0d0d0" stroke="#888" strokeWidth="1.2">
          <animate attributeName="ry" values="0;0;5;5;0" keyTimes="0;0.35;0.5;0.65;1" dur="2.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"/>
        </ellipse>
        <ellipse cx="62" cy="46" rx="8" ry="0" fill="#d0d0d0" stroke="#888" strokeWidth="1.2">
          <animate attributeName="ry" values="0;0;5;5;0" keyTimes="0;0.35;0.5;0.65;1" dur="2.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"/>
        </ellipse>
      </svg>
    );
    case "smile": return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={s}>
        <Head/>
        <circle cx="38" cy="46" r="3.5" fill="#444"/>
        <circle cx="62" cy="46" r="3.5" fill="#444"/>
        <circle cx="38" cy="46" r="1.8" fill="#111"/>
        <circle cx="62" cy="46" r="1.8" fill="#111"/>
        <path stroke="#888" strokeWidth="2" strokeLinecap="round" fill="none">
          <animate attributeName="d" values="M42 66 Q50 67 58 66;M42 66 Q50 67 58 66;M40 64 Q50 76 60 64;M40 64 Q50 76 60 64;M42 66 Q50 67 58 66" keyTimes="0;0.2;0.45;0.75;1" dur="2.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"/>
        </path>
      </svg>
    );
    case "turn_left": return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={s}>
        <g style={{ transformOrigin: "50px 52px" }}>
          <animateTransform attributeName="transform" type="scale" values="1 1;0.55 1;0.55 1;1 1;1 1" keyTimes={kt} dur="2.2s" repeatCount="indefinite" additive="replace" calcMode="spline" keySplines={ks}/>
          <ellipse cx="50" cy="52" rx="28" ry="36" fill="#d0d0d0" stroke="#888" strokeWidth="2"/>
          <ellipse cx="38" cy="46" rx="8" ry="5" fill="white" stroke="#888" strokeWidth="1.2"/>
          <ellipse cx="62" cy="46" rx="8" ry="5" fill="white" stroke="#888" strokeWidth="1.2"/>
          <circle cx="38" cy="46" r="3.5" fill="#444"/><circle cx="62" cy="46" r="3.5" fill="#444"/>
          <circle cx="38" cy="46" r="1.8" fill="#111"/><circle cx="62" cy="46" r="1.8" fill="#111"/>
          <path d="M42 66 Q50 70 58 66" stroke="#888" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="50" y1="54" x2="50" y2="62" stroke="#888" strokeWidth="1.5" strokeLinecap="round"/>
        </g>
        <Arrow><line x1="18" y1="52" x2="6" y2="52" stroke="white" strokeWidth="2" strokeLinecap="round"/><polyline points="11,47 6,52 11,57" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/></Arrow>
      </svg>
    );
    case "turn_right": return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={s}>
        <g style={{ transformOrigin: "50px 52px" }}>
          <animateTransform attributeName="transform" type="scale" values="1 1;0.55 1;0.55 1;1 1;1 1" keyTimes={kt} dur="2.2s" repeatCount="indefinite" additive="replace" calcMode="spline" keySplines={ks}/>
          <ellipse cx="50" cy="52" rx="28" ry="36" fill="#d0d0d0" stroke="#888" strokeWidth="2"/>
          <ellipse cx="38" cy="46" rx="8" ry="5" fill="white" stroke="#888" strokeWidth="1.2"/>
          <ellipse cx="62" cy="46" rx="8" ry="5" fill="white" stroke="#888" strokeWidth="1.2"/>
          <circle cx="38" cy="46" r="3.5" fill="#444"/><circle cx="62" cy="46" r="3.5" fill="#444"/>
          <circle cx="38" cy="46" r="1.8" fill="#111"/><circle cx="62" cy="46" r="1.8" fill="#111"/>
          <path d="M42 66 Q50 70 58 66" stroke="#888" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="50" y1="54" x2="50" y2="62" stroke="#888" strokeWidth="1.5" strokeLinecap="round"/>
        </g>
        <Arrow><line x1="82" y1="52" x2="94" y2="52" stroke="white" strokeWidth="2" strokeLinecap="round"/><polyline points="89,47 94,52 89,57" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/></Arrow>
      </svg>
    );
    case "nod": return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={s}>
        <g>
          <animateTransform attributeName="transform" type="translate" values="0 0;0 10;0 10;0 0;0 0" keyTimes={kt} dur="2.2s" repeatCount="indefinite" calcMode="spline" keySplines={ks}/>
          <ellipse cx="50" cy="48" rx="26" ry="33" fill="#d0d0d0" stroke="#888" strokeWidth="2"/>
          <ellipse cx="38" cy="43" rx="8" ry="5" fill="white" stroke="#888" strokeWidth="1.2"/>
          <ellipse cx="62" cy="43" rx="8" ry="5" fill="white" stroke="#888" strokeWidth="1.2"/>
          <circle cx="38" cy="43" r="3.5" fill="#444"/><circle cx="62" cy="43" r="3.5" fill="#444"/>
          <circle cx="38" cy="43" r="1.8" fill="#111"/><circle cx="62" cy="43" r="1.8" fill="#111"/>
          <path d="M42 61 Q50 65 58 61" stroke="#888" strokeWidth="1.5" strokeLinecap="round"/>
        </g>
        <Arrow><line x1="50" y1="80" x2="50" y2="92" stroke="white" strokeWidth="2" strokeLinecap="round"/><polyline points="45,87 50,92 55,87" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/></Arrow>
      </svg>
    );
    default: return null;
  }
}

// slides shown before the camera starts
const BRIEFING_SLIDES = [
  {
    emoji: "🪪",
    title: "Live Identity Verification",
    desc: "We need to confirm you are the person on your licence. Your camera will take a short live video check — no photo is stored permanently.",
  },
  {
    emoji: "📷",
    title: "Face the camera",
    desc: "Sit close to the screen — your face should fill most of the box. Closer than you think! About half an arm's length away works best.",
  },
  {
    emoji: "👓",
    title: "Remove glasses & hat",
    desc: "Take off glasses, sunglasses, or any hat so your full face and forehead are clearly visible.",
  },
  {
    emoji: "💡",
    title: "Good lighting",
    desc: "Sit facing a light source. Avoid backlighting — your face must be evenly lit from the front.",
  },
];

function pickChallenges() {
  return [...CHALLENGE_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
}

const STEP = {
  LOADING: "loading", BRIEFING: "briefing", CAMERA: "camera",
  ANALYSING: "analysing", RESULT: "result", ERROR: "error",
};

// scoring helpers
function computeLBPScore(canvas, box) {
  try {
    const ctx = canvas.getContext("2d");
    const x = Math.max(0, Math.floor(box.x)), y = Math.max(0, Math.floor(box.y));
    const w = Math.min(Math.floor(box.width), canvas.width - x);
    const h = Math.min(Math.floor(box.height), canvas.height - y);
    if (w < 20 || h < 20) return 50;
    const pixels = ctx.getImageData(x, y, w, h).data;
    const gray = [];
    for (let i = 0; i < pixels.length; i += 4)
      gray.push(0.299 * pixels[i] + 0.587 * pixels[i+1] + 0.114 * pixels[i+2]);
    const hist = new Array(256).fill(0);
    let count = 0;
    for (let r = 1; r < h - 1; r++) for (let c = 1; c < w - 1; c++) {
      const ctr = gray[r*w+c];
      const nb = [
        gray[(r-1)*w+(c-1)], gray[(r-1)*w+c], gray[(r-1)*w+(c+1)],
        gray[r*w+(c+1)], gray[(r+1)*w+(c+1)], gray[(r+1)*w+c],
        gray[(r+1)*w+(c-1)], gray[r*w+(c-1)],
      ];
      let lbp = 0; nb.forEach((n, i) => { if (n >= ctr) lbp |= (1 << i); });
      hist[lbp]++; count++;
    }
    if (!count) return 50;
    const norm = hist.map(v => v / count);
    let e = 0; norm.forEach(p => { if (p > 0) e -= p * Math.log2(p); });
    return Math.round(Math.min(e / 7.5, 1) * 100);
  } catch { return 50; }
}

// checks for real 3D depth — a flat photo has basically no z variation across landmarks.
// nose sticks out, eye corners are recessed. on a photo they're all the same flat z.
function computeDepthScore(lm) {
  try {
    const zv   = lm.map(l => l.z);
    const mean = zv.reduce((a, b) => a + b, 0) / zv.length;
    const variance = zv.reduce((s, z) => s + Math.pow(z - mean, 2), 0) / zv.length;
    const noseTipZ    = lm[4].z;
    const eyeCornerZ  = (lm[33].z + lm[263].z) / 2;
    const protrusion  = eyeCornerZ - noseTipZ; // positive = nose sticks out
    const varianceScore   = Math.min(variance / 0.003, 1);
    const protrusionScore = Math.min(Math.max(protrusion, 0) / 0.03, 1);
    return Math.round((varianceScore * 0.5 + protrusionScore * 0.5) * 100);
  } catch { return 50; }
}

// how much the iris moved around — informational only, not used for the pass/fail gate
function computeIndependenceScore(samples) {
  if (samples.length < 40) return 50;
  const xs = samples.filter((_, i) => i % 2 === 0);
  const ys = samples.filter((_, i) => i % 2 === 1);
  const variance = (arr) => {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / arr.length;
  };
  const vMax = Math.max(variance(xs), variance(ys));
  return Math.round(Math.min(vMax / 0.00008, 1) * 100);
}

// tracks the tiny highlight shift in the eye region each frame.
// real eyes move constantly from micro-saccades — photos stay static.
function computeEyeSpecScore(samples) {
  if (samples.length < 20) return 50; // not enough frames yet
  let diffSum = 0;
  for (let i = 1; i < samples.length; i++) diffSum += Math.abs(samples[i] - samples[i - 1]);
  const meanDiff = diffSum / (samples.length - 1);
  // real face: ~1-5 brightness units of jitter. photo: under 0.5.
  return Math.round(Math.min(meanDiff / 4.0, 1) * 100);
}

function computeMotionScore(samples) {
  if (samples.length < 30) return 50;
  // look at the quietest frames (10th percentile) — real skin always has some tremor even when still.
  // a held photo has zeroes; a moved photo has big shifts but that doesn't help it here.
  const sorted = [...samples].sort((a, b) => a - b);
  const p10 = sorted[Math.floor(sorted.length * 0.10)];
  const p50 = sorted[Math.floor(sorted.length * 0.50)];
  const steadinessScore = Math.min(p10 / 0.4, 1);
  const medianScore     = Math.min(p50 / 1.5, 1);
  return Math.round((steadinessScore * 0.7 + medianScore * 0.3) * 100);
}


// heartbeat detection from the green channel of the skin — blood flow causes a ~1Hz oscillation.
// photos don't have that, so no peak shows up in the frequency spectrum.

// Cooley-Tukey FFT (in-place, power-of-2 length)
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len;
    const wRe = Math.cos(ang), wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let j = 0; j < len / 2; j++) {
        const uRe = re[i+j], uIm = im[i+j];
        const vRe = re[i+j+len/2]*curRe - im[i+j+len/2]*curIm;
        const vIm = re[i+j+len/2]*curIm + im[i+j+len/2]*curRe;
        re[i+j] = uRe+vRe; im[i+j] = uIm+vIm;
        re[i+j+len/2] = uRe-vRe; im[i+j+len/2] = uIm-vIm;
        const nextRe = curRe*wRe - curIm*wIm;
        curIm = curRe*wIm + curIm*wRe; curRe = nextRe;
      }
    }
  }
}

// Score 0–100: how strong is the heartbeat peak vs noise floor?
// Returns { score, bpm } — score >= 60 → real face, < 60 → likely photo/screen
function computeRppgScore(greenSamples, fps) {
  if (greenSamples.length < fps * 4) return { score: 50, bpm: 0 }; // need at least 4s
  const N = 256; // last ~8.5s at 30fps, power of 2 for the FFT
  const raw = greenSamples.slice(-N);
  // subtract the mean so slow lighting drift doesn't dominate the FFT
  const mean = raw.reduce((a, b) => a + b, 0) / raw.length;
  const detrended = raw.map(v => v - mean);
  // hann window to cut spectral leakage at the edges
  const re = detrended.map((v, i) => v * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1))));
  const im = new Array(N).fill(0);
  fft(re, im);
  const power = re.map((r, i) => r*r + im[i]*im[i]);
  const freqRes = fps / N;
  // heartbeat is 0.75–2.5 Hz (45–150 BPM)
  const loIdx = Math.ceil(0.75 / freqRes);
  const hiIdx = Math.floor(2.5 / freqRes);
  if (hiIdx <= loIdx) return { score: 50, bpm: 0 };
  let peakPower = 0, peakIdx = loIdx;
  for (let i = loIdx; i <= hiIdx; i++) { if (power[i] > peakPower) { peakPower = power[i]; peakIdx = i; } }
  // noise floor = average power outside the heartbeat band
  const noiseHi = Math.floor(4.0 / freqRes);
  let noiseSum = 0, noiseCount = 0;
  for (let i = 1; i < noiseHi && i < N/2; i++) {
    if (i < loIdx || i > hiIdx) { noiseSum += power[i]; noiseCount++; }
  }
  const noiseMean = noiseCount > 0 ? noiseSum / noiseCount : 1;
  const snr = peakPower / Math.max(noiseMean, 1e-10);
  const bpm = Math.round(peakIdx * freqRes * 60);
  // real face SNR is typically 2–6, photo is ~1–1.5. map so SNR=1→0, SNR=3→100
  const score = Math.round(Math.min(Math.max((snr - 1) / 2, 0), 1) * 100);
  return { score, bpm, snr: Math.round(snr * 10) / 10 };
}

// Laplacian variance — measures image sharpness by computing the variance of the
// Laplacian operator across the face region. Higher = sharper frame.
function laplacianVariance(canvas, box) {
  try {
    const ctx = canvas.getContext("2d");
    const x = Math.max(0, Math.floor(box.x));
    const y = Math.max(0, Math.floor(box.y));
    const w = Math.min(Math.floor(box.width),  canvas.width  - x);
    const h = Math.min(Math.floor(box.height), canvas.height - y);
    if (w < 20 || h < 20) return 0;
    const pixels = ctx.getImageData(x, y, w, h).data;
    // convert to grayscale
    const gray = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++)
      gray[i] = 0.299 * pixels[i*4] + 0.587 * pixels[i*4+1] + 0.114 * pixels[i*4+2];
    // apply 3x3 Laplacian kernel [0,1,0,1,-4,1,0,1,0]
    let sum = 0, sum2 = 0, count = 0;
    for (let r = 1; r < h - 1; r++) {
      for (let c = 1; c < w - 1; c++) {
        const lap = -4 * gray[r*w+c] + gray[(r-1)*w+c] + gray[(r+1)*w+c] + gray[r*w+c-1] + gray[r*w+c+1];
        sum  += lap;
        sum2 += lap * lap;
        count++;
      }
    }
    if (!count) return 0;
    const mean = sum / count;
    return (sum2 / count) - mean * mean; // variance
  } catch { return 0; }
}

function measureBrightness(canvas, box) {
  try {
    const ctx = canvas.getContext("2d");
    const cx = box.x + box.width * 0.25, cy = box.y + box.height * 0.25;
    const sw = box.width * 0.5, sh = box.height * 0.5;
    const x = Math.max(0, Math.floor(cx)), y = Math.max(0, Math.floor(cy));
    const w = Math.min(Math.floor(sw), canvas.width - x);
    const h = Math.min(Math.floor(sh), canvas.height - y);
    if (w < 10 || h < 10) return 128;
    const pixels = ctx.getImageData(x, y, w, h).data;
    let sum = 0;
    for (let i = 0; i < pixels.length; i += 4)
      sum += 0.299 * pixels[i] + 0.587 * pixels[i+1] + 0.114 * pixels[i+2];
    return sum / (pixels.length / 4);
  } catch { return 128; }
}

// Returns true only if the landmark geometry looks like a real human face.
// Rejects toys, stuffed animals, and random objects that MediaPipe misidentifies.
function isPlausibleHumanFace(lm) {
  try {
    const lEye  = { x: (lm[33].x  + lm[133].x)  / 2, y: (lm[33].y  + lm[133].y)  / 2 };
    const rEye  = { x: (lm[362].x + lm[263].x) / 2, y: (lm[362].y + lm[263].y) / 2 };
    const nose  = lm[4];
    const mL    = lm[61];
    const mR    = lm[291];
    const chin  = lm[152];
    const top   = lm[10];

    const eyeMidY   = (lEye.y + rEye.y) / 2;
    const eyeSep    = Math.hypot(rEye.x - lEye.x, rEye.y - lEye.y);
    const faceH     = Math.abs(chin.y - top.y);
    const mouthMidX = (mL.x + mR.x) / 2;
    const noseMidX  = nose.x;

    // eyes must be above nose, nose above mouth, mouth above chin
    if (nose.y  <= eyeMidY)   return false;
    if (mL.y    <= nose.y)    return false;
    if (chin.y  <= mL.y)      return false;
    // eye separation must be 25–65% of face height (human proportions)
    if (eyeSep < faceH * 0.25 || eyeSep > faceH * 0.65) return false;
    // nose and mouth must be roughly centred horizontally between the eyes
    const eyeLeft  = Math.min(lEye.x, rEye.x);
    const eyeRight = Math.max(lEye.x, rEye.x);
    if (noseMidX < eyeLeft - eyeSep * 0.3 || noseMidX > eyeRight + eyeSep * 0.3) return false;
    if (mouthMidX < eyeLeft - eyeSep * 0.3 || mouthMidX > eyeRight + eyeSep * 0.3) return false;
    // face must be taller than wide (portrait aspect)
    const faceW = Math.abs(lm[234].x - lm[454].x);
    if (faceH < faceW * 0.9) return false;

    return true;
  } catch { return false; }
}

function getEAR(lm, idx) {
  const p = idx.map(i => lm[i]);
  return (Math.hypot(p[1].x-p[5].x, p[1].y-p[5].y) + Math.hypot(p[2].x-p[4].x, p[2].y-p[4].y)) /
    (2 * Math.hypot(p[0].x-p[3].x, p[0].y-p[3].y));
}

function irisCenter(lm, idx) {
  const pts = idx.map(i => lm[i]);
  return { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length };
}

function eyeWidth(lm, idx) {
  return Math.hypot(lm[idx[0]].x - lm[idx[3]].x, lm[idx[0]].y - lm[idx[3]].y);
}

// animated score bar shown in the results panel
function ScoreRow({ label, score, threshold = 55, delay = 0, informational = false }) {
  const [width, setWidth] = useState(0);
  useEffect(() => { const t = setTimeout(() => setWidth(score), delay); return () => clearTimeout(t); }, [score, delay]);
  const good = score >= threshold;
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "#374151" }}>{label}</span>
          {informational && <span style={{ fontSize: "9px", fontWeight: "600", color: "#94a3b8", background: "#f1f5f9", padding: "1px 6px", borderRadius: "999px", textTransform: "uppercase" }}>Info only</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span style={{ fontSize: "13px", fontWeight: "800", color: informational ? "#6b7280" : good ? "#15803d" : "#dc2626" }}>{score}<span style={{ fontSize: "9px", color: "#9ca3af", fontWeight: "400" }}>/100</span></span>
          {!informational && (
            <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: good ? "#22c55e" : "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {good ? <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round"><path d="M5 12l5 5L20 7"/></svg>
                    : <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>}
            </div>
          )}
        </div>
      </div>
      <div style={{ background: "#f3f4f6", borderRadius: "999px", height: "5px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${width}%`, background: informational ? "#94a3b8" : good ? "#22c55e" : "#ef4444", borderRadius: "999px", transition: "width 1s cubic-bezier(0.4,0,0.2,1)" }}/>
      </div>
    </div>
  );
}

// yellow warning box
function WarnBanner({ message }) {
  return (
    <div style={{ background: "rgba(254,243,199,0.95)", border: "1.5px solid #fde68a", borderRadius: "8px", padding: "7px 10px", marginBottom: "6px", display: "flex", gap: "7px", alignItems: "flex-start" }}>
      <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <p style={{ fontSize: "11px", fontWeight: "600", color: "#92400e", margin: 0, lineHeight: 1.4 }}>{message}</p>
    </div>
  );
}

const GUIDE_DARK = "rgba(0,0,0,0.58)";

// GuideBox — module-level + memoized. The four dark bars never change.
// Only borderColor prop changes, which only affects the thin border div.
const GuideBox = memo(function GuideBox({ borderColor }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "34%",        background: GUIDE_DARK }}/>
      <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "34%",       background: GUIDE_DARK }}/>
      <div style={{ position: "absolute", left: "34%", right: "34%", top: 0, height: "6%", background: GUIDE_DARK }}/>
      <div style={{ position: "absolute", left: "34%", right: "34%", bottom: 0, height: "6%", background: GUIDE_DARK }}/>
      <div style={{
        position: "absolute", left: "34%", top: "6%", width: "32%", height: "88%",
        border: `3px solid ${borderColor}`, borderRadius: "18px",
        transition: "border-color 0.8s ease",
      }}/>
    </div>
  );
});

const STATUS_MSGS = {
  none:      "No face detected",
  far:       "Face detected — move closer",
  too_close: "Too close — move back",
  good:      "Good — hold that position",
};
const STATUS_DOT_COLOR = {
  none:      "rgba(255,255,255,0.35)",
  far:       "rgba(255,255,255,0.35)",
  too_close: "#ef4444",
  good:      "#f59e0b",
};
const STATUS_BG = {
  none:      "rgba(255,255,255,0.08)",
  far:       "rgba(255,255,255,0.08)",
  too_close: "rgba(239,68,68,0.15)",
  good:      "rgba(245,158,11,0.15)",
};
const STATUS_BORDER = {
  none:      "rgba(255,255,255,0.18)",
  far:       "rgba(255,255,255,0.18)",
  too_close: "rgba(239,68,68,0.45)",
  good:      "rgba(245,158,11,0.45)",
};

// Memoized — only re-renders when distanceState changes, and even then CSS handles the colour fade.
const StatusPill = memo(function StatusPill({ distanceState }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "7px",
      padding: "5px 14px", borderRadius: "999px",
      background: STATUS_BG[distanceState]     || STATUS_BG.none,
      border: `1px solid ${STATUS_BORDER[distanceState] || STATUS_BORDER.none}`,
      transition: "background 0.8s ease, border-color 0.8s ease",
    }}>
      <div style={{
        width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
        background: STATUS_DOT_COLOR[distanceState] || STATUS_DOT_COLOR.none,
        transition: "background 0.8s ease",
      }}/>
      <span style={{ fontSize: "12px", fontWeight: "600", color: "rgba(255,255,255,0.9)" }}>
        {STATUS_MSGS[distanceState] || STATUS_MSGS.none}
      </span>
    </div>
  );
});

const BriefingScreen = memo(function BriefingScreen({ briefSlide, modelsReady, onSkip, onNext, onBegin }) {
  const isLast = briefSlide === BRIEFING_SLIDES.length - 1;
  const s = BRIEFING_SLIDES[briefSlide];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: "11px", fontWeight: "700", color: BRAND.primary, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 1px" }}>Step 4 of 8</p>
          <h1 style={{ fontSize: "17px", fontWeight: "800", color: "#1b1c1c", margin: 0 }}>Identity Verification</h1>
        </div>
        <button onClick={onSkip} style={{ background: "none", border: "none", fontSize: "12px", color: modelsReady ? "#94a3b8" : "#d1d5db", cursor: modelsReady ? "pointer" : "wait", fontWeight: "500", padding: 0 }}>
          Skip →
        </button>
      </div>
      <div style={{
        borderRadius: "16px", overflow: "hidden",
        background: "#0a1628",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
        display: "flex", flexDirection: "column",
        height: "min(calc(100vw * 3/4 + 80px), calc(52svh + 80px))",
        willChange: "transform",
      }}>
        <div key={briefSlide} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px 28px 12px", textAlign: "center", animation: "slideUp 0.3s ease", overflow: "hidden" }}>
          <div style={{ width: "clamp(52px,12vw,68px)", height: "clamp(52px,12vw,68px)", borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "clamp(24px,5.5vw,34px)", lineHeight: 1, marginBottom: "clamp(10px,2.5vw,16px)", flexShrink: 0 }}>
            {s.emoji}
          </div>
          <p style={{ fontSize: "clamp(15px,3.5vw,20px)", fontWeight: "800", color: "white", margin: "0 0 8px", lineHeight: 1.2, letterSpacing: "-0.3px" }}>{s.title}</p>
          <p style={{ fontSize: "clamp(11px,2.5vw,13px)", color: "rgba(255,255,255,0.55)", margin: 0, lineHeight: 1.6, maxWidth: "260px" }}>{s.desc}</p>
        </div>
        <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: "7px", alignItems: "center" }}>
            {Array.from({ length: BRIEFING_SLIDES.length }).map((_, i) => (
              <div key={i} style={{ width: i === briefSlide ? "18px" : "6px", height: "6px", borderRadius: "999px", background: i === briefSlide ? "white" : "rgba(255,255,255,0.25)", transition: "all 0.3s ease" }}/>
            ))}
          </div>
          <button
            disabled={isLast && !modelsReady}
            onClick={isLast ? onBegin : onNext}
            style={{
              width: "100%", height: "44px", borderRadius: "10px", border: "none", fontSize: "14px", fontWeight: "800",
              color: "white", cursor: isLast && !modelsReady ? "wait" : "pointer",
              background: isLast && !modelsReady ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg,#1d4ed8,#1e40af)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              transition: "background 0.3s ease",
            }}>
            {isLast
              ? (!modelsReady
                  ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> <span>Preparing…</span></>
                  : <span>Begin Verification →</span>)
              : <><span>Next</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>
            }
          </button>
        </div>
      </div>
    </div>
  );
});

// Memoized bottom panel for baseline_intro — only re-renders when distanceState changes.
// Keeping this separate stops the parent's 30fps MediaPipe loop from repainting the gradients.
const BaselineIntroBottom = memo(function BaselineIntroBottom({ distanceState, onBegin }) {
  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 3,
      background: "linear-gradient(to top, rgba(8,20,50,0.92) 70%, transparent)",
      padding: "24px 20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px",
      pointerEvents: distanceState === "good" ? "auto" : "none",
    }}>
      <div style={{ position: "relative", width: "100%", maxWidth: "220px", height: "44px", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.1)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.15)", opacity: distanceState !== "good" ? 1 : 0, transition: "opacity 0.7s ease" }}/>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#1d4ed8,#1e40af)", borderRadius: "10px", opacity: distanceState === "good" ? 1 : 0, transition: "opacity 0.7s ease" }}/>
        <button
          disabled={distanceState !== "good"}
          onClick={onBegin}
          style={{
            position: "absolute", inset: 0, background: "transparent", border: "none",
            borderRadius: "10px", fontSize: "14px", fontWeight: "800",
            cursor: distanceState === "good" ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
          <span style={{ position: "absolute", color: "white", opacity: distanceState === "good" ? 1 : 0, transition: "opacity 0.7s ease", whiteSpace: "nowrap" }}>Begin Verification →</span>
          <span style={{ position: "absolute", color: "rgba(255,255,255,0.4)", opacity: distanceState !== "good" ? 1 : 0, transition: "opacity 0.7s ease", whiteSpace: "nowrap" }}>Position your face to continue</span>
        </button>
      </div>
    </div>
  );
});

// main component
export default function Verification() {
  const navigate        = useNavigate();
  const location        = useLocation();
  const { state }       = useAppState();
  const isReverif       = !!(location.state?.reverification);
  const reverifAppId    = location.state?.appId;
  const appId           = isReverif ? reverifAppId : state.applicationId;

  const videoRef         = useRef(null);
  const cameraBoxVideoRef = useRef(null);
  const canvasRef        = useRef(null);
  const lbpCanvasRef     = useRef(null);
  const streamRef        = useRef(null);
  const faceMeshRef      = useRef(null);
  const animFrameRef     = useRef(null);
  const faceapiLoadedRef = useRef(false);

  const phaseRef            = useRef("hold");
  const challengesRef       = useRef([]);
  const currentChallengeRef = useRef(0);
  const challengeStartRef   = useRef(null);
  const challengeDataRef    = useRef({});
  const challengeResults    = useRef([]);
  const challengeLockedRef  = useRef(false);

  const holdStartRef        = useRef(null);
  const stableFramesRef     = useRef(0);
  const lastLandmarksRef    = useRef(null);
  const lastBoxRef          = useRef(null);
  const baselineRef         = useRef({});
  const earHistoryRef       = useRef([]);
  const missedFramesRef     = useRef(0);
  const liveDescRef         = useRef(null);
  const lastDistanceStateRef    = useRef("none");
  const lastFaceInOvalRef       = useRef(false);
  const lastFaceDetectedRef     = useRef(false);
  const pendingDistanceRef      = useRef("none");
  const pendingDistanceCountRef = useRef(0);
  const pendingOvalRef          = useRef(false);
  const pendingOvalCountRef     = useRef(0);
  const lastStatusMsgRef      = useRef("");
  const lastHoldProgressRef   = useRef(0);
  const lastTimerPctRef       = useRef(100);
  const headPathRef          = useRef([]);
  const independenceSamples  = useRef([]);
  const maxIndepHRef         = useRef(0); // highest iris-in-socket delta seen this session
  const challengePreviewRef  = useRef(false);
  const consecutiveRef       = useRef(0);
  const gazeWindowRef        = useRef([]); // last 9 frames — need 4/9 hits to confirm a challenge
  const phaseStateRef        = useRef("baseline_intro");
  const pixelPatchRef        = useRef(null);
  const pixelVarianceSamples = useRef([]);
  const depthSamples         = useRef([]);
  const rppgSamplesRef       = useRef([]); // green channel samples for heartbeat
  const rppgFpsRef           = useRef(30); // estimated fps
  const rppgLastTsRef        = useRef(0);  // last sample timestamp
  const naturalBlinkCountRef = useRef(0);  // blinks seen — photos never blink
  const blinkInProgressRef   = useRef(false); // prevents counting one blink twice

  // EMA smoothed gaze — smooths out per-frame landmark noise before challenge detection
  const emaGazeHRef  = useRef(null);
  const emaGazeVRef  = useRef(null);
  const emaIndepHRef = useRef(null);
  const emaIndepVRef = useRef(null);

  const eyeSpecSamplesRef = useRef([]); // brightest pixel in eye region each frame
  const deepfaceResultRef = useRef(null); // { is_real, score } from the backend DeepFace check
  const sharpFramesRef    = useRef([]); // { dataUrl, variance } — best frames for sharpest-frame selection

  const [step,                setStep]                = useState(STEP.BRIEFING);
  const [briefSlide,          setBriefSlide]          = useState(0);
  // what the camera box is currently doing
  const [phase,               setPhase]               = useState("baseline_intro");
  const [faceDetected,        setFaceDetected]        = useState(false);
  const [faceInOval,          setFaceInOval]          = useState(false);
  const [distanceState,       setDistanceState]       = useState("none"); // "none" | "far" | "close" | "good" | "too_close"
  const [holdProgress,        setHoldProgress]        = useState(0);
  const [statusMsg,           setStatusMsg]           = useState("");
  const [challengeId,         setChallengeId]         = useState(null);
  const [challengeMsg,        setChallengeMsg]        = useState("");
  const [challengeIndex,      setChallengeIndex]      = useState(0);
  const [timerPct,            setTimerPct]            = useState(100);
  const [scores,              setScores]              = useState(null);
  const [passed,              setPassed]              = useState(null);
  const [failReason,          setFailReason]          = useState("");
  const [attempts,            setAttempts]            = useState(0);
  const [error,               setError]               = useState("");
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [lastResult,          setLastResult]          = useState(null); // shows pass/fail flash between challenges
  const [debugGaze,           setDebugGaze]           = useState(null); // live gaze debug overlay
  const [photoCountdown,      setPhotoCountdown]      = useState(null); // null | 3 | 2 | 1 | "smile"
  const [photoFlash,          setPhotoFlash]          = useState(false);

  const setPhaseSync = (p) => { phaseStateRef.current = p; setPhase(p); };

  // load models in the background while the user reads the briefing
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!appId) throw new Error("no_app");
        const appRes = await api.get(`/api/applicant/applications/${appId}`);
        // already passed — jump straight to the result screen (skip for re-verification, user must redo)
        if (!cancelled && !isReverif && appRes.data?.application?.verification_passed) {
          setPassed(true);
          setStep(STEP.RESULT);
          return;
        }
        await faceapi.nets.tinyFaceDetector.loadFromUri(FACEAPI_MODELS_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(FACEAPI_MODELS_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(FACEAPI_MODELS_URL);
        if (!cancelled) faceapiLoadedRef.current = true;
      } catch (e) {
        if (!cancelled) {
          const msg = (!appId || e?.response?.status === 404)
            ? "Your session has expired. Please return to the start and begin a new application."
            : "Failed to load verification models. Check your connection and try again.";
          setError(msg); setStep(STEP.ERROR);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // reset all state when entering the camera step
  useEffect(() => {
    if (step !== STEP.CAMERA) return;
    challengesRef.current = pickChallenges();
    currentChallengeRef.current = 0;
    challengeResults.current    = [];
    challengeLockedRef.current  = false;
    phaseRef.current            = "hold";
    holdStartRef.current        = null;
    stableFramesRef.current     = 0;
    lastLandmarksRef.current    = null;
    lastBoxRef.current          = null;
    baselineRef.current         = {};
    earHistoryRef.current       = [];
    missedFramesRef.current     = 0;
    liveDescRef.current         = null;
    challengeStartRef.current   = null;
    challengeDataRef.current    = {};
    headPathRef.current         = [];
    independenceSamples.current = [];
    maxIndepHRef.current        = 0;
    deepfaceResultRef.current   = null;
    consecutiveRef.current      = 0;
    gazeWindowRef.current       = [];
    pixelPatchRef.current        = null;
    pixelVarianceSamples.current = [];
    depthSamples.current         = [];
    rppgSamplesRef.current       = [];
    rppgLastTsRef.current        = 0;
    naturalBlinkCountRef.current = 0;
    blinkInProgressRef.current   = false;
    emaGazeHRef.current          = null;
    emaGazeVRef.current          = null;
    emaIndepHRef.current         = null;
    emaIndepVRef.current         = null;
    eyeSpecSamplesRef.current    = [];
    sharpFramesRef.current       = [];
    setChallengeMsg(""); setChallengeId(null); setChallengeIndex(0); setTimerPct(100);
    setFaceInOval(false); setFaceDetected(false); setDistanceState("none"); setHoldProgress(0); setStatusMsg("");
    setCompletedChallenges([]);
    challengePreviewRef.current = false;
    setLastResult(null);
    setPhaseSync("baseline_camera");
    initMediaPipe();
    return () => cleanup();
  }, [step]);

  useEffect(() => () => cleanup(), []);

  const cleanup = () => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (streamRef.current)    { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (faceMeshRef.current)  { faceMeshRef.current.close?.(); faceMeshRef.current = null; }
  };

  const initMediaPipe = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      if (cameraBoxVideoRef.current) { cameraBoxVideoRef.current.srcObject = stream; cameraBoxVideoRef.current.play().catch(() => {}); }
      await new Promise(r => setTimeout(r, 200));
      const fm = new window.FaceMesh({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}` });
      fm.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
      fm.onResults(handleResults);
      await fm.initialize();
      faceMeshRef.current = fm;
      const detect = async () => {
        if (videoRef.current && videoRef.current.readyState >= 2 && faceMeshRef.current)
          await faceMeshRef.current.send({ image: videoRef.current });
        animFrameRef.current = requestAnimationFrame(detect);
      };
      detect();
    } catch (err) {
      setError(err.name === "NotAllowedError"
        ? "Camera access was denied. Please allow camera access in your browser settings."
        : "Camera could not be started. Please check your device and try again.");
      setStep(STEP.ERROR);
    }
  };

  const handleResults = (results) => {
    const ph = phaseStateRef.current;
    // collect gaze data even during overlays so we have enough samples by the end
    const cameraLive = ph === "baseline_intro" || ph === "baseline_camera" || ph === "challenge_camera" || ph === "challenge_intro" || ph === "challenge_done";
    if (!cameraLive) return;
    const setDistanceSafe    = (val) => { if (lastDistanceStateRef.current !== val) { lastDistanceStateRef.current = val; setDistanceState(val); } };
    const setFaceInOvalSafe  = (val) => { if (lastFaceInOvalRef.current   !== val) { lastFaceInOvalRef.current   = val; setFaceInOval(val);   } };
    const setFaceDetectSafe  = (val) => { if (lastFaceDetectedRef.current   !== val) { lastFaceDetectedRef.current   = val; setFaceDetected(val); } };
    const setStatusSafe      = (val) => { if (lastStatusMsgRef.current      !== val) { lastStatusMsgRef.current      = val; setStatusMsg(val); } };
    const setProgressSafe    = (val) => { const r = Math.round(val); if (lastHoldProgressRef.current !== r) { lastHoldProgressRef.current = r; setHoldProgress(r); } };

    if (!results.multiFaceLandmarks?.length) {
      missedFramesRef.current++;
      stableFramesRef.current = 0;
      setFaceInOvalSafe(false);
      setFaceDetectSafe(false);
      setDistanceSafe("none");
      if (missedFramesRef.current >= 8 && phaseRef.current === "hold") {
        holdStartRef.current = null; setProgressSafe(0);
      }
      return;
    }

    missedFramesRef.current = 0;
    const lm = results.multiFaceLandmarks[0];
    lastLandmarksRef.current = lm;

    const xs = lm.map(l => l.x), ys = lm.map(l => l.y);
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const maxX = Math.max(...xs), maxY = Math.max(...ys);
    const faceW = maxX - minX, faceH = maxY - minY;
    const coverage = faceW * faceH;

    const video = videoRef.current;
    if (video) {
      lastBoxRef.current = {
        x: minX * video.videoWidth, y: minY * video.videoHeight,
        width: faceW * video.videoWidth, height: faceH * video.videoHeight,
      };
    }

    // Hysteresis: enter "good" at MIN_COVERAGE, leave only when coverage drops 3% below that.
    const MAX_COVERAGE   = 0.45;
    const ENTER_GOOD_MIN = MIN_COVERAGE;
    const EXIT_GOOD_MIN  = MIN_COVERAGE - 0.03;
    const currentlyGood  = lastDistanceStateRef.current === "good";

    if (coverage < (currentlyGood ? EXIT_GOOD_MIN : ENTER_GOOD_MIN)) {
      stableFramesRef.current = 0; setFaceInOvalSafe(false); setFaceDetectSafe(false);
      setDistanceSafe("far");
      if (phaseRef.current === "hold") { holdStartRef.current = null; setProgressSafe(0); }
      return;
    }

    if (coverage > MAX_COVERAGE) {
      stableFramesRef.current = 0; setFaceInOvalSafe(false); setFaceDetectSafe(false);
      setDistanceSafe("too_close");
      if (phaseRef.current === "hold") { holdStartRef.current = null; setProgressSafe(0); }
      return;
    }

    if (!isPlausibleHumanFace(lm)) {
      stableFramesRef.current = 0; setFaceInOvalSafe(false); setFaceDetectSafe(false);
      setDistanceSafe("none");
      if (phaseRef.current === "hold") { holdStartRef.current = null; setProgressSafe(0); }
      return;
    }

    stableFramesRef.current++;
    setDistanceSafe("good");
    setFaceInOvalSafe(true);
    setFaceDetectSafe(true);

    // sample a frame every 15 frames for sharpest-frame selection
    if (stableFramesRef.current % 15 === 0 && video && lbpCanvasRef.current && lastBoxRef.current) {
      try {
        const sc = lbpCanvasRef.current;
        sc.width = video.videoWidth; sc.height = video.videoHeight;
        sc.getContext("2d").drawImage(video, 0, 0);
        const variance = laplacianVariance(sc, lastBoxRef.current);
        const url = sc.toDataURL("image/jpeg", 0.85);
        sharpFramesRef.current.push({ dataUrl: url, variance });
        // keep only the 5 sharpest frames seen so far
        sharpFramesRef.current.sort((a, b) => b.variance - a.variance);
        if (sharpFramesRef.current.length > 5) sharpFramesRef.current.length = 5;
      } catch {}
    }

    const nose = lm[NOSE_TIP];
    const li   = irisCenter(lm, LEFT_IRIS);
    const ri   = irisCenter(lm, RIGHT_IRIS);
    const ear  = (getEAR(lm, LEFT_EYE) + getEAR(lm, RIGHT_EYE)) / 2;

    // record iris position relative to nose for independence tracking
    independenceSamples.current.push(li.x - nose.x, li.y - nose.y);
    if (independenceSamples.current.length > 1200) independenceSamples.current.shift();


    // depth score every 6 frames — average a bunch of them to reduce noise
    if (stableFramesRef.current % 6 === 0) {
      depthSamples.current.push(computeDepthScore(lm));
      if (depthSamples.current.length > 100) depthSamples.current.shift();
    }

    earHistoryRef.current.push(ear);
    if (earHistoryRef.current.length > 20) earHistoryRef.current.shift();

    // blink detection — EAR drops below 68% of recent mean to open, recovers above 80% to close.
    // dual threshold prevents noisy partial-closes from counting as blinks.
    if (earHistoryRef.current.length >= 10) {
      const earMeanNow = earHistoryRef.current.reduce((a, b) => a + b, 0) / earHistoryRef.current.length;
      const closeThresh = earMeanNow * 0.68;
      const openThresh  = earMeanNow * 0.80;
      if (ear < closeThresh) {
        blinkInProgressRef.current = true;
      } else if (blinkInProgressRef.current && ear > openThresh) {
        blinkInProgressRef.current = false;
        naturalBlinkCountRef.current++;
      }
    }

    // sample the brightest pixel near each iris — real eyes have tiny glint shifts every frame
    if (video && video.readyState >= 2) {
      try {
        const vw = video.videoWidth, vh = video.videoHeight;
        const tc2 = document.createElement("canvas"); tc2.width = 12; tc2.height = 6;
        const ctx3 = tc2.getContext("2d", { willReadFrequently: true });
        // tiny patch centred on each iris
        const liEye = irisCenter(lm, LEFT_IRIS);
        const riEye = irisCenter(lm, RIGHT_IRIS);
        let specSum = 0;
        for (const { x: ix, y: iy } of [{ x: liEye.x * vw, y: liEye.y * vh }, { x: riEye.x * vw, y: riEye.y * vh }]) {
          ctx3.drawImage(video, Math.max(0, ix - 6), Math.max(0, iy - 3), 12, 6, 0, 0, 12, 6);
          const d = ctx3.getImageData(0, 0, 12, 6).data;
          let brightest = 0;
          for (let i = 0; i < d.length; i += 4) {
            const lum = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
            if (lum > brightest) brightest = lum;
          }
          specSum += brightest;
        }
        eyeSpecSamplesRef.current.push(specSum / 2);
        if (eyeSpecSamplesRef.current.length > 300) eyeSpecSamplesRef.current.shift();
      } catch {}
    }

    // micro-motion: compare 3 skin patches frame-to-frame. real skin always wiggles a bit.
    // take the minimum diff so all 3 patches have to show movement — rules out uniform areas.
    if (video && video.readyState >= 2) {
      try {
        const vw = video.videoWidth, vh = video.videoHeight;
        // left cheek (lm[234]), right cheek (lm[454]), forehead (lm[10])
        const patchCentres = [
          { x: Math.floor(lm[234].x * vw), y: Math.floor(lm[234].y * vh) },
          { x: Math.floor(lm[454].x * vw), y: Math.floor(lm[454].y * vh) },
          { x: Math.floor(lm[10].x  * vw), y: Math.floor(lm[10].y  * vh) },
        ];
        const pw = 10, ph2 = 10;
        const tc = document.createElement("canvas"); tc.width = pw; tc.height = ph2;
        const ctx2 = tc.getContext("2d", { willReadFrequently: true });
        const grays = patchCentres.map(({ x, y }) => {
          const px = Math.max(0, Math.min(x - pw / 2, vw - pw));
          const py2 = Math.max(0, Math.min(y - ph2 / 2, vh - ph2));
          ctx2.drawImage(video, px, py2, pw, ph2, 0, 0, pw, ph2);
          const d = ctx2.getImageData(0, 0, pw, ph2).data;
          const g = [];
          for (let i = 0; i < d.length; i += 4) g.push(0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2]);
          return g;
        });
        if (pixelPatchRef.current && pixelPatchRef.current.length === grays.length) {
          // all patches must show movement — take the minimum
          let minDiff = Infinity;
          for (let p = 0; p < grays.length; p++) {
            let diff = 0;
            for (let i = 0; i < grays[p].length; i++) diff += Math.abs(grays[p][i] - pixelPatchRef.current[p][i]);
            minDiff = Math.min(minDiff, diff / grays[p].length);
          }
          pixelVarianceSamples.current.push(minDiff);
          if (pixelVarianceSamples.current.length > 300) pixelVarianceSamples.current.shift();
        }
        pixelPatchRef.current = grays;

        // rPPG: avg green channel of left cheek, sampled at ~15fps to reduce noise
        const now = performance.now();
        if (now - rppgLastTsRef.current >= 66) { // ~15 Hz
          const { x: cx2, y: cy2 } = patchCentres[0]; // left cheek
          const rpx = Math.max(0, Math.min(cx2 - 8, vw - 16));
          const rpy = Math.max(0, Math.min(cy2 - 8, vh - 16));
          ctx2.drawImage(video, rpx, rpy, 16, 16, 0, 0, 16, 16);
          const rd = ctx2.getImageData(0, 0, 16, 16).data;
          let gSum = 0, gCount = 0;
          for (let i = 0; i < rd.length; i += 4) { gSum += rd[i+1]; gCount++; }
          rppgSamplesRef.current.push(gSum / gCount);
          if (rppgSamplesRef.current.length > 512) rppgSamplesRef.current.shift();
          // update fps estimate from actual sample interval
          if (rppgLastTsRef.current > 0) {
            const dt = (now - rppgLastTsRef.current) / 1000;
            rppgFpsRef.current = Math.round(0.9 * rppgFpsRef.current + 0.1 * (1 / dt));
          }
          rppgLastTsRef.current = now;
        }
      } catch {}
    }

    // only run challenge logic during actual detection phases
    if (ph !== "baseline_camera" && ph !== "challenge_camera") return;

    if (phaseRef.current === "hold") {
      if (stableFramesRef.current < MIN_STABLE_FRAMES) { setStatusSafe("Hold your face steady…"); return; }
      if (!holdStartRef.current) holdStartRef.current = Date.now();
      const elapsed = (Date.now() - holdStartRef.current) / 1000;
      const pct = Math.min((elapsed / HOLD_SECONDS) * 100, 100);
      setProgressSafe(pct);
      if (pct < 33) setStatusSafe("Hold still…"); else if (pct < 66) setStatusSafe("Almost there…"); else setStatusSafe("Keep going…");
      if (elapsed >= HOLD_SECONDS) {
        const lEyeW = eyeWidth(lm, LEFT_EYE), rEyeW = eyeWidth(lm, RIGHT_EYE);
        const earMean = earHistoryRef.current.reduce((a, b) => a + b, 0) / earHistoryRef.current.length;
        // inter-eye span shrinks when the head turns but stays the same if a photo shifts sideways
        const interEyeSpan = Math.abs(lm[LEFT_EYE[0]].x - lm[RIGHT_EYE[3]].x);
        baselineRef.current = {
          ear: earMean,
          noseX: nose.x, noseY: nose.y,
          leftIrisX: li.x, rightIrisX: ri.x, leftIrisY: li.y, rightIrisY: ri.y,
          lEyeW, rEyeW,
          lEyeOuter: { x: lm[LEFT_EYE[0]].x, y: lm[LEFT_EYE[0]].y },
          mouthW: Math.hypot(lm[MOUTH_RIGHT].x - lm[MOUTH_LEFT].x, lm[MOUTH_RIGHT].y - lm[MOUTH_LEFT].y),
          mouthCornerY: (lm[MOUTH_LEFT].y + lm[MOUTH_RIGHT].y) / 2,
          interEyeSpan,
        };
        if (video && lbpCanvasRef.current) {
          lbpCanvasRef.current.width = video.videoWidth; lbpCanvasRef.current.height = video.videoHeight;
          lbpCanvasRef.current.getContext("2d").drawImage(video, 0, 0);
        }
        setProgressSafe(100);
        captureFaceDescriptor();

        // bail early if skin motion is near-zero — almost certainly a photo
        const earlyMotion = computeMotionScore(pixelVarianceSamples.current);
        if (pixelVarianceSamples.current.length >= 20 && earlyMotion < 15) {
          setTimeout(() => { phaseRef.current = "done"; finishAnalysis(50, 50, 50, earlyMotion, 0, 0, 0, 0, 0, 0, null); }, 400);
          return;
        }

        // kick off a DeepFace check in the background — challenges run while we wait for it
        if (video) {
          try {
            const snapCanvas = document.createElement("canvas");
            snapCanvas.width = video.videoWidth; snapCanvas.height = video.videoHeight;
            snapCanvas.getContext("2d").drawImage(video, 0, 0);
            const frameB64 = snapCanvas.toDataURL("image/jpeg", 0.85);
            api.post("/api/verify/deepface", { frame: frameB64 })
              .then(res => { deepfaceResultRef.current = res.data; })
              .catch(() => { deepfaceResultRef.current = null; });
          } catch {}
        }

        setTimeout(() => startNextChallenge(), 400);
      }
      return;
    }

    if (!phaseRef.current.startsWith("challenge_")) return;
    if (challengeLockedRef.current) return;

    // face needs to be steady before we start tracking movement
    if (stableFramesRef.current < 3) { consecutiveRef.current = 0; return; }

    const idx       = currentChallengeRef.current;
    const challenge = challengesRef.current[idx];
    if (!challenge) return;

    const elapsed = Date.now() - (challengeStartRef.current || Date.now());
    const tpct = Math.round(Math.max(0, (CHALLENGE_TIMEOUT - elapsed) / CHALLENGE_TIMEOUT) * 100);
    if (lastTimerPctRef.current !== tpct) { lastTimerPctRef.current = tpct; setTimerPct(tpct); }

    if (elapsed > CHALLENGE_TIMEOUT) { challengeLockedRef.current = true; consecutiveRef.current = 0; recordChallengeResult(false); return; }

    const b = baselineRef.current, data = challengeDataRef.current;

    const sd = data;

    // eye socket center = midpoint of inner + outer corner
    const lSocketX = (lm[33].x + lm[133].x) / 2;
    const lSocketY = (lm[33].y + lm[133].y) / 2;
    const rSocketX = (lm[362].x + lm[263].x) / 2;
    const rSocketY = (lm[362].y + lm[263].y) / 2;
    // iris relative to its own socket — cancels out head tilt and pan
    const lRelH = li.x - lSocketX;
    const lRelV = li.y - lSocketY;
    const rRelH = ri.x - rSocketX;
    const rRelV = ri.y - rSocketY;
    // average both eyes — real gaze is correlated, noise cancels out
    const irisRelH = (lRelH + rRelH) / 2;
    const irisRelV = (lRelV + rRelV) / 2;

    // vertical: iris-to-nose gives a stronger up/down signal than iris-in-socket alone
    // (the socket is wide but shallow so vertical iris movement within it is tiny)
    const irisNoseV = ((li.y + ri.y) / 2) - nose.y;

    // snapshot starting position on the first live frame if we missed it earlier
    if (sd.startGazeH == null) {
      sd.startGazeH      = irisRelH;
      sd.startGazeV      = irisRelV;
      sd.startIrisNoseV  = irisNoseV;
      sd.startNoseX      = nose.x;
      sd.startNoseY      = nose.y;
      sd.startEyeCornerY = lm[LEFT_EYE[0]].y;
      sd.startSpan       = Math.abs(lm[33].x - lm[263].x);
      consecutiveRef.current = 0;
      return;
    }

    // iris-in-socket delta — a flat photo can't move the iris within its printed socket.
    // vertical socket signal is smaller than iris-to-nose but more reliable against head tilt.
    const rawDGazeH = irisRelH - sd.startGazeH;
    const rawDGazeV = irisRelV - sd.startGazeV;

    // smooth out per-frame landmark noise
    if (emaGazeHRef.current === null) { emaGazeHRef.current = rawDGazeH; emaGazeVRef.current = rawDGazeV; }
    emaGazeHRef.current = EMA_ALPHA * rawDGazeH + (1 - EMA_ALPHA) * emaGazeHRef.current;
    emaGazeVRef.current = EMA_ALPHA * rawDGazeV + (1 - EMA_ALPHA) * emaGazeVRef.current;
    const dGazeH = emaGazeHRef.current;
    const dGazeV = emaGazeVRef.current;

    // separate EMA pass for the independence refs — used elsewhere for peak tracking and display
    if (emaIndepHRef.current === null) { emaIndepHRef.current = dGazeH; emaIndepVRef.current = dGazeV; }
    emaIndepHRef.current = EMA_ALPHA * dGazeH + (1 - EMA_ALPHA) * emaIndepHRef.current;
    emaIndepVRef.current = EMA_ALPHA * dGazeV + (1 - EMA_ALPHA) * emaIndepVRef.current;
    const independentH = emaIndepHRef.current;
    const independentV = emaIndepVRef.current;

    // track the highest iris movement seen — used for the independence gate
    if (Math.abs(independentH) > maxIndepHRef.current) maxIndepHRef.current = Math.abs(independentH);

    // iris-in-socket thresholds. real gaze peaks ~0.012–0.04; photo noise is ~0.001–0.003.
    const IND_H  = 0.007;  // horizontal iris-in-socket
    const IND_V  = 0.005;  // vertical iris-in-socket
    const DIAG_MAG = 0.007;

    // iris-to-nose vertical delta — much stronger up/down signal than socket alone
    const dIrisNoseV = irisNoseV - sd.startIrisNoseV;

    const gazeL  = independentH >  IND_H;
    const gazeR  = independentH < -IND_H;
    // up/down: use either iris-in-socket OR iris-to-nose (whichever fires)
    const gazeU  = independentV < -IND_V || dIrisNoseV < -0.012;
    const gazeD  = independentV >  IND_V || dIrisNoseV >  0.012;
    // magnitude so the user doesn't have to hit H and V exactly simultaneously
    const diagMag = Math.hypot(independentH, independentV);
    const diagTL  = diagMag > DIAG_MAG && independentH >  0.003 && independentV < -0.003;
    const diagTR  = diagMag > DIAG_MAG && independentH < -0.003 && independentV < -0.003;
    const diagBL  = diagMag > DIAG_MAG && independentH >  0.003 && independentV >  0.003;
    const diagBR  = diagMag > DIAG_MAG && independentH < -0.003 && independentV >  0.003;

    const liveMotion = computeMotionScore(pixelVarianceSamples.current);
    const { score: liveRppg, bpm: liveBpm, snr: liveSnr } = computeRppgScore(rppgSamplesRef.current, rppgFpsRef.current);
    setDebugGaze({ dH: dGazeH.toFixed(4), dV: dGazeV.toFixed(4), iH: independentH.toFixed(4), iV: independentV.toFixed(4), consec: consecutiveRef.current, peak: maxIndepHRef.current.toFixed(4), motion: liveMotion, rppg: liveRppg, bpm: liveBpm, snr: liveSnr, blinks: naturalBlinkCountRef.current });

    let conditionMet = false;

    switch (challenge.id) {
      case "blink": {
        // 70% of baseline EAR so partial blinks count too. 40–1200ms covers slow deliberate blinks.
        const thresh = b.ear * 0.70;
        if (ear < thresh) {
          if (!data.closedAt) data.closedAt = Date.now();
        } else if (data.closedAt) {
          const dur = Date.now() - data.closedAt; data.closedAt = null;
          if (dur >= 40 && dur <= 1200) conditionMet = true;
        }
        break;
      }
      case "look_left":         { conditionMet = gazeL; break; }
      case "look_right":        { conditionMet = gazeR; break; }
      case "look_up":           { conditionMet = gazeU; break; }
      case "look_down":         { conditionMet = gazeD; break; }
      case "look_top_left":     { conditionMet = diagTL; break; }
      case "look_top_right":    { conditionMet = diagTR; break; }
      case "look_bottom_left":  { conditionMet = diagBL; break; }
      case "look_bottom_right": { conditionMet = diagBR; break; }
      case "nod": {
        const noseDyRelEye = (nose.y - lm[LEFT_EYE[0]].y) - (sd.startNoseY - sd.startEyeCornerY);
        if (!data.nodDown && (nose.y - sd.startNoseY) > 0.04 && noseDyRelEye > 0.008) data.nodDown = true;
        if (data.nodDown && nose.y <= sd.startNoseY + 0.01) conditionMet = true; break;
      }
      case "turn_left": {
        const curSpan = Math.abs(lm[LEFT_EYE[0]].x - lm[RIGHT_EYE[3]].x);
        conditionMet = curSpan < sd.startSpan * 0.82 && (nose.x - sd.startNoseX) > 0.025; break;
      }
      case "turn_right": {
        const curSpan = Math.abs(lm[LEFT_EYE[0]].x - lm[RIGHT_EYE[3]].x);
        conditionMet = curSpan < sd.startSpan * 0.82 && (sd.startNoseX - nose.x) > 0.025; break;
      }
      case "smile": {
        const mw         = Math.hypot(lm[MOUTH_RIGHT].x - lm[MOUTH_LEFT].x, lm[MOUTH_RIGHT].y - lm[MOUTH_LEFT].y);
        const cornerY    = (lm[MOUTH_LEFT].y + lm[MOUTH_RIGHT].y) / 2;
        // mouth must widen AND corners must lift — tilting a photo widens it but corners don't rise
        const widened    = mw > b.mouthW * 1.10;
        const cornerLift = b.mouthCornerY != null && cornerY < b.mouthCornerY - 0.008;
        conditionMet = widened && cornerLift; break;
      }
    }

    // blink has its own open/close timing so it fires immediately
    if (challenge.id === "blink") {
      if (conditionMet) { challengeLockedRef.current = true; gazeWindowRef.current = []; consecutiveRef.current = 0; recordChallengeResult(true); }
    } else {
      const win = gazeWindowRef.current;
      win.push(conditionMet);
      if (win.length > 9) win.shift();
      const hits = win.filter(Boolean).length;
      consecutiveRef.current = hits;
      // 4/9 frames — about 0.3s of sustained gaze at 30fps
      if (win.length >= 9 && hits >= 4) {
        challengeLockedRef.current = true;
        gazeWindowRef.current = [];
        consecutiveRef.current = 0;
        recordChallengeResult(true);
      }
    }
  };

  const startNextChallenge = () => {
    const idx = currentChallengeRef.current;
    if (idx >= challengesRef.current.length) { phaseRef.current = "done"; countdownAndCapture(); return; }
    const c = challengesRef.current[idx];
    setChallengeIndex(idx); setChallengeId(c.id); setChallengeMsg(c.label);
    setHoldProgress(0); setLastResult(null);
    // show the instruction for 3s then switch to camera
    setPhaseSync("challenge_intro");
    setTimeout(() => {
      phaseRef.current = `challenge_${idx}`;
      challengeLockedRef.current = false; challengeStartRef.current = Date.now();
      // snapshot where the face is right now — movement must start from here
      const lmNow = lastLandmarksRef.current;
      challengeDataRef.current = lmNow ? (() => {
        const liNow = irisCenter(lmNow, LEFT_IRIS);
        const riNow = irisCenter(lmNow, RIGHT_IRIS);
        const noseNow = lmNow[NOSE_TIP];
        const lSockX = (lmNow[33].x + lmNow[133].x) / 2;
        const lSockY = (lmNow[33].y + lmNow[133].y) / 2;
        const rSockX = (lmNow[362].x + lmNow[263].x) / 2;
        const rSockY = (lmNow[362].y + lmNow[263].y) / 2;
        return {
          startNoseX:      noseNow.x,
          startNoseY:      noseNow.y,
          startEyeCornerY: lmNow[LEFT_EYE[0]].y,
          startSpan:       Math.abs(lmNow[33].x - lmNow[263].x),
          startGazeH:      ((liNow.x - lSockX) + (riNow.x - rSockX)) / 2,
          startGazeV:      ((liNow.y - lSockY) + (riNow.y - rSockY)) / 2,
          startIrisNoseV:  ((liNow.y + riNow.y) / 2) - noseNow.y,
        };
      })() : {};
      headPathRef.current = [];
      consecutiveRef.current = 0;
      gazeWindowRef.current  = [];
      // fresh EMA each challenge — no carry-over from the previous one
      emaGazeHRef.current  = null;
      emaGazeVRef.current  = null;
      emaIndepHRef.current = null;
      emaIndepVRef.current = null;
      setTimerPct(100); setFaceInOval(false); setStatusMsg("Centre your face in the box");
      setPhaseSync("challenge_camera");
    }, 3000);
  };

  const recordChallengeResult = (didPass) => {
    challengeResults.current.push(didPass);
    const c = challengesRef.current[currentChallengeRef.current];
    setCompletedChallenges(prev => [...prev, { id: c.id, label: c.label, passed: didPass }]);
    currentChallengeRef.current++;
    setChallengeMsg(""); setChallengeId(null);
    setLastResult({ passed: didPass, label: c.label });
    setPhaseSync("challenge_done");
    setTimeout(() => {
      if (currentChallengeRef.current >= challengesRef.current.length) {
        phaseRef.current = "done"; captureAndFinish();
      } else {
        challengeLockedRef.current = false; startNextChallenge();
      }
    }, 1200);
  };

  const captureFaceDescriptor = async () => {
    try {
      if (!videoRef.current || !faceapiLoadedRef.current) return;
      const det = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
        .withFaceLandmarks().withFaceDescriptor();
      if (det) liveDescRef.current = det.descriptor;
    } catch {}
  };

  const countdownAndCapture = () => {
    setPhotoCountdown(3);
    setTimeout(() => setPhotoCountdown(2), 1000);
    setTimeout(() => setPhotoCountdown(1), 2000);
    setTimeout(() => { setPhotoCountdown("smile"); setPhotoFlash(true); setTimeout(() => setPhotoFlash(false), 400); }, 3000);
    setTimeout(() => { setPhotoCountdown(null); captureAndFinish(); }, 3500);
  };

  const captureAndFinish = async () => {
    const savedBox = lastBoxRef.current ? { ...lastBoxRef.current } : null;
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }

    // Draw both canvases from live video BEFORE stream stops — stream still active here
    const video = videoRef.current, lbp = lbpCanvasRef.current;
    let dataUrl = null;
    try {
      if (video && video.readyState >= 2) {
        const snap = canvasRef.current;
        if (snap) {
          snap.width = video.videoWidth; snap.height = video.videoHeight;
          snap.getContext("2d").drawImage(video, 0, 0);
          // add the final frame to the sharp-frame pool then pick the sharpest overall
          if (savedBox) {
            const finalVariance = laplacianVariance(snap, savedBox);
            sharpFramesRef.current.push({ dataUrl: snap.toDataURL("image/jpeg", 0.92), variance: finalVariance });
            sharpFramesRef.current.sort((a, b) => b.variance - a.variance);
          }
          dataUrl = sharpFramesRef.current.length > 0
            ? sharpFramesRef.current[0].dataUrl
            : snap.toDataURL("image/jpeg", 0.92);
        }
        if (lbp && savedBox) { lbp.width = video.videoWidth; lbp.height = video.videoHeight; lbp.getContext("2d").drawImage(video, 0, 0); }
      }
    } catch {}

    // Re-capture face descriptor while stream is still live
    await captureFaceDescriptor();

    // Now safe to stop stream
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    const lbpScore          = lbp && savedBox ? computeLBPScore(lbp, savedBox) : 50;
    const independenceScore = computeIndependenceScore(independenceSamples.current);
    const sortedDepth       = [...depthSamples.current].sort((a, b) => a - b);
    const depthScore        = sortedDepth.length
      ? sortedDepth[Math.floor(sortedDepth.length / 2)]
      : (lastLandmarksRef.current ? computeDepthScore(lastLandmarksRef.current) : 50);
    const motionScore       = computeMotionScore(pixelVarianceSamples.current);
    const eyeSpecScore      = computeEyeSpecScore(eyeSpecSamplesRef.current);
    const peakIndepH        = maxIndepHRef.current;
    const { score: rppgScore, bpm: rppgBpm } = computeRppgScore(rppgSamplesRef.current, rppgFpsRef.current);
    const challengesPassed  = challengeResults.current.filter(Boolean).length;
    const totalChallenges   = challengeResults.current.length;
    finishAnalysis(lbpScore, independenceScore, depthScore, motionScore, eyeSpecScore, peakIndepH, rppgScore, rppgBpm, challengesPassed, totalChallenges, dataUrl);
  };

  const finishAnalysis = async (lbpScore, indepScoreVal, depthScoreVal, motionScoreVal, eyeSpecScoreVal, peakIndepH, rppgScore, rppgBpm, challengesPassed, totalChallenges, dataUrl) => {
    console.log("[Verification] finishAnalysis — appId:", appId, "isReverif:", isReverif);
    setStep(STEP.ANALYSING); cleanup();
    await new Promise(r => setTimeout(r, 4000));

    const texScore      = lbpScore        ?? 50;
    const indepScore    = indepScoreVal   ?? 50;
    const depScore      = depthScoreVal   ?? 50;
    const motionScore   = motionScoreVal  ?? 50;
    const eyeSpecScore  = eyeSpecScoreVal ?? 50;
    const chalScore = Math.round((challengesPassed / Math.max(totalChallenges, 1)) * 100);
    const liveness  = Math.round(chalScore * 0.65 + depScore * 0.35);

    let faceMatch = null;
    try {
      const appRes   = await api.get(`/api/applicant/applications/${appId}`);
      const licPhoto = (appRes.data.documents || []).find(d => d.doc_type === "licence_photo");
      if (licPhoto && liveDescRef.current) {
        // Fetch via authenticated api client so the auth token is sent, then blob → object URL
        const blobRes = await api.get(
          `/api/applicant/applications/${appId}/documents/${licPhoto.id}/file`,
          { responseType: "blob" }
        );
        const objectUrl = URL.createObjectURL(blobRes.data);
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = objectUrl; });
          // Try progressively larger input sizes — printed ID photos are often low-contrast
          let up = null;
          for (const inputSize of [320, 416, 608]) {
            up = await faceapi
              .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold: 0.2 }))
              .withFaceLandmarks().withFaceDescriptor();
            if (up) break;
          }
          // face-api euclidean distance: 0.0 = identical, ~0.5 = same person (professional photo vs webcam), ~0.9+ = different person
          // Scale by 0.9 to account for professional/studio photo vs live webcam variance
          if (up) faceMatch = Math.round((1 - Math.min(faceapi.euclideanDistance(liveDescRef.current, up.descriptor) / 0.9, 1)) * 100);
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      }
    } catch {}

    // Risk-score model
    // Two-layer approach:
    //   1. Hard gates — signals a photo CANNOT fake. Any one failing = fail.
    //   2. Soft score — weighted sum of corroborating signals. Must reach threshold.
    //
    // Hard gates (photo-proof):
    //   - challenges: must pass at least 2/3 using independent-iris-only detection
    //   - iris independence: peak must exceed minimum real-eye movement
    //
    // Soft signals (corroborating, weighted):
    //   blink 30 | micro-motion 30 | eye-specular 25 | rPPG 15

    const naturalBlinkCount = naturalBlinkCountRef.current;
    const { snr: finalSnr } = computeRppgScore(rppgSamplesRef.current, rppgFpsRef.current);
    const rppgSnr = finalSnr ?? 0;

    // Hard gate 1: challenges — must pass ≥ 2 of 3 (or all if only 1-2 run)
    const challengesPass = challengesPassed >= Math.max(1, totalChallenges - 1);

    // Hard gate 2: iris-in-socket peak. Photo noise ~0.002. Real gaze ~0.012+.
    const irisIndepPass = peakIndepH >= 0.012;

    // Hard gate 3: DeepFace anti-spoof result (if backend responded in time).
    // is_real===false → definite spoof. is_real===null → timeout/error → skip gate.
    const dfResult = deepfaceResultRef.current;
    const deepfacePass = dfResult === null || dfResult.is_real !== false;

    // Soft corroborating score 0-100
    const sigBlink   = naturalBlinkCount >= 2 ? 1 : naturalBlinkCount >= 1 ? 0.65 : 0;
    const sigMotion  = Math.min(motionScore / 45, 1);
    const sigDepth   = Math.min(depScore / 60, 1);
    const sigEyeSpec = Math.min(eyeSpecScore / 55, 1);
    const sigRppg    = Math.min(Math.max((rppgSnr - 1) / 1.5, 0), 1);
    // DeepFace score (0–1) contributes to soft score too when available
    const sigDeepface = dfResult?.score != null ? dfResult.score : 0.5;

    const softScore = Math.round(
      sigBlink    * 20 +
      sigMotion   * 20 +
      sigDepth    * 20 +
      sigEyeSpec  * 15 +
      sigRppg     * 10 +
      sigDeepface * 15
    );

    // Overall risk score — used for display and officer review tagging
    const challengeContrib = Math.round((challengesPassed / Math.max(totalChallenges, 1)) * 40);
    const riskScore = Math.min(challengeContrib + Math.round(softScore * 0.6), 100);

    // Outcome:
    //   all hard gates pass AND softScore ≥ 40 → PASS
    //   hard gates pass AND softScore 20-39    → OFFICER REVIEW
    //   any hard gate fails                    → FAIL
    const hardPass    = challengesPass && irisIndepPass && deepfacePass;
    const didPass     = hardPass && softScore >= 40;
    const needsReview = hardPass && !didPass && softScore >= 20;

    // Hard gate: face must match uploaded licence photo (≥40%). Null = photo not found/undetectable → skip gate.
    // 40% accommodates professional/studio photo vs live webcam variance; a different person scores ~10-25%.
    const faceMatchPass = faceMatch === null || faceMatch >= 40;
    const finalPass = didPass && faceMatchPass;

    let reason = "";
    if (!finalPass) {
      if (!deepfacePass) {
        reason = "Anti-spoofing check failed. Please ensure you are a live person — not holding a photo or screen.";
      } else if (!irisIndepPass && peakIndepH < 0.003) {
        reason = "No independent eye movement detected. Please ensure you are a live person — not holding a photo or screen.";
      } else if (!challengesPass) {
        reason = `Only ${challengesPassed} of ${totalChallenges} challenges completed. Follow the gaze instructions carefully when the camera is open.`;
      } else if (!irisIndepPass) {
        reason = "Eye movement check failed. Please move your eyes clearly in the direction shown — not just your head.";
      } else if (!faceMatchPass) {
        reason = "Your face did not match the uploaded photo. Please ensure good lighting and face the camera directly.";
      } else if (needsReview) {
        reason = `Liveness score borderline (${riskScore}/100). A licensing officer will review your identity. You may still continue.`;
      } else {
        reason = `Liveness score too low (${riskScore}/100). Please retry in better lighting with your full face clearly visible and blink naturally.`;
      }
    }

    console.group(`[Verification] ${finalPass ? "✅ PASSED" : "❌ FAILED"} — attempt ${(attempts || 0) + 1}`);
    console.log("Hard gates:",   { challengesPass, irisIndepPass, deepfacePass, faceMatchPass });
    console.log("Soft signals:", { sigBlink: Math.round(sigBlink * 20), sigMotion: Math.round(sigMotion * 20), sigDepth: Math.round(sigDepth * 20), sigEyeSpec: Math.round(sigEyeSpec * 15), sigRppg: Math.round(sigRppg * 10), sigDeepface: Math.round(sigDeepface * 15) });
    console.log("Scores:",       { softScore, riskScore, liveness, depScore, texScore, motionScore, indepScore, peakIndepH: peakIndepH.toFixed(4), naturalBlinkCount, challengesPassed, totalChallenges, faceMatch });
    if (dfResult) console.log("DeepFace:",   dfResult);
    if (!finalPass) console.warn("Fail reason:", reason);
    console.groupEnd();

    if (dataUrl) {
      try {
        const res = await fetch(dataUrl); const blob = await res.blob(); const fd = new FormData();
        fd.append("file", new File([blob], "verification.jpg", { type: "image/jpeg" }));
        fd.append("doc_type", "verification_photo");
        await api.post(`/api/applicant/applications/${appId}/documents`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      } catch {}
    }
    try {
      await api.post(`/api/applicant/applications/${appId}/verify`, {
        passed: finalPass, liveness_score: liveness,
        face_match_score:   faceMatch ?? liveness,
        challenges_used:    challengesRef.current.map(c => c.id).join("+"),
        depth_score: depScore, texture_score: texScore,
        motion_score: motionScore, independence_score: indepScore,
        peak_indep_h: peakIndepH, rppg_score: rppgScore, rppg_bpm: rppgBpm,
        natural_blink_count: naturalBlinkCount,
        challenges_passed:  challengesPassed, challenges_total: totalChallenges,
        risk_score: riskScore, needs_review: needsReview,
        fail_reason: reason,
        sharpness_score: sharpFramesRef.current.length > 0 ? Math.round(sharpFramesRef.current[0].variance) : null,
      });
    } catch (e) {
      console.error("[Verification] /verify POST failed:", e?.response?.status, e?.response?.data || e?.message);
    }

    const deepfaceDisplayScore = dfResult?.score != null ? Math.round(dfResult.score * 100) : null;
    const { bpm: finalBpm } = computeRppgScore(rppgSamplesRef.current, rppgFpsRef.current);
    setScores({ liveness, depth: depScore, faceMatch, challenge: chalScore, motion: Math.round(Math.min(motionScore / 45, 1) * 100), softScore, deepface: deepfaceDisplayScore, bpm: finalBpm });
    setPassed(finalPass); setFailReason(reason); setAttempts(a => a + 1); setStep(STEP.RESULT);
  };

  const retry = () => {
    setScores(null); setPassed(null); setFailReason("");
    setFaceInOval(false); setChallengeMsg(""); setChallengeId(null); setHoldProgress(0);
    setCompletedChallenges([]);
    challengePreviewRef.current = false;
    setLastResult(null); setPhaseSync("baseline_intro");
    setBriefSlide(0); setStep(STEP.BRIEFING);
  };

  const handleContinue = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (isReverif) { navigate(`/applications/${reverifAppId}`, { state: { reverificationDone: true } }); }
    else { navigate("/apply/review"); }
  };
  const onBriefNext  = useCallback(() => setBriefSlide(p => p + 1), []);
  const onBriefBegin = useCallback(() => setStep(STEP.CAMERA), []);
  const inCameraFlow   = [STEP.CAMERA, STEP.ANALYSING].includes(step);
  const canContinue    = step === STEP.RESULT; // always unlocked once results show — fail = officer review


  // Render
  const wrapper = (content) => isReverif ? (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "#f5f6f8" }}>
      <header style={{ background: "white", borderBottom: "1px solid #e9e8e7", position: "sticky", top: 0, zIndex: 40, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px" }}>
          <button onClick={() => navigate(`/applications/${reverifAppId}`)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", padding: 0 }}>
            <img src={coatOfArms} alt="" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
            <div>
              <div style={{ fontSize: "15px", fontWeight: "800", color: "#1b1c1c", letterSpacing: "-0.3px", lineHeight: 1 }}>DLRSJAM</div>
              <div style={{ fontSize: "9px", fontWeight: "600", color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.4 }}>Identity Re-verification</div>
            </div>
          </button>
          <button onClick={() => navigate(`/applications/${reverifAppId}`)} style={{ background: "none", border: "1px solid #e9e8e7", borderRadius: "8px", padding: "6px 14px", fontSize: "13px", color: "#64748b", cursor: "pointer", fontWeight: "500" }}>
            Back to Application
          </button>
        </div>
      </header>
      <main style={{ flex: 1 }}>
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "clamp(16px,4vw,32px) clamp(12px,4vw,24px) 64px" }}>
          {content}
        </div>
      </main>
    </div>
  ) : <StepLayout currentStep={3}>{content}</StepLayout>;

  return wrapper(<>
      <style>{`
        @keyframes spin        { to { transform: rotate(360deg) } }
        @keyframes fadeIn      { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes ovalPulse   { 0%,100% { opacity:1 } 50% { opacity:1 } }
        @keyframes challengeIn { from { opacity:0; transform:translateY(-10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes slideUp     { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        .status-pill { transition: background 0.6s ease, border-color 0.6s ease; }
        .status-dot  { transition: background 0.6s ease; }
        @keyframes checkPop    { from { transform:scale(0.5); opacity:0 } to { transform:scale(1); opacity:1 } }
        @keyframes tutorialBar { from { width:100% } to { width:0% } }
        @keyframes flashGreen  { 0%{opacity:0} 20%{opacity:1} 80%{opacity:1} 100%{opacity:0} }
      `}</style>

      {/* Page header — only shown outside camera flow */}
      {!inCameraFlow && step !== STEP.BRIEFING && (
        <div style={{ marginBottom: "10px" }}>
          <p style={{ fontSize: "12px", fontWeight: "700", color: BRAND.primary, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 3px" }}>Step 4 of 8</p>
          <h1 style={{ fontSize: "20px", fontWeight: "800", color: "#1b1c1c", margin: "0 0 3px", letterSpacing: "-0.4px" }}>Identity Verification</h1>
          <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>A multi-layer live check to confirm your identity.</p>
        </div>
      )}

      {/* Hidden video — always mounted so stream doesn't restart between briefing and camera */}
      <video ref={videoRef} autoPlay muted playsInline style={{ display: "none" }} />

      {/* BRIEFING */}
      {step === STEP.BRIEFING && (
        <BriefingScreen
          briefSlide={briefSlide}
          modelsReady={faceapiLoadedRef.current}
          onSkip={onBriefBegin}
          onNext={onBriefNext}
          onBegin={onBriefBegin}
        />
      )}


      {/* CAMERA */}
      {step === STEP.CAMERA && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", minWidth: 0 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: "11px", fontWeight: "700", color: BRAND.primary, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 1px" }}>Step 4 of 8</p>
              <h1 style={{ fontSize: "clamp(14px,4vw,17px)", fontWeight: "800", color: "#1b1c1c", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Identity Verification</h1>
            </div>
            {/* Challenge progress dots */}
            <div style={{ display: "flex", gap: "5px", flexShrink: 0 }}>
              {challengesRef.current.map((c, i) => {
                const done   = completedChallenges[i];
                const active = i === challengeIndex && !!challengeMsg;
                return (
                  <div key={i} style={{
                    width: "26px", height: "26px", borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "10px", fontWeight: "800", border: "2px solid",
                    background: done ? (done.passed ? "#dcfce7" : "#fee2e2") : active ? "#dbeafe" : "#f8fafc",
                    borderColor: done ? (done.passed ? "#86efac" : "#fca5a5") : active ? "#93c5fd" : "#e2e8f0",
                    color: done ? (done.passed ? "#15803d" : "#dc2626") : active ? "#1d4ed8" : "#9ca3af",
                    animation: done ? "checkPop 0.3s ease" : "none",
                  }}>
                    {done ? (done.passed ? "✓" : "✗") : i + 1}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Camera card — same shell as BriefingScreen card, no flicker */}
          <div style={{
            borderRadius: "16px", overflow: "hidden",
            background: "#0a1628",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
            display: "flex", flexDirection: "column",
            height: "min(calc(100vw * 3/4 + 80px), calc(52svh + 80px))",
            willChange: "transform",
          }}>
            {/* Video area — fills remaining height above the bottom panel */}
            <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            {/* Video — always mounted, never unmounts */}
            <video ref={cameraBoxVideoRef} autoPlay muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", display: "block" }}/>

            {/* ── GUIDE BOX — always mounted, colour changes via CSS transition only ── */}
            <GuideBox borderColor={
              phase === "baseline_camera"  ? (faceInOval && holdProgress > 0 ? "#22c55e" : faceInOval ? "#f59e0b" : distanceState === "too_close" ? "#ef4444" : "rgba(255,255,255,0.6)")
            : phase === "challenge_camera" ? (faceInOval ? "#22c55e" : "rgba(255,255,255,0.75)")
            : "rgba(255,255,255,0)"
            }/>



            {/* ── CHALLENGE INTRO overlay — full screen animation ── */}
            <div style={{ position: "absolute", inset: 0, background: "#0a1628", pointerEvents: phase === "challenge_intro" ? "auto" : "none", opacity: phase === "challenge_intro" ? 1 : 0, transition: "opacity 0.3s ease", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", gap: "12px" }}>
              <p style={{ fontSize: "10px", fontWeight: "700", color: "rgba(255,255,255,0.4)", margin: 0, textTransform: "uppercase", letterSpacing: "0.12em" }}>Challenge {challengeIndex + 1} of {challengesRef.current.length}</p>
              <div style={{ width: "clamp(80px,20vw,120px)", height: "clamp(80px,20vw,120px)", background: "rgba(255,255,255,0.06)", borderRadius: "18px", padding: "8px", flexShrink: 0 }}>
                {challengeId && <ChallengeAnim id={challengeId}/>}
              </div>
              <p style={{ fontSize: "clamp(20px,4.5vw,28px)", fontWeight: "900", color: "white", margin: 0, textAlign: "center", lineHeight: 1.1 }}>{challengeMsg}</p>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", margin: 0, textAlign: "center" }}>Camera opens in a moment</p>
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "3px", background: "rgba(255,255,255,0.08)" }}>
                <div key={`intro-${challengeIndex}`} style={{ height: "100%", background: `linear-gradient(90deg,${BRAND.primary},#22c55e)`, animation: "tutorialBar 3s linear forwards" }}/>
              </div>
            </div>

            {/* ── CHALLENGE DONE overlay — green/red fullscreen ── */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: phase === "challenge_done" && lastResult ? 1 : 0, transition: "opacity 0.2s ease", background: lastResult?.passed ? "rgb(5,40,15)" : "rgb(40,5,5)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: lastResult?.passed ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)", border: `2px solid ${lastResult?.passed ? "#22c55e" : "#ef4444"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {lastResult?.passed
                  ? <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round"><path d="M5 12l5 5L20 7"/></svg>
                  : <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>}
              </div>
              <p style={{ fontSize: "22px", fontWeight: "900", color: "white", margin: 0 }}>{lastResult?.passed ? "Well done!" : "Missed"}</p>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", margin: 0 }}>{lastResult?.label}</p>
            </div>

            {/* ── CAMERA FLASH ── */}
            <div style={{ position: "absolute", inset: 0, zIndex: 21, pointerEvents: "none", background: "white", opacity: photoFlash ? 1 : 0, transition: photoFlash ? "none" : "opacity 0.4s ease" }}/>

            <canvas ref={canvasRef}    style={{ display: "none" }}/>
            <canvas ref={lbpCanvasRef} style={{ display: "none" }}/>
            </div>{/* end video area */}

            {/* ── UNIFIED bottom panel — single fixed slot, content swaps ── */}
            <div style={{ flexShrink: 0, background: "#0a1628", padding: "10px 14px 12px", boxSizing: "border-box" }}>
              {phase === "baseline_camera" && <>
                <p style={{ fontSize: "13px", fontWeight: "700", color: "white", margin: "0 0 8px", textAlign: "center" }}>
                  {distanceState === "too_close" ? "Too close — move back" : distanceState === "far" ? "Face detected — move closer" : distanceState === "none" ? "No face detected" : holdProgress >= 100 ? "Standby…" : holdProgress === 0 ? "Face detected" : "Hold still…"}
                </p>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[0, 25, 50, 75].map((t, i) => <div key={i} style={{ flex: 1, height: "6px", borderRadius: "999px", background: holdProgress > t ? "#22c55e" : "rgba(255,255,255,0.18)", transition: "background 0.6s ease" }}/>)}
                </div>
              </>}
              {phase === "challenge_camera" && <>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <div style={{ width: "32px", height: "32px", flexShrink: 0, background: "rgba(255,255,255,0.08)", borderRadius: "8px", padding: "3px" }}>
                    {challengeId && <ChallengeAnim id={challengeId}/>}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: "9px", fontWeight: "700", color: "rgba(255,255,255,0.45)", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Challenge {challengeIndex + 1} of {challengesRef.current.length}</p>
                    <p style={{ fontSize: "14px", fontWeight: "900", color: "white", margin: 0, lineHeight: 1.1 }}>{challengeMsg}</p>
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: "999px", height: "5px", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: "999px", width: `${timerPct}%`, background: timerPct > 60 ? "#22c55e" : timerPct > 30 ? "#f59e0b" : "#ef4444", transition: "width 0.15s linear, background 0.4s" }}/>
                </div>
              </>}
            </div>
          </div>{/* end card */}

          {/* Completed challenge pills — fixed height so layout never shifts */}
          <div style={{ height: "28px", display: "flex", gap: "6px", alignItems: "center" }}>
            {completedChallenges.map((c, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "4px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "700",
                background: c.passed ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${c.passed ? "#bbf7d0" : "#fecaca"}`,
                color: c.passed ? "#15803d" : "#dc2626",
                animation: "checkPop 0.3s ease",
              }}>
                {c.passed
                  ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"><path d="M5 12l5 5L20 7"/></svg>
                  : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                }
                {c.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ANALYSING */}
      {step === STEP.ANALYSING && (
        <StepCard>
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: `linear-gradient(135deg,${BRAND.primary},#1e40af)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 6px 20px rgba(10,31,68,0.2)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
            </div>
            <p style={{ fontSize: "16px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 4px" }}>Analysing…</p>
            <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>Running multi-layer liveness verification</p>
          </div>
        </StepCard>
      )}

      {/* RESULT */}
      {step === STEP.RESULT && (
        <StepCard>
          <div style={{ animation: "fadeIn 0.5s ease" }}>
            {/* Pass / Fail banner */}
            <div style={{ background: passed ? "linear-gradient(135deg,#f0fdf4,#dcfce7)" : "linear-gradient(135deg,#fef2f2,#fee2e2)", border: `1px solid ${passed ? "#86efac" : "#fca5a5"}`, borderRadius: "12px", padding: "16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: passed ? "linear-gradient(135deg,#22c55e,#16a34a)" : "linear-gradient(135deg,#ef4444,#dc2626)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {passed
                  ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M5 12l5 5L20 7"/></svg>
                  : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                }
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "15px", fontWeight: "800", color: passed ? "#15803d" : "#dc2626", margin: "0 0 2px" }}>
                  {passed ? "Identity Confirmed" : "Could Not Confirm Identity"}
                </p>
                <p style={{ fontSize: "12px", color: passed ? "#16a34a" : "#b91c1c", margin: 0, lineHeight: 1.4 }}>
                  {passed
                    ? "Your identity has been verified successfully."
                    : failReason === "challenge_timeout"   ? "The challenge timed out. Please ensure you follow the on-screen instructions."
                    : failReason === "challenge_failed"    ? "One or more movement challenges were not completed."
                    : failReason === "liveness_too_low"    ? "Our system could not confirm a live person was present."
                    : failReason === "face_match_failed"   ? "Your face did not match the photo on your licence record."
                    : failReason === "lighting"            ? "Poor lighting made it difficult to verify. Try in a brighter area."
                    : "Verification was unsuccessful. You may try again or continue for officer review."
                  }
                </p>
              </div>
            </div>

            {/* Challenge results — pass/fail labels only, no scores */}
            {completedChallenges.length > 0 && (
              <div style={{ marginBottom: "14px" }}>
                <p style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>Challenges</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {completedChallenges.map((c, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: c.passed ? "#f8fffe" : "#fff8f8", border: `1px solid ${c.passed ? "#a7f3d0" : "#fecaca"}`, borderRadius: "8px" }}>
                      <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: c.passed ? "#dcfce7" : "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {c.passed
                          ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round"><path d="M5 12l5 5L20 7"/></svg>
                          : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        }
                      </div>
                      <p style={{ fontSize: "13px", fontWeight: "600", color: "#1b1c1c", margin: 0, flex: 1 }}>{c.label}</p>
                      <span style={{ fontSize: "10px", fontWeight: "700", color: c.passed ? "#15803d" : "#dc2626" }}>{c.passed ? "Passed" : "Failed"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Retry / officer review messaging */}
            {!passed && attempts < MAX_ATTEMPTS && (
              <>
                <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "10px", padding: "10px 14px", marginBottom: "8px" }}>
                  <p style={{ fontSize: "12px", color: "#0369a1", margin: 0, lineHeight: 1.5 }}>
                    You can try again or continue — if verification doesn't pass, a licensing officer will review your identity manually.
                  </p>
                </div>
                <button onClick={retry} style={{ width: "100%", height: "44px", background: `linear-gradient(135deg,${BRAND.primary},#1e40af)`, color: "white", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "700", cursor: "pointer", marginBottom: "8px" }}>
                  Try Again — {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts !== 1 ? "s" : ""} remaining
                </button>
              </>
            )}
            {!passed && attempts >= MAX_ATTEMPTS && (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "12px 14px", marginBottom: "8px" }}>
                <p style={{ fontSize: "13px", fontWeight: "700", color: "#92400e", margin: "0 0 3px" }}>No attempts remaining</p>
                <p style={{ fontSize: "12px", color: "#78350f", margin: 0, lineHeight: 1.4 }}>A licensing officer will review your identity manually. You may still submit your application.</p>
              </div>
            )}
          </div>
        </StepCard>
      )}

      {/* ERROR */}
      {step === STEP.ERROR && (
        <StepCard>
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#dc2626", margin: "0 0 6px" }}>Verification Error</h2>
            <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 16px", lineHeight: 1.5 }}>{error}</p>
            {!appId || error.includes("session") ? (
              <button onClick={() => navigate("/dashboard")} style={{ padding: "10px 24px", background: BRAND.primary, color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>Go to Dashboard</button>
            ) : (
              <button onClick={() => { setBriefSlide(0); setStep(STEP.BRIEFING); }} style={{ padding: "10px 24px", background: BRAND.primary, color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>Try Again</button>
            )}
          </div>
        </StepCard>
      )}

      {!inCameraFlow && (
        <StepNav
          onBack={() => isReverif ? navigate(`/applications/${reverifAppId}`) : navigate("/apply/document-upload")}
          onContinue={handleContinue}
          continueLabel={isReverif ? "Done — Back to Application" : "Continue to Review"}
          continueDisabled={!canContinue}
        />
      )}
    </>);
}
