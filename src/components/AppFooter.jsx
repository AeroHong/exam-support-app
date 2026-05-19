const s = {
  footer: {
    padding: "1rem 2rem",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexWrap: "wrap", gap: "0.25rem 1.25rem",
    borderTop: "1px solid #f1f5f9",
    backgroundColor: "#fff",
  },
  text:    { fontSize: "0.72rem", color: "#94a3b8" },
  link:    { fontSize: "0.72rem", fontWeight: 700, color: "#6366f1", textDecoration: "none" },
  divider: { fontSize: "0.72rem", color: "#e2e8f0" },
};

export default function AppFooter() {
  return (
    <footer style={s.footer}>
      <span style={s.text}>Designed &amp; Built by</span>
      <a href="https://github.com/AeroHong" target="_blank" rel="noopener noreferrer" style={s.link}>
        @AeroHong
      </a>
      <span style={s.divider}>|</span>
      <span style={s.text}>사용 문의 (버그·기능 추가·사용 방법)</span>
      <a href="https://open.kakao.com/o/gQwzPAvi" target="_blank" rel="noopener noreferrer" style={s.link}>
        카카오톡 오픈채팅
      </a>
      <span style={{ ...s.text, backgroundColor: "#f1f5f9", borderRadius: "999px", padding: "0.1rem 0.5rem" }}>
        참여코드: 2026
      </span>
    </footer>
  );
}
