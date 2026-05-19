import { useEffect, useMemo, useRef, useState } from "react";
import AppFooter from "./components/AppFooter";
import DashboardPanel from "./components/DashboardPanel";
import DataManagementPage from "./components/DataManagementPage";
import ExamDashboard from "./components/ExamDashboard";
import ExamPlanPage from "./components/ExamPlanPage";
import LoginScreen from "./components/LoginScreen";
import PrintManagementPage from "./components/PrintManagementPage";
import RoomAssignmentPage from "./components/RoomAssignmentPage";
import ScheduleBoardPage from "./components/ScheduleBoardPage";
import WaitingRoomAssignmentPage from "./components/WaitingRoomAssignmentPage";
import StudentListModal from "./components/StudentListModal";
import SuperAdminPage from "./components/SuperAdminPage";
import VersionBrowserModal from "./components/VersionBrowserModal";
import { useAuth } from "./hooks/useAuth";
import { usePlannerData } from "./hooks/usePlannerData";
import { useScheduleEngine } from "./hooks/useScheduleEngine";
import { useTenantData } from "./hooks/useTenantData";
import { validateConfirmationChain } from "./utils/confirmationChain";
import { recalcSessionStudentCount } from "./utils/sessionStudentCount";

const PAGES = [
  { key: "data",     label: "기초 데이터" },
  { key: "examplan", label: "시험계획" },
  { key: "schedule", label: "일정 배치" },
  { key: "waiting",  label: "대기실 배정" },
  { key: "rooms",    label: "고사실 배정" },
  { key: "print",    label: "출력물 관리" },
  { key: "overview", label: "개요" },
];

const s = {
  page:         { minHeight: "100vh", backgroundColor: "#f8fafc" },
  header:       { backgroundColor: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0.75rem 1.5rem 0", position: "sticky", top: 0, zIndex: 100 },
  headerTop:    { display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.6rem" },
  eyebrow:      { fontSize: "0.7rem", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 },
  headerTitle:  { fontSize: "1.15rem", fontWeight: 800, color: "#111827", margin: "0.15rem 0 0" },
  headerRight:  { display: "flex", gap: "0.5rem", alignItems: "center" },
  planName:     { fontSize: "0.8rem", color: "#9ca3af" },
  userChip:     { fontSize: "0.8rem", color: "#6b7280", padding: "0.3rem 0.75rem", backgroundColor: "#f3f4f6", borderRadius: "999px" },
  primaryBtn:   { padding: "0.35rem 0.85rem", backgroundColor: "#4f46e5", color: "#fff", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 },
  outlineBtn:   { padding: "0.35rem 0.85rem", backgroundColor: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: "7px", cursor: "pointer", fontSize: "0.82rem" },
  navRow:       { display: "flex" },
  navTab:       { padding: "0.5rem 1rem", border: "none", borderBottom: "2.5px solid transparent", backgroundColor: "transparent", color: "#6b7280", cursor: "pointer", fontSize: "0.875rem", fontWeight: 500 },
  navTabActive: { padding: "0.5rem 1rem", border: "none", borderBottom: "2.5px solid #4f46e5", backgroundColor: "transparent", color: "#4f46e5", cursor: "pointer", fontSize: "0.875rem", fontWeight: 700 },
  notice:       { padding: "0.55rem 1.5rem", fontSize: "0.82rem", fontWeight: 600 },
  noticeWarn:   { backgroundColor: "#fff7ed", color: "#b45309", borderBottom: "1px solid #fed7aa" },
  noticeErr:    { backgroundColor: "#fef2f2", color: "#dc2626", borderBottom: "1px solid #fecaca" },
  dataChangeBar: { display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 1.5rem", backgroundColor: "#eff6ff", borderBottom: "1px solid #bfdbfe", fontSize: "0.82rem", color: "#1e40af" },
};

function SaveBadge({ status }) {
  if (status === "saving") return <span style={{ fontSize: "0.8rem", fontWeight: 600, padding: "0.3rem 0.75rem", borderRadius: "999px", color: "#1d4ed8", backgroundColor: "#eff6ff" }}>저장 중...</span>;
  if (status === "saved")  return <span style={{ fontSize: "0.8rem", fontWeight: 600, padding: "0.3rem 0.75rem", borderRadius: "999px", color: "#15803d", backgroundColor: "#f0fdf4" }}>✓ 저장됨</span>;
  if (status === "error")  return <span style={{ fontSize: "0.8rem", fontWeight: 600, padding: "0.3rem 0.75rem", borderRadius: "999px", color: "#dc2626", backgroundColor: "#fef2f2" }}>⚠ 저장 실패</span>;
  return null;
}

function App() {
  const auth = useAuth();
  const demoMode = auth.profile?.role === "demo";
  const [demoSchoolMode, setDemoSchoolMode] = useState(false); // super admin이 demo school UI에 진입한 상태
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [activePage, setActivePage] = useState("data");
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [draftStudents, setDraftStudents] = useState([]);
  const [draftEnrollments, setDraftEnrollments] = useState([]);
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [dataChangeLog, setDataChangeLog] = useState(null); // { grade, delta, type, affectedGrades }

  // super admin이 demo school에 접속 중이면 demo-school 사용
  const effectiveSchoolId = demoSchoolMode ? "demo-school" : auth.profile?.schoolId;

  const tenantData = useTenantData({
    schoolId: effectiveSchoolId,
    enabled: auth.status === "signed_in",
  });
  const planner = usePlannerData({
    schoolId: effectiveSchoolId,
    ownerId: auth.user?.uid,
    planId: selectedPlanId,
    enabled: auth.status === "signed_in" && selectedPlanId !== null,
  });
  const plan = planner.plan;

  const baseStudents = tenantData.students;
  const baseEnrollments = tenantData.enrollments;
  const baseRooms = tenantData.rooms;
  const baseSubjects = tenantData.subjects;
  const effectiveStudents = draftStudents.length > 0 ? draftStudents : baseStudents;
  const effectiveEnrollments = draftEnrollments.length > 0 ? draftEnrollments : baseEnrollments;

  const engine = useScheduleEngine({
    sessions: plan.sessions,
    students: effectiveStudents,
    enrollments: effectiveEnrollments,
    rooms: baseRooms,
  });

  const sessionsById = useMemo(
    () => Object.fromEntries(plan.sessions.map((session) => [session.id, session])),
    [plan.sessions],
  );

  // 로그아웃 시 planId 초기화
  useEffect(() => {
    if (auth.status === "signed_out") {
      setSelectedPlanId(null);
      setDemoSchoolMode(false);
    }
  }, [auth.status]);

  // 플랜 로드 시 확정 chain 검증 — 앞 단계 미확정이면 뒤 단계 자동 해제
  const validatedPlanIdRef = useRef(null);
  useEffect(() => {
    if (!plan.id || plan.id === validatedPlanIdRef.current) return;
    validatedPlanIdRef.current = plan.id;
    const corrected = validateConfirmationChain(plan);
    if (corrected) {
      planner.setPlan((cur) => ({ ...cur, ...corrected }));
    }
  // plan.id가 바뀔 때(로드/버전 복원)만 실행
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id]);

  const setSessions = (updater) => {
    planner.setPlan((current) => ({
      ...current,
      sessions: typeof updater === "function" ? updater(current.sessions) : updater,
    }));
  };

  const updateSession = (sessionId, patch) => {
    planner.setPlan((current) => {
      const grade = current.sessions.find((s) => s.id === sessionId)?.grade;
      // 배치 해제(dayId: "")이면 일정·대기실·고사실 확정 cascade 해제
      const isUnplace = patch.dayId === "";
      return {
        ...current,
        sessions: current.sessions.map((session) =>
          session.id === sessionId ? { ...session, ...patch } : session,
        ),
        ...(isUnplace && grade ? {
          scheduleConfirmed: { ...(current.scheduleConfirmed ?? {}), [grade]: false },
          waitingConfirmed: {},
          roomConfirmed: { ...(current.roomConfirmed ?? {}), [grade]: false },
        } : {}),
      };
    });
  };

  // 세션 배치 변경 → 일정·대기실·고사실 확정 cascade 해제
  const handleMove = (sessionId, nextSlot) => {
    const grade = nextSlot.grade || sessionsById[sessionId]?.grade;
    planner.setPlan((cur) => {
      const nextDay = cur.days.find((d) => d.id === nextSlot.dayId);
      return {
        ...cur,
        sessions: cur.sessions.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                dayId:     nextSlot.dayId,
                grade:     nextSlot.grade,
                periodId:  nextSlot.periodId  ?? s.periodId,
                startTime: nextSlot.startTime,
                duration:  nextSlot.duration  ?? s.duration,
                dateLabel: nextSlot.dateLabel ?? nextDay?.label ?? s.dateLabel,
              }
            : s,
        ),
        scheduleConfirmed: { ...(cur.scheduleConfirmed ?? {}), ...(grade ? { [grade]: false } : {}) },
        waitingConfirmed: {},
        roomConfirmed: { ...(cur.roomConfirmed ?? {}), ...(grade ? { [grade]: false } : {}) },
      };
    });
  };

  // 실시간 동기화: tenantData 변경 시 세션 인원수 자동 재계산
  const prevLoadedAtRef = useRef(null);
  useEffect(() => {
    // 초기 로드는 건너뛰기
    if (prevLoadedAtRef.current === null) {
      prevLoadedAtRef.current = tenantData.loadedAt;
      return;
    }

    // loadedAt이 변경됐고, 세션이 있으면 인원수 재계산
    if (tenantData.loadedAt !== prevLoadedAtRef.current && plan.sessions.length > 0) {
      prevLoadedAtRef.current = tenantData.loadedAt;

      planner.setPlan((cur) => ({
        ...cur,
        sessions: cur.sessions.map((session) => ({
          ...session,
          studentCount: recalcSessionStudentCount(session, tenantData.students, tenantData.enrollments),
        })),
      }));
    }
  }, [tenantData.loadedAt, tenantData.students, tenantData.enrollments, plan.sessions.length, planner]);

  // 수강생 데이터 변동 처리: cascade reload + studentCount 재계산 + 확정 해제
  const handleDataChanged = async ({ grade, delta, type }) => {
    const newData = await tenantData.reload();
    if (!newData) return;

    const { students: ns, enrollments: ne } = newData;
    const affectedGrades = grade === "all" ? ["1", "2", "3"] : [String(grade)];

    planner.setPlan((cur) => {
      const sessions = cur.sessions.map((session) => {
        if (!affectedGrades.includes(String(session.grade))) return session;
        if (type === "statusSpecial") return session;
        return { ...session, studentCount: recalcSessionStudentCount(session, ns, ne) };
      });

      const sc = { ...(cur.scheduleConfirmed ?? {}) };
      const rc = { ...(cur.roomConfirmed ?? {}) };
      // 위탁 변경: 응시 인원 변동 → 일정·고사실 확정 모두 해제
      // 특수/별도 변경: 물리 좌석 배치만 달라짐 → 고사실 확정만 해제
      if (type !== "statusSpecial") {
        affectedGrades.forEach((g) => { sc[g] = false; });
      }
      affectedGrades.forEach((g) => { rc[g] = false; });

      return { ...cur, sessions, scheduleConfirmed: sc, roomConfirmed: rc };
    });

    setDataChangeLog({ grade, delta, type, affectedGrades, timestamp: Date.now() });

    // 시험계획 탭이 열려있으면 자동 탭 전환으로 즉시 반영 유도
    if (activePage === "examplan") {
      setDataChangeLog((prev) => prev ? { ...prev, autoSwitched: true } : prev);
    }
  };

  // 학년별 시험계획 확정 여부 (세션 존재 기준)
  const examPlanReady = useMemo(() => {
    const r = {};
    ["1", "2", "3"].forEach((g) => {
      r[g] = plan.sessions.some((s) => String(s.grade) === g);
    });
    return r;
  }, [plan.sessions]);

  const handleConfirmSchedule = (grade) => {
    planner.setPlanAndSave((cur) => ({ ...cur, scheduleConfirmed: { ...(cur.scheduleConfirmed ?? {}), [grade]: true } }));
  };
  const handleDeconfirmSchedule = (grade) => {
    planner.setPlanAndSave((cur) => ({ ...cur, scheduleConfirmed: { ...(cur.scheduleConfirmed ?? {}), [grade]: false } }));
  };
  // planPatch가 전달되면 세션 갱신 + 확정을 단일 원자적 저장으로 처리
  const handleConfirmExamPlan = (grade, planPatch) => {
    planner.setPlanAndSave((cur) => ({
      ...cur,
      ...(planPatch ?? {}),
      examPlanConfirmed: { ...(cur.examPlanConfirmed ?? {}), [grade]: true },
    }));
  };
  const handleDeconfirmExamPlan = (grade) => {
    planner.setPlanAndSave((cur) => ({
      ...cur,
      examPlanConfirmed: { ...(cur.examPlanConfirmed ?? {}), [grade]: false },
      scheduleConfirmed: { ...(cur.scheduleConfirmed ?? {}), [grade]: false },
      waitingConfirmed: {},
      roomConfirmed: { ...(cur.roomConfirmed ?? {}), [grade]: false },
    }));
  };

  const handleConfirmRoom = (grade) => {
    planner.setPlanAndSave((cur) => ({ ...cur, roomConfirmed: { ...(cur.roomConfirmed ?? {}), [grade]: true } }));
  };
  const handleDeconfirmRoom = (grade) => {
    planner.setPlanAndSave((cur) => ({ ...cur, roomConfirmed: { ...(cur.roomConfirmed ?? {}), [grade]: false } }));
  };

  const handleUpdateWaitingAssignments = (periodKey, assignments) => {
    planner.setPlan((cur) => ({
      ...cur,
      waitingAssignments: { ...(cur.waitingAssignments ?? {}), [periodKey]: assignments },
    }));
  };
  const handleConfirmWaiting = (periodKey) => {
    planner.setPlanAndSave((cur) => ({ ...cur, waitingConfirmed: { ...(cur.waitingConfirmed ?? {}), [periodKey]: true } }));
  };
  const handleDeconfirmWaiting = (periodKey) => {
    planner.setPlanAndSave((cur) => ({ ...cur, waitingConfirmed: { ...(cur.waitingConfirmed ?? {}), [periodKey]: false } }));
  };

  // 학년 배치 초기화 → 해당 학년 모든 확정 cascade 해제
  const resetGradePlacements = (grade) => {
    planner.setPlan((cur) => ({
      ...cur,
      sessions: cur.sessions.map((s) =>
        String(s.grade) === String(grade)
          ? { ...s, dayId: "", periodId: "", dateLabel: "미배치", startTime: "" }
          : s,
      ),
      scheduleConfirmed: { ...(cur.scheduleConfirmed ?? {}), [grade]: false },
      waitingConfirmed: {},
      roomConfirmed: { ...(cur.roomConfirmed ?? {}), [grade]: false },
    }));
  };

  const addSession = (session) => {
    setSessions((current) => [...current, session]);
  };

  // 세션 삭제 → 해당 학년 모든 확정 cascade 해제
  const removeSession = (sessionId) => {
    const grade = sessionsById[sessionId]?.grade;
    planner.setPlan((cur) => ({
      ...cur,
      sessions: cur.sessions.filter((s) => s.id !== sessionId),
      ...(grade ? {
        scheduleConfirmed: { ...(cur.scheduleConfirmed ?? {}), [grade]: false },
        waitingConfirmed: {},
        roomConfirmed: { ...(cur.roomConfirmed ?? {}), [grade]: false },
      } : {}),
    }));
  };

  const selectedStudents = selectedMetric
    ? engine.metricStudentDetails[selectedMetric] ?? []
    : [];

  // 초기 로딩 / 로그인 처리 중 → 화면 번쩍임 방지
  if (auth.status === "loading" || auth.status === "resolving") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
        <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>불러오는 중…</p>
      </div>
    );
  }

  if (!demoMode && auth.status !== "signed_in") {
    return (
      <LoginScreen
        status={auth.status}
        error={auth.error}
        onSignIn={auth.signIn}
        onJoinSchool={auth.joinExistingSchool}
        onCreateSchool={auth.createNewSchool}
        onDemo={auth.signInDemo}
      />
    );
  }

  if (auth.profile?.role === "super_admin" && !demoSchoolMode) {
    return (
      <SuperAdminPage
        onLogout={auth.logout}
        onEnterDemoSchool={() => { setDemoSchoolMode(true); setSelectedPlanId(null); }}
      />
    );
  }

  const schoolName = tenantData.school.name || auth.profile?.schoolName || (demoSchoolMode ? "한빛고등학교" : "");

  const currentSchoolId = effectiveSchoolId;
  const currentOwnerId = auth.user?.uid;
  const currentUserName = demoMode ? "데모 사용자" : (auth.user?.displayName ?? auth.user?.email);

  // 고사 미선택 → 대시보드
  if (selectedPlanId === null) {
    return (
      <ExamDashboard
        schoolId={currentSchoolId}
        ownerId={currentOwnerId}
        schoolName={schoolName}
        userName={currentUserName}
        onSelectExam={(planId) => {
          setSelectedPlanId(planId);
          setActivePage("data");
          setDataChangeLog(null);
        }}
        onLogout={demoSchoolMode ? () => { setDemoSchoolMode(false); setSelectedPlanId(null); } : auth.logout}
      />
    );
  }

  return (
    <div style={s.page}>
      {/* ── 상단 헤더 ── */}
      <header style={s.header}>
        <div style={s.headerTop}>
          <div>
            <p style={s.eyebrow}>시험 운영 지원 플랫폼</p>
            <h1 style={s.headerTitle}>{schoolName}</h1>
          </div>
          <div style={s.headerRight}>
            {plan.name && <span style={s.planName}>{plan.name}</span>}
            <SaveBadge status={planner.saveStatus} />
            <span style={s.userChip}>{currentUserName}</span>
            <button style={s.outlineBtn} onClick={() => setSelectedPlanId(null)}>← 시험 목록</button>
            {!demoMode && <button style={s.outlineBtn} onClick={() => setVersionModalOpen(true)}>불러오기</button>}
            <button
              style={s.primaryBtn}
              onClick={async () => {
                await planner.savePlan(plan);
                if (!demoMode) planner.createVersion(plan);
              }}
              disabled={planner.saveStatus === "saving"}
            >
              저장
            </button>
            <button
              style={s.outlineBtn}
              onClick={demoSchoolMode ? () => { setDemoSchoolMode(false); setSelectedPlanId(null); } : auth.logout}
            >
              {demoSchoolMode ? "← 관리자 콘솔" : demoMode ? "데모 종료" : "로그아웃"}
            </button>
          </div>
        </div>
        <nav style={s.navRow}>
          {PAGES.map((page) => (
            <button
              key={page.key}
              style={activePage === page.key ? s.navTabActive : s.navTab}
              onClick={() => setActivePage(page.key)}
            >
              {page.label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── 알림 배너 ── */}
      {auth.warning   && <div style={{ ...s.notice, ...s.noticeWarn }}>{auth.warning}</div>}
      {tenantData.error && <div style={{ ...s.notice, ...s.noticeErr }}>{tenantData.error}</div>}
      {planner.error  && <div style={{ ...s.notice, ...s.noticeErr }}>{planner.error}</div>}
      {planner.saveError && <div style={{ ...s.notice, ...s.noticeErr }}>{planner.saveError}</div>}
      {dataChangeLog && (
        <div style={s.dataChangeBar}>
          <span>📋</span>
          <span style={{ flex: 1 }}>
            <strong>수강생 데이터 변동</strong>
            {" — "}
            {dataChangeLog.grade === "all" ? "전체 학년" : `${dataChangeLog.grade}학년`}
            {dataChangeLog.delta < 0 && ` ${Math.abs(dataChangeLog.delta)}명 삭제`}
            {dataChangeLog.delta > 0 && ` ${dataChangeLog.delta}명 업로드`}
            {dataChangeLog.type === "statusDelegation" && " 위탁 처리 변경 — 응시 인원이 재계산됐습니다. 영향받은 학년의 일정·고사실 확정이 해제됐으니 재확인 후 다시 확정해주세요."}
            {dataChangeLog.type === "statusSpecial" && " 응시 형태 변경 — 고사실 좌석 배치가 달라질 수 있습니다. 고사실 배정 확정이 해제됐으니 재확인 후 다시 확정해주세요."}
            {dataChangeLog.type !== "statusDelegation" && dataChangeLog.type !== "statusSpecial" && " · 응시 인원이 자동 재계산됐습니다. 영향받은 학년의 일정·고사실 배정 확정이 해제됐으니 재확인 후 다시 확정해주세요."}
          </span>
          <button
            style={{ padding: "0.2rem 0.65rem", backgroundColor: "#fff", color: "#1e40af", border: "1px solid #bfdbfe", borderRadius: "5px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, flexShrink: 0 }}
            onClick={() => setDataChangeLog(null)}
          >
            확인
          </button>
        </div>
      )}

      {/* ── 페이지 콘텐츠 ── */}
      <main>
        {activePage === "data" ? (
          <DataManagementPage schoolId={currentSchoolId} students={effectiveStudents} subjects={baseSubjects} onDataChanged={handleDataChanged} onReloadStudents={tenantData.reload} readOnly={demoMode} />
        ) : null}

        {activePage === "examplan" ? (
          <ExamPlanPage
            plan={plan}
            onPlanChange={(patch) => planner.setPlan((current) => ({ ...current, ...patch }))}
            subjects={baseSubjects}
            students={effectiveStudents}
            enrollments={effectiveEnrollments}
            studentsLoadedAt={demoMode ? Date.now() : tenantData.loadedAt}
            onReloadStudents={demoMode ? () => {} : tenantData.reload}
            examPlanConfirmed={plan.examPlanConfirmed ?? {}}
            onConfirmExamPlan={handleConfirmExamPlan}
            onDeconfirmExamPlan={handleDeconfirmExamPlan}
          />
        ) : null}

        {activePage === "print" ? (
          <PrintManagementPage
            plan={plan}
            tenantData={{
              students: effectiveStudents,
              enrollments: effectiveEnrollments,
              rooms: baseRooms,
              subjects: baseSubjects,
            }}
            schoolName={schoolName}
          />
        ) : null}

        {activePage === "waiting" ? (
          <WaitingRoomAssignmentPage
            plan={plan}
            students={effectiveStudents}
            enrollments={effectiveEnrollments}
            rooms={baseRooms}
            subjects={baseSubjects}
            examPlanReady={examPlanReady}
            scheduleConfirmed={plan.scheduleConfirmed ?? {}}
            onUpdateWaitingAssignments={handleUpdateWaitingAssignments}
            waitingConfirmed={plan.waitingConfirmed ?? {}}
            onConfirmWaiting={handleConfirmWaiting}
            onDeconfirmWaiting={handleDeconfirmWaiting}
          />
        ) : null}

        {activePage === "rooms" ? (
          <RoomAssignmentPage
            sessions={plan.sessions}
            rooms={baseRooms}
            students={effectiveStudents}
            enrollments={effectiveEnrollments}
            examPlanReady={examPlanReady}
            scheduleConfirmed={plan.scheduleConfirmed ?? {}}
            onUpdateRoomIds={(sessionId, roomIds) => updateSession(sessionId, { roomIds })}
            onUpdateAllRoomIds={(patch) =>
              planner.setPlan((cur) => ({
                ...cur,
                sessions: cur.sessions.map((s) =>
                  patch[s.id] !== undefined ? { ...s, roomIds: patch[s.id] } : s,
                ),
              }))
            }
            roomConfirmed={plan.roomConfirmed ?? {}}
            onConfirmRoom={handleConfirmRoom}
            onDeconfirmRoom={handleDeconfirmRoom}
          />
        ) : null}

        {activePage === "schedule" ? (
          <ScheduleBoardPage
            days={plan.days}
            periods={plan.periods}
            sessions={plan.sessions}
            students={effectiveStudents}
            enrollments={effectiveEnrollments}
            examPlanReady={examPlanReady}
            onMove={handleMove}
            onSessionChange={updateSession}
            onResetPlacements={resetGradePlacements}
            onDayChange={(dayId, patch) =>
              planner.setPlan((cur) => ({
                ...cur,
                days: cur.days.map((d) => (d.id === dayId ? { ...d, ...patch } : d)),
              }))
            }
            onSwapDays={(dayIdA, dayIdB, labelA, labelB) =>
              planner.setPlan((cur) => ({
                ...cur,
                sessions: cur.sessions.map((s) => {
                  if (s.dayId === dayIdA) return { ...s, dayId: dayIdB, dateLabel: labelB ?? "" };
                  if (s.dayId === dayIdB) return { ...s, dayId: dayIdA, dateLabel: labelA ?? "" };
                  return s;
                }),
                // 날짜 전체 스왑 → 모든 대기실·고사실 확정 해제
                waitingConfirmed: {},
                roomConfirmed: {},
              }))
            }
            scheduleConfirmed={plan.scheduleConfirmed ?? {}}
            onConfirmSchedule={handleConfirmSchedule}
            onDeconfirmSchedule={handleDeconfirmSchedule}
          />
        ) : null}

        {activePage === "overview" ? (
          <DashboardPanel
            summary={engine.summary}
            roomWarnings={engine.roomWarnings}
            onMetricSelect={setSelectedMetric}
          />
        ) : null}
      </main>

      <AppFooter />

      <StudentListModal
        open={Boolean(selectedMetric)}
        titleMap={{
          waitingStudents: "대기 학생",
          noExamStudents: "무시험 학생",
          tripleStudents: "3연속 시험 학생",
          conflictingStudents: "충돌 학생",
        }}
        metricKey={selectedMetric}
        students={selectedStudents}
        onClose={() => setSelectedMetric(null)}
      />

      {versionModalOpen && (
        <VersionBrowserModal
          schoolId={currentSchoolId}
          currentPlanId={plan.id}
          onLoad={async (versionData) => {
            planner.setPlan({ ...versionData.plan, id: plan.id || versionData.plan.id });

            // enrollment 데이터 복구
            if (versionData.enrollments && versionData.enrollments.length > 0) {
              const { restoreEnrollments } = await import("./lib/firestorePlanner");
              await restoreEnrollments({
                schoolId: currentSchoolId,
                enrollments: versionData.enrollments,
              });
              // tenant 데이터 새로고침
              tenantData.reload();
            }

            setVersionModalOpen(false);
          }}
          onDuplicate={(versionData) => {
            planner.setPlan({ ...versionData.plan, id: "" });
            setVersionModalOpen(false);
          }}
          onClose={() => setVersionModalOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
