import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  bulkSaveStudents,
  deleteStudent,
  loadStudents,
  saveStudent,
} from "../lib/firestoreData";

// ─── 상수 ────────────────────────────────────────────────────────────────────

const GRADE_TABS = [
  { key: "all", label: "전체" },
  { key: 1, label: "1학년" },
  { key: 2, label: "2학년" },
  { key: 3, label: "3학년" },
];

const EMPTY_FORM = {
  grade: 1,
  classNo: "",
  number: "",
  name: "",
  email: "",
  electiveSubjects: [],
};

const INPUT_CLS =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-[inherit] focus:outline-none focus:ring-2 focus:ring-slate-400";

// ─── 학번 계산 ───────────────────────────────────────────────────────────────

function buildStudentId(grade, classNo, number) {
  return (
    String(grade) +
    String(classNo).padStart(2, "0") +
    String(number).padStart(2, "0")
  );
}

// ─── 파일 파싱 ───────────────────────────────────────────────────────────────

function parseRows(rows) {
  const students = [];
  for (const row of rows) {
    const grade = Number(row[0]);
    const classNo = Number(row[1]);
    const number = Number(row[2]);
    const name = String(row[3] ?? "").trim();
    const email = String(row[4] ?? "").trim();

    if (!grade || !classNo || !number || !name) continue;

    const electiveSubjects = [];
    for (let i = 5; i < row.length; i++) {
      const subj = String(row[i] ?? "").trim();
      if (subj) electiveSubjects.push(subj);
    }

    students.push({
      id: buildStudentId(grade, classNo, number),
      grade,
      classNo,
      number,
      name,
      email,
      electiveSubjects,
    });
  }
  return students;
}

// ─── 메시지 표시 컴포넌트 ────────────────────────────────────────────────────

function Notice({ msg }) {
  if (!msg) return null;
  const isOk = msg.startsWith("ok:");
  const text = msg.slice(3);
  return (
    <p
      className={`mt-2 rounded-2xl px-4 py-2 text-sm font-bold ${
        isOk ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      }`}
    >
      {text}
    </p>
  );
}

// ─── 학생 추가/수정 모달 ─────────────────────────────────────────────────────

function StudentModal({ student, onClose, onSave }) {
  const isEdit = Boolean(student?.id);
  const [form, setForm] = useState(() => {
    if (student) {
      return {
        grade: student.grade,
        classNo: student.classNo,
        number: student.number,
        name: student.name,
        email: student.email,
        electiveSubjects: [...(student.electiveSubjects ?? [])],
      };
    }
    return { ...EMPTY_FORM, electiveSubjects: [] };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addSubject() {
    setForm((prev) => ({
      ...prev,
      electiveSubjects: [...prev.electiveSubjects, ""],
    }));
  }

  function updateSubject(idx, value) {
    setForm((prev) => {
      const updated = [...prev.electiveSubjects];
      updated[idx] = value;
      return { ...prev, electiveSubjects: updated };
    });
  }

  function removeSubject(idx) {
    setForm((prev) => ({
      ...prev,
      electiveSubjects: prev.electiveSubjects.filter((_, i) => i !== idx),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const { grade, classNo, number, name } = form;
    if (!grade || !classNo || !number || !name.trim()) {
      setError("학년, 반, 번호, 이름은 필수입니다.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const id = buildStudentId(grade, classNo, number);
      const electiveSubjects = form.electiveSubjects.filter((s) => s.trim());
      await onSave({
        id,
        grade: Number(grade),
        classNo: Number(classNo),
        number: Number(number),
        name: form.name.trim(),
        email: form.email.trim(),
        electiveSubjects,
      });
      onClose();
    } catch (err) {
      setError("저장에 실패했습니다: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-shell" style={{ width: "min(560px, 100%)", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="section-head">
          <div>
            <p className="eyebrow">{isEdit ? "학생 수정" : "학생 추가"}</p>
            <h3 className="mt-1 text-xl font-bold">{isEdit ? "정보 수정" : "새 학생 등록"}</h3>
          </div>
          <button type="button" className="secondary-button text-sm" onClick={onClose}>
            닫기
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-3">
          {/* 학년 / 반 / 번호 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1">
              <label className="eyebrow">학년</label>
              <select
                className={INPUT_CLS}
                value={form.grade}
                onChange={(e) => setField("grade", Number(e.target.value))}
              >
                <option value={1}>1학년</option>
                <option value={2}>2학년</option>
                <option value={3}>3학년</option>
              </select>
            </div>
            <div className="grid gap-1">
              <label className="eyebrow">반</label>
              <input
                className={INPUT_CLS}
                type="number"
                min={1}
                placeholder="반"
                value={form.classNo}
                onChange={(e) => setField("classNo", e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <label className="eyebrow">번호</label>
              <input
                className={INPUT_CLS}
                type="number"
                min={1}
                placeholder="번호"
                value={form.number}
                onChange={(e) => setField("number", e.target.value)}
              />
            </div>
          </div>

          {/* 이름 / 이메일 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <label className="eyebrow">이름</label>
              <input
                className={INPUT_CLS}
                type="text"
                placeholder="이름"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <label className="eyebrow">학교계정 (이메일)</label>
              <input
                className={INPUT_CLS}
                type="text"
                placeholder="student@school.kr"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
              />
            </div>
          </div>

          {/* 선택과목 */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="eyebrow">선택과목</span>
              <button
                type="button"
                className="chip text-xs"
                onClick={addSubject}
              >
                + 과목 추가
              </button>
            </div>
            {form.electiveSubjects.length === 0 ? (
              <p className="text-sm text-slate-400">등록된 선택과목이 없습니다.</p>
            ) : (
              <div className="grid gap-2">
                {form.electiveSubjects.map((subj, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      className={INPUT_CLS}
                      type="text"
                      placeholder={`선택과목 ${idx + 1}`}
                      value={subj}
                      onChange={(e) => updateSubject(idx, e.target.value)}
                    />
                    <button
                      type="button"
                      className="chip danger-button text-xs shrink-0"
                      onClick={() => removeSubject(idx)}
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 학번 미리보기 */}
          {form.grade && form.classNo && form.number ? (
            <p className="text-xs text-slate-500">
              학번:{" "}
              <span className="font-mono font-bold text-slate-700">
                {buildStudentId(form.grade, form.classNo, form.number)}
              </span>
            </p>
          ) : null}

          {error && <p className="text-sm font-bold text-red-600">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="secondary-button text-sm" onClick={onClose}>
              취소
            </button>
            <button
              type="submit"
              className="primary-button text-sm"
              disabled={saving}
            >
              {saving ? "저장 중…" : isEdit ? "수정 완료" : "학생 추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────────────────────

export default function StudentRosterTab({ schoolId }) {
  const fileInputRef = useRef(null);

  // ── 학생 목록 상태 ──────────────────────────────────────────────────────────
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  // ── 필터 상태 ──────────────────────────────────────────────────────────────
  const [gradeFilter, setGradeFilter] = useState("all");

  // ── 모달 상태 ──────────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null → 추가, object → 수정

  // ── 파일 업로드 상태 ───────────────────────────────────────────────────────
  const [previewRows, setPreviewRows] = useState(null); // 파싱된 학생 배열 (미리보기용)
  const [allParsed, setAllParsed] = useState([]); // 전체 파싱 결과
  const [parseError, setParseError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  // ── 데이터 로드 ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!schoolId) return;
    fetchStudents();
  }, [schoolId]);

  async function fetchStudents() {
    setLoading(true);
    setLoadError("");
    try {
      const data = await loadStudents(schoolId);
      data.sort((a, b) => (a.id > b.id ? 1 : -1));
      setStudents(data);
    } catch (err) {
      setLoadError("학생 목록을 불러오지 못했습니다: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── 파일 선택 처리 ─────────────────────────────────────────────────────────
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError("");
    setUploadMsg("");
    setPreviewRows(null);
    setAllParsed([]);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // 첫 번째 행이 헤더인지 확인: 첫 셀이 숫자가 아니면 헤더로 간주하고 건너뜀
        const firstDataIdx =
          rows.length > 0 && isNaN(Number(rows[0]?.[0])) ? 1 : 0;
        const dataRows = rows.slice(firstDataIdx).filter((r) => r.length > 0);

        const parsed = parseRows(dataRows);
        if (parsed.length === 0) {
          setParseError("파싱된 학생 데이터가 없습니다. 파일 형식을 확인해주세요.");
          return;
        }
        setAllParsed(parsed);
        setPreviewRows(parsed.slice(0, 5));
      } catch (err) {
        setParseError("파일 파싱 중 오류가 발생했습니다: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);

    // 같은 파일 재선택 허용
    e.target.value = "";
  }

  // ── 업로드 확인 ────────────────────────────────────────────────────────────
  async function handleUploadConfirm() {
    if (!allParsed.length) return;
    setUploading(true);
    setUploadMsg("");
    try {
      await bulkSaveStudents(schoolId, allParsed);
      setUploadMsg(`ok:${allParsed.length}명의 학생 데이터가 저장되었습니다.`);
      setPreviewRows(null);
      setAllParsed([]);
      await fetchStudents();
    } catch (err) {
      setUploadMsg("error:업로드에 실패했습니다: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  function handleCancelUpload() {
    setPreviewRows(null);
    setAllParsed([]);
    setParseError("");
    setUploadMsg("");
  }

  // ── 개별 저장 ──────────────────────────────────────────────────────────────
  async function handleSaveStudent(studentData) {
    await saveStudent(schoolId, studentData);
    await fetchStudents();
  }

  // ── 삭제 ───────────────────────────────────────────────────────────────────
  async function handleDelete(student) {
    if (!window.confirm(`"${student.name}" 학생을 삭제하시겠습니까?`)) return;
    try {
      await deleteStudent(schoolId, student.id);
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
    } catch (err) {
      setLoadError("삭제에 실패했습니다: " + err.message);
    }
  }

  // ── 필터링 ─────────────────────────────────────────────────────────────────
  const filtered =
    gradeFilter === "all"
      ? students
      : students.filter((s) => s.grade === gradeFilter);

  // ── 렌더 ───────────────────────────────────────────────────────────────────
  return (
    <div className="dense-page">
      {/* ── 헤더 ── */}
      <div className="dense-page-header">
        <div>
          <p className="eyebrow">명렬 관리</p>
          <h2 className="mt-1 text-2xl font-extrabold">학생 명렬</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="secondary-button text-sm"
            onClick={fetchStudents}
            disabled={loading}
          >
            {loading ? "불러오는 중…" : "새로고침"}
          </button>
          <button
            type="button"
            className="primary-button text-sm"
            onClick={() => {
              setEditTarget(null);
              setModalOpen(true);
            }}
          >
            + 학생 추가
          </button>
        </div>
      </div>

      {/* ── 오류 메시지 ── */}
      {loadError && <p className="top-message error">{loadError}</p>}

      {/* ── 파일 업로드 섹션 ── */}
      <section className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">일괄 업로드</p>
            <h3 className="mt-1 text-xl font-bold">Excel / CSV 파일 업로드</h3>
          </div>
          <button
            type="button"
            className="secondary-button text-sm"
            onClick={() => fileInputRef.current?.click()}
          >
            파일 선택
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <p className="text-xs text-slate-500 mb-3">
          컬럼 순서: 학년 | 반 | 번호 | 이름 | 학교계정 | 선택과목1 | 선택과목2 | …
          (첫 행이 헤더인 경우 자동 감지하여 건너뜁니다)
        </p>

        {parseError && (
          <p className="top-message error mb-3 text-sm">{parseError}</p>
        )}

        <Notice msg={uploadMsg} />

        {/* 미리보기 테이블 */}
        {previewRows && (
          <div className="mt-4">
            <p className="eyebrow mb-2">
              미리보기 (전체 {allParsed.length}명 중 최대 5행)
            </p>
            <div className="input-table-wrap">
              <table className="input-table">
                <thead>
                  <tr>
                    <th>학번</th>
                    <th>학년</th>
                    <th>반</th>
                    <th>번호</th>
                    <th>이름</th>
                    <th>학교계정</th>
                    <th>선택과목</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((s) => (
                    <tr key={s.id}>
                      <td className="font-mono text-xs">{s.id}</td>
                      <td>{s.grade}</td>
                      <td>{s.classNo}</td>
                      <td>{s.number}</td>
                      <td>{s.name}</td>
                      <td className="text-sm text-slate-500">{s.email}</td>
                      <td className="text-sm text-slate-500">
                        {s.electiveSubjects.join(", ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <button
                type="button"
                className="primary-button text-sm"
                onClick={handleUploadConfirm}
                disabled={uploading}
              >
                {uploading ? "저장 중…" : `업로드 확인 (${allParsed.length}명 저장)`}
              </button>
              <button
                type="button"
                className="secondary-button text-sm"
                onClick={handleCancelUpload}
                disabled={uploading}
              >
                취소
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── 학생 목록 ── */}
      <section className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">
              {gradeFilter === "all" ? "전체" : `${gradeFilter}학년`} ·{" "}
              {filtered.length}명
            </p>
            <h3 className="mt-1 text-xl font-bold">학생 목록</h3>
          </div>
        </div>

        {/* 학년 필터 탭 */}
        <div className="filter-row mb-4">
          {GRADE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`chip ${gradeFilter === tab.key ? "chip-active" : ""}`}
              onClick={() => setGradeFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="empty-state">불러오는 중…</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">
            {students.length === 0
              ? "등록된 학생이 없습니다."
              : "해당 학년의 학생이 없습니다."}
          </p>
        ) : (
          <div className="input-table-wrap">
            <table className="input-table">
              <thead>
                <tr>
                  <th>학년</th>
                  <th>반</th>
                  <th>번호</th>
                  <th>이름</th>
                  <th>학교계정</th>
                  <th>선택과목</th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((student) => (
                  <tr key={student.id}>
                    <td>{student.grade}</td>
                    <td>{student.classNo}</td>
                    <td>{student.number}</td>
                    <td className="font-medium">{student.name}</td>
                    <td className="text-sm text-slate-500">
                      {student.email || "—"}
                    </td>
                    <td className="text-sm text-slate-500">
                      {student.electiveSubjects?.length
                        ? student.electiveSubjects.join(", ")
                        : "—"}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="chip text-xs"
                        onClick={() => {
                          setEditTarget(student);
                          setModalOpen(true);
                        }}
                      >
                        수정
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="chip danger-button text-xs"
                        onClick={() => handleDelete(student)}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── 추가/수정 모달 ── */}
      {modalOpen && (
        <StudentModal
          student={editTarget}
          onClose={() => {
            setModalOpen(false);
            setEditTarget(null);
          }}
          onSave={handleSaveStudent}
        />
      )}
    </div>
  );
}
