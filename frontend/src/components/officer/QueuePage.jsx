// Filtered queue view used for Active, Waiting, Escalated, and Approved sections of the officer dashboard.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./QueuePage.module.css";

const Ico = ({ d, size = 16, stroke = "currentColor", sw = 2, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const SearchIcon  = p => <Ico {...p} d={["M11 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12z","M21 21l-4.35-4.35"]} />;
const ShieldIcon  = p => <Ico {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const ChevRight   = p => <Ico {...p} d="M9 18l6-6-6-6" />;
const EyeIcon     = p => <Ico {...p} d={["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z","M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6"]} />;
const FileIcon    = p => <Ico {...p} d={["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z","M14 2v6h6"]} />;
const ClockIcon   = p => <Ico {...p} d={["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z","M12 6v6l4 2"]} />;
const AlertIcon   = p => <Ico {...p} d={["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z","M12 9v4","M12 17h.01"]} />;
const RotateIcon  = p => <Ico {...p} d={["M1 4v6h6","M3.51 15a9 9 0 1 0 .49-4.5"]} />;
const ArrowUpIcon = p => <Ico {...p} d="M12 19V5M5 12l7-7 7 7" />;
const CheckIcon   = p => <Ico {...p} sw={2.5} d="M5 12l5 5L20 7" />;
const XIcon       = p => <Ico {...p} d="M18 6L6 18M6 6l12 12" />;

const STATUS_META = {
  SUBMITTED:            { label: "New",             bg: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6" },
  UNDER_REVIEW:         { label: "In Review",       bg: "#e0f2fe", color: "#0369a1", dot: "#0ea5e9" },
  PENDING_ITA:          { label: "Awaiting ITA",    bg: "#f3e8ff", color: "#7c3aed", dot: "#a78bfa" },
  ACTION_REQUIRED:      { label: "Action Required", bg: "#fee2e2", color: "#b91c1c", dot: "#ef4444" },
  WAITING_ON_APPLICANT: { label: "Waiting",         bg: "#ffedd5", color: "#c2410c", dot: "#f97316" },
  RESUBMITTED:          { label: "Resubmitted",     bg: "#fef9c3", color: "#854d0e", dot: "#eab308" },
  ESCALATED:            { label: "Escalated",       bg: "#fce7f3", color: "#be185d", dot: "#ec4899" },
  APPROVED:             { label: "Approved",        bg: "#dcfce7", color: "#15803d", dot: "#22c55e" },
  REJECTED:             { label: "Rejected",        bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" },
};

const TX_META = {
  RENEWAL:     { label: "Renewal",     color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  REPLACEMENT: { label: "Replacement", color: "#d97706", bg: "#fff7ed", border: "#fed7aa" },
  AMENDMENT:   { label: "Amendment",   color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
};

const PAGE_CONFIG = {
  active: {
    label: "Active Reviews",
    desc: "Applications assigned to you requiring action",
    icon: <Ico d={["M22 12h-6l-2 3H10l-2-3H2","M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"]} size={20} stroke="white" />,
    accent: "#2563eb", accentBg: "#eff6ff", accentBorder: "#bfdbfe",
    gradientFrom: "#1e3a8a", gradientTo: "#2563eb",
    readOnly: false, banner: null,
  },
  waiting: {
    label: "Waiting on Applicant",
    desc: "Pending resubmission from the applicant",
    icon: <RotateIcon size={20} stroke="white" />,
    accent: "#ea580c", accentBg: "#fff7ed", accentBorder: "#fed7aa",
    gradientFrom: "#7c2d12", gradientTo: "#ea580c",
    readOnly: false,
    banner: { bg: "#fff7ed", border: "#fed7aa", color: "#9a3412", stroke: "#c2410c", Icon: RotateIcon, msg: "Waiting for applicant to resubmit requested documents. No action required until they respond." },
  },
  escalated: {
    label: "Escalated",
    desc: "Under supervisor review",
    icon: <ArrowUpIcon size={20} stroke="white" />,
    accent: "#be185d", accentBg: "#fdf4ff", accentBorder: "#f0abfc",
    gradientFrom: "#701a75", gradientTo: "#be185d",
    readOnly: true,
    banner: { bg: "#fdf4ff", border: "#f0abfc", color: "#9d174d", stroke: "#be185d", Icon: ArrowUpIcon, msg: "These cases are under supervisor review. You cannot take action until the supervisor resolves them." },
  },
  pending_ita: {
    label: "Pending ITA",
    desc: "Awaiting ITA traffic clearance response",
    icon: <ShieldIcon size={20} stroke="white" />,
    accent: "#7c3aed", accentBg: "#f5f3ff", accentBorder: "#ddd6fe",
    gradientFrom: "#4c1d95", gradientTo: "#7c3aed",
    readOnly: true,
    banner: { bg: "#f5f3ff", border: "#ddd6fe", color: "#5b21b6", stroke: "#7c3aed", Icon: ShieldIcon, msg: "These applications are awaiting ITA traffic clearance. They will return to Active Reviews once cleared." },
  },
  approved: {
    label: "Approved by Me",
    desc: "Applications you have approved",
    icon: <CheckIcon size={20} stroke="white" />,
    accent: "#16a34a", accentBg: "#f0fdf4", accentBorder: "#bbf7d0",
    gradientFrom: "#14532d", gradientTo: "#16a34a",
    readOnly: true, banner: null,
  },
};

function getInitials(name) {
  return (name || "?").split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function daysSince(iso) {
  return iso ? Math.max(0, Math.floor((Date.now() - new Date(iso)) / 86400000)) : 0;
}

function SLABadge({ days }) {
  if (days === 0) return <span className={`${styles.slaBadge} ${styles.slaToday}`}>Today</span>;
  if (days >= 5)  return <span className={`${styles.slaBadge} ${styles.slaOverdue}`}><AlertIcon size={10} stroke="currentColor" /> {days}d overdue</span>;
  if (days >= 3)  return <span className={`${styles.slaBadge} ${styles.slaWarning}`}><ClockIcon size={10} stroke="currentColor" /> {days}d</span>;
  return <span className={`${styles.slaBadge} ${styles.slaNormal}`}>{days}d ago</span>;
}

function CaseRow({ app, readOnly, onOpen }) {
  const navigate = useNavigate();
  const sm   = STATUS_META[app.status] || { label: app.status, bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" };
  const tx   = TX_META[app.transaction_type] || { label: app.transaction_type, color: "#374151", bg: "#f1f5f9", border: "#e2e8f0" };
  const days = daysSince(app.submitted_at);

  return (
    <div className={styles.caseRow}
      onClick={() => readOnly ? navigate(`/officer/review/${app.id}`) : onOpen(app)}>

      {/* Avatar */}
      <div className={styles.caseAvatar} style={{ background: tx.bg, color: tx.color }}>
        {getInitials(app.applicant_name || "")}
      </div>

      {/* Name + ref */}
      <div className={styles.caseMain}>
        <p className={styles.caseName}>{app.applicant_name || "—"}</p>
        <div className={styles.caseSub}>
          <span className={styles.caseRef}>{app.application_number}</span>
          {app.trn && <><span className={styles.caseDot}>·</span><span className={styles.caseTrn}>{app.trn}</span></>}
        </div>
      </div>

      {/* Type badge */}
      <div className={styles.caseType} style={{ background: tx.bg, color: tx.color, borderColor: tx.border }}>
        {tx.label}
      </div>

      {/* Status */}
      <div className={styles.caseStatus}>
        <div className={styles.statusDot} style={{ background: sm.dot }} />
        <span style={{ color: sm.color, fontSize: "12px", fontWeight: 600 }}>{sm.label}</span>
      </div>

      {/* SLA */}
      <div className={styles.caseSLA}>
        {!["APPROVED","REJECTED"].includes(app.status) && <SLABadge days={days} />}
      </div>

      {/* Action */}
      <button className={`${styles.caseAction} ${readOnly ? styles.viewBtn : styles.reviewBtn}`}
        onClick={e => { e.stopPropagation(); readOnly ? navigate(`/officer/review/${app.id}`) : onOpen(app); }}>
        {readOnly
          ? <><EyeIcon size={12} stroke="currentColor" /> View</>
          : app.status === "SUBMITTED"
            ? <>Start <ChevRight size={11} stroke="currentColor" /></>
            : <>Continue <ChevRight size={11} stroke="currentColor" /></>
        }
      </button>
    </div>
  );
}

function Empty({ filtered }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>
        {filtered ? <SearchIcon size={20} stroke="#d1d5db" /> : <FileIcon size={20} stroke="#d1d5db" />}
      </div>
      <p className={styles.emptyTitle}>{filtered ? "No results found" : "Nothing here yet"}</p>
      <p className={styles.emptyDesc}>{filtered ? "Try adjusting your search or filters" : "Cases assigned to you will appear here"}</p>
    </div>
  );
}

const TX_OPTIONS = ["All", "Renewal", "Replacement", "Amendment"];

export default function QueuePage({
  page, apps, apprRange, setApprRange,
  search, setSearch, txFilter, setTxFilter, onOpen,
}) {
  const cfg      = PAGE_CONFIG[page] || PAGE_CONFIG.active;
  const list     = apps[page] || [];
  const filtered = search.trim() || txFilter !== "All";

  return (
    <div className={styles.root}>

      {/* Page header */}
        <div className={styles.pageHeader} style={{
            background: `linear-gradient(135deg, ${cfg.gradientFrom} 0%, ${cfg.gradientTo} 100%)`
            }}>
            <div className={styles.heroOrb1} />
            <div className={styles.heroOrb2} />
            <div className={styles.heroInner}>
                <div className={styles.heroLeft}>
                <div className={styles.heroIconWrap}>
                    {cfg.icon}
                </div>
                <div>
                    <p className={styles.heroLabel}>Officer Portal · {cfg.label}</p>
                    <h2 className={styles.heroTitle}>{cfg.label}</h2>
                    <p className={styles.heroDesc}>{cfg.desc}</p>
                </div>
                </div>
                <div className={styles.heroRight}>
                <p className={styles.heroCount}>{list.length}</p>
                <p className={styles.heroCountLabel}>{list.length === 1 ? "case" : "cases"}</p>
                </div>
            </div>
        </div>

      {/* Contextual banner */}
      {cfg.banner && (
        <div className={styles.banner} style={{ background: cfg.banner.bg, borderColor: cfg.banner.border }}>
          <div className={styles.bannerIcon} style={{ background: cfg.banner.border }}>
            <cfg.banner.Icon size={13} stroke={cfg.banner.stroke} />
          </div>
          <p className={styles.bannerText} style={{ color: cfg.banner.color }}>{cfg.banner.msg}</p>
        </div>
      )}

      {/* Search + filters */}
      <div className={styles.filterShell}>
        <div className={styles.filterRow}>
          {/* Search */}
          <div className={styles.searchBox}>
            <SearchIcon size={14} stroke="#94a3b8" />
            <input className={styles.searchInput} value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, TRN or reference number…" />
            {search && (
              <button className={styles.clearSearch} onClick={() => setSearch("")}>
                <XIcon size={12} stroke="#94a3b8" />
              </button>
            )}
          </div>

          {/* Separator */}
          <div className={styles.sep} />

          {/* Type pills */}
          <div className={styles.pillRow}>
            {TX_OPTIONS.map(opt => (
              <button key={opt}
                className={`${styles.pill} ${txFilter === opt ? styles.pillOn : ""}`}
                onClick={() => setTxFilter(opt)}>
                {opt}
              </button>
            ))}
          </div>

          {/* Approved period */}
          {page === "approved" && (
            <>
              <div className={styles.sep} />
              <div className={styles.pillRow}>
                {[["7d","7 days"],["30d","30 days"],["all","All time"]].map(([v,l]) => (
                  <button key={v}
                    className={`${styles.pill} ${apprRange === v ? styles.pillOn : ""}`}
                    onClick={() => setApprRange(v)}>
                    {l}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Active filter strip */}
        {filtered && (
          <div className={styles.filterStrip}>
            <span className={styles.filterStripText}>
              {list.length} result{list.length !== 1 ? "s" : ""}
              {search && <> for <strong>"{search}"</strong></>}
              {txFilter !== "All" && <> · {txFilter}</>}
            </span>
            <button className={styles.clearAll} onClick={() => { setSearch(""); setTxFilter("All"); }}>
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className={styles.table}>
        {/* Column headers */}
        <div className={styles.colHeaders}>
          <div className={styles.colAvatar} />
          <div className={styles.colMain}>Applicant</div>
          <div className={styles.colType}>Type</div>
          <div className={styles.colStatus}>Status</div>
          <div className={styles.colSLA}>Submitted</div>
          <div className={styles.colAction} />
        </div>

        {/* Rows */}
        {list.length === 0
          ? <Empty filtered={!!filtered} />
          : list.map(a => <CaseRow key={a.id} app={a} readOnly={cfg.readOnly} onOpen={onOpen} />)
        }

        {/* Footer */}
        {list.length > 0 && (
          <div className={styles.tableFooter}>
            <span>{list.length} case{list.length !== 1 ? "s" : ""}</span>
            <span className={styles.footerDot}>·</span>
            <span>Sorted by submission date, oldest first</span>
            {filtered && <><span className={styles.footerDot}>·</span><span>Filters active</span></>}
          </div>
        )}
      </div>
    </div>
  );
}