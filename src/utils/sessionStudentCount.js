/**
 * 세션의 응시 인원수 재계산 (위탁 학생 제외)
 * 지정과목: 해당 학년 전체 학생 중 위탁 제외
 * 선택과목: enrollment 기반 수강생 중 위탁 제외
 */
export function recalcSessionStudentCount(session, students, enrollments) {
  if (session.isRequired) {
    return students.filter(
      (s) => String(s.grade) === String(session.grade) && s.examStatus !== "delegation"
    ).length;
  }

  const norm = (s) => (s ?? "").replace(/\s+/g, "").toLowerCase();

  const enrolledStudentIds = new Set(
    enrollments
      .filter(
        (e) =>
          String(e.grade) === String(session.grade) &&
          ((e.subjectId && e.subjectId === session.subjectId) ||
            (!e.subjectId && norm(e.subjectName) === norm(session.subjectName)))
      )
      .map((e) => e.studentId)
  );

  return students.filter(
    (s) => enrolledStudentIds.has(s.id) && s.examStatus !== "delegation"
  ).length;
}
