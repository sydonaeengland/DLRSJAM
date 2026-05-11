// Modal that renders a document image or PDF when the officer clicks view.
import { useState, useEffect } from "react";
import api from "../../../services/api";
import styles from "./DocPreviewModal.module.css";

const Ico = ({ d, size = 16, stroke = "currentColor", sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const XIcon        = p => <Ico {...p} d="M18 6L6 18M6 6l12 12" />;
const DownloadIcon = p => <Ico {...p} d={["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M7 10l5 5 5-5","M12 15V3"]} />;
const FileIcon     = p => <Ico {...p} d={["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z","M14 2v6h6"]} />;

export default function DocPreviewModal({ doc, appId, onClose }) {
  const [blobUrl,  setBlobUrl]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);

  const isPdf = doc.original_filename?.toLowerCase().endsWith(".pdf");

  useEffect(() => {
    let url;
    api.get(`/api/officer/applications/${appId}/documents/${doc.id}/file`, { responseType: "blob" })
      .then(res => {
        url = URL.createObjectURL(res.data);
        setBlobUrl(url);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [appId, doc.id]);

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = doc.original_filename || "document";
    a.click();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <p className={styles.headerTitle}>{doc.doc_type?.replace(/_/g, " ")}</p>
            <p className={styles.headerSub}>{doc.original_filename}</p>
          </div>
          <div className={styles.headerActions}>
            <button onClick={handleDownload} disabled={!blobUrl} className={styles.downloadBtn}>
              <DownloadIcon size={13} stroke="currentColor" /> Download
            </button>
            <button className={styles.closeBtn} onClick={onClose}>
              <XIcon size={16} stroke="currentColor" />
            </button>
          </div>
        </div>

        <div className={styles.body}>
          {loading ? (
            <div className={styles.imgLoading}><div className={styles.spinner} /></div>
          ) : error || !blobUrl ? (
            <div className={styles.errorState}>
              <FileIcon size={36} stroke="#d1d5db" />
              <p className={styles.errorText}>Could not load preview</p>
            </div>
          ) : isPdf ? (
            <iframe src={blobUrl} className={styles.iframe} title="Document preview" />
          ) : (
            <div className={styles.imgWrap}>
              <img src={blobUrl} alt={doc.original_filename} className={styles.img} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}