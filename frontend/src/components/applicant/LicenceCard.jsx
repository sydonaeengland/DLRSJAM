// src/components/applicant/LicenceCard.jsx
import coatOfArms from "../../assets/coat-of-arms.png";
import { LICENCE_CLASS_LABELS } from "../../config/constants";

export default function LicenceCard({ licence, isFlipped, isExpired, isExpiringSoon }) {
  const cardBase = {
    borderRadius: "12px",
    width: "100%",
    aspectRatio: "1.586 / 1",
    boxSizing: "border-box",
    fontFamily: "Arial, sans-serif",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
  };

  const bg = {
    position: "absolute", inset: 0,
    background: "linear-gradient(135deg, #e8f5e0 0%, #d4edda 30%, #c8e6c9 60%, #b8dcc8 100%)",
  };

  const holographic = {
    position: "absolute", inset: 0, opacity: 0.18,
    backgroundImage: `
      repeating-linear-gradient(45deg, #4fc3f7 0, #4fc3f7 1px, transparent 0, transparent 8px),
      repeating-linear-gradient(-45deg, #81c784 0, #81c784 1px, transparent 0, transparent 8px)
    `,
  };

  const blue = "#003087";
  const borderBlue = "#1565c0";

  if (!isFlipped) {
    return (
      <div style={cardBase}>
        <div style={bg} />
        <div style={holographic} />

        {/* Status tint overlay for expired */}
        {isExpired && <div style={{ position: "absolute", inset: 0, background: "rgba(220,38,38,0.06)" }} />}

        <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", padding: "10px 12px 8px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "6px", borderBottom: `2px solid ${borderBlue}`, paddingBottom: "5px" }}>
            <img src={coatOfArms} alt="" style={{ width: "28px", height: "28px", objectFit: "contain", flexShrink: 0 }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: blue, letterSpacing: "0.5px" }}>GOVERNMENT OF JAMAICA</div>
              <div style={{ fontSize: "10px", fontWeight: "700", color: blue }}>DRIVER'S LICENCE</div>
            </div>
          </div>

          {/* Main body */}
          <div style={{ display: "flex", flex: 1, gap: "8px" }}>

            {/* Left — fields grid */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>

              {/* Row 1 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px" }}>
                <Field label="CLASS" value={licence?.licence_class ?? "—"} blue={blue} borderBlue={borderBlue} />
                <Field label="TRN" value={licence?.trn ?? "—"} blue={blue} borderBlue={borderBlue} />
              </div>

              {/* Row 2 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px" }}>
                <Field label="DATE ISSUED" value={licence?.issue_date ?? "—"} blue={blue} borderBlue={borderBlue} />
                <Field label="COLLECTORATE" value={licence?.collectorate ?? "—"} blue={blue} borderBlue={borderBlue} small />
              </div>

              {/* Row 3 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 40px", gap: "3px" }}>
                <Field label="EXPIRY DATE" value={licence?.expiry_date ?? "—"} blue={blue} borderBlue={borderBlue}
                  valueStyle={{ color: isExpired ? "#dc2626" : isExpiringSoon ? "#d97706" : undefined, fontWeight: "700" }} />
                <Field label="BIRTH DATE" value={licence?.date_of_birth ?? "—"} blue={blue} borderBlue={borderBlue} />
                <Field label="SEX" value={licence?.sex ?? "—"} blue={blue} borderBlue={borderBlue} />
              </div>

              {/* Name */}
              <div style={{ border: `1px solid ${borderBlue}`, padding: "2px 4px", background: "rgba(255,255,255,0.4)", borderRadius: "2px" }}>
                <div style={{ fontSize: "7px", fontWeight: "700", color: blue, textTransform: "uppercase" }}>Name</div>
                <div style={{ fontSize: "11px", fontWeight: "800", color: "#111", lineHeight: 1.2 }}>
                  {licence?.firstname?.toUpperCase()}<br />{licence?.lastname?.toUpperCase()}
                </div>
              </div>

              {/* Address */}
              <div style={{ border: `1px solid ${borderBlue}`, padding: "2px 4px", background: "rgba(255,255,255,0.4)", borderRadius: "2px", flex: 1 }}>
                <div style={{ fontSize: "7px", fontWeight: "700", color: blue, textTransform: "uppercase" }}>Address</div>
                <div style={{ fontSize: "8px", color: "#111", lineHeight: 1.3 }}>
                  {[licence?.address_line1, licence?.address_line2, licence?.parish].filter(Boolean).join(", ") || "—"}
                </div>
              </div>
            </div>

            {/* Right — photo */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", flexShrink: 0 }}>
              <div style={{
                width: "68px", height: "84px",
                border: `2px solid ${borderBlue}`,
                borderRadius: "4px",
                overflow: "hidden",
                background: "rgba(255,255,255,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {licence?.photo_url ? (
                  <img src={licence.photo_url} alt="Photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="#90a4ae">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                  </svg>
                )}
              </div>
              <div style={{ fontSize: "7px", color: "#555", textAlign: "center", lineHeight: 1.2 }}>SIGNATURE OF<br />LICENSEE</div>
              {/* Status badge */}
              {(isExpired || isExpiringSoon) && (
                <div style={{ fontSize: "7px", fontWeight: "800", padding: "1px 5px", borderRadius: "3px", background: isExpired ? "#dc2626" : "#d97706", color: "white", textAlign: "center" }}>
                  {isExpired ? "EXPIRED" : "EXPIRING"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Back ──
  return (
    <div style={cardBase}>
      <div style={bg} />
      <div style={holographic} />

      <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", padding: "8px 12px" }}>

        {/* Top banner */}
        <div style={{ background: blue, color: "white", textAlign: "center", fontSize: "7px", fontWeight: "700", padding: "3px 6px", borderRadius: "2px", letterSpacing: "0.3px", marginBottom: "6px" }}>
          MUST BE CARRIED WHEN OPERATING A MOTOR VEHICLE OR APPLYING FOR RENEWAL
        </div>

        {/* Licence to drive + original date */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px", marginBottom: "5px", border: `1px solid ${borderBlue}`, borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ padding: "3px 6px", background: "rgba(255,255,255,0.4)" }}>
            <div style={{ fontSize: "7px", fontWeight: "700", color: blue }}>LICENCE TO DRIVE</div>
            <div style={{ fontSize: "9px", fontWeight: "700", color: "#111" }}>
              {LICENCE_CLASS_LABELS[licence?.licence_class] ?? licence?.licence_class ?? "—"}
            </div>
          </div>
          <div style={{ padding: "3px 6px", background: "rgba(255,255,255,0.4)", borderLeft: `1px solid ${borderBlue}` }}>
            <div style={{ fontSize: "7px", fontWeight: "700", color: blue }}>ORIGINAL DATE OF ISSUE</div>
            <div style={{ fontSize: "9px", fontWeight: "700", color: "#111" }}>{licence?.issue_date ?? "—"}</div>
          </div>
        </div>

        {/* Judicial endorsements table */}
        <div style={{ border: `1px solid ${borderBlue}`, borderRadius: "2px", marginBottom: "5px", overflow: "hidden", flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", background: "rgba(21,101,192,0.12)" }}>
            <div style={{ fontSize: "7px", fontWeight: "700", color: blue, padding: "2px 4px", borderRight: `1px solid ${borderBlue}` }}>DATE</div>
            <div style={{ fontSize: "7px", fontWeight: "700", color: blue, padding: "2px 4px" }}>JUDICIAL ENDORSEMENTS</div>
          </div>
          {/* Endorsement rows */}
          {(licence?.judicial_endorsements?.length > 0) ? (
            licence.judicial_endorsements.map((e, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "90px 1fr", borderTop: `1px solid ${borderBlue}` }}>
                <div style={{ fontSize: "8px", color: "#111", padding: "2px 4px", borderRight: `1px solid ${borderBlue}` }}>{e.date}</div>
                <div style={{ fontSize: "8px", color: "#111", padding: "2px 4px" }}>{e.description}</div>
              </div>
            ))
          ) : (
            <div style={{ height: "30px" }} />
          )}
        </div>

        {/* Bottom row — control no, TRN, nationality, number, signature */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "8px", marginBottom: "4px" }}>
          <div style={{ display: "flex", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "7px", fontWeight: "700", color: blue }}>CONTROL NO.</div>
              <div style={{ fontSize: "9px", fontWeight: "700", color: "#111" }}>{licence?.control_number ?? "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: "7px", fontWeight: "700", color: blue }}>TRN</div>
              <div style={{ fontSize: "9px", fontWeight: "700", color: "#111" }}>{licence?.trn ?? "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: "7px", fontWeight: "700", color: blue }}>NATIONALITY</div>
              <div style={{ fontSize: "9px", fontWeight: "700", color: "#111" }}>{licence?.nationality ?? "—"}</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "7px", color: "#555" }}>COMMISSIONER INLAND REVENUE</div>
            <div style={{ fontSize: "14px", fontFamily: "cursive", color: "#333", lineHeight: 1 }}>Dlrsjam</div>
          </div>
        </div>

        {/* Barcode */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "1px", height: "22px" }}>
            {Array.from({ length: 60 }).map((_, i) => (
              <div key={i} style={{
                width: i % 3 === 0 ? "3px" : "1.5px",
                height: "100%",
                background: "#111",
                opacity: i % 5 === 0 ? 0.4 : 1,
              }} />
            ))}
          </div>
          <div style={{ fontSize: "8px", fontFamily: "monospace", color: "#333", marginTop: "2px" }}>
            {licence?.trn ?? "000000000"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small field box ──
function Field({ label, value, blue, borderBlue, small, valueStyle }) {
  return (
    <div style={{ border: `1px solid ${borderBlue}`, padding: "2px 4px", background: "rgba(255,255,255,0.4)", borderRadius: "2px" }}>
      <div style={{ fontSize: "7px", fontWeight: "700", color: blue, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: small ? "7px" : "9px", fontWeight: "700", color: "#111", lineHeight: 1.2, ...valueStyle }}>{value}</div>
    </div>
  );
}