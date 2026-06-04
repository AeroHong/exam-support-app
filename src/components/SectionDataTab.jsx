import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { bulkSaveEnrollmentsByGrade, upsertStudentsFromSection } from "../lib/firestoreData";
import { parseSectionFile } from "../utils/sectionParser";

const s = {
  section:     { marginBottom: "2rem" },
  sectionHead: { fontSize: "0.75rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem" },

  statusCard:  { border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1rem 1.25rem", backgroundColor: "#fff", marginBottom: "1rem" },
  emptyHint:   { fontSize: "0.85rem", color: "#9ca3af", fontStyle: "italic" },

  gradeBlock:  { marginBottom: "0.75rem" },
  gradeLabel:  { fontSize: "0.8rem", fontWeight: 700, color: "#374151", marginBottom: "0.35rem" },
  subjectRow:  { display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem", fontSize: "0.8rem" },
  subjectName: { color: "#374151", minWidth: "7rem" },
  sectionChip: { display: "inline-block", padding: "0.05rem 0.45rem", backgroundColor: "#eef2ff", color: "#4338ca", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700 },

  uploadArea:  { border: "2px dashed #d1d5db", borderRadius: "10px", padding: "2rem", textAlign: "center", backgroundColor: "#fafafa", cursor: "pointer", marginBottom: "1rem" },
  uploadText:  { fontSize: "0.9rem", color: "#6b7280", margin: 0 },
  uploadHint:  { fontSize: "0.78rem", color: "#9ca3af", margin: "0.4rem 0 0" },
  primaryBtn:  { padding: "0.45rem 1.1rem", backgroundColor: "#4f46e5", color: "#fff", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 },
  outlineBtn:  { padding: "0.45rem 1.1rem", backgroundColor: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: "7px", cursor: "pointer", fontSize: "0.85rem" },
  dangerBtn:   { padding: "0.35rem 0.85rem", backgroundColor: "#fff", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "7px", cursor: "pointer", fontSize: "0.82rem" },
  btnRow:      { display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" },

  notice:      { padding: "0.6rem 1rem", borderRadius: "7px", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.75rem" },
  noticeOk:    { backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" },
  noticeErr:   { backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
  noticeInfo:  { backgroundColor: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },

  previewCard: { border: "1px solid #e5e7eb", borderRadius: "10px", backgroundColor: "#fff", overflow: "hidden", marginBottom: "1rem" },
  previewHdr:  { padding: "0.6rem 1rem", backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" },
  previewTitle:{ fontSize: "0.8rem", fontWeight: 700, color: "#374151" },
  formatBadge: { fontSize: "0.7rem", fontWeight: 700, backgroundColor: "#e0f2fe", color: "#0369a1", padding: "0.1rem 0.5rem", borderRadius: "999px" },

  table:       { width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" },
  th:          { padding: "0.4rem 0.75rem", backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb", textAlign: "center", fontWeight: 700, color: "#374151", whiteSpace: "nowrap" },
  thLeft:      { padding: "0.4rem 0.75rem", backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb", textAlign: "left", fontWeight: 700, color: "#374151" },
  td:          { padding: "0.35rem 0.75rem", borderBottom: "1px solid #f3f4f6", textAlign: "center", color: "#374151" },
  tdLeft:      { padding: "0.35rem 0.75rem", borderBottom: "1px solid #f3f4f6", textAlign: "left", color: "#374151" },
  tdMuted:     { padding: "0.35rem 0.75rem", borderBottom: "1px solid #f3f4f6", textAlign: "center", color: "#d1d5db" },
  tdBold:      { padding: "0.35rem 0.75rem", borderBottom: "1px solid #f3f4f6", textAlign: "center", fontWeight: 700, color: "#111827" },
  gradeSep:    { padding: "0.3rem 0.75rem", backgroundColor: "#f3f4f6", fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textAlign: "left" },
};

// ─── 현재 분반 현황 표시 ──────────────────────────────────────────────────────

function CurrentSectionStatus({ enrollments }) {
  const sectionsByGrade = useMemo(() => {
    const result = {};
    for (const e of enrollments) {
      if (!e.section) continue;
      const g = String(e.grade);
      if (!result[g]) result[g] = {};
      if (!result[g][e.subjectName]) result[g][e.subjectName] = new Set();
      result[g][e.subjectName].add(e.section);
    }
    return result;
  }, [enrollments]);

  const grades = Object.keys(sectionsByGrade).sort();

  if (grades.length === 0) {
    return (
      <div style={s.statusCard}>
        <p style={s.emptyHint}>분반 데이터가 없습니다. 아래에서 파일을 업로드해 주세요.</p>
      </div>
    );
  }

  return (
    <div style={s.statusCard}>
      {grades.map((g) => (
        <div key={g} style={s.gradeBlock}>
          <p style={s.gradeLabel}>{g}학년</p>
          {Object.entries(sectionsByGrade[g]).map(([subject, sections]) => (
            <div key={subject} style={s.subjectRow}>
              <span style={s.subjectName}>{subject}</span>
              {[...sections].sort().map((sec) => (
                <span key={sec} style={s.sectionChip}>{sec}</span>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── 미리보기 테이블 ──────────────────────────────────────────────────────────

function PreviewTable({ parsed }) {
  const { sectionsByGrade, format, students } = parsed;
  const grades = Object.keys(sectionsByGrade).sort();

  // 전체 사용된 분반 문자 수집
  const allSections = new Set();
  for (const g of grades) {
    for (const subject of Object.keys(sectionsByGrade[g])) {
      for (const sec of Object.keys(sectionsByGrade[g][subject])) {
        allSections.add(sec);
      }
    }
  }
  const secCols = [...allSections].sort();

  // 학년별 학생 수
  const studentByGrade = {};
  for (const st of students) {
    const g = String(st.grade);
    studentByGrade[g] = (studentByGrade[g] ?? 0) + 1;
  }

  const formatLabel = format === "mixed" ? "1행+3행 혼합" : format === "samsung" ? "3행 헤더" : "1행 헤더";

  return (
    <div style={s.previewCard}>
      <div style={s.previewHdr}>
        <span style={s.previewTitle}>
          파싱 결과 미리보기 · 총 {students.length}명
        </span>
        <span style={s.formatBadge}>{formatLabel}</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.thLeft}>과목</th>
              {secCols.map((sec) => (
                <th key={sec} style={s.th}>{sec}</th>
              ))}
              <th style={s.th}>합계</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((g) => {
              const subjectMap = sectionsByGrade[g];
              const subjectNames = Object.keys(subjectMap).sort();
              return [
                <tr key={`grade-${g}`}>
                  <td colSpan={secCols.length + 2} style={s.gradeSep}>
                    {g}학년 · 학생 {studentByGrade[g] ?? 0}명
                  </td>
                </tr>,
                ...subjectNames.map((subjectName) => {
                  const secCounts = subjectMap[subjectName];
                  const total = Object.values(secCounts).reduce((a, b) => a + b, 0);
                  return (
                    <tr key={`${g}-${subjectName}`}>
                      <td style={s.tdLeft}>{subjectName}</td>
                      {secCols.map((sec) => (
                        <td key={sec} style={secCounts[sec] ? s.td : s.tdMuted}>
                          {secCounts[sec] ?? "—"}
                        </td>
                      ))}
                      <td style={s.tdBold}>{total}</td>
                    </tr>
                  );
                }),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

function downloadSampleFile() {
  // 예시 파일: 1행 헤더, 과목 열에 분반 문자(A~E) 또는 빈 칸
  const data = [
    ["학년", "반", "번호", "이름", "성별", "선택과목1", "선택과목2", "선택과목3", "선택과목4"],
    [2, 1, 1, "홍길동", "남", "A", "", "B", ""],
    [2, 1, 2, "김영희", "여", "", "C", "A", "D"],
    [2, 2, 1, "이철수", "남", "B", "A", "", ""],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  // 열 너비 설정
  ws["!cols"] = [
    { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 10 }, { wch: 6 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "분반데이터");
  XLSX.writeFile(wb, "분반데이터_예시.xlsx");
}

export default function SectionDataTab({ schoolId, enrollments = [], onDataChanged, readOnly = false }) {
  const fileRef = useRef(null);
  const [parsed, setParsed] = useState(null);
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);

  function flash(msg, type = "ok") {
    setNotice({ msg, type });
    setTimeout(() => setNotice(null), 4000);
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const result = parseSectionFile(ev.target.result);
        if (result.students.length === 0) {
          flash("학생 데이터를 찾을 수 없습니다. 파일을 확인해주세요.", "err");
          return;
        }
        setParsed(result);
        setNotice(null);
      } catch (err) {
        flash(err.message || "파일 파싱 오류가 발생했습니다.", "err");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleConfirm() {
    if (!parsed || saving) return;
    setSaving(true);
    try {
      // 1. 학생 upsert (기존 examStatus 등 보존)
      await upsertStudentsFromSection(schoolId, parsed.students);

      // 2. 학년별 enrollment 교체 (section 포함)
      const gradeMap = {};
      for (const e of parsed.enrollments) {
        const g = String(e.grade);
        if (!gradeMap[g]) gradeMap[g] = [];
        gradeMap[g].push(e);
      }
      for (const [grade, enrs] of Object.entries(gradeMap)) {
        await bulkSaveEnrollmentsByGrade(schoolId, enrs, Number(grade));
      }

      const grades = Object.keys(gradeMap).sort().join(", ");
      flash(`${grades}학년 분반 데이터 저장 완료 (학생 ${parsed.students.length}명)`, "ok");
      setParsed(null);

      if (onDataChanged) {
        const affectedGrades = Object.keys(gradeMap);
        for (const g of affectedGrades) {
          await onDataChanged({ grade: Number(g), delta: 0, type: "section" });
        }
      }
    } catch (err) {
      flash(err.message || "저장 중 오류가 발생했습니다.", "err");
    } finally {
      setSaving(false);
    }
  }

  async function handleClearSections() {
    if (!window.confirm("모든 학년의 분반 데이터(section)를 초기화하시겠습니까?\n수강신청 정보는 유지되며 분반 정보만 제거됩니다.")) return;
    setSaving(true);
    try {
      // section 필드를 null로 설정한 enrollment 목록 재저장 (학년별)
      const gradeMap = {};
      for (const e of enrollments) {
        const g = String(e.grade);
        if (!gradeMap[g]) gradeMap[g] = [];
        gradeMap[g].push({ ...e, section: null });
      }
      for (const [grade, enrs] of Object.entries(gradeMap)) {
        await bulkSaveEnrollmentsByGrade(schoolId, enrs, Number(grade));
      }
      flash("분반 데이터를 초기화했습니다.", "ok");
      if (onDataChanged) await onDataChanged({ grade: "all", delta: 0, type: "section" });
    } catch (err) {
      flash(err.message || "초기화 중 오류가 발생했습니다.", "err");
    } finally {
      setSaving(false);
    }
  }

  const hasSections = enrollments.some((e) => e.section);

  return (
    <div>
      {/* ── 현재 분반 현황 ── */}
      <div style={s.section}>
        <p style={s.sectionHead}>현재 분반 데이터</p>
        <CurrentSectionStatus enrollments={enrollments} />
        {hasSections && !readOnly && (
          <button style={s.dangerBtn} onClick={handleClearSections} disabled={saving}>
            분반 데이터 초기화
          </button>
        )}
      </div>

      {/* ── 파일 업로드 ── */}
      {!readOnly && (
        <div style={s.section}>
          <p style={s.sectionHead}>파일 업로드</p>

          {notice && (
            <div style={{ ...s.notice, ...(notice.type === "ok" ? s.noticeOk : notice.type === "err" ? s.noticeErr : s.noticeInfo) }}>
              {notice.msg}
            </div>
          )}

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", alignItems: "center" }}>
            <button style={s.outlineBtn} onClick={downloadSampleFile}>
              예시 파일 다운로드
            </button>
            <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>
              헤더 구조를 확인하고 데이터를 채워 업로드하세요.
            </span>
          </div>

          <div
            style={s.uploadArea}
            onClick={() => fileRef.current?.click()}
          >
            <p style={s.uploadText}>클릭하여 분반 파일 선택</p>
            <p style={s.uploadHint}>xlsx / csv · 1행 헤더 또는 3행 헤더 형식</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          {/* ── 파싱 미리보기 ── */}
          {parsed && (
            <>
              <PreviewTable parsed={parsed} />
              <div style={s.btnRow}>
                <button style={s.primaryBtn} onClick={handleConfirm} disabled={saving}>
                  {saving ? "저장 중..." : "확인 — 저장"}
                </button>
                <button style={s.outlineBtn} onClick={() => setParsed(null)} disabled={saving}>
                  취소
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── 안내 ── */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1rem 1.25rem", backgroundColor: "#f9fafb" }}>
        <p style={{ ...s.sectionHead, marginBottom: "0.5rem" }}>안내</p>
        <ul style={{ fontSize: "0.82rem", color: "#6b7280", margin: 0, paddingLeft: "1.2rem", lineHeight: 1.8 }}>
          <li>업로드 시 해당 학년의 학생 명렬과 수강신청 정보가 함께 갱신됩니다.</li>
          <li><strong>1행 헤더 형식</strong>: 학년·반·번호·이름·성별 이후 열에 과목명을 헤더로, 값은 분반(A–M) 또는 빈 칸.</li>
          <li><strong>3행 헤더 형식</strong>: 학기·지정/선택·과목명 순서의 3행 헤더 (기존 파일 그대로 사용 가능).</li>
          <li>분반 데이터가 있으면 고사실 배정 시 "분반별 배정" 방식을 선택할 수 있습니다.</li>
        </ul>
      </div>
    </div>
  );
}
