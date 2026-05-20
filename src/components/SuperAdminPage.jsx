import { useEffect, useState } from "react";
import { useTableSort } from "../hooks/useTableSort";
import AppFooter from "./AppFooter";
import {
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch,
  updateDoc,
} from "firebase/firestore";
import { firebaseDb } from "../lib/firebase";

function emailToKey(email) {
  return email.replace(/@/g, "_at_").replace(/\./g, "_dot_");
}

const TABS = [
  { id: "schools", label: "학교 관리" },
  { id: "domains", label: "도메인 등록" },
  { id: "emails", label: "개인 이메일 등록" },
];

const EMPTY_SCHOOL = { schoolId: "", schoolName: "" };
const EMPTY_DOMAIN = { domain: "", schoolId: "", schoolName: "" };
const EMPTY_EMAIL  = { email: "", schoolId: "", schoolName: "" };

// ─── 스타일 ──────────────────────────────────────────────────────────────────
const s = {
  page:        { padding: "1.5rem", maxWidth: "1100px", margin: "0 auto" },
  pageHeader:  { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.25rem" },
  eyebrow:     { fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" },
  pageTitle:   { fontSize: "1.5rem", fontWeight: 800, color: "#111827", margin: 0 },
  btnRow:      { display: "flex", gap: "0.5rem", alignItems: "center" },

  filterRow:   { display: "flex", gap: "0.4rem", marginBottom: "1.25rem", alignItems: "center", flexWrap: "wrap" },
  tab:         { padding: "0.3rem 0.75rem", border: "1px solid #e5e7eb", borderRadius: "999px", cursor: "pointer", fontSize: "0.82rem", backgroundColor: "#fff", color: "#6b7280" },
  tabActive:   { padding: "0.3rem 0.75rem", border: "1px solid #4f46e5", borderRadius: "999px", cursor: "pointer", fontSize: "0.82rem", backgroundColor: "#eef2ff", color: "#4f46e5", fontWeight: 700 },

  panel:       { border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1.25rem", backgroundColor: "#fff", marginBottom: "1rem" },
  sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1rem" },
  sectionTitle:{ fontSize: "1rem", fontWeight: 700, color: "#111827", margin: 0 },

  primaryBtn:  { padding: "0.45rem 1rem", backgroundColor: "#4f46e5", color: "#fff", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 },
  outlineBtn:  { padding: "0.45rem 1rem", backgroundColor: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: "7px", cursor: "pointer", fontSize: "0.85rem" },
  editBtn:     { padding: "0.2rem 0.55rem", backgroundColor: "#fff", color: "#4f46e5", border: "1px solid #c7d2fe", borderRadius: "5px", cursor: "pointer", fontSize: "0.75rem" },
  deleteBtn:   { padding: "0.2rem 0.55rem", backgroundColor: "#fff", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "5px", cursor: "pointer", fontSize: "0.75rem" },
  smBtn:       { padding: "0.2rem 0.5rem", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 },

  tableWrap:   { overflowX: "auto" },
  table:       { width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" },
  thead:       { backgroundColor: "#f9fafb" },
  th:          { padding: "0.5rem 0.75rem", fontWeight: 700, color: "#374151", textAlign: "left", borderBottom: "2px solid #e5e7eb", fontSize: "0.8rem", whiteSpace: "nowrap" },
  thSort:      { cursor: "pointer" },
  tr:          { borderBottom: "1px solid #f3f4f6" },
  td:          { padding: "0.4rem 0.75rem", color: "#111827", verticalAlign: "middle" },
  tdMono:      { padding: "0.4rem 0.75rem", color: "#374151", verticalAlign: "middle", fontFamily: "monospace", fontSize: "0.8rem" },
  tdMuted:     { padding: "0.4rem 0.75rem", color: "#9ca3af", fontSize: "0.82rem", verticalAlign: "middle" },
  tdRight:     { padding: "0.4rem 0.75rem", textAlign: "right", verticalAlign: "middle", whiteSpace: "nowrap" },
  emptyRow:    { textAlign: "center", padding: "2rem", color: "#9ca3af", fontSize: "0.9rem" },

  notice:      { padding: "0.6rem 1rem", borderRadius: "7px", fontSize: "0.82rem", fontWeight: 600, marginTop: "0.75rem" },
  noticeOk:    { backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" },
  noticeErr:   { backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },

  badgeGreen:  { display: "inline-block", fontSize: "0.72rem", fontWeight: 600, backgroundColor: "#dcfce7", color: "#16a34a", borderRadius: "999px", padding: "0.1rem 0.55rem" },
  badgeGray:   { display: "inline-block", fontSize: "0.72rem", fontWeight: 600, backgroundColor: "#e5e7eb", color: "#374151", borderRadius: "999px", padding: "0.1rem 0.55rem" },
  badgeBlue:   { display: "inline-block", fontSize: "0.72rem", fontWeight: 600, backgroundColor: "#eef2ff", color: "#4f46e5", borderRadius: "999px", padding: "0.1rem 0.55rem" },

  label:       { display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" },
  input:       { width: "100%", padding: "0.45rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "0.875rem", boxSizing: "border-box", outline: "none" },
  formGrid2:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" },
  formGrid3:   { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" },

  subTable:    { width: "100%", fontSize: "0.78rem", borderCollapse: "collapse" },
  subTh:       { textAlign: "left", padding: "0.25rem 0.5rem", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb" },
  subTd:       { padding: "0.25rem 0.5rem", color: "#374151", borderBottom: "1px solid #f3f4f6" },
  expandedRow: { backgroundColor: "#f8fafc" },
};

// ─── 저장 알림 ────────────────────────────────────────────────────────────────
function SaveNotice({ msg }) {
  if (!msg) return null;
  const [type, ...rest] = msg.split(":");
  const isOk = type === "ok";
  return (
    <p style={{ ...s.notice, ...(isOk ? s.noticeOk : s.noticeErr) }}>
      {rest.join(":")}
    </p>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
function SuperAdminPage({ onLogout, onEnterDemoSchool }) {
  const [activeTab, setActiveTab] = useState("schools");
  const schoolSort = useTableSort();
  const domainSort = useTableSort();
  const emailSort  = useTableSort();

  // ── 학교 관리 ──────────────────────────────────────────────────────────────
  const [schools, setSchools] = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [schoolsError, setSchoolsError] = useState("");
  const [newSchool, setNewSchool] = useState(EMPTY_SCHOOL);
  const [schoolSaving, setSchoolSaving] = useState(false);
  const [schoolSaveMsg, setSchoolSaveMsg] = useState("");
  const [users, setUsers] = useState([]);
  const [expandedSchool, setExpandedSchool] = useState(null);
  const [editingSchoolName, setEditingSchoolName] = useState(null); // { id, name }
  const [schoolNameSaving, setSchoolNameSaving] = useState(false);
  const [reassigningUser, setReassigningUser] = useState(null); // { uid, selectedSchoolId }
  const [reassignSaving, setReassignSaving] = useState(false);
  const [reassignError, setReassignError] = useState("");

  // ── 도메인 등록 ────────────────────────────────────────────────────────────
  const [domains, setDomains] = useState([]);
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [domainsError, setDomainsError] = useState("");
  const [newDomain, setNewDomain] = useState(EMPTY_DOMAIN);
  const [domainSaving, setDomainSaving] = useState(false);
  const [domainSaveMsg, setDomainSaveMsg] = useState("");

  // ── 개인 이메일 등록 ───────────────────────────────────────────────────────
  const [emailMaps, setEmailMaps] = useState([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [emailsError, setEmailsError] = useState("");
  const [newEmail, setNewEmail] = useState(EMPTY_EMAIL);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSaveMsg, setEmailSaveMsg] = useState("");

  useEffect(() => {
    if (activeTab === "schools") { loadSchools(); loadUsers(); }
    if (activeTab === "domains") loadDomains();
    if (activeTab === "emails") loadEmails();
  }, [activeTab]);

  // ── 데이터 로딩 ────────────────────────────────────────────────────────────
  async function loadSchools() {
    if (!firebaseDb) return;
    setSchoolsLoading(true); setSchoolsError("");
    try {
      const snap = await getDocs(collection(firebaseDb, "schools"));
      setSchools(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      setSchoolsError("학교 목록을 불러오지 못했습니다: " + err.message);
    } finally {
      setSchoolsLoading(false);
    }
  }

  async function loadUsers() {
    if (!firebaseDb) return;
    try {
      const snap = await getDocs(collection(firebaseDb, "users"));
      setUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    } catch { /* 무시 */ }
  }

  async function loadDomains() {
    if (!firebaseDb) return;
    setDomainsLoading(true); setDomainsError("");
    try {
      const snap = await getDocs(collection(firebaseDb, "schoolDomains"));
      setDomains(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      setDomainsError("도메인 목록을 불러오지 못했습니다: " + err.message);
    } finally {
      setDomainsLoading(false);
    }
  }

  async function loadEmails() {
    if (!firebaseDb) return;
    setEmailsLoading(true); setEmailsError("");
    try {
      const snap = await getDocs(collection(firebaseDb, "userEmailMap"));
      setEmailMaps(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      setEmailsError("이메일 목록을 불러오지 못했습니다: " + err.message);
    } finally {
      setEmailsLoading(false);
    }
  }

  // ── 학교 관리 핸들러 ───────────────────────────────────────────────────────
  async function handleSaveSchool(e) {
    e.preventDefault();
    if (!firebaseDb) return;
    const { schoolId, schoolName } = newSchool;
    if (!schoolId.trim() || !schoolName.trim()) {
      setSchoolSaveMsg("error:학교 ID와 학교명을 모두 입력해주세요."); return;
    }
    setSchoolSaving(true); setSchoolSaveMsg("");
    try {
      const batch = writeBatch(firebaseDb);
      batch.set(doc(firebaseDb, "schools", schoolId.trim()), { name: schoolName.trim(), ownerEmail: "", createdAt: serverTimestamp() });
      batch.set(doc(firebaseDb, "schoolIndex", schoolId.trim()), { name: schoolName.trim() });
      await batch.commit();
      setSchoolSaveMsg("ok:학교가 등록되었습니다.");
      setNewSchool(EMPTY_SCHOOL);
      await loadSchools();
    } catch (err) {
      setSchoolSaveMsg("error:저장에 실패했습니다: " + err.message);
    } finally {
      setSchoolSaving(false);
    }
  }

  async function handleDeleteSchool(schoolId) {
    if (!firebaseDb) return;
    if (!window.confirm(`학교 "${schoolId}"를 삭제하시겠습니까?`)) return;
    try {
      const batch = writeBatch(firebaseDb);
      batch.delete(doc(firebaseDb, "schools", schoolId));
      batch.delete(doc(firebaseDb, "schoolIndex", schoolId));
      await batch.commit();
      setSchools((prev) => prev.filter((s) => s.id !== schoolId));
    } catch (err) {
      setSchoolsError("삭제에 실패했습니다: " + err.message);
    }
  }

  async function handleSaveSchoolName(schoolId, newName) {
    if (!newName.trim() || !firebaseDb) return;
    setSchoolNameSaving(true);
    try {
      const batch = writeBatch(firebaseDb);
      batch.update(doc(firebaseDb, "schools", schoolId), { name: newName.trim() });
      batch.update(doc(firebaseDb, "schoolIndex", schoolId), { name: newName.trim() });
      await batch.commit();
      setSchools((prev) => prev.map((s) => s.id === schoolId ? { ...s, name: newName.trim() } : s));
      setEditingSchoolName(null);
    } catch (err) {
      setSchoolsError("학교명 변경 실패: " + err.message);
    } finally {
      setSchoolNameSaving(false);
    }
  }

  async function handleUnlinkUser(uid, email) {
    if (!firebaseDb) return;
    if (!window.confirm(`"${email}" 유저를 학교에서 해제하시겠습니까?\n해당 유저는 다음 로그인 시 학교를 다시 선택해야 합니다.`)) return;
    try {
      await updateDoc(doc(firebaseDb, "users", uid), { schoolId: null, schoolName: "" });
      setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, schoolId: null, schoolName: "" } : u));
    } catch (err) {
      setReassignError("해제 실패: " + err.message);
    }
  }

  async function handleReassignUser() {
    if (!reassigningUser || !firebaseDb) return;
    const { uid, selectedSchoolId } = reassigningUser;
    const school = schools.find((sc) => sc.id === selectedSchoolId);
    if (!school) return;
    setReassignSaving(true); setReassignError("");
    try {
      await updateDoc(doc(firebaseDb, "users", uid), {
        schoolId: school.id,
        schoolName: school.name,
      });
      setUsers((prev) => prev.map((u) =>
        u.uid === uid ? { ...u, schoolId: school.id, schoolName: school.name } : u
      ));
      setReassigningUser(null);
    } catch (err) {
      setReassignError("변경 실패: " + err.message);
    } finally {
      setReassignSaving(false);
    }
  }

  // ── 도메인 핸들러 ──────────────────────────────────────────────────────────
  async function handleSaveDomain(e) {
    e.preventDefault();
    if (!firebaseDb) return;
    const { domain, schoolId, schoolName } = newDomain;
    if (!domain.trim() || !schoolId.trim() || !schoolName.trim()) {
      setDomainSaveMsg("error:도메인, 학교 ID, 학교명을 모두 입력해주세요."); return;
    }
    setDomainSaving(true); setDomainSaveMsg("");
    try {
      await setDoc(doc(firebaseDb, "schoolDomains", domain.trim()), { schoolId: schoolId.trim(), schoolName: schoolName.trim() });
      setDomainSaveMsg("ok:도메인이 등록되었습니다.");
      setNewDomain(EMPTY_DOMAIN);
      await loadDomains();
    } catch (err) {
      setDomainSaveMsg("error:저장에 실패했습니다: " + err.message);
    } finally {
      setDomainSaving(false);
    }
  }

  async function handleDeleteDomain(domainId) {
    if (!firebaseDb) return;
    if (!window.confirm(`도메인 "${domainId}"를 삭제하시겠습니까?`)) return;
    try {
      await deleteDoc(doc(firebaseDb, "schoolDomains", domainId));
      setDomains((prev) => prev.filter((d) => d.id !== domainId));
    } catch (err) {
      setDomainsError("삭제에 실패했습니다: " + err.message);
    }
  }

  // ── 이메일 핸들러 ──────────────────────────────────────────────────────────
  async function handleSaveEmail(e) {
    e.preventDefault();
    if (!firebaseDb) return;
    const { email, schoolId, schoolName } = newEmail;
    if (!email.trim() || !schoolId.trim() || !schoolName.trim()) {
      setEmailSaveMsg("error:이메일, 학교 ID, 학교명을 모두 입력해주세요."); return;
    }
    setEmailSaving(true); setEmailSaveMsg("");
    try {
      await setDoc(doc(firebaseDb, "userEmailMap", emailToKey(email.trim())), { schoolId: schoolId.trim(), schoolName: schoolName.trim() });
      setEmailSaveMsg("ok:이메일이 등록되었습니다.");
      setNewEmail(EMPTY_EMAIL);
      await loadEmails();
    } catch (err) {
      setEmailSaveMsg("error:저장에 실패했습니다: " + err.message);
    } finally {
      setEmailSaving(false);
    }
  }

  async function handleDeleteEmail(emailKey) {
    if (!firebaseDb) return;
    if (!window.confirm(`이메일 키 "${emailKey}"를 삭제하시겠습니까?`)) return;
    try {
      await deleteDoc(doc(firebaseDb, "userEmailMap", emailKey));
      setEmailMaps((prev) => prev.filter((e) => e.id !== emailKey));
    } catch (err) {
      setEmailsError("삭제에 실패했습니다: " + err.message);
    }
  }

  // ── 렌더 ──────────────────────────────────────────────────────────────────
  return (
    <>
      <div style={s.page}>
        {/* 페이지 헤더 */}
        <div style={s.pageHeader}>
          <div>
            <p style={s.eyebrow}>Super Admin</p>
            <h2 style={s.pageTitle}>시스템 관리 콘솔</h2>
          </div>
          <div style={s.btnRow}>
            {onEnterDemoSchool && (
              <button style={s.outlineBtn} onClick={onEnterDemoSchool}>데모 학교 접속</button>
            )}
            <button style={s.outlineBtn} onClick={onLogout}>로그아웃</button>
          </div>
        </div>

        {/* 탭 */}
        <div style={s.filterRow}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              style={activeTab === tab.id ? s.tabActive : s.tab}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── 탭 1: 학교 관리 ── */}
        {activeTab === "schools" && (
          <>
            {/* 학교 목록 */}
            <div style={s.panel}>
              <div style={s.sectionHead}>
                <div>
                  <p style={s.eyebrow}>등록된 학교</p>
                  <p style={s.sectionTitle}>학교 목록</p>
                </div>
                <button style={s.outlineBtn} onClick={() => { loadSchools(); loadUsers(); }} disabled={schoolsLoading}>
                  {schoolsLoading ? "불러오는 중…" : "새로고침"}
                </button>
              </div>

              {schoolsError && <p style={{ ...s.notice, ...s.noticeErr, marginTop: 0, marginBottom: "0.75rem" }}>{schoolsError}</p>}

              {schoolsLoading ? (
                <p style={s.emptyRow}>불러오는 중…</p>
              ) : schools.length === 0 ? (
                <p style={s.emptyRow}>등록된 학교가 없습니다.</p>
              ) : (
                <div style={s.tableWrap}>
                  <table style={s.table}>
                    <thead style={s.thead}>
                      <tr>
                        {[["id","학교 ID"],["name","학교명"],["isGuest","구분"],["ownerEmail","소유자 이메일"],["users","소속 유저"],["createdAt","등록일"]].map(([key, label]) => (
                          <th
                            key={key}
                            style={key !== "users" ? { ...s.th, ...s.thSort } : s.th}
                            onClick={key !== "users" ? () => schoolSort.toggle(key) : undefined}
                          >
                            {label}{key !== "users" && schoolSort.Ind(key)}
                          </th>
                        ))}
                        <th style={s.th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {schoolSort.sortData(schools, {
                        id:         (sc) => sc.id || "",
                        name:       (sc) => sc.name || "",
                        isGuest:    (sc) => sc.isGuest ? "Guest" : "정식",
                        ownerEmail: (sc) => sc.ownerEmail || "",
                        createdAt:  (sc) => sc.createdAt?.toDate?.()?.getTime() ?? 0,
                      }).map((school) => {
                        const schoolUsers = users.filter((u) => u.schoolId === school.id);
                        const isExpanded  = expandedSchool === school.id;
                        const isEditing   = editingSchoolName?.id === school.id;
                        return (
                          <>
                            <tr
                              key={school.id}
                              style={s.tr}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ""}
                            >
                              <td style={s.tdMono}>{school.id}</td>
                              <td style={s.td}>
                                {isEditing ? (
                                  <span style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                                    <input
                                      style={{ ...s.input, width: "160px", padding: "0.2rem 0.5rem", fontSize: "0.82rem" }}
                                      value={editingSchoolName.name}
                                      onChange={(e) => setEditingSchoolName((p) => ({ ...p, name: e.target.value }))}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveSchoolName(school.id, editingSchoolName.name);
                                        if (e.key === "Escape") setEditingSchoolName(null);
                                      }}
                                      autoFocus
                                    />
                                    <button style={{ ...s.smBtn, backgroundColor: "#4f46e5", color: "#fff" }} disabled={schoolNameSaving} onClick={() => handleSaveSchoolName(school.id, editingSchoolName.name)}>저장</button>
                                    <button style={{ ...s.smBtn, backgroundColor: "#f3f4f6", color: "#374151" }} onClick={() => setEditingSchoolName(null)}>취소</button>
                                  </span>
                                ) : (
                                  <span style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                                    {school.name}
                                    <button style={s.editBtn} onClick={() => setEditingSchoolName({ id: school.id, name: school.name })}>수정</button>
                                  </span>
                                )}
                              </td>
                              <td style={s.td}>
                                <span style={school.isGuest ? s.badgeGray : s.badgeGreen}>
                                  {school.isGuest ? "Guest" : "정식"}
                                </span>
                              </td>
                              <td style={s.tdMuted}>{school.ownerEmail || "—"}</td>
                              <td style={s.td}>
                                <button
                                  style={{ ...s.editBtn, color: isExpanded ? "#4f46e5" : "#6b7280", borderColor: isExpanded ? "#c7d2fe" : "#e5e7eb" }}
                                  onClick={() => setExpandedSchool(isExpanded ? null : school.id)}
                                >
                                  👥 {schoolUsers.length}명 {isExpanded ? "▴" : "▾"}
                                </button>
                              </td>
                              <td style={s.tdMuted}>
                                {school.createdAt?.toDate ? school.createdAt.toDate().toLocaleDateString("ko-KR") : "—"}
                              </td>
                              <td style={s.tdRight}>
                                <span style={{ display: "flex", gap: "0.3rem", justifyContent: "flex-end" }}>
                                  <button
                                    style={{ ...s.editBtn, whiteSpace: "nowrap" }}
                                    onClick={() => {
                                      setActiveTab("domains");
                                      setNewDomain({ domain: "", schoolId: school.id, schoolName: school.name });
                                    }}
                                  >
                                    도메인 등록 →
                                  </button>
                                  <button style={s.deleteBtn} onClick={() => handleDeleteSchool(school.id)}>삭제</button>
                                </span>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr key={`${school.id}-users`} style={s.expandedRow}>
                                <td colSpan={7} style={{ padding: "0.75rem 1rem" }}>
                                  {schoolUsers.length === 0 ? (
                                    <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>소속 유저 없음</span>
                                  ) : (
                                    <table style={s.subTable}>
                                      <thead>
                                        <tr>
                                          <th style={s.subTh}>이메일</th>
                                          <th style={s.subTh}>이름</th>
                                          <th style={s.subTh}>역할</th>
                                          <th style={s.subTh}></th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {schoolUsers.map((u) => {
                                          const isReassigning = reassigningUser?.uid === u.uid;
                                          return (
                                            <tr key={u.uid}>
                                              <td style={s.subTd}>{u.email || "—"}</td>
                                              <td style={s.subTd}>{u.displayName || "—"}</td>
                                              <td style={s.subTd}>{u.role || "—"}</td>
                                              <td style={{ ...s.subTd, whiteSpace: "nowrap" }}>
                                                {isReassigning ? (
                                                  <span style={{ display: "flex", gap: "0.3rem", alignItems: "center", flexWrap: "wrap" }}>
                                                    <select
                                                      style={{ padding: "0.2rem 0.4rem", border: "1px solid #d1d5db", borderRadius: "5px", fontSize: "0.75rem" }}
                                                      value={reassigningUser.selectedSchoolId}
                                                      onChange={(e) => setReassigningUser((p) => ({ ...p, selectedSchoolId: e.target.value }))}
                                                    >
                                                      {schools.map((sc) => (
                                                        <option key={sc.id} value={sc.id}>{sc.name} ({sc.id})</option>
                                                      ))}
                                                    </select>
                                                    <button style={{ ...s.smBtn, backgroundColor: "#4f46e5", color: "#fff" }} disabled={reassignSaving} onClick={handleReassignUser}>
                                                      {reassignSaving ? "…" : "저장"}
                                                    </button>
                                                    <button style={{ ...s.smBtn, backgroundColor: "#f3f4f6", color: "#374151" }} onClick={() => { setReassigningUser(null); setReassignError(""); }}>취소</button>
                                                    {reassignError && <span style={{ color: "#dc2626", fontSize: "0.72rem" }}>{reassignError}</span>}
                                                  </span>
                                                ) : (
                                                  <span style={{ display: "flex", gap: "0.3rem" }}>
                                                    <button
                                                      style={s.editBtn}
                                                      onClick={() => setReassigningUser({ uid: u.uid, selectedSchoolId: u.schoolId || school.id })}
                                                    >
                                                      학교 변경
                                                    </button>
                                                    <button
                                                      style={s.deleteBtn}
                                                      onClick={() => handleUnlinkUser(u.uid, u.email)}
                                                    >
                                                      해제
                                                    </button>
                                                  </span>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  )}
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 학교 추가 폼 */}
            <div style={s.panel}>
              <div style={s.sectionHead}>
                <div>
                  <p style={s.eyebrow}>신규 등록</p>
                  <p style={s.sectionTitle}>학교 추가</p>
                </div>
              </div>
              <form onSubmit={handleSaveSchool}>
                <div style={s.formGrid2}>
                  <div>
                    <label style={s.label}>학교 ID</label>
                    <input style={s.input} placeholder="예: hakgyo-hs" value={newSchool.schoolId}
                      onChange={(e) => setNewSchool((p) => ({ ...p, schoolId: e.target.value }))} />
                  </div>
                  <div>
                    <label style={s.label}>학교명</label>
                    <input style={s.input} placeholder="예: ○○고등학교" value={newSchool.schoolName}
                      onChange={(e) => setNewSchool((p) => ({ ...p, schoolName: e.target.value }))} />
                  </div>
                </div>
                <button style={s.primaryBtn} type="submit" disabled={schoolSaving}>
                  {schoolSaving ? "저장 중…" : "학교 등록"}
                </button>
                <SaveNotice msg={schoolSaveMsg} />
              </form>
            </div>
          </>
        )}

        {/* ── 탭 2: 도메인 등록 ── */}
        {activeTab === "domains" && (
          <>
            <div style={s.panel}>
              <div style={s.sectionHead}>
                <div>
                  <p style={s.eyebrow}>등록된 도메인</p>
                  <p style={s.sectionTitle}>도메인 목록</p>
                </div>
                <button style={s.outlineBtn} onClick={loadDomains} disabled={domainsLoading}>
                  {domainsLoading ? "불러오는 중…" : "새로고침"}
                </button>
              </div>

              {domainsError && <p style={{ ...s.notice, ...s.noticeErr, marginTop: 0, marginBottom: "0.75rem" }}>{domainsError}</p>}

              {domainsLoading ? (
                <p style={s.emptyRow}>불러오는 중…</p>
              ) : domains.length === 0 ? (
                <p style={s.emptyRow}>등록된 도메인이 없습니다.</p>
              ) : (
                <div style={s.tableWrap}>
                  <table style={s.table}>
                    <thead style={s.thead}>
                      <tr>
                        {[["id","도메인"],["schoolId","학교 ID"],["schoolName","학교명"]].map(([key, label]) => (
                          <th key={key} style={{ ...s.th, ...s.thSort }} onClick={() => domainSort.toggle(key)}>
                            {label}{domainSort.Ind(key)}
                          </th>
                        ))}
                        <th style={s.th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {domainSort.sortData(domains, {
                        id:         (d) => d.id || "",
                        schoolId:   (d) => d.schoolId || "",
                        schoolName: (d) => d.schoolName || "",
                      }).map((d) => (
                        <tr key={d.id} style={s.tr}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ""}>
                          <td style={s.tdMono}>{d.id}</td>
                          <td style={s.tdMuted}>{d.schoolId}</td>
                          <td style={s.td}>{d.schoolName}</td>
                          <td style={s.tdRight}>
                            <button style={s.deleteBtn} onClick={() => handleDeleteDomain(d.id)}>삭제</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={s.panel}>
              <div style={s.sectionHead}>
                <div>
                  <p style={s.eyebrow}>신규 등록</p>
                  <p style={s.sectionTitle}>도메인 추가</p>
                </div>
              </div>
              <form onSubmit={handleSaveDomain}>
                <div style={s.formGrid3}>
                  <div>
                    <label style={s.label}>도메인</label>
                    <input style={s.input} placeholder="예: hakgyo.hs.kr" value={newDomain.domain}
                      onChange={(e) => setNewDomain((p) => ({ ...p, domain: e.target.value }))} />
                  </div>
                  <div>
                    <label style={s.label}>학교 ID</label>
                    <input style={s.input} placeholder="예: hakgyo-hs" value={newDomain.schoolId}
                      onChange={(e) => setNewDomain((p) => ({ ...p, schoolId: e.target.value }))} />
                  </div>
                  <div>
                    <label style={s.label}>학교명</label>
                    <input style={s.input} placeholder="예: ○○고등학교" value={newDomain.schoolName}
                      onChange={(e) => setNewDomain((p) => ({ ...p, schoolName: e.target.value }))} />
                  </div>
                </div>
                <button style={s.primaryBtn} type="submit" disabled={domainSaving}>
                  {domainSaving ? "저장 중…" : "도메인 등록"}
                </button>
                <SaveNotice msg={domainSaveMsg} />
              </form>
            </div>
          </>
        )}

        {/* ── 탭 3: 개인 이메일 등록 ── */}
        {activeTab === "emails" && (
          <>
            <div style={s.panel}>
              <div style={s.sectionHead}>
                <div>
                  <p style={s.eyebrow}>등록된 이메일</p>
                  <p style={s.sectionTitle}>개인 이메일 목록</p>
                </div>
                <button style={s.outlineBtn} onClick={loadEmails} disabled={emailsLoading}>
                  {emailsLoading ? "불러오는 중…" : "새로고침"}
                </button>
              </div>

              {emailsError && <p style={{ ...s.notice, ...s.noticeErr, marginTop: 0, marginBottom: "0.75rem" }}>{emailsError}</p>}

              {emailsLoading ? (
                <p style={s.emptyRow}>불러오는 중…</p>
              ) : emailMaps.length === 0 ? (
                <p style={s.emptyRow}>등록된 이메일이 없습니다.</p>
              ) : (
                <div style={s.tableWrap}>
                  <table style={s.table}>
                    <thead style={s.thead}>
                      <tr>
                        {[["id","이메일 키"],["schoolId","학교 ID"],["schoolName","학교명"]].map(([key, label]) => (
                          <th key={key} style={{ ...s.th, ...s.thSort }} onClick={() => emailSort.toggle(key)}>
                            {label}{emailSort.Ind(key)}
                          </th>
                        ))}
                        <th style={s.th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailSort.sortData(emailMaps, {
                        id:         (e) => e.id || "",
                        schoolId:   (e) => e.schoolId || "",
                        schoolName: (e) => e.schoolName || "",
                      }).map((em) => (
                        <tr key={em.id} style={s.tr}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ""}>
                          <td style={s.tdMono}>{em.id}</td>
                          <td style={s.tdMuted}>{em.schoolId}</td>
                          <td style={s.td}>{em.schoolName}</td>
                          <td style={s.tdRight}>
                            <button style={s.deleteBtn} onClick={() => handleDeleteEmail(em.id)}>삭제</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={s.panel}>
              <div style={s.sectionHead}>
                <div>
                  <p style={s.eyebrow}>신규 등록</p>
                  <p style={s.sectionTitle}>개인 이메일 추가</p>
                </div>
              </div>
              <form onSubmit={handleSaveEmail}>
                <div style={s.formGrid3}>
                  <div>
                    <label style={s.label}>이메일</label>
                    <input style={s.input} type="email" placeholder="예: teacher@gmail.com" value={newEmail.email}
                      onChange={(e) => setNewEmail((p) => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div>
                    <label style={s.label}>학교 ID</label>
                    <input style={s.input} placeholder="예: hakgyo-hs" value={newEmail.schoolId}
                      onChange={(e) => setNewEmail((p) => ({ ...p, schoolId: e.target.value }))} />
                  </div>
                  <div>
                    <label style={s.label}>학교명</label>
                    <input style={s.input} placeholder="예: ○○고등학교" value={newEmail.schoolName}
                      onChange={(e) => setNewEmail((p) => ({ ...p, schoolName: e.target.value }))} />
                  </div>
                </div>
                <button style={s.primaryBtn} type="submit" disabled={emailSaving}>
                  {emailSaving ? "저장 중…" : "이메일 등록"}
                </button>
                <SaveNotice msg={emailSaveMsg} />
                <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.5rem" }}>
                  * 이메일 키 변환 규칙: @ → _at_ / . → _dot_
                </p>
              </form>
            </div>
          </>
        )}
      </div>
      <AppFooter />
    </>
  );
}

export default SuperAdminPage;
