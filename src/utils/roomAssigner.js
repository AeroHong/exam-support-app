/**
 * 고사실 자동 배정 알고리즘
 *
 * 지정과목: 해당 학년 학급 교실 전체 배정
 * 선택과목: 같은 교시 내 소인수 순서로 순차 배정
 *           수강생 중 학번 가장 빠른 학생의 반을 시작 교실로,
 *           마지막 교실 ≤10명이면 추가 고사실로 통합 시도
 */

// ─── 유틸 ────────────────────────────────────────────────────────────────────

/** 학년·반 → 학급 교실 매핑용 키 */
const classKey = (grade, classNo) => `${grade}-${classNo}반`;

/** 학급 교실 여부 */
const isClassRoom  = (r) => r.roomType === "class";
const isExtraRoom  = (r) => r.roomType === "extra";

/**
 * 해당 학년의 학급 교실 목록 반환 (classNo 오름차순)
 */
function getGradeClassRooms(rooms, grade) {
  return rooms
    .filter((r) => isClassRoom(r) && r.name.startsWith(`${grade}-`))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

/**
 * 추가 고사실 목록 반환 (최대 인원 내림차순)
 */
function getExtraRooms(rooms) {
  return rooms
    .filter(isExtraRoom)
    .sort((a, b) => b.capacity - a.capacity);
}

/**
 * session에 수강하는 학생 목록 반환 (위탁 제외)
 * 지정과목 → 해당 학년 전체 / 선택과목 → enrollments 기반
 * @returns {{ all: object[], seated: object[], special: object[] }}
 *   all     = 위탁 제외 전체 (응시현황표 표시 대상)
 *   seated  = 물리 좌석 필요 (정상 응시만)
 *   special = 특수학급·별도고사실 (별도 표시)
 */
function getEnrolledStudents(session, students, enrollments) {
  let all;
  if (session.isRequired) {
    all = students
      .filter((s) => String(s.grade) === String(session.grade) && s.examStatus !== "delegation")
      .sort((a, b) => a.id.localeCompare(b.id));
  } else {
    const enrolled = new Set(
      enrollments
        .filter((e) => {
          if (String(e.grade) !== String(session.grade)) return false;
          if (session.subjectId && e.subjectId) return e.subjectId === session.subjectId;
          return e.subjectName === session.subjectName;
        })
        .map((e) => e.studentId),
    );
    all = students
      .filter((s) => enrolled.has(s.id) && s.examStatus !== "delegation")
      .sort((a, b) => a.id.localeCompare(b.id));
  }
  const seated  = all.filter((s) => !s.examStatus || s.examStatus === "");
  const special = all.filter((s) => s.examStatus === "special" || s.examStatus === "separate");
  return { all, seated, special };
}

/**
 * 마지막 고사실 ≤10명 시 추가 고사실로 통합 시도
 * rooms: 이미 배정된 방 배열, remaining: 마지막 방에 들어갈 학생 수
 * 반환: 최종 roomIds 배열 (통합 성공 시 방 개수 1개 감소)
 */
function tryConsolidate(assignedRooms, remaining, extraRooms, usedRoomIds) {
  if (remaining <= 0 || remaining > 10 || assignedRooms.length === 0) {
    return null; // 통합 조건 미충족
  }

  const lastRoom = assignedRooms[assignedRooms.length - 1];
  const neededCapacity = lastRoom.capacity + remaining;

  const candidate = extraRooms.find(
    (r) => r.capacity >= neededCapacity && !usedRoomIds.has(r.id),
  );
  if (!candidate) return null;

  const newRooms = [...assignedRooms.slice(0, -1), candidate];
  return newRooms;
}

// ─── 지정과목 배정 ─────────────────────────────────────────────────────────

/**
 * 지정과목: 해당 학년 학급 교실 전체를 roomIds로 배정
 */
function assignRequired(session, rooms) {
  const classRooms = getGradeClassRooms(rooms, session.grade);
  return classRooms.map((r) => r.id);
}

// ─── 선택과목 배정 ─────────────────────────────────────────────────────────

/**
 * 선택과목 단일 session 배정
 * @param {object} session
 * @param {object[]} gradeClassRooms - 해당 학년 학급 교실 전체 (정렬됨)
 * @param {object[]} extraRooms - 추가 고사실 (용량 내림차순)
 * @param {Set<string>} usedRoomIds - 이미 사용 중인 방 ID
 * @param {number} poolPointer - 교실 풀에서 시작할 인덱스 (이전 과목이 쓴 다음)
 * @param {object[]} enrolledStudents - 수강생 (학번순 정렬됨)
 * @returns {{ roomIds: string[], nextPointer: number }}
 */
// enrolledStudents: { all, seated, special } — seated만 물리 좌석 계산에 사용
function assignElective(session, gradeClassRooms, extraRooms, usedRoomIds, poolPointer, enrolledStudents) {
  const seatedStudents = Array.isArray(enrolledStudents) ? enrolledStudents : (enrolledStudents.seated ?? []);
  const allStudents    = Array.isArray(enrolledStudents) ? enrolledStudents : (enrolledStudents.all ?? []);
  const studentCount   = seatedStudents.length || (session.studentCount ?? 0);
  if (studentCount === 0) return { roomIds: [], nextPointer: poolPointer };

  // 수강생 중 학번이 가장 빠른 학생의 반 → 시작 교실 찾기
  let startIdx = poolPointer;
  if (allStudents.length > 0) {
    const firstClassNo = String(allStudents[0].classNo);
    const preferred = gradeClassRooms.findIndex(
      (r) => r.name === classKey(session.grade, firstClassNo),
    );
    // 선호 교실이 이미 사용됐거나 pointer 뒤에 있으면 pointer 유지
    if (preferred >= 0 && preferred >= poolPointer && !usedRoomIds.has(gradeClassRooms[preferred].id)) {
      startIdx = preferred;
    }
  }

  // 교실 풀: startIdx부터 끝 → 부족하면 앞쪽 미사용 교실도 wrap
  const afterStart  = gradeClassRooms.slice(startIdx).filter((r) => !usedRoomIds.has(r.id));
  const beforeStart = gradeClassRooms.slice(0, startIdx).filter((r) => !usedRoomIds.has(r.id));
  const orderedPool = [...afterStart, ...beforeStart];

  const assignedRooms = [];
  let remaining = studentCount;

  for (const room of orderedPool) {
    if (remaining <= 0) break;
    assignedRooms.push(room);
    remaining -= room.capacity;
  }

  // 학급 교실로도 부족하면 추가 고사실 사용 (인원수 무관)
  if (remaining > 0) {
    const allUsed = new Set([...usedRoomIds, ...assignedRooms.map((r) => r.id)]);
    if (remaining <= 10) {
      // 마지막 교실과 통합 시도
      const consolidated = tryConsolidate(assignedRooms, remaining, extraRooms, allUsed);
      if (consolidated) {
        const nextPointer = poolPointer + consolidated.filter(isClassRoom).length;
        return { roomIds: consolidated.map((r) => r.id), nextPointer };
      }
    }
    // 추가 고사실로 남은 인원 순차 배정
    for (const r of extraRooms) {
      if (remaining <= 0) break;
      if (allUsed.has(r.id)) continue;
      assignedRooms.push(r);
      allUsed.add(r.id);
      remaining -= r.capacity;
    }
  }

  const nextPointer = poolPointer + assignedRooms.filter(isClassRoom).length;
  return { roomIds: assignedRooms.map((r) => r.id), nextPointer };
}

// ─── 전체 배정 엔트리 ─────────────────────────────────────────────────────

/**
 * 모든 session에 대해 고사실 자동 배정
 * @param {object[]} sessions - plan.sessions
 * @param {object[]} rooms    - 전체 고사실 (학급+추가)
 * @param {object[]} students
 * @param {object[]} enrollments
 * @returns {Object} { [sessionId]: string[] } — sessionId → roomIds 매핑
 */
export function autoAssignAllRooms(sessions, rooms, students, enrollments) {
  const result = {};
  const extraRooms = getExtraRooms(rooms);

  // 학년별로 처리
  for (const grade of ["1", "2", "3"]) {
    const gradeClassRooms = getGradeClassRooms(rooms, grade);
    const gradeSessions   = sessions.filter((s) => String(s.grade) === grade);

    // 지정과목 먼저 배정
    for (const session of gradeSessions.filter((s) => s.isRequired)) {
      result[session.id] = assignRequired(session, rooms);
    }

    // 교시별로 선택과목 배정
    const periodKeys = [
      ...new Set(
        gradeSessions
          .filter((s) => !s.isRequired && s.dayId && s.periodId)
          .map((s) => `${s.dayId}__${s.periodId}`),
      ),
    ];

    for (const key of periodKeys) {
      const [dayId, periodId] = key.split("__");

      // 같은 교시의 선택과목 — 실제 착석 인원 오름차순
      const periodElective = gradeSessions
        .filter((s) => !s.isRequired && s.dayId === dayId && s.periodId === periodId)
        .sort((a, b) => {
          const countA = getEnrolledStudents(a, students, enrollments).seated.length || (a.studentCount ?? 0);
          const countB = getEnrolledStudents(b, students, enrollments).seated.length || (b.studentCount ?? 0);
          return countA - countB;
        });

      // 동일 교시·날짜의 지정과목이 점유한 방만 제외 (다른 교시 지정과목 방은 재사용 가능)
      const usedRoomIds = new Set(
        gradeSessions
          .filter((s) => s.isRequired && s.dayId === dayId && s.periodId === periodId)
          .flatMap((s) => result[s.id] ?? []),
      );
      let pointer = 0;

      for (const session of periodElective) {
        const enrolled = getEnrolledStudents(session, students, enrollments);
        const { roomIds, nextPointer } = assignElective(
          session, gradeClassRooms, extraRooms, usedRoomIds, pointer, enrolled,
        );
        result[session.id] = roomIds;
        roomIds.forEach((id) => usedRoomIds.add(id));
        pointer = nextPointer;
      }
    }

    // 일정 미배치 선택과목 (dayId/periodId 없음) — 단독 처리 (교시 루프 밖에서 1회만)
    const unscheduled = gradeSessions.filter(
      (s) => !s.isRequired && (!s.dayId || !s.periodId),
    );
    for (const session of unscheduled) {
      const enrolled = getEnrolledStudents(session, students, enrollments);
      const { roomIds } = assignElective(
        session, gradeClassRooms, extraRooms, new Set(), 0, enrolled,
      );
      result[session.id] = roomIds;
    }
  }

  return result;
}

// ─── 고사실 충돌 검사 ─────────────────────────────────────────────────────

/**
 * 같은 (dayId, periodId)에 같은 방이 여러 session에 배정된 경우를 반환
 * @returns {{ roomId: string, sessionIds: string[], periodKey: string }[]}
 */
export function findRoomConflicts(sessions) {
  const conflicts = [];
  const periodMap = {};

  for (const session of sessions) {
    if (!session.dayId || !session.periodId) continue;
    const key = `${session.dayId}__${session.periodId}`;
    if (!periodMap[key]) periodMap[key] = {};
    for (const roomId of session.roomIds ?? []) {
      if (!periodMap[key][roomId]) periodMap[key][roomId] = [];
      periodMap[key][roomId].push(session.id);
    }
  }

  for (const [periodKey, roomMap] of Object.entries(periodMap)) {
    for (const [roomId, sessionIds] of Object.entries(roomMap)) {
      if (sessionIds.length > 1) {
        conflicts.push({ roomId, sessionIds, periodKey });
      }
    }
  }

  return conflicts;
}

// ─── 좌석 배정 ───────────────────────────────────────────────────────────

/**
 * 학번순으로 고사실별 학생 배분
 * @returns {{ [roomId]: { students: object[], seats: { seatNo: number, student: object }[] } }}
 */
export function assignSeats(session, assignedRooms, enrolledStudents) {
  const sorted = [...enrolledStudents].sort((a, b) => a.id.localeCompare(b.id));
  const result = {};
  let idx = 0;

  for (const room of assignedRooms) {
    const seats = [];
    for (let seat = 1; seat <= room.capacity && idx < sorted.length; seat++, idx++) {
      seats.push({ seatNo: seat, student: sorted[idx] });
    }
    result[room.id] = { room, seats };
  }

  return result;
}
