import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BRAND } from "../../../config/theme";
import { APPLICATION_STATUS_STYLES, APPLICATION_STATUS_LABELS } from "../../../config/constants";
import api from "../../../services/api";
import DashboardLayout from "../../../components/layout/DashboardLayout";

const TX_LABELS = {
  RENEWAL:     "Licence Renewal",
  REPLACEMENT: "Licence Replacement",
  AMENDMENT:   "Licence Amendment",
};

const TX_ICONS = {
  RENEWAL: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
    </svg>
  ),
  REPLACEMENT: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  AMENDMENT: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
};

const STATUS_PILL = {
  DRAFT:                { bg: "#fef3c7", dot: "#d97706",  text: "#92400e" },
  SUBMITTED:            { bg: "#bfdbfe", dot: "#2563eb",  text: "#1d4ed8" },
  UNDER_REVIEW:         { bg: "#fef08a", dot: "#b45309",  text: "#78350f" },
  PENDING_ITA:          { bg: "#e9d5ff", dot: "#9333ea",  text: "#6b21a8" },
  ACTION_REQUIRED:      { bg: "#fecaca", dot: "#dc2626",  text: "#991b1b" },
  WAITING_ON_APPLICANT: { bg: "#fed7aa", dot: "#c2410c",  text: "#9a3412" },
  RESUBMITTED:          { bg: "#c7d2fe", dot: "#4f46e5",  text: "#3730a3" },
  ESCALATED:            { bg: "#f3e8ff", dot: "#9333ea",  text: "#6b21a8" },
  APPROVED:             { bg: "#bbf7d0", dot: "#16a34a",  text: "#14532d" },
  REJECTED:             { bg: "#fecaca", dot: "#dc2626",  text: "#991b1b" },
};

const ACTIVE_STATUSES = [
  "DRAFT", "SUBMITTED", "UNDER_REVIEW", "PENDING_ITA",
  "ACTION_REQUIRED", "RESUBMITTED", "ESCALATED", "WAITING_ON_APPLICANT",
];

function getProgress(status) {
  const map = {
    DRAFT:                { pct: 8,   color: "#d97706" },
    SUBMITTED:            { pct: 33,  color: "#2563eb" },
    RESUBMITTED:          { pct: 42,  color: "#4f46e5" },
    UNDER_REVIEW:         { pct: 55,  color: "#b45309" },
    PENDING_ITA:          { pct: 62,  color: "#9333ea" },
    WAITING_ON_APPLICANT: { pct: 50,  color: "#c2410c" },
    ACTION_REQUIRED:      { pct: 50,  color: "#dc2626" },
    ESCALATED:            { pct: 68,  color: "#9333ea" },
    APPROVED:             { pct: 100, color: "#16a34a" },
    REJECTED:             { pct: 100, color: "#dc2626" },
  };
  return map[status] || { pct: 33, color: "#2563eb" };
}

function getProgressLabel(status) {
  const map = {
    DRAFT:                "Not yet submitted",
    SUBMITTED:            "Waiting for officer review",
    RESUBMITTED:          "Response submitted — awaiting review",
    UNDER_REVIEW:         "Officer reviewing your documents",
    PENDING_ITA:          "Awaiting ITA traffic clearance",
    WAITING_ON_APPLICANT: "Waiting on your response",
    ACTION_REQUIRED:      "Officer requested additional documents",
    ESCALATED:            "Under senior supervisor review",
    APPROVED:             "Approved — ready to collect",
    REJECTED:             "Application not approved",
  };
  return map[status] || "In progress";
}

function getStageIndex(status) {
  const map = {
    DRAFT: 0,
    SUBMITTED: 1, RESUBMITTED: 1,
    UNDER_REVIEW: 2, PENDING_ITA: 2, ACTION_REQUIRED: 2,
    WAITING_ON_APPLICANT: 2, ESCALATED: 2,
    APPROVED: 3, REJECTED: 3,
  };
  return map[status] ?? 1;
}

function getLeftBorder(status) {
  const map = {
    ACTION_REQUIRED:      "#dc2626",
    WAITING_ON_APPLICANT: "#c2410c",
    DRAFT:                "#d97706",
    APPROVED:             "#16a34a",
    REJECTED:             "#dc2626",
    ESCALATED:            "#9333ea",
    PENDING_ITA:          "#9333ea",
    RESUBMITTED:          "#4f46e5",
    UNDER_REVIEW:         "#b45309",
  };
  return map[status] || BRAND.primary;
}

function getIconStyle(type) {
  const map = {
    RENEWAL:     { bg: "#eff6ff", color: BRAND.primary },
    REPLACEMENT: { bg: "#fff7ed", color: "#d97706" },
    AMENDMENT:   { bg: "#f0fdf4", color: "#16a34a" },
  };
  return map[type] || map.RENEWAL;
}

function getCardBorder(status) {
  if (["ACTION_REQUIRED", "WAITING_ON_APPLICANT"].includes(status)) return "#fca5a5";
  if (status === "DRAFT") return "#fde68a";
  if (status === "APPROVED") return "#86efac";
  if (status === "REJECTED") return "#fca5a5";
  return "#e9e8e7";
}

function relativeDate(iso, isDraft) {
  if (!iso) return null;
  const diffDays = Math.max(0, Math.floor((Date.now() - new Date(iso)) / 86400000));
  const prefix = isDraft ? "Created" : "Submitted";
  if (diffDays === 0) return `${prefix} today`;
  if (diffDays === 1) return `${prefix} yesterday`;
  return `${prefix} ${diffDays} days ago`;
}

export default function MyApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    window.scrollTo({ top: 0 });
    api.get("/api/applicant/applications")
      .then((res) => setApplications(res.data.applications ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active    = applications.filter((a) => ACTIVE_STATUSES.includes(a.status));
  const completed = applications.filter((a) => ["APPROVED", "REJECTED"].includes(a.status));

  const filtered = applications.filter((a) => {
    if (filter === "active")    return ACTIVE_STATUSES.includes(a.status);
    if (filter === "completed") return ["APPROVED", "REJECTED"].includes(a.status);
    return true;
  });

  return (
    <DashboardLayout>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .app-card { transition: transform 0.15s, box-shadow 0.15s; }
        .app-card:hover { transform: translateY(-2px) !important; box-shadow: 0 8px 28px rgba(0,0,0,0.1) !important; }
      `}</style>

      {/* ── Hero ── */}
      <div style={{
        background: `linear-gradient(135deg, #0f172a 0%, ${BRAND.primaryDeep} 55%, ${BRAND.primary} 100%)`,
        position: "relative", overflow: "hidden", width: "100%",
      }}>
        <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "260px", height: "260px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-30px", left: "40%", width: "160px", height: "160px", borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none" }} />

        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "28px 24px 0", position: "relative" }}>
          <p style={{ fontSize: "11px", fontWeight: "700", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 5px" }}>
            Tax Administration Jamaica
          </p>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: "white", margin: "0 0 4px", letterSpacing: "-0.4px" }}>
            My Applications
          </h1>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", margin: "0 0 24px" }}>
            {loading ? "Loading…" : applications.length === 0
              ? "No applications yet"
              : `${applications.length} application${applications.length !== 1 ? "s" : ""} · ${active.length} active`}
          </p>

          {/* Stats — clearly separated with gap + coloured top border */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            {[
              { label: "Total",    value: applications.length, numColor: "white",   bg: "rgba(255,255,255,0.14)",    topBorder: "rgba(255,255,255,0.4)" },
              { label: "Active",   value: active.length,       numColor: "#93c5fd", bg: "rgba(147,197,253,0.14)",   topBorder: "#93c5fd" },
              { label: "Approved", value: completed.filter((a) => a.status === "APPROVED").length, numColor: "#86efac", bg: "rgba(134,239,172,0.14)", topBorder: "#86efac" },
            ].map((s) => (
              <div key={s.label} style={{
                background: s.bg,
                borderTop: `3px solid ${s.topBorder}`,
                borderRadius: "10px 10px 0 0",
                padding: "16px 20px 20px",
              }}>
                <p style={{ fontSize: "32px", fontWeight: "900", color: loading ? "rgba(255,255,255,0.2)" : s.numColor, margin: "0 0 4px", letterSpacing: "-1px", lineHeight: 1 }}>
                  {loading ? "—" : s.value}
                </p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", margin: 0, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: "700" }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "24px 24px 80px", width: "100%", boxSizing: "border-box", animation: "fadeUp 0.3s ease forwards" }}>

        {/* Filter tabs */}
        {!loading && applications.length > 0 && (
          <div style={{ display: "flex", gap: "3px", background: "#e8ecf0", borderRadius: "10px", padding: "3px", width: "fit-content", maxWidth: "100%", marginBottom: "20px" }}>
            {[
              { key: "all",       label: `All (${applications.length})` },
              { key: "active",    label: `Active (${active.length})` },
              { key: "completed", label: `Completed (${completed.length})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  padding: "7px 16px", borderRadius: "8px", border: "none",
                  background: filter === tab.key ? "white" : "transparent",
                  color: filter === tab.key ? "#1b1c1c" : "#64748b",
                  fontSize: "13px", fontWeight: filter === tab.key ? "700" : "500",
                  cursor: "pointer",
                  boxShadow: filter === tab.key ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: "12px" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            <span style={{ fontSize: "14px", color: "#64748b" }}>Loading applications…</span>
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e9e8e7", padding: "64px 24px", textAlign: "center" }}>
            <div style={{ width: "60px", height: "60px", borderRadius: "16px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p style={{ fontSize: "17px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 6px" }}>
              {filter === "all" ? "No applications yet" : `No ${filter} applications`}
            </p>
            <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 24px", lineHeight: 1.6 }}>
              {filter === "all"
                ? "Start a new application to renew, replace, or amend your driver's licence."
                : "Nothing here right now."}
            </p>
            {filter === "all" && (
              <button
                onClick={() => navigate("/apply")}
                style={{ padding: "11px 28px", borderRadius: "10px", border: "none", background: BRAND.primary, color: "white", fontSize: "14px", fontWeight: "700", cursor: "pointer" }}
              >
                Start Application →
              </button>
            )}
          </div>
        )}

        {/* Cards */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
            {filtered.map((app) => (
              <ApplicationCard key={app.id} app={app} navigate={navigate} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function ApplicationCard({ app, navigate }) {
  const pill        = STATUS_PILL[app.status] || STATUS_PILL.SUBMITTED;
  const statusLabel = APPLICATION_STATUS_LABELS[app.status] || app.status;
  const txLabel     = TX_LABELS[app.transaction_type] || app.transaction_type;
  const txIcon      = TX_ICONS[app.transaction_type] || TX_ICONS.RENEWAL;
  const iconStyle   = getIconStyle(app.transaction_type);
  const leftBorder  = getLeftBorder(app.status);
  const cardBorder  = getCardBorder(app.status);
  const { pct, color: barColor } = getProgress(app.status);
  const progressLabel = getProgressLabel(app.status);
  const stage         = getStageIndex(app.status);

  const fee        = app.fee_amount
    ? `$${parseFloat(app.fee_amount).toLocaleString("en-JM", { minimumFractionDigits: 2 })} JMD`
    : null;
  const dateStr    = relativeDate(app.submitted_at || app.created_at, app.status === "DRAFT");
  const isAR       = ["ACTION_REQUIRED", "WAITING_ON_APPLICANT"].includes(app.status);
  const isDraft    = app.status === "DRAFT";
  const isApproved = app.status === "APPROVED";
  const isRejected = app.status === "REJECTED";

  return (
    <div
      className="app-card"
      onClick={() => navigate(isDraft ? `/apply?resume=${app.id}` : `/applications/${app.id}`)}
      style={{
        background: "white",
        borderRadius: "14px",
        border: `1px solid ${cardBorder}`,
        borderLeft: `5px solid ${leftBorder}`,
        cursor: "pointer",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        overflow: "hidden",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* ── Top row: icon / title / pill / chevron ── */}
      <div style={{ padding: "18px 18px 0 16px", display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{
          width: "48px", height: "48px", borderRadius: "12px", flexShrink: 0,
          background: iconStyle.bg, color: iconStyle.color,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {txIcon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "15px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {txLabel}
          </p>
          <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, fontFamily: "monospace" }}>
            {app.application_number}
          </p>
        </div>

        {/* Status pill */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "7px",
          background: pill.bg, borderRadius: "999px", padding: "6px 14px", flexShrink: 0,
        }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: pill.dot, flexShrink: 0 }} />
          <span style={{ fontSize: "12px", fontWeight: "800", color: pill.text, whiteSpace: "nowrap" }}>
            {statusLabel}
          </span>
        </div>

        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {/* ── Meta: date · fee · location ── */}
      <div style={{ padding: "8px 18px 14px 16px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        {dateStr && <span style={{ fontSize: "12px", color: "#64748b" }}>{dateStr}</span>}
        {fee && (
          <>
            <span style={{ color: "#cbd5e1", fontSize: "11px" }}>·</span>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#1b1c1c" }}>{fee}</span>
          </>
        )}
        {app.pickup_collectorate && (
          <>
            <span style={{ color: "#cbd5e1", fontSize: "11px" }}>·</span>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              {app.pickup_collectorate.split("(")[0].trim()}
            </span>
          </>
        )}
      </div>

      {/* ── Inline banners ── */}
      {isAR && (
        <div style={{ margin: "0 18px 14px 16px", padding: "10px 14px", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca", display: "flex", gap: "8px", alignItems: "flex-start" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: "1px" }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p style={{ fontSize: "12px", color: "#991b1b", margin: 0, fontWeight: "600", lineHeight: 1.5 }}>
            {app.officer_comment ? `"${app.officer_comment}"` : "Action required — tap to view and respond"}
          </p>
        </div>
      )}

      {isApproved && (
        <div style={{ margin: "0 18px 14px 16px", padding: "10px 14px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
          <p style={{ fontSize: "12px", color: "#15803d", margin: 0, fontWeight: "600", lineHeight: 1.5 }}>
            Ready for collection{app.pickup_collectorate ? ` at ${app.pickup_collectorate.split("(")[0].trim()}` : ""} — bring ref <strong>{app.application_number}</strong> and valid photo ID.
          </p>
        </div>
      )}

      {isRejected && (
        <div style={{ margin: "0 18px 14px 16px", padding: "10px 14px", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca" }}>
          <p style={{ fontSize: "12px", color: "#991b1b", margin: 0, fontWeight: "600", lineHeight: 1.5 }}>
            {app.officer_comment || "Application not approved — visit your nearest TAJ office for assistance."}
          </p>
        </div>
      )}

      {isDraft && (
        <div style={{ margin: "0 18px 14px 16px", padding: "9px 14px", background: "#fffbeb", borderRadius: "8px", border: "1px solid #fde68a", display: "flex", alignItems: "center", gap: "7px" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "#92400e" }}>Draft — tap to continue where you left off</span>
        </div>
      )}

      {/* ── Progress bar — flush to card bottom ── */}
      <div style={{ borderTop: "1px solid #f1f5f9" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 18px 7px 16px" }}>
          <span style={{ fontSize: "12px", color: "#475569", fontWeight: "600" }}>{progressLabel}</span>
          <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600" }}>Step {stage + 1} of 4</span>
        </div>
        <div style={{ height: "5px", background: "#f1f5f9" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: barColor, transition: "width 0.6s ease" }} />
        </div>
      </div>
    </div>
  );
}