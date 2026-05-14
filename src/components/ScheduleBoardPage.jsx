import { Fragment } from "react";
import { addMinutes, buildTimeSlots } from "../utils/timeUtils";

const gradeOptions = ["1", "2", "3"];
const periodConfigs = [
  { id: "period-1", label: "1교시", defaultStart: "08:30", start: "08:00", end: "10:00" },
  { id: "period-2", label: "2교시", defaultStart: "10:10", start: "09:30", end: "12:00" },
  { id: "period-3", label: "3교시", defaultStart: "11:30", start: "11:00", end: "14:00" },
];

function buildSubjectStudentMap({ students, enrollments, sessions }) {
  const studentMap = Object.fromEntries(students.map((student) => [student.id, student]));
  const sessionMap = Object.fromEntries(sessions.map((session) => [session.subjectId, session]));

  return enrollments.reduce((acc, enrollment) => {
    const student = studentMap[enrollment.studentId];
    const session = sessionMap[enrollment.subjectId];

    if (!student || !session || student.grade !== session.grade) {
      return acc;
    }

    acc[enrollment.subjectId] ??= new Set();
    acc[enrollment.subjectId].add(enrollment.studentId);
    return acc;
  }, {});
}

function hasOverlap(setA = new Set(), setB = new Set()) {
  for (const value of setA) {
    if (setB.has(value)) {
      return true;
    }
  }
  return false;
}

function getAllowedStartTimes(period, duration) {
  return buildTimeSlots(period.start, period.end, 5).filter((time) => {
    const endTime = addMinutes(time, duration);
    return endTime <= period.end;
  });
}

function ScheduleBoardPage({
  days,
  sessions,
  students,
  enrollments,
  roomWarnings,
  onMove,
  onSessionChange,
}) {
  const warningBySessionId = Object.fromEntries(
    roomWarnings.map((warning) => [warning.sessionId, warning]),
  );
  const subjectStudentMap = buildSubjectStudentMap({ students, enrollments, sessions });

  const getCompatibleSessions = ({ dayId, periodId, grade, excludeSessionIds }) => {
    const placedSessions = sessions.filter(
      (session) =>
        session.dayId === dayId &&
        session.periodId === periodId &&
        session.grade === grade &&
        !excludeSessionIds.includes(session.id),
    );
    const placedSubjectIds = placedSessions.map((session) => session.subjectId);

    return sessions.filter((candidate) => {
      if (candidate.grade !== grade || excludeSessionIds.includes(candidate.id)) {
        return false;
      }

      if (candidate.dayId === dayId && candidate.periodId === periodId) {
        return false;
      }

      if (placedSubjectIds.length === 0) {
        return false;
      }

      const candidateStudents = subjectStudentMap[candidate.subjectId] ?? new Set();
      return placedSessions.every((session) => {
        const placedStudents = subjectStudentMap[session.subjectId] ?? new Set();
        return !hasOverlap(candidateStudents, placedStudents);
      });
    });
  };

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">일정 배치</p>
          <h2>교시 기반 배치 보드</h2>
        </div>
      </div>

      <p className="page-copy">
        과목 카드를 날짜와 교시에 먼저 배치하고, 배치된 카드 안에서 시작 시간을 직접
        선택합니다. 종료 시간은 시험 시간에 따라 자동 계산됩니다.
      </p>

      <div className="schedule-layout period-layout">
        <aside className="schedule-palette">
          <div className="section-head">
            <div>
              <p className="eyebrow">대기 카드</p>
              <h3>전체 시험 카드</h3>
            </div>
          </div>
          <div className="stack-grid">
            {gradeOptions.map((grade) => {
              const gradeSessions = sessions.filter((session) => session.grade === grade);

              return (
                <div key={`palette:${grade}`} className="palette-group">
                  <p className="eyebrow">{grade}학년</p>
                  <div className="mini-card-list">
                    {gradeSessions.map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        draggable
                        className={`mini-exam-card ${warningBySessionId[session.id] ? "warning" : ""}`}
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", session.id);
                        }}
                      >
                        <strong>{session.subjectName || "과목명 미입력"}</strong>
                        <span>{session.duration}분 · {session.studentCount}명</span>
                        <span>
                          {session.dayId && session.periodId
                            ? `${session.dateLabel} ${periodConfigs.find((period) => period.id === session.periodId)?.label ?? ""}`
                            : "미배치"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <div className="schedule-board">
          {days.map((day) => (
            <article key={day.id} className="day-board">
              <div className="section-head">
                <div>
                  <p className="eyebrow">시험일</p>
                  <h3>{day.label}</h3>
                </div>
              </div>

              <div className="period-grid">
                <div className="period-grid-head period-grid-corner">교시</div>
                {gradeOptions.map((grade) => (
                  <div key={`${day.id}:grade:${grade}`} className="period-grid-head">
                    {grade}학년
                  </div>
                ))}

                {periodConfigs.map((period) => (
                  <Fragment key={`${day.id}:${period.id}`}>
                    <div key={`${day.id}:${period.id}:label`} className="period-label">
                      <strong>{period.label}</strong>
                    </div>

                    {gradeOptions.map((grade) => {
                      const periodSessions = sessions.filter(
                        (session) =>
                          session.dayId === day.id &&
                          session.periodId === period.id &&
                          session.grade === grade,
                      );
                      const recommendedSessions = getCompatibleSessions({
                        dayId: day.id,
                        periodId: period.id,
                        grade,
                        excludeSessionIds: periodSessions.map((session) => session.id),
                      });

                      return (
                        <div
                          key={`${day.id}:${period.id}:${grade}`}
                          className="period-cell"
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            event.preventDefault();
                            const sessionId = event.dataTransfer.getData("text/plain");
                            const session = sessions.find((item) => item.id === sessionId);
                            const defaultStart = getAllowedStartTimes(
                              period,
                              session?.duration ?? 50,
                            )[0] ?? period.defaultStart;

                            onMove(sessionId, {
                              dayId: day.id,
                              grade,
                              periodId: period.id,
                              startTime: defaultStart,
                              dateLabel: day.label,
                            });
                          }}
                        >
                          <div className="period-cell-grid" />

                          <div className="period-card-stack">
                            {periodSessions.map((session) => {
                              const warning = warningBySessionId[session.id];
                              const startOptions = getAllowedStartTimes(period, session.duration);
                              const startTime = session.startTime || startOptions[0] || period.defaultStart;
                              const endTime = addMinutes(startTime, session.duration);

                              return (
                                <div
                                  key={session.id}
                                  className={`period-card ${warning ? "warning" : ""}`}
                                >
                                  <div className="period-card-times">
                                    <span>{startTime}</span>
                                    <span>{endTime}</span>
                                  </div>
                                  <strong className="period-card-title">
                                    {session.subjectName || "과목명 미입력"}
                                  </strong>
                                  <div className="period-card-meta">
                                    <span>{session.duration}분</span>
                                    <span>{session.studentCount}명</span>
                                    <span>{startTime} - {endTime}</span>
                                  </div>
                                  <div className="period-card-controls">
                                    <label>
                                      <span>시작</span>
                                      <select
                                        value={startTime}
                                        onChange={(event) =>
                                          onSessionChange(session.id, {
                                            startTime: event.target.value,
                                            periodId: period.id,
                                          })
                                        }
                                      >
                                        {startOptions.map((time) => (
                                          <option key={`${session.id}:${time}`} value={time}>
                                            {time}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <div className="period-card-endtime">
                                      <span>종료</span>
                                      <strong>{endTime}</strong>
                                    </div>
                                  </div>
                                  {warning ? <p className="period-card-warning">{warning.message}</p> : null}
                                </div>
                              );
                            })}
                          </div>

                          {recommendedSessions.length > 0 ? (
                            <div className="recommend-box">
                              <p>같은 교시 배치 가능</p>
                              <div className="recommend-chip-list">
                                {recommendedSessions.map((session) => (
                                  <button
                                    key={`recommend:${day.id}:${period.id}:${grade}:${session.id}`}
                                    type="button"
                                    className="chip"
                                    onClick={() => {
                                      const defaultStart = getAllowedStartTimes(
                                        period,
                                        session.duration,
                                      )[0] ?? period.defaultStart;
                                      onMove(session.id, {
                                        dayId: day.id,
                                        grade,
                                        periodId: period.id,
                                        startTime: defaultStart,
                                        dateLabel: day.label,
                                      });
                                    }}
                                  >
                                    {session.subjectName}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ScheduleBoardPage;
