import { useEffect, useState } from "react";
import { deleteRoom, loadRooms, saveRoom } from "../lib/firestoreData";

const EMPTY_FORM = { name: "", capacity: "" };

/**
 * @param {{ schoolId: string }} props
 */
export default function RoomsTab({ schoolId }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // 편집 상태: null = 폼 닫힘 / "new" = 신규 추가 / room.id = 수정 중
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // ── 데이터 로드 ──────────────────────────────────────────
  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    loadRooms(schoolId)
      .then((data) => {
        setRooms(data.sort((a, b) => a.name.localeCompare(b.name, "ko")));
        setError("");
      })
      .catch(() => setError("고사실 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [schoolId]);

  function flash(msg, isError = false) {
    if (isError) {
      setError(msg);
      setSuccess("");
    } else {
      setSuccess(msg);
      setError("");
    }
    setTimeout(() => {
      setError("");
      setSuccess("");
    }, 3000);
  }

  // ── 폼 열기 ─────────────────────────────────────────────
  function openNew() {
    setEditingId("new");
    setForm(EMPTY_FORM);
  }

  function openEdit(room) {
    setEditingId(room.id);
    setForm({ name: room.name, capacity: String(room.capacity) });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  // ── 저장 ────────────────────────────────────────────────
  async function handleSave() {
    const name = form.name.trim();
    const capacity = Number(form.capacity);
    if (!name) return flash("고사실명을 입력하세요.", true);
    if (!capacity || capacity < 1) return flash("최대 인원은 1명 이상이어야 합니다.", true);

    setSaving(true);
    try {
      const roomData = editingId === "new"
        ? { name, capacity }
        : { id: editingId, name, capacity };
      const savedId = await saveRoom(schoolId, roomData);
      const updated = editingId === "new"
        ? [...rooms, { id: savedId, name, capacity }]
        : rooms.map((r) => (r.id === editingId ? { id: editingId, name, capacity } : r));
      setRooms(updated.sort((a, b) => a.name.localeCompare(b.name, "ko")));
      cancelEdit();
      flash(editingId === "new" ? "고사실이 추가되었습니다." : "고사실이 수정되었습니다.");
    } catch {
      flash("저장 중 오류가 발생했습니다.", true);
    } finally {
      setSaving(false);
    }
  }

  // ── 삭제 ────────────────────────────────────────────────
  async function handleDelete(room) {
    if (!window.confirm(`"${room.name}" 고사실을 삭제하시겠습니까?`)) return;
    try {
      await deleteRoom(schoolId, room.id);
      setRooms((prev) => prev.filter((r) => r.id !== room.id));
      flash("고사실이 삭제되었습니다.");
    } catch {
      flash("삭제 중 오류가 발생했습니다.", true);
    }
  }

  // ── 렌더 ────────────────────────────────────────────────
  return (
    <div className="panel">
      {/* 메시지 */}
      {error && (
        <p className="top-message error mb-3">{error}</p>
      )}
      {success && (
        <p className="top-message mb-3" style={{ background: "#f0fdf4", color: "#15803d" }}>
          {success}
        </p>
      )}

      {/* 섹션 헤더 */}
      <div className="section-head">
        <h2>고사실 관리</h2>
        {editingId === null && (
          <button type="button" className="primary-button" onClick={openNew}>
            + 고사실 추가
          </button>
        )}
      </div>

      {/* 신규 추가 인라인 폼 */}
      {editingId === "new" && (
        <InlineForm
          form={form}
          setForm={setForm}
          onSave={handleSave}
          onCancel={cancelEdit}
          saving={saving}
        />
      )}

      {/* 테이블 */}
      {loading ? (
        <p className="text-slate-500 text-sm py-6 text-center">불러오는 중...</p>
      ) : rooms.length === 0 ? (
        <p className="text-slate-400 text-sm py-6 text-center">등록된 고사실이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-left">
                <th className="pb-2 pr-4 font-semibold">고사실명</th>
                <th className="pb-2 pr-4 font-semibold text-right">최대인원</th>
                <th className="pb-2 pr-2 font-semibold text-center">수정</th>
                <th className="pb-2 font-semibold text-center">삭제</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <>
                  <tr
                    key={room.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-2 pr-4 font-medium">{room.name}</td>
                    <td className="py-2 pr-4 text-right text-slate-600">{room.capacity}명</td>
                    <td className="py-2 pr-2 text-center">
                      <button
                        type="button"
                        className="secondary-button text-xs px-3 py-1"
                        onClick={() => openEdit(room)}
                        disabled={editingId !== null}
                      >
                        수정
                      </button>
                    </td>
                    <td className="py-2 text-center">
                      <button
                        type="button"
                        className="text-xs px-3 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        onClick={() => handleDelete(room)}
                        disabled={editingId !== null}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                  {/* 수정 인라인 폼 */}
                  {editingId === room.id && (
                    <tr key={`${room.id}-edit`}>
                      <td colSpan={4} className="py-2">
                        <InlineForm
                          form={form}
                          setForm={setForm}
                          onSave={handleSave}
                          onCancel={cancelEdit}
                          saving={saving}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── 인라인 폼 서브컴포넌트 ────────────────────────────────
function InlineForm({ form, setForm, onSave, onCancel, saving }) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 my-2">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500">고사실명</label>
        <input
          type="text"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-52"
          placeholder="예: 2층 1고사실"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500">최대인원</label>
        <input
          type="number"
          min={1}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-24"
          placeholder="30"
          value={form.capacity}
          onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="primary-button"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onCancel}
          disabled={saving}
        >
          취소
        </button>
      </div>
    </div>
  );
}
