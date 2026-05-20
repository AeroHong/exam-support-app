import { useState } from "react";
import RoomsTab from "./RoomsTab";
import SectionDataTab from "./SectionDataTab";
import StudentRosterTab from "./StudentRosterTab";
import SubjectsTab from "./SubjectsTab";

const TABS = [
  { key: "subjects", label: "과목" },
  { key: "students", label: "학생 명렬" },
  { key: "rooms",    label: "고사실" },
  { key: "sections", label: "분반 데이터" },
];

const s = {
  page:      { padding: "1.5rem", maxWidth: "1200px" },
  pageHeader:{ marginBottom: "1rem" },
  eyebrow:   { fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 },
  pageTitle: { fontSize: "1.5rem", fontWeight: 800, color: "#111827", margin: "0.1rem 0 0" },
  tabRow:    { display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "1.5rem", flexWrap: "wrap" },
  tab:       { padding: "0.3rem 0.75rem", border: "1px solid #e5e7eb", borderRadius: "999px", cursor: "pointer", fontSize: "0.82rem", backgroundColor: "#fff", color: "#6b7280" },
  tabActive: { padding: "0.3rem 0.75rem", border: "1px solid #4f46e5", borderRadius: "999px", cursor: "pointer", fontSize: "0.82rem", backgroundColor: "#eef2ff", color: "#4f46e5", fontWeight: 700 },
  arrow:     { fontSize: "0.75rem", color: "#d1d5db", userSelect: "none" },
};

export default function DataManagementPage({ schoolId, students = [], enrollments = [], subjects = [], onDataChanged, onReloadStudents, readOnly = false }) {
  const [activeTab, setActiveTab] = useState("subjects");

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <p style={s.eyebrow}>기초 데이터</p>
        <h2 style={s.pageTitle}>기초 데이터 관리</h2>
      </div>
      {readOnly && (
        <div style={{ marginBottom: "1rem", padding: "0.6rem 1rem", backgroundColor: "#fef9c3", border: "1px solid #fde047", borderRadius: "8px", fontSize: "0.85rem", color: "#854d0e" }}>
          데모 모드에서는 데이터 조회만 가능합니다. 수정·추가·삭제는 관리자에게 문의하세요.
        </div>
      )}

      <div style={s.tabRow}>
        {TABS.map((tab, i) => (
          <span key={tab.key} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            {i > 0 && <span style={s.arrow}>→</span>}
            <button
              style={activeTab === tab.key ? s.tabActive : s.tab}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          </span>
        ))}
      </div>

      {activeTab === "students" && <StudentRosterTab schoolId={schoolId} subjects={subjects} onDataChanged={onDataChanged} onReloadStudents={onReloadStudents} readOnly={readOnly} />}
      {activeTab === "rooms"    && <RoomsTab    schoolId={schoolId} students={students} readOnly={readOnly} />}
      {activeTab === "subjects" && <SubjectsTab schoolId={schoolId} onDataChanged={onDataChanged} readOnly={readOnly} />}
      {activeTab === "sections" && <SectionDataTab schoolId={schoolId} enrollments={enrollments} onDataChanged={onDataChanged} readOnly={readOnly} />}
    </div>
  );
}
