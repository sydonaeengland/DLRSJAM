// Officer dashboard overview — stats cards, needs-attention list, and recent activity.
import { useEffect, useState } from "react";
import styles from "./OverviewPage.module.css";
import AppRow, { Empty, TableCard, daysSince } from "./AppRow";
import NotifList from "./NotifList";

const Ico = ({ d, size = 16, stroke = "currentColor", sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const ChevRight    = p => <Ico {...p} d="M9 18l6-6-6-6" />;
const BuildingIcon = p => <Ico {...p} d={["M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z","M9 22V12h6v10"]} />;
const AlertIcon    = p => <Ico {...p} d={["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z","M12 9v4","M12 17h.01"]} />;
const ClockIcon    = p => <Ico {...p} d={["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z","M12 6v6l4 2"]} />;

function toTitleCase(str) {
  if (!str) return "—";
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function AnimatedNumber({ value, loading }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (loading) return;
    let start = 0;
    const end = value;
    if (end === 0) { setDisplay(0); return; }
    const duration = 600;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value, loading]);

  return <>{loading ? "—" : display}</>;
}

function SLASummary({ apps }) {
  const overdue = apps.filter(a => daysSince(a.submitted_at) >= 5).length;
  const warning = apps.filter(a => { const d = daysSince(a.submitted_at); return d >= 3 && d < 5; }).length;
  const onTime  = apps.filter(a => daysSince(a.submitted_at) < 3).length;

  if (apps.length === 0) return null;

  return (
    <div className={styles.slaSummary}>
      {overdue > 0 && (
        <div className={styles.slaChip} style={{ background: "rgba(239,68,68,0.15)", borderColor: "rgba(239,68,68,0.3)" }}>
          <AlertIcon size={11} stroke="#ef4444" />
          <span style={{ color: "#fca5a5" }}>
            {overdue} {overdue === 1 ? "case needs" : "cases need"} urgent attention
          </span>
        </div>
      )}
      {warning > 0 && (
        <div className={styles.slaChip} style={{ background: "rgba(251,146,60,0.15)", borderColor: "rgba(251,146,60,0.3)" }}>
          <ClockIcon size={11} stroke="#fb923c" />
          <span style={{ color: "#fdba74" }}>
            {warning} {warning === 1 ? "case" : "cases"} should be reviewed today
          </span>
        </div>
      )}
      {onTime > 0 && (
        <div className={styles.slaChip} style={{ background: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.25)" }}>
          <span style={{ color: "rgba(134,239,172,0.8)" }}>
            {onTime} {onTime === 1 ? "case is" : "cases are"} up to date
          </span>
        </div>
      )}
    </div>
  );
}

export default function OverviewPage({
  user, loading, stats, activeApps, notifications,
  unreadCount, seenNotifs, setSeenNotifs, markAllRead, markOneRead, setPage, onOpen,
}) {
  const now      = new Date();
  const hour     = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateLabel = now.toLocaleDateString("en-JM", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const totalActive  = activeApps.length;
  const overdueCount = activeApps.filter(a => daysSince(a.submitted_at) >= 5).length;

  return (
    <div className={styles.grid}>

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroOrb1} />
        <div className={styles.heroOrb2} />
        <div className={styles.heroGrid} />

        <div className={styles.heroInner}>
            <div className={styles.heroLeft}>
                <div className={styles.heroMeta}>
                <div className={styles.heroDot} />
                <span className={styles.heroDate}>{dateLabel}</span>
                </div>
                <h1 className={styles.heroGreeting}>
                {greeting},<br />
                <span className={styles.heroName}>{user?.name?.split(" ")[0] || "Officer"}</span>
                </h1>
                <p className={styles.heroSub}>
                {totalActive > 0
                    ? <>You have <strong style={{ color: "white" }}>{totalActive} case{totalActive !== 1 ? "s" : ""}</strong> pending review{overdueCount > 0 ? `, ${overdueCount} overdue` : ""}.</>
                    : "Your queue is clear — no pending reviews."}
                </p>
                <div className={styles.heroPills}>
                {user?.branch && (
                    <div className={styles.heroPill}>
                    <BuildingIcon size={11} stroke="rgba(255,255,255,0.6)" />
                    <span>{toTitleCase(user.branch)}</span>
                    </div>
                )}
                {user?.staff_id && (
                    <div className={styles.heroPill}>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px" }}>ID</span>
                    <span>{user.staff_id}</span>
                    </div>
                )}
                </div>
                <SLASummary apps={activeApps} />
            </div>

            {/* Right actions */}
            <div className={styles.heroActions}>
                {activeApps.length > 0 ? (
                <>
                    <button className={styles.heroActionPrimary}
                    onClick={() => {
                        const next = [...activeApps].sort((a, b) =>
                        new Date(a.submitted_at) - new Date(b.submitted_at)
                        )[0];
                        if (next) onOpen(next);
                    }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                    Start Next Review
                    </button>
                    <button className={styles.heroActionSecondary} onClick={() => setPage("active")}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M22 12h-6l-2 3H10l-2-3H2M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                    </svg>
                    View All Cases
                    </button>
                    {overdueCount > 0 && (
                    <div className={styles.heroOverduePill}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
                        </svg>
                        {overdueCount} case{overdueCount !== 1 ? "s" : ""} overdue
                    </div>
                    )}
                </>
                ) : (
                <div className={styles.heroAllClear}>
                    <div className={styles.heroAllClearIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    </div>
                    <p className={styles.heroAllClearText}>All clear</p>
                    <p className={styles.heroAllClearSub}>No cases pending</p>
                </div>
                )}
            </div>
            </div>
      </div>

      {/* Stat cards */}
      <div className={styles.statGrid}>
        {stats.map((s, i) => {
          const hasData = s.val > 0;
          return (
            <div key={s.label} className={styles.statCard}
              style={{ borderColor: hasData ? s.activeBorder : "#e9e8e7", animationDelay: `${i * 0.06}s` }}
              onClick={() => setPage(s.page)}>
              <div className={styles.statCardTop}>
                <div className={styles.statIcon} style={{ background: hasData ? s.activeBg : "#f8fafc" }}>
                  <s.Icon size={15} stroke={hasData ? s.activeColor : "#9ca3af"} />
                </div>
                <div className={styles.statArrow}>
                  <ChevRight size={13} stroke={hasData ? s.activeColor : "#e2e8f0"} />
                </div>
              </div>
              <p className={styles.statVal} style={{ color: hasData ? s.activeColor : "#9ca3af" }}>
                <AnimatedNumber value={s.val} loading={loading} />
              </p>
              <p className={styles.statLabel}>{s.label}</p>
              {hasData && s.label === "Active Reviews" && overdueCount > 0 && (
                <p className={styles.statAlert}>
                  <AlertIcon size={10} stroke="#ef4444" /> {overdueCount} overdue
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom row */}
      <div className={styles.bottomRow}>
        {/* Needs attention */}
        <div className={styles.attentionCard}>
          <div className={styles.attentionHeader}>
            <div>
              <p className={styles.attentionTitle}>Needs Attention</p>
              <p className={styles.attentionSub}>Your most urgent cases</p>
            </div>
            <div className={styles.attentionHeaderRight}>
              {activeApps.length > 0 && (
                <span className={styles.attentionCount}>{Math.min(activeApps.length, 5)} of {activeApps.length}</span>
              )}
              {activeApps.length > 5 && (
                <button className={styles.viewAllBtn} onClick={() => setPage("active")}>
                  View all <ChevRight size={11} stroke="currentColor" />
                </button>
              )}
            </div>
          </div>

          <div className={styles.attentionList}>
            {loading ? (
              <div className={styles.loadingInline}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" className={styles.spinner}>
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                <span className={styles.loadingText}>Loading cases…</span>
              </div>
            ) : activeApps.length === 0 ? (
              <div className={styles.clearState}>
                <div className={styles.clearIcon}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className={styles.clearTitle}>All clear</p>
                <p className={styles.clearDesc}>No cases pending review</p>
              </div>
            ) : (
              activeApps
                .sort((a, b) => daysSince(b.submitted_at) - daysSince(a.submitted_at))
                .slice(0, 5)
                .map(a => <AppRow key={a.id} app={a} onOpen={onOpen} />)
            )}
          </div>
        </div>

        {/* Activity */}
        <div className={styles.activityCard}>
          <div className={styles.activityHeader}>
            <div>
              <p className={styles.activityTitle}>Activity</p>
              <p className={styles.activitySub}>Recent case updates</p>
            </div>
            <div className={styles.activityHeaderRight}>
              {unreadCount > 0 && <span className={styles.unreadBadge}>{unreadCount} new</span>}
              {unreadCount > 0 && (
                <button className={styles.markReadBtn} onClick={markAllRead}>Mark read</button>
              )}
            </div>
          </div>
          <div className={styles.activityScroll}>
            <NotifList notifications={notifications} seenNotifs={seenNotifs}
              setSeenNotifs={setSeenNotifs} onMarkRead={markOneRead} />
          </div>
          {notifications.length === 0 && !loading && (
            <div className={styles.activityEmpty}>
              <p>No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}