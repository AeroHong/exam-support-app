const overlay = {
  position: "fixed", inset: 0, zIndex: 9999,
  backgroundColor: "rgba(0,0,0,0.45)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: "1rem",
};
const box = {
  backgroundColor: "#fff",
  borderRadius: "12px",
  maxWidth: "700px",
  width: "100%",
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
};
const header = {
  padding: "1.5rem 1.75rem 1rem",
  borderBottom: "1px solid #f1f5f9",
  position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 1,
  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
};
const body  = { padding: "1.25rem 1.75rem 2rem" };
const h2    = { fontSize: "1.2rem", fontWeight: 800, color: "#111827", margin: 0 };
const sub   = { fontSize: "0.78rem", color: "#9ca3af", marginTop: "0.25rem" };
const closeBtn = {
  padding: "0.3rem 0.8rem", border: "1px solid #e5e7eb",
  borderRadius: "7px", cursor: "pointer",
  fontSize: "0.82rem", color: "#6b7280", backgroundColor: "#fff",
  flexShrink: 0, marginLeft: "1rem",
};
const sectionTitle = {
  fontSize: "0.9rem", fontWeight: 700, color: "#1e293b",
  marginTop: "1.5rem", marginBottom: "0.5rem",
};
const intro = {
  fontSize: "0.85rem", color: "#475569", lineHeight: 1.8,
  padding: "0.75rem 1rem", backgroundColor: "#f8fafc",
  borderLeft: "4px solid #4f46e5", borderRadius: "4px",
  marginBottom: "0.5rem",
};
const li = { fontSize: "0.85rem", color: "#64748b", lineHeight: 2, display: "flex", gap: "0.5rem" };
const dot = { color: "#cbd5e1", flexShrink: 0 };

const SECTIONS = [
  {
    title: "제1조 (개인정보의 수집 항목 및 수집 방법)",
    blocks: [
      { sub: "교사·관리자", items: ["이름", "이메일 주소 (Google 계정 연동)"] },
      { sub: "학생", items: ["학번", "이름", "학년·반·번호", "수강 과목", "시험 응시 형태 (일반·위탁·특수·별도)"] },
      { sub: "수집 방법", items: ["Google OAuth 로그인 연동 (교사·관리자)", "학교 관리자의 CSV 파일 일괄 업로드 (학생)"] },
    ],
  },
  {
    title: "제2조 (개인정보의 수집·이용 목적)",
    blocks: [
      { items: [
        "시험 일정 계획 및 과목별 세션 자동 배치",
        "고사실·대기실 좌석 자동 배정 및 확정 관리",
        "시험 감독·좌석 배치표 등 출력물 생성",
        "학교별 독립적인 시험 운영 데이터 관리",
      ] },
    ],
  },
  {
    title: "제3조 (개인정보의 보유 및 이용 기간)",
    blocks: [
      { items: [
        "학교 운영 기간 동안 보유하며, 서비스 종료 또는 관리자 요청 시 즉시 파기합니다.",
        "관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 별도 보관합니다.",
      ] },
    ],
  },
  {
    title: "제4조 (개인정보의 제3자 제공)",
    blocks: [
      { items: ["원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.", "단, 이용자의 동의가 있거나 법령에 의한 경우는 예외로 합니다."] },
    ],
  },
  {
    title: "제5조 (개인정보 처리 위탁)",
    blocks: [
      { sub: "Google Firebase (Google LLC, 미국)", items: [
        "Firebase Authentication — 교사 계정 인증",
        "Cloud Firestore — 학생·시험계획·고사실 배정 데이터 저장",
        "Firebase Hosting — 웹 서비스 제공",
      ] },
      { items: ["Firebase 개인정보처리방침: https://firebase.google.com/support/privacy"] },
    ],
  },
  {
    title: "제6조 (이용자의 권리 및 행사 방법)",
    blocks: [
      { items: [
        "이용자는 언제든지 자신의 개인정보에 대한 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다.",
        "요청은 아래 개인정보 보호 책임자에게 문의하시면 지체 없이 조치합니다.",
      ] },
    ],
  },
  {
    title: "제7조 (개인정보 보호 책임자)",
    blocks: [
      { items: ["소속: 선유고등학교", "담당: 홍창기", "이메일: hckgood@gmail.com", "문의: 카카오 오픈채팅 (https://open.kakao.com/o/gQwzPAvi, 참여코드 2026)"] },
    ],
  },
];

export default function PrivacyPolicyModal({ onClose }) {
  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={box}>
        <div style={header}>
          <div>
            <h2 style={h2}>개인정보처리방침</h2>
            <p style={sub}>고사업무 지원 APP (exam-support-kr.web.app) · 시행일: 2026년 6월 10일</p>
          </div>
          <button style={closeBtn} onClick={onClose}>닫기</button>
        </div>

        <div style={body}>
          <p style={intro}>
            선유고등학교 고사업무 지원 APP(이하 "서비스")은 개인정보보호법 및 관련 법령에 따라
            이용자의 개인정보를 보호하고, 이와 관련한 고충을 신속하게 처리하기 위하여
            다음과 같이 개인정보처리방침을 수립·공개합니다.
          </p>

          {SECTIONS.map((sec, si) => (
            <div key={si}>
              <p style={sectionTitle}>{sec.title}</p>
              {sec.blocks.map((block, bi) => (
                <div key={bi} style={{ marginBottom: "0.5rem", paddingLeft: block.sub ? 0 : "0.5rem" }}>
                  {block.sub && (
                    <p style={{ fontSize: "0.83rem", fontWeight: 600, color: "#475569", margin: "0.25rem 0 0.25rem" }}>
                      ▸ {block.sub}
                    </p>
                  )}
                  <div style={{ paddingLeft: block.sub ? "1rem" : 0 }}>
                    {block.items.map((item, ii) => (
                      <div key={ii} style={li}>
                        <span style={dot}>·</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}

          <p style={{ ...li, marginTop: "1.5rem", color: "#9ca3af", fontSize: "0.78rem" }}>
            본 방침은 2026년 6월 10일부터 시행됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
