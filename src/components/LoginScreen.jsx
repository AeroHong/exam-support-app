import { useState } from "react";

const FEATURES = [
  {
    icon: "📋",
    color: "#4f46e5",
    bg: "#eef2ff",
    title: "시험계획 관리",
    points: [
      "학년도별 멀티 고사 독립 관리",
      "교시·기간 설정 및 과목 세션 자동 생성",
      "응시 형태별 인원 자동 산출",
    ],
  },
  {
    icon: "🏫",
    color: "#0891b2",
    bg: "#ecfeff",
    title: "고사실 자동 배정",
    points: [
      "응시 인원 기반 최적 고사실 배정",
      "대기실·위탁·특수 응시 별도 지정",
      "감독관 배치표·좌석 배치도 출력",
    ],
  },
  {
    icon: "📅",
    color: "#059669",
    bg: "#ecfdf5",
    title: "일정 자동 배치",
    points: [
      "드래그로 날짜·교시 직접 배정",
      "과목·학년 충돌 자동 감지",
      "일정 확정 후 잠금 처리",
    ],
  },
];

const s = {
  page: {
    minHeight: "100vh", display: "flex", flexDirection: "column",
    backgroundColor: "#f8fafc", fontFamily: "inherit",
  },

  // ── Header ──────────────────────────────────────────────────────────
  header: {
    background: "linear-gradient(135deg, #4338ca 0%, #4f46e5 60%, #6366f1 100%)",
    padding: "0.75rem 2rem", display: "flex", alignItems: "center", gap: "0.75rem",
  },
  headerTitle: { fontWeight: 800, fontSize: "1rem", color: "#fff", letterSpacing: "-0.02em", margin: 0 },
  betaBadge: {
    backgroundColor: "rgba(255,255,255,0.18)", color: "#fff",
    fontSize: "0.68rem", fontWeight: 600,
    padding: "0.15rem 0.5rem", borderRadius: "999px", letterSpacing: "0.04em",
  },

  // ── Hero ─────────────────────────────────────────────────────────────
  hero: {
    background: "linear-gradient(135deg, #4338ca 0%, #4f46e5 55%, #6366f1 100%)",
    padding: "3.5rem 2rem 4rem", position: "relative", overflow: "hidden",
  },
  heroInner: { maxWidth: "600px", position: "relative", zIndex: 1 },
  heroLabel: {
    display: "inline-block",
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: "0.25rem 0.75rem", borderRadius: "999px",
    fontSize: "0.75rem", fontWeight: 600,
    color: "rgba(255,255,255,0.9)", letterSpacing: "0.04em", marginBottom: "1rem",
  },
  heroTitle: {
    fontSize: "2.2rem", fontWeight: 800, color: "#fff",
    lineHeight: 1.2, letterSpacing: "-0.03em", margin: "0 0 0.75rem",
  },
  heroSub: {
    fontSize: "1rem", color: "rgba(255,255,255,0.7)",
    lineHeight: 1.75, margin: "0 0 2rem", maxWidth: "440px",
  },
  btnRow: { display: "flex", flexDirection: "column", gap: "0.6rem", maxWidth: "300px" },
  btnPrimary: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
    backgroundColor: "#fff", color: "#3730a3",
    fontWeight: 700, fontSize: "0.92rem",
    padding: "0.8rem 1.5rem", borderRadius: "10px",
    border: "none", cursor: "pointer",
    boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
  },
  btnDemo: {
    backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)",
    fontWeight: 600, fontSize: "0.85rem",
    padding: "0.7rem 1.5rem", borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.22)", cursor: "pointer",
  },

  // 버전 배지
  versionRow: {
    marginTop: "2rem", display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap",
  },
  versionBadge: {
    fontSize: "0.71rem", color: "rgba(255,255,255,0.5)",
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: "0.18rem 0.55rem", borderRadius: "999px",
  },
  versionDot: { fontSize: "0.55rem", color: "rgba(255,255,255,0.25)" },

  // 배경 장식
  deco1: {
    position: "absolute", top: -80, right: -80,
    width: 300, height: 300, borderRadius: "50%",
    backgroundColor: "rgba(255,255,255,0.04)", pointerEvents: "none",
  },
  deco2: {
    position: "absolute", bottom: -40, right: 80,
    width: 160, height: 160, borderRadius: "50%",
    backgroundColor: "rgba(255,255,255,0.04)", pointerEvents: "none",
  },

  // ── Feature cards ────────────────────────────────────────────────────
  features: {
    padding: "3rem 2rem", maxWidth: "1080px",
    margin: "0 auto", width: "100%", boxSizing: "border-box",
  },
  featureLabel: {
    fontSize: "0.71rem", fontWeight: 700, color: "#6366f1",
    letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.25rem",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "1.25rem",
  },
  card: {
    border: "1px solid #e0e7ff", borderRadius: "12px",
    padding: "1.4rem", backgroundColor: "#fff",
    boxShadow: "0 1px 4px rgba(79,70,229,0.05)",
  },
  cardHeader: { display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" },
  cardIcon: { fontSize: "1.25rem", lineHeight: 1, padding: "0.55rem", borderRadius: "9px" },
  cardTitle: { fontWeight: 700, fontSize: "0.9rem", color: "#1e1b4b", margin: 0 },
  pointList: { display: "flex", flexDirection: "column", gap: "0.55rem" },
  pointRow: { display: "flex", gap: "0.6rem", alignItems: "flex-start" },
  pointDot: { marginTop: 7, flexShrink: 0, width: 4, height: 4, borderRadius: "50%" },
  pointText: { fontSize: "0.81rem", color: "#4b5563", lineHeight: 1.6, margin: 0 },

  // ── Footer ───────────────────────────────────────────────────────────
  footer: {
    marginTop: "auto", padding: "1.25rem 2rem",
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: "0.4rem", borderTop: "1px solid #f1f5f9",
  },
  footerText: { fontSize: "0.72rem", color: "#94a3b8" },
  footerLink: { fontSize: "0.72rem", fontWeight: 700, color: "#6366f1", textDecoration: "none" },

  // ── 학교 이름 입력 화면 ──────────────────────────────────────────────
  inputBox: {
    minHeight: "100vh", display: "flex",
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#f8fafc", padding: "2rem",
  },
  inputCard: {
    backgroundColor: "#fff", border: "1px solid #e0e7ff",
    borderRadius: "16px", padding: "2.5rem",
    maxWidth: "420px", width: "100%",
    boxShadow: "0 4px 24px rgba(79,70,229,0.08)",
  },
  inputEyebrow: {
    fontSize: "0.71rem", fontWeight: 700, color: "#6366f1",
    letterSpacing: "0.08em", textTransform: "uppercase",
    margin: "0 0 0.4rem",
  },
  inputTitle: { fontSize: "1.35rem", fontWeight: 800, color: "#1e1b4b", margin: "0 0 0.5rem" },
  inputDesc: { fontSize: "0.84rem", color: "#6b7280", lineHeight: 1.6, margin: "0 0 1.5rem" },
  textInput: {
    width: "100%", padding: "0.65rem 0.9rem",
    border: "1px solid #c7d2fe", borderRadius: "8px",
    fontSize: "0.9rem", outline: "none",
    boxSizing: "border-box", marginBottom: "0.75rem",
  },
  errorText: { fontSize: "0.8rem", color: "#ef4444", marginTop: "0.5rem" },
};

export default function LoginScreen({ status, error, onSignIn, onSubmitSchoolName, onDemo }) {
  const [schoolName, setSchoolName] = useState("");
  const isLoading = status === "loading" || status === "resolving";

  // ── 학교 이름 등록 화면 ─────────────────────────────────────────────
  if (status === "needs_school_name") {
    return (
      <div style={s.inputBox}>
        <div style={s.inputCard}>
          <p style={s.inputEyebrow}>학교 등록</p>
          <h2 style={s.inputTitle}>학교 이름을 입력해주세요</h2>
          <p style={s.inputDesc}>
            등록되지 않은 계정입니다. 학교 이름을 입력하면 개인 작업 공간이 생성됩니다.
          </p>
          <input
            style={s.textInput}
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="예: 선유고등학교"
            onKeyDown={(e) => e.key === "Enter" && schoolName.trim() && onSubmitSchoolName(schoolName.trim())}
            autoFocus
          />
          <button
            style={{ ...s.btnPrimary, width: "100%", justifyContent: "center" }}
            disabled={!schoolName.trim()}
            onClick={() => onSubmitSchoolName(schoolName.trim())}
          >
            시작하기
          </button>
          {error && <p style={s.errorText}>{error}</p>}
        </div>
      </div>
    );
  }

  // ── 메인 로그인 화면 ────────────────────────────────────────────────
  return (
    <div style={s.page}>

      {/* 헤더 */}
      <header style={s.header}>
        <h1 style={s.headerTitle}>지필고사 업무 지원</h1>
        <span style={s.betaBadge}>Beta</span>
      </header>

      {/* 히어로 */}
      <section style={s.hero}>
        <div style={s.deco1} />
        <div style={s.deco2} />
        <div style={s.heroInner}>
          <span style={s.heroLabel}>고사 업무 지원 시스템</span>
          <h2 style={s.heroTitle}>지필고사 업무,<br />더 체계적으로</h2>
          <p style={s.heroSub}>
            과목 확정부터 고사실 배정까지 —<br />
            학교 Google 계정 하나로 모든 고사 업무를 처리하세요.
          </p>

          <div style={s.btnRow}>
            <button style={s.btnPrimary} disabled={isLoading} onClick={onSignIn}>
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                width={18} height={18} alt=""
              />
              {isLoading ? "로그인 처리 중..." : "Google 계정으로 로그인"}
            </button>
            {onDemo && (
              <button style={s.btnDemo} onClick={onDemo}>
                데모 체험 (로그인 없이)
              </button>
            )}
          </div>

          {/* 개발 현황 배지 */}
          <div style={s.versionRow}>
            <span style={s.versionBadge}>v2.0</span>
            <span style={s.versionDot}>·</span>
            <span style={s.versionBadge}>멀티 고사 대시보드 ✓</span>
            <span style={s.versionDot}>·</span>
            <span style={s.versionBadge}>데모 모드 ✓</span>
            <span style={s.versionDot}>·</span>
            <span style={s.versionBadge}>출력물 생성 ✓</span>
          </div>
        </div>
      </section>

      {/* 주요 기능 */}
      <section style={s.features}>
        <p style={s.featureLabel}>주요 기능</p>
        <div style={s.cardGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} style={s.card}>
              <div style={s.cardHeader}>
                <span style={{ ...s.cardIcon, backgroundColor: f.bg }}>{f.icon}</span>
                <p style={s.cardTitle}>{f.title}</p>
              </div>
              <div style={s.pointList}>
                {f.points.map((pt, i) => (
                  <div key={i} style={s.pointRow}>
                    <div style={{ ...s.pointDot, backgroundColor: f.color }} />
                    <p style={s.pointText}>{pt}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 푸터 */}
      <footer style={s.footer}>
        <span style={s.footerText}>Designed &amp; Built by</span>
        <a
          href="https://github.com/AeroHong"
          target="_blank"
          rel="noopener noreferrer"
          style={s.footerLink}
        >
          @AeroHong
        </a>
      </footer>

    </div>
  );
}
