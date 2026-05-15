import { useMemo, useState } from "react";
import DashboardPanel from "./components/DashboardPanel";
import DataManagementPage from "./components/DataManagementPage";
import ExamPlanPage from "./components/ExamPlanPage";
import LoginScreen from "./components/LoginScreen";
import RoomAssignmentPage from "./components/RoomAssignmentPage";
import ScheduleBoardPage from "./components/ScheduleBoardPage";
import StudentListModal from "./components/StudentListModal";
import SuperAdminPage from "./components/SuperAdminPage";
import VersionBrowserModal from "./components/VersionBrowserModal";
import { useAuth } from "./hooks/useAuth";
import { usePlannerData } from "./hooks/usePlannerData";
import { useScheduleEngine } from "./hooks/useScheduleEngine";
import { useTenantData } from "./hooks/useTenantData";

const PAGES = [
  { key: "data",     label: "기초 데이터" },
  { key: "examplan", label: "시험계획" },
  { key: "rooms",    label: "고사실 배정" },
  { key: "schedule", label: "일정 배치" },
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
};

function SaveBadge({ status }) {
  if (status === "saving") return <span style={{ fontSize: "0.8rem", fontWeight: 600, padding: "0.3rem 0.75rem", borderRadius: "999px", color: "#1d4ed8", backgroundColor: "#eff6ff" }}>저장 중...</span>;
  if (status === "saved")  return <span style={{ fontSize: "0.8rem", fontWeight: 600, padding: "0.3rem 0.75rem", borderRadius: "999px", color: "#15803d", backgroundColor: "#f0fdf4" }}>✓ 저장됨</span>;
  if (status === "error")  return <span style={{ fontSize: "0.8rem", fontWeight: 600, padding: "0.3rem 0.75rem", borderRadius: "999px", color: "#dc2626", backgroundColor: "#fef2f2" }}>⚠ 저장 실패</span>;
  return null;
}

function App() {
  const auth = useAuth();
  const [activePage, setActivePage] = useState("data");
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [draftStudents, setDraftStudents] = useState([]);
  const [draftEnrollments, setDraftEnrollments] = useState([]);
  const [versionModalOpen, setVersionModalOpen] = useState(false);

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

  // draftStudents/Enrollments는 기초데이터 탭에서 업로드 직후 미리보기용
  const effectiveStudents = draftStudents.length > 0 ? draftStudents : tenantData.students;
  const effectiveEnrollments = draftEnrollments.length > 0 ? draftEnrollments : tenantData.enrollments;

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
    setSessions((current) => [...current, session]);
  };

  const removeSession = (sessionId) => {
    setSessions((current) => current.filter((session) => session.id !== sessionId));
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

  const schoolName = tenantData.school.name || auth.profile?.schoolId || "";

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
            <span style={s.userChip}>{auth.user?.displayName ?? auth.user?.email}</span>
            <button style={s.outlineBtn} onClick={() => setVersionModalOpen(true)}>불러오기</button>
            <button
              style={s.primaryBtn}
              onClick={async () => {
                await planner.savePlan(plan);
                planner.createVersion(plan);
              }}
              disabled={planner.saveStatus === "saving"}
            >
              저장
            </button>
            <button
              style={{ ...s.outlineBtn, color: "#dc2626", borderColor: "#fecaca" }}
              onClick={() => {
                if (window.confirm("현재 작업본을 초기화하시겠습니까?\n\n저장된 기록은 '불러오기'에서 복원할 수 있습니다.")) {
                  planner.resetPlan();
                }
              }}
            >
              초기화
            </button>
            <button style={s.outlineBtn} onClick={auth.logout}>로그아웃</button>
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

      {/* ── 페이지 콘텐츠 ── */}
      <main>
        {activePage === "data" ? (
          <DataManagementPage schoolId={auth.profile?.schoolId} students={effectiveStudents} />
        ) : null}

        {activePage === "examplan" ? (
          <ExamPlanPage
            plan={plan}
            onPlanChange={(patch) => planner.setPlan((current) => ({ ...current, ...patch }))}
            subjects={tenantData.subjects ?? []}
            students={effectiveStudents}
            enrollments={effectiveEnrollments}
            studentsLoadedAt={tenantData.loadedAt}
            onReloadStudents={tenantData.reload}
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

        {activePage === "overview" ? (
          <DashboardPanel
            summary={engine.summary}
            roomWarnings={engine.roomWarnings}
            onMetricSelect={setSelectedMetric}
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

      {versionModalOpen && (
        <VersionBrowserModal
          schoolId={auth.profile?.schoolId}
          currentPlanId={plan.id}
          onLoad={(versionPlan) => {
            planner.setPlan({ ...versionPlan, id: plan.id || versionPlan.id });
            setVersionModalOpen(false);
          }}
          onDuplicate={(versionPlan) => {
            planner.setPlan({ ...versionPlan, id: "" });
            setVersionModalOpen(false);
          }}
          onClose={() => setVersionModalOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
