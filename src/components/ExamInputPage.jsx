import { useEffect, useMemo, useState } from "react";

function createEmptySourceRow() {
  return {
    id: `row-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    grade: "1",
    classNo: "",
    studentNo: "",
    studentName: "",
    subjectName: "",
    subjectCode: "",
    isRequired: false,
  };
}

function slugify(value) {
  return (value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-가-힣]/g, "");
}

function buildInitialRows({ students, enrollments, sessions }) {
  const studentMap = Object.fromEntries(students.map((student) => [student.id, student]));
  const subjectMeta = Object.fromEntries(
    sessions.map((session) => [
      session.subjectId,
      {
        subjectName: session.subjectName,
        subjectCode: session.subjectCode,
        isRequired: Boolean(session.isRequired),
      },
    ]),
  );

  const rows = enrollments.map((enrollment, index) => {
    const student = studentMap[enrollment.studentId];
    const meta = subjectMeta[enrollment.subjectId] ?? {};

    return {
      id: `seed-row-${index}`,
      grade: student?.grade ?? "1",
      classNo: student?.classNo ?? "",
      studentNo: student?.studentNo ?? "",
      studentName: student?.name ?? "",
      subjectName: meta.subjectName ?? enrollment.subjectId,
      subjectCode: meta.subjectCode ?? "",
      isRequired: meta.isRequired ?? false,
    };
  });

  return rows.length > 0 ? rows : [createEmptySourceRow()];
}

function buildGeneratedData(rows, existingSessions) {
  const cleanRows = rows.filter(
    (row) => row.grade && row.studentName.trim() && row.subjectName.trim(),
  );

  const studentsByKey = {};
  const subjectMap = {};

  cleanRows.forEach((row) => {
    const studentKey = `${row.grade}:${row.classNo}:${row.studentNo}:${row.studentName}`;
    studentsByKey[studentKey] = {
      id: `student-${slugify(studentKey)}`,
      grade: row.grade,
      classNo: row.classNo || "",
      studentNo: row.studentNo || "",
      name: row.studentName,
    };

    const subjectKey = `${row.grade}:${row.subjectCode || row.subjectName}`;
    subjectMap[subjectKey] ??= {
      grade: row.grade,
      subjectName: row.subjectName,
      subjectCode: row.subjectCode || "",
      isRequired: false,
      studentKeys: new Set(),
      classSet: new Set(),
    };
    subjectMap[subjectKey].isRequired ||= row.isRequired;
    subjectMap[subjectKey].studentKeys.add(studentKey);
    if (row.classNo) {
      subjectMap[subjectKey].classSet.add(row.classNo);
    }
  });

  const students = Object.values(studentsByKey);
  const studentsByGrade = students.reduce((acc, student) => {
    acc[student.grade] ??= [];
    acc[student.grade].push(student);
    return acc;
  }, {});

  const enrollments = [];
  const sessions = Object.entries(subjectMap).map(([subjectKey, subject], index) => {
    const matchedSession =
      existingSessions.find(
        (session) =>
          session.grade === subject.grade &&
          (session.subjectCode === subject.subjectCode || session.subjectName === subject.subjectName),
      ) ?? {};

    const subjectId = matchedSession.subjectId || `subject-${slugify(subjectKey)}`;
    const applicableStudents = subject.isRequired
      ? studentsByGrade[subject.grade] ?? []
      : [...subject.studentKeys].map((studentKey) => studentsByKey[studentKey]);

    applicableStudents.forEach((student) => {
      if (!student) {
        return;
      }
      enrollments.push({
        studentId: student.id,
        subjectId,
      });
    });

    return {
      id: matchedSession.id || `session-auto-${index + 1}`,
      subjectId,
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode,
      grade: subject.grade,
      dayId: matchedSession.dayId ?? "",
      dateLabel: matchedSession.dateLabel ?? "미배치",
      periodId: matchedSession.periodId ?? "",
      startTime: matchedSession.startTime ?? "",
      duration: matchedSession.duration ?? 50,
      studentCount: applicableStudents.length,
      isEssay: matchedSession.isEssay ?? false,
      isRequired: subject.isRequired,
      roomIds: matchedSession.roomIds ?? [],
      classSummary: subject.isRequired
        ? [...new Set((studentsByGrade[subject.grade] ?? []).map((student) => student.classNo))]
            .filter(Boolean)
            .sort()
            .join(", ")
        : [...subject.classSet].sort().join(", "),
    };
  });

  return {
    rows: cleanRows,
    students,
    enrollments,
    sessions: sessions.sort((left, right) => {
      if (left.grade !== right.grade) {
        return left.grade.localeCompare(right.grade);
      }
      return left.subjectName.localeCompare(right.subjectName);
    }),
  };
}

function ExamInputPage({
  students,
  enrollments,
  sessions,
  onApplyGenerated,
}) {
  const [sourceRows, setSourceRows] = useState(() =>
    buildInitialRows({ students, enrollments, sessions }),
  );

  useEffect(() => {
    setSourceRows(buildInitialRows({ students, enrollments, sessions }));
  }, [students, enrollments, sessions]);

  const generated = useMemo(
    () => buildGeneratedData(sourceRows, sessions),
    [sourceRows, sessions],
  );

  const updateRow = (rowId, patch) => {
    setSourceRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    );
  };

  return (
    <section className="dense-page">
      <div className="dense-page-header">
        <div>
          <p className="eyebrow">시험 입력</p>
          <h2>학생 과목 원본 입력 후 시험표 자동 생성</h2>
        </div>
        <div className="filter-row">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setSourceRows((current) => [...current, createEmptySourceRow()])}
          >
            입력 행 추가
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() =>
              onApplyGenerated({
                students: generated.students,
                enrollments: generated.enrollments,
                sessions: generated.sessions,
              })
            }
          >
            자동 생성 적용
          </button>
        </div>
      </div>

      <div className="dense-grid">
        <section className="dense-panel">
          <div className="section-head compact-head">
            <div>
              <p className="eyebrow">원본 입력</p>
              <h3>학생, 학급, 과목, 지정과목 여부</h3>
            </div>
          </div>

          <div className="input-table-wrap">
            <table className="input-table compact-table">
              <thead>
                <tr>
                  <th>학년</th>
                  <th>반</th>
                  <th>학번</th>
                  <th>학생명</th>
                  <th>과목명</th>
                  <th>코드</th>
                  <th>지정과목</th>
                  <th>삭제</th>
                </tr>
              </thead>
              <tbody>
                {sourceRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <select
                        value={row.grade}
                        onChange={(event) => updateRow(row.id, { grade: event.target.value })}
                      >
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                      </select>
                    </td>
                    <td>
                      <input
                        value={row.classNo}
                        onChange={(event) => updateRow(row.id, { classNo: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        value={row.studentNo}
                        onChange={(event) => updateRow(row.id, { studentNo: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        value={row.studentName}
                        onChange={(event) => updateRow(row.id, { studentName: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        value={row.subjectName}
                        onChange={(event) => updateRow(row.id, { subjectName: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        value={row.subjectCode}
                        onChange={(event) => updateRow(row.id, { subjectCode: event.target.value })}
                      />
                    </td>
                    <td>
                      <label className="inline-check">
                        <input
                          type="checkbox"
                          checked={row.isRequired}
                          onChange={(event) => updateRow(row.id, { isRequired: event.target.checked })}
                        />
                        <span>전체수강</span>
                      </label>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="text-button danger-button"
                        onClick={() =>
                          setSourceRows((current) => current.filter((item) => item.id !== row.id))
                        }
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="dense-panel">
          <div className="section-head compact-head">
            <div>
              <p className="eyebrow">자동 생성 결과</p>
              <h3>학년별 시험 편성 표</h3>
            </div>
          </div>

          <div className="auto-summary-strip">
            <span>학생 {generated.students.length}명</span>
            <span>수강 {generated.enrollments.length}건</span>
            <span>시험 과목 {generated.sessions.length}개</span>
          </div>

          <div className="input-table-wrap">
            <table className="input-table compact-table generated-table">
              <thead>
                <tr>
                  <th>학년</th>
                  <th>과목명</th>
                  <th>코드</th>
                  <th>반</th>
                  <th>응시생</th>
                  <th>지정과목</th>
                  <th>시간</th>
                  <th>서논술</th>
                </tr>
              </thead>
              <tbody>
                {generated.sessions.map((session) => (
                  <tr key={session.id}>
                    <td>{session.grade}</td>
                    <td>{session.subjectName}</td>
                    <td>{session.subjectCode || "-"}</td>
                    <td>{session.classSummary || "-"}</td>
                    <td>{session.studentCount}</td>
                    <td>{session.isRequired ? "예" : "아니오"}</td>
                    <td>{session.duration}분</td>
                    <td>{session.isEssay ? "예" : "아니오"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}

export default ExamInputPage;
