import { useEffect, useState } from "react";

function RoomAssignModal({ open, session, rooms, onClose, onSave }) {
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);

  useEffect(() => {
    setSelectedRoomIds(session?.roomIds ?? []);
  }, [session]);

  if (!open || !session) {
    return null;
  }

  const toggleRoom = (roomId) => {
    setSelectedRoomIds((current) =>
      current.includes(roomId)
        ? current.filter((value) => value !== roomId)
        : [...current, roomId],
    );
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-shell"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">고사실 수동 배정</p>
        <h3>{session.subjectName}</h3>
        <p>{session.studentCount}명 기준으로 여러 고사실을 합산 배정할 수 있습니다.</p>

        <div className="room-list">
          {rooms.map((room) => (
            <label key={room.id} className="room-option">
              <input
                type="checkbox"
                checked={selectedRoomIds.includes(room.id)}
                onChange={() => toggleRoom(room.id)}
              />
              <span>
                {room.name} · 정원 {room.capacity}명
              </span>
            </label>
          ))}
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            취소
          </button>
          <button type="button" className="primary-button" onClick={() => onSave(selectedRoomIds)}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoomAssignModal;
