import RoomsTab from "./RoomsTab";
import StudentRosterTab from "./StudentRosterTab";
import SubjectsTab from "./SubjectsTab";
import { useState } from "react";

const tabs = [
  { key: "students", label: "학생 명렬" },
  { key: "rooms", label: "고사실" },
  { key: "subjects", label: "과목" },
];

/**
 * @param {{ schoolId: string, onLogout: () => void }} props
 */
export default function DataManagementPage({ schoolId, onLogout }) {
  const [activeTab, setActiveTab] = useState("students");

  return (
    <div className="min-h-screen bg-grid">
      <main className="app-shell">
        <header className="topbar">
          <div className="topbar-title">
            <p className="eyebrow">기초 데이터 관리</p>
            <h1>{schoolId}</h1>
          </div>

          <div className="topbar-actions">
            <button type="button" className="secondary-button" onClick={onLogout}>
              로그아웃
            </button>
          </div>

          <div className="topbar-nav">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`chip ${activeTab === tab.key ? "chip-active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        {activeTab === "students" ? <StudentRosterTab schoolId={schoolId} /> : null}
        {activeTab === "rooms" ? <RoomsTab schoolId={schoolId} /> : null}
        {activeTab === "subjects" ? <SubjectsTab schoolId={schoolId} /> : null}
      </main>
    </div>
  );
}
