import { Fragment, useEffect, useRef, useState } from "react";
import { DEFAULT_PERIODS } from "../data/defaults";

// ─── 스타일 ──────────────────────────────────────────────────────────────────

const s = {
  page:        { padding: "1.5rem", maxWidth: "1200px" },
  pageHeader:  { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.25rem" },
  eyebrow:     { fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" },
  pageTitle:   { fontSize: "1.5rem", fontWeight: 800, color: "#111827", margin: 0 },
  btnRow:      { display: "flex", gap: "0.5rem", alignItems: "center" },

  primaryBtn:  { padding: "0.45rem 1rem", backgroundColor: "#4f46e5", color: "#fff", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 },
  outlineBtn:  { padding: "0.45rem 1rem", backgroundColor: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: "7px", cursor: "pointer", fontSize: "0.85rem" },
  dangerOutlineBtn: { padding: "0.25rem 0.6rem", backgroundColor: "#fff", color: "#dc2626", border: "1px solid #dc2626", borderRadius: "5px", cursor: "pointer", fontSize: "0.75rem" },
  textBtn:     { padding: "0.2rem 0.5rem", backgroundColor: "transparent", color: "#6b7280", border: "none", cursor: "pointer", fontSize: "0.78rem" },

  filterRow:   { display: "flex", gap: "0.4rem", marginBottom: "0.75rem", alignItems: "center", flexWrap: "wrap" },
  tab:         { padding: "0.3rem 0.75rem", border: "1px solid #e5e7eb", borderRadius: "999px", cursor: "pointer", fontSize: "0.82rem", backgroundColor: "#fff", color: "#6b7280" },
  tabActive:   { padding: "0.3rem 0.75rem", border: "1px solid #4f46e5", borderRadius: "999px", cursor: "pointer", fontSize: "0.82rem", backgroundColor: "#eef2ff", color: "#4f46e5", fontWeight: 700 },
  badge:       { display: "inline-block", fontSize: "0.72rem", fontWeight: 600, backgroundColor: "#e5e7eb", color: "#374151", borderRadius: "999px", padding: "0.05rem 0.45rem", marginLeft: "0.3rem" },
  badgeActive: { display: "inline-block", fontSize: "0.72rem", fontWeight: 600, backgroundColor: "#c7d2fe", color: "#3730a3", borderRadius: "999px", padding: "0.05rem 0.45rem", marginLeft: "0.3rem" },

  // 설정 섹션
  settingsBox:   { border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1rem 1.25rem", marginBottom: "1.25rem", backgroundColor: "#fafafa" },
  settingsToggle:{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", marginBottom: "0" },
  settingsTitle: { fontSize: "0.85rem", fontWeight: 700, color: "#374151" },
  settingsGrid:  { display: "flex", flexDirection: "column", gap: "1.25rem", marginTop: "1rem" },
  settingsRow:   { display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "1.25rem" },
  settingsLabel: { fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.4rem" },
  input:         { width: "100%", padding: "0.45rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "0.875rem", boxSizing: "border-box", outline: "none" },

  // 테이블
  tableWrap:   { overflowX: "auto" },
  table:       { width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" },
  thead:       { backgroundColor: "#f9fafb" },
  th:          { padding: "0.5rem 0.75rem", fontWeight: 700, color: "#374151", textAlign: "left", borderBottom: "2px solid #e5e7eb", fontSize: "0.8rem", whiteSpace: "nowrap" },
  thCenter:    { padding: "0.5rem 0.75rem", fontWeight: 700, color: "#374151", textAlign: "center", borderBottom: "2px solid #e5e7eb", fontSize: "0.8rem", whiteSpace: "nowrap" },
  tr:          { borderBottom: "1px solid #f3f4f6" },
  td:          { padding: "0.4rem 0.75rem", color: "#111827", verticalAlign: "middle" },
  tdCenter:    { padding: "0.4rem 0.75rem", color: "#111827", verticalAlign: "middle", textAlign: "center" },
  tdMuted:     { padding: "0.4rem 0.75rem", color: "#9ca3af", fontSize: "0.82rem", verticalAlign: "middle" },
  emptyRow:    { textAlign: "center", padding: "2rem", color: "#9ca3af", fontSize: "0.9rem" },

  gradeRow:    { backgroundColor: "#f3f4f6", fontWeight: 700, padding: "0.35rem 0.75rem", fontSize: "0.8rem", color: "#374151" },

  subjectLink: { color: "#4f46e5", cursor: "pointer", fontWeight: 600, textDecoration: "none", background: "none", border: "none", padding: 0, fontSize: "inherit" },

  summaryStrip:{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" },
  summaryChip: { display: "inline-block", fontSize: "0.78rem", fontWeight: 700, backgroundColor: "#dbeafe", color: "#1d4ed8", borderRadius: "999px", padding: "0.3rem 0.7rem" },
  summaryWarn: { display: "inline-block", fontSize: "0.78rem", fontWeight: 700, backgroundColor: "#fee2e2", color: "#b91c1c", borderRadius: "999px", padding: "0.3rem 0.7rem" },

  // 소형 입력 (테이블 내부)
  inputSm:     { width: "72px", padding: "0.28rem 0.45rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.82rem", textAlign: "center" },
  inputDate:   { width: "140px", padding: "0.28rem 0.45rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.82rem" },
  inputLabel:  { width: "100px", padding: "0.28rem 0.45rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.82rem" },
  inputTime:   { width: "120px", padding: "0.28rem 0.45rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.82rem" },
  selectDur:   { padding: "0.28rem 0.35rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.82rem", cursor: "pointer", backgroundColor: "#fff", color: "#374151" },
  inputDur:    { width: "52px", padding: "0.28rem 0.4rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.82rem", textAlign: "center" },

  // 모달
  backdrop:    { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal:       { backgroundColor: "#fff", borderRadius: "12px", padding: "1.5rem", width: "min(560px, 95vw)", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" },
  modalTitle:  { fontSize: "1.1rem", fontWeight: 800, color: "#111827", marginBottom: "0.25rem" },
  modalSub:    { fontSize: "0.82rem", color: "#6b7280", marginBottom: "1rem" },
  modalActions:{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" },

  addRowBtn:   { display: "inline-block", marginTop: "0.5rem", padding: "0.25rem 0.6rem", backgroundColor: "#fff", color: "#4f46e5", border: "1px solid #c7d2fe", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem" },

  divider:     { width: "1px", height: "20px", backgroundColor: "#e5e7eb", margin: "0 0.2rem" },

  // 수강생 새로고침 바
  reloadBar:   { display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0.9rem", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", marginBottom: "1rem", flexWrap: "wrap" },
  reloadLabel: { fontSize: "0.78rem", color: "#6b7280", flex: 1, minWidth: 0 },
  reloadBtn:   { padding: "0.2rem 0.65rem", backgroundColor: "#fff", color: "#4f46e5", border: "1px solid #c7d2fe", borderRadius: "5px", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, flexShrink: 0 },
  diffNone:    { fontSize: "0.75rem", color: "#15803d", fontWeight: 600 },
  diffAdded:   { fontSize: "0.75rem", color: "#15803d", fontWeight: 600 },
  diffRemoved: { fontSize: "0.75rem", color: "#b45309", fontWeight: 600, backgroundColor: "#fff7ed", padding: "0.1rem 0.45rem", borderRadius: "999px" },
};

// ─── 상수 ────────────────────────────────────────────────────────────────────

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

// 시험시간 빠른 선택 (10분 단위)
const DURATION_PRESETS = [30, 40, 50, 60, 70, 80, 90, 100];

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function getDayLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return `${DAY_NAMES[d.getDay()]} (${d.getMonth() + 1}/${d.getDate()})`;
}

/** 구형 period.startTime → 신형 period.startTimes 변환 */
function normalizePeriod(period) {
  if (period.startTimes) return period;
  const t = period.startTime ?? "09:00";
  return { ...period, startTimes: { "1": t, "2": t, "3": t } };
}

/** subjects 변경 시 기존 config는 유지하고 새로 추가된 과목만 초기화 */
function mergeExamConfig(sessions, subjects, prevConfig) {
  const bySubjectId = Object.fromEntries(sessions.map((s) => [s.subjectId, s]));
  const next = {};
  subjects.forEach((subject) => {
    if (prevConfig[subject.id]) {
      next[subject.id] = prevConfig[subject.id]; // 기존 상태 보존 (studentCountOverride 포함)
    } else {
      const session = bySubjectId[subject.id];
      next[subject.id] = {
        hasExam: Boolean(session),
        duration: session?.duration ?? 50,
        isEssay: session?.isEssay ?? false,
        studentCountOverride: null,
      };
    }
  });
  return next;
}

/** 학교지정: 해당 학년 전체 학생 수 / 학생선택: enrollment 기반 */
function calcAutoCount(subject, students, enrollments) {
  if (subject.category === "학교지정") {
    return students.filter((s) => String(s.grade) === String(subject.grade)).length;
  }
  return enrollments.filter(
    (e) => e.subjectName === subject.name || e.subjectId === subject.id,
  ).length;
}

// ─── 학생 목록 모달 ───────────────────────────────────────────────────────────

function StudentListModal({ subject, students, enrollments, onClose }) {
  const gradeStudents = students.filter((s) => String(s.grade) === String(subject.grade));

  const list =
    subject.category === "학교지정"
      ? gradeStudents.sort((a, b) => a.id.localeCompare(b.id))
      : (() => {
          const enrolled = new Set(
            enrollments
              .filter((e) => e.subjectName === subject.name || e.subjectId === subject.id)
              .map((e) => e.studentId),
          );
          return gradeStudents.filter((s) => enrolled.has(s.id)).sort((a, b) => a.id.localeCompare(b.id));
        })();

  return (
    <div style={s.backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <p style={s.modalTitle}>{subject.name}</p>
        <p style={s.modalSub}>
          {subject.grade}학년 · {subject.category === "학교지정" ? "학교지정" : "학생선택"} · {list.length}명
        </p>
        {list.length === 0 ? (
          <p style={s.emptyRow}>응시 학생이 없습니다.</p>
        ) : (
          <div style={s.tableWrap}>
            <table style={{ ...s.table, minWidth: "320px" }}>
              <thead style={s.thead}>
                <tr>
                  <th style={s.th}>학번</th>
                  <th style={s.th}>반</th>
                  <th style={s.th}>번호</th>
                  <th style={s.th}>이름</th>
                </tr>
              </thead>
              <tbody>
                {list.map((student) => (
                  <tr key={student.id} style={s.tr}>
                    <td style={s.tdMuted}>{student.id}</td>
                    <td style={s.td}>{student.classNo}</td>
                    <td style={s.td}>{student.number}</td>
                    <td style={s.td}>{student.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={s.modalActions}>
          <button style={s.outlineBtn} onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

const GRADE_TABS = [
  { key: "all", label: "전체" },
  { key: "1",   label: "1학년" },
  { key: "2",   label: "2학년" },
  { key: "3",   label: "3학년" },
];

function formatLoadedAt(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  return d.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function summarizeDiff(diff) {
  if (!diff) return null;
  const parts = [];
  if (diff.removed.length > 0) {
    const names = diff.removed.slice(0, 3).map((s) => s.name).join(", ");
    const extra = diff.removed.length > 3 ? ` 외 ${diff.removed.length - 3}명` : "";
    parts.push({ type: "removed", text: `${diff.removed.length}명 감소 (${names}${extra})` });
  }
  if (diff.added.length > 0) {
    const names = diff.added.slice(0, 3).map((s) => s.name).join(", ");
    const extra = diff.added.length > 3 ? ` 외 ${diff.added.length - 3}명` : "";
    parts.push({ type: "added", text: `${diff.added.length}명 추가 (${names}${extra})` });
  }
  return parts;
}

export default function ExamPlanPage({ plan, onPlanChange, subjects, students, enrollments, studentsLoadedAt, onReloadStudents }) {
  const [planName, setPlanName]   = useState(plan.name ?? "");
  const [semester, setSemester]   = useState(plan.semester ?? null);
  const [days, setDays]           = useState(plan.days ?? []);
  const [periods, setPeriods]     = useState(() =>
    (plan.periods?.length ? plan.periods : DEFAULT_PERIODS).map(normalizePeriod),
  );
  const [examConfig, setExamConfig] = useState({});
  const [gradeFilter, setGradeFilter] = useState("all");
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [modalSubject, setModalSubject] = useState(null);
  const [isReloading, setIsReloading] = useState(false);
  const [enrollmentDiff, setEnrollmentDiff] = useState(null);
  const planSessionsRef = useRef(plan.sessions);
  planSessionsRef.current = plan.sessions;

  // subjects 변경 시 기존 override는 유지, 새 과목만 초기화
  useEffect(() => {
    if (subjects.length === 0) return;
    setExamConfig((prev) => mergeExamConfig(planSessionsRef.current, subjects, prev));
  }, [subjects]);

  useEffect(() => {
    setPlanName(plan.name ?? "");
    setSemester(plan.semester ?? null);
    setDays(plan.days ?? []);
    setPeriods((plan.periods?.length ? plan.periods : DEFAULT_PERIODS).map(normalizePeriod));
  }, [plan.id]);

  const updateConfig = (subjectId, patch) =>
    setExamConfig((c) => ({ ...c, [subjectId]: { ...c[subjectId], ...patch } }));

  // ── 날짜 관리 ──
  const addDay = () =>
    setDays((c) => [...c, { id: `day-${Date.now()}`, date: "", label: "" }]);

  const updateDay = (dayId, patch) =>
    setDays((c) =>
      c.map((day) => {
        if (day.id !== dayId) return day;
        const next = { ...day, ...patch };
        if (patch.date !== undefined) {
          const wasAuto = !day.label || day.label === getDayLabel(day.date);
          if (wasAuto) next.label = getDayLabel(patch.date);
        }
        return next;
      }),
    );

  const removeDay = (dayId) => setDays((c) => c.filter((d) => d.id !== dayId));

  // ── 교시 관리 ──
  const addPeriod = () =>
    setPeriods((c) => [
      ...c,
      {
        id: `period-${Date.now()}`,
        label: `${c.length + 1}교시`,
        startTimes: { "1": "09:00", "2": "09:00", "3": "09:00" },
      },
    ]);

  const updatePeriod = (periodId, patch) =>
    setPeriods((c) => c.map((p) => (p.id === periodId ? { ...p, ...patch } : p)));

  const updatePeriodStartTime = (periodId, grade, value) =>
    setPeriods((c) =>
      c.map((p) =>
        p.id === periodId
          ? { ...p, startTimes: { ...p.startTimes, [grade]: value } }
          : p,
      ),
    );

  const removePeriod = (periodId) => setPeriods((c) => c.filter((p) => p.id !== periodId));

  // ── 수강생 새로고침 ──
  const handleReloadStudents = async () => {
    if (!onReloadStudents) return;
    const prevStudents = students;
    setIsReloading(true);
    setEnrollmentDiff(null);
    try {
      const newData = await onReloadStudents();
      if (newData) {
        const prevIds = new Set(prevStudents.map((s) => s.id));
        const nextIds = new Set(newData.students.map((s) => s.id));
        const added   = newData.students.filter((s) => !prevIds.has(s.id));
        const removed = prevStudents.filter((s) => !nextIds.has(s.id));
        setEnrollmentDiff({ added, removed });
      }
    } finally {
      setIsReloading(false);
    }
  };

  // ── 세션 생성 적용 ──
  const handleApply = () => {
    const sessionBySubjectId = Object.fromEntries(plan.sessions.map((s) => [s.subjectId, s]));

    const newSessions = subjects
      .filter((subject) => examConfig[subject.id]?.hasExam)
      .map((subject) => {
        const cfg      = examConfig[subject.id] ?? {};
        const existing = sessionBySubjectId[subject.id];
        const autoCount = calcAutoCount(subject, students, enrollments);
        const studentCount =
          cfg.studentCountOverride !== null && cfg.studentCountOverride !== undefined
            ? Number(cfg.studentCountOverride)
            : autoCount;

        return {
          id:          existing?.id ?? `session-${subject.id}`,
          subjectId:   subject.id,
          subjectName: subject.name,
          subjectCode: subject.subjectCode ?? "",
          grade:       String(subject.grade),
          dayId:       existing?.dayId ?? "",
          periodId:    existing?.periodId ?? "",
          startTime:   existing?.startTime ?? "",
          duration:    cfg.duration ?? 50,
          dateLabel:   existing?.dateLabel ?? "미배치",
          roomIds:     existing?.roomIds ?? [],
          studentCount,
          isRequired:  subject.category === "학교지정",
          isEssay:     cfg.isEssay ?? false,
          classSummary: existing?.classSummary ?? "",
        };
      });

    onPlanChange({ name: planName, semester, days, periods, sessions: newSessions });
  };

  // ── 파생값 ──
  const semesterSubjects = semester
    ? subjects.filter((s) => s.semester === semester)
    : subjects;

  const subjectsByGrade = semesterSubjects.reduce((acc, subject) => {
    const g = String(subject.grade);
    acc[g] ??= [];
    acc[g].push(subject);
    return acc;
  }, {});

  const countByGrade = {
    all: semesterSubjects.length,
    "1": (subjectsByGrade["1"] ?? []).length,
    "2": (subjectsByGrade["2"] ?? []).length,
    "3": (subjectsByGrade["3"] ?? []).length,
  };

  const filteredSubjects =
    gradeFilter === "all"
      ? semesterSubjects
      : (subjectsByGrade[gradeFilter] ?? []);

  const selectedCount = semesterSubjects.filter((s) => examConfig[s.id]?.hasExam).length;
  const totalStudentCount = semesterSubjects
    .filter((s) => examConfig[s.id]?.hasExam)
    .reduce((sum, subject) => {
      const cfg = examConfig[subject.id] ?? {};
      return (
        sum +
        (cfg.studentCountOverride !== null && cfg.studentCountOverride !== undefined
          ? Number(cfg.studentCountOverride)
          : calcAutoCount(subject, students, enrollments))
      );
    }, 0);

  const renderRows = () => {
    if (gradeFilter !== "all") {
      return filteredSubjects.map((subject) => (
        <SubjectRow
          key={subject.id}
          subject={subject}
          config={examConfig[subject.id] ?? { hasExam: false, duration: 50, isEssay: false, studentCountOverride: null }}
          students={students}
          enrollments={enrollments}
          onConfigChange={(patch) => updateConfig(subject.id, patch)}
          onNameClick={() => setModalSubject(subject)}
        />
      ));
    }

    return ["1", "2", "3"].map((grade) => {
      const gradeSubjects = subjectsByGrade[grade] ?? [];
      if (gradeSubjects.length === 0) return null;
      return (
        <Fragment key={`g${grade}`}>
          <tr>
            <td colSpan={8} style={s.gradeRow}>{grade}학년</td>
          </tr>
          {gradeSubjects.map((subject) => (
            <SubjectRow
              key={subject.id}
              subject={subject}
              config={examConfig[subject.id] ?? { hasExam: false, duration: 50, isEssay: false, studentCountOverride: null }}
              students={students}
              enrollments={enrollments}
              onConfigChange={(patch) => updateConfig(subject.id, patch)}
              onNameClick={() => setModalSubject(subject)}
            />
          ))}
        </Fragment>
      );
    });
  };

  return (
    <div style={s.page}>
      {/* ── 페이지 헤더 ── */}
      <div style={s.pageHeader}>
        <div>
          <p style={s.eyebrow}>시험계획</p>
          <h2 style={s.pageTitle}>응시 과목 확정</h2>
        </div>
        <div style={s.btnRow}>
          <button style={s.primaryBtn} onClick={handleApply}>시험 과목 확정</button>
        </div>
      </div>

      {/* ── 수강생 데이터 새로고침 바 ── */}
      {onReloadStudents && (
        <div style={s.reloadBar}>
          <span style={s.reloadLabel}>
            수강생 데이터
            {studentsLoadedAt
              ? ` · 최근 업데이트 ${formatLoadedAt(studentsLoadedAt)}`
              : " · 로드 시각 알 수 없음"}
          </span>
          <button style={s.reloadBtn} onClick={handleReloadStudents} disabled={isReloading}>
            {isReloading ? "불러오는 중..." : "새로고침"}
          </button>
          {enrollmentDiff && (() => {
            const parts = summarizeDiff(enrollmentDiff);
            if (parts.length === 0) return <span style={s.diffNone}>변경 없음</span>;
            return parts.map((p) => (
              <span key={p.type} style={p.type === "removed" ? s.diffRemoved : s.diffAdded}>
                {p.text}
              </span>
            ));
          })()}
        </div>
      )}

      {/* ── 설정 섹션 (접기 가능) ── */}
      <div style={s.settingsBox}>
        <div style={s.settingsToggle} onClick={() => setSettingsOpen((o) => !o)}>
          <span style={s.settingsTitle}>고사 기본 설정 (기간, 교시)</span>
          <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>{settingsOpen ? "▲ 접기" : "▼ 펼치기"}</span>
        </div>

        {settingsOpen && (
          <div style={s.settingsGrid}>
            {/* ── 1행: 고사명+학기 / 고사 기간 ── */}
            <div style={s.settingsRow}>
              {/* 고사명 + 학기 */}
              <div>
                <p style={s.settingsLabel}>고사명</p>
                <input
                  style={{ ...s.input, marginBottom: "0.5rem" }}
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="예: 1학기 1차 지필고사"
                />
                <p style={{ ...s.settingsLabel, marginTop: "0.75rem" }}>학기 선택</p>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  {[
                    { value: null, label: "전체" },
                    { value: 1,    label: "1학기" },
                    { value: 2,    label: "2학기" },
                  ].map(({ value, label }) => {
                    const active = semester === value;
                    return (
                      <button
                        key={String(value)}
                        style={active ? s.tabActive : s.tab}
                        onClick={() => setSemester(value)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {semester && (
                  <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.4rem" }}>
                    {semester}학기 과목만 표시됩니다
                  </p>
                )}
              </div>

              {/* 날짜 */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <p style={{ ...s.settingsLabel, marginBottom: 0 }}>고사 기간</p>
                  <button style={s.addRowBtn} onClick={addDay}>+ 날짜 추가</button>
                </div>
                {days.length === 0 ? (
                  <p style={{ fontSize: "0.82rem", color: "#9ca3af" }}>날짜를 추가하세요</p>
                ) : (
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead style={s.thead}>
                        <tr>
                          <th style={s.th}>날짜</th>
                          <th style={s.th}>표시명</th>
                          <th style={s.th}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {days.map((day) => (
                          <tr key={day.id} style={s.tr}>
                            <td style={s.td}>
                              <input
                                type="date"
                                style={s.inputDate}
                                value={day.date ?? ""}
                                onChange={(e) => updateDay(day.id, { date: e.target.value })}
                              />
                            </td>
                            <td style={s.td}>
                              <input
                                style={s.inputLabel}
                                value={day.label ?? ""}
                                placeholder={getDayLabel(day.date)}
                                onChange={(e) => updateDay(day.id, { label: e.target.value })}
                              />
                            </td>
                            <td style={s.td}>
                              <button style={s.dangerOutlineBtn} onClick={() => removeDay(day.id)}>✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* ── 2행: 교시 설정 (전체 너비) ── */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <p style={{ ...s.settingsLabel, marginBottom: 0 }}>교시 설정 — 학년별 시작 시각</p>
                <button style={s.addRowBtn} onClick={addPeriod}>+ 교시 추가</button>
              </div>
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead style={s.thead}>
                    <tr>
                      <th style={s.th}>교시명</th>
                      <th style={s.thCenter}>1학년 시작</th>
                      <th style={s.thCenter}>2학년 시작</th>
                      <th style={s.thCenter}>3학년 시작</th>
                      <th style={s.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map((period) => (
                      <tr key={period.id} style={s.tr}>
                        <td style={s.td}>
                          <input
                            style={{ ...s.inputLabel, width: "80px" }}
                            value={period.label}
                            onChange={(e) => updatePeriod(period.id, { label: e.target.value })}
                          />
                        </td>
                        {["1", "2", "3"].map((g) => (
                          <td key={g} style={s.tdCenter}>
                            <input
                              type="time"
                              style={s.inputTime}
                              value={period.startTimes?.[g] ?? "09:00"}
                              onChange={(e) => updatePeriodStartTime(period.id, g, e.target.value)}
                            />
                          </td>
                        ))}
                        <td style={s.td}>
                          <button style={s.dangerOutlineBtn} onClick={() => removePeriod(period.id)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.35rem" }}>
                학년마다 시작 시각이 같으면 동일하게 입력하세요. 시험 시간은 과목별로 아래에서 설정합니다.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── 학년 필터 탭 ── */}
      <div style={s.filterRow}>
        {GRADE_TABS.map((tab) => {
          const active = gradeFilter === tab.key;
          const count  = countByGrade[tab.key] ?? 0;
          return (
            <button
              key={tab.key}
              style={active ? s.tabActive : s.tab}
              onClick={() => setGradeFilter(tab.key)}
            >
              {tab.label}
              <span style={active ? s.badgeActive : s.badge}>{count}</span>
            </button>
          );
        })}
        <div style={s.divider} />
        <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>
          {students.length === 0 && "⚠ 학생 데이터 없음 — "}
          {enrollments.length === 0 && students.length > 0 && "학생선택과목 수강생 수: 학생 업로드 시 자동 계산"}
        </span>
      </div>

      {/* ── 요약 스트립 ── */}
      <div style={s.summaryStrip}>
        {semester && <span style={{ ...s.summaryChip, backgroundColor: "#ede9fe", color: "#6d28d9" }}>{semester}학기</span>}
        <span style={s.summaryChip}>표시 과목 {semesterSubjects.length}개</span>
        <span style={s.summaryChip}>시험 선택 {selectedCount}개</span>
        <span style={s.summaryChip}>응시생 연인원 {totalStudentCount}명</span>
        {students.length === 0 && (
          <span style={s.summaryWarn}>기초 데이터 탭에서 학생을 먼저 등록하세요</span>
        )}
      </div>

      {/* ── 과목 테이블 ── */}
      {subjects.length === 0 ? (
        <p style={s.emptyRow}>기초 데이터 탭에서 과목을 먼저 등록하세요.</p>
      ) : (
        <div style={s.tableWrap}>
          <table style={{ ...s.table, minWidth: "860px" }}>
            <thead style={s.thead}>
              <tr>
                <th style={s.th}>과목명</th>
                <th style={s.th}>구분</th>
                <th style={s.thCenter}>이수단위</th>
                <th style={s.thCenter}>수강생</th>
                <th style={s.thCenter}>
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={filteredSubjects.length > 0 && filteredSubjects.every((sub) => examConfig[sub.id]?.hasExam)}
                      ref={(el) => {
                        if (el) el.indeterminate =
                          filteredSubjects.some((sub) => examConfig[sub.id]?.hasExam) &&
                          !filteredSubjects.every((sub) => examConfig[sub.id]?.hasExam);
                      }}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setExamConfig((prev) => {
                          const next = { ...prev };
                          filteredSubjects.forEach((sub) => { next[sub.id] = { ...next[sub.id], hasExam: checked }; });
                          return next;
                        });
                      }}
                    />
                    응시
                  </label>
                </th>
                <th style={s.thCenter}>시험시간(분)</th>
                <th style={s.thCenter}>서논술</th>
              </tr>
            </thead>
            <tbody>{renderRows()}</tbody>
          </table>
        </div>
      )}

      {/* ── 학생 목록 모달 ── */}
      {modalSubject && (
        <StudentListModal
          subject={modalSubject}
          students={students}
          enrollments={enrollments}
          onClose={() => setModalSubject(null)}
        />
      )}
    </div>
  );
}

// ─── 과목 행 컴포넌트 ─────────────────────────────────────────────────────────

function SubjectRow({ subject, config, students, enrollments, onConfigChange, onNameClick }) {
  const autoCount = calcAutoCount(subject, students, enrollments);

  // 로컬 문자열 상태 — 입력 중 스냅백 없이 자유롭게 편집 가능
  const [localCount, setLocalCount] = useState(
    config.studentCountOverride !== null ? String(config.studentCountOverride) : String(autoCount),
  );

  // 외부(config/autoCount) 변경 시 동기화
  useEffect(() => {
    setLocalCount(
      config.studentCountOverride !== null ? String(config.studentCountOverride) : String(autoCount),
    );
  }, [config.studentCountOverride, autoCount]);

  function handleCountChange(e) {
    const raw = e.target.value;
    setLocalCount(raw);
    const n = Number(raw);
    if (raw !== "" && !isNaN(n) && n >= 0) {
      onConfigChange({ studentCountOverride: n });
    }
  }

  function handleCountBlur() {
    const n = Number(localCount);
    if (localCount === "" || isNaN(n) || n < 0) {
      setLocalCount(String(autoCount));
      onConfigChange({ studentCountOverride: null });
    }
  }

  return (
    <tr style={s.tr}>
      <td style={s.td}>
        <button style={s.subjectLink} onClick={onNameClick} title="클릭하여 학생 명단 보기">
          {subject.name}
        </button>
      </td>
      <td style={s.tdMuted}>
        {subject.category === "학교지정" ? "학교지정" : "학생선택"}
      </td>
      <td style={s.tdCenter}>{subject.credits ?? subject.baseCredits ?? "-"}</td>
      <td style={s.tdCenter}>
        <input
          type="number"
          min={0}
          style={{
            ...s.inputSm,
            // override 중이면 테두리 강조
            borderColor: config.studentCountOverride !== null ? "#4f46e5" : "#d1d5db",
          }}
          value={localCount}
          onChange={handleCountChange}
          onBlur={handleCountBlur}
          title={config.studentCountOverride !== null ? `자동: ${autoCount}명 (수동 수정됨)` : `자동 계산: ${autoCount}명`}
        />
      </td>
      <td style={s.tdCenter}>
        <input
          type="checkbox"
          checked={config.hasExam}
          onChange={(e) => onConfigChange({ hasExam: e.target.checked })}
        />
      </td>
      <td style={s.tdCenter}>
        {/* 10분 단위 빠른 선택 + 직접 입력 */}
        <div style={{ display: "flex", gap: "4px", alignItems: "center", justifyContent: "center" }}>
          <select
            style={{ ...s.selectDur, opacity: config.hasExam ? 1 : 0.35 }}
            disabled={!config.hasExam}
            value={DURATION_PRESETS.includes(config.duration) ? config.duration : ""}
            onChange={(e) => e.target.value && onConfigChange({ duration: Number(e.target.value) })}
            title="빠른 선택"
          >
            <option value="" disabled>선택</option>
            {DURATION_PRESETS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <input
            type="number"
            min={10}
            max={300}
            step={1}
            style={{ ...s.inputDur, opacity: config.hasExam ? 1 : 0.35 }}
            disabled={!config.hasExam}
            value={config.duration}
            onChange={(e) => {
              const n = e.target.valueAsNumber;
              if (!isNaN(n)) onConfigChange({ duration: n });
            }}
          />
        </div>
      </td>
      <td style={s.tdCenter}>
        <input
          type="checkbox"
          checked={config.isEssay}
          disabled={!config.hasExam}
          onChange={(e) => onConfigChange({ isEssay: e.target.checked })}
        />
      </td>
    </tr>
  );
}
