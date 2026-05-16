import { useState } from "react";
import { generateAllRoomRosters } from "../utils/roomRosterGenerator";
import { generateMultipleRoomRostersPDF } from "../utils/pdfGenerator";
import { generateRoomRostersExcel, downloadExcel } from "../utils/excelGenerator";

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
  sectionTitle: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#111827",
    marginBottom: "0.75rem",
  },
  sectionDesc: {
    fontSize: "0.875rem",
    color: "#6b7280",
    marginBottom: "1rem",
  },

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

  notice: {
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    fontSize: "0.875rem",
    marginBottom: "1rem",
  },
  noticeInfo: {
    backgroundColor: "#eff6ff",
    color: "#1e40af",
    border: "1px solid #bfdbfe",
  },
  noticeSuccess: {
    backgroundColor: "#f0fdf4",
    color: "#15803d",
    border: "1px solid #bbf7d0",
  },
  noticeError: {
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    border: "1px solid #fecaca",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "1rem",
    marginTop: "1rem",
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
    width: "min(480px, 90vw)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
  },
  modalTitle: {
    fontSize: "1.1rem",
    fontWeight: 800,
    color: "#111827",
    marginBottom: "1.25rem",
  },
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
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.5rem",
    marginTop: "1.25rem",
  },
};

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function PrintManagementPage({
  plan,
  tenantData,
  schoolName = "OO고등학교",
}) {
  const [notice, setNotice] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("excel"); // excel | pdf

  const { students = [], enrollments = [], rooms = [], subjects = [] } = tenantData || {};

  // 통계
  const totalSessions = plan?.sessions?.length || 0;
  const totalRooms = new Set(
    plan?.sessions?.flatMap((s) => s.roomIds || []) || []
  ).size;

  function handleGenerateRoomRosters(dayFilter = null, periodFilter = null) {
    if (!plan || !plan.sessions || plan.sessions.length === 0) {
      setNotice({ type: "error", msg: "생성할 세션이 없습니다. 시험계획을 먼저 작성하세요." });
      return;
    }

    setGenerating(true);
    setNotice(null);

    try {
      // 데이터 생성
      let rosters = generateAllRoomRosters(plan, students, enrollments, rooms, subjects);

      // 필터링
      if (dayFilter) {
        rosters = rosters.filter(r => r.sessionId &&
          plan.sessions.find(s => s.id === r.sessionId)?.dayId === dayFilter
        );
      }
      if (periodFilter) {
        rosters = rosters.filter(r => r.sessionId &&
          plan.sessions.find(s => s.id === r.sessionId)?.periodId === periodFilter
        );
      }

      if (rosters.length === 0) {
        setNotice({
          type: "error",
          msg: "생성할 고사실 현황표가 없습니다. 고사실 배정 및 필터를 확인하세요.",
        });
        setGenerating(false);
        return;
      }

      // PDF 생성
      const pdf = generateMultipleRoomRostersPDF(rosters, schoolName);
      if (!pdf) {
        setNotice({ type: "error", msg: "PDF 생성 실패" });
        setGenerating(false);
        return;
      }

      // 다운로드
      const filterSuffix = dayFilter || periodFilter ? "_선택" : "";
      const fileName = `고사실별_응시현황표${filterSuffix}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);

      setNotice({
        type: "success",
        msg: `${rosters.length}개 고사실 현황표를 생성했습니다.`,
      });
    } catch (err) {
      console.error(err);
      setNotice({ type: "error", msg: "PDF 생성 중 오류: " + err.message });
    } finally {
      setGenerating(false);
      setFilterModalOpen(false);
    }
  }

  function handleFilteredGenerate() {
    if (selectedFormat === "excel") {
      handleGenerateRoomRostersExcel(selectedDay, selectedPeriod);
    } else {
      handleGenerateRoomRosters(selectedDay, selectedPeriod);
    }
  }

  function handleGenerateRoomRostersExcel(dayFilter = null, periodFilter = null) {
    if (!plan || !plan.sessions || plan.sessions.length === 0) {
      setNotice({ type: "error", msg: "생성할 세션이 없습니다. 시험계획을 먼저 작성하세요." });
      return;
    }

    setGenerating(true);
    setNotice(null);

    try {
      // 데이터 생성
      let rosters = generateAllRoomRosters(plan, students, enrollments, rooms, subjects);

      // 필터링
      if (dayFilter) {
        rosters = rosters.filter(r => r.sessionId &&
          plan.sessions.find(s => s.id === r.sessionId)?.dayId === dayFilter
        );
      }
      if (periodFilter) {
        rosters = rosters.filter(r => r.sessionId &&
          plan.sessions.find(s => s.id === r.sessionId)?.periodId === periodFilter
        );
      }

      if (rosters.length === 0) {
        setNotice({
          type: "error",
          msg: "생성할 고사실 현황표가 없습니다. 고사실 배정 및 필터를 확인하세요.",
        });
        setGenerating(false);
        return;
      }

      // Excel 생성
      const wb = generateRoomRostersExcel(rosters, schoolName);
      if (!wb) {
        setNotice({ type: "error", msg: "Excel 생성 실패" });
        setGenerating(false);
        return;
      }

      // 다운로드
      const filterSuffix = dayFilter || periodFilter ? "_선택" : "";
      const fileName = `고사실별_응시현황표${filterSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      downloadExcel(wb, fileName);

      setNotice({
        type: "success",
        msg: `${rosters.length}개 고사실 현황표(Excel)를 생성했습니다.`,
      });
    } catch (err) {
      console.error(err);
      setNotice({ type: "error", msg: "Excel 생성 중 오류: " + err.message });
    } finally {
      setGenerating(false);
      setFilterModalOpen(false);
    }
  }

  function handleFilteredGenerateExcel() {
    handleGenerateRoomRostersExcel(selectedDay, selectedPeriod);
  }

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
        <div
          style={{
            ...s.notice,
            ...(notice.type === "success"
              ? s.noticeSuccess
              : notice.type === "error"
              ? s.noticeError
              : s.noticeInfo),
          }}
        >
          {notice.msg}
        </div>
      )}

      {/* 통계 */}
      <div style={s.statsGrid}>
        <div style={s.statCard}>
          <p style={s.statLabel}>총 세션 수</p>
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
        <h3 style={s.sectionTitle}>📄 고사실별 응시 현황표</h3>
        <p style={s.sectionDesc}>
          각 고사실별로 응시 학생 명단, 좌석 배치, 특수학급/별도실 학생 정보가 포함된
          현황표를 생성합니다.
        </p>
        <div style={s.btnRow}>
          <button
            style={totalSessions > 0 ? s.primaryBtn : s.disabledBtn}
            onClick={() => handleGenerateRoomRostersExcel()}
            disabled={totalSessions === 0 || generating}
          >
            {generating ? "생성 중..." : "📊 전체 생성 (Excel)"}
          </button>
          <button
            style={totalSessions > 0 ? s.outlineBtn : s.disabledBtn}
            onClick={() => handleGenerateRoomRosters()}
            disabled={totalSessions === 0 || generating}
          >
            📄 전체 생성 (PDF)
          </button>
          <button
            style={totalSessions > 0 ? s.outlineBtn : s.disabledBtn}
            onClick={() => setFilterModalOpen(true)}
            disabled={totalSessions === 0 || generating}
          >
            🔍 선택 생성
          </button>
        </div>
        <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.5rem" }}>
          💡 Excel: 편집 가능, 한글 완벽 지원 (추천) | PDF: 읽기 전용, 한글 폰트 제한
        </p>
      </div>

      {/* 2. 학급별 학생 고사 명렬 */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>📋 학급별 학생 고사 명렬</h3>
        <p style={s.sectionDesc}>
          학급별로 학생들의 시험 과목(지정/선택), 고사실 정보가 포함된 명렬표를
          생성합니다.
        </p>
        <div style={s.btnRow}>
          <button style={s.disabledBtn} disabled>
            전체 학급 (Excel)
          </button>
          <button style={s.disabledBtn} disabled>
            선택 학급
          </button>
        </div>
        <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: "0.5rem" }}>
          🚧 개발 예정
        </p>
      </div>

      {/* 3. 대기실 학생 명렬표 */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>⏸️ 대기실 학생 명렬표</h3>
        <p style={s.sectionDesc}>
          각 교시별로 시험이 없는 대기 학생 명단을 생성합니다.
        </p>
        <div style={s.btnRow}>
          <button style={s.disabledBtn} disabled>
            날짜별 생성 (PDF)
          </button>
        </div>
        <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: "0.5rem" }}>
          🚧 개발 예정
        </p>
      </div>

      {/* 5. 학생 개인별 시간표 */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>👤 학생 개인별 시간표</h3>
        <p style={s.sectionDesc}>
          학생 개개인의 시험 일정, 과목, 고사실이 포함된 개인 시간표를 생성합니다.
        </p>
        <div style={s.btnRow}>
          <button style={s.disabledBtn} disabled>
            전체 학생 (ZIP)
          </button>
          <button style={s.disabledBtn} disabled>
            학년별 생성
          </button>
          <button style={s.disabledBtn} disabled>
            학급별 생성
          </button>
        </div>
        <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: "0.5rem" }}>
          🚧 개발 예정
        </p>
      </div>

      {/* 4. 시험 운영 계획 보고서 */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>📊 시험 운영 계획 보고서</h3>
        <p style={s.sectionDesc}>
          과목별 운영 정보, 일정표, 특이사항이 포함된 종합 보고서를 생성합니다.
        </p>
        <div style={s.btnRow}>
          <button style={s.disabledBtn} disabled>
            PDF 다운로드
          </button>
          <button style={s.disabledBtn} disabled>
            Word 다운로드
          </button>
        </div>
        <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: "0.5rem" }}>
          🚧 개발 예정 (위 출력물 완성 후 통합)
        </p>
      </div>

      {/* 필터 모달 */}
      {filterModalOpen && (
        <div style={s.backdrop} onClick={(e) => e.target === e.currentTarget && setFilterModalOpen(false)}>
          <div style={s.modal}>
            <p style={s.modalTitle}>선택 생성 (날짜/교시 필터)</p>

            <div>
              <label style={s.label}>출력 형식</label>
              <select
                style={s.select}
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
              >
                <option value="excel">Excel (.xlsx) - 추천</option>
                <option value="pdf">PDF (.pdf) - 한글 폰트 제한</option>
              </select>
            </div>

            <div>
              <label style={s.label}>시험 날짜</label>
              <select
                style={s.select}
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
              >
                <option value="">전체</option>
                {plan?.days?.map((day) => (
                  <option key={day.id} value={day.id}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={s.label}>교시</label>
              <select
                style={s.select}
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="">전체</option>
                {plan?.periods?.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={s.modalActions}>
              <button style={s.outlineBtn} onClick={() => setFilterModalOpen(false)}>
                취소
              </button>
              <button style={s.primaryBtn} onClick={handleFilteredGenerate} disabled={generating}>
                {generating ? "생성 중..." : `생성 (${selectedFormat === "excel" ? "Excel" : "PDF"})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
