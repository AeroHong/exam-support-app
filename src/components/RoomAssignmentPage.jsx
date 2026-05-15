import { useMemo, useState } from "react";
import { autoAssignAllRooms, findRoomConflicts } from "../utils/roomAssigner";

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
  barFill:      (pct, over) => ({
    height: "100%",
    width: `${Math.min(pct, 100)}%`,
    backgroundColor: over ? "#dc2626" : pct >= 100 ? "#15803d" : "#4f46e5",
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
};

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function RoomAssignmentPage({
  sessions, rooms, students, enrollments,
  onUpdateRoomIds, onUpdateAllRoomIds,
  roomConfirmed, onConfirmRoom, onDeconfirmRoom,
}) {
  const [gradeFilter, setGradeFilter] = useState("1");
  const [notice, setNotice]     = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [openPicker, setOpenPicker] = useState(null); // sessionId

  function flash(msg, type = "ok") {
    setNotice({ msg, type });
    setTimeout(() => setNotice(null), 3500);
  }

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

  // 배정된 방 총 용량 계산
  function assignedCapacity(session) {
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

  // 전체 자동 배정
  async function handleAutoAll() {
    if (!window.confirm(`${gradeFilter}학년 전체 과목을 자동 배정하시겠습니까?\n기존 배정이 초기화됩니다.`)) return;
    setAssigning(true);
    try {
      const gradeSess = sessions.filter((s) => String(s.grade) === gradeFilter);
      const allResult = autoAssignAllRooms(gradeSess, rooms, students, enrollments);
      // 다른 학년은 건드리지 않음
      const patch = {};
      gradeSess.forEach((s) => { if (allResult[s.id] !== undefined) patch[s.id] = allResult[s.id]; });
      onUpdateAllRoomIds(patch);
      flash(`${gradeFilter}학년 자동 배정 완료`, "ok");
    } catch (e) {
      flash("자동 배정 중 오류가 발생했습니다.", "err");
    } finally {
      setAssigning(false);
    }
  }

  // 단일 과목 자동 배정
  function handleAutoOne(session) {
    const singleResult = autoAssignAllRooms([session], rooms, students, enrollments);
    const roomIds = singleResult[session.id] ?? [];
    onUpdateRoomIds(session.id, roomIds);
  }

  // 방 추가/제거
  function toggleRoom(session, roomId) {
    const cur = session.roomIds ?? [];
    const next = cur.includes(roomId) ? cur.filter((id) => id !== roomId) : [...cur, roomId];
    onUpdateRoomIds(session.id, next);
  }

  // 개별 과목 초기화
  function clearRooms(session) {
    onUpdateRoomIds(session.id, []);
  }

  // 학년 전체 초기화
  function handleClearAll() {
    if (!window.confirm(`${gradeFilter}학년 고사실 배정을 모두 초기화하시겠습니까?`)) return;
    const patch = {};
    sessions.filter((s) => String(s.grade) === gradeFilter).forEach((s) => { patch[s.id] = []; });
    onUpdateAllRoomIds(patch);
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

  return (
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
            const cap    = assignedCapacity(session);
            const count  = session.studentCount ?? 0;
            const pct    = count > 0 ? (cap / count) * 100 : 0;
            const over   = cap > count + 5;
            const pickerOpen = openPicker === session.id;
            // 선택과목 상태 분류
            const isUnscheduled = !session.isRequired && (!session.dayId || !session.periodId);
            const hasNoCount    = !session.isRequired && count === 0;

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

                {/* 용량 바 */}
                <div style={s.barWrap}>
                  <div style={s.barFill(pct, over)} />
                </div>
                <p style={s.barLabel}>
                  {cap === 0
                    ? "미배정"
                    : over
                    ? `정원 초과 (배정 ${cap}명 / 응시 ${count}명)`
                    : cap >= count
                    ? `배정 완료 (${cap}명 수용)`
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

                {/* 상태 힌트 */}
                {hasConflict && (
                  <p style={s.conflictMsg}>⚠ 같은 교시에 중복 배정된 고사실 있음</p>
                )}
                {isUnscheduled && !hasConflict && (
                  <p style={{ fontSize: "0.73rem", color: "#92400e", fontWeight: 600, marginTop: "0.3rem" }}>
                    일정 미배치 — 일정 배치 탭에서 교시 지정 후 자동 배정 가능
                  </p>
                )}
                {hasNoCount && !isUnscheduled && (
                  <p style={{ fontSize: "0.73rem", color: "#6b7280", marginTop: "0.3rem" }}>
                    응시 인원 미확정 — 시험계획 탭에서 재확정 필요
                  </p>
                )}

                {/* 버튼 행 */}
                <div style={s.cardFooter}>
                  {session.isRequired ? (
                    <button style={s.smBtn} onClick={() => handleAutoOne(session)}>자동 배정</button>
                  ) : !isUnscheduled && !hasNoCount ? (
                    <button style={s.smBtn} onClick={() => handleAutoOne(session)}>자동 배정</button>
                  ) : null}
                  <button
                    style={{ ...s.smBtn, color: "#374151", borderColor: "#d1d5db" }}
                    onClick={() => setOpenPicker(pickerOpen ? null : session.id)}
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
              </div>
            );
          })}
        </div>
          )}
        </div>
        <StatusPanel />
      </div>
    </div>
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
