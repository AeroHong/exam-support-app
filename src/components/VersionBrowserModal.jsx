import { useEffect, useState } from "react";
import { loadVersions } from "../lib/firestorePlanner";

const s = {
  backdrop:    { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal:       { backgroundColor: "#fff", borderRadius: "12px", padding: "1.5rem", width: "min(560px, 95vw)", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" },
  title:       { fontSize: "1.1rem", fontWeight: 800, color: "#111827", margin: "0 0 0.25rem" },
  subtitle:    { fontSize: "0.78rem", color: "#9ca3af", margin: "0 0 1.25rem" },
  listWrap:    { flex: 1, overflowY: "auto" },
  emptyMsg:    { textAlign: "center", color: "#9ca3af", fontSize: "0.875rem", padding: "2.5rem 0", lineHeight: 1.8 },
  row:         { display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.65rem 0", borderBottom: "1px solid #f3f4f6" },
  info:        { flex: 1, minWidth: 0 },
  planName:    { fontSize: "0.875rem", fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  meta:        { fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.15rem" },
  btnGroup:    { display: "flex", gap: "0.4rem", flexShrink: 0 },
  loadBtn:     { padding: "0.25rem 0.65rem", backgroundColor: "#4f46e5", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 },
  dupeBtn:     { padding: "0.25rem 0.65rem", backgroundColor: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: "5px", cursor: "pointer", fontSize: "0.75rem" },
  footer:      { display: "flex", justifyContent: "flex-end", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #e5e7eb" },
  outlineBtn:  { padding: "0.35rem 0.85rem", backgroundColor: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: "7px", cursor: "pointer", fontSize: "0.82rem" },
};

function formatDate(timestamp) {
  if (!timestamp) return "-";
  try {
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return d.toLocaleString("ko-KR", {
      year: "2-digit", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

export default function VersionBrowserModal({ schoolId, currentPlanId, onLoad, onDuplicate, onClose }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    loadVersions({ schoolId, planId: currentPlanId })
      .then(setVersions)
      .catch(() => setError("저장 기록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [schoolId, currentPlanId]);

  return (
    <div style={s.backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <h3 style={s.title}>저장 기록</h3>
        <p style={s.subtitle}>최근 10개 수동 저장 기록 · '복제'는 새 작업본으로 시작합니다</p>

        <div style={s.listWrap}>
          {loading ? (
            <p style={s.emptyMsg}>불러오는 중...</p>
          ) : error ? (
            <p style={{ ...s.emptyMsg, color: "#dc2626" }}>{error}</p>
          ) : versions.length === 0 ? (
            <p style={s.emptyMsg}>
              저장된 기록이 없습니다.<br />
              <span style={{ fontSize: "0.75rem" }}>'저장' 버튼을 누르면 현재 작업본을 기록합니다.</span>
            </p>
          ) : (
            versions.map((v) => (
              <div key={v.id} style={s.row}>
                <div style={s.info}>
                  <div style={s.planName}>{v.planName || "(이름 없음)"}</div>
                  <div style={s.meta}>
                    {formatDate(v.savedAt)} · {v.dayCount}일 · {v.sessionCount}과목
                  </div>
                </div>
                <div style={s.btnGroup}>
                  <button style={s.loadBtn} onClick={() => onLoad(v)}>불러오기</button>
                  <button style={s.dupeBtn} onClick={() => onDuplicate(v)}>복제</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={s.footer}>
          <button style={s.outlineBtn} onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}
