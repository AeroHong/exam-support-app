// ─────────────────────────────────────────────────────────────────────────────
// 과목별 / 고사실별 응시 현황 데이터 생성
//
// 수정 내용:
//   1) 학교지정 과목 → enrollment 없이 학년 전체 학생 (isRequired / courseType==="school")
//   2) grade 비교 String() 변환으로 타입 불일치 해결
//   3) seatAssignments 없음 → session.roomIds + 방 capacity 기반 자동 좌석 배분
//      - 정렬: 반 오름차순 → 번호 오름차순
//      - 도움실·별도실 학생도 방 배분에 포함 → 소속 방 컬럼 G/H 표시용
// ─────────────────────────────────────────────────────────────────────────────

function calcEndTime(startTime, duration) {
  if (!startTime || !duration) return "";
  try {
    const [h, m] = startTime.split(":").map(Number);
    const total = h * 60 + m + Number(duration);
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

/**
 * 세션 응시 학생 반환 (위탁 포함 전체 — 위탁 제외는 호출자가 처리)
 * - 학교지정(isRequired / courseType==="school"): 해당 학년 전체
 * - 학생선택: enrollment 기반 (subjectId 우선, 없으면 subjectName+grade)
 * - 정렬: 반 → 번호 오름차순
 */
function findStudentsForSession(session, students, enrollments, subjects) {
  const subject = subjects.find((s) => s.id === session.subjectId);
  const isSchool = session.isRequired === true || subject?.courseType === "school";

  let list;
  if (isSchool) {
    list = students.filter((s) => String(s.grade) === String(session.grade));
  } else {
    const ids = new Set(
      enrollments
        .filter((e) => {
          if (e.subjectId && session.subjectId && e.subjectId === session.subjectId)
            return true;
          return (
            e.subjectName === session.subjectName &&
            String(e.grade) === String(session.grade)
          );
        })
        .map((e) => e.studentId)
    );
    list = students.filter(
      (s) => ids.has(s.id) && String(s.grade) === String(session.grade)
    );
  }

  return list.sort((a, b) => {
    const cd = Number(a.classNo) - Number(b.classNo);
    return cd !== 0 ? cd : Number(a.number) - Number(b.number);
  });
}

/**
 * session.roomIds + 방 capacity 기반 학생 자동 배분
 *
 * - 위탁(delegation) 제외한 전체 학생을 방 용량대로 순차 배치
 * - 방이 가득 차면 다음 방으로 이동 (마지막 방은 오버플로 허용)
 * - 정상·도움실·별도실 모두 동일 풀에서 배분해 "소속 방" 결정
 *
 * @returns {{ roomGroups, assignedMap: Map<studentId, {roomId, roomName, seatNumber}> }}
 */
function autoAssignToRooms(nonDelegation, roomIds, rooms) {
  const sessionRooms = roomIds
    .map((id) => rooms.find((r) => r.id === id))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  if (!sessionRooms.length) {
    return { roomGroups: [], assignedMap: new Map() };
  }

  // capacity 미설정 시 균등 분배
  const totalCap = sessionRooms.reduce((s, r) => s + (r.capacity || 0), 0);
  const fallbackCap = totalCap > 0
    ? null
    : Math.ceil(nonDelegation.length / sessionRooms.length);

  const assignedMap = new Map(); // studentId → { roomId, roomName, seatNumber }
  let roomIdx = 0;
  let seatInRoom = 0;

  for (const student of nonDelegation) {
    const room = sessionRooms[roomIdx];
    const cap = room.capacity || fallbackCap || 30;

    // 현재 방 가득 찼으면 다음 방으로 (마지막 방은 오버플로 허용)
    if (seatInRoom >= cap && roomIdx < sessionRooms.length - 1) {
      roomIdx++;
      seatInRoom = 0;
    }

    const cur = sessionRooms[roomIdx];
    assignedMap.set(student.id, {
      roomId: cur.id,
      roomName: cur.name,
      seatNumber: seatInRoom + 1,
    });
    seatInRoom++;
  }

  // roomGroups 구성
  const roomGroups = sessionRooms.map((room) => {
    const inRoom = nonDelegation.filter(
      (s) => assignedMap.get(s.id)?.roomId === room.id
    );

    const students = inRoom
      .filter((s) => !s.examStatus || s.examStatus === "")
      .map((s) => ({
        grade: s.grade,
        classNo: s.classNo,
        number: s.number,
        name: s.name,
        gender: s.gender || "",
        seatNumber: assignedMap.get(s.id).seatNumber,
      }));

    const specialInRoom = inRoom
      .filter((s) => s.examStatus === "special")
      .map((s) => ({
        grade: s.grade,
        classNo: s.classNo,
        number: s.number,
        name: s.name,
        gender: s.gender || "",
      }));

    const separateInRoom = inRoom
      .filter((s) => s.examStatus === "separate")
      .map((s) => ({
        grade: s.grade,
        classNo: s.classNo,
        number: s.number,
        name: s.name,
        gender: s.gender || "",
      }));

    return { roomId: room.id, roomName: room.name, students, specialInRoom, separateInRoom };
  });

  return { roomGroups, assignedMap };
}

/**
 * 전체 배치된 세션의 과목별 응시 현황 데이터 생성
 *
 * 반환 구조 (per session):
 *   { sessionId, subjectName, subjectCode, grade, isEssay,
 *     dayLabel, periodLabel, startTime, endTime,
 *     counts: { total, normal, special, separate, delegation },
 *     students: [{ grade, classNo, number, name, gender, examStatus, roomName, seatNumber }],
 *     specialStudents, separateStudents,
 *     roomGroups: [{ roomId, roomName, students, specialInRoom, separateInRoom }]
 *   }
 */
export function generateSubjectRosters(plan, students, enrollments, rooms, subjects) {
  if (!plan?.sessions?.length) return [];

  const placed = plan.sessions.filter((s) => s.dayId && s.periodId);

  return placed.map((session) => {
    const subject = subjects.find((s) => s.id === session.subjectId);
    const day = plan.days?.find((d) => d.id === session.dayId);
    const period = plan.periods?.find((p) => p.id === session.periodId);

    const allStudents = findStudentsForSession(session, students, enrollments, subjects);

    const special = allStudents.filter((s) => s.examStatus === "special");
    const separate = allStudents.filter((s) => s.examStatus === "separate");
    const delegation = allStudents.filter((s) => s.examStatus === "delegation");
    const normal = allStudents.filter((s) => !s.examStatus || s.examStatus === "");
    const nonDelegation = allStudents.filter((s) => s.examStatus !== "delegation");

    let roomGroups;
    let assignedMap;

    if (session.sectionMode === "section" && session.sectionRoomAssignments && Object.keys(session.sectionRoomAssignments).length > 0) {
      // Mode 2: 분반별로 roomGroups 구성
      const studentSection = new Map();
      for (const e of enrollments) {
        if (String(e.grade) !== String(session.grade)) continue;
        const matches = session.subjectId && e.subjectId
          ? e.subjectId === session.subjectId
          : e.subjectName === session.subjectName;
        if (matches && e.section) studentSection.set(e.studentId, e.section);
      }

      const mergedMap = new Map();
      const allSectionGroups = [];

      for (const sectionLetter of Object.keys(session.sectionRoomAssignments).sort()) {
        const sectionRoomIds = session.sectionRoomAssignments[sectionLetter];
        const sectionStudents = nonDelegation
          .filter((s) => studentSection.get(s.id) === sectionLetter)
          .sort((a, b) => {
            const cd = Number(a.classNo) - Number(b.classNo);
            return cd !== 0 ? cd : Number(a.number) - Number(b.number);
          });

        const { roomGroups: rgs, assignedMap: am } = autoAssignToRooms(sectionStudents, sectionRoomIds, rooms);
        am.forEach((v, k) => mergedMap.set(k, v));
        rgs.forEach((rg) => allSectionGroups.push({ ...rg, section: sectionLetter }));
      }

      // 분반 없는 학생 처리 (section 데이터 없는 경우 폴백)
      const unsectioned = nonDelegation.filter((s) => !studentSection.has(s.id));
      if (unsectioned.length > 0) {
        const allSectionRoomIds = [...new Set(Object.values(session.sectionRoomAssignments).flat())];
        const { roomGroups: rgs2, assignedMap: am2 } = autoAssignToRooms(unsectioned, allSectionRoomIds, rooms);
        am2.forEach((v, k) => mergedMap.set(k, v));
        rgs2.forEach((rg) => allSectionGroups.push(rg));
      }

      roomGroups = allSectionGroups;
      assignedMap = mergedMap;
    } else {
      // Mode 1: 기존 학번순 배분
      const { roomGroups: rg, assignedMap: am } = autoAssignToRooms(
        nonDelegation,
        session.roomIds || [],
        rooms,
      );
      roomGroups = rg;
      assignedMap = am;
    }

    // 과목별 현황표용: 전체 학생 + 배정 방 정보
    const studentsWithRoom = allStudents.map((s) => {
      const assigned = assignedMap.get(s.id);
      return {
        grade: s.grade,
        classNo: s.classNo,
        number: s.number,
        name: s.name,
        gender: s.gender || "",
        examStatus: s.examStatus || "",
        roomName: assigned?.roomName || "",
        seatNumber: assigned?.seatNumber ?? "",
      };
    });

    return {
      sessionId: session.id,
      subjectName: session.subjectName || "",
      subjectCode: subject?.subjectCode || "",
      grade: session.grade,
      isEssay: session.isEssay || false,
      sectionMode: session.sectionMode ?? "none",
      dayLabel: day?.label || "",
      periodLabel: period?.label || "",
      startTime: session.startTime || "",
      endTime: calcEndTime(session.startTime, session.duration),

      counts: {
        total: allStudents.length,
        normal: normal.length,
        special: special.length,
        separate: separate.length,
        delegation: delegation.length,
      },

      students: studentsWithRoom,
      specialStudents: special.map((s) => ({
        grade: s.grade,
        classNo: s.classNo,
        number: s.number,
        name: s.name,
        gender: s.gender || "",
      })),
      separateStudents: separate.map((s) => ({
        grade: s.grade,
        classNo: s.classNo,
        number: s.number,
        name: s.name,
        gender: s.gender || "",
      })),
      roomGroups,
    };
  });
}
