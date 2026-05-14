function RoomAssignmentPage({ sessions, rooms, roomWarnings, onUpdateRoomIds }) {
  const warningsBySessionId = Object.fromEntries(
    roomWarnings.map((warning) => [warning.sessionId, warning]),
  );

  const toggleRoom = (session, roomId) => {
    const nextRoomIds = session.roomIds.includes(roomId)
      ? session.roomIds.filter((value) => value !== roomId)
      : [...session.roomIds, roomId];

    onUpdateRoomIds(session.id, nextRoomIds);
  };

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">고사실 배정</p>
          <h2>과목별 고사실 선택</h2>
        </div>
      </div>

      <p className="page-copy">
        이 단계에서는 시험 일시를 보여주지 않습니다. 과목별 응시 인원과 고사실 수용 인원만
        보고 필요한 시험실을 체크합니다.
      </p>

      <div className="stack-grid">
        {["1", "2", "3"].map((grade) => {
          const gradeSessions = sessions.filter((session) => session.grade === grade);

          return (
            <article key={grade} className="section-block">
              <div className="section-head">
                <div>
                  <p className="eyebrow">{grade}학년</p>
                  <h3>{grade}학년 고사실 배정</h3>
                </div>
              </div>

              <div className="room-assignment-list">
                {gradeSessions.map((session) => {
                  const warning = warningsBySessionId[session.id];

                  return (
                    <div key={session.id} className="room-assignment-card">
                      <div className="section-head">
                        <div>
                          <p className="eyebrow">{session.subjectCode || "코드 미입력"}</p>
                          <h3>{session.subjectName || "과목명 미입력"}</h3>
                        </div>
                        <div className="card-meta compact-meta">
                          <span>응시 {session.studentCount}명</span>
                          <span>배정 {session.roomIds.length}실</span>
                        </div>
                      </div>

                      {warning ? <p className="login-error">{warning.message}</p> : null}

                      <div className="room-list">
                        {rooms.map((room) => (
                          <label key={`${session.id}:${room.id}`} className="room-option">
                            <input
                              type="checkbox"
                              checked={session.roomIds.includes(room.id)}
                              onChange={() => toggleRoom(session, room.id)}
                            />
                            <span>
                              {room.name} · 정원 {room.capacity}명
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default RoomAssignmentPage;
