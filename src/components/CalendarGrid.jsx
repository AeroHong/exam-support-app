import { addMinutes } from "../utils/timeUtils";

const gradeOptions = ["2", "3"];
const startTimeOptions = ["08:30", "09:20", "10:10", "11:00", "11:50"];

function CalendarGrid({ days, sessions, onMove }) {
  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">반자동 배치</p>
          <h2>시험 일정 캘린더</h2>
        </div>
      </div>

      <div className="calendar-columns">
        {days.map((day) => {
          const daySessions = sessions
            .filter((session) => session.dayId === day.id)
            .sort((left, right) => left.startTime.localeCompare(right.startTime));

          return (
            <article key={day.id} className="day-column exam-card">
              <div>
                <p className="eyebrow">시험일</p>
                <h3>{day.label}</h3>
              </div>

              <div className="slot-list">
                {daySessions.map((session) => (
                  <div key={session.id} className="slot-item">
                    <strong>
                      {session.subjectName} ({session.grade}학년)
                    </strong>
                    <span>
                      {session.startTime} - {addMinutes(session.startTime, session.duration)}
                    </span>
                    <div className="slot-actions">
                      {gradeOptions.map((grade) => (
                        <button
                          key={`${session.id}:${grade}`}
                          type="button"
                          className="text-button"
                          onClick={() =>
                            onMove(session.id, { dayId: day.id, grade, startTime: session.startTime })
                          }
                        >
                          {grade}학년 칸으로
                        </button>
                      ))}
                    </div>
                    <div className="slot-actions">
                      {startTimeOptions.map((time) => (
                        <button
                          key={`${session.id}:${time}`}
                          type="button"
                          className="text-button"
                          onClick={() =>
                            onMove(session.id, { dayId: day.id, grade: session.grade, startTime: time })
                          }
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default CalendarGrid;
