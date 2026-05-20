import { useMemo, useState } from "react";
import { autoAssignAllRooms, autoAssignSectionRooms, findRoomConflicts, getSectionCounts } from "../utils/roomAssigner";

// ─── 스타일 ──────────────────────────────────────────────────────────────────

const s = {
  page:         { padding: "1.5rem", maxWidth: "1100px" },
  pageHeader:   { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.25rem" },
  eyebrow:      { fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" },
  pageTitle:    { fontSize: "1.5rem", fontWeight: 800, color: "#111827", margin: 0 },
  btnRow:       { display: "flex", gap: "0.5rem", alignItems: "center" },
  primaryBtn:   { padding: "0.45rem 1rem", backgroundColor: "#4f46e5", color: "#fff", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 },
  outlineBtn:   { padding: "0.45rem 1rem", backgroundColor: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: "7px", cursor: "pointer", fontSize: "0.85rem" },
  dangerBtn:    { padding: "0.3rem 0.7rem", backgroundColor: "#fff", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem" },
  smBtn:        { padding: "0.25rem 0.6rem", backgroundColor: "#fff", color: "#4f46e5", border: "1px solid #c7d2fe", borderRadius: "5px", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 },

  filterRow:    { display: "flex", gap: "0.4rem", marginBottom: "1rem", alignItems: "center" },
  tab:          { padding: "0.3rem 0.75rem", border: "1px solid #e5e7eb", borderRadius: "999px", cursor: "pointer", fontSize: "0.82rem", backgroundColor: "#fff", color: "#6b7280" },
  tabActive:    { padding: "0.3rem 0.75rem", border: "1px solid #4f46e5", borderRadius: "999px", cursor: "pointer", fontSize: "0.82rem", backgroundColor: "#eef2ff", color: "#4f46e5", fontWeight: 700 },
  badge:        { display: "inline-block", fontSize: "0.7rem", fontWeight: 600, backgroundColor: "#e5e7eb", color: "#374151", borderRadius: "999px", padding: "0.05rem 0.4rem", marginLeft: "0.3rem" },
  badgeActive:  { display: "inline-block", fontSize: "0.7rem", fontWeight: 600, backgroundColor: "#c7d2fe", color: "#3730a3", borderRadius: "999px", padding: "0.05rem 0.4rem", marginLeft: "0.3rem" },

  notice:       { padding: "0.6rem 1rem", borderRadius: "7px", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.75rem" },
  noticeOk:     { backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" },
  noticeErr:    { backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
  noticeWarn:   { backgroundColor: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" },

  // 과목 카드 그리드
  cardGrid:     { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "0.85rem" },
  card:         { border: "1px solid #e5e7eb", borderRadius: "10px", padding: "0.9rem 1rem", backgroundColor: "#fff" },
  cardConflict: { border: "1px solid #fca5a5", borderRadius: "10px", padding: "0.9rem 1rem", backgroundColor: "#fff" },
  cardHeader:   { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.6rem" },
  subjectName:  { fontSize: "0.92rem", fontWeight: 700, color: "#111827", margin: 0 },
  subjectMeta:  { fontSize: "0.75rem", color: "#6b7280", marginTop: "0.15rem" },

  // 배지
  badgeRequired:  { fontSize: "0.68rem", fontWeight: 700, backgroundColor: "#dbeafe", color: "#1d4ed8", borderRadius: "999px", padding: "0.1rem 0.45rem" },
  badgeElective:  { fontSize: "0.68rem", fontWeight: 700, backgroundColor: "#f3e8ff", color: "#7e22ce", borderRadius: "999px", padding: "0.1rem 0.45rem" },
  badgeEssay:     { fontSize: "0.68rem", fontWeight: 700, backgroundColor: "#fef9c3", color: "#713f12", borderRadius: "999px", padding: "0.1rem 0.45rem" },

  // 용량 바
  barWrap:      { height: "6px", backgroundColor: "#f3f4f6", borderRadius: "999px", marginBottom: "0.5rem", overflow: "hidden" },
  barFill:      (pct, over, softShort) => ({
    height: "100%",
    width: `${Math.min(pct, 100)}%`,
    backgroundColor: over ? "#dc2626" : softShort ? "#f59e0b" : pct >= 100 ? "#15803d" : "#4f46e5",
    borderRadius: "999px",
    transition: "width 0.3s",
  }),
  barLabel:     { fontSize: "0.73rem", color: "#6b7280", marginBottom: "0.6rem" },

  // 배정된 방 chips
  chipRow:      { display: "flex", gap: "0.3rem", flexWrap: "wrap", marginBottom: "0.5rem", minHeight: "24px" },
  chip:         { display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", fontWeight: 600, backgroundColor: "#eef2ff", color: "#4338ca", borderRadius: "6px", padding: "0.15rem 0.5rem", border: "1px solid #c7d2fe" },
  chipConflict: { display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", fontWeight: 600, backgroundColor: "#fef2f2", color: "#dc2626", borderRadius: "6px", padding: "0.15rem 0.5rem", border: "1px solid #fecaca" },
  chipX:        { cursor: "pointer", fontSize: "0.7rem", color: "#6b7280", lineHeight: 1 },
  noRoom:       { fontSize: "0.78rem", color: "#9ca3af", fontStyle: "italic" },

  cardFooter:   { display: "flex", gap: "0.4rem", alignItems: "center", marginTop: "0.4rem" },
  conflictMsg:  { fontSize: "0.73rem", color: "#dc2626", fontWeight: 600, marginTop: "0.3rem" },

  emptyBox:     { textAlign: "center", padding: "3rem", color: "#9ca3af", fontSize: "0.9rem" },

  mainGrid:     { display: "grid", gridTemplateColumns: "1fr 240px", gap: "1.5rem", alignItems: "start" },
  statusPanel:  { border: "1px solid #e5e7eb", borderRadius: "10px", backgroundColor: "#fff", position: "sticky", top: "1.5rem", overflow: "hidden" },
  statusPanelHdr: { padding: "0.6rem 1rem", borderBottom: "1px solid #e5e7eb", backgroundColor: "#f9fafb" },
  statusPanelTitle: { fontSize: "0.72rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 },
  statusGradeCard: { padding: "0.75rem 1rem", borderBottom: "1px solid #f3f4f6" },
  statusGradeLabel: { fontSize: "0.875rem", fontWeight: 700, color: "#111827" },
  statusDetail: { fontSize: "0.75rem", color: "#6b7280", margin: "0.2rem 0 0", lineHeight: 1.55 },
  statusFooter: { padding: "0.65rem 1rem" },
  sBadgeOk:     { fontSize: "0.7rem", fontWeight: 700, backgroundColor: "#dcfce7", color: "#15803d", borderRadius: "999px", padding: "0.12rem 0.5rem" },
  sBadgeWarn:   { fontSize: "0.7rem", fontWeight: 700, backgroundColor: "#fef3c7", color: "#b45309", borderRadius: "999px", padding: "0.12rem 0.5rem" },
  sBadgeInfo:   { fontSize: "0.7rem", fontWeight: 700, backgroundColor: "#dbeafe", color: "#1d4ed8", borderRadius: "999px", padding: "0.12rem 0.5rem" },
  sBadgeGray:   { fontSize: "0.7rem", fontWeight: 700, backgroundColor: "#f3f4f6", color: "#6b7280", borderRadius: "999px", padding: "0.12rem 0.5rem" },
  confirmBtn:   { width: "100%", padding: "0.4rem 0", backgroundColor: "#4f46e5", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, marginTop: "0.5rem" },
  deconfirmBtn: { width: "100%", padding: "0.4rem 0", backgroundColor: "#fff", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", marginTop: "0.5rem" },

  // 방 선택 드롭다운 패널
  roomPicker:   { marginTop: "0.5rem", border: "1px solid #e5e7eb", borderRadius: "7px", padding: "0.5rem 0.65rem", backgroundColor: "#fafafa", maxHeight: "160px", overflowY: "auto" },
  roomOption:   { display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.2rem 0", fontSize: "0.8rem", cursor: "pointer" },

  // 분반 배정 모드
  modeToggle:   { display: "inline-flex", borderRadius: "6px", border: "1px solid #e5e7eb", overflow: "hidden", marginBottom: "0.6rem" },
  modeBtn:      { padding: "0.2rem 0.65rem", fontSize: "0.74rem", fontWeight: 500, border: "none", cursor: "pointer", backgroundColor: "#fff", color: "#6b7280" },
  modeBtnActive:{ padding: "0.2rem 0.65rem", fontSize: "0.74rem", fontWeight: 700, border: "none", cursor: "pointer", backgroundColor: "#4f46e5", color: "#fff" },

  sectionRow:   { display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0", borderBottom: "1px solid #f3f4f6" },
  secBadge:     { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#eef2ff", color: "#4338ca", fontSize: "0.72rem", fontWeight: 800, flexShrink: 0 },
  secCount:     { fontSize: "0.75rem", color: "#6b7280", flexShrink: 0, minWidth: "2.5rem" },
};

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function RoomAssignmentPage({
  sessions, rooms, students, enrollments,
  examPlanReady, scheduleConfirmed,
  onUpdateRoomIds, onUpdateAllRoomIds, onUpdateSession,
  roomConfirmed, onConfirmRoom, onDeconfirmRoom,
}) {
  const [gradeFilter, setGradeFilter] = useState("1");
  const [notice, setNotice]     = useState(null);
  const [assigning, setAssigning] = useState(false);
  // openPicker: { sessionId, section: null | string } | null
  // section=null → Mode 1 roomIds, section="A" → Mode 2 sectionRoomAssignments["A"]
  const [openPicker, setOpenPicker] = useState(null);

  function flash(msg, type = "ok") {
    setNotice({ msg, type });
    setTimeout(() => setNotice(null), 3500);
  }

  // 분반 데이터가 있는 세션 집합 (elective 과목에 section 있을 때)
  const sessionsWithSections = useMemo(() => {
    const result = new Set();
    for (const e of enrollments) {
      if (!e.section) continue;
      for (const sess of sessions) {
        if (String(sess.grade) !== String(e.grade)) continue;
        const matches = sess.subjectId && e.subjectId
          ? sess.subjectId === e.subjectId
          : sess.subjectName === e.subjectName;
        if (matches) result.add(sess.id);
      }
    }
    return result;
  }, [sessions, enrollments]);

  // 고사실 충돌 계산
  const conflicts = useMemo(() => findRoomConflicts(sessions), [sessions]);
  const conflictRoomsBySession = useMemo(() => {
    const map = {};
    conflicts.forEach(({ roomId, sessionIds }) => {
      sessionIds.forEach((sid) => {
        if (!map[sid]) map[sid] = new Set();
        map[sid].add(roomId);
      });
    });
    return map;
  }, [conflicts]);

  // 학년별 세션
  const gradeSessions = useMemo(
    () => sessions.filter((s) => String(s.grade) === gradeFilter),
    [sessions, gradeFilter],
  );

  const roomById = useMemo(
    () => Object.fromEntries(rooms.map((r) => [r.id, r])),
    [rooms],
  );

  // 소수 정원 초과 허용 임계값 — 이 이하면 "정원 초과 운영"으로 표시
  // (subjectRosterGenerator가 마지막 방 오버플로를 자동 처리하므로 출력물은 정상)
  const SOFT_OVERFLOW_MAX = 5;

  // 배정된 방 총 용량 계산 (Mode 1: roomIds, Mode 2: sectionRoomAssignments 합산)
  function assignedCapacity(session) {
    if (session.sectionMode === "section" && session.sectionRoomAssignments) {
      const allRoomIds = [...new Set(Object.values(session.sectionRoomAssignments).flat())];
      return allRoomIds.reduce((sum, rid) => sum + (roomById[rid]?.capacity ?? 0), 0);
    }
    return (session.roomIds ?? []).reduce(
      (sum, rid) => sum + (roomById[rid]?.capacity ?? 0),
      0,
    );
  }

  // 학년별 배정 현황 (탭 뱃지용)
  const gradeStatusMap = useMemo(() => {
    const map = {};
    for (const g of ["1", "2", "3"]) {
      const gs = sessions.filter((s) => String(s.grade) === g);
      map[g] = { total: gs.length, assigned: gs.filter((s) => (s.roomIds ?? []).length > 0).length };
    }
    return map;
  }, [sessions]);

  // 전체 자동 배정 (Mode 1 세션만, Mode 2는 카드별 버튼으로)
  async function handleAutoAll() {
    if (!window.confirm(`${gradeFilter}학년 전체 과목을 자동 배정하시겠습니까?\n기존 배정이 초기화됩니다.`)) return;
    setAssigning(true);
    try {
      const gradeSess = sessions.filter((s) => String(s.grade) === gradeFilter);
      const mode1Sess = gradeSess.filter((s) => s.sectionMode !== "section");
      const mode2Sess = gradeSess.filter((s) => s.sectionMode === "section");

      const patch = {};
      if (mode1Sess.length > 0) {
        const allResult = autoAssignAllRooms(mode1Sess, rooms, students, enrollments);
        mode1Sess.forEach((s) => { if (allResult[s.id] !== undefined) patch[s.id] = allResult[s.id]; });
        onUpdateAllRoomIds(patch);
      }
      // Mode 2 세션 분반별 자동 배정
      for (const session of mode2Sess) {
        const sectionResult = autoAssignSectionRooms(session, rooms, students, enrollments);
        onUpdateSession?.(session.id, { sectionRoomAssignments: sectionResult });
      }

      flash(`${gradeFilter}학년 자동 배정 완료`, "ok");
    } catch (e) {
      flash("자동 배정 중 오류가 발생했습니다.", "err");
    } finally {
      setAssigning(false);
    }
  }

  // 단일 과목 자동 배정 (Mode 1)
  function handleAutoOne(session) {
    const singleResult = autoAssignAllRooms([session], rooms, students, enrollments);
    const roomIds = singleResult[session.id] ?? [];
    onUpdateRoomIds(session.id, roomIds);
  }

  // 분반별 전체 자동 배정 (Mode 2)
  function handleAutoSectionAll(session) {
    const sectionResult = autoAssignSectionRooms(session, rooms, students, enrollments);
    onUpdateSession?.(session.id, { sectionRoomAssignments: sectionResult });
  }

  // 방 추가/제거 (Mode 1)
  function toggleRoom(session, roomId) {
    const cur = session.roomIds ?? [];
    const next = cur.includes(roomId) ? cur.filter((id) => id !== roomId) : [...cur, roomId];
    onUpdateRoomIds(session.id, next);
  }

  // 분반 방 추가/제거 (Mode 2)
  function toggleSectionRoom(session, section, roomId) {
    const cur = (session.sectionRoomAssignments ?? {})[section] ?? [];
    const next = cur.includes(roomId) ? cur.filter((id) => id !== roomId) : [...cur, roomId];
    onUpdateSession?.(session.id, {
      sectionRoomAssignments: { ...(session.sectionRoomAssignments ?? {}), [section]: next },
    });
  }

  // 개별 과목 초기화 (Mode 1)
  function clearRooms(session) {
    onUpdateRoomIds(session.id, []);
  }

  // 분반 배정 초기화 (Mode 2)
  function clearSectionRooms(session) {
    onUpdateSession?.(session.id, { sectionRoomAssignments: {} });
  }

  // 배정 방식 토글
  function toggleSectionMode(session, mode) {
    if (mode === "section") {
      onUpdateSession?.(session.id, { sectionMode: "section", sectionRoomAssignments: session.sectionRoomAssignments ?? {} });
    } else {
      onUpdateSession?.(session.id, { sectionMode: "none" });
    }
    setOpenPicker(null);
  }

  // 학년 전체 초기화
  function handleClearAll() {
    if (!window.confirm(`${gradeFilter}학년 고사실 배정을 모두 초기화하시겠습니까?`)) return;
    const patch = {};
    sessions.filter((s) => String(s.grade) === gradeFilter).forEach((s) => {
      if (s.sectionMode === "section") {
        onUpdateSession?.(s.id, { sectionRoomAssignments: {} });
      } else {
        patch[s.id] = [];
      }
    });
    if (Object.keys(patch).length > 0) onUpdateAllRoomIds(patch);
    flash(`${gradeFilter}학년 배정 초기화 완료`, "ok");
  }

  const GRADE_TABS = ["1", "2", "3"];

  function StatusPanel() {
    const currentGs = sessions.filter((sess) => String(sess.grade) === gradeFilter);
    const currentAssigned = currentGs.filter((sess) => (sess.roomIds ?? []).length > 0).length;
    const currentConfirmed = roomConfirmed?.[gradeFilter] ?? false;
    const allAssigned = currentGs.length > 0 && currentAssigned === currentGs.length;

    return (
      <div style={s.statusPanel}>
        <div style={s.statusPanelHdr}>
          <p style={s.statusPanelTitle}>진행 현황</p>
        </div>
        {GRADE_TABS.map((g) => {
          const gs = sessions.filter((sess) => String(sess.grade) === g);
          const assigned = gs.filter((sess) => (sess.roomIds ?? []).length > 0).length;
          const confirmed = roomConfirmed?.[g] ?? false;
          let badge;
          if (gs.length === 0) {
            badge = <span style={s.sBadgeGray}>과목 없음</span>;
          } else if (confirmed) {
            badge = <span style={s.sBadgeOk}>✓ 확정</span>;
          } else if (assigned === gs.length) {
            badge = <span style={s.sBadgeInfo}>배정 완료</span>;
          } else if (assigned > 0) {
            badge = <span style={s.sBadgeWarn}>진행 중</span>;
          } else {
            badge = <span style={s.sBadgeGray}>미배정</span>;
          }
          return (
            <div key={g} style={s.statusGradeCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={s.statusGradeLabel}>{g}학년</span>
                {badge}
              </div>
              {gs.length > 0 && (
                <p style={s.statusDetail}>{assigned}/{gs.length} 과목 배정됨</p>
              )}
            </div>
          );
        })}
        <div style={s.statusFooter}>
          {currentConfirmed
            ? <button style={s.deconfirmBtn} onClick={() => onDeconfirmRoom?.(gradeFilter)}>확정 해제</button>
            : <button
                style={{ ...s.confirmBtn, ...(allAssigned ? {} : { opacity: 0.5, cursor: "not-allowed" }) }}
                disabled={!allAssigned}
                onClick={() => allAssigned && onConfirmRoom?.(gradeFilter)}
              >
                {gradeFilter}학년 배정 확정
              </button>
          }
        </div>
      </div>
    );
  }

  const scheduleNotReady = ["1", "2", "3"].filter(
    (g) => sessions.some((s) => String(s.grade) === g) && !scheduleConfirmed?.[g],
  );

  return (
    <>
    {scheduleNotReady.length > 0 && (
      <div style={{ padding: "0.55rem 1.5rem", backgroundColor: "#fff7ed", color: "#b45309", borderBottom: "1px solid #fed7aa", fontSize: "0.82rem", fontWeight: 600 }}>
        ⚠ {scheduleNotReady.join(", ")}학년 일정 배치 확정이 필요합니다. 일정 배치 탭에서 확정 후 진행하세요.
      </div>
    )}
    <div style={s.page}>
      {/* ── 헤더 ── */}
      <div style={s.pageHeader}>
        <div>
          <p style={s.eyebrow}>고사실 배정</p>
          <h2 style={s.pageTitle}>과목별 고사실 배정</h2>
        </div>
        <div style={s.btnRow}>
          {conflicts.length > 0 && (
            <span style={{ fontSize: "0.78rem", color: "#dc2626", fontWeight: 600 }}>
              ⚠ 고사실 충돌 {conflicts.length}건
            </span>
          )}
          <button style={s.primaryBtn} onClick={handleAutoAll} disabled={assigning}>
            {assigning ? "배정 중..." : `${gradeFilter}학년 전체 자동 배정`}
          </button>
          <button style={s.dangerBtn} onClick={handleClearAll}>
            전체 초기화
          </button>
        </div>
      </div>

      {/* ── 알림 ── */}
      {notice && (
        <div style={{ ...s.notice, ...(notice.type === "ok" ? s.noticeOk : notice.type === "warn" ? s.noticeWarn : s.noticeErr) }}>
          {notice.msg}
        </div>
      )}

      {/* ── 학년 탭 ── */}
      <div style={s.filterRow}>
        {GRADE_TABS.map((g) => {
          const { total, assigned } = gradeStatusMap[g];
          const active = gradeFilter === g;
          return (
            <button key={g} style={active ? s.tabActive : s.tab} onClick={() => { setGradeFilter(g); setOpenPicker(null); }}>
              {g}학년
              <span style={active ? s.badgeActive : s.badge}>{assigned}/{total}</span>
            </button>
          );
        })}
        <span style={{ fontSize: "0.75rem", color: "#9ca3af", marginLeft: "0.5rem" }}>
          배정 완료 / 전체 과목 수
        </span>
      </div>

      {/* ── 메인 2컬럼 레이아웃 ── */}
      <div style={s.mainGrid}>
        <div>
          {/* ── 과목 카드 그리드 ── */}
          {gradeSessions.length === 0 ? (
            <div style={s.emptyBox}>
              {gradeFilter}학년 확정된 과목이 없습니다.<br />
              <span style={{ fontSize: "0.82rem" }}>시험계획 탭에서 과목을 먼저 확정해주세요.</span>
            </div>
          ) : (
          <div style={s.cardGrid}>
          {gradeSessions.map((session) => {
            const conflictRooms = conflictRoomsBySession[session.id];
            const hasConflict   = conflictRooms && conflictRooms.size > 0;
            const cap      = assignedCapacity(session);
            const count    = session.studentCount ?? 0;
            const shortage = Math.max(0, count - cap);
            const pct      = count > 0 ? (cap / count) * 100 : 0;
            const over     = cap > count + 5;
            const softShort = shortage > 0 && shortage <= SOFT_OVERFLOW_MAX;
            // 선택과목 상태 분류
            const isUnscheduled = !session.isRequired && (!session.dayId || !session.periodId);
            const hasNoCount    = !session.isRequired && count === 0;
            const hasSections   = !session.isRequired && sessionsWithSections.has(session.id);
            const sectionMode   = session.sectionMode ?? "none"; // "none" | "section"
            const isMode2       = sectionMode === "section";
            // Mode 1 picker
            const pickerOpen = openPicker?.sessionId === session.id && openPicker?.section === null;

            // 분반별 배정 데이터 (Mode 2)
            const sectionCounts     = hasSections ? getSectionCounts(session, enrollments) : {};
            const sectionAssigns    = session.sectionRoomAssignments ?? {};
            const sectionKeys       = Object.keys(sectionCounts).sort();

            return (
              <div key={session.id} style={hasConflict ? s.cardConflict : s.card}>
                {/* 카드 헤더 */}
                <div style={s.cardHeader}>
                  <div>
                    <p style={s.subjectName}>{session.subjectName}</p>
                    <p style={s.subjectMeta}>
                      {session.grade}학년 · 응시 {count}명
                      {session.dateLabel && session.dateLabel !== "미배치" && ` · ${session.dateLabel}`}
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem" }}>
                    <span style={session.isRequired ? s.badgeRequired : s.badgeElective}>
                      {session.isRequired ? "학교지정" : "학생선택"}
                    </span>
                    {session.isEssay && <span style={s.badgeEssay}>서논술</span>}
                  </div>
                </div>

                {/* 배정 방식 토글 (분반 데이터 있는 선택과목만) */}
                {hasSections && (
                  <div style={s.modeToggle}>
                    <button
                      style={!isMode2 ? s.modeBtnActive : s.modeBtn}
                      onClick={() => toggleSectionMode(session, "none")}
                    >학번순 배정</button>
                    <button
                      style={isMode2 ? s.modeBtnActive : s.modeBtn}
                      onClick={() => toggleSectionMode(session, "section")}
                    >분반별 배정</button>
                  </div>
                )}

                {/* ── Mode 2: 분반별 배정 UI ── */}
                {isMode2 ? (
                  <>
                    {sectionKeys.length === 0 ? (
                      <p style={s.noRoom}>분반 데이터가 없습니다.</p>
                    ) : (
                      sectionKeys.map((sec) => {
                        const secRoomIds = sectionAssigns[sec] ?? [];
                        const secPickerOpen = openPicker?.sessionId === session.id && openPicker?.section === sec;
                        return (
                          <div key={sec} style={s.sectionRow}>
                            <span style={s.secBadge}>{sec}</span>
                            <span style={s.secCount}>{sectionCounts[sec]}명</span>
                            <div style={{ ...s.chipRow, flex: 1, marginBottom: 0 }}>
                              {secRoomIds.length === 0 ? (
                                <span style={s.noRoom}>미배정</span>
                              ) : (
                                secRoomIds.map((rid) => {
                                  const isConflict = conflictRooms?.has(rid);
                                  return (
                                    <span key={rid} style={isConflict ? s.chipConflict : s.chip}>
                                      {roomById[rid]?.name ?? rid}
                                      <span style={s.chipX} onClick={() => toggleSectionRoom(session, sec, rid)}>✕</span>
                                    </span>
                                  );
                                })
                              )}
                            </div>
                            <button
                              style={{ ...s.smBtn, color: "#374151", borderColor: "#d1d5db", flexShrink: 0 }}
                              onClick={() => setOpenPicker(secPickerOpen ? null : { sessionId: session.id, section: sec })}
                            >
                              {secPickerOpen ? "닫기" : "선택"}
                            </button>
                            {secPickerOpen && (
                              <div style={{ position: "absolute", zIndex: 10 }}>
                                <RoomPicker
                                  session={{ ...session, roomIds: secRoomIds }}
                                  rooms={rooms}
                                  onToggle={(rid) => toggleSectionRoom(session, sec, rid)}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                    {/* Mode 2 버튼 행 */}
                    <div style={{ ...s.cardFooter, marginTop: "0.6rem" }}>
                      <button style={s.smBtn} onClick={() => handleAutoSectionAll(session)}>
                        전체 분반 자동 배정
                      </button>
                      {Object.values(sectionAssigns).some((ids) => ids.length > 0) && (
                        <button style={s.dangerBtn} onClick={() => clearSectionRooms(session)}>초기화</button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* ── Mode 1: 기존 UI ── */}
                    {/* 용량 바 */}
                    <div style={s.barWrap}>
                      <div style={s.barFill(pct, over, softShort)} />
                    </div>
                    <p style={s.barLabel}>
                      {cap === 0
                        ? "미배정"
                        : over
                        ? `정원 초과 (배정 ${cap}명 / 응시 ${count}명)`
                        : cap >= count
                        ? `배정 완료 (${cap}명 수용)`
                        : softShort
                        ? `정원 초과 운영 — ${shortage}명 추가배치 (책상 추가)`
                        : `부족 (배정 ${cap}명 / 필요 ${count}명)`}
                    </p>

                    {/* 배정된 방 chips */}
                    <div style={s.chipRow}>
                      {(session.roomIds ?? []).length === 0 ? (
                        <span style={s.noRoom}>배정된 고사실 없음</span>
                      ) : (
                        (session.roomIds ?? []).map((rid) => {
                          const isConflict = conflictRooms?.has(rid);
                          return (
                            <span key={rid} style={isConflict ? s.chipConflict : s.chip}>
                              {roomById[rid]?.name ?? rid}
                              <span style={s.chipX} onClick={() => toggleRoom(session, rid)}>✕</span>
                            </span>
                          );
                        })
                      )}
                    </div>

                    {/* 버튼 행 */}
                    <div style={s.cardFooter}>
                      {session.isRequired ? (
                        <button style={s.smBtn} onClick={() => handleAutoOne(session)}>자동 배정</button>
                      ) : !isUnscheduled && !hasNoCount ? (
                        <button style={s.smBtn} onClick={() => handleAutoOne(session)}>자동 배정</button>
                      ) : null}
                      <button
                        style={{ ...s.smBtn, color: "#374151", borderColor: "#d1d5db" }}
                        onClick={() => setOpenPicker(pickerOpen ? null : { sessionId: session.id, section: null })}
                      >
                        {pickerOpen ? "닫기" : "수동 선택"}
                      </button>
                      {(session.roomIds ?? []).length > 0 && (
                        <button style={s.dangerBtn} onClick={() => clearRooms(session)}>초기화</button>
                      )}
                    </div>

                    {/* 방 선택 패널 */}
                    {pickerOpen && (
                      <RoomPicker
                        session={session}
                        rooms={rooms}
                        onToggle={(rid) => toggleRoom(session, rid)}
                      />
                    )}
                  </>
                )}

                {/* 상태 힌트 (공통) */}
                {hasConflict && (
                  <p style={s.conflictMsg}>⚠ 같은 교시에 중복 배정된 고사실 있음</p>
                )}
                {!isMode2 && isUnscheduled && !hasConflict && (
                  <p style={{ fontSize: "0.73rem", color: "#92400e", fontWeight: 600, marginTop: "0.3rem" }}>
                    일정 미배치 — 일정 배치 탭에서 교시 지정 후 자동 배정 가능
                  </p>
                )}
                {!isMode2 && hasNoCount && !isUnscheduled && (
                  <p style={{ fontSize: "0.73rem", color: "#6b7280", marginTop: "0.3rem" }}>
                    응시 인원 미확정 — 시험계획 탭에서 재확정 필요
                  </p>
                )}
              </div>
            );
          })}
        </div>
          )}
        </div>
        <StatusPanel />
      </div>
    </div>
    </>
  );
}

// ─── 방 선택 패널 ─────────────────────────────────────────────────────────────

function RoomPicker({ session, rooms, onToggle }) {
  const assignedSet = new Set(session.roomIds ?? []);
  const gradePrefix = `${session.grade}-`;
  const classRooms = [], extraRooms = [], waitingRooms = [];
  for (const r of rooms) {
    if (r.roomType === "class") {
      if (r.name.startsWith(gradePrefix)) classRooms.push(r); // 해당 학년만
    } else if (r.roomType === "extra") extraRooms.push(r);
    else if (r.roomType === "waiting") waitingRooms.push(r);
  }

  const RoomCheckbox = ({ room }) => (
    <label style={s.roomOption}>
      <input
        type="checkbox"
        checked={assignedSet.has(room.id)}
        onChange={() => onToggle(room.id)}
      />
      <span style={{ fontSize: "0.8rem", color: "#374151" }}>
        {room.name}
        <span style={{ color: "#9ca3af" }}> · {room.capacity}명</span>
        {room.floor && <span style={{ color: "#9ca3af" }}> · {room.floor}층</span>}
      </span>
    </label>
  );

  const Section = ({ title, list }) =>
    list.length === 0 ? null : (
      <>
        <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0.5rem 0 0.25rem" }}>{title}</p>
        {list.map((r) => <RoomCheckbox key={r.id} room={r} />)}
      </>
    );

  return (
    <div style={s.roomPicker}>
      <Section title="학급 교실" list={classRooms} />
      <Section title="추가 고사실" list={extraRooms} />
      <Section title="대기실" list={waitingRooms} />
    </div>
  );
}
