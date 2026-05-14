import { getSessionOrderMap } from "./timeUtils";

function buildStudentSessionMap({ sessions, students, enrollments }) {
  const studentMap = Object.fromEntries(students.map((student) => [student.id, student]));
  const sessionsBySubject = Object.fromEntries(
    sessions.map((session) => [session.subjectId, session]),
  );

  return enrollments.reduce((acc, enrollment) => {
    const session = sessionsBySubject[enrollment.subjectId];
    const student = studentMap[enrollment.studentId];

    if (!session || !student || student.grade !== session.grade) {
      return acc;
    }

    acc[enrollment.studentId] ??= [];
    acc[enrollment.studentId].push(session);
    return acc;
  }, {});
}

export function calculateStudentStatusLists({
  sessions,
  students,
  enrollments,
  conflictStudentIds,
}) {
  const orderMap = getSessionOrderMap(sessions);
  const sessionMap = buildStudentSessionMap({ sessions, students, enrollments });
  const conflictSet = new Set(conflictStudentIds);

  const waitingStudents = [];
  const noExamStudents = [];
  const tripleStudents = [];
  const conflictingStudents = [];

  students.forEach((student) => {
    const studentSessions = (sessionMap[student.id] ?? []).slice().sort((left, right) => {
      if (left.dayId !== right.dayId) {
        return left.dayId.localeCompare(right.dayId);
      }

      return left.startTime.localeCompare(right.startTime);
    });

    if (studentSessions.length === 0) {
      noExamStudents.push(student);
      return;
    }

    if (conflictSet.has(student.id)) {
      conflictingStudents.push(student);
    }

    const groupedByDay = studentSessions.reduce((acc, session) => {
      acc[session.dayId] ??= [];
      acc[session.dayId].push(orderMap[session.id]);
      return acc;
    }, {});

    const hasWaiting = Object.values(groupedByDay).some((orders) => {
      const sorted = orders.slice().sort((left, right) => left - right);
      return sorted.some((order, index) => index > 0 && order - sorted[index - 1] > 1);
    });

    if (hasWaiting) {
      waitingStudents.push(student);
    }

    const hasTriple = Object.values(groupedByDay).some((orders) => {
      const unique = [...new Set(orders)].sort((left, right) => left - right);
      let streak = 1;

      for (let index = 1; index < unique.length; index += 1) {
        streak = unique[index] === unique[index - 1] + 1 ? streak + 1 : 1;
        if (streak >= 3) {
          return true;
        }
      }

      return false;
    });

    if (hasTriple) {
      tripleStudents.push(student);
    }
  });

  return {
    waitingStudents,
    noExamStudents,
    tripleStudents,
    conflictingStudents,
  };
}

export function summarizeMetrics({
  waitingStudents,
  noExamStudents,
  tripleStudents,
  conflictingStudents,
  roomWarnings,
}) {
  return [
    {
      key: "waitingStudents",
      label: "대기 학생",
      value: waitingStudents.length,
      description: "중간 공강이 생기는 학생 수",
    },
    {
      key: "noExamStudents",
      label: "무시험 학생",
      value: noExamStudents.length,
      description: "해당 기간 중 시험이 없는 학생 수",
    },
    {
      key: "tripleStudents",
      label: "3연속 시험",
      value: tripleStudents.length,
      description: "같은 날 3교시 연속 시험 학생 수",
    },
    {
      key: "conflictingStudents",
      label: "충돌 학생",
      value: conflictingStudents.length,
      description: "동일 시간대 중복 시험 학생 수",
    },
    {
      key: "roomWarnings",
      label: "고사실 경고",
      value: roomWarnings.length,
      description: "수용 인원 초과 또는 임계 경고",
    },
  ];
}

export function buildSessionMetrics({ sessions, enrollments, conflictReport }) {
  const conflictCountBySubject = conflictReport.conflicts.reduce((acc, conflict) => {
    conflict.sessions.forEach((subjectName) => {
      acc[subjectName] = (acc[subjectName] ?? 0) + 1;
    });
    return acc;
  }, {});

  const countBySubjectId = enrollments.reduce((acc, enrollment) => {
    acc[enrollment.subjectId] = (acc[enrollment.subjectId] ?? 0) + 1;
    return acc;
  }, {});

  return sessions.reduce((acc, session) => {
    acc[session.id] = {
      studentCount: countBySubjectId[session.subjectId] ?? 0,
      conflictCount: conflictCountBySubject[session.subjectName] ?? 0,
    };
    return acc;
  }, {});
}
