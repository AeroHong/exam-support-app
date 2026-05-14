import { rangesOverlap } from "./timeUtils";

export function buildConflictReport({ sessions, students, enrollments }) {
  const studentMap = Object.fromEntries(students.map((student) => [student.id, student]));
  const sessionsBySubject = Object.fromEntries(
    sessions.map((session) => [session.subjectId, session]),
  );

  const sessionsByStudent = enrollments.reduce((acc, enrollment) => {
    const session = sessionsBySubject[enrollment.subjectId];
    const student = studentMap[enrollment.studentId];

    if (!session || !student || student.grade !== session.grade) {
      return acc;
    }

    acc[enrollment.studentId] ??= [];
    acc[enrollment.studentId].push(session);
    return acc;
  }, {});

  const conflicts = [];
  const conflictStudentIds = new Set();

  Object.entries(sessionsByStudent).forEach(([studentId, studentSessions]) => {
    for (let index = 0; index < studentSessions.length; index += 1) {
      for (let cursor = index + 1; cursor < studentSessions.length; cursor += 1) {
        const left = studentSessions[index];
        const right = studentSessions[cursor];

        if (
          left.dayId === right.dayId &&
          rangesOverlap(left.startTime, left.duration, right.startTime, right.duration)
        ) {
          conflictStudentIds.add(studentId);
          conflicts.push({
            studentId,
            studentName: studentMap[studentId].name,
            sessions: [left.subjectName, right.subjectName],
            startTimes: [left.startTime, right.startTime],
          });
        }
      }
    }
  });

  return {
    conflicts,
    conflictStudentIds: [...conflictStudentIds],
  };
}
