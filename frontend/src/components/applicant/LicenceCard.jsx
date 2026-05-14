// Animated flip card that renders the applicant's digital licence — guilloche background, photo, fields, and signature on the front; endorsements and metadata on the back.
import coatOfArms from "../../assets/coat-of-arms.png";
import { LICENCE_CLASS_LABELS } from "../../config/constants";

const STYLE_ID = "lc-f-styles";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
    @keyframes lc-pulse {
      0%   { box-shadow: 0 0 0 0 oklch(0.75 0.18 165 / 0.6); }
      70%  { box-shadow: 0 0 0 6px oklch(0.75 0.18 165 / 0); }
      100% { box-shadow: 0 0 0 0 oklch(0.75 0.18 165 / 0); }
    }
    @keyframes lc-holo {
      0%, 100% { transform: translateX(0); opacity: 0.7; }
      50%       { transform: translateX(-20px); opacity: 1; }
    }
  `;
  document.head.appendChild(s);
}

const SW = 40;

const CARD_BG = `
  radial-gradient(700px 400px at 100% 0%, oklch(0.97 0.08 95 / 0.85), transparent 60%),
  radial-gradient(600px 360px at 0% 100%, oklch(0.95 0.06 240 / 0.55), transparent 60%),
  linear-gradient(180deg, oklch(0.985 0.02 95) 0%, oklch(0.97 0.03 100) 100%)`;

function GuillocheF() {
  const rings = Array.from({ length: 16 }, (_, i) => ({ r: 20 + i * 12, op: Math.max(0, 0.6 - i * 0.025) }));
  const waves = Array.from({ length: 18 }, (_, i) => {
    const y = 30 + i * 22;
    const pts = Array.from({ length: 70 }, (_, j) => {
      const x = -10 + j * 11;
      const yy = y + Math.sin(j * 0.3 + i * 0.7) * (6 + i * 0.3) + Math.cos(j * 0.15) * 2;
      return `L ${x} ${yy.toFixed(2)}`;
    }).join(" ");
    return `M -10 ${y} ${pts}`;
  });
  return (
    <svg viewBox="0 0 700 440" preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.6, zIndex: 0 }}>
      <defs>
        <linearGradient id="wF" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%"   stopColor="oklch(0.65 0.18 95)"  stopOpacity="0.5"  />
          <stop offset="50%"  stopColor="oklch(0.55 0.16 145)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="oklch(0.55 0.18 245)" stopOpacity="0.25" />
        </linearGradient>
        <radialGradient id="oF" cx="0.85" cy="0.2" r="0.5">
          <stop offset="0%"   stopColor="oklch(0.85 0.18 95)"  stopOpacity="0.4" />
          <stop offset="100%" stopColor="oklch(0.7 0.16 245)"  stopOpacity="0"   />
        </radialGradient>
      </defs>
      <rect width="700" height="440" fill="url(#oF)" />
      {rings.map(({ r, op }, i) => (
        <circle key={i} cx="595" cy="90" r={r} stroke="url(#wF)" strokeWidth="0.5" fill="none" opacity={op} />
      ))}
      {waves.map((d, i) => <path key={i} d={d} stroke="url(#wF)" strokeWidth="0.5" fill="none" />)}
    </svg>
  );
}

function FlareRays() {
  return (
    <div style={{
      position: "absolute", right: -70, top: -70, width: 260, height: 260, zIndex: 0,
      background: `conic-gradient(from 10deg,
        oklch(0.85 0.18 95 / 0.28) 0deg,   transparent 16deg,
        oklch(0.7 0.16 245 / 0.22) 32deg,  transparent 48deg,
        oklch(0.7 0.16 145 / 0.22) 64deg,  transparent 80deg,
        oklch(0.85 0.18 95 / 0.26) 96deg,  transparent 112deg,
        oklch(0.7 0.16 245 / 0.2) 128deg,  transparent 144deg,
        oklch(0.7 0.16 145 / 0.22) 160deg, transparent 360deg)`,
      borderRadius: "50%", pointerEvents: "none", mixBlendMode: "multiply",
    }} />
  );
}

function HoloBand() {
  return (
    <div style={{
      position: "absolute", top: 0, bottom: 0, right: 0, width: 150, zIndex: 1,
      background: `linear-gradient(118deg,
        transparent 8%, oklch(0.92 0.16 95 / 0.28) 28%,
        oklch(0.9 0.14 145 / 0.24) 48%, oklch(0.9 0.14 245 / 0.24) 68%,
        oklch(0.92 0.16 95 / 0.2) 84%, transparent 96%)`,
      mixBlendMode: "screen", pointerEvents: "none",
      animation: "lc-holo 9s ease-in-out infinite",
    }} />
  );
}

function Stripe({ label }) {
  const dot = {
    width: 6, height: 6, borderRadius: "50%",
    background: "oklch(0.92 0.1 145)",
    boxShadow: "0 0 0 1px oklch(0.32 0.12 150 / 0.6), 0 0 5px oklch(0.7 0.16 145 / 0.6)",
  };
  return (
    <>
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: SW, zIndex: 2,
        background: "linear-gradient(180deg, oklch(0.42 0.14 150) 0%, oklch(0.5 0.16 145) 50%, oklch(0.38 0.14 155) 100%)",
      }} />
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: SW, zIndex: 3,
        background: "repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0 1.5px, transparent 1.5px 14px)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: SW, zIndex: 4,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "space-between", padding: "12px 0", pointerEvents: "none",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={dot} /><div style={dot} /><div style={dot} />
        </div>
        <div style={{
          writingMode: "vertical-rl", transform: "rotate(180deg)",
          fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 8, fontWeight: 600,
          letterSpacing: "0.28em", textTransform: "uppercase",
          color: "oklch(0.96 0.08 130)",
          textShadow: "0 0 6px oklch(0.3 0.12 150 / 0.7)",
        }}>{label}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={dot} /><div style={dot} /><div style={dot} />
        </div>
      </div>
    </>
  );
}

function Field({ label, children, value, mono, tint, bold, style: sx, valSx }) {
  return (
    <div style={{
      border: "1px solid rgba(30,50,120,0.1)",
      borderRadius: 4, padding: "3px 5px 4px",
      background: "rgba(255,255,255,0.18)",
      boxSizing: "border-box", minHeight: 0,
      ...sx,
    }}>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 6.5, letterSpacing: "0.13em", textTransform: "uppercase",
        color: "oklch(0.45 0.1 245)", fontWeight: 500, marginBottom: 2,
      }}>{label}</div>
      {children ?? (
        <div style={{
          fontSize: 10.5, fontWeight: bold ? 700 : 500,
          fontFamily: mono ? "'IBM Plex Mono', monospace" : "'IBM Plex Sans', sans-serif",
          letterSpacing: mono ? "0.04em" : "0.02em", lineHeight: 1.2,
          textTransform: "uppercase",
          color: "oklch(0.22 0.05 250)",
          ...(tint ? {
            background: "linear-gradient(90deg, oklch(0.42 0.14 245), oklch(0.55 0.18 95))",
            WebkitBackgroundClip: "text", backgroundClip: "text",
            WebkitTextFillColor: "transparent", fontWeight: 700,
          } : {}),
          ...valSx,
        }}>{value}</div>
      )}
    </div>
  );
}

function SigSVG({ path = "M2 22 C 10 8, 20 28, 32 14 S 60 6, 78 20 S 110 8, 130 18" }) {
  return (
    <svg viewBox="0 0 140 32" style={{ width: "100%", height: 24 }}>
      <path d={path} stroke="oklch(0.22 0.05 250)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Barcode({ value }) {
  const seed = (value ?? "0000000").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const bars = Array.from({ length: 52 }, (_, i) =>
    ((seed * (i + 7) * 13) % 3 === 0) ? 3 : ((seed * (i + 3) * 7) % 5 === 0) ? 2 : 1
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ display: "flex", gap: "1.5px", height: 26, alignItems: "stretch" }}>
        <div style={{ width: 2, background: "oklch(0.25 0.08 245)", borderRadius: 1 }} />
        <div style={{ width: 1 }} />
        <div style={{ width: 2, background: "oklch(0.25 0.08 245)", borderRadius: 1 }} />
        <div style={{ width: 3 }} />
        {bars.map((w, i) => (
          i % 2 === 0
            ? <div key={i} style={{ width: w, background: "oklch(0.25 0.08 245)", opacity: 0.88 }} />
            : <div key={i} style={{ width: w + 1 }} />
        ))}
        <div style={{ width: 3 }} />
        <div style={{ width: 2, background: "oklch(0.25 0.08 245)", borderRadius: 1 }} />
        <div style={{ width: 1 }} />
        <div style={{ width: 2, background: "oklch(0.25 0.08 245)", borderRadius: 1 }} />
      </div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: "oklch(0.3 0.08 245)", textAlign: "right" }}>
        JM · {value ?? "0000 0000"}
      </div>
    </div>
  );
}

export function LicenceFront({ licence, isExpired, isExpiringSoon }) {
  const expCol = isExpired ? "#dc2626" : isExpiringSoon ? "#d97706" : undefined;
  const PL = SW + 12;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: CARD_BG, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <FlareRays />
      <GuillocheF />
      <HoloBand />
      <Stripe label="Jamaica" />

      {/* Top bar */}
      <div style={{
        position: "relative", zIndex: 5,
        height: 52, paddingLeft: PL, paddingRight: 12,
        display: "flex", alignItems: "center", gap: 10,
        borderBottom: "1px solid oklch(0.42 0.14 245 / 0.22)",
        flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36, flexShrink: 0, borderRadius: "50%",
          background: "rgba(255,255,255,0.7)",
          boxShadow: "0 0 0 1px oklch(0.42 0.14 245 / 0.4)",
          display: "grid", placeItems: "center", overflow: "hidden",
        }}>
          <img src={coatOfArms} alt="" style={{ width: "80%", height: "80%", objectFit: "contain" }} />
        </div>
        <div style={{ lineHeight: 1.1, flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 7.5, letterSpacing: "0.2em", textTransform: "uppercase", color: "oklch(0.42 0.14 245)", fontWeight: 600 }}>
            Government of Jamaica
          </div>
          <div style={{
            fontSize: 15, fontWeight: 700, letterSpacing: "0.05em", marginTop: 1,
            textTransform: "uppercase",
            background: "linear-gradient(90deg, oklch(0.32 0.14 245), oklch(0.55 0.18 95))",
            WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>DRIVER'S LICENCE</div>
        </div>
        {isExpired ? (
          <div style={{
            flexShrink: 0, fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase",
            background: "#dc2626", color: "white", padding: "3px 8px", borderRadius: 999,
          }}>EXPIRED</div>
        ) : (
          <div style={{
            flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5,
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 8,
            letterSpacing: "0.1em", textTransform: "uppercase",
            background: "rgba(255,255,255,0.7)",
            border: "1px solid oklch(0.55 0.16 95 / 0.5)",
            padding: "3px 8px", borderRadius: 999, color: "oklch(0.42 0.14 245)",
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
              background: isExpiringSoon ? "#d97706" : "oklch(0.75 0.18 165)",
              animation: "lc-pulse 1.8s ease-out infinite",
            }} />
            {isExpiringSoon ? "Expiring" : "Verified"}
          </div>
        )}
      </div>

      {/* main content grid */}
      <div style={{
        position: "relative", zIndex: 5,
        paddingLeft: PL, paddingRight: 10,
        paddingTop: 7, paddingBottom: 5,
        display: "grid",
        gridTemplateColumns: "60% 40%",
        gridTemplateRows: "auto auto auto auto 1fr 44px",
        columnGap: 8, rowGap: 4,
        height: "calc(100% - 52px)", boxSizing: "border-box",
      }}>
        <div style={{ gridColumn: 1, display: "grid", gridTemplateColumns: "52px 1fr", gap: 4 }}>
          <Field label="Class" value={licence?.licence_class ?? "—"} tint />
          <Field label="TRN" value={licence?.trn ?? "—"} mono bold />
        </div>
        <div style={{ gridColumn: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
          <Field label="Date Issued" value={licence?.issue_date ?? "—"} mono />
          <Field label="Collectorate" value={licence?.collectorate ?? "—"} />
        </div>
        <div style={{ gridColumn: 1, display: "grid", gridTemplateColumns: "1fr 1fr 26px", gap: 4 }}>
          <Field label="Expiry Date" value={licence?.expiry_date ?? "—"} mono
            valSx={expCol ? { color: expCol, fontWeight: 700 } : undefined} />
          <Field label="Birth Date" value={licence?.date_of_birth ?? "—"} mono />
          <Field label="Sex" value={licence?.sex ?? "—"} mono />
        </div>
        <Field label="Name" style={{ gridColumn: 1, paddingTop: 5, paddingBottom: 6 }}>
          <div style={{ lineHeight: 1.35 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "oklch(0.18 0.05 250)", textTransform: "uppercase" }}>
              {licence?.lastname?.toUpperCase() || "—"}
            </div>
            {(licence?.firstname || licence?.middlename) && (
              <div style={{ fontSize: 11, fontWeight: 400, color: "oklch(0.35 0.06 250)", textTransform: "uppercase" }}>
                {[licence.firstname, licence.middlename].filter(Boolean).map(n => n.toUpperCase()).join(" ")}
              </div>
            )}
          </div>
        </Field>
        <Field label="Address" style={{ gridColumn: 1, gridRow: "5 / 7", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 9.5, fontWeight: 400, lineHeight: 1.45, color: "oklch(0.22 0.05 250)", textTransform: "uppercase", overflow: "hidden" }}>
            {licence?.address_line1 && <div>{licence.address_line1}</div>}
            {licence?.address_line2 && <div>{licence.address_line2}</div>}
            {licence?.parish        && <div>{licence.parish}</div>}
            {!licence?.address_line1 && !licence?.address_line2 && !licence?.parish &&
              <span style={{ fontStyle: "italic", opacity: 0.4, textTransform: "none" }}>—</span>}
          </div>
        </Field>
        <div style={{ gridColumn: 2, gridRow: "1 / 6", borderRadius: 8, overflow: "hidden", position: "relative" }}>
          {licence?.photo_url ? (
            <img src={licence.photo_url} alt="Photo" style={{
              width: "100%", height: "120%",
              objectFit: "cover", objectPosition: "center 20%",
              display: "block", mixBlendMode: "multiply",
              marginTop: "-15%",
            }} />
          ) : (
            <div style={{
              width: "100%", height: "100%", borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 7,
              color: "oklch(0.65 0.06 248)", textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.5,
            }}>Photo</div>
          )}
        </div>
        <div style={{ gridColumn: 2, gridRow: "5 / 7", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          {licence?.signature_image ? (
            <img src={licence.signature_image} alt="Signature"
              style={{ width: "100%", height: 26, objectFit: "contain", objectPosition: "center", display: "block", mixBlendMode: "multiply", filter: "brightness(0) saturate(100%)" }} />
          ) : (
            <SigSVG />
          )}
          <div style={{ borderTop: "1.5px solid oklch(0.35 0.08 245 / 0.6)", marginTop: 2, marginBottom: 3 }} />
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 6, letterSpacing: "0.1em", textTransform: "uppercase", color: "oklch(0.5 0.1 245)", textAlign: "center" }}>
            Signature of Licensee
          </div>
        </div>
      </div>
    </div>
  );
}

export function LicenceBack({ licence }) {
  const endorsements = licence?.judicial_endorsements ?? [];
  const PL = SW + 12;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: CARD_BG, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <FlareRays />
      <GuillocheF />
      <HoloBand />
      <Stripe label="Reverse" />

      <div style={{
        position: "relative", zIndex: 1,
        paddingLeft: PL, paddingRight: 14,
        paddingTop: 6, paddingBottom: 6,
        background: "linear-gradient(90deg, oklch(0.42 0.14 150 / 0.08) 0%, oklch(0.97 0.04 240 / 0.6) 30%, oklch(0.985 0.02 95 / 0.55) 100%)",
        borderBottom: "1px solid oklch(0.42 0.14 245 / 0.15)",
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 7.5,
        letterSpacing: "0.14em", textTransform: "uppercase",
        color: "oklch(0.38 0.1 245)", textAlign: "center",
      }}>
        Must be carried when operating a motor vehicle or applying for renewal
      </div>

      <div style={{
        position: "relative", zIndex: 3,
        paddingLeft: PL, paddingRight: 10,
        paddingTop: 8, paddingBottom: 8,
        display: "flex", flexDirection: "column", gap: 6,
        height: "calc(100% - 33px)", boxSizing: "border-box",
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 5 }}>
          <Field label="Licence to Drive"
            value={LICENCE_CLASS_LABELS[licence?.licence_class] ?? licence?.licence_class ?? "—"}
            valSx={{ fontSize: 10, lineHeight: 1.3 }} />
          <Field label="Original Date of Issue"
            value={licence?.first_issue_date ?? licence?.issue_date ?? "—"} mono />
        </div>

        <div style={{
          border: "1px solid rgba(30,50,120,0.12)", borderRadius: 6,
          overflow: "hidden", background: "rgba(255,255,255,0.18)", flex: 1,
          display: "flex", flexDirection: "column", position: "relative",
        }}>
          {licence?.photo_url && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 0,
              display: "flex", alignItems: "center", justifyContent: "flex-end",
              pointerEvents: "none", overflow: "hidden",
            }}>
              <img src={licence.photo_url} alt="" style={{
                height: "80%", width: "auto",
                objectFit: "cover", objectPosition: "center top",
                opacity: 0.12, mixBlendMode: "multiply",
                filter: "grayscale(60%)",
              }} />
            </div>
          )}
          <div style={{
            position: "relative", zIndex: 1,
            display: "grid", gridTemplateColumns: "74px 1fr 56px",
            background: "oklch(0.94 0.09 95 / 0.5)",
            borderBottom: "1px solid rgba(30,50,120,0.12)",
            flexShrink: 0,
          }}>
            {["Date", "Judicial Endorsements", "Status"].map((h, i) => (
              <div key={i} style={{
                padding: "4px 6px",
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 7,
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: "oklch(0.42 0.14 245)",
                borderRight: i < 2 ? "1px solid rgba(30,50,120,0.1)" : "none",
              }}>{h}</div>
            ))}
          </div>
          <div style={{ position: "relative", zIndex: 1, flex: 1 }}>
            {endorsements.length > 0 ? endorsements.map((e, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "74px 1fr 56px",
                alignItems: "center", minHeight: 24,
                borderBottom: i < endorsements.length - 1 ? "1px dashed rgba(30,50,120,0.08)" : "none",
              }}>
                <div style={{ padding: "2px 6px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: "oklch(0.45 0.1 245)", borderRight: "1px solid rgba(30,50,120,0.08)" }}>{e.date}</div>
                <div style={{ padding: "2px 6px", fontSize: 9.5, color: "oklch(0.22 0.05 250)", borderRight: "1px solid rgba(30,50,120,0.08)", textTransform: "uppercase" }}>{e.description}</div>
                <div style={{ padding: "2px 6px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, textTransform: "uppercase", color: "oklch(0.5 0.18 95)" }}>{e.status ?? "Active"}</div>
              </div>
            )) : (
              <div style={{ display: "grid", gridTemplateColumns: "74px 1fr 56px", minHeight: 24, alignItems: "center" }}>
                <div style={{ padding: "2px 6px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: "oklch(0.45 0.1 245)" }}>—</div>
                <div style={{ padding: "2px 6px", fontSize: 9.5, color: "rgba(7,24,47,0.4)", fontStyle: "italic" }}>No further entries</div>
                <div />
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "72px 1fr 72px auto", gap: 5, alignItems: "end" }}>
          <Field label="Control №" value={licence?.control_number ?? "—"} mono
            style={{ background: "transparent", border: "1px solid rgba(30,50,120,0.1)" }} />
          <Field label="TRN" value={licence?.trn ?? "—"} mono bold
            style={{ background: "transparent", border: "1px solid rgba(30,50,120,0.1)" }} />
          <Field label="Nationality" value={licence?.nationality ?? "—"}
            style={{ background: "transparent", border: "1px solid rgba(30,50,120,0.1)" }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
            <SigSVG path="M2 22 C 14 6, 30 30, 46 14 S 78 6, 96 22 S 122 10, 138 18" />
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 6.5, letterSpacing: "0.09em", textTransform: "uppercase", color: "oklch(0.45 0.1 245)", whiteSpace: "nowrap" }}>
              Commissioner · Tax Admin.
            </div>
          </div>
        </div>

        <Barcode value={licence?.control_number ?? licence?.trn} />
      </div>
    </div>
  );
}

// Print versions — all colours are fully opaque hex/rgb (no oklch, no rgba transparency)
// so browser print renderer doesn't strip them
const PRINT_CARD_BG = "linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 40%, #f5f0e8 100%)";
const P_FIELD_BG    = "#ffffff";
const P_FIELD_BORD  = "#c7d0e8";
const P_LABEL_COL   = "#3b5cb8";
const P_VAL_COL     = "#1e2a4a";
const P_STRIPE_BG   = "linear-gradient(180deg, #15803d 0%, #16a34a 50%, #166534 100%)";
const P_HEADER_BG   = "#dbeafe";
const P_BANNER_BG   = "#dbeafe";
const P_TABLE_HEAD  = "#fef9c3";
const P_BARCODE     = "#1e3a8a";

function StripePrint({ label }) {
  const dot = { width: 6, height: 6, borderRadius: "50%", background: "#4ade80" };
  return (
    <>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: SW, zIndex: 2, background: P_STRIPE_BG }} />
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: SW, zIndex: 4, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "12px 0" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}><div style={dot} /><div style={dot} /><div style={dot} /></div>
        <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 8, fontWeight: 600, letterSpacing: "0.28em", textTransform: "uppercase", color: "#dcfce7" }}>{label}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}><div style={dot} /><div style={dot} /><div style={dot} /></div>
      </div>
    </>
  );
}

function FieldPrint({ label, children, value, mono, tint, bold, style: sx, valSx }) {
  return (
    <div style={{ border: `1px solid ${P_FIELD_BORD}`, borderRadius: 4, padding: "3px 5px 4px", background: P_FIELD_BG, boxSizing: "border-box", minHeight: 0, ...sx }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 6.5, letterSpacing: "0.13em", textTransform: "uppercase", color: P_LABEL_COL, fontWeight: 500, marginBottom: 2 }}>{label}</div>
      {children ?? (
        <div style={{ fontSize: 10.5, fontWeight: bold ? 700 : 500, fontFamily: mono ? "'IBM Plex Mono', monospace" : "'IBM Plex Sans', sans-serif", letterSpacing: mono ? "0.04em" : "0.02em", lineHeight: 1.2, textTransform: "uppercase", color: tint ? "#1e40af" : P_VAL_COL, fontWeight: tint ? 700 : (bold ? 700 : 500), ...valSx }}>{value}</div>
      )}
    </div>
  );
}

function GuillocheP() {
  const waves = Array.from({ length: 14 }, (_, i) => {
    const y = 20 + i * 28;
    const pts = Array.from({ length: 60 }, (_, j) => {
      const x = -10 + j * 12;
      const yy = y + Math.sin(j * 0.3 + i * 0.7) * (5 + i * 0.3);
      return `L ${x} ${yy.toFixed(1)}`;
    }).join(" ");
    return `M -10 ${y} ${pts}`;
  });
  return (
    <svg viewBox="0 0 700 440" preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.18, zIndex: 0 }}>
      {waves.map((d, i) => <path key={i} d={d} stroke="#3b5cb8" strokeWidth="0.6" fill="none" />)}
      {Array.from({ length: 14 }, (_, i) => (
        <circle key={i} cx="595" cy="90" r={20 + i * 12} stroke="#3b5cb8" strokeWidth="0.5" fill="none" opacity={Math.max(0, 0.7 - i * 0.04)} />
      ))}
    </svg>
  );
}

export function LicenceFrontPrint({ licence, isExpired, isExpiringSoon }) {
  const expCol = isExpired ? "#dc2626" : isExpiringSoon ? "#d97706" : undefined;
  const PL = SW + 12;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: PRINT_CARD_BG, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <GuillocheP />
      <StripePrint label="Jamaica" />
      <div style={{ position: "relative", zIndex: 5, height: 52, paddingLeft: PL, paddingRight: 12, display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${P_FIELD_BORD}`, flexShrink: 0, background: P_HEADER_BG }}>
        <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: "50%", background: "#ffffff", border: `1px solid ${P_FIELD_BORD}`, display: "grid", placeItems: "center", overflow: "hidden" }}>
          <img src={coatOfArms} alt="" style={{ width: "80%", height: "80%", objectFit: "contain" }} />
        </div>
        <div style={{ lineHeight: 1.1, flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 7.5, letterSpacing: "0.2em", textTransform: "uppercase", color: "#1d4ed8", fontWeight: 600 }}>Government of Jamaica</div>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.05em", marginTop: 1, textTransform: "uppercase", color: "#1e3a8a" }}>DRIVER'S LICENCE</div>
        </div>
        {isExpired
          ? <div style={{ flexShrink: 0, fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: "#dc2626", color: "#ffffff", padding: "3px 8px", borderRadius: 999 }}>EXPIRED</div>
          : <div style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", background: "#ffffff", border: `1px solid ${P_FIELD_BORD}`, padding: "3px 8px", borderRadius: 999, color: "#1d4ed8" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, background: isExpiringSoon ? "#d97706" : "#16a34a" }} />
              {isExpiringSoon ? "Expiring" : "Verified"}
            </div>
        }
      </div>
      <div style={{ position: "relative", zIndex: 5, paddingLeft: PL, paddingRight: 10, paddingTop: 7, paddingBottom: 5, display: "grid", gridTemplateColumns: "60% 40%", gridTemplateRows: "auto auto auto auto 1fr 44px", columnGap: 8, rowGap: 4, height: "calc(100% - 52px)", boxSizing: "border-box" }}>
        <div style={{ gridColumn: 1, display: "grid", gridTemplateColumns: "52px 1fr", gap: 4 }}>
          <FieldPrint label="Class" value={licence?.licence_class ?? "—"} tint />
          <FieldPrint label="TRN" value={licence?.trn ?? "—"} mono bold />
        </div>
        <div style={{ gridColumn: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
          <FieldPrint label="Date Issued" value={licence?.issue_date ?? "—"} mono />
          <FieldPrint label="Collectorate" value={licence?.collectorate ?? "—"} />
        </div>
        <div style={{ gridColumn: 1, display: "grid", gridTemplateColumns: "1fr 1fr 26px", gap: 4 }}>
          <FieldPrint label="Expiry Date" value={licence?.expiry_date ?? "—"} mono valSx={expCol ? { color: expCol, fontWeight: 700 } : undefined} />
          <FieldPrint label="Birth Date" value={licence?.date_of_birth ?? "—"} mono />
          <FieldPrint label="Sex" value={licence?.sex ?? "—"} mono />
        </div>
        <FieldPrint label="Name" style={{ gridColumn: 1, paddingTop: 5, paddingBottom: 6 }}>
          <div style={{ lineHeight: 1.35 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", textTransform: "uppercase" }}>{licence?.lastname?.toUpperCase() || "—"}</div>
            {(licence?.firstname || licence?.middlename) && <div style={{ fontSize: 11, fontWeight: 400, color: "#374151", textTransform: "uppercase" }}>{[licence.firstname, licence.middlename].filter(Boolean).map(n => n.toUpperCase()).join(" ")}</div>}
          </div>
        </FieldPrint>
        <FieldPrint label="Address" style={{ gridColumn: 1, gridRow: "5 / 7", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 9.5, lineHeight: 1.45, color: P_VAL_COL, textTransform: "uppercase", overflow: "hidden" }}>
            {licence?.address_line1 && <div>{licence.address_line1}</div>}
            {licence?.address_line2 && <div>{licence.address_line2}</div>}
            {licence?.parish && <div>{licence.parish}</div>}
          </div>
        </FieldPrint>
        <div style={{ gridColumn: 2, gridRow: "1 / 6", borderRadius: 8, overflow: "hidden", position: "relative", background: "#e2e8f0" }}>
          {licence?.photo_url
            ? <img src={licence.photo_url} alt="Photo" style={{ width: "100%", height: "120%", objectFit: "cover", objectPosition: "center 20%", display: "block", marginTop: "-15%" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontSize: 7, textTransform: "uppercase" }}>Photo</div>
          }
        </div>
        <div style={{ gridColumn: 2, gridRow: "5 / 7", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          {licence?.signature_image
            ? <img src={licence.signature_image} alt="Signature" style={{ width: "100%", height: 26, objectFit: "contain", display: "block", filter: "brightness(0)" }} />
            : <svg viewBox="0 0 140 32" style={{ width: "100%", height: 24 }}><path d="M2 22 C 10 8, 20 28, 32 14 S 60 6, 78 20 S 110 8, 130 18" stroke={P_VAL_COL} strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
          }
          <div style={{ borderTop: `1.5px solid ${P_LABEL_COL}`, marginTop: 2, marginBottom: 3 }} />
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 6, letterSpacing: "0.1em", textTransform: "uppercase", color: P_LABEL_COL, textAlign: "center" }}>Signature of Licensee</div>
        </div>
      </div>
    </div>
  );
}

export function LicenceBackPrint({ licence }) {
  const endorsements = licence?.judicial_endorsements ?? [];
  const PL = SW + 12;
  const val = licence?.control_number ?? licence?.trn;
  const seed = (val ?? "0000000").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const bars = Array.from({ length: 52 }, (_, i) => ((seed*(i+7)*13)%3===0)?3:((seed*(i+3)*7)%5===0)?2:1);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: PRINT_CARD_BG, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <GuillocheP />
      <StripePrint label="Reverse" />
      {/* Photo watermark */}
      {licence?.photo_url && (
        <div style={{ position: "absolute", inset: 0, zIndex: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", overflow: "hidden", pointerEvents: "none" }}>
          <img src={licence.photo_url} alt="" style={{ height: "80%", width: "auto", objectFit: "cover", objectPosition: "center top", opacity: 0.12, filter: "grayscale(60%)" }} />
        </div>
      )}
      <div style={{ position: "relative", zIndex: 2, paddingLeft: PL, paddingRight: 14, paddingTop: 6, paddingBottom: 6, background: P_BANNER_BG, borderBottom: `1px solid ${P_FIELD_BORD}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 7.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "#1d4ed8", textAlign: "center" }}>
        Must be carried when operating a motor vehicle or applying for renewal
      </div>
      <div style={{ position: "relative", zIndex: 3, paddingLeft: PL, paddingRight: 10, paddingTop: 8, paddingBottom: 8, display: "flex", flexDirection: "column", gap: 6, height: "calc(100% - 33px)", boxSizing: "border-box" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 5 }}>
          <FieldPrint label="Licence to Drive" value={LICENCE_CLASS_LABELS[licence?.licence_class] ?? licence?.licence_class ?? "—"} valSx={{ fontSize: 10, lineHeight: 1.3 }} />
          <FieldPrint label="Original Date of Issue" value={licence?.first_issue_date ?? licence?.issue_date ?? "—"} mono />
        </div>
        <div style={{ border: `1px solid ${P_FIELD_BORD}`, borderRadius: 6, overflow: "hidden", background: "#ffffff", flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "grid", gridTemplateColumns: "74px 1fr 56px", background: P_TABLE_HEAD, borderBottom: `1px solid ${P_FIELD_BORD}` }}>
            {["Date", "Judicial Endorsements", "Status"].map((h, i) => (
              <div key={i} style={{ padding: "4px 6px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, letterSpacing: "0.14em", textTransform: "uppercase", color: "#1d4ed8", borderRight: i < 2 ? `1px solid ${P_FIELD_BORD}` : "none" }}>{h}</div>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            {endorsements.length > 0 ? endorsements.map((e, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "74px 1fr 56px", alignItems: "center", minHeight: 24, borderBottom: i < endorsements.length - 1 ? `1px dashed ${P_FIELD_BORD}` : "none" }}>
                <div style={{ padding: "2px 6px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: P_LABEL_COL, borderRight: `1px solid ${P_FIELD_BORD}` }}>{e.date}</div>
                <div style={{ padding: "2px 6px", fontSize: 9.5, color: P_VAL_COL, borderRight: `1px solid ${P_FIELD_BORD}`, textTransform: "uppercase" }}>{e.description}</div>
                <div style={{ padding: "2px 6px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, textTransform: "uppercase", color: "#b45309" }}>{e.status ?? "Active"}</div>
              </div>
            )) : (
              <div style={{ display: "grid", gridTemplateColumns: "74px 1fr 56px", minHeight: 24, alignItems: "center" }}>
                <div style={{ padding: "2px 6px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: P_LABEL_COL }}>—</div>
                <div style={{ padding: "2px 6px", fontSize: 9.5, color: "#94a3b8", fontStyle: "italic" }}>No further entries</div>
                <div />
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "72px 1fr 72px auto", gap: 5, alignItems: "end" }}>
          <FieldPrint label="Control №" value={licence?.control_number ?? "—"} mono style={{ background: "#ffffff", border: `1px solid ${P_FIELD_BORD}` }} />
          <FieldPrint label="TRN" value={licence?.trn ?? "—"} mono bold style={{ background: "#ffffff", border: `1px solid ${P_FIELD_BORD}` }} />
          <FieldPrint label="Nationality" value={licence?.nationality ?? "—"} style={{ background: "#ffffff", border: `1px solid ${P_FIELD_BORD}` }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
            <svg viewBox="0 0 140 32" style={{ width: "100%", height: 24 }}><path d="M2 22 C 14 6, 30 30, 46 14 S 78 6, 96 22 S 122 10, 138 18" stroke={P_VAL_COL} strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 6.5, letterSpacing: "0.09em", textTransform: "uppercase", color: P_LABEL_COL, whiteSpace: "nowrap" }}>Commissioner · Tax Admin.</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", gap: "1.5px", height: 26, alignItems: "stretch" }}>
            <div style={{ width: 2, background: P_BARCODE, borderRadius: 1 }} /><div style={{ width: 1 }} /><div style={{ width: 2, background: P_BARCODE, borderRadius: 1 }} /><div style={{ width: 3 }} />
            {bars.map((w, i) => i%2===0 ? <div key={i} style={{ width: w, background: P_BARCODE }} /> : <div key={i} style={{ width: w+1 }} />)}
            <div style={{ width: 3 }} /><div style={{ width: 2, background: P_BARCODE, borderRadius: 1 }} /><div style={{ width: 1 }} /><div style={{ width: 2, background: P_BARCODE, borderRadius: 1 }} />
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: P_BARCODE, textAlign: "right" }}>JM · {val ?? "0000 0000"}</div>
        </div>
      </div>
    </div>
  );
}

export default function LicenceCard({ licence, isFlipped, isExpired, isExpiringSoon }) {
  const shadow = `
    0 1px 0 rgba(255,255,255,0.6) inset,
    0 30px 60px -25px rgba(7,24,47,0.32),
    0 12px 26px -14px rgba(7,24,47,0.22),
    0 0 0 1px rgba(7,24,47,0.06)`;

  return (
    <div style={{ width: "100%", aspectRatio: "1.586 / 1", perspective: "1200px" }}>
      <div style={{
        position: "relative", width: "100%", height: "100%",
        transformStyle: "preserve-3d",
        transition: "transform 0.65s cubic-bezier(0.45, 0.05, 0.55, 0.95)",
        transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
      }}>
        <div style={{
          position: "absolute", inset: 0, borderRadius: 18, overflow: "hidden",
          backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
          boxShadow: shadow,
        }}>
          <LicenceFront licence={licence} isExpired={isExpired} isExpiringSoon={isExpiringSoon} />
        </div>
        <div style={{
          position: "absolute", inset: 0, borderRadius: 18, overflow: "hidden",
          backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          boxShadow: shadow,
        }}>
          <LicenceBack licence={licence} />
        </div>
      </div>
    </div>
  );
}
