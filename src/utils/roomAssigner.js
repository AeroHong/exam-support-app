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
    .filter(isClassRoom)
    .filter((r) => r.name.startsWith(`${grade}-`))
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
 * session에 수강하는 학생 목록 반환
 * 지정과목 → 해당 학년 전체 / 선택과목 → enrollments 기반
 */
function getEnrolledStudents(session, students, enrollments) {
  if (session.isRequired) {
    return students
      .filter((s) => String(s.grade) === String(session.grade))
      .sort((a, b) => a.id.localeCompare(b.id));
  }
  const enrolled = new Set(
    enrollments
      .filter((e) => e.subjectName === session.subjectName || e.subjectId === session.subjectId)
      .map((e) => e.studentId),
  );
  return students
    .filter((s) => enrolled.has(s.id))
    .sort((a, b) => a.id.localeCompare(b.id));
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

  // 이전 가득 찬 방의 인원 + 마지막 소수 인원 = 통합 필요 용량
  const lastFull = assignedRooms[assignedRooms.length - 1];
  const neededCapacity = lastFull.capacity + remaining;

  // 사용 가능한 추가 고사실 중 용량 충족하는 것 찾기
  const candidate = extraRooms.find(
    (r) => r.capacity >= neededCapacity && !usedRoomIds.has(r.id),
  );
  if (!candidate) return null;

  // 마지막 꽉 찬 방 제거 → 추가 고사실로 대체
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
function assignElective(session, gradeClassRooms, extraRooms, usedRoomIds, poolPointer, enrolledStudents) {
  const studentCount = session.studentCount ?? 0;
  if (studentCount === 0) return { roomIds: [], nextPointer: poolPointer };

  // 수강생 중 학번이 가장 빠른 학생의 반 → 시작 교실 찾기
  let startIdx = poolPointer;
  if (enrolledStudents.length > 0) {
    const firstClassNo = String(enrolledStudents[0].classNo);
    const preferred = gradeClassRooms.findIndex(
      (r) => r.name === classKey(session.grade, firstClassNo),
    );
    // 선호 교실이 이미 사용됐거나 pointer 뒤에 있으면 pointer 유지
    if (preferred >= 0 && preferred >= poolPointer && !usedRoomIds.has(gradeClassRooms[preferred].id)) {
      startIdx = preferred;
    }
  }

  // 교실 풀: startIdx부터 순서대로 (wrap하지 않음)
  const pool = gradeClassRooms.slice(startIdx).filter((r) => !usedRoomIds.has(r.id));

  const assignedRooms = [];
  let remaining = studentCount;

  for (const room of pool) {
    if (remaining <= 0) break;
    assignedRooms.push(room);
    remaining -= room.capacity;
  }

  // ≤10명 통합 시도
  if (remaining > 0 && remaining <= 10) {
    const allUsed = new Set([...usedRoomIds, ...assignedRooms.map((r) => r.id)]);
    const consolidated = tryConsolidate(assignedRooms, remaining, extraRooms, allUsed);
    if (consolidated) {
      const nextPointer = startIdx + consolidated.filter(isClassRoom).length;
      return { roomIds: consolidated.map((r) => r.id), nextPointer };
    }
    // 통합 실패 → 추가 고사실에서 남은 인원용 방 찾기
    const fallback = extraRooms.find((r) => r.capacity >= remaining && !allUsed.has(r.id));
    if (fallback) {
      assignedRooms.push(fallback);
      remaining = 0;
    }
  }

  const nextPointer = startIdx + assignedRooms.filter(isClassRoom).length;
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

      // 같은 교시의 선택과목 — 인원수 오름차순
      const periodElective = gradeSessions
        .filter((s) => !s.isRequired && s.dayId === dayId && s.periodId === periodId)
        .sort((a, b) => (a.studentCount ?? 0) - (b.studentCount ?? 0));

      // 지정과목이 이미 점유한 방 + 이번 교시 배정 결과를 순차 추적
      const usedRoomIds = new Set(
        gradeSessions
          .filter((s) => s.isRequired)
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

      // 일정 미배치 선택과목 (dayId/periodId 없음) — 단독 처리
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
