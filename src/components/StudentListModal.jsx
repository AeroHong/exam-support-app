function StudentListModal({ open, metricKey, students, titleMap, onClose }) {
  if (!open || !metricKey) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-shell"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">상세 목록</p>
        <h3>{titleMap[metricKey] ?? "학생 목록"}</h3>

        <div className="slot-list">
          {students.length === 0 ? (
            <div className="slot-item">해당 학생이 없습니다.</div>
          ) : (
            students.map((student) => (
              <div key={student.id} className="slot-item">
                <strong>{student.name}</strong>
                <span>
                  {student.grade}학년 {student.classNo}반 · {student.studentNo}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="primary-button" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export default StudentListModal;
