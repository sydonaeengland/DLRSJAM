// Avatar and profile dropdown in the officer topbar — shows staff details and sign-out.
import { useState, useEffect, useRef } from "react";
import styles from "./ProfileDropdown.module.css";

const Ico = ({ d, size = 16, stroke = "currentColor", sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const UserIcon     = p => <Ico {...p} d={["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2","M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"]} />;
const BuildingIcon = p => <Ico {...p} d={["M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z","M9 22V12h6v10"]} />;
const IdIcon       = p => <Ico {...p} d={["M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z","M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"]} />;
const DeptIcon     = p => <Ico {...p} d={["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2","M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z","M23 21v-2a4 4 0 0 0-3-3.87","M16 3.13a4 4 0 0 1 0 7.75"]} />;
const LogoutIcon   = p => <Ico {...p} d={["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4","M16 17l5-5-5-5","M21 12H9"]} />;

function getInitials(name) {
  return (name || "?").split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
function toTitleCase(str) {
  if (!str) return "—";
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

export default function ProfileDropdown({ user, onLogout, onChangePassword }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const initials = getInitials(user?.name || "");

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className={styles.wrap}>
      <button className={`${styles.btn} ${open ? styles.open : ""}`} onClick={() => setOpen(v => !v)}>
        <div className={`${styles.avatar} ${styles.sm}`}>{initials}</div>
        <div>
          <p className={styles.name}>{user?.name || "Officer"}</p>
          <p className={styles.branch}>{toTitleCase(user?.branch) || user?.staff_id || ""}</p>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"
          className={`${styles.chevron} ${open ? styles.open : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <div className={styles.headerInfo}>
              <div className={`${styles.avatar} ${styles.md}`}>{initials}</div>
              <div>
                <p className={styles.fullName}>{user?.name || "—"}</p>
                <p className={styles.email}>{user?.email || "—"}</p>
              </div>
            </div>
            <div className={styles.metaRows}>
              {[
                { Icon: IdIcon,       label: "Staff ID",   val: user?.staff_id || "—" },
                { Icon: BuildingIcon, label: "Branch",     val: toTitleCase(user?.branch) },
                { Icon: DeptIcon,     label: "Department", val: user?.department || "Driver's Licence Unit" },
              ].map(row => (
                <div key={row.label} className={styles.metaRow}>
                  <row.Icon size={13} stroke="#c4c9d4" />
                  <span className={styles.metaLabel}>{row.label}</span>
                  <span className={styles.metaVal}>{row.val}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.actions}>
            <button className={styles.action} disabled><UserIcon size={14} stroke="currentColor" /> Edit profile</button>
            <button className={styles.action} onClick={() => { setOpen(false); onChangePassword?.(); }}><IdIcon size={14} stroke="currentColor" /> Change password</button>
            <div className={styles.divider} />
            <button className={`${styles.action} ${styles.danger}`} onClick={onLogout}>
              <LogoutIcon size={14} stroke="currentColor" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}