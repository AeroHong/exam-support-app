import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  bulkSaveEnrollmentsByGrade,
  bulkSaveStudents,
  deleteStudent,
  deleteStudentsByGrade,
  loadStudents,
  saveStudent,
} from "../lib/firestoreData";

// ─── 스타일 ──────────────────────────────────────────────────────────────────

const s = {
  page:        { padding: "1.5rem", maxWidth: "1100px" },
  pageHeader:  { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.25rem" },
  eyebrow:     { fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" },
  pageTitle:   { fontSize: "1.5rem", fontWeight: 800, color: "#111827", margin: 0 },
  btnRow:      { display: "flex", gap: "0.5rem", alignItems: "center" },

  primaryBtn:  { padding: "0.45rem 1rem", backgroundColor: "#4f46e5", color: "#fff", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 },
  outlineBtn:  { padding: "0.45rem 1rem", backgroundColor: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: "7px", cursor: "pointer", fontSize: "0.85rem" },
  dangerOutlineBtn: { padding: "0.35rem 0.75rem", backgroundColor: "#fff", color: "#dc2626", border: "1px solid #dc2626", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap" },

  uploadBox:   { border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.25rem", backgroundColor: "#fafafa" },
  uploadTitle: { fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: "0.5rem" },
  uploadHint:  { fontSize: "0.78rem", color: "#9ca3af", marginBottom: "0.75rem" },
  uploadBtnRow:{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" },

  previewWrap: { marginTop: "1rem", overflowX: "auto" },
  previewLabel:{ fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", marginBottom: "0.5rem" },

  filterRow:   { display: "flex", gap: "0.4rem", marginBottom: "0.75rem", alignItems: "center" },
  tab:         { padding: "0.3rem 0.75rem", border: "1px solid #e5e7eb", borderRadius: "999px", cursor: "pointer", fontSize: "0.82rem", backgroundColor: "#fff", color: "#6b7280" },
  tabActive:   { padding: "0.3rem 0.75rem", border: "1px solid #4f46e5", borderRadius: "999px", cursor: "pointer", fontSize: "0.82rem", backgroundColor: "#eef2ff", color: "#4f46e5", fontWeight: 700 },
  badge:       { display: "inline-block", fontSize: "0.72rem", fontWeight: 600, backgroundColor: "#e5e7eb", color: "#374151", borderRadius: "999px", padding: "0.05rem 0.45rem", marginLeft: "0.3rem" },
  badgeActive: { display: "inline-block", fontSize: "0.72rem", fontWeight: 600, backgroundColor: "#c7d2fe", color: "#3730a3", borderRadius: "999px", padding: "0.05rem 0.45rem", marginLeft: "0.3rem" },

  table:       { width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" },
  thead:       { backgroundColor: "#f9fafb" },
  th:          { padding: "0.5rem 0.75rem", fontWeight: 700, color: "#374151", textAlign: "left", borderBottom: "2px solid #e5e7eb", fontSize: "0.8rem", whiteSpace: "nowrap" },
  thRight:     { padding: "0.5rem 0.75rem", fontWeight: 700, color: "#374151", textAlign: "right", borderBottom: "2px solid #e5e7eb" },
  tr:          { borderBottom: "1px solid #f3f4f6" },
  trHover:     { backgroundColor: "#f9fafb" },
  td:          { padding: "0.4rem 0.75rem", color: "#111827", verticalAlign: "middle" },
  tdMuted:     { padding: "0.4rem 0.75rem", color: "#9ca3af", fontSize: "0.82rem", verticalAlign: "middle" },
  tdRight:     { padding: "0.4rem 0.75rem", textAlign: "right", verticalAlign: "middle", whiteSpace: "nowrap" },

  editBtn:     { padding: "0.2rem 0.55rem", backgroundColor: "#fff", color: "#4f46e5", border: "1px solid #c7d2fe", borderRadius: "5px", cursor: "pointer", fontSize: "0.75rem", marginRight: "0.3rem" },
  deleteBtn:   { padding: "0.2rem 0.55rem", backgroundColor: "#fff", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "5px", cursor: "pointer", fontSize: "0.75rem" },

  emptyRow:    { textAlign: "center", padding: "2rem", color: "#9ca3af", fontSize: "0.9rem" },

  notice:      { padding: "0.6rem 1rem", borderRadius: "7px", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.75rem" },
  noticeOk:    { backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" },
  noticeErr:   { backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },

  modalBackdrop: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalShell:    { backgroundColor: "#fff", borderRadius: "12px", padding: "1.5rem", width: "min(520px, 95vw)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" },
  modalTitle:    { fontSize: "1.1rem", fontWeight: 800, color: "#111827", marginBottom: "1.25rem" },
  label:         { display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" },
  input:         { width: "100%", padding: "0.45rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "0.875rem", boxSizing: "border-box", outline: "none" },
  select:        { width: "100%", padding: "0.45rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "0.875rem", boxSizing: "border-box", backgroundColor: "#fff" },
  formGrid2:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" },
  formGrid3:     { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" },
  formGroup:     { marginBottom: "0.75rem" },
  modalActions:  { display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.25rem" },
};

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function buildStudentId(grade, classNo, number) {
  return String(grade) + String(classNo).padStart(2, "0") + String(number).padStart(2, "0");
}

function normalizeSubjectName(raw) {
  return raw.split("_")[0].trim();
}

function parseRows(rows) {
  const students = [];
  for (const row of rows) {
    const grade = Number(row[0]);
    const classNo = Number(row[1]);
    const number = Number(row[2]);
    const name = String(row[3] ?? "").trim();
    if (!grade || !classNo || !number || !name) continue;

    let email = "";
    const electiveSubjects = [];

    if (grade === 1) {
      // 1학년: 학년 | 반 | 번호 | 이름 | 성별 | 학번 | 이메일
      email = String(row[6] ?? "").trim();
    } else {
      // 2·3학년: 학년 | 반 | 번호 | 이름 | 이메일 | 선택과목1~
      email = String(row[4] ?? "").trim();
      for (let i = 5; i < row.length; i++) {
        const raw = String(row[i] ?? "").trim();
        if (raw) electiveSubjects.push(normalizeSubjectName(raw));
      }
    }

    students.push({ id: buildStudentId(grade, classNo, number), grade, classNo, number, name, email, electiveSubjects });
  }
  return students;
}

// ─── 학생 추가/수정 모달 ──────────────────────────────────────────────────────

function StudentModal({ student, onClose, onSave }) {
  const isEdit = Boolean(student?.id);
  const [form, setForm] = useState(() => student
    ? { grade: student.grade, classNo: student.classNo, number: student.number, name: student.name, email: student.email, electiveSubjects: [...(student.electiveSubjects ?? [])] }
    : { grade: 1, classNo: "", number: "", name: "", email: "", electiveSubjects: [] }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.grade || !form.classNo || !form.number || !form.name.trim()) {
      setError("학년, 반, 번호, 이름은 필수입니다."); return;
    }
    setSaving(true);
    try {
      await onSave({
        id: buildStudentId(form.grade, form.classNo, form.number),
        grade: Number(form.grade), classNo: Number(form.classNo), number: Number(form.number),
        name: form.name.trim(), email: form.email.trim(),
        electiveSubjects: form.electiveSubjects.filter(s => s.trim()),
      });
      onClose();
    } catch (err) {
      setError("저장 실패: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={s.modalBackdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modalShell}>
        <p style={s.modalTitle}>{isEdit ? "학생 수정" : "학생 추가"}</p>
        <form onSubmit={handleSubmit}>
          <div style={s.formGrid3}>
            <div>
              <label style={s.label}>학년</label>
              <select style={s.select} value={form.grade} onChange={e => set("grade", Number(e.target.value))}>
                <option value={1}>1학년</option><option value={2}>2학년</option><option value={3}>3학년</option>
              </select>
            </div>
            <div>
              <label style={s.label}>반</label>
              <input style={s.input} type="number" min={1} placeholder="반" value={form.classNo} onChange={e => set("classNo", e.target.value)} />
            </div>
            <div>
              <label style={s.label}>번호</label>
              <input style={s.input} type="number" min={1} placeholder="번호" value={form.number} onChange={e => set("number", e.target.value)} />
            </div>
          </div>
          <div style={s.formGrid2}>
            <div>
              <label style={s.label}>이름</label>
              <input style={s.input} type="text" placeholder="이름" value={form.name} onChange={e => set("name", e.target.value)} />
            </div>
            <div>
              <label style={s.label}>학교계정</label>
              <input style={s.input} type="text" placeholder="student@school.kr" value={form.email} onChange={e => set("email", e.target.value)} />
            </div>
          </div>
          {Number(form.grade) !== 1 && (
            <div style={s.formGroup}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <label style={s.label}>선택과목</label>
                <button type="button" style={s.editBtn} onClick={() => set("electiveSubjects", [...form.electiveSubjects, ""])}>+ 추가</button>
              </div>
              {form.electiveSubjects.map((subj, i) => (
                <div key={i} style={{ display: "flex", gap: "0.4rem", marginBottom: "0.4rem" }}>
                  <input style={s.input} type="text" placeholder={`선택과목 ${i + 1}`} value={subj}
                    onChange={e => { const a = [...form.electiveSubjects]; a[i] = e.target.value; set("electiveSubjects", a); }} />
                  <button type="button" style={s.deleteBtn}
                    onClick={() => set("electiveSubjects", form.electiveSubjects.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
              {form.electiveSubjects.length === 0 && <p style={{ fontSize: "0.78rem", color: "#9ca3af" }}>등록된 선택과목 없음</p>}
            </div>
          )}
          {form.grade && form.classNo && form.number && (
            <p style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem" }}>
              학번: <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{buildStudentId(form.grade, form.classNo, form.number)}</span>
            </p>
          )}
          {error && <p style={{ ...s.notice, ...s.noticeErr }}>{error}</p>}
          <div style={s.modalActions}>
            <button type="button" style={s.outlineBtn} onClick={onClose}>취소</button>
            <button type="submit" style={s.primaryBtn} disabled={saving}>{saving ? "저장 중…" : isEdit ? "수정 완료" : "추가"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

const GRADE_TABS = [
  { key: "all", label: "전체" },
  { key: 1, label: "1학년" },
  { key: 2, label: "2학년" },
  { key: 3, label: "3학년" },
];

export default function StudentRosterTab({ schoolId }) {
  const fileInputRef = useRef(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gradeFilter, setGradeFilter] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [parsedStudents, setParsedStudents] = useState([]);
  const [previewRows, setPreviewRows] = useState(null);
  const [parseError, setParseError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState(null); // { type: 'ok'|'err', msg }

  useEffect(() => { if (schoolId) fetchStudents(); }, [schoolId]);

  async function fetchStudents() {
    setLoading(true);
    try {
      const data = await loadStudents(schoolId);
      data.sort((a, b) => (a.id > b.id ? 1 : -1));
      setStudents(data);
    } catch (err) {
      setNotice({ type: "err", msg: "목록 로드 실패: " + err.message });
    } finally {
      setLoading(false);
    }
  }

  // ── 파일 파싱 ──
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(""); setParsedStudents([]); setPreviewRows(null);
    const isCsv = file.name.toLowerCase().endsWith(".csv");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = isCsv
          ? XLSX.read(ev.target.result, { type: "string" })
          : XLSX.read(new Uint8Array(ev.target.result), { type: "array" });
        let allRows = [];
        for (const sheetName of wb.SheetNames) {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
          const startIdx = rows.length > 0 && isNaN(Number(rows[0]?.[0])) ? 1 : 0;
          allRows = allRows.concat(rows.slice(startIdx).filter(r => r.length > 0));
        }
        const parsed = parseRows(allRows);
        if (!parsed.length) { setParseError("파싱된 학생 데이터가 없습니다. 파일 형식을 확인해주세요."); return; }
        setParsedStudents(parsed);
        setPreviewRows(parsed.slice(0, 5));
      } catch (err) {
        setParseError("파일 파싱 오류: " + err.message);
      }
    };
    if (isCsv) reader.readAsText(file, "UTF-8");
    else reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  async function handleUploadConfirm() {
    setUploading(true);
    try {
      await bulkSaveStudents(schoolId, parsedStudents);

      // 2·3학년 선택과목 → enrollment 자동 생성
      const uploadedGrades = [...new Set(parsedStudents.map((s) => s.grade))];
      for (const grade of uploadedGrades) {
        if (grade === 1) continue; // 1학년은 선택과목 없음
        const gradeStudents = parsedStudents.filter((s) => s.grade === grade);
        const enrollments = [];
        gradeStudents.forEach((student) => {
          (student.electiveSubjects ?? []).forEach((subjectName) => {
            if (subjectName) {
              enrollments.push({ studentId: student.id, subjectName, grade });
            }
          });
        });
        await bulkSaveEnrollmentsByGrade(schoolId, enrollments, grade);
      }

      setNotice({ type: "ok", msg: `${parsedStudents.length}명 저장 완료` });
      setParsedStudents([]); setPreviewRows(null); setUploadOpen(false);
      await fetchStudents();
    } catch (err) {
      setNotice({ type: "err", msg: "업로드 실패: " + err.message });
    } finally {
      setUploading(false);
    }
  }

  // ── 개별 CRUD ──
  async function handleSaveStudent(data) {
    await saveStudent(schoolId, data);
    await fetchStudents();
  }

  async function handleDelete(student) {
    if (!window.confirm(`"${student.name}" 학생을 삭제하시겠습니까?`)) return;
    try {
      await deleteStudent(schoolId, student.id);
      setStudents(prev => prev.filter(s => s.id !== student.id));
    } catch (err) {
      setNotice({ type: "err", msg: "삭제 실패: " + err.message });
    }
  }

  // ── 학년별 전체 삭제 ──
  async function handleDeleteByGrade() {
    const grade = gradeFilter === "all" ? null : gradeFilter;
    const label = grade ? `${grade}학년 전체` : "전체";
    const count = grade ? students.filter(s => s.grade === grade).length : students.length;
    if (!window.confirm(`${label} 학생 ${count}명을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    setLoading(true);
    try {
      await deleteStudentsByGrade(schoolId, grade);
      await fetchStudents();
      setNotice({ type: "ok", msg: `${label} ${count}명 삭제 완료` });
    } catch (err) {
      setNotice({ type: "err", msg: "삭제 실패: " + err.message });
    } finally {
      setLoading(false);
    }
  }

  // ── 필터·카운트 ──
  const countByGrade = {
    all: students.length,
    1: students.filter(s => s.grade === 1).length,
    2: students.filter(s => s.grade === 2).length,
    3: students.filter(s => s.grade === 3).length,
  };
  const filtered = gradeFilter === "all" ? students : students.filter(s => s.grade === gradeFilter);

  return (
    <div style={s.page}>
      {/* ── 페이지 헤더 ── */}
      <div style={s.pageHeader}>
        <div>
          <p style={s.eyebrow}>기초 데이터</p>
          <h2 style={s.pageTitle}>학생 명렬</h2>
        </div>
        <div style={s.btnRow}>
          <button style={s.outlineBtn} onClick={() => { setUploadOpen(o => !o); setParseError(""); setPreviewRows(null); }}>
            {uploadOpen ? "업로드 닫기 ✕" : "파일 업로드"}
          </button>
          <button style={s.primaryBtn} onClick={() => { setEditTarget(null); setModalOpen(true); }}>
            + 학생 추가
          </button>
        </div>
      </div>

      {/* ── 알림 ── */}
      {notice && (
        <div style={{ ...s.notice, ...(notice.type === "ok" ? s.noticeOk : s.noticeErr) }}>
          {notice.msg}
          <button onClick={() => setNotice(null)} style={{ marginLeft: "0.75rem", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* ── 파일 업로드 (토글) ── */}
      {uploadOpen && (
        <div style={s.uploadBox}>
          <p style={s.uploadTitle}>Excel / CSV 업로드</p>
          <p style={s.uploadHint}>
            1학년: 학년·반·번호·이름·성별·학번·이메일 &nbsp;|&nbsp;
            2·3학년: 학년·반·번호·이름·이메일·선택과목…<br />
            학급별 시트 자동 통합. 업로드 시 해당 학년 기존 데이터를 교체합니다.
          </p>
          <div style={s.uploadBtnRow}>
            <button style={s.outlineBtn} onClick={() => fileInputRef.current?.click()}>파일 선택</button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleFileChange} />
            {parsedStudents.length > 0 && (
              <button style={s.primaryBtn} onClick={handleUploadConfirm} disabled={uploading}>
                {uploading ? "저장 중…" : `업로드 확인 (${parsedStudents.length}명)`}
              </button>
            )}
            {parsedStudents.length > 0 && (
              <button style={s.outlineBtn} onClick={() => { setParsedStudents([]); setPreviewRows(null); }}>취소</button>
            )}
          </div>
          {parseError && <p style={{ ...s.notice, ...s.noticeErr, marginTop: "0.75rem" }}>{parseError}</p>}
          {previewRows && (
            <div style={s.previewWrap}>
              <p style={s.previewLabel}>미리보기 (전체 {parsedStudents.length}명 중 최대 5행)</p>
              <table style={s.table}>
                <thead style={s.thead}>
                  <tr>
                    {["학번","학년","반","번호","이름","이메일","선택과목"].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map(st => (
                    <tr key={st.id} style={s.tr}>
                      <td style={{ ...s.td, fontFamily: "monospace", fontSize: "0.8rem" }}>{st.id}</td>
                      <td style={s.td}>{st.grade}</td>
                      <td style={s.td}>{st.classNo}</td>
                      <td style={s.td}>{st.number}</td>
                      <td style={{ ...s.td, fontWeight: 600 }}>{st.name}</td>
                      <td style={s.tdMuted}>{st.email || "—"}</td>
                      <td style={s.tdMuted}>{st.electiveSubjects.join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── 학년 필터 탭 ── */}
      <div style={s.filterRow}>
        {GRADE_TABS.map(tab => (
          <button
            key={tab.key}
            style={gradeFilter === tab.key ? s.tabActive : s.tab}
            onClick={() => setGradeFilter(tab.key)}
          >
            {tab.label}
            <span style={gradeFilter === tab.key ? s.badgeActive : s.badge}>
              {countByGrade[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* ── 학생 테이블 ── */}
      <table style={s.table}>
        <thead style={s.thead}>
          <tr>
            <th style={s.th}>학년</th>
            <th style={s.th}>반</th>
            <th style={s.th}>번호</th>
            <th style={s.th}>이름</th>
            <th style={s.th}>이메일</th>
            <th style={s.th}>선택과목</th>
            <th style={s.thRight}>
              {filtered.length > 0 && (
                <button style={s.dangerOutlineBtn} onClick={handleDeleteByGrade} disabled={loading}>
                  {gradeFilter === "all" ? "전체" : `${gradeFilter}학년`} 삭제 ({filtered.length}명)
                </button>
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={7} style={s.emptyRow}>불러오는 중…</td></tr>
          ) : filtered.length === 0 ? (
            <tr><td colSpan={7} style={s.emptyRow}>
              {students.length === 0 ? "등록된 학생이 없습니다. 파일 업로드 또는 학생 추가를 이용하세요." : "해당 학년 학생이 없습니다."}
            </td></tr>
          ) : filtered.map(student => (
            <tr key={student.id} style={s.tr}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f9fafb"}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = ""}>
              <td style={s.td}>{student.grade}</td>
              <td style={s.td}>{student.classNo}</td>
              <td style={s.td}>{student.number}</td>
              <td style={{ ...s.td, fontWeight: 600 }}>{student.name}</td>
              <td style={s.tdMuted}>{student.email || "—"}</td>
              <td style={s.tdMuted}>{student.electiveSubjects?.join(", ") || "—"}</td>
              <td style={s.tdRight}>
                <button style={s.editBtn} onClick={() => { setEditTarget(student); setModalOpen(true); }}>수정</button>
                <button style={s.deleteBtn} onClick={() => handleDelete(student)}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── 추가/수정 모달 ── */}
      {modalOpen && (
        <StudentModal
          student={editTarget}
          onClose={() => { setModalOpen(false); setEditTarget(null); }}
          onSave={handleSaveStudent}
        />
      )}
    </div>
  );
}
