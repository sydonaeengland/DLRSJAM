import { BRAND } from "../../config/theme";

export default function PickupDepotCard({ collectorateName, collectorateAddress, mapQuery, approvedApp }) {
  return (
    <div style={{
      background: "white", borderRadius: "12px", border: "1px solid #e9e8e7",
      overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      {collectorateName ? (
        <>
          <div style={{ height: "110px", overflow: "hidden" }}>
            <iframe
              title="Pickup location"
              width="100%" height="110"
              style={{ border: 0, display: "block", filter: "grayscale(0.2)" }}
              loading="lazy"
              allowFullScreen
              src={`https://maps.google.com/maps?q=${mapQuery}&output=embed&z=15`}
            />
          </div>
          <div style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2" strokeLinecap="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Card Pickup Location
              </span>
            </div>
            <p style={{ fontSize: "14px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 2px" }}>
              {collectorateName} Tax Office
            </p>
            {collectorateAddress && (
              <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 2px" }}>{collectorateAddress}</p>
            )}
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 10px" }}>
              {approvedApp ? "Your physical card is ready for collection." : "Your registered collectorate office."}
            </p>
            <a
              href={`https://maps.google.com/?q=${mapQuery}`}
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: "13px", fontWeight: "600", color: BRAND.primary, textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}
            >
              Get Directions
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
          </div>
        </>
      ) : (
        <div style={{ padding: "18px 16px", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{
            width: "44px", height: "44px", borderRadius: "10px", background: "#f5f3f2",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: "13px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 3px" }}>No Pickup Location Set</p>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>
              Your collectorate will appear here once your application is submitted.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}