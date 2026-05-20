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

const TAB_LIST = [
  { id: "schools", label: "학교 관리" },
  { id: "domains", label: "도메인 등록" },
  { id: "emails", label: "개인 이메일 등록" },
];

const EMPTY_SCHOOL = { schoolId: "", schoolName: "" };
const EMPTY_DOMAIN = { domain: "", schoolId: "", schoolName: "" };
const EMPTY_EMAIL = { email: "", schoolId: "", schoolName: "" };

function SuperAdminPage({ onLogout, onEnterDemoSchool }) {
  const [activeTab, setActiveTab] = useState("schools");
  const schoolSort  = useTableSort();
  const domainSort  = useTableSort();
  const emailSort   = useTableSort();

  // ─── 학교 관리 상태 ──────────────────────────────────────────────────────
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

  // ─── 도메인 등록 상태 ────────────────────────────────────────────────────
  const [domains, setDomains] = useState([]);
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [domainsError, setDomainsError] = useState("");
  const [newDomain, setNewDomain] = useState(EMPTY_DOMAIN);
  const [domainSaving, setDomainSaving] = useState(false);
  const [domainSaveMsg, setDomainSaveMsg] = useState("");

  // ─── 이메일 등록 상태 ────────────────────────────────────────────────────
  const [emailMaps, setEmailMaps] = useState([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [emailsError, setEmailsError] = useState("");
  const [newEmail, setNewEmail] = useState(EMPTY_EMAIL);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSaveMsg, setEmailSaveMsg] = useState("");

  // ─── 데이터 로딩 ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === "schools") { loadSchools(); loadUsers(); }
    if (activeTab === "domains") loadDomains();
    if (activeTab === "emails") loadEmails();
  }, [activeTab]);

  async function loadSchools() {
    if (!firebaseDb) return;
    setSchoolsLoading(true);
    setSchoolsError("");
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
    } catch {
      // 유저 로드 실패는 무시 (학교 목록은 표시)
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

  async function loadDomains() {
    if (!firebaseDb) return;
    setDomainsLoading(true);
    setDomainsError("");
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
    setEmailsLoading(true);
    setEmailsError("");
    try {
      const snap = await getDocs(collection(firebaseDb, "userEmailMap"));
      setEmailMaps(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      setEmailsError("이메일 목록을 불러오지 못했습니다: " + err.message);
    } finally {
      setEmailsLoading(false);
    }
  }

  // ─── 학교 저장 ───────────────────────────────────────────────────────────
  async function handleSaveSchool(e) {
    e.preventDefault();
    if (!firebaseDb) return;
    const { schoolId, schoolName } = newSchool;
    if (!schoolId.trim() || !schoolName.trim()) {
      setSchoolSaveMsg("error:학교 ID와 학교명을 모두 입력해주세요.");
      return;
    }
    setSchoolSaving(true);
    setSchoolSaveMsg("");
    try {
      const batch = writeBatch(firebaseDb);
      batch.set(doc(firebaseDb, "schools", schoolId.trim()), {
        name: schoolName.trim(),
        ownerEmail: "",
        createdAt: serverTimestamp(),
      });
      batch.set(doc(firebaseDb, "schoolIndex", schoolId.trim()), {
        name: schoolName.trim(),
      });
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

  // ─── 도메인 저장 ─────────────────────────────────────────────────────────
  async function handleSaveDomain(e) {
    e.preventDefault();
    if (!firebaseDb) return;
    const { domain, schoolId, schoolName } = newDomain;
    if (!domain.trim() || !schoolId.trim() || !schoolName.trim()) {
      setDomainSaveMsg("error:도메인, 학교 ID, 학교명을 모두 입력해주세요.");
      return;
    }
    setDomainSaving(true);
    setDomainSaveMsg("");
    try {
      await setDoc(doc(firebaseDb, "schoolDomains", domain.trim()), {
        schoolId: schoolId.trim(),
        schoolName: schoolName.trim(),
      });
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

  // ─── 이메일 저장 ─────────────────────────────────────────────────────────
  async function handleSaveEmail(e) {
    e.preventDefault();
    if (!firebaseDb) return;
    const { email, schoolId, schoolName } = newEmail;
    if (!email.trim() || !schoolId.trim() || !schoolName.trim()) {
      setEmailSaveMsg("error:이메일, 학교 ID, 학교명을 모두 입력해주세요.");
      return;
    }
    const emailKey = emailToKey(email.trim());
    setEmailSaving(true);
    setEmailSaveMsg("");
    try {
      await setDoc(doc(firebaseDb, "userEmailMap", emailKey), {
        schoolId: schoolId.trim(),
        schoolName: schoolName.trim(),
      });
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

  // ─── 유틸 ────────────────────────────────────────────────────────────────
  function parseSaveMsg(msg) {
    if (!msg) return null;
    const [type, ...rest] = msg.split(":");
    return { type, text: rest.join(":") };
  }

  function SaveNotice({ msg }) {
    const parsed = parseSaveMsg(msg);
    if (!parsed) return null;
    const isOk = parsed.type === "ok";
    return (
      <p
        className={`mt-2 rounded-2xl px-4 py-2 text-sm font-bold ${
          isOk ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}
      >
        {parsed.text}
      </p>
    );
  }

  // ─── 공통 입력 스타일 ────────────────────────────────────────────────────
  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-[inherit] focus:outline-none focus:ring-2 focus:ring-slate-400";

  // ─── 렌더 ─────────────────────────────────────────────────────────────────
  return (
    <>
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* 헤더 */}
      <div className="dense-page-header mb-6">
        <div>
          <p className="eyebrow">Super Admin</p>
          <h2 className="mt-1 text-2xl font-extrabold">시스템 관리 콘솔</h2>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {onEnterDemoSchool && (
            <button type="button" className="primary-button text-sm" onClick={onEnterDemoSchool}>
              데모 학교 접속
            </button>
          )}
          <button type="button" className="secondary-button text-sm" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div className="filter-row mb-5">
        {TAB_LIST.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`chip ${activeTab === tab.id ? "chip-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ────────────────── 탭 1: 학교 관리 ────────────────── */}
      {activeTab === "schools" && (
        <div className="dense-page">
          {/* 목록 */}
          <section className="panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">등록된 학교</p>
                <h3 className="mt-1 text-xl font-bold">학교 목록</h3>
              </div>
              <button
                type="button"
                className="secondary-button text-sm"
                onClick={loadSchools}
                disabled={schoolsLoading}
              >
                {schoolsLoading ? "불러오는 중…" : "새로고침"}
              </button>
            </div>

            {schoolsError && (
              <p className="top-message error mb-3 text-sm">{schoolsError}</p>
            )}

            {schoolsLoading ? (
              <p className="empty-state">불러오는 중…</p>
            ) : schools.length === 0 ? (
              <p className="empty-state">등록된 학교가 없습니다.</p>
            ) : (
              <div className="input-table-wrap">
                <table className="input-table">
                  <thead>
                    <tr>
                      {[["id","학교 ID"],["name","학교명"],["isGuest","구분"],["ownerEmail","소유자 이메일"],["users","소속 유저"],["createdAt","등록일"]].map(([key, label]) => (
                        <th key={key} style={key !== "users" ? schoolSort.thSort : undefined} onClick={key !== "users" ? () => schoolSort.toggle(key) : undefined}>
                          {label}{key !== "users" && schoolSort.Ind(key)}
                        </th>
                      ))}
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {schoolSort.sortData(schools, {
                      id:         (s) => s.id || "",
                      name:       (s) => s.name || "",
                      isGuest:    (s) => s.isGuest ? "Guest" : "정식",
                      ownerEmail: (s) => s.ownerEmail || "",
                      createdAt:  (s) => s.createdAt?.toDate?.()?.getTime() ?? 0,
                    }).map((school) => {
                      const schoolUsers = users.filter((u) => u.schoolId === school.id);
                      const isExpanded = expandedSchool === school.id;
                      const isEditing = editingSchoolName?.id === school.id;
                      return (
                        <>
                          <tr key={school.id}>
                            <td className="font-mono text-xs">{school.id}</td>
                            <td>
                              {isEditing ? (
                                <span style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                                  <input
                                    className={inputCls}
                                    style={{ width: "160px", padding: "0.2rem 0.5rem" }}
                                    value={editingSchoolName.name}
                                    onChange={(e) => setEditingSchoolName((p) => ({ ...p, name: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSaveSchoolName(school.id, editingSchoolName.name);
                                      if (e.key === "Escape") setEditingSchoolName(null);
                                    }}
                                    autoFocus
                                  />
                                  <button type="button" className="primary-button text-xs" style={{ padding: "0.2rem 0.5rem" }} disabled={schoolNameSaving} onClick={() => handleSaveSchoolName(school.id, editingSchoolName.name)}>저장</button>
                                  <button type="button" className="secondary-button text-xs" style={{ padding: "0.2rem 0.5rem" }} onClick={() => setEditingSchoolName(null)}>취소</button>
                                </span>
                              ) : (
                                <span style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                                  {school.name}
                                  <button type="button" className="chip text-xs" style={{ padding: "0.1rem 0.4rem", fontSize: "0.7rem" }} onClick={() => setEditingSchoolName({ id: school.id, name: school.name })}>✏️</button>
                                </span>
                              )}
                            </td>
                            <td>
                              <span className={`card-badge ${school.isGuest ? "badge-essay" : "badge-safe"}`}>
                                {school.isGuest ? "Guest" : "정식"}
                              </span>
                            </td>
                            <td className="text-sm text-slate-500">{school.ownerEmail || "—"}</td>
                            <td>
                              <button
                                type="button"
                                className={`chip text-xs ${isExpanded ? "chip-active" : ""}`}
                                onClick={() => setExpandedSchool(isExpanded ? null : school.id)}
                              >
                                👥 {schoolUsers.length}명 {isExpanded ? "▴" : "▾"}
                              </button>
                            </td>
                            <td className="text-sm text-slate-400">
                              {school.createdAt?.toDate ? school.createdAt.toDate().toLocaleDateString("ko-KR") : "—"}
                            </td>
                            <td>
                              <span style={{ display: "flex", gap: "0.3rem", flexWrap: "nowrap" }}>
                                <button
                                  type="button"
                                  className="chip text-xs"
                                  style={{ whiteSpace: "nowrap" }}
                                  onClick={() => {
                                    setActiveTab("domains");
                                    setNewDomain({ domain: "", schoolId: school.id, schoolName: school.name });
                                  }}
                                >
                                  도메인 등록 →
                                </button>
                                <button type="button" className="chip danger-button text-xs" onClick={() => handleDeleteSchool(school.id)}>삭제</button>
                              </span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${school.id}-users`} style={{ backgroundColor: "#f8fafc" }}>
                              <td colSpan={7} style={{ padding: "0.75rem 1rem" }}>
                                {schoolUsers.length === 0 ? (
                                  <span className="text-xs text-slate-400">소속 유저 없음</span>
                                ) : (
                                  <table style={{ width: "100%", fontSize: "0.78rem", borderCollapse: "collapse" }}>
                                    <thead>
                                      <tr style={{ color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>
                                        <th style={{ textAlign: "left", padding: "0.2rem 0.5rem", fontWeight: 600 }}>이메일</th>
                                        <th style={{ textAlign: "left", padding: "0.2rem 0.5rem", fontWeight: 600 }}>이름</th>
                                        <th style={{ textAlign: "left", padding: "0.2rem 0.5rem", fontWeight: 600 }}>역할</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {schoolUsers.map((u) => (
                                        <tr key={u.uid} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                          <td style={{ padding: "0.2rem 0.5rem", color: "#374151" }}>{u.email || "—"}</td>
                                          <td style={{ padding: "0.2rem 0.5rem", color: "#374151" }}>{u.displayName || "—"}</td>
                                          <td style={{ padding: "0.2rem 0.5rem", color: "#6b7280" }}>{u.role || "—"}</td>
                                        </tr>
                                      ))}
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
          </section>

          {/* 등록 폼 */}
          <section className="panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">신규 등록</p>
                <h3 className="mt-1 text-xl font-bold">학교 추가</h3>
              </div>
            </div>
            <form onSubmit={handleSaveSchool} className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <label className="eyebrow">학교 ID</label>
                <input
                  className={inputCls}
                  placeholder="예: seonyu-hs"
                  value={newSchool.schoolId}
                  onChange={(e) =>
                    setNewSchool((prev) => ({ ...prev, schoolId: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-1">
                <label className="eyebrow">학교명</label>
                <input
                  className={inputCls}
                  placeholder="예: 선유고등학교"
                  value={newSchool.schoolName}
                  onChange={(e) =>
                    setNewSchool((prev) => ({ ...prev, schoolName: e.target.value }))
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="primary-button text-sm"
                  disabled={schoolSaving}
                >
                  {schoolSaving ? "저장 중…" : "학교 등록"}
                </button>
                <SaveNotice msg={schoolSaveMsg} />
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ────────────────── 탭 2: 도메인 등록 ────────────────── */}
      {activeTab === "domains" && (
        <div className="dense-page">
          {/* 목록 */}
          <section className="panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">등록된 도메인</p>
                <h3 className="mt-1 text-xl font-bold">도메인 목록</h3>
              </div>
              <button
                type="button"
                className="secondary-button text-sm"
                onClick={loadDomains}
                disabled={domainsLoading}
              >
                {domainsLoading ? "불러오는 중…" : "새로고침"}
              </button>
            </div>

            {domainsError && (
              <p className="top-message error mb-3 text-sm">{domainsError}</p>
            )}

            {domainsLoading ? (
              <p className="empty-state">불러오는 중…</p>
            ) : domains.length === 0 ? (
              <p className="empty-state">등록된 도메인이 없습니다.</p>
            ) : (
              <div className="input-table-wrap">
                <table className="input-table">
                  <thead>
                    <tr>
                      {[["id","도메인"],["schoolId","학교 ID"],["schoolName","학교명"]].map(([key, label]) => (
                        <th key={key} style={domainSort.thSort} onClick={() => domainSort.toggle(key)}>
                          {label}{domainSort.Ind(key)}
                        </th>
                      ))}
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {domainSort.sortData(domains, {
                      id:         (d) => d.id || "",
                      schoolId:   (d) => d.schoolId || "",
                      schoolName: (d) => d.schoolName || "",
                    }).map((d) => (
                      <tr key={d.id}>
                        <td className="font-mono text-xs">{d.id}</td>
                        <td className="text-sm text-slate-600">{d.schoolId}</td>
                        <td>{d.schoolName}</td>
                        <td>
                          <button
                            type="button"
                            className="chip danger-button text-xs"
                            onClick={() => handleDeleteDomain(d.id)}
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 등록 폼 */}
          <section className="panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">신규 등록</p>
                <h3 className="mt-1 text-xl font-bold">도메인 추가</h3>
              </div>
            </div>
            <form onSubmit={handleSaveDomain} className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1">
                <label className="eyebrow">도메인</label>
                <input
                  className={inputCls}
                  placeholder="예: seonyu.hs.kr"
                  value={newDomain.domain}
                  onChange={(e) =>
                    setNewDomain((prev) => ({ ...prev, domain: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-1">
                <label className="eyebrow">학교 ID</label>
                <input
                  className={inputCls}
                  placeholder="예: seonyu-hs"
                  value={newDomain.schoolId}
                  onChange={(e) =>
                    setNewDomain((prev) => ({ ...prev, schoolId: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-1">
                <label className="eyebrow">학교명</label>
                <input
                  className={inputCls}
                  placeholder="예: 선유고등학교"
                  value={newDomain.schoolName}
                  onChange={(e) =>
                    setNewDomain((prev) => ({ ...prev, schoolName: e.target.value }))
                  }
                />
              </div>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="primary-button text-sm"
                  disabled={domainSaving}
                >
                  {domainSaving ? "저장 중…" : "도메인 등록"}
                </button>
                <SaveNotice msg={domainSaveMsg} />
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ────────────────── 탭 3: 개인 이메일 등록 ────────────────── */}
      {activeTab === "emails" && (
        <div className="dense-page">
          {/* 목록 */}
          <section className="panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">등록된 이메일</p>
                <h3 className="mt-1 text-xl font-bold">개인 이메일 목록</h3>
              </div>
              <button
                type="button"
                className="secondary-button text-sm"
                onClick={loadEmails}
                disabled={emailsLoading}
              >
                {emailsLoading ? "불러오는 중…" : "새로고침"}
              </button>
            </div>

            {emailsError && (
              <p className="top-message error mb-3 text-sm">{emailsError}</p>
            )}

            {emailsLoading ? (
              <p className="empty-state">불러오는 중…</p>
            ) : emailMaps.length === 0 ? (
              <p className="empty-state">등록된 이메일이 없습니다.</p>
            ) : (
              <div className="input-table-wrap">
                <table className="input-table">
                  <thead>
                    <tr>
                      {[["id","이메일 키"],["schoolId","학교 ID"],["schoolName","학교명"]].map(([key, label]) => (
                        <th key={key} style={emailSort.thSort} onClick={() => emailSort.toggle(key)}>
                          {label}{emailSort.Ind(key)}
                        </th>
                      ))}
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailSort.sortData(emailMaps, {
                      id:         (e) => e.id || "",
                      schoolId:   (e) => e.schoolId || "",
                      schoolName: (e) => e.schoolName || "",
                    }).map((em) => (
                      <tr key={em.id}>
                        <td className="font-mono text-xs">{em.id}</td>
                        <td className="text-sm text-slate-600">{em.schoolId}</td>
                        <td>{em.schoolName}</td>
                        <td>
                          <button
                            type="button"
                            className="chip danger-button text-xs"
                            onClick={() => handleDeleteEmail(em.id)}
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 등록 폼 */}
          <section className="panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">신규 등록</p>
                <h3 className="mt-1 text-xl font-bold">개인 이메일 추가</h3>
              </div>
            </div>
            <form onSubmit={handleSaveEmail} className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1">
                <label className="eyebrow">이메일</label>
                <input
                  className={inputCls}
                  type="email"
                  placeholder="예: teacher@gmail.com"
                  value={newEmail.email}
                  onChange={(e) =>
                    setNewEmail((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-1">
                <label className="eyebrow">학교 ID</label>
                <input
                  className={inputCls}
                  placeholder="예: seonyu-hs"
                  value={newEmail.schoolId}
                  onChange={(e) =>
                    setNewEmail((prev) => ({ ...prev, schoolId: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-1">
                <label className="eyebrow">학교명</label>
                <input
                  className={inputCls}
                  placeholder="예: 선유고등학교"
                  value={newEmail.schoolName}
                  onChange={(e) =>
                    setNewEmail((prev) => ({ ...prev, schoolName: e.target.value }))
                  }
                />
              </div>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="primary-button text-sm"
                  disabled={emailSaving}
                >
                  {emailSaving ? "저장 중…" : "이메일 등록"}
                </button>
                <SaveNotice msg={emailSaveMsg} />
              </div>
            </form>
            <p className="mt-3 text-xs text-slate-400">
              * 이메일 키 변환 규칙: @ → _at_ / . → _dot_
            </p>
          </section>
        </div>
      )}
    </main>
    <AppFooter />
    </>
  );
}

export default SuperAdminPage;
