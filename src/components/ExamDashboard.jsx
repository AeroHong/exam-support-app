import { useEffect, useState } from "react";
import AppFooter from "./AppFooter";
import { serverTimestamp, doc, setDoc } from "firebase/firestore";
import { EXAM_TYPES, getDefaultPlan } from "../data/defaults";
import { firebaseDb } from "../lib/firebase";
import { archivePlan, deletePlan, loadPlanList, savePlan } from "../lib/firestorePlanner";

const s = {
  page:        { minHeight: "100vh", backgroundColor: "#f8fafc" },
  header:      { backgroundColor: "#fff", borderBottom: "1px solid #e5e7eb", padding: "1rem 1.5rem" },
  headerTop:   { display: "flex", justifyContent: "space-between", alignItems: "center" },
  eyebrow:     { fontSize: "0.7rem", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 },
  headerTitle: { fontSize: "1.15rem", fontWeight: 800, color: "#111827", margin: "0.15rem 0 0" },
  headerRight: { display: "flex", gap: "0.5rem", alignItems: "center" },
  userChip:    { fontSize: "0.8rem", color: "#6b7280", padding: "0.3rem 0.75rem", backgroundColor: "#f3f4f6", borderRadius: "999px" },
  outlineBtn:  { padding: "0.35rem 0.85rem", backgroundColor: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: "7px", cursor: "pointer", fontSize: "0.82rem" },

  content:     { padding: "1.5rem", maxWidth: "1100px" },
  toolbar:     { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" },
  pageTitle:   { fontSize: "1.5rem", fontWeight: 800, color: "#111827", margin: 0 },
  primaryBtn:  { padding: "0.45rem 1rem", backgroundColor: "#4f46e5", color: "#fff", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 },

  filterRow:   { display: "flex", gap: "0.4rem", marginBottom: "1rem", alignItems: "center", flexWrap: "wrap" },
  tab:         { padding: "0.3rem 0.75rem", border: "1px solid #e5e7eb", borderRadius: "999px", cursor: "pointer", fontSize: "0.82rem", backgroundColor: "#fff", color: "#6b7280" },
  tabActive:   { padding: "0.3rem 0.75rem", border: "1px solid #4f46e5", borderRadius: "999px", cursor: "pointer", fontSize: "0.82rem", backgroundColor: "#eef2ff", color: "#4f46e5", fontWeight: 700 },
  badge:       { display: "inline-block", fontSize: "0.72rem", fontWeight: 600, backgroundColor: "#e5e7eb", color: "#374151", borderRadius: "999px", padding: "0.05rem 0.45rem", marginLeft: "0.3rem" },
  badgeActive: { display: "inline-block", fontSize: "0.72rem", fontWeight: 600, backgroundColor: "#c7d2fe", color: "#3730a3", borderRadius: "999px", padding: "0.05rem 0.45rem", marginLeft: "0.3rem" },

  yearGroup:   { marginBottom: "1.5rem" },
  yearLabel:   { fontSize: "0.85rem", fontWeight: 700, color: "#6b7280", marginBottom: "0.6rem" },
  grid:        { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem" },

  card:        { backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1rem 1.15rem", cursor: "pointer", transition: "box-shadow 0.15s" },
  cardHover:   { boxShadow: "0 2px 12px rgba(0,0,0,0.08)" },
  cardName:    { fontSize: "1rem", fontWeight: 700, color: "#111827", margin: "0 0 0.35rem" },
  cardMeta:    { fontSize: "0.78rem", color: "#6b7280", lineHeight: 1.6 },
  cardFooter:  { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.6rem" },
  statusDraft: { fontSize: "0.7rem", fontWeight: 700, backgroundColor: "#dbeafe", color: "#1d4ed8", borderRadius: "999px", padding: "0.12rem 0.5rem" },
  statusArchived: { fontSize: "0.7rem", fontWeight: 700, backgroundColor: "#f3f4f6", color: "#6b7280", borderRadius: "999px", padding: "0.12rem 0.5rem" },
  cardActions: { display: "flex", gap: "0.3rem" },
  smallBtn:    { padding: "0.2rem 0.55rem", backgroundColor: "#fff", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: "5px", cursor: "pointer", fontSize: "0.72rem" },
  deleteBtn:   { padding: "0.2rem 0.55rem", backgroundColor: "#fff", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "5px", cursor: "pointer", fontSize: "0.72rem" },

  empty:       { textAlign: "center", padding: "3rem", color: "#9ca3af", fontSize: "0.9rem" },

  // 모달
  backdrop:    { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal:       { backgroundColor: "#fff", borderRadius: "12px", padding: "1.5rem", width: "min(440px, 95vw)", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" },
  modalTitle:  { fontSize: "1.1rem", fontWeight: 800, color: "#111827", marginBottom: "1rem" },
  label:       { fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.35rem", display: "block" },
  input:       { width: "100%", padding: "0.45rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "0.875rem", boxSizing: "border-box", outline: "none" },
  select:      { width: "100%", padding: "0.45rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "0.875rem", boxSizing: "border-box", outline: "none", backgroundColor: "#fff" },
  fieldGroup:  { marginBottom: "0.85rem" },
  modalActions:{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.25rem" },
};

function formatDate(timestamp) {
  if (!timestamp?.seconds) return "";
  const d = new Date(timestamp.seconds * 1000);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function ExamDashboard({ schoolId, ownerId, schoolName, userName, onSelectExam, onLogout }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);

  const fetchPlans = async () => {
    setLoading(true);
    const list = await loadPlanList({ schoolId });
    setPlans(list);
    setLoading(false);
  };

  useEffect(() => {
    if (schoolId) fetchPlans();
  }, [schoolId]);

  // 학년도별 그룹핑
  const filtered = showArchived ? plans : plans.filter((p) => p.status !== "archived");
  const years = [...new Set(filtered.map((p) => p.academicYear ?? new Date().getFullYear()))].sort((a, b) => b - a);
  const grouped = {};
  years.forEach((y) => { grouped[y] = filtered.filter((p) => (p.academicYear ?? new Date().getFullYear()) === y); });

  const handleArchive = async (e, planId) => {
    e.stopPropagation();
    if (!window.confirm("이 고사를 보관 처리하시겠습니까?")) return;
    await archivePlan({ schoolId, planId });
    fetchPlans();
  };

  const handleDelete = async (e, planId) => {
    e.stopPropagation();
    if (!window.confirm("이 고사를 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.")) return;
    await deletePlan({ schoolId, planId });
    fetchPlans();
  };

  const handleRestore = async (e, planId) => {
    e.stopPropagation();
    await setDoc(
      doc(firebaseDb, "schools", schoolId, "plans", planId),
      { status: "draft", updatedAt: serverTimestamp() },
      { merge: true },
    );
    fetchPlans();
  };

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.headerTop}>
          <div>
            <p style={s.eyebrow}>시험 운영 지원 플랫폼</p>
            <h1 style={s.headerTitle}>{schoolName}</h1>
          </div>
          <div style={s.headerRight}>
            <span style={s.userChip}>{userName}</span>
            <button style={s.outlineBtn} onClick={onLogout}>로그아웃</button>
          </div>
        </div>
      </header>

      <div style={s.content}>
        <div style={s.toolbar}>
          <h2 style={s.pageTitle}>고사 관리</h2>
          <button style={s.primaryBtn} onClick={() => setCreateOpen(true)}>
            + 새 고사
          </button>
        </div>

        <div style={s.filterRow}>
          <button
            style={!showArchived ? s.tabActive : s.tab}
            onClick={() => setShowArchived(false)}
          >
            진행 중
            <span style={!showArchived ? s.badgeActive : s.badge}>
              {plans.filter((p) => p.status !== "archived").length}
            </span>
          </button>
          <button
            style={showArchived ? s.tabActive : s.tab}
            onClick={() => setShowArchived(true)}
          >
            전체 (보관 포함)
            <span style={showArchived ? s.badgeActive : s.badge}>{plans.length}</span>
          </button>
        </div>

        {loading ? (
          <div style={s.empty}>불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>
            등록된 고사가 없습니다.<br />
            <span style={{ fontSize: "0.82rem" }}>"+ 새 고사" 버튼으로 시작하세요.</span>
          </div>
        ) : (
          years.map((year) => (
            <div key={year} style={s.yearGroup}>
              <p style={s.yearLabel}>{year}학년도</p>
              <div style={s.grid}>
                {grouped[year].map((plan) => {
                  const examLabel = EXAM_TYPES.find((t) => t.key === plan.examType)?.label;
                  const isArchived = plan.status === "archived";
                  return (
                    <div
                      key={plan.id}
                      style={{
                        ...s.card,
                        ...(hoveredId === plan.id ? s.cardHover : {}),
                        ...(isArchived ? { opacity: 0.65 } : {}),
                      }}
                      onClick={() => onSelectExam(plan.id)}
                      onMouseEnter={() => setHoveredId(plan.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <p style={s.cardName}>{plan.name || "이름 없음"}</p>
                      <div style={s.cardMeta}>
                        {examLabel && <div>{examLabel}</div>}
                        {plan.updatedAt && <div>최종 수정: {formatDate(plan.updatedAt)}</div>}
                      </div>
                      <div style={s.cardFooter}>
                        <span style={isArchived ? s.statusArchived : s.statusDraft}>
                          {isArchived ? "보관됨" : "진행 중"}
                        </span>
                        <div style={s.cardActions}>
                          {isArchived ? (
                            <button style={s.smallBtn} onClick={(e) => handleRestore(e, plan.id)}>복원</button>
                          ) : (
                            <button style={s.smallBtn} onClick={(e) => handleArchive(e, plan.id)}>보관</button>
                          )}
                          <button style={s.deleteBtn} onClick={(e) => handleDelete(e, plan.id)}>삭제</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {createOpen && (
        <CreateExamModal
          schoolId={schoolId}
          ownerId={ownerId}
          onCreated={(newPlanId) => {
            setCreateOpen(false);
            onSelectExam(newPlanId);
          }}
          onClose={() => setCreateOpen(false)}
        />
      )}

      <AppFooter />
    </div>
  );
}

function CreateExamModal({ schoolId, ownerId, onCreated, onClose }) {
  const currentYear = new Date().getFullYear();
  const [academicYear, setAcademicYear] = useState(currentYear);
  const [examType, setExamType] = useState(EXAM_TYPES[0].key);
  const [name, setName] = useState(EXAM_TYPES[0].label);
  const [saving, setSaving] = useState(false);

  const handleTypeChange = (key) => {
    setExamType(key);
    const type = EXAM_TYPES.find((t) => t.key === key);
    if (type) setName(type.label);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const type = EXAM_TYPES.find((t) => t.key === examType);
      const plan = {
        ...getDefaultPlan(schoolId),
        name: name.trim(),
        academicYear,
        examType,
        semester: type?.semester ?? null,
        status: "draft",
      };
      const planId = await savePlan({ schoolId, ownerId, plan });
      onCreated(planId);
    } catch {
      setSaving(false);
    }
  };

  return (
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={s.modalTitle}>새 고사 만들기</h3>

        <div style={s.fieldGroup}>
          <label style={s.label}>학년도</label>
          <select
            style={s.select}
            value={academicYear}
            onChange={(e) => setAcademicYear(Number(e.target.value))}
          >
            {[currentYear + 1, currentYear, currentYear - 1].map((y) => (
              <option key={y} value={y}>{y}학년도</option>
            ))}
          </select>
        </div>

        <div style={s.fieldGroup}>
          <label style={s.label}>고사 유형</label>
          <select
            style={s.select}
            value={examType}
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            {EXAM_TYPES.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>

        <div style={s.fieldGroup}>
          <label style={s.label}>고사명</label>
          <input
            style={s.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 1학기 1차 지필고사"
          />
        </div>

        <div style={s.modalActions}>
          <button style={s.outlineBtn} onClick={onClose}>취소</button>
          <button style={s.primaryBtn} onClick={handleCreate} disabled={saving || !name.trim()}>
            {saving ? "생성 중..." : "생성"}
          </button>
        </div>
      </div>
    </div>
  );
}
