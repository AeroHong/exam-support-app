import { useEffect, useRef, useState } from "react";
import { useTableSort } from "../hooks/useTableSort";
import * as XLSX from "xlsx";
import {
  bulkSaveSubjectsByYear,
  deleteSubject,
  deleteSubjectsByYear,
  loadStudents,
  loadSubjects,
  saveSubject,
} from "../lib/firestoreData";

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const SUBJECT_GROUPS = [
  "국어", "수학", "영어", "사회역사/도덕포함", "과학",
  "체육", "예술", "교양", "기술가정/정보", "제2외국어/한문",
];
const COURSE_TYPES = ["공통", "일반", "융합", "진로"];

// Excel 파서 내부 상수
const _BLOCK_PAT = /[\[\(]택\s*(\d+)\s*[\]\)]/;
const _VALID_CT = new Set(["공통", "일반", "융합", "진로"]);
const _GS_COLS = [[1, 1], [1, 2], [2, 1], [2, 2], [3, 1], [3, 2]];

// ─── 스타일 ──────────────────────────────────────────────────────────────────

const s = {
  page:        { padding: "1.5rem", maxWidth: "1100px" },
  pageHeader:  { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.25rem" },
  eyebrow:     { fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" },
  pageTitle:   { fontSize: "1.5rem", fontWeight: 800, color: "#111827", margin: 0 },
  btnRow:      { display: "flex", gap: "0.5rem", alignItems: "center" },

  primaryBtn:  { padding: "0.45rem 1rem", backgroundColor: "#4f46e5", color: "#fff", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 },
  outlineBtn:  { padding: "0.45rem 1rem", backgroundColor: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: "7px", cursor: "pointer", fontSize: "0.85rem" },
  dangerBtn:         { padding: "0.35rem 0.75rem", backgroundColor: "#fff", color: "#dc2626", border: "1px solid #dc2626", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 },
  dangerOutlineBtn:  { padding: "0.3rem 0.7rem", backgroundColor: "#fff", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 },

  filterRow:   { display: "flex", gap: "0.4rem", marginBottom: "0.75rem", alignItems: "center", flexWrap: "wrap" },
  divider:     { width: "1px", height: "20px", backgroundColor: "#e5e7eb", margin: "0 0.2rem" },
  tab:         { padding: "0.3rem 0.75rem", border: "1px solid #e5e7eb", borderRadius: "999px", cursor: "pointer", fontSize: "0.82rem", backgroundColor: "#fff", color: "#6b7280" },
  tabActive:   { padding: "0.3rem 0.75rem", border: "1px solid #4f46e5", borderRadius: "999px", cursor: "pointer", fontSize: "0.82rem", backgroundColor: "#eef2ff", color: "#4f46e5", fontWeight: 700 },
  badge:       { display: "inline-block", fontSize: "0.72rem", fontWeight: 600, backgroundColor: "#e5e7eb", color: "#374151", borderRadius: "999px", padding: "0.05rem 0.45rem", marginLeft: "0.3rem" },
  badgeActive: { display: "inline-block", fontSize: "0.72rem", fontWeight: 600, backgroundColor: "#c7d2fe", color: "#3730a3", borderRadius: "999px", padding: "0.05rem 0.45rem", marginLeft: "0.3rem" },
  filterSelect:{ padding: "0.3rem 0.6rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.82rem", backgroundColor: "#fff", cursor: "pointer" },

  table:       { width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" },
  thead:       { backgroundColor: "#f9fafb" },
  th:          { padding: "0.5rem 0.75rem", fontWeight: 700, color: "#374151", textAlign: "left", borderBottom: "2px solid #e5e7eb", fontSize: "0.8rem", whiteSpace: "nowrap" },
  thRight:     { padding: "0.5rem 0.75rem", fontWeight: 700, color: "#374151", textAlign: "right", borderBottom: "2px solid #e5e7eb" },
  tr:          { borderBottom: "1px solid #f3f4f6" },
  td:          { padding: "0.4rem 0.75rem", color: "#111827", verticalAlign: "middle", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  tdMuted:     { padding: "0.4rem 0.75rem", color: "#6b7280", fontSize: "0.82rem", verticalAlign: "middle", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  tdRight:     { padding: "0.4rem 0.75rem", textAlign: "right", verticalAlign: "middle", whiteSpace: "nowrap" },
  emptyRow:    { textAlign: "center", padding: "2.5rem", color: "#9ca3af", fontSize: "0.9rem" },

  badgeSpec:   { display: "inline-block", fontSize: "0.72rem", fontWeight: 600, backgroundColor: "#dbeafe", color: "#1d4ed8", borderRadius: "999px", padding: "0.1rem 0.55rem" },
  badgeSel:    { display: "inline-block", fontSize: "0.72rem", fontWeight: 600, backgroundColor: "#dcfce7", color: "#16a34a", borderRadius: "999px", padding: "0.1rem 0.55rem" },

  editBtn:     { padding: "0.2rem 0.55rem", backgroundColor: "#fff", color: "#4f46e5", border: "1px solid #c7d2fe", borderRadius: "5px", cursor: "pointer", fontSize: "0.75rem", marginRight: "0.3rem" },
  deleteBtn:   { padding: "0.2rem 0.55rem", backgroundColor: "#fff", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "5px", cursor: "pointer", fontSize: "0.75rem" },

  notice:      { padding: "0.6rem 1rem", borderRadius: "7px", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" },
  noticeOk:    { backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" },
  noticeErr:   { backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },

  backdrop:    { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal:       { backgroundColor: "#fff", borderRadius: "12px", padding: "1.5rem", width: "min(560px, 95vw)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" },
  modalTitle:  { fontSize: "1.1rem", fontWeight: 800, color: "#111827", marginBottom: "1.25rem" },
  label:       { display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" },
  input:       { width: "100%", padding: "0.45rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "0.875rem", boxSizing: "border-box", outline: "none" },
  mSelect:     { width: "100%", padding: "0.45rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "0.875rem", boxSizing: "border-box", backgroundColor: "#fff" },
  grid2:       { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" },
  grid3:       { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" },
  fgroup:      { marginBottom: "0.75rem" },
  boxSpec:     { backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "0.75rem", marginBottom: "0.75rem" },
  boxSel:      { backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "0.75rem", marginBottom: "0.75rem" },
  boxLabel:    { fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.5rem" },
  modalActions:{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.25rem" },
};

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function calcCurrentGrade(entryYear) {
  const now = new Date();
  const schoolYear = now.getMonth() >= 2 ? now.getFullYear() : now.getFullYear() - 1;
  const g = schoolYear - entryYear + 1;
  return g >= 1 && g <= 3 ? g : null;
}

function extractEntryYear(filename) {
  const m = filename.match(/20(\d{2})/);
  return m ? 2000 + parseInt(m[1]) : null;
}

function scheduleLabel(subject) {
  if (!subject.category) return "—";
  if (subject.category === "학교지정") {
    if (subject.semester === "both") {
      const map = subject.semesterClassMap || {};
      const s1 = (map[1] || []).map(c => `${c}반`).join("·");
      const s2 = (map[2] || []).map(c => `${c}반`).join("·");
      const detail = (s1 || s2) ? ` (1학기:${s1 || "—"} / 2학기:${s2 || "—"})` : "";
      return `${subject.grade}학년 1·2학기${detail}`;
    }
    return `${subject.grade}학년 ${subject.semester}학기`;
  }
  if (subject.grade && subject.semester) {
    return `${subject.grade}학년 ${subject.semester}학기`;
  }
  return "—";
}

function sortSubjects(list) {
  return [...list].sort((a, b) => {
    if (a.grade !== b.grade) return (a.grade || 0) - (b.grade || 0);
    if (a.category !== b.category) return a.category === "학교지정" ? -1 : 1;
    const sgA = a.subjectGroup || "", sgB = b.subjectGroup || "";
    if (sgA !== sgB) return sgA.localeCompare(sgB, "ko");
    return (a.name || "").localeCompare(b.name || "", "ko");
  });
}

// ─── Excel 파서 (OmniSchool course_service.py 이식) ────────────────────────────

function _buildMergedMap(ws) {
  const map = {};
  for (const merge of (ws["!merges"] || [])) {
    const addr = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
    const cell = ws[addr];
    if (cell?.v != null) {
      const val = String(cell.v).trim();
      for (let r = merge.s.r; r <= merge.e.r; r++)
        for (let c = merge.s.c; c <= merge.e.c; c++)
          map[`${r}:${c}`] = val;
    }
  }
  return map;
}

function _readAllRows(ws) {
  if (!ws["!ref"]) return [];
  const merged = _buildMergedMap(ws);
  const rng = XLSX.utils.decode_range(ws["!ref"]);
  const rows = [];
  for (let r = rng.s.r; r <= rng.e.r; r++) {
    const row = [];
    for (let c = rng.s.c; c <= rng.e.c; c++) {
      const key = `${r}:${c}`;
      if (merged[key] !== undefined) {
        row.push(merged[key]);
      } else {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        row.push(cell?.v != null ? String(cell.v).trim() : "");
      }
    }
    rows.push(row);
  }
  return rows;
}

function _detectLayout(headerRow) {
  let sgCol = 1;
  for (let i = 0; i < headerRow.length; i++) {
    const v = String(headerRow[i] || "").replace(/\n/g, " ").trim();
    if (v.includes("교과") && v.includes("군")) { sgCol = i; break; }
  }
  const gs = sgCol + 5;
  return { sgCol, ctCol: sgCol + 1, nmCol: sgCol + 2, bcCol: sgCol + 3, crCol: sgCol + 4, gsCol: gs, descCol: gs + 6 };
}

function _normCat(raw) {
  const c = (raw || "").replace(/[\r\n]/g, "").trim();
  if (c.includes("지정")) return "학교지정";
  if (c.includes("선택")) return "학생선택";
  return null;
}

function parseEducationExcel(arrayBuffer, targetGrade) {
  const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });

  // 구분 헤더가 있는 시트 탐색
  let ws = null;
  outer: for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet["!ref"]) continue;
    const rng = XLSX.utils.decode_range(sheet["!ref"]);
    for (let r = rng.s.r; r <= Math.min(rng.s.r + 9, rng.e.r); r++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c: 0 })];
      if (cell && String(cell.v || "").trim() === "구분") { ws = sheet; break outer; }
    }
  }
  ws = ws || wb.Sheets[wb.SheetNames[0]];

  const rows = _readAllRows(ws);
  const headerIdx = rows.findIndex(row => row[0] === "구분");
  if (headerIdx === -1) throw new Error("헤더 행('구분')을 찾을 수 없습니다. 교육청 제출 형식(.xlsx)인지 확인하세요.");

  const { sgCol, ctCol, nmCol, bcCol, crCol, gsCol, descCol } = _detectLayout(rows[headerIdx]);
  const g = (row, col) => col < row.length ? (row[col] || "") : "";

  const courses = [], errors = [];
  let curCat = "", curSg = "", curSb = null;
  const bt = {}; // blockTracker: key → { val, num }

  for (let i = headerIdx + 2; i < rows.length; i++) {
    const c = rows[i];

    const newCat = _normCat(g(c, 0));
    if (newCat) curCat = newCat;
    const rawSg = g(c, sgCol);
    if (rawSg && !_VALID_CT.has(rawSg)) curSg = rawSg;

    const name = g(c, nmCol);
    const ct = g(c, ctCol);

    if (!name || ["합계", "과목 수", "과목"].includes(name)) continue;
    if (/^-*[\d.]+$/.test(name)) continue;
    if (!_VALID_CT.has(ct) || !curCat || !curSg) continue;

    let bc = 0, cr = 0;
    try {
      const rb = g(c, bcCol), rc = g(c, crCol);
      bc = rb ? Math.round(parseFloat(rb)) : 0;
      cr = rc ? Math.round(parseFloat(rc)) : 0;
    } catch {
      errors.push(`행 ${i + 1} (${name}): 학점 값 오류`);
      continue;
    }
    if (!bc || !cr) continue;

    let schedule = null, selBlock = null;
    const desc = g(c, descCol);

    for (let off = 0; off < _GS_COLS.length; off++) {
      const [grade, sem] = _GS_COLS[off];
      const val = g(c, gsCol + off);
      if (!val) continue;
      const m = _BLOCK_PAT.exec(val);
      if (m) {
        const key = `${grade}:${sem}`;
        if (!bt[key]) bt[key] = { val, num: 1 };
        else if (bt[key].val !== val) bt[key] = { val, num: bt[key].num + 1 };
        selBlock = { grade, semester: sem, pickCount: parseInt(m[1]), blockNumber: bt[key].num };
        curSb = selBlock;
        break;
      }
      if (curCat === "학교지정" && /^[\d.]+$/.test(val)) {
        schedule = { targetGrade: grade, semester: sem };
        break;
      }
    }

    if (curCat === "학교지정") {
      if (!schedule) continue;
      if (targetGrade != null && schedule.targetGrade !== targetGrade) continue;
    }
    if (curCat === "학생선택") {
      selBlock = curSb;
      if (!selBlock) continue;
      if (targetGrade != null && selBlock.grade !== targetGrade) continue;
    }

    courses.push({
      name,
      subjectGroup: curSg,
      courseType: ct,
      category: curCat,
      grade: curCat === "학교지정" ? schedule.targetGrade : selBlock.grade,
      semester: curCat === "학교지정" ? schedule.semester : selBlock.semester,
      credits: cr,
      baseCredits: bc,
      selectionBlock: curCat === "학생선택" ? selBlock : null,
      description: desc,
    });
  }

  return { courses, errors };
}

// ─── SubjectModal (추가/수정) ──────────────────────────────────────────────────

function SubjectModal({ subject, onClose, onSave, classesByGrade }) {
  const isEdit = Boolean(subject?.id);
  const curYear = new Date().getFullYear();
  const now = new Date();
  const schoolYear = now.getMonth() >= 2 ? now.getFullYear() : now.getFullYear() - 1;
  const gradeToEntryYear = (g) => schoolYear - (g - 1);

  const [form, setForm] = useState(() => subject ? {
    name: subject.name || "",
    subjectCode: subject.subjectCode || "",
    subjectGroup: subject.subjectGroup || "국어",
    courseType: subject.courseType || "일반",
    category: subject.category || "학교지정",
    grade: subject.grade || 1,
    semester: subject.semester || 1,
    semesterClassMap: subject.semesterClassMap || null,
    credits: subject.credits || 3,
    baseCredits: subject.baseCredits || 4,
    selectionBlock: subject.selectionBlock || null,
    description: subject.description || "",
    entryYear: subject.entryYear || curYear,
  } : {
    name: "",
    subjectCode: "",
    subjectGroup: "국어",
    courseType: "일반",
    category: "학교지정",
    grade: 1,
    semester: 1,
    semesterClassMap: null,
    credits: 3,
    baseCredits: 4,
    selectionBlock: null,
    description: "",
    entryYear: schoolYear,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  function handleCategoryChange(cat) {
    setForm(p => ({
      ...p,
      category: cat,
      selectionBlock: null,
      semesterClassMap: null,
    }));
  }

  // 양학기 학급 배정 헬퍼
  const availableClasses = classesByGrade?.[form.grade] || [];

  function getClassSemester(cls) {
    const map = form.semesterClassMap || {};
    if ((map[1] || []).includes(cls)) return 1;
    if ((map[2] || []).includes(cls)) return 2;
    return null;
  }

  function setClassSemester(cls, sem) {
    setForm(p => {
      const prev = p.semesterClassMap || { 1: [], 2: [] };
      return {
        ...p,
        semesterClassMap: {
          1: sem === 1 ? [...new Set([...(prev[1] || []), cls])] : (prev[1] || []).filter(c => c !== cls),
          2: sem === 2 ? [...new Set([...(prev[2] || []), cls])] : (prev[2] || []).filter(c => c !== cls),
        },
      };
    });
  }

  function setSb(patch) {
    setForm(p => ({
      ...p,
      selectionBlock: { ...(p.selectionBlock || { grade: 2, semester: 1, pickCount: 5, blockNumber: 1 }), ...patch },
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError("과목명을 입력하세요."); return; }
    setSaving(true);
    try {
      await onSave({
        ...(isEdit && { id: subject.id }),
        ...form,
        name: form.name.trim(),
        grade: Number(form.grade),
        semester: form.semester === "both" ? "both" : Number(form.semester),
        semesterClassMap: form.semester === "both" ? (form.semesterClassMap || { 1: [], 2: [] }) : null,
        credits: Number(form.credits),
        baseCredits: Number(form.baseCredits),
        entryYear: Number(form.entryYear),
      });
      onClose();
    } catch (err) {
      setError("저장 실패: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={s.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <p style={s.modalTitle}>{isEdit ? "과목 수정" : "과목 추가"}</p>
        <form onSubmit={handleSubmit}>

          {/* 구분 */}
          <div style={s.fgroup}>
            <label style={s.label}>구분</label>
            <div style={{ display: "flex", gap: "1.5rem" }}>
              {["학교지정", "학생선택"].map(cat => (
                <label key={cat} style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.875rem" }}>
                  <input type="radio" name="category" checked={form.category === cat}
                    onChange={() => handleCategoryChange(cat)} />
                  {cat}
                </label>
              ))}
            </div>
          </div>

          {/* 교과군 + 과목구분 */}
          <div style={s.grid2}>
            <div>
              <label style={s.label}>교과(군)</label>
              <select style={s.mSelect} value={form.subjectGroup} onChange={e => set("subjectGroup", e.target.value)}>
                {SUBJECT_GROUPS.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>과목구분</label>
              <select style={s.mSelect} value={form.courseType} onChange={e => set("courseType", e.target.value)}>
                {COURSE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* 과목명 + 과목코드 */}
          <div style={s.grid2}>
            <div>
              <label style={s.label}>과목명</label>
              <input style={s.input} type="text" required placeholder="예: 공통국어1"
                value={form.name} onChange={e => set("name", e.target.value)} />
            </div>
            <div>
              <label style={s.label}>과목코드 (선택)</label>
              <input style={s.input} type="text" placeholder="예: KR101"
                value={form.subjectCode} onChange={e => set("subjectCode", e.target.value)} />
            </div>
          </div>

          {/* 입학년도 + 학점 */}
          <div style={s.grid3}>
            <div>
              <label style={s.label}>입학년도 <span style={{ fontWeight: 400, color: "#9ca3af" }}>(학년 선택 시 자동)</span></label>
              <input style={s.input} type="number" min={2020} max={2035}
                value={form.entryYear} onChange={e => set("entryYear", Number(e.target.value))} />
            </div>
            <div>
              <label style={s.label}>기본학점</label>
              <input style={s.input} type="number" min={1} max={8}
                value={form.baseCredits} onChange={e => set("baseCredits", e.target.value)} />
            </div>
            <div>
              <label style={s.label}>운영학점</label>
              <input style={s.input} type="number" min={1} max={8}
                value={form.credits} onChange={e => set("credits", e.target.value)} />
            </div>
          </div>

          {/* 학교지정: 개설 학기 */}
          {form.category === "학교지정" && (
            <div style={s.boxSpec}>
              <p style={{ ...s.boxLabel, color: "#1d4ed8" }}>개설 학기 (학교지정)</p>
              <div style={s.grid2}>
                <div>
                  <label style={s.label}>학년</label>
                  <select style={s.mSelect} value={form.grade}
                    onChange={e => {
                      const g = Number(e.target.value);
                      set("grade", g);
                      set("entryYear", gradeToEntryYear(g));
                      set("semesterClassMap", null);
                    }}>
                    {[1, 2, 3].map(g => <option key={g} value={g}>{g}학년</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>학기</label>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    {[{ val: 1, label: "1학기" }, { val: 2, label: "2학기" }, { val: "both", label: "1·2학기" }].map(opt => (
                      <button key={opt.val} type="button"
                        style={{
                          padding: "0.35rem 0.7rem",
                          border: `1px solid ${form.semester === opt.val ? "#4f46e5" : "#d1d5db"}`,
                          borderRadius: "6px",
                          backgroundColor: form.semester === opt.val ? "#eef2ff" : "#fff",
                          color: form.semester === opt.val ? "#4f46e5" : "#6b7280",
                          fontSize: "0.8rem",
                          fontWeight: form.semester === opt.val ? 700 : 400,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                        onClick={() => {
                          set("semester", opt.val);
                          set("semesterClassMap", opt.val === "both" ? { 1: [], 2: [] } : null);
                        }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 양학기: 학급별 학기 배정 */}
              {form.semester === "both" && (
                <div style={{ marginTop: "0.75rem" }}>
                  <label style={s.label}>학기별 학급 배정</label>
                  {availableClasses.length === 0 ? (
                    <p style={{ fontSize: "0.8rem", color: "#9ca3af", margin: 0 }}>
                      학생 명렬에 {form.grade}학년 학급 정보가 없습니다.
                    </p>
                  ) : (
                    <>
                      <div style={{ border: "1px solid #bfdbfe", borderRadius: "6px", overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                          <thead>
                            <tr style={{ backgroundColor: "#dbeafe" }}>
                              <th style={{ padding: "0.35rem 0.75rem", textAlign: "left", fontWeight: 700, color: "#1d4ed8" }}>학급</th>
                              <th style={{ padding: "0.35rem", textAlign: "center", fontWeight: 700, color: "#1d4ed8" }}>1학기</th>
                              <th style={{ padding: "0.35rem", textAlign: "center", fontWeight: 700, color: "#1d4ed8" }}>2학기</th>
                            </tr>
                          </thead>
                          <tbody>
                            {availableClasses.map(cls => {
                              const assigned = getClassSemester(cls);
                              return (
                                <tr key={cls} style={{ borderTop: "1px solid #e5e7eb" }}>
                                  <td style={{ padding: "0.3rem 0.75rem", color: "#374151" }}>{cls}반</td>
                                  <td style={{ padding: "0.3rem", textAlign: "center" }}>
                                    <input type="radio" name={`cls-${cls}`}
                                      checked={assigned === 1}
                                      onChange={() => setClassSemester(cls, 1)} />
                                  </td>
                                  <td style={{ padding: "0.3rem", textAlign: "center" }}>
                                    <input type="radio" name={`cls-${cls}`}
                                      checked={assigned === 2}
                                      onChange={() => setClassSemester(cls, 2)} />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {form.semesterClassMap && (
                        <p style={{ fontSize: "0.78rem", color: "#4f46e5", marginTop: "0.4rem", marginBottom: 0 }}>
                          1학기: {(form.semesterClassMap[1] || []).map(c => `${c}반`).join("·") || "미배정"}
                          {" / "}
                          2학기: {(form.semesterClassMap[2] || []).map(c => `${c}반`).join("·") || "미배정"}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 학생선택: 개설 학기 */}
          {form.category === "학생선택" && (
            <div style={s.boxSel}>
              <p style={{ ...s.boxLabel, color: "#16a34a" }}>개설 학기 (학생선택)</p>
              <div style={s.grid2}>
                <div>
                  <label style={s.label}>학년</label>
                  <select style={s.mSelect} value={form.grade}
                    onChange={e => {
                      const g = Number(e.target.value);
                      set("grade", g);
                      set("entryYear", gradeToEntryYear(g));
                    }}>
                    {[1, 2, 3].map(g => <option key={g} value={g}>{g}학년</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>학기</label>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    {[{ val: 1, label: "1학기" }, { val: 2, label: "2학기" }].map(opt => (
                      <button key={opt.val} type="button"
                        style={{
                          padding: "0.35rem 0.7rem",
                          border: `1px solid ${form.semester === opt.val ? "#16a34a" : "#d1d5db"}`,
                          borderRadius: "6px",
                          backgroundColor: form.semester === opt.val ? "#f0fdf4" : "#fff",
                          color: form.semester === opt.val ? "#16a34a" : "#6b7280",
                          fontSize: "0.8rem",
                          fontWeight: form.semester === opt.val ? 700 : 400,
                          cursor: "pointer",
                        }}
                        onClick={() => set("semester", opt.val)}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 비고 */}
          <div style={s.fgroup}>
            <label style={s.label}>비고</label>
            <input style={s.input} type="text" placeholder="특이사항 (선택)"
              value={form.description} onChange={e => set("description", e.target.value)} />
          </div>

          {error && (
            <p style={{ ...s.notice, ...s.noticeErr, marginBottom: "0.5rem" }}>{error}</p>
          )}
          <div style={s.modalActions}>
            <button type="button" style={s.outlineBtn} onClick={onClose}>취소</button>
            <button type="submit" style={s.primaryBtn} disabled={saving}>
              {saving ? "저장 중…" : isEdit ? "수정 완료" : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── 간편 업로드 파서 (과목코드 포함 Excel) ─────────────────────────────────────

function parseSimpleSubjectExcel(arrayBuffer) {
  const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws);

  const courses = [];
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = (row["과목명"] || "").toString().trim();
    if (!name) continue;

    try {
      const category = (row["구분"] || "").toString().trim();
      const grade = parseInt(row["학년"]) || null;
      const semesterRaw = (row["학기"] || "").toString().trim();
      const semester = semesterRaw === "양학기" ? "both" : (parseInt(semesterRaw) || null);

      if (!["학교지정", "학생선택"].includes(category)) {
        errors.push(`행 ${i + 2}: 구분 값이 "학교지정" 또는 "학생선택"이어야 합니다.`);
        continue;
      }
      if (!grade || grade < 1 || grade > 3) {
        errors.push(`행 ${i + 2} (${name}): 학년 값 오류`);
        continue;
      }

      const parseClassList = (val) =>
        (val || "").toString().split(",").map(v => parseInt(v.trim())).filter(n => !isNaN(n));

      const semesterClassMap = semester === "both" ? {
        1: parseClassList(row["1학기_학급"]),
        2: parseClassList(row["2학기_학급"]),
      } : null;

      const course = {
        name,
        subjectCode: (row["과목코드"] || "").toString().trim(),
        subjectGroup: (row["교과군"] || "").toString().trim(),
        courseType: (row["과목구분"] || "").toString().trim(),
        category,
        grade,
        semester,
        semesterClassMap,
        credits: parseInt(row["운영학점"]) || 3,
        baseCredits: parseInt(row["기본학점"]) || 4,
        entryYear: parseInt(row["입학년도"]) || new Date().getFullYear(),
        description: (row["비고"] || "").toString().trim(),
      };

      // 학생선택: selectionBlock 파싱
      if (category === "학생선택") {
        const sbGrade = parseInt(row["선택블록_학년"]) || grade;
        const sbSemester = parseInt(row["선택블록_학기"]) || semester;
        const pickCount = parseInt(row["선택블록_택N"]) || 5;
        const blockNumber = parseInt(row["선택블록_번호"]) || 1;
        course.selectionBlock = { grade: sbGrade, semester: sbSemester, pickCount, blockNumber };
      }

      courses.push(course);
    } catch (e) {
      errors.push(`행 ${i + 2} (${name}): ${e.message}`);
    }
  }

  return { courses, errors };
}

// ─── ImportModal (교육청 엑셀 가져오기) ──────────────────────────────────────────

const CUR_YEAR = new Date().getFullYear();
const YEAR_OPTS = [CUR_YEAR - 2, CUR_YEAR - 1, CUR_YEAR];

function ImportModal({ schoolId, onClose, onDone }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [entryYear, setEntryYear] = useState(CUR_YEAR - 1);
  const [targetGrade, setTargetGrade] = useState(() => calcCurrentGrade(CUR_YEAR - 1));
  const [parsed, setParsed] = useState(null);
  const [step, setStep] = useState("select"); // select | preview | saving
  const [err, setErr] = useState("");
  const [uploadMode, setUploadMode] = useState("education"); // education | simple

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setParsed(null);
    setStep("select");
    setErr("");
    const detected = extractEntryYear(f.name);
    if (detected && YEAR_OPTS.includes(detected)) {
      setEntryYear(detected);
      setTargetGrade(calcCurrentGrade(detected));
    }
    e.target.value = "";
  }

  function handleYearChange(y) {
    setEntryYear(y);
    setTargetGrade(calcCurrentGrade(y));
    setParsed(null);
    setStep("select");
  }

  function handleGradeChange(val) {
    setTargetGrade(val === "all" ? null : Number(val));
    setParsed(null);
    setStep("select");
  }

  function handleParse() {
    if (!file) return;
    setErr("");
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        let result;
        if (uploadMode === "simple") {
          result = parseSimpleSubjectExcel(ev.target.result);
        } else {
          result = parseEducationExcel(ev.target.result, targetGrade);
        }

        if (!result.courses.length) {
          setErr("파싱된 과목이 없습니다. 파일 형식 및 학년 선택을 확인하세요.");
          return;
        }
        setParsed(result);
        setStep("preview");
      } catch (e) {
        setErr("파싱 오류: " + e.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleSave() {
    if (!parsed?.courses?.length) return;
    setStep("saving");
    try {
      let saveData;
      if (uploadMode === "simple") {
        // 간편 업로드: entryYear는 각 행에 이미 포함되어 있음
        saveData = parsed.courses;
        // 모든 entryYear 추출하여 삭제 대상 결정
        const years = [...new Set(parsed.courses.map(c => c.entryYear).filter(Boolean))];
        for (const year of years) {
          const yearCourses = parsed.courses.filter(c => c.entryYear === year);
          await bulkSaveSubjectsByYear(schoolId, yearCourses, year);
        }
        onDone(parsed.courses.length, years.length > 1 ? "여러 년도" : years[0]);
      } else {
        // 교육청 엑셀: 입학년도 단일 선택
        const withYear = parsed.courses.map(c => ({ ...c, entryYear }));
        await bulkSaveSubjectsByYear(schoolId, withYear, entryYear);
        onDone(parsed.courses.length, entryYear);
      }
    } catch (e) {
      setErr("저장 실패: " + e.message);
      setStep("preview");
    }
  }

  const currentGrade = calcCurrentGrade(entryYear);
  const gradeSelectVal = targetGrade != null ? String(targetGrade) : "all";

  return (
    <div style={s.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <p style={s.modalTitle}>과목 엑셀 가져오기</p>

        {/* 업로드 모드 선택 */}
        <div style={s.fgroup}>
          <label style={s.label}>업로드 방식</label>
          <div style={{ display: "flex", gap: "1rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.875rem" }}>
              <input type="radio" name="uploadMode" checked={uploadMode === "education"}
                onChange={() => { setUploadMode("education"); setParsed(null); setStep("select"); }} />
              교육청 배당표
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.875rem" }}>
              <input type="radio" name="uploadMode" checked={uploadMode === "simple"}
                onChange={() => { setUploadMode("simple"); setParsed(null); setStep("select"); }} />
              간편 업로드 (다운로드 형식)
            </label>
          </div>
        </div>

        <p style={{ fontSize: "0.82rem", color: "#6b7280", marginBottom: "1rem" }}>
          {uploadMode === "education"
            ? "교육청 제출용 교육과정 학점 배당표(.xlsx)를 업로드하면 과목이 자동 등록됩니다. 2022 개정 / 2015 개정 형식 모두 지원합니다."
            : "Excel 다운로드로 받은 파일에 과목코드를 추가한 후 다시 업로드하면 일괄 등록됩니다."}
        </p>

        {err && (
          <div style={{ ...s.notice, ...s.noticeErr }}>
            <span>{err}</span>
            <button onClick={() => setErr("")} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>✕</button>
          </div>
        )}

        {/* 파일 선택 */}
        <div style={s.fgroup}>
          <label style={s.label}>파일 선택 (.xlsx)</label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button type="button" style={s.outlineBtn} onClick={() => fileRef.current?.click()}>
              파일 선택
            </button>
            <input ref={fileRef} type="file" accept=".xlsx" style={{ display: "none" }} onChange={handleFileChange} />
            <span style={{ fontSize: "0.82rem", color: file ? "#111827" : "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "220px" }}>
              {file ? file.name : "xlsx 파일을 선택하세요"}
            </span>
          </div>
        </div>

        {/* 교육청 배당표 모드일 때만 입학년도/학년 선택 표시 */}
        {uploadMode === "education" && (
          <>
            <div style={s.grid2}>
              <div>
                <label style={s.label}>입학년도 (신입생 기준)</label>
                <select style={s.mSelect} value={entryYear} onChange={e => handleYearChange(Number(e.target.value))}>
                  {YEAR_OPTS.map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>불러올 학년</label>
                <select style={s.mSelect} value={gradeSelectVal} onChange={e => handleGradeChange(e.target.value)}>
                  {currentGrade != null && (
                    <option value={String(currentGrade)}>현재 {currentGrade}학년만 (권장)</option>
                  )}
                  <option value="all">전체 (1·2·3학년)</option>
                  {[1, 2, 3].filter(g => g !== currentGrade).map(g => (
                    <option key={g} value={String(g)}>{g}학년만</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 학년 안내 */}
            {currentGrade != null ? (
              <div style={{ fontSize: "0.8rem", color: "#4f46e5", backgroundColor: "#eef2ff", padding: "0.4rem 0.75rem", borderRadius: "6px", marginBottom: "1rem" }}>
                {entryYear}년 신입생 → {CUR_YEAR}년 현재 <strong>{currentGrade}학년</strong>
              </div>
            ) : (
              <div style={{ fontSize: "0.8rem", color: "#dc2626", backgroundColor: "#fef2f2", padding: "0.4rem 0.75rem", borderRadius: "6px", marginBottom: "1rem" }}>
                해당 입학년도 학생은 현재 재학 중이 아닙니다. (졸업 또는 미입학)
              </div>
            )}
          </>
        )}

        {/* Step: select */}
        {step === "select" && (
          <button type="button" style={{ ...s.primaryBtn, width: "100%" }}
            disabled={!file} onClick={handleParse}>
            분석하기
          </button>
        )}

        {/* Step: preview */}
        {step === "preview" && parsed && (
          <>
            <div style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "1rem", marginBottom: "1rem" }}>
              <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#111827", marginBottom: "0.5rem" }}>
                분석 완료: 총 {parsed.courses.length}개 과목
              </p>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                {[1, 2, 3].map(g => {
                  const cnt = parsed.courses.filter(c => c.grade === g).length;
                  return cnt > 0 ? (
                    <span key={g} style={{ fontSize: "0.82rem", color: "#6b7280" }}>{g}학년 {cnt}개</span>
                  ) : null;
                })}
                {["학교지정", "학생선택"].map(cat => {
                  const cnt = parsed.courses.filter(c => c.category === cat).length;
                  return cnt > 0 ? (
                    <span key={cat} style={{ fontSize: "0.82rem", color: "#6b7280" }}>{cat} {cnt}개</span>
                  ) : null;
                })}
                {uploadMode === "simple" && (
                  <span style={{ fontSize: "0.82rem", color: "#4f46e5", fontWeight: 600 }}>
                    과목코드 {parsed.courses.filter(c => c.subjectCode).length}개
                  </span>
                )}
              </div>
              {parsed.errors.length > 0 && (
                <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid #e5e7eb" }}>
                  {parsed.errors.slice(0, 5).map((e, i) => (
                    <p key={i} style={{ fontSize: "0.78rem", color: "#dc2626", margin: 0 }}>• {e}</p>
                  ))}
                </div>
              )}
            </div>
            <p style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "0.75rem" }}>
              {uploadMode === "education"
                ? `기존 ${entryYear}년 입학 과목 데이터는 삭제되고 새 데이터로 교체됩니다.`
                : "파일에 포함된 입학년도별로 기존 데이터가 삭제되고 새 데이터로 교체됩니다."}
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" style={{ ...s.outlineBtn, flex: 1 }}
                onClick={() => { setStep("select"); setParsed(null); }}>
                다시 선택
              </button>
              <button type="button" style={{ ...s.primaryBtn, flex: 1 }}
                onClick={handleSave}>
                저장 ({parsed.courses.length}개)
              </button>
            </div>
          </>
        )}

        {step === "saving" && (
          <p style={{ textAlign: "center", padding: "1.5rem", color: "#6b7280" }}>저장 중…</p>
        )}

        <div style={{ marginTop: "0.75rem" }}>
          <button type="button" style={{ ...s.outlineBtn, width: "100%" }} onClick={onClose}>
            {step === "saving" ? "대기 중…" : "닫기"}
          </button>
        </div>
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

export default function SubjectsTab({ schoolId, onDataChanged, readOnly = false }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gradeFilter, setGradeFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("전체");
  const [sgFilter, setSgFilter] = useState("전체");
  const { toggle: sortToggle, sortData, Ind, thSort } = useTableSort();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const [classesByGrade, setClassesByGrade] = useState({});

  useEffect(() => { if (schoolId) fetchSubjects(); }, [schoolId]);

  useEffect(() => {
    if (!schoolId) return;
    loadStudents(schoolId).then(students => {
      const map = {};
      students.forEach(({ grade, classNo }) => {
        if (!grade || !classNo) return;
        if (!map[grade]) map[grade] = new Set();
        map[grade].add(Number(classNo));
      });
      const sorted = {};
      Object.keys(map).forEach(g => { sorted[Number(g)] = [...map[g]].sort((a, b) => a - b); });
      setClassesByGrade(sorted);
    }).catch(() => {});
  }, [schoolId]);

  async function fetchSubjects() {
    setLoading(true);
    try {
      const data = await loadSubjects(schoolId);
      setSubjects(sortSubjects(data));
    } catch (err) {
      setNotice({ type: "err", msg: "목록 로드 실패: " + err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSubject(data) {
    await saveSubject(schoolId, data);
    await fetchSubjects();
    onDataChanged?.({ grade: String(data.grade), delta: 1, type: "subject" });
  }

  async function handleDelete(subject) {
    if (!window.confirm(`"${subject.name}" 과목을 삭제하시겠습니까?`)) return;
    try {
      await deleteSubject(schoolId, subject.id);
      setSubjects(prev => prev.filter(s => s.id !== subject.id));
      onDataChanged?.({ grade: String(subject.grade), delta: -1, type: "subject" });
    } catch (err) {
      setNotice({ type: "err", msg: "삭제 실패: " + err.message });
    }
  }

  async function handleDeleteFiltered() {
    if (!filtered.length) return;
    const label = gradeFilter === "all" ? "전체" : `${gradeFilter}학년`;
    if (!window.confirm(`${label} 과목 ${filtered.length}개를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    setLoading(true);
    try {
      if (gradeFilter === "all") {
        await deleteSubjectsByYear(schoolId, null);
        setSubjects([]);
      } else {
        for (const subject of filtered) {
          await deleteSubject(schoolId, subject.id);
        }
        setSubjects(prev => prev.filter(s => s.grade !== gradeFilter));
      }
      setNotice({ type: "ok", msg: `${label} 과목 ${filtered.length}개가 삭제되었습니다.` });
      onDataChanged?.({ grade: gradeFilter === "all" ? "all" : String(gradeFilter), delta: -filtered.length, type: "subject" });
    } catch (err) {
      setNotice({ type: "err", msg: "삭제 실패: " + err.message });
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadExcel() {
    if (!subjects.length) {
      alert("다운로드할 과목이 없습니다.");
      return;
    }

    const data = subjects.map(s => ({
      "구분": s.category || "",
      "교과군": s.subjectGroup || "",
      "과목구분": s.courseType || "",
      "과목명": s.name || "",
      "과목코드": s.subjectCode || "",
      "학년": s.grade || "",
      "학기": s.semester === "both" ? "양학기" : (s.semester || ""),
      "1학기_학급": s.semester === "both" ? (s.semesterClassMap?.[1] || []).join(",") : "",
      "2학기_학급": s.semester === "both" ? (s.semesterClassMap?.[2] || []).join(",") : "",
      "기본학점": s.baseCredits || "",
      "운영학점": s.credits || "",
      "입학년도": s.entryYear || "",
      "선택블록_학년": s.selectionBlock?.grade || "",
      "선택블록_학기": s.selectionBlock?.semester || "",
      "선택블록_택N": s.selectionBlock?.pickCount || "",
      "선택블록_번호": s.selectionBlock?.blockNumber || "",
      "비고": s.description || "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "과목목록");

    const now = new Date();
    const fileName = `과목목록_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(wb, fileName);

    setNotice({ type: "ok", msg: `${subjects.length}개 과목을 다운로드했습니다.` });
  }

  // 필터 목록
  const allSg = ["전체", ...new Set(subjects.map(s => s.subjectGroup).filter(Boolean))];
  const filtered = sortData(
    subjects.filter(s => {
      if (gradeFilter !== "all" && s.grade !== gradeFilter) return false;
      if (catFilter !== "전체" && s.category !== catFilter) return false;
      if (sgFilter !== "전체" && s.subjectGroup !== sgFilter) return false;
      return true;
    }),
    {
      category:     (s) => s.category || "",
      subjectGroup: (s) => s.subjectGroup || "",
      courseType:   (s) => s.courseType || "",
      name:         (s) => s.name || "",
      subjectCode:  (s) => s.subjectCode || "",
      credits:      (s) => Number(s.credits) || 0,
      entryYear:    (s) => s.entryYear || "",
    }
  );
  const countByGrade = {
    all: subjects.length,
    1: subjects.filter(s => s.grade === 1).length,
    2: subjects.filter(s => s.grade === 2).length,
    3: subjects.filter(s => s.grade === 3).length,
  };

  // 등록된 입학년도 목록 (표시용)
  const entryYears = [...new Set(subjects.map(s => s.entryYear).filter(Boolean))].sort();

  return (
    <div style={s.page}>
      {/* 페이지 헤더 */}
      <div style={s.pageHeader}>
        <div>
          <p style={s.eyebrow}>기초 데이터</p>
          <h2 style={s.pageTitle}>과목 기초 데이터</h2>
          {entryYears.length > 0 && (
            <p style={{ fontSize: "0.78rem", color: "#9ca3af", margin: "0.2rem 0 0" }}>
              등록 입학년도: {entryYears.map(y => `${y}년 (${y}학번)`).join(", ")}
            </p>
          )}
        </div>
        <div style={s.btnRow}>
          {subjects.length > 0 && (
            <button style={s.outlineBtn} onClick={handleDownloadExcel} disabled={loading}>
              Excel 다운로드
            </button>
          )}
          {!readOnly && (
            <>
              <button style={s.outlineBtn} onClick={() => setImportOpen(true)}>
                엑셀 가져오기
              </button>
              <button style={s.primaryBtn} onClick={() => { setEditTarget(null); setModalOpen(true); }}>
                + 과목 추가
              </button>
            </>
          )}
        </div>
      </div>

      {/* 알림 */}
      {notice && (
        <div style={{ ...s.notice, ...(notice.type === "ok" ? s.noticeOk : s.noticeErr) }}>
          <span>{notice.msg}</span>
          <button onClick={() => setNotice(null)} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* 필터 */}
      <div style={s.filterRow}>
        {GRADE_TABS.map(tab => (
          <button key={tab.key} style={gradeFilter === tab.key ? s.tabActive : s.tab}
            onClick={() => setGradeFilter(tab.key)}>
            {tab.label}
            <span style={gradeFilter === tab.key ? s.badgeActive : s.badge}>
              {countByGrade[tab.key]}
            </span>
          </button>
        ))}
        <div style={s.divider} />
        {["전체", "학교지정", "학생선택"].map(cat => (
          <button key={cat} style={catFilter === cat ? s.tabActive : s.tab}
            onClick={() => setCatFilter(cat)}>
            {cat}
          </button>
        ))}
        <div style={s.divider} />
        <select style={s.filterSelect} value={sgFilter} onChange={e => setSgFilter(e.target.value)}>
          {allSg.map(sg => <option key={sg}>{sg}</option>)}
        </select>
      </div>

      {/* 테이블 */}
      <table style={s.table}>
        <colgroup>
          <col />                              {/* 구분 - 배지 길이에 자동 맞춤 */}
          <col style={{ width: "128px" }} />  {/* 교과군 */}
          <col style={{ width: "72px" }} />   {/* 과목구분 */}
          <col style={{ width: "9999px" }} /> {/* 과목명 - 나머지 전부 */}
          <col style={{ width: "88px" }} />   {/* 과목코드 */}
          <col style={{ width: "48px" }} />   {/* 학점 */}
          <col style={{ width: "118px" }} />  {/* 개설정보 */}
          <col style={{ width: "78px" }} />   {/* 입학년도 */}
          <col style={{ width: "112px" }} />  {/* 작업 */}
        </colgroup>
        <thead style={s.thead}>
          <tr>
            <th style={{ ...s.th, ...thSort }} onClick={() => sortToggle("category")}>구분{Ind("category")}</th>
            <th style={{ ...s.th, ...thSort }} onClick={() => sortToggle("subjectGroup")}>교과군{Ind("subjectGroup")}</th>
            <th style={{ ...s.th, ...thSort }} onClick={() => sortToggle("courseType")}>과목구분{Ind("courseType")}</th>
            <th style={{ ...s.th, ...thSort }} onClick={() => sortToggle("name")}>과목명{Ind("name")}</th>
            <th style={{ ...s.th, ...thSort }} onClick={() => sortToggle("subjectCode")}>과목코드{Ind("subjectCode")}</th>
            <th style={{ ...s.th, ...thSort }} onClick={() => sortToggle("credits")}>학점{Ind("credits")}</th>
            <th style={s.th}>개설정보</th>
            <th style={{ ...s.th, ...thSort }} onClick={() => sortToggle("entryYear")}>입학년도{Ind("entryYear")}</th>
            <th style={s.thRight}>
              {!readOnly && filtered.length > 0 ? (
                <button style={s.dangerOutlineBtn} onClick={handleDeleteFiltered} disabled={loading}>
                  {gradeFilter === "all" ? "전체" : `${gradeFilter}학년`} 삭제 ({filtered.length}개)
                </button>
              ) : filtered.length > 0 ? (
                <span style={{ fontSize: "0.78rem", color: "#9ca3af", fontWeight: 400 }}>
                  {filtered.length}개
                </span>
              ) : null}
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={9} style={s.emptyRow}>불러오는 중…</td></tr>
          ) : filtered.length === 0 ? (
            <tr><td colSpan={9} style={s.emptyRow}>
              {subjects.length === 0
                ? "등록된 과목이 없습니다. 엑셀 가져오기 또는 과목 추가를 이용하세요."
                : "조건에 맞는 과목이 없습니다."}
            </td></tr>
          ) : filtered.map(subject => (
            <tr key={subject.id} style={s.tr}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f9fafb"}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = ""}>
              <td style={s.td}>
                <span style={subject.category === "학교지정" ? s.badgeSpec : s.badgeSel}>
                  {subject.category === "학교지정" ? "지정" : "선택"}
                </span>
              </td>
              <td style={s.tdMuted}>{subject.subjectGroup || "—"}</td>
              <td style={{ ...s.tdMuted, fontSize: "0.78rem" }}>{subject.courseType || "—"}</td>
              <td style={{ ...s.td, fontWeight: 600 }}>{subject.name}</td>
              <td style={{ ...s.tdMuted, fontSize: "0.78rem", fontFamily: "monospace" }}>
                {subject.subjectCode || "—"}
              </td>
              <td style={s.tdMuted}>{subject.credits || "—"}</td>
              <td style={s.tdMuted}>{scheduleLabel(subject)}</td>
              <td style={s.tdMuted}>{subject.entryYear || "—"}</td>
              <td style={s.tdRight}>
                {!readOnly && (
                  <>
                    <button style={s.editBtn} onClick={() => { setEditTarget(subject); setModalOpen(true); }}>수정</button>
                    <button style={s.deleteBtn} onClick={() => handleDelete(subject)}>삭제</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 과목 추가/수정 모달 */}
      {modalOpen && (
        <SubjectModal
          subject={editTarget}
          onClose={() => { setModalOpen(false); setEditTarget(null); }}
          onSave={handleSaveSubject}
          classesByGrade={classesByGrade}
        />
      )}

      {/* 엑셀 가져오기 모달 */}
      {importOpen && (
        <ImportModal
          schoolId={schoolId}
          onClose={() => setImportOpen(false)}
          onDone={(count, year) => {
            setImportOpen(false);
            setNotice({ type: "ok", msg: `${year}년 입학 과목 ${count}개 저장 완료` });
            fetchSubjects();
            onDataChanged?.({ grade: "all", delta: count, type: "subject" });
          }}
        />
      )}
    </div>
  );
}
