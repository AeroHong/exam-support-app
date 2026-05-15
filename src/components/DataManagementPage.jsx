import { useState } from "react";
import RoomsTab from "./RoomsTab";
import StudentRosterTab from "./StudentRosterTab";
import SubjectsTab from "./SubjectsTab";

const TABS = [
  { key: "students", label: "학생 명렬" },
  { key: "rooms",    label: "고사실" },
  { key: "subjects", label: "과목" },
];

const s = {
  page:      { padding: "1.5rem", maxWidth: "1200px" },
  pageHeader:{ marginBottom: "1rem" },
  eyebrow:   { fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 },
  pageTitle: { fontSize: "1.5rem", fontWeight: 800, color: "#111827", margin: "0.1rem 0 0" },
  tabRow:    { display: "flex", gap: "0.4rem", marginBottom: "1.5rem" },
  tab:       { padding: "0.3rem 0.75rem", border: "1px solid #e5e7eb", borderRadius: "999px", cursor: "pointer", fontSize: "0.82rem", backgroundColor: "#fff", color: "#6b7280" },
  tabActive: { padding: "0.3rem 0.75rem", border: "1px solid #4f46e5", borderRadius: "999px", cursor: "pointer", fontSize: "0.82rem", backgroundColor: "#eef2ff", color: "#4f46e5", fontWeight: 700 },
};

export default function DataManagementPage({ schoolId }) {
  const [activeTab, setActiveTab] = useState("students");

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <p style={s.eyebrow}>기초 데이터</p>
        <h2 style={s.pageTitle}>기초 데이터 관리</h2>
      </div>

      <div style={s.tabRow}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            style={activeTab === tab.key ? s.tabActive : s.tab}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "students" && <StudentRosterTab schoolId={schoolId} />}
      {activeTab === "rooms"    && <RoomsTab    schoolId={schoolId} />}
      {activeTab === "subjects" && <SubjectsTab schoolId={schoolId} />}
    </div>
  );
}
