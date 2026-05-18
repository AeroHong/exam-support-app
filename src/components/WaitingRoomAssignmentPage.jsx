import { useMemo, useState } from "react";
import { generateWaitingRosters } from "../utils/classRosterGenerator";
import { generateSubjectRosters } from "../utils/subjectRosterGenerator";

const s = {
  page:              { padding: "1.5rem", maxWidth: "1100px", margin: "0 auto" },
  header:            { marginBottom: "1.25rem" },
  title:             { fontSize: "1.2rem", fontWeight: 700, color: "#111827", margin: "0 0 0.2rem" },
  subtitle:          { fontSize: "0.85rem", color: "#6b7280", margin: 0 },
  filterRow:         { display: "flex", gap: "0.5rem", marginBottom: "1.25rem" },
  filterBtn:         { padding: "0.35rem 0.9rem", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem", backgroundColor: "#fff", color: "#374151" },
  filterBtnActive:   { padding: "0.35rem 0.9rem", border: "1px solid #4f46e5", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem", backgroundColor: "#eef2ff", color: "#4f46e5", fontWeight: 600 },
  card:              { backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", marginBottom: "1.25rem", overflow: "hidden" },
  cardConfirmed:     { backgroundColor: "#fff", border: "2px solid #4f46e5", borderRadius: "10px", marginBottom: "1.25rem", overflow: "hidden" },
  cardHeader:        { padding: "0.85rem 1.25rem", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" },
  cardTitle:         { fontWeight: 700, fontSize: "0.95rem", color: "#111827" },
  timeLabel:         { fontSize: "0.82rem", color: "#6b7280" },
  badge:             { display: "inline-flex", alignItems: "center", padding: "0.15rem 0.55rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 600 },
  badgeGray:         { backgroundColor: "#f3f4f6", color: "#374151" },
  badgeGreen:        { backgroundColor: "#d1fae5", color: "#065f46" },
  headerActions:     { marginLeft: "auto", display: "flex", gap: "0.5rem" },
  cardBody:          { padding: "1.25rem", display: "grid", gridTemplateColumns: "1fr 280px", gap: "1.25rem" },
  table:             { width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" },
  th:                { padding: "0.45rem 0.7rem", backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb", textAlign: "left", fontWeight: 600, color: "#4b5563", fontSize: "0.8rem" },
  td:                { padding: "0.45rem 0.7rem", borderBottom: "1px solid #f9fafb", color: "#111827", verticalAlign: "middle" },
  select:            { padding: "0.25rem 0.4rem", border: "1px solid #d1d5db", borderRadius: "5px", fontSize: "0.8rem", cursor: "pointer", backgroundColor: "#fff" },
  selectDisabled:    { padding: "0.25rem 0.4rem", border: "1px solid #e5e7eb", borderRadius: "5px", fontSize: "0.8rem", backgroundColor: "#f9fafb", color: "#9ca3af" },
  primaryBtn:        { padding: "0.35rem 0.85rem", backgroundColor: "#4f46e5", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 },
  secondaryBtn:      { padding: "0.35rem 0.85rem", backgroundColor: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem" },
  confirmedBtn:      { padding: "0.35rem 0.85rem", backgroundColor: "#059669", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 },
  sidebar:           { display: "flex", flexDirection: "column", gap: "0.75rem" },
  sideCard:          { backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "0.75rem 1rem" },
  sideTitle:         { fontSize: "0.78rem", fontWeight: 700, color: "#6b7280", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.04em" },
  roomRow:           { display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.3rem 0", fontSize: "0.82rem" },
  barWrap:           { flex: 1, height: "5px", backgroundColor: "#e5e7eb", borderRadius: "3px", overflow: "hidden" },
  emptyState:        { textAlign: "center", padding: "4rem 2rem", color: "#9ca3af" },
  emptyTitle:        { fontSize: "1rem", fontWeight: 600, color: "#6b7280", marginBottom: "0.5rem" },
  emptyText:         { fontSize: "0.875rem" },
};

export default function WaitingRoomAssignmentPage({
  plan,
  students,
  enrollments,
  rooms,
  subjects,
  examPlanReady,
  scheduleConfirmed,
  onUpdateWaitingAssignments,
  waitingConfirmed,
  onConfirmWaiting,
  onDeconfirmWaiting,
}) {
  const [gradeFilter, setGradeFilter] = useState("all");

  const waitingRooms = useMemo(
    () => rooms.filter((r) => r.roomType === "waiting"),
    [rooms],
  );

  const subjectRosters = useMemo(
    () => generateSubjectRosters(plan, students, enrollments, rooms, subjects ?? []),
    [plan, students, enrollments, rooms, subjects],
  );

  const waitingPeriods = useMemo(
    () => generateWaitingRosters(subjectRosters, students, plan),
    [subjectRosters, students, plan],
  );

  const waitingAssignments = plan.waitingAssignments ?? {};

  // periodKey, grade, classNo → 배정된 roomId (없으면 "")
  function getAssignedRoom(periodKey, grade, classNo) {
    const ck = `${grade}-${classNo}`;
    const periodAssign = waitingAssignments[periodKey] ?? {};
    return Object.entries(periodAssign).find(([, keys]) => keys.includes(ck))?.[0] ?? "";
  }

  // 학급을 다른 대기실로 이동
  function handleAssignClass(periodKey, grade, classNo, roomId) {
    const ck = `${grade}-${classNo}`;
    const prev = { ...(waitingAssignments[periodKey] ?? {}) };
    // 기존 방에서 제거
    Object.keys(prev).forEach((rid) => {
      prev[rid] = (prev[rid] ?? []).filter((k) => k !== ck);
    });
    // 새 방에 추가
    if (roomId) {
      prev[roomId] = [...(prev[roomId] ?? []), ck];
    }
    onUpdateWaitingAssignments(periodKey, prev);
  }

  // 자동 배정: 학급 인원 기준 대기실 순차 채우기
  function handleAutoAssign(periodKey, classes) {
    if (!waitingRooms.length) return;
    const roomState = waitingRooms
      .sort((a, b) => b.capacity - a.capacity)
      .map((r) => ({ id: r.id, cap: r.capacity || 40, used: 0 }));

    // 인원 많은 학급부터 배정
    const sorted = [...classes].sort((a, b) => b.students.length - a.students.length);
    const result = {};

    for (const cls of sorted) {
      // 여유 있는 첫 번째 방, 없으면 가장 덜 찬 방
      let target = roomState.reduce((best, r) => (r.used < best.used ? r : best), roomState[0]);
      for (const r of roomState) {
        if (r.used + cls.students.length <= r.cap) { target = r; break; }
      }
      if (!result[target.id]) result[target.id] = [];
      result[target.id].push(`${cls.grade}-${cls.classNo}`);
      target.used += cls.students.length;
    }

    onUpdateWaitingAssignments(periodKey, result);
  }

  // 학년 필터 적용
  const filteredPeriods = useMemo(() => {
    if (gradeFilter === "all") return waitingPeriods;
    return waitingPeriods
      .map((p) => ({ ...p, classes: p.classes.filter((c) => String(c.grade) === gradeFilter) }))
      .filter((p) => p.classes.length > 0);
  }, [waitingPeriods, gradeFilter]);

  // 빈 상태 처리
  // 이전 단계 미확정 학년 경고
  const scheduleNotReady = ["1", "2", "3"].filter(
    (g) => (examPlanReady?.[g] || plan.sessions.some((s) => String(s.grade) === g))
        && !scheduleConfirmed?.[g],
  );

  if (!plan.sessions?.some((s) => s.dayId && s.periodId)) {
    return (
      <div style={s.page}>
        <div style={s.emptyState}>
          <p style={s.emptyTitle}>배치된 시험 일정이 없습니다</p>
          <p style={s.emptyText}>먼저 '일정 배치' 탭에서 세션을 날짜·교시에 배치해주세요.</p>
        </div>
      </div>
    );
  }

  if (!waitingRooms.length) {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <h2 style={s.title}>대기실 배정</h2>
        </div>
        <div style={s.emptyState}>
          <p style={s.emptyTitle}>등록된 대기실이 없습니다</p>
          <p style={s.emptyText}>'기초 데이터' 탭 → 고사실 관리에서 대기실을 추가해주세요.</p>
        </div>
      </div>
    );
  }

  if (!waitingPeriods.length) {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <h2 style={s.title}>대기실 배정</h2>
          <p style={s.subtitle}>교시별 시험 미응시 학생을 대기실에 배정합니다.</p>
        </div>
        <div style={s.emptyState}>
          <p style={s.emptyTitle}>대기 학생이 없습니다</p>
          <p style={s.emptyText}>모든 학생이 모든 교시에 시험을 응시합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <>
    {scheduleNotReady.length > 0 && (
      <div style={{ padding: "0.55rem 1.5rem", backgroundColor: "#fff7ed", color: "#b45309", borderBottom: "1px solid #fed7aa", fontSize: "0.82rem", fontWeight: 600 }}>
        ⚠ {scheduleNotReady.join(", ")}학년 일정 배치 확정이 필요합니다. 일정 배치 탭에서 확정 후 진행하세요.
      </div>
    )}
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>대기실 배정</h2>
        <p style={s.subtitle}>교시별 시험 미응시 학생을 대기실에 배정합니다.</p>
      </div>

      {/* 학년 필터 */}
      <div style={s.filterRow}>
        {["all", "1", "2", "3"].map((g) => (
          <button
            key={g}
            style={gradeFilter === g ? s.filterBtnActive : s.filterBtn}
            onClick={() => setGradeFilter(g)}
          >
            {g === "all" ? "전체" : `${g}학년`}
          </button>
        ))}
      </div>

      {filteredPeriods.map((period) => {
        const confirmed = waitingConfirmed?.[period.periodKey] ?? false;
        const totalWaiting = period.classes.reduce((acc, c) => acc + c.students.length, 0);

        // 대기실별 배정 인원 집계
        const roomUsage = {};
        period.classes.forEach((cls) => {
          const rid = getAssignedRoom(period.periodKey, cls.grade, cls.classNo);
          if (rid) roomUsage[rid] = (roomUsage[rid] ?? 0) + cls.students.length;
        });

        const unassignedCount = period.classes
          .filter((c) => !getAssignedRoom(period.periodKey, c.grade, c.classNo))
          .reduce((acc, c) => acc + c.students.length, 0);

        return (
          <div key={period.periodKey} style={confirmed ? s.cardConfirmed : s.card}>
            {/* 카드 헤더 */}
            <div style={s.cardHeader}>
              <span style={s.cardTitle}>{period.dayLabel} {period.periodLabel}</span>
              {period.startTime && (
                <span style={s.timeLabel}>
                  {period.startTime}{period.endTime ? ` ~ ${period.endTime}` : ""}
                </span>
              )}
              <span style={{ ...s.badge, ...s.badgeGray }}>대기 {totalWaiting}명</span>
              {unassignedCount > 0 && (
                <span style={{ ...s.badge, backgroundColor: "#fff7ed", color: "#b45309" }}>
                  미배정 {unassignedCount}명
                </span>
              )}
              {confirmed && (
                <span style={{ ...s.badge, ...s.badgeGreen }}>확정</span>
              )}
              <div style={s.headerActions}>
                <button
                  style={s.secondaryBtn}
                  disabled={confirmed}
                  onClick={() => handleAutoAssign(period.periodKey, period.classes)}
                >
                  자동 배정
                </button>
                {confirmed ? (
                  <button
                    style={s.confirmedBtn}
                    onClick={() => onDeconfirmWaiting(period.periodKey)}
                  >
                    ✓ 확정됨 (해제)
                  </button>
                ) : (
                  <button
                    style={s.primaryBtn}
                    onClick={() => onConfirmWaiting(period.periodKey)}
                  >
                    확정
                  </button>
                )}
              </div>
            </div>

            {/* 카드 본문: 학급 목록 + 대기실 현황 */}
            <div style={s.cardBody}>
              {/* 왼쪽: 학급별 배정 테이블 */}
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>학급</th>
                    <th style={{ ...s.th, textAlign: "right" }}>대기 인원</th>
                    <th style={s.th}>배정 대기실</th>
                  </tr>
                </thead>
                <tbody>
                  {period.classes.map((cls) => {
                    const assigned = getAssignedRoom(period.periodKey, cls.grade, cls.classNo);
                    return (
                      <tr key={`${cls.grade}-${cls.classNo}`}>
                        <td style={s.td}>{cls.grade}학년 {cls.classNo}반</td>
                        <td style={{ ...s.td, textAlign: "right", fontWeight: 600 }}>
                          {cls.students.length}명
                        </td>
                        <td style={s.td}>
                          <select
                            style={confirmed ? s.selectDisabled : s.select}
                            value={assigned}
                            disabled={confirmed}
                            onChange={(e) =>
                              handleAssignClass(period.periodKey, cls.grade, cls.classNo, e.target.value)
                            }
                          >
                            <option value="">-- 미배정 --</option>
                            {waitingRooms.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name} (정원 {r.capacity})
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* 오른쪽: 대기실 현황 */}
              <div style={s.sidebar}>
                <div style={s.sideCard}>
                  <div style={s.sideTitle}>대기실 현황</div>
                  {waitingRooms.map((room) => {
                    const used = roomUsage[room.id] ?? 0;
                    const cap = room.capacity || 0;
                    const over = cap > 0 && used > cap;
                    const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
                    return (
                      <div key={room.id} style={s.roomRow}>
                        <span style={{ minWidth: "5rem", fontWeight: 600, fontSize: "0.82rem" }}>
                          {room.name}
                        </span>
                        <span style={{ color: over ? "#dc2626" : used > 0 ? "#059669" : "#9ca3af", fontWeight: 600, fontSize: "0.82rem", minWidth: "3.5rem" }}>
                          {used}/{cap}명
                        </span>
                        <div style={s.barWrap}>
                          <div
                            style={{
                              width: `${pct}%`,
                              height: "100%",
                              backgroundColor: over ? "#dc2626" : "#4f46e5",
                              borderRadius: "3px",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 미배정 학생 요약 */}
                {unassignedCount > 0 && (
                  <div style={{ ...s.sideCard, borderColor: "#fed7aa", backgroundColor: "#fff7ed" }}>
                    <div style={{ ...s.sideTitle, color: "#b45309" }}>미배정</div>
                    {period.classes
                      .filter((c) => !getAssignedRoom(period.periodKey, c.grade, c.classNo))
                      .map((c) => (
                        <div key={`${c.grade}-${c.classNo}`} style={{ ...s.roomRow, color: "#92400e" }}>
                          {c.grade}학년 {c.classNo}반 — {c.students.length}명
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
    </>
  );
}
