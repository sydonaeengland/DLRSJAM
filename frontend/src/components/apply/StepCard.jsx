// White card container used on each step of the apply flow.
export default function StepCard({ children }) {
  return (
    <div style={{
      background: "white",
      borderRadius: "16px",
      border: "1px solid #e9e8e7",
      padding: "clamp(16px, 4vw, 32px)",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      {children}
    </div>
  );
}