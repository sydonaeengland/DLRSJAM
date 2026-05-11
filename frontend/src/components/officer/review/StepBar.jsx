// Horizontal step bar at the top of the review page — lets the officer jump between review sections.
import styles from "./StepBar.module.css";

const Ico = ({ d, size = 14, stroke = "currentColor", sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const CheckIcon = p => <Ico {...p} sw={2.5} d="M5 12l5 5L20 7" />;

export default function StepBar({ steps, current, onStepClick }) {
  return (
    <div className={styles.bar}>
      <div className={styles.trackRow}>
        {steps.map((s, i) => {
          const done   = i < current;
          const active = i === current;
          const isLast = i === steps.length - 1;
          return (
            <div key={s.id} className={`${styles.trackItem} ${isLast ? styles.trackItemLast : ""}`}>
              <div className={styles.nodeWrap}>
                <button
                  className={`${styles.node} ${active ? styles.nodeActive : done ? styles.nodeDone : styles.nodePending}`}
                  onClick={() => done && onStepClick(i)}
                  style={{ cursor: done ? "pointer" : "default" }}>
                  {done
                    ? <CheckIcon size={13} stroke="white" sw={2.5} />
                    : <span className={styles.nodeNum}>{i + 1}</span>
                  }
                </button>
                <p className={`${styles.label} ${active ? styles.labelActive : done ? styles.labelDone : ""}`}>
                  {s.label}
                </p>
              </div>
              {!isLast && <div className={`${styles.line} ${done ? styles.lineDone : ""}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
