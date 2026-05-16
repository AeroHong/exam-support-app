// ─────────────────────────────────────────────────────────────────────────────
// 고사실별 응시 현황표 데이터 생성
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 세션의 고사실별 응시 현황표 데이터 생성
 * @param {Object} session - 세션 정보
 * @param {Object} plan - 시험계획 정보 (days, periods)
 * @param {Array} students - 전체 학생 목록
 * @param {Array} enrollments - 전체 수강 정보
 * @param {Array} rooms - 전체 고사실 목록
 * @param {Array} subjects - 전체 과목 목록
 * @returns {Array} 고사실별 현황표 데이터 배열
 */
export function generateRoomRosters(session, plan, students, enrollments, rooms, subjects) {
  if (!session || !session.roomIds || session.roomIds.length === 0) {
    return [];
  }

  // 과목 정보 찾기
  const subject = subjects.find(s => s.id === session.subjectId);
  const subjectCode = subject?.subjectCode || "";

  // 날짜/교시 정보
  const day = plan.days.find(d => d.id === session.dayId);
  const period = plan.periods.find(p => p.id === session.periodId);
  const dayLabel = day?.label || session.dateLabel || "";
  const periodLabel = period?.label || "";

  // 시간 정보
  const startTime = session.startTime || "";
  const duration = session.duration || 50;
  const endTime = calculateEndTime(startTime, duration);

  // 해당 과목 수강 학생 찾기
  const enrolledStudentIds = enrollments
    .filter(e => e.subjectName === session.subjectName && e.grade === session.grade)
    .map(e => e.studentId);

  console.log(`[generateRoomRosters] Session ${session.id}:`, {
    subjectName: session.subjectName,
    grade: session.grade,
    enrolledStudentIds: enrolledStudentIds.length,
    totalStudents: students.length,
    totalEnrollments: enrollments.length,
    firstEnrollment: enrollments[0],
    firstStudent: students[0],
  });

  if (enrolledStudentIds.length === 0) {
    console.warn(`[generateRoomRosters] ⚠️ No enrollments found for ${session.subjectName} (grade ${session.grade})`);
    console.log("Sample enrollments:", enrollments.slice(0, 3));
  }

  const enrolledStudents = students.filter(s =>
    enrolledStudentIds.includes(s.id) && s.grade === session.grade
  );

  console.log(`[generateRoomRosters] Enrolled students:`, enrolledStudents.length);

  if (enrolledStudentIds.length > 0 && enrolledStudents.length === 0) {
    console.warn(`[generateRoomRosters] ⚠️ Student ID mismatch!`);
    console.log("enrolledStudentIds sample:", enrolledStudentIds.slice(0, 3));
    console.log("student IDs sample:", students.slice(0, 3).map(s => s.id));
  }

  // examStatus별 분류
  const normalStudents = enrolledStudents.filter(s => !s.examStatus || s.examStatus === "");
  const specialStudents = enrolledStudents.filter(s => s.examStatus === "special"); // 도움실
  const separateStudents = enrolledStudents.filter(s => s.examStatus === "separate"); // 별도실
  const delegationStudents = enrolledStudents.filter(s => s.examStatus === "delegation"); // 위탁 (카운트만)

  console.log(`[generateRoomRosters] Student classification:`, {
    normal: normalStudents.length,
    special: specialStudents.length,
    separate: separateStudents.length,
    delegation: delegationStudents.length,
  });

  // 좌석 배정 정보 (session.seatAssignments)
  const seatAssignments = session.seatAssignments || {};
  console.log(`[generateRoomRosters] Seat assignments:`, Object.keys(seatAssignments).length);

  // 고사실별 데이터 생성
  const rosters = [];

  for (const roomId of session.roomIds) {
    const room = rooms.find(r => r.id === roomId);
    if (!room) {
      console.log(`[generateRoomRosters] Room not found: ${roomId}`);
      continue;
    }

    console.log(`[generateRoomRosters] Processing room: ${room.name} (${roomId})`);

    // 해당 고사실 배정 학생
    const roomStudents = normalStudents
      .filter(s => {
        const assigned = seatAssignments[s.id]?.roomId === roomId;
        if (!assigned && normalStudents.length < 5) {
          console.log(`  Student ${s.id} (${s.name}): assignment=${seatAssignments[s.id]?.roomId}, expected=${roomId}`);
        }
        return assigned;
      })
      .map(s => ({
        seatNumber: seatAssignments[s.id]?.seatNumber || 0,
        studentId: s.number || s.id,
        name: s.name || "",
        gender: s.gender || "남",
        absent: false,
      }))
      .sort((a, b) => a.seatNumber - b.seatNumber);

    console.log(`[generateRoomRosters] Room ${room.name}: ${roomStudents.length} students assigned`);

    // 해당 고사실의 재적인원 = 고사실 인원만 (도움실/별도실은 별도 표기)
    const totalCount = roomStudents.length;
    const attendCount = roomStudents.length;
    const specialCount = specialStudents.length;
    const separateCount = separateStudents.length;

    rosters.push({
      // 헤더 정보
      examDate: dayLabel,
      period: periodLabel,
      startTime,
      endTime,
      roomName: room.name,
      subjectName: session.subjectName,
      subjectCode,
      isEssay: session.isEssay || false,

      // 인원 통계
      totalCount,
      attendCount,
      specialCount,
      separateCount,

      // 학생 목록
      students: roomStudents,
      specialStudents: specialStudents.map(s => ({
        studentId: s.number || s.id,
        name: s.name || "",
      })),
      separateStudents: separateStudents.map(s => ({
        studentId: s.number || s.id,
        name: s.name || "",
      })),

      // 메타 정보
      sessionId: session.id,
      roomId: room.id,
    });
  }

  return rosters;
}

/**
 * 종료 시간 계산
 * @param {string} startTime - 시작 시간 (HH:MM)
 * @param {number} duration - 지속 시간 (분)
 * @returns {string} 종료 시간 (HH:MM)
 */
function calculateEndTime(startTime, duration) {
  if (!startTime) return "";
  try {
    const [h, m] = startTime.split(":").map(Number);
    const totalMinutes = h * 60 + m + duration;
    const endH = Math.floor(totalMinutes / 60);
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

/**
 * 전체 세션의 고사실별 현황표 생성
 * @param {Object} plan - 시험계획 전체 데이터
 * @param {Array} students - 학생 목록
 * @param {Array} enrollments - 수강 정보
 * @param {Array} rooms - 고사실 목록
 * @param {Array} subjects - 과목 목록
 * @returns {Array} 모든 세션의 고사실별 현황표 배열
 */
export function generateAllRoomRosters(plan, students, enrollments, rooms, subjects) {
  if (!plan?.sessions || plan.sessions.length === 0) {
    console.log("[generateAllRoomRosters] No sessions");
    return [];
  }

  console.log("[generateAllRoomRosters] Input:", {
    sessions: plan.sessions.length,
    students: students.length,
    enrollments: enrollments.length,
    rooms: rooms.length,
    subjects: subjects.length,
  });

  const allRosters = [];

  for (const session of plan.sessions) {
    const rosters = generateRoomRosters(session, plan, students, enrollments, rooms, subjects);
    console.log(`[generateAllRoomRosters] Session ${session.id}: ${rosters.length} rosters`);
    if (rosters.length > 0) {
      console.log("  First roster students:", rosters[0].students);
    }
    allRosters.push(...rosters);
  }

  console.log(`[generateAllRoomRosters] Total: ${allRosters.length} rosters`);
  return allRosters;
}
