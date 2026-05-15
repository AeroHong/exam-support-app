import { useEffect, useMemo, useState } from "react";
import DashboardPanel from "./components/DashboardPanel";
import DataManagementPage from "./components/DataManagementPage";
import ExamPlanPage from "./components/ExamPlanPage";
import LoginScreen from "./components/LoginScreen";
import RoomAssignmentPage from "./components/RoomAssignmentPage";
import ScheduleBoardPage from "./components/ScheduleBoardPage";
import StudentListModal from "./components/StudentListModal";
import SuperAdminPage from "./components/SuperAdminPage";
import { useAuth } from "./hooks/useAuth";
import { usePlannerData } from "./hooks/usePlannerData";
import { useScheduleEngine } from "./hooks/useScheduleEngine";
import { useTenantData } from "./hooks/useTenantData";

const workflowPages = [
  { key: "data", label: "기초 데이터" },
  { key: "examplan", label: "시험계획" },
  { key: "rooms", label: "고사실 배정" },
  { key: "schedule", label: "일정 배치" },
  { key: "overview", label: "개요" },
];

function App() {
  const auth = useAuth();
  const [activePage, setActivePage] = useState("data");
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [draftStudents, setDraftStudents] = useState([]);
  const [draftEnrollments, setDraftEnrollments] = useState([]);

  const tenantData = useTenantData({
    schoolId: auth.profile?.schoolId,
    enabled: auth.status === "signed_in",
  });
  const planner = usePlannerData({
    schoolId: auth.profile?.schoolId,
    ownerId: auth.user?.uid,
    enabled: auth.status === "signed_in",
  });
  const plan = planner.plan;

  useEffect(() => {
    setDraftStudents(tenantData.students);
    setDraftEnrollments(tenantData.enrollments);
  }, [tenantData.students, tenantData.enrollments]);

  const effectiveStudents = draftStudents.length > 0 ? draftStudents : tenantData.students;
  const effectiveEnrollments =
    draftEnrollments.length > 0 ? draftEnrollments : tenantData.enrollments;

  const engine = useScheduleEngine({
    sessions: plan.sessions,
    students: effectiveStudents,
    enrollments: effectiveEnrollments,
    rooms: tenantData.rooms,
  });

  const sessionsById = useMemo(
    () => Object.fromEntries(plan.sessions.map((session) => [session.id, session])),
    [plan.sessions],
  );

  const setSessions = (updater) => {
    planner.setPlan((current) => ({
      ...current,
      sessions: typeof updater === "function" ? updater(current.sessions) : updater,
    }));
  };

  const updateSession = (sessionId, patch) => {
    planner.setPlan((current) => ({
      ...current,
      sessions: current.sessions.map((session) =>
        session.id === sessionId ? { ...session, ...patch } : session,
      ),
    }));
  };

  const handleMove = (sessionId, nextSlot) => {
    const nextDay = plan.days.find((day) => day.id === nextSlot.dayId);
    updateSession(sessionId, {
      dayId: nextSlot.dayId,
      grade: nextSlot.grade,
      periodId: nextSlot.periodId ?? sessionsById[sessionId].periodId,
      startTime: nextSlot.startTime,
      duration: nextSlot.duration ?? sessionsById[sessionId].duration,
      dateLabel: nextSlot.dateLabel ?? nextDay?.label ?? sessionsById[sessionId].dateLabel,
    });
  };

  const addSession = (session) => {
    setSessions((currentSessions) => [...currentSessions, session]);
  };

  const removeSession = (sessionId) => {
    setSessions((currentSessions) => currentSessions.filter((session) => session.id !== sessionId));
  };

  const selectedStudents = selectedMetric
    ? engine.metricStudentDetails[selectedMetric] ?? []
    : [];

  if (auth.status !== "signed_in") {
    return (
      <LoginScreen
        status={auth.status}
        error={auth.error}
        onSignIn={auth.signIn}
        onSubmitSchoolName={auth.submitSchoolName}
      />
    );
  }

  if (auth.profile?.role === "super_admin") {
    return <SuperAdminPage onLogout={auth.logout} />;
  }

  return (
    <div className="min-h-screen bg-grid">
      <main className="app-shell">
        <header className="topbar">
          <div className="topbar-title">
            <p className="eyebrow">시험 운영 지원 플랫폼</p>
            <h1>{tenantData.school.name ?? auth.profile?.schoolId}</h1>
          </div>

          <div className="topbar-meta">
            <span className="status-pill">{auth.user?.displayName ?? auth.user?.email}</span>
            <span className="status-pill">작업본 {plan.name}</span>
            <span className="status-pill">저장 {planner.saveStatus}</span>
            <span className="status-pill">{tenantData.source}</span>
          </div>

          <div className="topbar-actions">
            <button type="button" className="secondary-button" onClick={planner.reload}>
              불러오기
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => planner.savePlan(plan)}
              disabled={planner.saveStatus === "saving"}
            >
              {planner.saveStatus === "saving" ? "저장 중" : "저장"}
            </button>
            <button type="button" className="secondary-button" onClick={auth.logout}>
              로그아웃
            </button>
          </div>

          <div className="topbar-nav">
            {workflowPages.map((page) => (
              <button
                key={page.key}
                type="button"
                className={`chip ${activePage === page.key ? "chip-active" : ""}`}
                onClick={() => setActivePage(page.key)}
              >
                {page.label}
              </button>
            ))}
          </div>
        </header>

        {auth.warning ? <p className="top-message warning">{auth.warning}</p> : null}
        {tenantData.error ? <p className="top-message error">{tenantData.error}</p> : null}
        {planner.error ? <p className="top-message error">{planner.error}</p> : null}
        {planner.saveError ? <p className="top-message error">{planner.saveError}</p> : null}

        {activePage === "data" ? (
          <DataManagementPage schoolId={auth.profile?.schoolId} onLogout={auth.logout} />
        ) : null}

        {activePage === "overview" ? (
          <DashboardPanel
            summary={engine.summary}
            roomWarnings={engine.roomWarnings}
            onMetricSelect={setSelectedMetric}
          />
        ) : null}

        {activePage === "examplan" ? (
          <ExamPlanPage
            plan={plan}
            onPlanChange={(patch) => planner.setPlan((current) => ({ ...current, ...patch }))}
            subjects={tenantData.subjects ?? []}
            students={effectiveStudents}
            enrollments={effectiveEnrollments}
          />
        ) : null}

        {activePage === "rooms" ? (
          <RoomAssignmentPage
            sessions={plan.sessions}
            rooms={tenantData.rooms}
            roomWarnings={engine.roomWarnings}
            onUpdateRoomIds={(sessionId, roomIds) => updateSession(sessionId, { roomIds })}
          />
        ) : null}

        {activePage === "schedule" ? (
          <ScheduleBoardPage
            days={plan.days}
            sessions={plan.sessions}
            students={effectiveStudents}
            enrollments={effectiveEnrollments}
            roomWarnings={engine.roomWarnings}
            onMove={handleMove}
            onSessionChange={updateSession}
          />
        ) : null}
      </main>

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
    </div>
  );
}

export default App;
