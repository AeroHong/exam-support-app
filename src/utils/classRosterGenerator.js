// 학급별 고사 명렬 / 대기실 명렬 / 학생 개인별 시간표 데이터 생성

/**
 * 학급별 학생 고사 명렬 데이터 생성
 *
 * @returns [
 *   { grade, classNo,
 *     sessions: [{ sessionId, dayLabel, periodLabel, subjectName, startTime, endTime }],
 *     students: [{ number, name, gender, assignments: Map<sessionId, { subjectName, roomName, seatNumber, examStatus }> }]
 *   }
 * ]
 */
export function generateClassRosters(subjectRosters, allStudents, plan) {
  const dayOrder = new Map(plan?.days?.map((d, i) => [d.id, i]) ?? []);
  const periodOrder = new Map(plan?.periods?.map((p, i) => [p.id, i]) ?? []);

  // 세션을 day → period 순으로 정렬
  const sortedRosters = [...subjectRosters].sort((a, b) => {
    const sa = plan?.sessions?.find((s) => s.id === a.sessionId);
    const sb = plan?.sessions?.find((s) => s.id === b.sessionId);
    const da = dayOrder.get(sa?.dayId) ?? 99;
    const db = dayOrder.get(sb?.dayId) ?? 99;
    if (da !== db) return da - db;
    return (periodOrder.get(sa?.periodId) ?? 99) - (periodOrder.get(sb?.periodId) ?? 99);
  });

  // "grade-classNo-number" → Map<sessionId, { subjectName, roomName, seatNumber, examStatus }>
  const assignmentMap = new Map();
  sortedRosters.forEach((roster) => {
    roster.students.forEach((s) => {
      const key = `${s.grade}-${s.classNo}-${s.number}`;
      if (!assignmentMap.has(key)) assignmentMap.set(key, new Map());
      assignmentMap.get(key).set(roster.sessionId, {
        subjectName: roster.subjectName,
        roomName: s.roomName || "",
        seatNumber: s.seatNumber,
        examStatus: s.examStatus || "",
      });
    });
  });

  // 학년별 세션 목록
  const sessionsByGrade = new Map();
  sortedRosters.forEach((roster) => {
    const g = String(roster.grade);
    if (!sessionsByGrade.has(g)) sessionsByGrade.set(g, []);
    sessionsByGrade.get(g).push({
      sessionId: roster.sessionId,
      dayLabel: roster.dayLabel,
      periodLabel: roster.periodLabel,
      subjectName: roster.subjectName,
      startTime: roster.startTime,
      endTime: roster.endTime,
    });
  });

  // 학급별 학생 그룹화
  const classMap = new Map();
  allStudents.forEach((student) => {
    const ck = `${student.grade}-${student.classNo}`;
    if (!classMap.has(ck)) {
      classMap.set(ck, { grade: student.grade, classNo: student.classNo, students: [] });
    }
    const sk = `${student.grade}-${student.classNo}-${student.number}`;
    classMap.get(ck).students.push({
      number: student.number,
      name: student.name,
      gender: student.gender || "",
      assignments: assignmentMap.get(sk) || new Map(),
    });
  });

  const result = [];
  classMap.forEach(({ grade, classNo, students }) => {
    students.sort((a, b) => Number(a.number) - Number(b.number));
    result.push({
      grade,
      classNo,
      sessions: sessionsByGrade.get(String(grade)) || [],
      students,
    });
  });

  result.sort((a, b) => {
    const gd = Number(a.grade) - Number(b.grade);
    return gd !== 0 ? gd : Number(a.classNo) - Number(b.classNo);
  });

  return result;
}

/**
 * 대기실 학생 명렬 데이터 생성
 * 교시별로 시험이 없는 학생을 학급별로 그룹화
 * (위탁/도움실/별도실 포함 시험 배정된 학생은 모두 제외)
 *
 * @returns [
 *   { dayLabel, periodLabel, startTime, endTime,
 *     classes: [{ grade, classNo, students: [{ number, name, gender }] }]
 *   }
 * ]
 */
export function generateWaitingRosters(subjectRosters, allStudents, plan) {
  const dayOrder = new Map(plan?.days?.map((d, i) => [d.id, i]) ?? []);
  const periodOrder = new Map(plan?.periods?.map((p, i) => [p.id, i]) ?? []);

  // 교시별 응시 학생 집합 + 학생별 실제 응시 교시 목록
  const periodMap = new Map();
  // studentKey → Set<"dayId__periodId"> (위탁 제외 실제 시험만)
  const studentExamPeriods = new Map();

  subjectRosters.forEach((roster) => {
    const session = plan?.sessions?.find((s) => s.id === roster.sessionId);
    if (!session) return;
    const key = `${session.dayId}__${session.periodId}`;

    if (!periodMap.has(key)) {
      periodMap.set(key, {
        dayId: session.dayId,
        periodId: session.periodId,
        dayLabel: roster.dayLabel,
        periodLabel: roster.periodLabel,
        startTime: roster.startTime,
        endTime: roster.endTime,
        examKeys: new Set(),
      });
    }

    roster.students.forEach((s) => {
      const sk = `${s.grade}-${s.classNo}-${s.number}`;
      // 이 교시 응시자 집합 (위탁 포함 전체 — 어차피 학교에 없으므로 대기실 제외용)
      periodMap.get(key).examKeys.add(sk);
      // 위탁 제외 실제 응시 학생만 → 이후 교시 판단에 사용
      if (s.examStatus !== "delegation") {
        if (!studentExamPeriods.has(sk)) studentExamPeriods.set(sk, new Set());
        studentExamPeriods.get(sk).add(key);
      }
    });
  });

  const sortedPeriods = [...periodMap.values()].sort((a, b) => {
    const da = dayOrder.get(a.dayId) ?? 99;
    const db = dayOrder.get(b.dayId) ?? 99;
    if (da !== db) return da - db;
    return (periodOrder.get(a.periodId) ?? 99) - (periodOrder.get(b.periodId) ?? 99);
  });

  return sortedPeriods
    .map(({ dayId, periodId, examKeys, ...info }) => {
      const curPeriodIdx = periodOrder.get(periodId) ?? 99;

      const classMap = new Map();
      allStudents.forEach((student) => {
        if (student.examStatus === "delegation") return; // 위탁은 학교에 없음

        const sk = `${student.grade}-${student.classNo}-${student.number}`;
        if (examKeys.has(sk)) return; // 이 교시 시험 응시 중

        // 같은 날 이후 교시에 시험이 있어야 대기실 대상 (하교 학생 제외)
        const examPeriods = studentExamPeriods.get(sk) ?? new Set();
        const hasLaterExamToday = [...examPeriods].some((pk) => {
          const [pDay, pPeriod] = pk.split("__");
          return pDay === dayId && (periodOrder.get(pPeriod) ?? 99) > curPeriodIdx;
        });
        if (!hasLaterExamToday) return;

        const ck = `${student.grade}-${student.classNo}`;
        if (!classMap.has(ck)) {
          classMap.set(ck, { grade: student.grade, classNo: student.classNo, students: [] });
        }
        classMap.get(ck).students.push({
          number: student.number,
          name: student.name,
          gender: student.gender || "",
        });
      });

      const classes = [...classMap.values()]
        .map((cls) => ({
          ...cls,
          students: cls.students.sort((a, b) => Number(a.number) - Number(b.number)),
        }))
        .sort((a, b) => {
          const gd = Number(a.grade) - Number(b.grade);
          return gd !== 0 ? gd : Number(a.classNo) - Number(b.classNo);
        });

      return { ...info, periodKey: `${dayId}__${periodId}`, classes };
    })
    .filter((p) => p.classes.length > 0); // 대기 학생 없는 교시 제외
}

/**
 * 학생 개인별 시험 시간표 데이터 생성
 *
 * @returns [{
 *   grade, classNo, number, name, gender,
 *   exams: [{ dayLabel, periodLabel, startTime, endTime, subjectName, roomName, seatNumber, examStatus }]
 * }]
 */
export function generateStudentTimetables(subjectRosters, allStudents, plan) {
  const dayOrder  = new Map(plan?.days?.map((d, i) => [d.id, i]) ?? []);
  const periodOrder = new Map(plan?.periods?.map((p, i) => [p.id, i]) ?? []);

  const sortedRosters = [...subjectRosters].sort((a, b) => {
    const sa = plan?.sessions?.find((s) => s.id === a.sessionId);
    const sb = plan?.sessions?.find((s) => s.id === b.sessionId);
    const da = dayOrder.get(sa?.dayId) ?? 99;
    const db = dayOrder.get(sb?.dayId) ?? 99;
    if (da !== db) return da - db;
    return (periodOrder.get(sa?.periodId) ?? 99) - (periodOrder.get(sb?.periodId) ?? 99);
  });

  // grade-classNo-number → 시험 목록
  const examMap = new Map();
  sortedRosters.forEach((roster) => {
    roster.students.forEach((s) => {
      const key = `${s.grade}-${s.classNo}-${s.number}`;
      if (!examMap.has(key)) examMap.set(key, []);
      examMap.get(key).push({
        dayLabel:    roster.dayLabel,
        periodLabel: roster.periodLabel,
        startTime:   roster.startTime,
        endTime:     roster.endTime,
        subjectName: roster.subjectName,
        roomName:    s.roomName    || "",
        seatNumber:  s.seatNumber  ?? "",
        examStatus:  s.examStatus  || "",
      });
    });
  });

  return allStudents
    .filter((s) => s.examStatus !== "delegation")
    .map((s) => ({
      grade:      s.grade,
      classNo:    s.classNo,
      number:     s.number,
      name:       s.name,
      gender:     s.gender || "",
      examStatus: s.examStatus || "",
      exams: examMap.get(`${s.grade}-${s.classNo}-${s.number}`) || [],
    }))
    .sort((a, b) => {
      const gd = Number(a.grade) - Number(b.grade);
      if (gd !== 0) return gd;
      const cd = Number(a.classNo) - Number(b.classNo);
      return cd !== 0 ? cd : Number(a.number) - Number(b.number);
    });
}
