import { useState } from "react";
import { generateSubjectRosters } from "../utils/subjectRosterGenerator";
import {
  generateSubjectRostersExcel,
  generateSessionRoomRosterExcel,
  generateClassRostersExcel,
  generateWaitingRostersExcel,
  generateStudentTimetablesExcel,
  sessionFileName,
  downloadExcel,
} from "../utils/excelGenerator";
import {
  generateRoomRostersHTML,
  generateSubjectRostersHTML,
  generateClassRostersHTML,
  generateWaitingRostersHTML,
  generateStudentTimetablesHTML,
  openPrintWindow,
} from "../utils/htmlPrintGenerator";
import {
  generateClassRosters,
  generateWaitingRosters,
  generateStudentTimetables,
} from "../utils/classRosterGenerator";

// ─── 스타일 ──────────────────────────────────────────────────────────────────

const s = {
  page: { padding: "1.5rem", maxWidth: "1100px" },
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "1.25rem",
  },
  eyebrow: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "0.25rem",
  },
  pageTitle: { fontSize: "1.5rem", fontWeight: 800, color: "#111827", margin: 0 },

  section: {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "1.5rem",
    marginBottom: "1.5rem",
  },
  sectionTitle: { fontSize: "1.1rem", fontWeight: 700, color: "#111827", marginBottom: "0.75rem" },
  sectionDesc: { fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" },

  btnRow: { display: "flex", gap: "0.75rem", flexWrap: "wrap" },
  primaryBtn: {
    padding: "0.65rem 1.25rem",
    backgroundColor: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: 600,
  },
  outlineBtn: {
    padding: "0.65rem 1.25rem",
    backgroundColor: "#fff",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  disabledBtn: {
    padding: "0.65rem 1.25rem",
    backgroundColor: "#f3f4f6",
    color: "#9ca3af",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    cursor: "not-allowed",
    fontSize: "0.9rem",
  },

  notice: { padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.875rem", marginBottom: "1rem" },
  noticeInfo: { backgroundColor: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe" },
  noticeSuccess: { backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" },
  noticeError: { backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "1rem",
    marginBottom: "1.5rem",
  },
  statCard: {
    backgroundColor: "#f9fafb",
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
  },
  statLabel: { fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" },
  statValue: { fontSize: "1.5rem", fontWeight: 700, color: "#111827" },

  backdrop: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "1.5rem",
    width: "min(500px, 90vw)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
  },
  modalTitle: { fontSize: "1.1rem", fontWeight: 800, color: "#111827", marginBottom: "1.25rem" },
  label: {
    display: "block",
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "#374151",
    marginBottom: "0.3rem",
  },
  select: {
    width: "100%",
    padding: "0.5rem 0.75rem",
    border: "1px solid #d1d5db",
    borderRadius: "7px",
    fontSize: "0.875rem",
    backgroundColor: "#fff",
    marginBottom: "0.75rem",
  },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.25rem" },
  hintText: { fontSize: "0.75rem", color: "#6b7280", marginTop: "0.5rem" },
};

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function PrintManagementPage({ plan, tenantData, schoolName = "OO고등학교" }) {
  const [notice, setNotice] = useState(null);
  const [generating, setGenerating] = useState(false);

  // 모달: type은 "room" | "subject" | "class" | "waiting"
  const [filterModal, setFilterModal] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState("excel");
  // 고사실별 선택용 (세션 단위)
  const [selectedSession, setSelectedSession] = useState("");
  // 과목별/대기실 선택용 (날짜+교시)
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  // 학급별 선택용 (학년)
  const [selectedGrade, setSelectedGrade] = useState("");

  const { students = [], enrollments = [], rooms = [], subjects = [] } = tenantData || {};

  const totalSessions = plan?.sessions?.filter((s) => s.dayId && s.periodId).length || 0;
  const totalRooms = new Set(plan?.sessions?.flatMap((s) => s.roomIds || []) || []).size;

  function showNotice(type, msg) { setNotice({ type, msg }); }

  // ── 공통 데이터 빌더 ────────────────────────────────────────────────────────

  function buildRosters(dayFilter, periodFilter) {
    let rosters = generateSubjectRosters(plan, students, enrollments, rooms, subjects);
    if (dayFilter) {
      rosters = rosters.filter((r) => plan.sessions.find((s) => s.id === r.sessionId)?.dayId === dayFilter);
    }
    if (periodFilter) {
      rosters = rosters.filter((r) => plan.sessions.find((s) => s.id === r.sessionId)?.periodId === periodFilter);
    }
    return rosters;
  }

  function getAllRosters() {
    return generateSubjectRosters(plan, students, enrollments, rooms, subjects);
  }

  // ── 고사실별 응시 현황표 ─────────────────────────────────────────────────────

  function handleRoomExcel(sessionId = null) {
    if (!plan?.sessions?.length) { showNotice("error", "생성할 세션이 없습니다."); return; }
    setGenerating(true);
    setNotice(null);
    try {
      const allRosters = getAllRosters();
      const roomRosters = allRosters.filter(
        (r) => r.roomGroups.length > 0 && (!sessionId || r.sessionId === sessionId)
      );
      if (!roomRosters.length) {
        showNotice("error", "고사실이 배정된 세션이 없습니다. 고사실 배정을 먼저 완료하세요.");
        return;
      }
      roomRosters.forEach((roster, i) => {
        setTimeout(() => {
          const wb = generateSessionRoomRosterExcel(roster, schoolName);
          downloadExcel(wb, sessionFileName(roster));
        }, i * 300);
      });
      const totalSheets = roomRosters.reduce(
        (n, r) => n + r.roomGroups.length + (r.specialStudents.length > 0 ? 1 : 0) + (r.separateStudents.length > 0 ? 1 : 0),
        0
      );
      showNotice("success", `${roomRosters.length}개 세션, 총 ${totalSheets}개 시트를 다운로드합니다.`);
    } catch (err) {
      console.error(err);
      showNotice("error", "Excel 생성 중 오류: " + err.message);
    } finally {
      setGenerating(false);
      setFilterModal(null);
    }
  }

  function handleRoomPrint(sessionId = null) {
    if (!plan?.sessions?.length) { showNotice("error", "생성할 세션이 없습니다."); return; }
    setNotice(null);
    try {
      const allRosters = getAllRosters();
      const roomRosters = allRosters.filter(
        (r) => r.roomGroups.length > 0 && (!sessionId || r.sessionId === sessionId)
      );
      if (!roomRosters.length) {
        showNotice("error", "고사실이 배정된 세션이 없습니다.");
        return;
      }
      openPrintWindow(generateRoomRostersHTML(roomRosters));
      setFilterModal(null);
    } catch (err) {
      console.error(err);
      showNotice("error", "인쇄 페이지 생성 중 오류: " + err.message);
    }
  }

  // ── 과목별 응시자 명렬 ────────────────────────────────────────────────────────

  function handleSubjectExcel(dayFilter = null, periodFilter = null) {
    if (!plan?.sessions?.length) { showNotice("error", "생성할 세션이 없습니다."); return; }
    setGenerating(true);
    setNotice(null);
    try {
      const rosters = buildRosters(dayFilter, periodFilter);
      if (!rosters.length) { showNotice("error", "배치된 세션이 없습니다."); return; }
      const wb = generateSubjectRostersExcel(rosters, schoolName);
      const suffix = dayFilter || periodFilter ? "_선택" : "";
      downloadExcel(wb, `과목별_응시자명렬${suffix}_${today()}.xlsx`);
      showNotice("success", `${rosters.length}개 과목 명렬을 생성했습니다.`);
    } catch (err) {
      console.error(err);
      showNotice("error", "Excel 생성 중 오류: " + err.message);
    } finally {
      setGenerating(false);
      setFilterModal(null);
    }
  }

  function handleSubjectPrint(dayFilter = null, periodFilter = null) {
    if (!plan?.sessions?.length) { showNotice("error", "생성할 세션이 없습니다."); return; }
    setNotice(null);
    try {
      const rosters = buildRosters(dayFilter, periodFilter);
      if (!rosters.length) { showNotice("error", "배치된 세션이 없습니다."); return; }
      openPrintWindow(generateSubjectRostersHTML(rosters));
      setFilterModal(null);
    } catch (err) {
      console.error(err);
      showNotice("error", "인쇄 페이지 생성 중 오류: " + err.message);
    }
  }

  // ── 학급별 학생 고사 명렬표 ────────────────────────────────────────────────

  function buildClassRosters(gradeFilter = null) {
    const allRosters = getAllRosters();
    let classRosters = generateClassRosters(allRosters, students, plan);
    if (gradeFilter) {
      classRosters = classRosters.filter((c) => String(c.grade) === String(gradeFilter));
    }
    return classRosters;
  }

  function handleClassExcel(gradeFilter = null) {
    if (!students.length) { showNotice("error", "학생 데이터가 없습니다."); return; }
    setGenerating(true);
    setNotice(null);
    try {
      const classRosters = buildClassRosters(gradeFilter);
      if (!classRosters.length) { showNotice("error", "학급 데이터가 없습니다."); return; }
      const wb = generateClassRostersExcel(classRosters, schoolName);
      const suffix = gradeFilter ? `_${gradeFilter}학년` : "";
      downloadExcel(wb, `학급별_고사명렬${suffix}_${today()}.xlsx`);
      showNotice("success", `${classRosters.length}개 학급 명렬을 생성했습니다.`);
    } catch (err) {
      console.error(err);
      showNotice("error", "Excel 생성 중 오류: " + err.message);
    } finally {
      setGenerating(false);
      setFilterModal(null);
    }
  }

  function handleClassPrint(gradeFilter = null) {
    if (!students.length) { showNotice("error", "학생 데이터가 없습니다."); return; }
    setNotice(null);
    try {
      const classRosters = buildClassRosters(gradeFilter);
      if (!classRosters.length) { showNotice("error", "학급 데이터가 없습니다."); return; }
      openPrintWindow(generateClassRostersHTML(classRosters));
      setFilterModal(null);
    } catch (err) {
      console.error(err);
      showNotice("error", "인쇄 페이지 생성 중 오류: " + err.message);
    }
  }

  // ── 대기실 학생 명렬표 ────────────────────────────────────────────────────────

  function buildWaitingRosters(dayFilter = null, periodFilter = null) {
    // 전체 rosters 기반으로 생성해야 "이후 교시에 시험 있음" 판별이 정확함
    const allRosters = getAllRosters();
    const waitingPeriods = generateWaitingRosters(allRosters, students, plan);
    if (!dayFilter && !periodFilter) return waitingPeriods;
    return waitingPeriods.filter((p) => {
      const [pDay, pPeriod] = (p.periodKey || "").split("__");
      if (dayFilter && pDay !== dayFilter) return false;
      if (periodFilter && pPeriod !== periodFilter) return false;
      return true;
    });
  }

  function handleWaitingExcel(dayFilter = null, periodFilter = null) {
    if (!students.length) { showNotice("error", "학생 데이터가 없습니다."); return; }
    setGenerating(true);
    setNotice(null);
    try {
      const waitingRosters = buildWaitingRosters(dayFilter, periodFilter);
      if (!waitingRosters.length) { showNotice("error", "대기 학생 데이터가 없습니다."); return; }
      const wb = generateWaitingRostersExcel(waitingRosters, schoolName);
      const suffix = dayFilter || periodFilter ? "_선택" : "";
      downloadExcel(wb, `대기실_학생명렬${suffix}_${today()}.xlsx`);
      showNotice("success", `${waitingRosters.length}개 교시 대기실 명렬을 생성했습니다.`);
    } catch (err) {
      console.error(err);
      showNotice("error", "Excel 생성 중 오류: " + err.message);
    } finally {
      setGenerating(false);
      setFilterModal(null);
    }
  }

  function handleWaitingPrint(dayFilter = null, periodFilter = null) {
    if (!students.length) { showNotice("error", "학생 데이터가 없습니다."); return; }
    setNotice(null);
    try {
      const waitingRosters = buildWaitingRosters(dayFilter, periodFilter);
      if (!waitingRosters.length) { showNotice("error", "대기 학생 데이터가 없습니다."); return; }
      openPrintWindow(generateWaitingRostersHTML(waitingRosters));
      setFilterModal(null);
    } catch (err) {
      console.error(err);
      showNotice("error", "인쇄 페이지 생성 중 오류: " + err.message);
    }
  }

  // ── 학생 개인별 시간표 ────────────────────────────────────────────────────────

  function buildStudentTimetables(gradeFilter = null) {
    const allRosters = getAllRosters();
    let timetables = generateStudentTimetables(allRosters, students, plan);
    if (gradeFilter) timetables = timetables.filter((s) => String(s.grade) === String(gradeFilter));
    return timetables;
  }

  function handleStudentTimetableExcel(gradeFilter = null) {
    if (!students.length) { showNotice("error", "학생 데이터가 없습니다."); return; }
    setGenerating(true); setNotice(null);
    try {
      const timetables = buildStudentTimetables(gradeFilter);
      if (!timetables.length) { showNotice("error", "시간표 데이터가 없습니다."); return; }
      const wb = generateStudentTimetablesExcel(timetables, schoolName);
      const suffix = gradeFilter ? `_${gradeFilter}학년` : "";
      downloadExcel(wb, `학생_개인별_시간표${suffix}_${today()}.xlsx`);
      showNotice("success", `${timetables.length}명의 개인별 시간표를 생성했습니다.`);
    } catch (err) {
      console.error(err);
      showNotice("error", "Excel 생성 중 오류: " + err.message);
    } finally {
      setGenerating(false); setFilterModal(null);
    }
  }

  function handleStudentTimetablePrint(gradeFilter = null) {
    if (!students.length) { showNotice("error", "학생 데이터가 없습니다."); return; }
    setNotice(null);
    try {
      const timetables = buildStudentTimetables(gradeFilter);
      if (!timetables.length) { showNotice("error", "시간표 데이터가 없습니다."); return; }
      openPrintWindow(generateStudentTimetablesHTML(timetables, schoolName));
      setFilterModal(null);
    } catch (err) {
      console.error(err);
      showNotice("error", "인쇄 페이지 생성 중 오류: " + err.message);
    }
  }

  // ── 선택 생성 모달 확인 ────────────────────────────────────────────────────

  function handleFilteredGenerate() {
    const isPrint = selectedFormat === "print";
    if (filterModal === "room") {
      const sid = selectedSession || null;
      isPrint ? handleRoomPrint(sid) : handleRoomExcel(sid);
    } else if (filterModal === "subject") {
      isPrint ? handleSubjectPrint(selectedDay, selectedPeriod) : handleSubjectExcel(selectedDay, selectedPeriod);
    } else if (filterModal === "class") {
      const g = selectedGrade || null;
      isPrint ? handleClassPrint(g) : handleClassExcel(g);
    } else if (filterModal === "waiting") {
      isPrint ? handleWaitingPrint(selectedDay, selectedPeriod) : handleWaitingExcel(selectedDay, selectedPeriod);
    } else if (filterModal === "student") {
      const g = selectedGrade || null;
      isPrint ? handleStudentTimetablePrint(g) : handleStudentTimetableExcel(g);
    }
  }

  const canGenerate = totalSessions > 0 && !generating;
  const canBasic = students.length > 0 && !generating;

  // 모달용 세션 목록 (배치된 세션 + 고사실 배정 있는 것)
  const allRostersForModal = canGenerate
    ? generateSubjectRosters(plan, students, enrollments, rooms, subjects)
    : [];
  const roomSessions = allRostersForModal.filter((r) => r.roomGroups.length > 0);

  // 학년 목록
  const grades = [...new Set(students.map((s) => String(s.grade)))].sort();

  return (
    <div style={s.page}>
      {/* 페이지 헤더 */}
      <div style={s.pageHeader}>
        <div>
          <p style={s.eyebrow}>출력물 관리</p>
          <h2 style={s.pageTitle}>시험 출력물 생성</h2>
        </div>
      </div>

      {/* 알림 */}
      {notice && (
        <div style={{ ...s.notice, ...(notice.type === "success" ? s.noticeSuccess : notice.type === "error" ? s.noticeError : s.noticeInfo) }}>
          {notice.msg}
        </div>
      )}

      {/* 통계 */}
      <div style={s.statsGrid}>
        <div style={s.statCard}>
          <p style={s.statLabel}>배치된 세션 수</p>
          <p style={s.statValue}>{totalSessions}</p>
        </div>
        <div style={s.statCard}>
          <p style={s.statLabel}>고사실 수</p>
          <p style={s.statValue}>{totalRooms}</p>
        </div>
        <div style={s.statCard}>
          <p style={s.statLabel}>학생 수</p>
          <p style={s.statValue}>{students.length}</p>
        </div>
      </div>

      {/* 1. 고사실별 응시 현황표 */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>🏫 고사실별 응시 현황표</h3>
        <p style={s.sectionDesc}>
          각 고사실별 좌석 배정 학생 명단(좌석순), 도움실·별도실 학생 정보, 결시 체크란이 포함된 현황표입니다.
          세션별 개별 파일로 다운로드됩니다.
        </p>
        <div style={s.btnRow}>
          <button style={canGenerate ? s.primaryBtn : s.disabledBtn} onClick={() => handleRoomExcel()} disabled={!canGenerate}>
            {generating ? "생성 중..." : "📊 전체 생성 (Excel)"}
          </button>
          <button style={canGenerate ? s.outlineBtn : s.disabledBtn} onClick={() => handleRoomPrint()} disabled={!canGenerate}>
            🖨️ 전체 인쇄
          </button>
          <button
            style={canGenerate ? s.outlineBtn : s.disabledBtn}
            onClick={() => { setFilterModal("room"); setSelectedSession(""); setSelectedFormat("excel"); }}
            disabled={!canGenerate}
          >
            🔍 과목 선택
          </button>
        </div>
        <p style={s.hintText}>⚠️ 고사실 배정이 완료된 세션만 생성됩니다.</p>
      </div>

      {/* 2. 과목별 응시자 명렬 */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>📚 과목별 응시자 명렬</h3>
        <p style={s.sectionDesc}>
          과목별 응시 학생 전체 명단(반·번호순), 응시형태(도움실/별도실/위탁), 고사실·좌석 정보를 포함한 명렬입니다.
        </p>
        <div style={s.btnRow}>
          <button style={canGenerate ? s.primaryBtn : s.disabledBtn} onClick={() => handleSubjectExcel()} disabled={!canGenerate}>
            {generating ? "생성 중..." : "📊 전체 생성 (Excel)"}
          </button>
          <button style={canGenerate ? s.outlineBtn : s.disabledBtn} onClick={() => handleSubjectPrint()} disabled={!canGenerate}>
            🖨️ 전체 인쇄
          </button>
          <button
            style={canGenerate ? s.outlineBtn : s.disabledBtn}
            onClick={() => { setFilterModal("subject"); setSelectedDay(""); setSelectedPeriod(""); setSelectedFormat("excel"); }}
            disabled={!canGenerate}
          >
            🔍 선택 생성
          </button>
        </div>
      </div>

      {/* 3. 학급별 학생 고사 명렬표 */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>📋 학급별 학생 고사 명렬표</h3>
        <p style={s.sectionDesc}>
          학급별로 모든 학생의 시험 과목·고사실·좌석 정보를 한눈에 볼 수 있는 명렬표입니다.
          학급당 1개 시트로 생성됩니다.
        </p>
        <div style={s.btnRow}>
          <button style={canBasic ? s.primaryBtn : s.disabledBtn} onClick={() => handleClassExcel()} disabled={!canBasic}>
            {generating ? "생성 중..." : "📊 전체 생성 (Excel)"}
          </button>
          <button style={canBasic ? s.outlineBtn : s.disabledBtn} onClick={() => handleClassPrint()} disabled={!canBasic}>
            🖨️ 전체 인쇄
          </button>
          <button
            style={canBasic ? s.outlineBtn : s.disabledBtn}
            onClick={() => { setFilterModal("class"); setSelectedGrade(""); setSelectedFormat("excel"); }}
            disabled={!canBasic}
          >
            🔍 학년 선택
          </button>
        </div>
        <p style={s.hintText}>💡 세션이 많으면 Excel이 더 보기 편합니다. 인쇄는 가로 방향(A4 landscape) 권장.</p>
      </div>

      {/* 4. 대기실 학생 명렬표 */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>⏸️ 대기실 학생 명렬표</h3>
        <p style={s.sectionDesc}>
          각 교시별로 시험이 없어 대기하는 학생 명단을 학급별로 정리한 명렬표입니다.
          교시당 1개 시트로 생성됩니다.
        </p>
        <div style={s.btnRow}>
          <button style={canBasic ? s.primaryBtn : s.disabledBtn} onClick={() => handleWaitingExcel()} disabled={!canBasic}>
            {generating ? "생성 중..." : "📊 전체 생성 (Excel)"}
          </button>
          <button style={canBasic ? s.outlineBtn : s.disabledBtn} onClick={() => handleWaitingPrint()} disabled={!canBasic}>
            🖨️ 전체 인쇄
          </button>
          <button
            style={canBasic ? s.outlineBtn : s.disabledBtn}
            onClick={() => { setFilterModal("waiting"); setSelectedDay(""); setSelectedPeriod(""); setSelectedFormat("excel"); }}
            disabled={!canBasic}
          >
            🔍 교시 선택
          </button>
        </div>
        <p style={s.hintText}>💡 학생 데이터와 시험 일정이 모두 입력된 후 사용하세요.</p>
      </div>

      {/* 5. 학생 개인별 시간표 */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>👤 학생 개인별 시간표</h3>
        <p style={s.sectionDesc}>
          학생 개인별로 시험 일정·과목·고사실·좌석 정보를 담은 시간표를 생성합니다.
          인쇄 후 잘라서 배부하거나 Excel로 확인할 수 있습니다.
        </p>
        <div style={s.btnRow}>
          <button style={canBasic ? s.primaryBtn : s.disabledBtn} onClick={() => handleStudentTimetableExcel()} disabled={!canBasic}>
            {generating ? "생성 중..." : "📊 전체 생성 (Excel)"}
          </button>
          <button style={canBasic ? s.outlineBtn : s.disabledBtn} onClick={() => handleStudentTimetablePrint()} disabled={!canBasic}>
            🖨️ 전체 인쇄
          </button>
          <button
            style={canBasic ? s.outlineBtn : s.disabledBtn}
            onClick={() => { setFilterModal("student"); setSelectedGrade(""); setSelectedFormat("excel"); }}
            disabled={!canBasic}
          >
            🔍 학년 선택
          </button>
        </div>
        <p style={s.hintText}>💡 인쇄 시 A4 portrait 4매(2×2) 배치로 출력됩니다.</p>
      </div>

      {/* 선택 생성 모달 */}
      {filterModal && (
        <div style={s.backdrop} onClick={(e) => e.target === e.currentTarget && setFilterModal(null)}>
          <div style={s.modal}>
            <p style={s.modalTitle}>
              {filterModal === "room" && "고사실별 응시 현황표 — 과목 선택"}
              {filterModal === "subject" && "과목별 응시자 명렬 — 선택 생성"}
              {filterModal === "class" && "학급별 고사 명렬표 — 학년 선택"}
              {filterModal === "waiting" && "대기실 학생 명렬표 — 교시 선택"}
              {filterModal === "student" && "학생 개인별 시간표 — 학년 선택"}
            </p>

            {/* 출력 형식 공통 */}
            <div>
              <label style={s.label}>출력 형식</label>
              <select style={s.select} value={selectedFormat} onChange={(e) => setSelectedFormat(e.target.value)}>
                <option value="excel">Excel (.xlsx)</option>
                <option value="print">HTML 인쇄 (브라우저)</option>
              </select>
            </div>

            {/* 고사실별: 세션 선택 */}
            {filterModal === "room" && (
              <div>
                <label style={s.label}>과목 (세션)</label>
                <select style={s.select} value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)}>
                  <option value="">전체</option>
                  {roomSessions.map((r) => (
                    <option key={r.sessionId} value={r.sessionId}>
                      {r.grade}학년 {r.subjectName} — {r.dayLabel} {r.periodLabel}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 과목별 / 대기실: 날짜 + 교시 선택 */}
            {(filterModal === "subject" || filterModal === "waiting") && (
              <>
                <div>
                  <label style={s.label}>시험 날짜</label>
                  <select style={s.select} value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}>
                    <option value="">전체</option>
                    {plan?.days?.map((day) => (
                      <option key={day.id} value={day.id}>{day.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={s.label}>교시</label>
                  <select style={s.select} value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
                    <option value="">전체</option>
                    {plan?.periods?.map((period) => (
                      <option key={period.id} value={period.id}>{period.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* 학급별 / 학생 시간표: 학년 선택 */}
            {(filterModal === "class" || filterModal === "student") && (
              <div>
                <label style={s.label}>학년</label>
                <select style={s.select} value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}>
                  <option value="">전체</option>
                  {grades.map((g) => (
                    <option key={g} value={g}>{g}학년</option>
                  ))}
                </select>
              </div>
            )}

            <div style={s.modalActions}>
              <button style={s.outlineBtn} onClick={() => setFilterModal(null)}>취소</button>
              <button style={s.primaryBtn} onClick={handleFilteredGenerate} disabled={generating}>
                {generating ? "생성 중..." : selectedFormat === "excel" ? "Excel 생성" : "인쇄 페이지 열기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
