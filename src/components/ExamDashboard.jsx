import { useEffect, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { EXAM_TYPES, getDefaultPlan } from "../data/defaults";
import { firebaseDb } from "../lib/firebase";
import { archivePlan, deletePlan, loadPlanList, savePlan } from "../lib/firestorePlanner";
import AppFooter from "./AppFooter";

// ── 헬퍼 ────────────────────────────────────────────────────────────────────

function fmtTimestamp(ts) {
  if (!ts?.seconds) return "";
  const d = new Date(ts.seconds * 1000);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function calcDDay(days) {
  if (!days?.length) return null;
  const dates = days.map((d) => (d.date ? new Date(d.date) : null)).filter(Boolean).sort((a, b) => a - b);
  if (!dates.length) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const first = new Date(dates[0]); first.setHours(0, 0, 0, 0);
  return Math.floor((first - today) / 86400000);
}

function getDateRange(days) {
  if (!days?.length) return null;
  const labels = days.map((d) => d.label).filter(Boolean);
  if (!labels.length) return null;
  return labels.length === 1 ? labels[0] : `${labels[0]} ~ ${labels[labels.length - 1]}`;
}

function computeStep(plan) {
  const any = (obj) => obj && Object.values(obj).some(Boolean);
  if (!any(plan.examPlanConfirmed)) return 1;
  if (!any(plan.scheduleConfirmed)) return 2;
  if (!any(plan.roomConfirmed)) return 3;
  return 4;
}

const STEPS = [
  { n: 1, label: "시험계획" },
  { n: 2, label: "일정 배치" },
  { n: 3, label: "고사실 배정" },
  { n: 4, label: "결과물 출력" },
];

const STEP_HINTS = [
  "시험계획 탭에서 날짜·교시·과목을 설정하고 확정해주세요.",
  "일정 배치 탭에서 과목별 날짜·교시를 배치하고 확정해주세요.",
  "고사실 배정 탭에서 고사실 배치를 완료하고 확정해주세요.",
  "모든 준비 완료! 출력물 관리 탭에서 결과물을 출력하세요.",
];

// ── 스타일 ───────────────────────────────────────────────────────────────────

const s = {
  page: { minHeight: "100vh", backgroundColor: "#f8fafc", display: "flex", flexDirection: "column" },

  // 사용 문의 바 (최상단)
  supportBar: {
    backgroundColor: "#eef2ff", borderBottom: "1px solid #c7d2fe",
    padding: "0.4rem 1.5rem", display: "flex", alignItems: "center",
    gap: "0.3rem 0.9rem", flexWrap: "wrap",
  },
  supportLabel: { fontSize: "0.73rem", color: "#4338ca" },
  supportLink: { fontSize: "0.73rem", fontWeight: 700, color: "#4f46e5", textDecoration: "none" },
  supportDivider: { fontSize: "0.73rem", color: "#a5b4fc" },
  supportCode: {
    fontSize: "0.72rem", color: "#3730a3", backgroundColor: "#c7d2fe",
    borderRadius: "999px", padding: "0.08rem 0.5rem", fontWeight: 700,
  },

  // 헤더
  header: { backgroundColor: "#fff", borderBottom: "1px solid #e5e7eb", padding: "1rem 1.5rem" },
  headerInner: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { fontSize: "0.7rem", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 },
  headerTitle: { fontSize: "1.15rem", fontWeight: 800, color: "#111827", margin: "0.15rem 0 0" },
  headerRight: { display: "flex", gap: "0.5rem", alignItems: "center" },
  userChip: { fontSize: "0.8rem", color: "#6b7280", padding: "0.3rem 0.75rem", backgroundColor: "#f3f4f6", borderRadius: "999px" },
  outlineBtn: { padding: "0.35rem 0.85rem", backgroundColor: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: "7px", cursor: "pointer", fontSize: "0.82rem" },
  primaryBtn: { padding: "0.45rem 1.1rem", backgroundColor: "#4f46e5", color: "#fff", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 },

  // 콘텐츠 영역
  content: { padding: "1.5rem", maxWidth: "1100px", width: "100%", margin: "0 auto", flex: 1, boxSizing: "border-box" },

  sectionLabel: { fontSize: "0.72rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.6rem" },

  // Zone A: 진행 중인 고사 카드
  activeCard: {
    backgroundColor: "#fff", border: "1px solid #e5e7eb", borderLeft: "4px solid #4f46e5",
    borderRadius: "10px", padding: "1.25rem 1.5rem", marginBottom: "1.25rem",
  },
  activeTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "1rem" },
  activeMeta: { flex: 1, minWidth: 0 },
  activeName: { fontSize: "1.15rem", fontWeight: 800, color: "#111827", margin: "0 0 0.2rem" },
  activeDates: { fontSize: "0.82rem", color: "#6b7280", margin: 0 },

  // D-day 뱃지
  ddayGreen:  { fontSize: "0.95rem", fontWeight: 800, color: "#15803d", backgroundColor: "#f0fdf4", borderRadius: "8px", padding: "0.3rem 0.7rem", whiteSpace: "nowrap" },
  ddayOrange: { fontSize: "0.95rem", fontWeight: 800, color: "#d97706", backgroundColor: "#fffbeb", borderRadius: "8px", padding: "0.3rem 0.7rem", whiteSpace: "nowrap" },
  ddayRed:    { fontSize: "0.95rem", fontWeight: 800, color: "#dc2626", backgroundColor: "#fef2f2", borderRadius: "8px", padding: "0.3rem 0.7rem", whiteSpace: "nowrap" },
  ddayBlue:   { fontSize: "0.95rem", fontWeight: 800, color: "#4f46e5", backgroundColor: "#eef2ff", borderRadius: "8px", padding: "0.3rem 0.7rem", whiteSpace: "nowrap" },
  ddayGray:   { fontSize: "0.95rem", fontWeight: 800, color: "#6b7280", backgroundColor: "#f3f4f6", borderRadius: "8px", padding: "0.3rem 0.7rem", whiteSpace: "nowrap" },

  // 워크플로우 단계
  stepsRow: { display: "flex", alignItems: "center", gap: 0, marginBottom: "1rem", flexWrap: "nowrap", overflowX: "auto" },
  stepWrap: { display: "flex", alignItems: "center", flex: "none" },
  stepArrow: { color: "#d1d5db", fontSize: "0.75rem", margin: "0 0.5rem", flexShrink: 0 },
  actionRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" },
  actionHint: { fontSize: "0.82rem", color: "#6b7280", flex: 1 },
  actionHintBold: { fontWeight: 700, color: "#374151" },
  activeCardActions: { display: "flex", gap: "0.4rem", flexShrink: 0 },
  smallBtn: { padding: "0.2rem 0.55rem", backgroundColor: "#fff", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: "5px", cursor: "pointer", fontSize: "0.72rem" },
  deleteBtn: { padding: "0.2rem 0.55rem", backgroundColor: "#fff", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "5px", cursor: "pointer", fontSize: "0.72rem" },

  // 빈 상태
  emptyCard: {
    backgroundColor: "#fff", border: "2px dashed #e5e7eb",
    borderRadius: "10px", padding: "2.5rem 1.5rem", textAlign: "center", marginBottom: "1.25rem",
  },
  emptyTitle: { fontSize: "1rem", fontWeight: 700, color: "#374151", margin: "0 0 0.4rem" },
  emptyDesc: { fontSize: "0.85rem", color: "#9ca3af", margin: "0 0 1.25rem" },

  // 2열 그리드
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" },
  card: { backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1.1rem 1.25rem" },
  cardTitle: { fontSize: "0.72rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.85rem" },

  // 통계 행
  statRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.45rem 0", borderBottom: "1px solid #f3f4f6" },
  statLabel: { fontSize: "0.82rem", color: "#6b7280" },
  statValue: { fontSize: "0.85rem", fontWeight: 700, color: "#111827" },
  statGradeRow: { display: "flex", gap: "1rem", marginTop: "0.25rem" },
  statGradeItem: { fontSize: "0.75rem", color: "#9ca3af" },
  linkBtn: { marginTop: "0.85rem", background: "none", border: "none", padding: 0, color: "#4f46e5", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" },
  disabledLinkBtn: { marginTop: "0.85rem", background: "none", border: "none", padding: 0, color: "#d1d5db", fontWeight: 700, fontSize: "0.82rem", cursor: "default" },

  // 보관/과거 고사 섹션
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" },
  sectionTitle: { fontSize: "0.85rem", fontWeight: 700, color: "#6b7280" },
  toggleBtn: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "0.8rem", padding: 0 },
  planGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem", marginBottom: "1rem" },
  planCard: { backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "0.85rem 1rem", opacity: 0.7 },
  planCardName: { fontSize: "0.9rem", fontWeight: 700, color: "#374151", margin: "0 0 0.2rem" },
  planCardMeta: { fontSize: "0.75rem", color: "#9ca3af", lineHeight: 1.5 },
  planCardFoot: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" },
  statusArchived: { fontSize: "0.7rem", fontWeight: 700, backgroundColor: "#f3f4f6", color: "#6b7280", borderRadius: "999px", padding: "0.1rem 0.45rem" },
  statusDraft: { fontSize: "0.7rem", fontWeight: 700, backgroundColor: "#dbeafe", color: "#1d4ed8", borderRadius: "999px", padding: "0.1rem 0.45rem" },
  cardActions: { display: "flex", gap: "0.25rem" },

  newExamRow: { display: "flex", justifyContent: "flex-end", paddingTop: "0.5rem" },

  // 로딩
  loading: { textAlign: "center", padding: "3rem", color: "#9ca3af", fontSize: "0.9rem" },

  // 모달
  backdrop: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { backgroundColor: "#fff", borderRadius: "12px", padding: "1.5rem", width: "min(440px, 95vw)", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" },
  modalTitle: { fontSize: "1.1rem", fontWeight: 800, color: "#111827", marginBottom: "1rem" },
  label: { fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.35rem", display: "block" },
  input: { width: "100%", padding: "0.45rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "0.875rem", boxSizing: "border-box", outline: "none" },
  select: { width: "100%", padding: "0.45rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "0.875rem", boxSizing: "border-box", outline: "none", backgroundColor: "#fff" },
  fieldGroup: { marginBottom: "0.85rem" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.25rem" },
};

// ── D-day 뱃지 ───────────────────────────────────────────────────────────────

function DDayBadge({ days }) {
  const n = calcDDay(days);
  if (n === null) return null;
  if (n < 0) return <span style={s.ddayGray}>종료됨</span>;
  if (n === 0) return <span style={s.ddayRed}>D-day</span>;
  if (n <= 7) return <span style={s.ddayRed}>D-{n}</span>;
  if (n <= 14) return <span style={s.ddayOrange}>D-{n}</span>;
  if (n <= 30) return <span style={s.ddayBlue}>D-{n}</span>;
  return <span style={s.ddayGreen}>D-{n}</span>;
}

// ── 워크플로우 단계 표시 ──────────────────────────────────────────────────────

function StepCircle({ state, label }) {
  const circleStyle = {
    width: "28px", height: "28px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "0.7rem", fontWeight: 800, flexShrink: 0,
    backgroundColor: state === "done" ? "#4f46e5" : state === "current" ? "#818cf8" : "#e5e7eb",
    color: state === "done" || state === "current" ? "#fff" : "#9ca3af",
  };
  const labelStyle = {
    fontSize: "0.78rem", fontWeight: state === "current" ? 700 : 500,
    color: state === "done" ? "#4f46e5" : state === "current" ? "#3730a3" : "#9ca3af",
    marginLeft: "0.3rem", whiteSpace: "nowrap",
  };
  return (
    <div style={s.stepWrap}>
      <div style={circleStyle}>{state === "done" ? "✓" : STEPS.find(st => st.label === label)?.n ?? ""}</div>
      <span style={labelStyle}>{label}</span>
    </div>
  );
}

function WorkflowSteps({ plan }) {
  const current = computeStep(plan);
  return (
    <div style={s.stepsRow}>
      {STEPS.map((step, i) => {
        const state = step.n < current ? "done" : step.n === current ? "current" : "todo";
        return (
          <div key={step.n} style={{ display: "flex", alignItems: "center", flex: "none" }}>
            {i > 0 && <span style={s.stepArrow}>→</span>}
            <StepCircle state={state} label={step.label} />
          </div>
        );
      })}
    </div>
  );
}

// ── 미니 캘린더 ───────────────────────────────────────────────────────────────

function MiniCalendar({ highlightDates = [], initialMonth }) {
  const [displayDate, setDisplayDate] = useState(() => {
    if (initialMonth) return new Date(initialMonth);
    return new Date();
  });

  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const highlightSet = new Set();
  highlightDates.forEach((dateStr) => {
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (d.getFullYear() === year && d.getMonth() === month) highlightSet.add(d.getDate());
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.65rem" }}>
        <button
          style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: "0.85rem", padding: "0.1rem 0.4rem" }}
          onClick={() => setDisplayDate(new Date(year, month - 1, 1))}
        >◀</button>
        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#374151" }}>{year}년 {month + 1}월</span>
        <button
          style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: "0.85rem", padding: "0.1rem 0.4rem" }}
          onClick={() => setDisplayDate(new Date(year, month + 1, 1))}
        >▶</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", textAlign: "center" }}>
        {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
          <div key={d} style={{ fontSize: "0.68rem", color: "#9ca3af", padding: "0.1rem 0", fontWeight: 600 }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const isHighlight = highlightSet.has(day);
          const isToday =
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day;
          return (
            <div
              key={day}
              style={{
                fontSize: "0.78rem", borderRadius: "50%",
                backgroundColor: isHighlight ? "#4f46e5" : isToday ? "#e0e7ff" : "transparent",
                color: isHighlight ? "#fff" : isToday ? "#4338ca" : "#374151",
                fontWeight: isHighlight || isToday ? 700 : 400,
                width: "26px", height: "26px",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "1px auto",
              }}
            >
              {day}
            </div>
          );
        })}
      </div>

      {highlightSet.size > 0 && (
        <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#4f46e5", flexShrink: 0 }} />
          <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>고사 일정</span>
        </div>
      )}
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function ExamDashboard({
  schoolId, ownerId, schoolName, userName,
  students = [], rooms = [], subjects = [],
  onGoToData, onSelectExam, onLogout,
}) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    const list = await loadPlanList({ schoolId });
    setPlans(list);
    setLoading(false);
  };

  useEffect(() => {
    if (schoolId) fetchPlans();
  }, [schoolId]);

  // 진행 중인 고사 (첫 번째 비보관 플랜), 나머지는 하단 섹션
  const activePlan = plans.find((p) => p.status !== "archived");
  const otherPlans = plans.filter((p) => p !== activePlan);

  // 기초 데이터 통계
  const gradeCounts = { "1": 0, "2": 0, "3": 0 };
  students.forEach((st) => {
    const g = String(st.grade);
    if (gradeCounts[g] !== undefined) gradeCounts[g]++;
  });

  // 캘린더용 첫 고사일
  const firstExamDate = activePlan?.days?.find((d) => d.date)?.date ?? null;

  const handleArchive = async (e, planId) => {
    e.stopPropagation();
    if (!window.confirm("이 고사를 보관 처리하시겠습니까?")) return;
    await archivePlan({ schoolId, planId });
    fetchPlans();
  };

  const handleDelete = async (e, planId) => {
    e.stopPropagation();
    if (!window.confirm("이 고사를 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.")) return;
    await deletePlan({ schoolId, planId });
    fetchPlans();
  };

  const handleRestore = async (e, planId) => {
    e.stopPropagation();
    await setDoc(
      doc(firebaseDb, "schools", schoolId, "plans", planId),
      { status: "draft", updatedAt: serverTimestamp() },
      { merge: true },
    );
    fetchPlans();
  };

  return (
    <div style={s.page}>

      {/* ── 사용 문의 바 (최상단) ── */}
      <div style={s.supportBar}>
        <span style={s.supportLabel}>사용 문의 (버그 · 기능 추가 · 사용 방법)</span>
        <a href="https://open.kakao.com/o/gQwzPAvi" target="_blank" rel="noopener noreferrer" style={s.supportLink}>
          카카오톡 오픈채팅
        </a>
        <span style={s.supportDivider}>|</span>
        <span style={s.supportLabel}>참여코드</span>
        <span style={s.supportCode}>2026</span>
      </div>

      {/* ── 헤더 ── */}
      <header style={s.header}>
        <div style={s.headerInner}>
          <div>
            <p style={s.eyebrow}>시험 운영 지원 플랫폼</p>
            <h1 style={s.headerTitle}>{schoolName}</h1>
          </div>
          <div style={s.headerRight}>
            <span style={s.userChip}>{userName}</span>
            <button style={s.outlineBtn} onClick={onLogout}>로그아웃</button>
          </div>
        </div>
      </header>

      {/* ── 콘텐츠 ── */}
      <div style={s.content}>

        {/* Zone A: 진행 중인 고사 */}
        <p style={s.sectionLabel}>진행 중인 고사</p>

        {loading ? (
          <div style={s.loading}>불러오는 중...</div>
        ) : activePlan ? (
          <ActiveExamCard
            plan={activePlan}
            onOpen={() => onSelectExam(activePlan.id)}
            onArchive={(e) => handleArchive(e, activePlan.id)}
            onDelete={(e) => handleDelete(e, activePlan.id)}
          />
        ) : (
          <div style={s.emptyCard}>
            <p style={s.emptyTitle}>진행 중인 고사가 없습니다</p>
            <p style={s.emptyDesc}>새 고사를 만들어 업무를 시작하세요.</p>
            <button style={s.primaryBtn} onClick={() => setCreateOpen(true)}>+ 새 고사 만들기</button>
          </div>
        )}

        {/* Zone B + C: 기초 데이터 + 캘린더 */}
        <div style={s.twoCol}>

          {/* B: 기초 데이터 */}
          <div style={s.card}>
            <p style={s.cardTitle}>기초 데이터 현황</p>

            <div style={s.statRow}>
              <span style={s.statLabel}>👥 학생 명렬</span>
              <div style={{ textAlign: "right" }}>
                <span style={s.statValue}>총 {students.length}명</span>
                <div style={s.statGradeRow}>
                  {["1", "2", "3"].map((g) => (
                    <span key={g} style={s.statGradeItem}>{g}학년 {gradeCounts[g]}명</span>
                  ))}
                </div>
              </div>
            </div>

            <div style={s.statRow}>
              <span style={s.statLabel}>🏫 고사실</span>
              <span style={s.statValue}>{rooms.length}개</span>
            </div>

            <div style={{ ...s.statRow, borderBottom: "none" }}>
              <span style={s.statLabel}>📚 과목</span>
              <span style={s.statValue}>{subjects.length}개</span>
            </div>

            <button style={s.linkBtn} onClick={onGoToData}>
              기초 데이터 관리 →
            </button>
          </div>

          {/* C: 시험 일정 캘린더 */}
          <div style={s.card}>
            <p style={s.cardTitle}>시험 일정</p>
            <MiniCalendar
              highlightDates={activePlan?.days?.map((d) => d.date).filter(Boolean) ?? []}
              initialMonth={firstExamDate}
            />
            {!activePlan?.days?.length && (
              <p style={{ fontSize: "0.78rem", color: "#9ca3af", margin: "0.5rem 0 0", textAlign: "center" }}>
                시험계획 탭에서 날짜를 설정하면 여기에 표시됩니다.
              </p>
            )}
          </div>

        </div>

        {/* Zone D: 다른 고사 목록 */}
        {!loading && (
          <>
            <div style={s.sectionHeader}>
              <span style={s.sectionTitle}>
                다른 고사 {otherPlans.length > 0 ? `(${otherPlans.length})` : ""}
              </span>
              {otherPlans.length > 0 && (
                <button
                  style={s.toggleBtn}
                  onClick={() => setArchivedExpanded((v) => !v)}
                >
                  {archivedExpanded ? "▲ 접기" : "▼ 펼치기"}
                </button>
              )}
            </div>

            {archivedExpanded && otherPlans.length > 0 && (
              <div style={s.planGrid}>
                {otherPlans.map((plan) => {
                  const examLabel = EXAM_TYPES.find((t) => t.key === plan.examType)?.label;
                  const isArchived = plan.status === "archived";
                  return (
                    <div key={plan.id} style={s.planCard}>
                      <p style={s.planCardName}>{plan.name || "이름 없음"}</p>
                      <div style={s.planCardMeta}>
                        {examLabel && <div>{examLabel}</div>}
                        {plan.updatedAt && <div>최종 수정: {fmtTimestamp(plan.updatedAt)}</div>}
                      </div>
                      <div style={s.planCardFoot}>
                        <span style={isArchived ? s.statusArchived : s.statusDraft}>
                          {isArchived ? "보관됨" : "진행 중"}
                        </span>
                        <div style={s.cardActions}>
                          {isArchived ? (
                            <button style={s.smallBtn} onClick={(e) => handleRestore(e, plan.id)}>복원</button>
                          ) : (
                            <>
                              <button style={s.smallBtn} onClick={() => onSelectExam(plan.id)}>열기</button>
                              <button style={s.smallBtn} onClick={(e) => handleArchive(e, plan.id)}>보관</button>
                            </>
                          )}
                          <button style={s.deleteBtn} onClick={(e) => handleDelete(e, plan.id)}>삭제</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {otherPlans.length === 0 && (
              <p style={{ fontSize: "0.8rem", color: "#d1d5db", margin: "0 0 1rem" }}>보관된 고사가 없습니다.</p>
            )}

            <div style={s.newExamRow}>
              <button style={s.outlineBtn} onClick={() => setCreateOpen(true)}>+ 새 고사 만들기</button>
            </div>
          </>
        )}

      </div>

      {/* 새 고사 모달 */}
      {createOpen && (
        <CreateExamModal
          schoolId={schoolId}
          ownerId={ownerId}
          onCreated={(newPlanId) => {
            setCreateOpen(false);
            onSelectExam(newPlanId);
          }}
          onClose={() => setCreateOpen(false)}
        />
      )}

      <AppFooter />

    </div>
  );
}

// ── 진행 중인 고사 카드 ───────────────────────────────────────────────────────

function ActiveExamCard({ plan, onOpen, onArchive, onDelete }) {
  const examLabel = EXAM_TYPES.find((t) => t.key === plan.examType)?.label;
  const dateRange = getDateRange(plan.days);
  const currentStep = computeStep(plan);

  return (
    <div style={s.activeCard}>
      {/* 상단: 고사명 + D-day */}
      <div style={s.activeTop}>
        <div style={s.activeMeta}>
          {examLabel && <p style={{ fontSize: "0.72rem", color: "#6b7280", margin: "0 0 0.2rem" }}>{plan.academicYear}학년도 · {examLabel}</p>}
          <p style={s.activeName}>{plan.name || "이름 없음"}</p>
          {dateRange
            ? <p style={s.activeDates}>📅 {dateRange}</p>
            : <p style={{ ...s.activeDates, color: "#d1d5db" }}>날짜 미설정</p>}
        </div>
        <DDayBadge days={plan.days} />
      </div>

      {/* 워크플로우 단계 */}
      <WorkflowSteps plan={plan} />

      {/* 하단: 현재 할 일 안내 + 열기 버튼 */}
      <div style={s.actionRow}>
        <p style={s.actionHint}>
          <span style={s.actionHintBold}>지금 할 일: </span>
          {STEP_HINTS[currentStep - 1]}
        </p>
        <div style={s.activeCardActions}>
          <button style={s.smallBtn} onClick={onArchive}>보관</button>
          <button style={s.deleteBtn} onClick={onDelete}>삭제</button>
          <button style={s.primaryBtn} onClick={onOpen}>고사 열기 →</button>
        </div>
      </div>
    </div>
  );
}

// ── 새 고사 모달 ──────────────────────────────────────────────────────────────

function CreateExamModal({ schoolId, ownerId, onCreated, onClose }) {
  const currentYear = new Date().getFullYear();
  const [academicYear, setAcademicYear] = useState(currentYear);
  const [examType, setExamType] = useState(EXAM_TYPES[0].key);
  const [name, setName] = useState(EXAM_TYPES[0].label);
  const [saving, setSaving] = useState(false);

  const handleTypeChange = (key) => {
    setExamType(key);
    const type = EXAM_TYPES.find((t) => t.key === key);
    if (type) setName(type.label);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const type = EXAM_TYPES.find((t) => t.key === examType);
      const plan = {
        ...getDefaultPlan(schoolId),
        name: name.trim(),
        academicYear,
        examType,
        semester: type?.semester ?? null,
        status: "draft",
      };
      const planId = await savePlan({ schoolId, ownerId, plan });
      onCreated(planId);
    } catch {
      setSaving(false);
    }
  };

  return (
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={s.modalTitle}>새 고사 만들기</h3>

        <div style={s.fieldGroup}>
          <label style={s.label}>학년도</label>
          <select
            style={s.select}
            value={academicYear}
            onChange={(e) => setAcademicYear(Number(e.target.value))}
          >
            {[currentYear + 1, currentYear, currentYear - 1].map((y) => (
              <option key={y} value={y}>{y}학년도</option>
            ))}
          </select>
        </div>

        <div style={s.fieldGroup}>
          <label style={s.label}>고사 유형</label>
          <select
            style={s.select}
            value={examType}
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            {EXAM_TYPES.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>

        <div style={s.fieldGroup}>
          <label style={s.label}>고사명</label>
          <input
            style={s.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 1학기 1차 지필고사"
          />
        </div>

        <div style={s.modalActions}>
          <button style={s.outlineBtn} onClick={onClose}>취소</button>
          <button style={s.primaryBtn} onClick={handleCreate} disabled={saving || !name.trim()}>
            {saving ? "생성 중..." : "생성"}
          </button>
        </div>
      </div>
    </div>
  );
}
