import { useEffect, useState } from "react";
import { deleteRoom, loadRooms, saveRoom } from "../lib/firestoreData";

// ─── 스타일 ──────────────────────────────────────────────────────────────────

const s = {
  pageHeader:   { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1rem" },
  eyebrow:      { fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 },
  pageTitle:    { fontSize: "1.5rem", fontWeight: 800, color: "#111827", margin: "0.1rem 0 0" },

  primaryBtn:   { padding: "0.4rem 0.85rem", backgroundColor: "#4f46e5", color: "#fff", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 },
  outlineBtn:   { padding: "0.4rem 0.85rem", backgroundColor: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: "7px", cursor: "pointer", fontSize: "0.82rem" },

  notice:       { padding: "0.6rem 1rem", borderRadius: "7px", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.75rem" },
  noticeOk:     { backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" },
  noticeErr:    { backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },

  // 2컬럼 레이아웃
  twoCol:       { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" },

  // 섹션 패널
  panel:        { border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden" },
  panelHdr:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.7rem 0.9rem", backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" },
  panelTitle:   { fontSize: "0.85rem", fontWeight: 700, color: "#111827", margin: 0 },
  panelDesc:    { fontSize: "0.72rem", color: "#6b7280", margin: "0.1rem 0 0" },

  // 테이블
  table:        { width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" },
  thead:        { backgroundColor: "#f9fafb" },
  th:           { padding: "0.45rem 0.7rem", fontWeight: 700, color: "#6b7280", textAlign: "left", borderBottom: "1px solid #e5e7eb", fontSize: "0.72rem", whiteSpace: "nowrap" },
  thCenter:     { padding: "0.45rem 0.7rem", fontWeight: 700, color: "#6b7280", textAlign: "center", borderBottom: "1px solid #e5e7eb", fontSize: "0.72rem", whiteSpace: "nowrap" },
  thRight:      { padding: "0.45rem 0.7rem", fontWeight: 700, color: "#6b7280", textAlign: "right", borderBottom: "1px solid #e5e7eb", fontSize: "0.72rem", whiteSpace: "nowrap" },
  tr:           { borderBottom: "1px solid #f3f4f6" },
  td:           { padding: "0.35rem 0.7rem", color: "#111827", verticalAlign: "middle", fontSize: "0.82rem" },
  tdCenter:     { padding: "0.35rem 0.7rem", textAlign: "center", verticalAlign: "middle" },
  tdRight:      { padding: "0.35rem 0.5rem", textAlign: "right", verticalAlign: "middle" },
  emptyBox:     { textAlign: "center", padding: "1.75rem 1rem", color: "#9ca3af", fontSize: "0.8rem" },

  // 인라인 입력 — 상태별 스타일은 동적으로
  cellInput:    { padding: "0.2rem 0.3rem", border: "1px solid #d1d5db", borderRadius: "5px", fontSize: "0.8rem", textAlign: "center", outline: "none", width: "100%", boxSizing: "border-box", transition: "border-color 0.15s, background-color 0.15s" },

  // 아이콘 버튼
  iconBtn:      { padding: "0.25rem", background: "none", border: "none", borderRadius: "4px", cursor: "pointer", display: "inline-flex", alignItems: "center" },
  iconBtnRow:   { display: "flex", gap: "0.1rem", justifyContent: "flex-end" },

  // 모달
  backdrop:     { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal:        { backgroundColor: "#fff", borderRadius: "12px", padding: "1.5rem", width: "min(380px, 95vw)", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" },
  modalTitle:   { fontSize: "1.05rem", fontWeight: 800, color: "#111827", margin: "0 0 1.1rem" },
  fieldRow:     { display: "grid", gridTemplateColumns: "1fr 80px", gap: "0.6rem", marginBottom: "1rem" },
  fieldGroup:   { marginBottom: "1rem" },
  label:        { display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.3rem" },
  input:        { width: "100%", padding: "0.4rem 0.65rem", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "0.875rem", boxSizing: "border-box", outline: "none" },
  hint:         { fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.2rem" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.1rem" },

  // 자동 생성 모달
  classGrid:    { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.35rem" },
  classCard:    { border: "1px solid #e5e7eb", borderRadius: "6px", padding: "0.4rem 0.5rem" },
  classCardNew: { border: "1px solid #c7d2fe", borderRadius: "6px", padding: "0.4rem 0.5rem", backgroundColor: "#eef2ff" },
  className:    { fontSize: "0.78rem", fontWeight: 700, color: "#111827", display: "block" },
  classCount:   { fontSize: "0.68rem", color: "#6b7280" },
  classDone:    { fontSize: "0.65rem", color: "#9ca3af" },
};

// ─── 아이콘 ───────────────────────────────────────────────────────────────────

const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

// ─── 인라인 편집 셀 ───────────────────────────────────────────────────────────
// status: "idle" | "saving" | "saved" | "error"

function EditableNumberCell({ value, onSave, width = "52px", min, max, placeholder = "—" }) {
  const [val, setVal]       = useState(value != null ? String(value) : "");
  const [status, setStatus] = useState("idle");

  useEffect(() => { setVal(value != null ? String(value) : ""); }, [value]);

  async function handleBlur() {
    const num = val === "" ? null : Number(val);
    const unchanged = (num == null && value == null) || num === value;
    if (unchanged) return;
    setStatus("saving");
    try {
      await onSave(num);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1800);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  const border =
    status === "saving" ? "1px solid #a5b4fc" :
    status === "saved"  ? "1px solid #86efac" :
    status === "error"  ? "1px solid #fca5a5" :
    "1px solid #d1d5db";
  const bg =
    status === "saved"  ? "#f0fdf4" :
    status === "error"  ? "#fef2f2" : "#fff";

  return (
    <td style={s.tdCenter}>
      <input
        type="number" min={min} max={max}
        style={{ ...s.cellInput, width, border, backgroundColor: bg }}
        value={val}
        placeholder={placeholder}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        title={status === "saved" ? "저장됨 ✓" : "입력 후 Enter 또는 Tab"}
      />
    </td>
  );
}

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function detectClasses(students) {
  const map = {};
  students.forEach((s) => {
    const key = `${s.grade}-${s.classNo}`;
    if (!map[key]) map[key] = { grade: String(s.grade), classNo: String(s.classNo), count: 0 };
    map[key].count++;
  });
  return Object.values(map).sort((a, b) =>
    a.grade !== b.grade ? Number(a.grade) - Number(b.grade) : Number(a.classNo) - Number(b.classNo),
  );
}

const classRoomName = (grade, classNo) => `${grade}-${classNo}반`;

function sortRooms(list) {
  return [...list].sort((a, b) => {
    if (a.roomType === "class" && b.roomType !== "class") return -1;
    if (a.roomType !== "class" && b.roomType === "class") return 1;
    return a.name.localeCompare(b.name, "ko");
  });
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function RoomsTab({ schoolId, students = [], readOnly = false }) {
  const [rooms, setRooms]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [notice, setNotice]       = useState(null);
  const [modal, setModal]         = useState(null);
  const [autoModal, setAutoModal] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    loadRooms(schoolId)
      .then((data) => setRooms(sortRooms(data)))
      .catch(() => flash("고사실 목록을 불러오지 못했습니다.", false))
      .finally(() => setLoading(false));
  }, [schoolId]);

  function flash(msg, ok = true) {
    setNotice({ msg, ok });
    setTimeout(() => setNotice(null), 3000);
  }

  async function handleSave(formData) {
    const name     = formData.name.trim();
    const capacity = Number(formData.capacity);
    const floor    = formData.floor !== "" && formData.floor != null ? Number(formData.floor) : null;
    if (!name)        return flash("고사실명을 입력하세요.", false);
    if (capacity < 1) return flash("최대 인원은 1명 이상이어야 합니다.", false);

    const roomData = { name, capacity, floor, roomType: formData.roomType ?? "extra" };
    try {
      if (modal.mode === "edit") {
        await saveRoom(schoolId, { id: formData.id, ...roomData });
        setRooms((prev) => sortRooms(prev.map((r) => r.id === formData.id ? { id: formData.id, ...roomData } : r)));
        flash("수정되었습니다.");
      } else {
        const id = await saveRoom(schoolId, roomData);
        setRooms((prev) => sortRooms([...prev, { id, ...roomData }]));
        flash("추가되었습니다.");
      }
      setModal(null);
    } catch {
      flash("저장 중 오류가 발생했습니다.", false);
    }
  }

  // 인라인 저장 — 단일 필드
  async function patchRoom(roomId, patch) {
    await saveRoom(schoolId, { id: roomId, ...patch });
    setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, ...patch } : r));
  }

  async function handleDelete(room) {
    if (!window.confirm(`"${room.name}" 고사실을 삭제하시겠습니까?`)) return;
    try {
      await deleteRoom(schoolId, room.id);
      setRooms((prev) => prev.filter((r) => r.id !== room.id));
      flash("삭제되었습니다.");
    } catch {
      flash("삭제 중 오류가 발생했습니다.", false);
    }
  }

  async function handleAutoGenerate(toCreate) {
    try {
      const saved = [];
      for (const cls of toCreate) {
        const name = classRoomName(cls.grade, cls.classNo);
        const id   = await saveRoom(schoolId, { name, capacity: cls.count, floor: null, roomType: "class" });
        saved.push({ id, name, capacity: cls.count, floor: null, roomType: "class" });
      }
      setRooms((prev) => sortRooms([...prev, ...saved]));
      setAutoModal(false);
      flash(`${saved.length}개 학급 고사실이 생성되었습니다.`);
    } catch {
      flash("생성 중 오류가 발생했습니다.", false);
    }
  }

  const classRooms   = rooms.filter((r) => r.roomType === "class");
  const extraRooms   = rooms.filter((r) => r.roomType === "extra" || (!r.roomType));
  const waitingRooms = rooms.filter((r) => r.roomType === "waiting");
  const detectedClasses = detectClasses(students);
  const existingClassNames = new Set(classRooms.map((r) => r.name));
  const newClasses = detectedClasses.filter((c) => !existingClassNames.has(classRoomName(c.grade, c.classNo)));
  const totalCapacity = rooms.reduce((sum, r) => sum + (Number(r.capacity) || 0), 0);

  if (loading) return <p style={{ textAlign: "center", padding: "3rem", color: "#9ca3af" }}>불러오는 중...</p>;

  const openEdit = (room) => setModal({
    mode: "edit",
    room: { ...room, capacity: String(room.capacity), floor: room.floor != null ? String(room.floor) : "" },
  });

  return (
    <div>
      {/* ── 페이지 헤더 ── */}
      <div style={s.pageHeader}>
        <div>
          <p style={s.eyebrow}>기초 데이터</p>
          <h2 style={s.pageTitle}>고사실 관리</h2>
        </div>
        <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>
          전체 {rooms.length}개 · 수용 인원 {totalCapacity}명
        </span>
      </div>

      {notice && (
        <div style={{ ...s.notice, ...(notice.ok ? s.noticeOk : s.noticeErr) }}>{notice.msg}</div>
      )}

      {/* ── 2컬럼: 학급 교실 / 추가 고사실 ── */}
      <div style={s.twoCol}>

        {/* 학급 교실 */}
        <div style={s.panel}>
          <div style={s.panelHdr}>
            <div>
              <p style={s.panelTitle}>학급 교실</p>
              <p style={s.panelDesc}>층·인원은 셀에서 바로 편집 후 Enter</p>
            </div>
            {!readOnly && newClasses.length > 0 && (
              <button style={s.primaryBtn} onClick={() => setAutoModal(true)}>
                자동 생성 ({newClasses.length})
              </button>
            )}
          </div>

          {classRooms.length === 0 ? (
            <div style={s.emptyBox}>
              {students.length === 0
                ? "학생 명렬 등록 후 자동 생성 가능합니다."
                : `${newClasses.length}개 학급 감지됨 → 자동 생성 버튼`}
            </div>
          ) : (
            <RoomTable rooms={classRooms} onEdit={readOnly ? null : openEdit} onDelete={readOnly ? null : handleDelete} onPatch={readOnly ? null : patchRoom} readOnly={readOnly} />
          )}
        </div>

        {/* 오른쪽: 추가 고사실 + 대기실 세로 스택 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* 추가 고사실 */}
          <div style={s.panel}>
            <div style={s.panelHdr}>
              <div>
                <p style={s.panelTitle}>추가 고사실</p>
                <p style={s.panelDesc}>교과교실, 특별실 등</p>
              </div>
              {!readOnly && (
                <button style={s.primaryBtn} onClick={() => setModal({ mode: "add", room: { name: "", capacity: "", floor: "", roomType: "extra" } })}>
                  + 추가
                </button>
              )}
            </div>
            {extraRooms.length === 0 ? (
              <div style={s.emptyBox}>등록된 추가 고사실이 없습니다.</div>
            ) : (
              <RoomTable rooms={extraRooms} onEdit={readOnly ? null : openEdit} onDelete={readOnly ? null : handleDelete} onPatch={readOnly ? null : patchRoom} readOnly={readOnly} />
            )}
          </div>

          {/* 대기실 */}
          <div style={s.panel}>
            <div style={s.panelHdr}>
              <div>
                <p style={s.panelTitle}>대기실</p>
                <p style={s.panelDesc}>교시 공백 학생 대기 공간</p>
              </div>
              {!readOnly && (
                <button style={s.primaryBtn} onClick={() => setModal({ mode: "add", room: { name: "", capacity: "", floor: "", roomType: "waiting" } })}>
                  + 추가
                </button>
              )}
            </div>
            {waitingRooms.length === 0 ? (
              <div style={s.emptyBox}>등록된 대기실이 없습니다.</div>
            ) : (
              <RoomTable rooms={waitingRooms} onEdit={readOnly ? null : openEdit} onDelete={readOnly ? null : handleDelete} onPatch={readOnly ? null : patchRoom} readOnly={readOnly} />
            )}
          </div>

        </div>
      </div>

      {modal && <RoomModal mode={modal.mode} initial={modal.room} onSave={handleSave} onClose={() => setModal(null)} />}
      {autoModal && <AutoGenerateModal detectedClasses={detectedClasses} existingClassNames={existingClassNames} newClasses={newClasses} onConfirm={handleAutoGenerate} onClose={() => setAutoModal(false)} />}
    </div>
  );
}

// ─── 테이블 컴포넌트 ──────────────────────────────────────────────────────────

function RoomTable({ rooms, onEdit, onDelete, onPatch, readOnly = false }) {
  return (
    <table style={s.table}>
      <thead style={s.thead}>
        <tr>
          <th style={s.th}>고사실명</th>
          <th style={s.thCenter}>층</th>
          <th style={s.thCenter}>최대 인원</th>
          <th style={{ ...s.thRight, width: "60px" }}></th>
        </tr>
      </thead>
      <tbody>
        {rooms.map((room) => (
          <tr key={room.id} style={s.tr}>
            <td style={s.td}>{room.name}</td>
            <EditableNumberCell
              value={room.floor}
              width="46px"
              min={1} max={20}
              placeholder="—"
              onSave={(v) => onPatch(room.id, { floor: v })}
            />
            <EditableNumberCell
              value={room.capacity}
              width="52px"
              min={1} max={100}
              placeholder="30"
              onSave={(v) => onPatch(room.id, { capacity: v ?? 0 })}
            />
            <td style={s.tdRight}>
              {!readOnly && (
                <div style={s.iconBtnRow}>
                  <button style={s.iconBtn} onClick={() => onEdit(room)} title="수정"><PencilIcon /></button>
                  <button style={s.iconBtn} onClick={() => onDelete(room)} title="삭제"><TrashIcon /></button>
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── 추가/수정 모달 ───────────────────────────────────────────────────────────

function RoomModal({ mode, initial, onSave, onClose }) {
  const [form, setForm]     = useState(initial);
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
            placeholder="예: 미술실, 물리실험실"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            autoFocus
          />
        </div>

        <div style={s.fieldRow}>
          <div>
            <label style={s.label}>최대 인원</label>
            <input type="number" min={1} max={100} style={s.input} placeholder="30"
              value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
          </div>
          <div>
            <label style={s.label}>층</label>
            <input type="number" min={1} max={20} style={s.input} placeholder="3"
              value={form.floor ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && submit()} />
          </div>
        </div>
        <p style={s.hint}>층은 나중에 테이블에서 직접 입력해도 됩니다.</p>

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

// ─── 자동 생성 모달 ───────────────────────────────────────────────────────────

function AutoGenerateModal({ detectedClasses, existingClassNames, newClasses, onConfirm, onClose }) {
  const [generating, setGenerating] = useState(false);

  async function handleConfirm() {
    setGenerating(true);
    await onConfirm(newClasses);
    setGenerating(false);
  }

  return (
    <div style={s.backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.modal, width: "min(460px, 95vw)" }}>
        <h3 style={s.modalTitle}>학급 교실 자동 생성</h3>
        <p style={{ fontSize: "0.8rem", color: "#6b7280", margin: "0 0 0.9rem" }}>
          파란 카드가 새로 추가될 학급입니다. 최대 인원은 해당 반 학생 수로 설정됩니다.
        </p>

        <div style={s.classGrid}>
          {detectedClasses.map((cls) => {
            const name   = classRoomName(cls.grade, cls.classNo);
            const exists = existingClassNames.has(name);
            return (
              <div key={name} style={exists ? s.classCard : s.classCardNew}>
                <span style={s.className}>{name}</span>
                <span style={s.classCount}>{cls.count}명</span>
                {exists && <span style={s.classDone}> · 등록됨</span>}
              </div>
            );
          })}
        </div>

        <div style={s.modalActions}>
          <button style={s.outlineBtn} onClick={onClose} disabled={generating}>취소</button>
          <button style={s.primaryBtn} onClick={handleConfirm} disabled={generating}>
            {generating ? "생성 중..." : `${newClasses.length}개 생성`}
          </button>
        </div>
      </div>
    </div>
  );
}
