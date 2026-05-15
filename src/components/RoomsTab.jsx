import { useEffect, useState } from "react";
import { deleteRoom, loadRooms, saveRoom } from "../lib/firestoreData";

// ─── 스타일 ──────────────────────────────────────────────────────────────────

const s = {
  pageHeader:  { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1rem" },
  eyebrow:     { fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 },
  pageTitle:   { fontSize: "1.5rem", fontWeight: 800, color: "#111827", margin: "0.1rem 0 0" },
  btnRow:      { display: "flex", gap: "0.5rem", alignItems: "center" },
  primaryBtn:  { padding: "0.45rem 1rem", backgroundColor: "#4f46e5", color: "#fff", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 },
  outlineBtn:  { padding: "0.45rem 1rem", backgroundColor: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: "7px", cursor: "pointer", fontSize: "0.85rem" },
  editBtn:     { padding: "0.2rem 0.55rem", backgroundColor: "#fff", color: "#4f46e5", border: "1px solid #c7d2fe", borderRadius: "5px", cursor: "pointer", fontSize: "0.75rem" },
  dangerBtn:   { padding: "0.2rem 0.55rem", backgroundColor: "#fff", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "5px", cursor: "pointer", fontSize: "0.75rem" },

  notice:      { padding: "0.6rem 1rem", borderRadius: "7px", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.75rem" },
  noticeOk:    { backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" },
  noticeErr:   { backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },

  tableWrap:   { overflowX: "auto" },
  table:       { width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" },
  thead:       { backgroundColor: "#f9fafb" },
  th:          { padding: "0.5rem 0.75rem", fontWeight: 700, color: "#374151", textAlign: "left", borderBottom: "2px solid #e5e7eb", fontSize: "0.8rem", whiteSpace: "nowrap" },
  thRight:     { padding: "0.5rem 0.75rem", fontWeight: 700, color: "#374151", textAlign: "right", borderBottom: "2px solid #e5e7eb", fontSize: "0.8rem", whiteSpace: "nowrap" },
  thCenter:    { padding: "0.5rem 0.75rem", fontWeight: 700, color: "#374151", textAlign: "center", borderBottom: "2px solid #e5e7eb", fontSize: "0.8rem", whiteSpace: "nowrap" },
  tr:          { borderBottom: "1px solid #f3f4f6" },
  td:          { padding: "0.5rem 0.75rem", color: "#111827", verticalAlign: "middle" },
  tdRight:     { padding: "0.5rem 0.75rem", color: "#374151", textAlign: "right", verticalAlign: "middle" },
  tdCenter:    { padding: "0.5rem 0.75rem", textAlign: "center", verticalAlign: "middle" },
  tdMuted:     { padding: "0.5rem 0.75rem", color: "#9ca3af", fontSize: "0.82rem", verticalAlign: "middle" },
  emptyRow:    { textAlign: "center", padding: "3rem", color: "#9ca3af", fontSize: "0.9rem" },
  totalRow:    { padding: "0.5rem 0.75rem", fontSize: "0.82rem", color: "#6b7280", borderTop: "2px solid #e5e7eb", textAlign: "right" },

  // 모달
  backdrop:    { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal:       { backgroundColor: "#fff", borderRadius: "12px", padding: "1.5rem", width: "min(400px, 95vw)", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" },
  modalTitle:  { fontSize: "1.1rem", fontWeight: 800, color: "#111827", margin: "0 0 1.25rem" },
  fieldGroup:  { marginBottom: "1rem" },
  label:       { display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem" },
  input:       { width: "100%", padding: "0.45rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "0.875rem", boxSizing: "border-box", outline: "none" },
  inputSm:     { width: "120px", padding: "0.45rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "0.875rem", outline: "none" },
  hint:        { fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.25rem" },
  modalActions:{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.25rem" },
};

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function RoomsTab({ schoolId }) {
  const [rooms, setRooms]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice]   = useState(null); // { msg, ok }
  const [modal, setModal]     = useState(null);  // null | { mode: "add" | "edit", room? }

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    loadRooms(schoolId)
      .then((data) => setRooms(data.sort((a, b) => a.name.localeCompare(b.name, "ko"))))
      .catch(() => flash("고사실 목록을 불러오지 못했습니다.", false))
      .finally(() => setLoading(false));
  }, [schoolId]);

  function flash(msg, ok = true) {
    setNotice({ msg, ok });
    setTimeout(() => setNotice(null), 3000);
  }

  function openAdd() {
    setModal({ mode: "add", room: { name: "", capacity: "" } });
  }

  function openEdit(room) {
    setModal({ mode: "edit", room: { ...room, capacity: String(room.capacity) } });
  }

  function closeModal() {
    setModal(null);
  }

  async function handleSave(formData) {
    const name     = formData.name.trim();
    const capacity = Number(formData.capacity);
    if (!name)          return flash("고사실명을 입력하세요.", false);
    if (capacity < 1)   return flash("최대 인원은 1명 이상이어야 합니다.", false);

    try {
      if (modal.mode === "add") {
        const savedId = await saveRoom(schoolId, { name, capacity });
        setRooms((prev) =>
          [...prev, { id: savedId, name, capacity }].sort((a, b) => a.name.localeCompare(b.name, "ko")),
        );
        flash("고사실이 추가되었습니다.");
      } else {
        await saveRoom(schoolId, { id: formData.id, name, capacity });
        setRooms((prev) =>
          prev
            .map((r) => (r.id === formData.id ? { id: formData.id, name, capacity } : r))
            .sort((a, b) => a.name.localeCompare(b.name, "ko")),
        );
        flash("고사실이 수정되었습니다.");
      }
      closeModal();
    } catch {
      flash("저장 중 오류가 발생했습니다.", false);
    }
  }

  async function handleDelete(room) {
    if (!window.confirm(`"${room.name}" 고사실을 삭제하시겠습니까?`)) return;
    try {
      await deleteRoom(schoolId, room.id);
      setRooms((prev) => prev.filter((r) => r.id !== room.id));
      flash("고사실이 삭제되었습니다.");
    } catch {
      flash("삭제 중 오류가 발생했습니다.", false);
    }
  }

  const totalCapacity = rooms.reduce((sum, r) => sum + (Number(r.capacity) || 0), 0);

  return (
    <div>
      {/* ── 페이지 헤더 ── */}
      <div style={s.pageHeader}>
        <div>
          <p style={s.eyebrow}>기초 데이터</p>
          <h2 style={s.pageTitle}>고사실 관리</h2>
        </div>
        <div style={s.btnRow}>
          <button style={s.primaryBtn} onClick={openAdd}>+ 고사실 추가</button>
        </div>
      </div>

      {/* ── 알림 ── */}
      {notice && (
        <div style={{ ...s.notice, ...(notice.ok ? s.noticeOk : s.noticeErr) }}>
          {notice.msg}
        </div>
      )}

      {/* ── 테이블 ── */}
      {loading ? (
        <p style={s.emptyRow}>불러오는 중...</p>
      ) : rooms.length === 0 ? (
        <p style={s.emptyRow}>
          등록된 고사실이 없습니다.<br />
          <span style={{ fontSize: "0.82rem" }}>오른쪽 상단 '+ 고사실 추가' 버튼으로 추가하세요.</span>
        </p>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead style={s.thead}>
              <tr>
                <th style={s.th}>고사실명</th>
                <th style={s.thRight}>최대 인원</th>
                <th style={s.thCenter}>수정</th>
                <th style={s.thCenter}>삭제</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id} style={s.tr}>
                  <td style={s.td}>{room.name}</td>
                  <td style={s.tdRight}>{room.capacity}명</td>
                  <td style={s.tdCenter}>
                    <button style={s.editBtn} onClick={() => openEdit(room)}>수정</button>
                  </td>
                  <td style={s.tdCenter}>
                    <button style={s.dangerBtn} onClick={() => handleDelete(room)}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={s.totalRow}>
            총 {rooms.length}개 고사실 · 전체 수용 인원 {totalCapacity}명
          </div>
        </div>
      )}

      {/* ── 추가/수정 모달 ── */}
      {modal && (
        <RoomModal
          mode={modal.mode}
          initial={modal.room}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

// ─── 고사실 추가/수정 모달 ───────────────────────────────────────────────────

function RoomModal({ mode, initial, onSave, onClose }) {
  const [form, setForm]   = useState(initial);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div style={s.backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <h3 style={s.modalTitle}>{mode === "add" ? "고사실 추가" : "고사실 수정"}</h3>

        <div style={s.fieldGroup}>
          <label style={s.label}>고사실명</label>
          <input
            style={s.input}
            placeholder="예: 1층 1고사실"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus
          />
        </div>

        <div style={s.fieldGroup}>
          <label style={s.label}>최대 인원</label>
          <input
            type="number"
            min={1}
            max={100}
            style={s.inputSm}
            placeholder="30"
            value={form.capacity}
            onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <p style={s.hint}>고사실에 배치할 수 있는 최대 학생 수</p>
        </div>

        <div style={s.modalActions}>
          <button style={s.outlineBtn} onClick={onClose} disabled={saving}>취소</button>
          <button style={s.primaryBtn} onClick={submit} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
