import { useEffect, useState } from "react";
import { deleteSubject, loadSubjects, saveSubject } from "../lib/firestoreData";

const GRADE_FILTERS = [
  { key: "all", label: "전체" },
  { key: "1", label: "1학년" },
  { key: "2", label: "2학년" },
  { key: "3", label: "3학년" },
];

const EMPTY_FORM = {
  name: "",
  grade: "1",
  type: "common",
  hasExam: true,
  isEssay: false,
  duration: "45",
};

/**
 * @param {{ schoolId: string }} props
 */
export default function SubjectsTab({ schoolId }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");

  // 편집 상태: null = 폼 닫힘 / "new" = 신규 추가 / subject.id = 수정 중
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // ── 데이터 로드 ──────────────────────────────────────────
  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    loadSubjects(schoolId)
      .then((data) => {
        setSubjects(sortSubjects(data));
        setError("");
      })
      .catch(() => setError("과목 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [schoolId]);

  function sortSubjects(list) {
    return [...list].sort((a, b) => {
      if (a.grade !== b.grade) return a.grade - b.grade;
      return a.name.localeCompare(b.name, "ko");
    });
  }

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

  // ── 필터링된 목록 ────────────────────────────────────────
  const filtered = gradeFilter === "all"
    ? subjects
    : subjects.filter((s) => String(s.grade) === gradeFilter);

  // ── 폼 열기 ─────────────────────────────────────────────
  function openNew() {
    setEditingId("new");
    setForm(EMPTY_FORM);
  }

  function openEdit(subject) {
    setEditingId(subject.id);
    setForm({
      name: subject.name,
      grade: String(subject.grade),
      type: subject.type,
      hasExam: Boolean(subject.hasExam),
      isEssay: Boolean(subject.isEssay),
      duration: String(subject.duration),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  // ── 저장 ────────────────────────────────────────────────
  async function handleSave() {
    const name = form.name.trim();
    const grade = Number(form.grade);
    const duration = Number(form.duration);
    if (!name) return flash("과목명을 입력하세요.", true);
    if (![1, 2, 3].includes(grade)) return flash("학년을 선택하세요.", true);
    if (!duration || duration < 1) return flash("시험시간은 1분 이상이어야 합니다.", true);

    const subjectData = {
      ...(editingId !== "new" && { id: editingId }),
      name,
      grade,
      type: form.type,
      hasExam: form.hasExam,
      isEssay: form.isEssay,
      duration,
    };

    setSaving(true);
    try {
      const savedId = await saveSubject(schoolId, subjectData);
      const finalData = { ...subjectData, id: editingId === "new" ? savedId : editingId };
      const updated = editingId === "new"
        ? [...subjects, finalData]
        : subjects.map((s) => (s.id === editingId ? finalData : s));
      setSubjects(sortSubjects(updated));
      cancelEdit();
      flash(editingId === "new" ? "과목이 추가되었습니다." : "과목이 수정되었습니다.");
    } catch {
      flash("저장 중 오류가 발생했습니다.", true);
    } finally {
      setSaving(false);
    }
  }

  // ── 고사여부 즉시 토글 ───────────────────────────────────
  async function handleToggleExam(subject) {
    const updated = { ...subject, hasExam: !subject.hasExam };
    // 낙관적 업데이트
    setSubjects((prev) =>
      sortSubjects(prev.map((s) => (s.id === subject.id ? updated : s))),
    );
    try {
      await saveSubject(schoolId, updated);
    } catch {
      // 롤백
      setSubjects((prev) =>
        sortSubjects(prev.map((s) => (s.id === subject.id ? subject : s))),
      );
      flash("고사 여부 변경에 실패했습니다.", true);
    }
  }

  // ── 삭제 ────────────────────────────────────────────────
  async function handleDelete(subject) {
    if (!window.confirm(`"${subject.name}" 과목을 삭제하시겠습니까?`)) return;
    try {
      await deleteSubject(schoolId, subject.id);
      setSubjects((prev) => prev.filter((s) => s.id !== subject.id));
      flash("과목이 삭제되었습니다.");
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
        <h2>과목 관리</h2>
        {editingId === null && (
          <button type="button" className="primary-button" onClick={openNew}>
            + 과목 추가
          </button>
        )}
      </div>

      {/* 학년 필터 탭 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {GRADE_FILTERS.map((gf) => (
          <button
            key={gf.key}
            type="button"
            className={`chip ${gradeFilter === gf.key ? "chip-active" : ""}`}
            onClick={() => setGradeFilter(gf.key)}
          >
            {gf.label}
          </button>
        ))}
      </div>

      {/* 신규 추가 인라인 폼 */}
      {editingId === "new" && (
        <SubjectForm
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
      ) : filtered.length === 0 ? (
        <p className="text-slate-400 text-sm py-6 text-center">
          {gradeFilter === "all" ? "등록된 과목이 없습니다." : "해당 학년 과목이 없습니다."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-left">
                <th className="pb-2 pr-3 font-semibold">학년</th>
                <th className="pb-2 pr-3 font-semibold">과목명</th>
                <th className="pb-2 pr-3 font-semibold">구분</th>
                <th className="pb-2 pr-3 font-semibold text-center">고사여부</th>
                <th className="pb-2 pr-3 font-semibold text-center">서술형</th>
                <th className="pb-2 pr-3 font-semibold text-right">시험시간</th>
                <th className="pb-2 pr-2 font-semibold text-center">수정</th>
                <th className="pb-2 font-semibold text-center">삭제</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((subject) => (
                <>
                  <tr
                    key={subject.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-2 pr-3 text-slate-600">{subject.grade}학년</td>
                    <td className="py-2 pr-3 font-medium">{subject.name}</td>
                    <td className="py-2 pr-3 text-slate-600">
                      {subject.type === "common" ? "공통" : "선택"}
                    </td>
                    <td className="py-2 pr-3 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 cursor-pointer accent-amber-500"
                        checked={Boolean(subject.hasExam)}
                        onChange={() => handleToggleExam(subject)}
                        disabled={editingId !== null && editingId !== subject.id}
                        title="고사 여부를 바로 변경할 수 있습니다"
                      />
                    </td>
                    <td className="py-2 pr-3 text-center">
                      {subject.isEssay ? (
                        <span className="inline-block rounded-full bg-sky-100 text-sky-700 text-xs px-2 py-0.5 font-semibold">
                          포함
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right text-slate-600">{subject.duration}분</td>
                    <td className="py-2 pr-2 text-center">
                      <button
                        type="button"
                        className="secondary-button text-xs px-3 py-1"
                        onClick={() => openEdit(subject)}
                        disabled={editingId !== null}
                      >
                        수정
                      </button>
                    </td>
                    <td className="py-2 text-center">
                      <button
                        type="button"
                        className="text-xs px-3 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        onClick={() => handleDelete(subject)}
                        disabled={editingId !== null}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                  {/* 수정 인라인 폼 */}
                  {editingId === subject.id && (
                    <tr key={`${subject.id}-edit`}>
                      <td colSpan={8} className="py-2">
                        <SubjectForm
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
function SubjectForm({ form, setForm, onSave, onCancel, saving }) {
  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 my-2">
      {/* 과목명 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500">과목명</label>
        <input
          type="text"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 w-40"
          placeholder="예: 국어"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </div>

      {/* 학년 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500">학년</label>
        <select
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          value={form.grade}
          onChange={(e) => set("grade", e.target.value)}
        >
          <option value="1">1학년</option>
          <option value="2">2학년</option>
          <option value="3">3학년</option>
        </select>
      </div>

      {/* 구분 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500">구분</label>
        <select
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          value={form.type}
          onChange={(e) => set("type", e.target.value)}
        >
          <option value="common">공통과목</option>
          <option value="elective">선택과목</option>
        </select>
      </div>

      {/* 서술형 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500">서술형 포함</label>
        <label className="flex items-center gap-2 h-8 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 accent-sky-500"
            checked={form.isEssay}
            onChange={(e) => set("isEssay", e.target.checked)}
          />
          <span className="text-sm text-slate-600">{form.isEssay ? "포함" : "미포함"}</span>
        </label>
      </div>

      {/* 시험시간 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500">시험시간 (분)</label>
        <input
          type="number"
          min={1}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 w-24"
          placeholder="45"
          value={form.duration}
          onChange={(e) => set("duration", e.target.value)}
        />
      </div>

      {/* 버튼 */}
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
