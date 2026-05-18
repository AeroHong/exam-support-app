import { useMemo, useState } from "react";
import { addMinutes } from "../utils/timeUtils";
import {
  STRATEGIES,
  autoPlace,
  buildConflictGraph,
  buildStudentSets,
  computeDayStats,
  evaluatePlacement,
  isSlotValid,
} from "../utils/scheduleAutoPlanner";

// ── 스타일 ───────────────────────────────────────────────────────────────────

const s = {
  page:        { display: "flex", flexDirection: "column", height: "calc(100vh - 112px)", overflow: "hidden" },

  // 상단 컨트롤 바
  topBar:      { display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.55rem 1.5rem", backgroundColor: "#fff", borderBottom: "1px solid #e5e7eb", flexShrink: 0, flexWrap: "wrap" },
  pageTitle:   { fontSize: "1rem", fontWeight: 800, color: "#111827", margin: 0, marginRight: "0.25rem" },
  tab:         { padding: "0.3rem 0.9rem", border: "1px solid #e5e7eb", borderRadius: "999px", cursor: "pointer", fontSize: "0.82rem", backgroundColor: "#fff", color: "#6b7280" },
  tabActive:   { padding: "0.3rem 0.9rem", border: "1px solid #4f46e5", borderRadius: "999px", cursor: "pointer", fontSize: "0.82rem", backgroundColor: "#eef2ff", color: "#4f46e5", fontWeight: 700 },
  badge:       { fontSize: "0.68rem", fontWeight: 600, backgroundColor: "#e5e7eb", color: "#374151", borderRadius: "999px", padding: "0.05rem 0.4rem", marginLeft: "0.25rem" },
  badgeBlue:   { fontSize: "0.68rem", fontWeight: 600, backgroundColor: "#c7d2fe", color: "#3730a3", borderRadius: "999px", padding: "0.05rem 0.4rem", marginLeft: "0.25rem" },
  sep:         { width: "1px", height: "20px", backgroundColor: "#e5e7eb", flexShrink: 0 },
  primaryBtn:  { padding: "0.38rem 0.9rem", backgroundColor: "#4f46e5", color: "#fff", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, flexShrink: 0 },
  outlineBtn:  { padding: "0.38rem 0.85rem", backgroundColor: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: "7px", cursor: "pointer", fontSize: "0.8rem", flexShrink: 0 },
  dangerBtn:   { padding: "0.38rem 0.85rem", backgroundColor: "#fff", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "7px", cursor: "pointer", fontSize: "0.8rem", flexShrink: 0 },

  // 메인 레이아웃
  body:        { display: "flex", flex: 1, overflow: "hidden" },

  // 팔레트 (왼쪽)
  palette:     { width: "210px", flexShrink: 0, borderRight: "1px solid #e5e7eb", backgroundColor: "#f9fafb", display: "flex", flexDirection: "column", overflow: "hidden" },
  palHeader:   { padding: "0.55rem 0.75rem", borderBottom: "1px solid #e5e7eb", fontSize: "0.7rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" },
  palBody:     { flex: 1, overflowY: "auto", padding: "0.45rem" },
  palDropZone: { padding: "0.4rem 0.5rem", borderTop: "1px solid #e5e7eb", fontSize: "0.7rem", color: "#9ca3af", textAlign: "center", minHeight: "32px" },

  // 보드 (오른쪽)
  boardWrap:   { flex: 1, overflow: "auto", padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "1rem" },

  // 그리드
  grid:        (nDays) => ({
    display: "grid",
    gridTemplateColumns: `58px repeat(${nDays}, minmax(140px, 1fr))`,
    gap: "3px",
    minWidth: `${58 + nDays * 140}px`,
  }),
  cornerCell:  {},
  dayHeader:   { padding: "0.35rem 0.5rem", backgroundColor: "#f3f4f6", borderRadius: "6px", textAlign: "center", position: "relative" },
  dayLabelRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" },
  dayLabel:    { fontSize: "0.78rem", fontWeight: 700, color: "#374151" },
  dayEditBtn:  { fontSize: "0.6rem", color: "#9ca3af", background: "none", border: "none", cursor: "pointer", padding: "1px 3px" },
  dayInput:    { fontSize: "0.75rem", fontWeight: 700, color: "#374151", border: "1px solid #4f46e5", borderRadius: "4px", padding: "0.1rem 0.3rem", width: "100%", textAlign: "center" },
  tripleWarn:  { fontSize: "0.65rem", color: "#dc2626", fontWeight: 600, marginTop: "0.1rem" },
  periodLabel: { display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", padding: "0.2rem" },

  // 셀
  cell:        (isOver, isValid) => ({
    minHeight: "80px",
    border: `1.5px dashed ${isOver ? (isValid ? "#4f46e5" : "#dc2626") : "#d1d5db"}`,
    borderRadius: "8px",
    backgroundColor: isOver ? (isValid ? "#eef2ff" : "#fef2f2") : "#fff",
    padding: "0.3rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.2rem",
    transition: "background-color 0.1s, border-color 0.1s",
  }),
  cellStat:    { fontSize: "0.63rem", color: "#9ca3af", marginTop: "auto", paddingTop: "0.2rem" },
  cellWait:    { fontSize: "0.63rem", color: "#92400e", fontWeight: 600 },

  // 요약 행 (시험 없는 학생)
  summaryRow:  { display: "contents" },
  summaryCorner: { display: "flex", alignItems: "center", justifyContent: "center" },
  summaryCell: { padding: "0.25rem 0.4rem", borderTop: "1px solid #e5e7eb", textAlign: "center" },
  noExamBig:   { fontSize: "0.75rem", fontWeight: 700, color: "#374151" },
  noExamLabel: { fontSize: "0.62rem", color: "#9ca3af" },

  // 세션 카드 — 팔레트
  palCard:     (isDragging) => ({
    padding: "0.38rem 0.45rem",
    backgroundColor: isDragging ? "#e0e7ff" : "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "7px",
    cursor: "grab",
    marginBottom: "0.28rem",
    opacity: isDragging ? 0.5 : 1,
  }),
  palCardName: { fontSize: "0.78rem", fontWeight: 700, color: "#111827", margin: 0 },
  palCardMeta: { fontSize: "0.68rem", color: "#6b7280", marginTop: "0.08rem" },

  // 세션 카드 — 보드 내
  boardCard:   (isConflict, isManual) => ({
    padding: "0.28rem 0.35rem",
    backgroundColor: isConflict ? "#fef2f2" : "#eef2ff",
    border: `1px solid ${isConflict ? "#fca5a5" : "#c7d2fe"}`,
    borderLeft: isConflict ? "3px solid #ef4444" : isManual ? "3px solid #f59e0b" : "1px solid #c7d2fe",
    borderRadius: "6px",
    cursor: "grab",
    position: "relative",
  }),
  boardCardName: { fontSize: "0.72rem", fontWeight: 700, color: "#1e1b4b", margin: 0, paddingRight: "13px" },
  boardCardMeta: { fontSize: "0.62rem", color: "#6b7280" },
  removeBtn:   { position: "absolute", top: "2px", right: "2px", fontSize: "0.6rem", color: "#9ca3af", cursor: "pointer", lineHeight: 1, border: "none", background: "none", padding: "1px 2px" },
  conflictDot: { display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#dc2626", marginRight: "3px", verticalAlign: "middle" },

  badgeReq:    { fontSize: "0.58rem", fontWeight: 700, backgroundColor: "#dbeafe", color: "#1d4ed8", borderRadius: "3px", padding: "0 0.28rem", marginRight: "2px" },
  badgeEssay:  { fontSize: "0.58rem", fontWeight: 700, backgroundColor: "#fef9c3", color: "#713f12", borderRadius: "3px", padding: "0 0.28rem" },
  badgeManual: { fontSize: "0.55rem", fontWeight: 700, backgroundColor: "#fef3c7", color: "#92400e", borderRadius: "3px", padding: "0 0.25rem", marginRight: "2px" },

  // 선택과목 교차 행렬
  matrixSection:    { border: "1px solid #e5e7eb", borderRadius: "10px", backgroundColor: "#f9fafb", padding: "0.75rem 1rem", flexShrink: 0 },
  matrixHeader:     { fontSize: "0.8rem", fontWeight: 700, color: "#374151", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" },
  matrixWrap:       { overflowX: "auto" },
  matrixTable:      { borderCollapse: "collapse", fontSize: "0.68rem" },
  matrixRowHead:    { padding: "0.22rem 0.5rem", fontWeight: 600, color: "#374151", border: "1px solid #e5e7eb", textAlign: "left", whiteSpace: "nowrap", maxWidth: "90px", overflow: "hidden", textOverflow: "ellipsis", backgroundColor: "#f3f4f6" },
  matrixColHead:    { padding: "0.22rem 0.3rem", fontWeight: 600, color: "#374151", border: "1px solid #e5e7eb", textAlign: "center", width: "60px", wordBreak: "keep-all", whiteSpace: "normal", lineHeight: 1.3, verticalAlign: "bottom", backgroundColor: "#f3f4f6" },
  matrixCell:       (bg, isTextDark) => ({ padding: "0.2rem 0.35rem", border: "1px solid #e5e7eb", textAlign: "center", backgroundColor: bg, color: isTextDark ? "#1e1b4b" : "#6b7280", fontWeight: 600, minWidth: "38px" }),
  matrixLegend:     { display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem", fontSize: "0.68rem", color: "#6b7280" },

  // 자동 배치 미리보기 패널
  previewPanel: { border: "1px solid #e5e7eb", borderRadius: "10px", backgroundColor: "#f9fafb", padding: "0.75rem 1rem", flexShrink: 0 },
  previewTitle: { fontSize: "0.8rem", fontWeight: 700, color: "#374151", marginBottom: "0.6rem", display: "flex", alignItems: "center", gap: "0.5rem" },
  previewCards: { display: "flex", gap: "0.75rem" },
  previewCard:  (isApplied) => ({
    flex: 1,
    border: `1.5px solid ${isApplied ? "#4f46e5" : "#e5e7eb"}`,
    borderRadius: "8px",
    padding: "0.65rem 0.75rem",
    backgroundColor: isApplied ? "#eef2ff" : "#fff",
  }),
  previewLabel: { fontSize: "0.8rem", fontWeight: 700, color: "#111827", marginBottom: "0.3rem" },
  previewDesc:  { fontSize: "0.68rem", color: "#6b7280", marginBottom: "0.5rem" },
  previewStat:  { display: "flex", flexDirection: "column", gap: "0.2rem", marginBottom: "0.5rem" },
  previewRow:   { display: "flex", justifyContent: "space-between", fontSize: "0.72rem" },
  previewKey:   { color: "#6b7280" },
  previewVal:   (warn) => ({ fontWeight: 700, color: warn ? "#dc2626" : "#111827" }),
  applyBtn:     { width: "100%", padding: "0.3rem", backgroundColor: "#4f46e5", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 },

  emptyBoard:  { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af", fontSize: "0.9rem", gap: "0.5rem" },

  sBadgeOk:   { fontSize: "0.72rem", fontWeight: 700, backgroundColor: "#dcfce7", color: "#15803d", borderRadius: "999px", padding: "0.15rem 0.55rem" },
  sBadgeWarn: { fontSize: "0.72rem", fontWeight: 700, backgroundColor: "#fef3c7", color: "#b45309", borderRadius: "999px", padding: "0.15rem 0.55rem" },
  sBadgeInfo: { fontSize: "0.72rem", fontWeight: 700, backgroundColor: "#dbeafe", color: "#1d4ed8", borderRadius: "999px", padding: "0.15rem 0.55rem" },

  // 학생 명단 모달
  modalOverlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.35)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" },
  modalBox:     { backgroundColor: "#fff", borderRadius: "12px", width: "340px", maxHeight: "70vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" },
  modalHeader:  { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.8rem 1rem", borderBottom: "1px solid #e5e7eb", flexShrink: 0 },
  modalTitle:   { fontSize: "0.88rem", fontWeight: 700, color: "#111827" },
  modalClose:   { background: "none", border: "none", cursor: "pointer", fontSize: "1rem", color: "#9ca3af", lineHeight: 1, padding: "2px 4px" },
  modalBody:    { flex: 1, overflowY: "auto", padding: "0.4rem 0.8rem" },
  modalRow:     { padding: "0.32rem 0.2rem", fontSize: "0.8rem", color: "#374151", borderBottom: "1px solid #f3f4f6" },
  modalEmpty:   { padding: "1.5rem 0", textAlign: "center", fontSize: "0.82rem", color: "#9ca3af" },
  modalCount:   { padding: "0.4rem 1rem 0.25rem", fontSize: "0.72rem", color: "#6b7280", borderBottom: "1px solid #f3f4f6", flexShrink: 0 },
};

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function overlapSize(setA, setB) {
  if (!setA || !setB) return 0;
  let n = 0;
  for (const id of setA) { if (setB.has(id)) n++; }
  return n;
}

// 0 → 파랑(#dbeafe), max → 빨강(#fecaca) 선형 보간
function heatColor(value, max) {
  if (value < 0) return "#f3f4f6"; // 대각선
  if (max === 0 || value === 0) return "#dbeafe";
  const t = Math.min(value / max, 1);
  const r = Math.round(219 + (254 - 219) * t);
  const g = Math.round(234 + (202 - 234) * t);
  const b = Math.round(254 + (202 - 254) * t);
  return `rgb(${r},${g},${b})`;
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function ScheduleBoardPage({
  days, periods, sessions, students, enrollments,
  examPlanReady,
  onMove, onSessionChange, onDayChange, onSwapDays, onResetPlacements,
  scheduleConfirmed, onConfirmSchedule, onDeconfirmSchedule,
}) {
  const [gradeFilter, setGradeFilter] = useState("1");
  const [dragId, setDragId]           = useState(null);        // 세션 드래그
  const [dragOver, setDragOver]       = useState(null);        // "dayId__periodId"
  const [dayDragId, setDayDragId]     = useState(null);        // 요일 드래그
  const [dayDragOver, setDayDragOver] = useState(null);        // dayId (hover)
  const [editingDayId, setEditingDayId] = useState(null);      // 요일 텍스트 편집
  const [editingLabel, setEditingLabel] = useState("");
  const [previews, setPreviews]       = useState(null);        // 자동배치 미리보기
  const [modal, setModal]             = useState(null);        // 학생 명단 모달
  const [manuallyPlacedIds, setManuallyPlacedIds] = useState(new Set()); // 수동 배치 세션 ID 추적
  const [matrixOpen, setMatrixOpen] = useState(true);

  // 현재 학년 세션
  const gradeSessions = useMemo(
    () => sessions.filter((s) => String(s.grade) === gradeFilter),
    [sessions, gradeFilter],
  );

  // 학생 집합 & Conflict Graph
  const studentSets = useMemo(
    () => buildStudentSets(gradeSessions, students, enrollments),
    [gradeSessions, students, enrollments],
  );
  const { conflictGraph } = useMemo(
    () => buildConflictGraph(gradeSessions, studentSets),
    [gradeSessions, studentSets],
  );

  // 미배치 세션
  const unplaced = useMemo(
    () => gradeSessions.filter((s) => !s.dayId || !s.periodId),
    [gradeSessions],
  );

  // 선택과목 교차 행렬
  const electiveSessions = useMemo(
    () => gradeSessions.filter((s) => !s.isRequired),
    [gradeSessions],
  );

  const conflictMatrix = useMemo(() => {
    return electiveSessions.map((a) =>
      electiveSessions.map((b) => {
        if (a.id === b.id) return -1;
        return overlapSize(studentSets[a.id], studentSets[b.id]);
      }),
    );
  }, [electiveSessions, studentSets]);

  const maxOverlap = useMemo(
    () => Math.max(0, ...conflictMatrix.flat().filter((v) => v >= 0)),
    [conflictMatrix],
  );

  // 날짜별 통계
  const dayStatsMap = useMemo(() => {
    const map = {};
    for (const day of days) {
      map[day.id] = computeDayStats(sessions, studentSets, day.id, periods, gradeFilter);
    }
    return map;
  }, [sessions, studentSets, days, periods, gradeFilter]);

  // 학년 학생 목록 및 ID 조회맵
  const gradeStudents = useMemo(
    () => students.filter((s) => String(s.grade) === gradeFilter),
    [students, gradeFilter],
  );
  const totalGradeStudents = gradeStudents.length;
  const studentsById = useMemo(
    () => Object.fromEntries(students.map((s) => [s.id, s])),
    [students],
  );

  // 드래그 대상이 슬롯에 drop 가능한지
  const dragSession = dragId ? sessions.find((s) => s.id === dragId) : null;
  function canDrop(dayId, periodId) {
    if (!dragSession) return true;
    const placementSoFar = sessions
      .filter((s) => s.dayId && s.periodId)
      .map((s) => ({ sessionId: s.id, dayId: s.dayId, periodId: s.periodId }));
    return isSlotValid(dragSession.id, dayId, periodId, placementSoFar, conflictGraph);
  }

  // ── 이벤트 핸들러 ──────────────────────────────────────────────────────────

  function handleDrop(dayId, periodId) {
    if (!dragId) return;
    const session = sessions.find((s) => s.id === dragId);
    const day     = days.find((d) => d.id === dayId);
    const period  = periods.find((p) => p.id === periodId);
    const startTime = period?.startTimes?.[gradeFilter] ?? "08:30";
    onMove(dragId, { dayId, periodId, grade: gradeFilter, startTime, duration: session?.duration, dateLabel: day?.label ?? "" });
    setManuallyPlacedIds((prev) => new Set([...prev, dragId]));
    setDragId(null);
    setDragOver(null);
  }

  function handleDropToPalette() {
    if (!dragId) return;
    onSessionChange(dragId, { dayId: "", periodId: "", dateLabel: "미배치", startTime: "" });
    setManuallyPlacedIds((prev) => { const next = new Set(prev); next.delete(dragId); return next; });
    setDragId(null);
    setDragOver(null);
  }

  function handleRemoveFromBoard(sessionId) {
    onSessionChange(sessionId, { dayId: "", periodId: "", dateLabel: "미배치", startTime: "" });
    setManuallyPlacedIds((prev) => { const next = new Set(prev); next.delete(sessionId); return next; });
  }

  function handleResetAutoPlaced() {
    const autoPlaced = gradeSessions.filter((s) => s.dayId && s.periodId && !manuallyPlacedIds.has(s.id));
    if (autoPlaced.length === 0) { alert("초기화할 자동 배치 세션이 없습니다."); return; }
    const manualCount = gradeSessions.filter((s) => s.dayId && s.periodId && manuallyPlacedIds.has(s.id)).length;
    if (!window.confirm(`자동 배치 ${autoPlaced.length}개를 초기화합니다.\n수동 배치 ${manualCount}개는 유지됩니다.`)) return;
    autoPlaced.forEach((s) => onSessionChange(s.id, { dayId: "", periodId: "", dateLabel: "미배치", startTime: "" }));
    setPreviews(null);
  }

  function applyResult(result) {
    const autoIds = new Set(Object.keys(result));
    setManuallyPlacedIds((prev) => { const next = new Set(prev); autoIds.forEach((id) => next.delete(id)); return next; });
    for (const [sessionId, { dayId, periodId }] of Object.entries(result)) {
      const session = sessions.find((s) => s.id === sessionId);
      const day     = days.find((d) => d.id === dayId);
      const period  = periods.find((p) => p.id === periodId);
      const startTime = period?.startTimes?.[gradeFilter] ?? "08:30";
      onMove(sessionId, { dayId, periodId, grade: gradeFilter, startTime, duration: session?.duration, dateLabel: day?.label ?? "" });
    }
    setPreviews(null);
  }

  // feature 3: 3가지 전략 미리보기 생성
  function handlePreview() {
    const options = Object.entries(STRATEGIES).map(([key, weights]) => {
      // gradeSessions 전체 전달 → 기배치 세션도 conflict graph에 포함
      const result  = autoPlace(gradeSessions, days, periods, students, enrollments, weights);
      const metrics = evaluatePlacement(result, sessions, studentSets, days, periods, gradeFilter);
      return { key, label: weights.label, desc: weights.desc, result, metrics };
    });
    setPreviews(options);
  }

  // 요일 드래그: 두 날짜의 모든 세션 교체
  function handleDayDrop(targetDayId) {
    if (!dayDragId || dayDragId === targetDayId) { setDayDragId(null); setDayDragOver(null); return; }
    const srcDay = days.find((d) => d.id === dayDragId);
    const tgtDay = days.find((d) => d.id === targetDayId);
    if (onSwapDays) onSwapDays(dayDragId, targetDayId, srcDay?.label, tgtDay?.label);
    setDayDragId(null);
    setDayDragOver(null);
  }

  // feature 1: 요일 라벨 저장
  function saveDayLabel(dayId) {
    if (onDayChange && editingLabel.trim()) {
      onDayChange(dayId, { label: editingLabel.trim() });
    }
    setEditingDayId(null);
    setEditingLabel("");
  }

  // 학년 탭 뱃지
  function gradeTabInfo(g) {
    const gs = sessions.filter((s) => String(s.grade) === g);
    return { total: gs.length, placed: gs.filter((s) => s.dayId && s.periodId).length };
  }

  if (!days.length || !periods.length) {
    return (
      <div style={s.page}>
        <div style={s.emptyBoard}>
          <span>고사 기간 또는 교시가 설정되지 않았습니다.</span>
          <span style={{ fontSize: "0.8rem" }}>시험계획 탭에서 날짜와 교시를 먼저 설정해주세요.</span>
        </div>
      </div>
    );
  }

  const notReadyGrades = ["1", "2", "3"].filter((g) => examPlanReady && !examPlanReady[g]);

  return (
    <>
    {notReadyGrades.length > 0 && (
      <div style={{ padding: "0.55rem 1.5rem", backgroundColor: "#fff7ed", color: "#b45309", borderBottom: "1px solid #fed7aa", fontSize: "0.82rem", fontWeight: 600 }}>
        ⚠ {notReadyGrades.join(", ")}학년 시험계획 과목 확정이 필요합니다. 시험계획 탭에서 과목 확정 후 배치하세요.
      </div>
    )}
    <div style={s.page}>
      {/* ── 상단 컨트롤 바 ── */}
      <div style={s.topBar}>
        <span style={s.pageTitle}>일정 배치</span>
        <div style={{ display: "flex", gap: "0.3rem" }}>
          {["1", "2", "3"].map((g) => {
            const { total, placed } = gradeTabInfo(g);
            const active = gradeFilter === g;
            const confirmed = scheduleConfirmed?.[g] ?? false;
            return (
              <button key={g} style={active ? s.tabActive : s.tab}
                onClick={() => { setGradeFilter(g); setDragId(null); setPreviews(null); }}
              >
                {g}학년{confirmed ? " ✓" : ""}<span style={active ? s.badgeBlue : s.badge}>{placed}/{total}</span>
              </button>
            );
          })}
        </div>
        <div style={s.sep} />
        {(() => {
          const { total, placed } = gradeTabInfo(gradeFilter);
          const confirmed = scheduleConfirmed?.[gradeFilter] ?? false;
          const allPlaced = total > 0 && placed === total;
          return (
            <>
              {confirmed
                ? <span style={s.sBadgeOk}>✓ {gradeFilter}학년 확정됨</span>
                : allPlaced
                ? <span style={s.sBadgeInfo}>배치 완료 — 확정해주세요</span>
                : <span style={s.sBadgeWarn}>{placed}/{total} 배치됨</span>
              }
              {total > 0 && (
                confirmed
                  ? <button style={s.outlineBtn} onClick={() => onDeconfirmSchedule?.(gradeFilter)}>확정 해제</button>
                  : <button
                      style={{ ...s.primaryBtn, ...(allPlaced ? {} : { opacity: 0.5, cursor: "not-allowed" }) }}
                      onClick={() => allPlaced && onConfirmSchedule?.(gradeFilter)}
                      disabled={!allPlaced}
                    >
                      {allPlaced ? "배치 확정" : `미배치 ${total - placed}개`}
                    </button>
              )}
            </>
          );
        })()}
        <div style={s.sep} />
        {(() => {
          const manualCount = gradeSessions.filter(s => s.dayId && s.periodId && manuallyPlacedIds.has(s.id)).length;
          return (
            <>
              {manualCount > 0 && (
                <span style={{ fontSize: "0.75rem", color: "#92400e", backgroundColor: "#fef3c7", border: "1px solid #fde68a", borderRadius: "6px", padding: "0.2rem 0.55rem", fontWeight: 600, flexShrink: 0 }}>
                  수동 {manualCount}개 유지
                </span>
              )}
              <button style={s.primaryBtn} onClick={handlePreview} disabled={unplaced.length === 0}>
                {unplaced.length === 0 ? "모두 배치됨" : `나머지 ${unplaced.length}개 자동 배치`}
              </button>
              {previews && (
                <button style={s.outlineBtn} onClick={() => setPreviews(null)}>미리보기 닫기</button>
              )}
            </>
          );
        })()}
        <button style={s.dangerBtn} onClick={handleResetAutoPlaced}>
          자동배치 초기화
        </button>
        <button style={s.dangerBtn}
          onClick={() => {
            if (!window.confirm(`${gradeFilter}학년 배치를 모두 초기화하시겠습니까?\n초기화 후 즉시 저장됩니다.`)) return;
            onResetPlacements?.(gradeFilter);
            setManuallyPlacedIds(new Set());
            setPreviews(null);
          }}
        >
          전체 초기화
        </button>
      </div>

      {/* ── 메인 레이아웃 ── */}
      <div style={s.body}>
        {/* ── 팔레트 ── */}
        <div style={s.palette}>
          <div style={s.palHeader}>미배치 {unplaced.length > 0 ? `(${unplaced.length})` : ""}</div>
          <div style={s.palBody} onDragOver={(e) => e.preventDefault()} onDrop={handleDropToPalette}>
            {unplaced.length === 0 ? (
              <div style={{ fontSize: "0.73rem", color: "#9ca3af", textAlign: "center", padding: "1rem 0" }}>모두 배치 완료</div>
            ) : (
              unplaced.map((session) => (
                <SessionCard key={session.id} session={session} variant="palette"
                  isDragging={dragId === session.id}
                  onDragStart={() => setDragId(session.id)}
                  onDragEnd={() => setDragId(null)}
                />
              ))
            )}
          </div>
          <div style={s.palDropZone}>{dragId ? "여기로 → 미배치 복귀" : ""}</div>
        </div>

        {/* ── 보드 영역 ── */}
        <div style={s.boardWrap}>
          {/* 그리드 */}
          <div style={s.grid(days.length)}>
            {/* 헤더 행 */}
            <div style={s.cornerCell} />
            {days.map((day) => {
              const dStats      = dayStatsMap[day.id];
              const dayEmpty    = !gradeSessions.some((s) => s.dayId === day.id);
              const isEditing   = editingDayId === day.id;
              const isDayDragging = dayDragId === day.id;
              const isDayOver   = dayDragOver === day.id && dayDragId && dayDragId !== day.id;

              return (
                <div
                  key={day.id}
                  draggable={!isEditing}
                  style={{
                    ...s.dayHeader,
                    cursor: isDayDragging ? "grabbing" : "grab",
                    opacity: isDayDragging ? 0.5 : 1,
                    ...(isDayOver
                      ? { border: "2px solid #4f46e5", backgroundColor: "#eef2ff" }
                      : dayEmpty
                      ? { border: "1.5px solid #fca5a5", backgroundColor: "#fef2f2" }
                      : {}),
                  }}
                  onDragStart={(e) => { e.stopPropagation(); setDayDragId(day.id); setDragId(null); }}
                  onDragEnd={() => { setDayDragId(null); setDayDragOver(null); }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (dayDragId && dayDragId !== day.id) setDayDragOver(day.id); }}
                  onDragLeave={() => setDayDragOver(null)}
                  onDrop={(e) => { e.stopPropagation(); handleDayDrop(day.id); }}
                >
                  {isEditing ? (
                    <input
                      autoFocus
                      style={s.dayInput}
                      value={editingLabel}
                      onChange={(e) => setEditingLabel(e.target.value)}
                      onBlur={() => saveDayLabel(day.id)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveDayLabel(day.id); if (e.key === "Escape") setEditingDayId(null); }}
                    />
                  ) : (
                    <div style={s.dayLabelRow}>
                      <span style={s.dayLabel}>{day.label}</span>
                      {onDayChange && (
                        <button style={s.dayEditBtn} title="날짜 텍스트 수정"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); setEditingDayId(day.id); setEditingLabel(day.label); }}
                        >✎</button>
                      )}
                    </div>
                  )}
                  {isDayOver && <div style={{ fontSize: "0.65rem", color: "#4f46e5", fontWeight: 600, marginTop: "0.1rem" }}>여기로 이동</div>}
                  {!isDayOver && dayEmpty && <div style={{ fontSize: "0.65rem", color: "#dc2626", fontWeight: 600, marginTop: "0.1rem" }}>과목 없음</div>}
                  {!isDayOver && !dayEmpty && dStats?.tripleCount > 0 && (
                    <div style={s.tripleWarn}>3연속 {dStats.tripleCount}명</div>
                  )}
                </div>
              );
            })}

            {/* 교시 행 */}
            {periods.map((period) => (
              <>
                <div key={`lbl-${period.id}`} style={s.periodLabel}>{period.label}</div>
                {days.map((day) => {
                  const slotKey      = `${day.id}__${period.id}`;
                  const isOver       = dragOver === slotKey;
                  const valid        = canDrop(day.id, period.id);
                  const cellSessions = gradeSessions.filter((s) => s.dayId === day.id && s.periodId === period.id);
                  const dStats       = dayStatsMap[day.id];
                  const pStat        = dStats?.periodStats?.[period.id];
                  const conflictsInSlot = dStats?.conflicts ?? new Set();

                  return (
                    <div key={slotKey} style={s.cell(isOver, valid)}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(slotKey); }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={() => handleDrop(day.id, period.id)}
                    >
                      {cellSessions.map((session) => (
                        <SessionCard key={session.id} session={session} variant="board"
                          isConflict={conflictsInSlot.has(session.id)}
                          isManual={manuallyPlacedIds.has(session.id)}
                          isDragging={dragId === session.id}
                          onDragStart={() => setDragId(session.id)}
                          onDragEnd={() => setDragId(null)}
                          onRemove={() => handleRemoveFromBoard(session.id)}
                        />
                      ))}
                      {pStat && (pStat.testingCount > 0 || pStat.waitingCount > 0) && (
                        <div style={{ marginTop: "auto" }}>
                          {pStat.testingCount > 0 && <div style={s.cellStat}>응시 {pStat.testingCount}명</div>}
                          {pStat.waitingCount > 0 && (
                            <div
                              style={{ ...s.cellWait, cursor: "pointer", textDecoration: "underline" }}
                              onClick={() => setModal({
                                title: `${day.label} ${period.label} 대기 학생`,
                                studentIds: [...(pStat.waitingStudentIds ?? [])],
                              })}
                            >
                              대기 {pStat.waitingCount}명
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            ))}

            {/* feature 2: 당일 시험 없는 학생 수 요약 행 */}
            <div style={s.summaryCorner}>
              <span style={{ fontSize: "0.62rem", color: "#9ca3af", textAlign: "center", lineHeight: 1.3 }}>시험<br/>없음</span>
            </div>
            {days.map((day) => {
              const dayStudentCount = dayStatsMap[day.id]?.dayStudentCount ?? 0;
              const noExamCount = totalGradeStudents - dayStudentCount;
              const dayStudentIds = dayStatsMap[day.id]?.dayStudentIds;
              return (
                <div key={`noexam-${day.id}`} style={s.summaryCell}>
                  <div
                    style={{ ...s.noExamBig, color: noExamCount > 0 ? "#374151" : "#9ca3af", cursor: noExamCount > 0 ? "pointer" : "default", textDecoration: noExamCount > 0 ? "underline" : "none" }}
                    onClick={() => {
                      if (noExamCount === 0) return;
                      const ids = gradeStudents.filter((st) => !dayStudentIds?.has(st.id)).map((st) => st.id);
                      setModal({ title: `${day.label} 시험 없는 학생`, studentIds: ids });
                    }}
                  >
                    {noExamCount}명
                  </div>
                  <div style={s.noExamLabel}>시험 없음</div>
                </div>
              );
            })}
          </div>

          {/* feature 3: 자동 배치 미리보기 패널 */}
          {previews && (
            <div style={s.previewPanel}>
              <div style={s.previewTitle}>
                자동 배치 결과 비교
                <span style={{ fontSize: "0.7rem", color: "#6b7280", fontWeight: 400 }}>배치안을 선택하면 적용됩니다</span>
              </div>
              <div style={s.previewCards}>
                {previews.map(({ key, label, desc, result, metrics }, idx) => {
                  const rank = idx + 1;
                  return (
                    <div key={key} style={s.previewCard(false)}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.25rem" }}>
                        <span style={{ fontSize: "0.68rem", fontWeight: 800, backgroundColor: ["#4f46e5","#0891b2","#059669"][idx], color: "#fff", borderRadius: "999px", padding: "0.05rem 0.4rem" }}>{rank}순위</span>
                        <span style={s.previewLabel}>{label}</span>
                      </div>
                      <div style={s.previewDesc}>{desc}</div>
                      <div style={s.previewStat}>
                        <div style={s.previewRow}>
                          <span style={s.previewKey}>빈 날짜</span>
                          <span style={s.previewVal(metrics.emptyDays > 0)}>{metrics.emptyDays}일</span>
                        </div>
                        <div style={s.previewRow}>
                          <span style={s.previewKey}>총 대기</span>
                          <span style={s.previewVal(false)}>{metrics.totalWaiting}명</span>
                        </div>
                        <div style={s.previewRow}>
                          <span style={s.previewKey}>3연속 최대</span>
                          <span style={s.previewVal(metrics.maxTriple > 0)}>{metrics.maxTriple}명</span>
                        </div>
                        <div style={s.previewRow}>
                          <span style={s.previewKey}>미배치</span>
                          <span style={s.previewVal(metrics.unplacedCount > 0)}>{metrics.unplacedCount}개</span>
                        </div>
                      </div>
                      <button style={s.applyBtn} onClick={() => applyResult(result)}>
                        이 배치 적용
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        {/* ── 선택과목 수강생 교차 행렬 ── */}
        {electiveSessions.length >= 2 && (
          <div style={s.matrixSection}>
            <div style={s.matrixHeader}>
              <span>선택과목 수강생 교차 현황</span>
              <button style={{ ...s.outlineBtn, padding: "0.18rem 0.6rem", fontSize: "0.72rem" }}
                onClick={() => setMatrixOpen((o) => !o)}>
                {matrixOpen ? "▲ 접기" : "▼ 펼치기"}
              </button>
            </div>
            {matrixOpen && (
              <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
                {/* 표 */}
                <div style={{ ...s.matrixWrap, flex: 1, minWidth: 0 }}>
                  <table style={s.matrixTable}>
                    <thead>
                      <tr>
                        <th style={{ ...s.matrixRowHead, minWidth: "90px" }} />
                        {electiveSessions.map((sess) => (
                          <th key={sess.id} style={s.matrixColHead}>
                            {sess.subjectName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {electiveSessions.map((rowSess, ri) => (
                        <tr key={rowSess.id}>
                          <td style={s.matrixRowHead} title={rowSess.subjectName}>
                            {rowSess.subjectName}
                          </td>
                          {conflictMatrix[ri].map((val, ci) => {
                            const bg = heatColor(val, maxOverlap);
                            return (
                              <td key={electiveSessions[ci].id}
                                style={s.matrixCell(bg, val > 0)}
                                title={val >= 0 ? `${rowSess.subjectName} ∩ ${electiveSessions[ci].subjectName}: ${val}명` : ""}>
                                {val < 0 ? "—" : val}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 오른쪽 설명 */}
                <div style={{ flexShrink: 0, width: "220px", fontSize: "0.75rem", color: "#374151", lineHeight: 1.6, backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "0.75rem 0.9rem" }}>
                  <p style={{ fontWeight: 700, marginBottom: "0.5rem", color: "#111827" }}>숫자의 의미</p>
                  <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.5rem" }}>
                    <span style={{ display: "inline-block", width: "14px", height: "14px", backgroundColor: "#dbeafe", border: "1px solid #bfdbfe", borderRadius: "3px", flexShrink: 0, marginTop: "2px" }} />
                    <p style={{ margin: 0, color: "#1d4ed8", fontWeight: 600 }}>0 — 두 과목을 동시에 시험봐도 됩니다.</p>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.5rem" }}>
                    <span style={{ display: "inline-block", width: "14px", height: "14px", backgroundColor: "#fecaca", border: "1px solid #fca5a5", borderRadius: "3px", flexShrink: 0, marginTop: "2px" }} />
                    <p style={{ margin: 0, color: "#dc2626", fontWeight: 600 }}>숫자가 클수록 — 두 과목을 모두 선택한 학생이 많으므로 같은 날 시험은 피해야 합니다.</p>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <span style={{ display: "inline-block", width: "14px", height: "14px", background: "linear-gradient(135deg, #dbeafe 50%, #fecaca 50%)", border: "1px solid #e5e7eb", borderRadius: "3px", flexShrink: 0, marginTop: "2px" }} />
                    <p style={{ margin: 0, color: "#6b7280" }}>숫자가 작을수록 — 두 과목을 모두 선택한 학생이 적으므로 같은 날 시험을 권장합니다.</p>
                  </div>
                  <p style={{ marginTop: "0.6rem", marginBottom: 0, color: "#9ca3af", fontSize: "0.68rem" }}>이 학년 최대 중복: {maxOverlap}명</p>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>

    {/* ── 학생 명단 모달 ── */}
    {modal && (() => {
      const sorted = modal.studentIds
        .map((id) => studentsById[id])
        .filter(Boolean)
        .sort((a, b) => Number(a.classNo) - Number(b.classNo) || Number(a.number) - Number(b.number));
      return (
        <div style={s.modalOverlay} onClick={() => setModal(null)}>
          <div style={s.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>{modal.title}</span>
              <button style={s.modalClose} onClick={() => setModal(null)}>✕</button>
            </div>
            <div style={s.modalCount}>{sorted.length}명</div>
            <div style={s.modalBody}>
              {sorted.length === 0 ? (
                <div style={s.modalEmpty}>해당 학생 없음</div>
              ) : (
                sorted.map((st) => (
                  <div key={st.id} style={s.modalRow}>
                    {st.classNo}반 {st.number}번&nbsp;&nbsp;{st.name}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      );
    })()}
    </>
  );
}

// ── 세션 카드 컴포넌트 ────────────────────────────────────────────────────────

function SessionCard({ session, variant, isConflict, isManual, isDragging, onDragStart, onDragEnd, onRemove }) {
  if (variant === "palette") {
    return (
      <div draggable style={s.palCard(isDragging)} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <p style={s.palCardName}>{session.subjectName}</p>
        <p style={s.palCardMeta}>{session.duration}분 · {session.studentCount ?? 0}명{session.isEssay ? " · 서논술" : ""}</p>
        <div style={{ marginTop: "0.12rem" }}>
          {session.isRequired && <span style={s.badgeReq}>지정</span>}
          {session.isEssay    && <span style={s.badgeEssay}>서논술</span>}
        </div>
      </div>
    );
  }

  const startTime = session.startTime || "";
  const endTime   = startTime ? addMinutes(startTime, session.duration ?? 50) : "";

  return (
    <div draggable style={s.boardCard(isConflict, isManual)} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      {onRemove && <button style={s.removeBtn} onClick={onRemove} title="배치 취소">✕</button>}
      <p style={s.boardCardName}>
        {isConflict && <span style={s.conflictDot} title="수강생 중복 충돌" />}
        {session.subjectName}
      </p>
      <p style={s.boardCardMeta}>
        {session.studentCount ?? 0}명{startTime ? ` · ${startTime}–${endTime}` : ""}
      </p>
      <div style={{ marginTop: "0.12rem" }}>
        {isManual    && <span style={s.badgeManual}>수동</span>}
        {session.isRequired && <span style={s.badgeReq}>지정</span>}
        {session.isEssay    && <span style={s.badgeEssay}>서논술</span>}
      </div>
    </div>
  );
}
