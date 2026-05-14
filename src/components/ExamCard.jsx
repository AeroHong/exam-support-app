import { addMinutes } from "../utils/timeUtils";

function ExamCard({ session, metrics, roomWarning, onAssignRoom }) {
  return (
    <article className="exam-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">
            {session.grade}학년 · {session.subjectCode}
          </p>
          <h3>{session.subjectName}</h3>
        </div>
        <div className="card-badges">
          <span className={`card-badge ${session.isEssay ? "badge-essay" : "badge-normal"}`}>
            {session.isEssay ? "서논술" : "일반"}
          </span>
          <span className={`card-badge ${roomWarning ? "badge-danger" : "badge-safe"}`}>
            {roomWarning ? "고사실 경고" : "안정"}
          </span>
        </div>
      </div>

      <div className="card-meta">
        <span>{session.dateLabel}</span>
        <span>
          {session.startTime} - {addMinutes(session.startTime, session.duration)}
        </span>
        <span>응시 {metrics?.studentCount ?? session.studentCount}명</span>
        <span>배정 고사실 {session.roomIds.length}개</span>
      </div>

      <div className="card-meta">
        <strong>즉시 검증</strong>
        <span>학생 충돌 {metrics?.conflictCount ?? 0}건</span>
        {roomWarning ? <span>{roomWarning.message}</span> : <span>수용 인원 범위 정상</span>}
      </div>

      <button type="button" className="secondary-button" onClick={onAssignRoom}>
        고사실 배정 수정
      </button>
    </article>
  );
}

export default ExamCard;
