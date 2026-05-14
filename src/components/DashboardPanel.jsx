function DashboardPanel({ summary, roomWarnings, onMetricSelect }) {
  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">실시간 분석</p>
          <h2>운영 리스크 대시보드</h2>
        </div>
      </div>

      <div className="metrics-grid">
        {summary.map((metric) => (
          <article key={metric.key} className="metric-card">
            <span className="eyebrow">{metric.label}</span>
            <div className="metric-value">{metric.value}</div>
            <p className="metric-desc">{metric.description}</p>
            {metric.key !== "roomWarnings" ? (
              <button
                type="button"
                className="text-button"
                onClick={() => onMetricSelect(metric.key)}
              >
                학생 목록 보기
              </button>
            ) : null}
          </article>
        ))}
      </div>

      <div className="warning-grid mt-4">
        {roomWarnings.length === 0 ? (
          <div className="room-warning">
            <strong>고사실 경고 없음</strong>
            <p>현재 배정에서는 수용 인원 기준을 넘는 시험이 없습니다.</p>
          </div>
        ) : (
          roomWarnings.map((warning) => (
            <div key={`${warning.sessionId}:${warning.message}`} className="room-warning">
              <strong>{warning.level === "danger" ? "치명 경고" : "주의"}</strong>
              <p>{warning.message}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default DashboardPanel;
