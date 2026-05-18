export const EXAM_TYPES = [
  { key: "mid1",      label: "1학기 중간고사",            semester: 1 },
  { key: "final1",    label: "1학기 기말고사",            semester: 1 },
  { key: "mid2",      label: "2학기 중간고사",            semester: 2 },
  { key: "final2_g3", label: "2학기 기말고사(3학년)",     semester: 2 },
  { key: "final2_g12",label: "2학기 기말고사(1,2학년)",   semester: 2 },
];

export const DEFAULT_PERIODS = [
  { id: "period-1", label: "1교시", startTimes: { "1": "08:30", "2": "08:30", "3": "08:30" }, duration: 50 },
  { id: "period-2", label: "2교시", startTimes: { "1": "10:10", "2": "10:10", "3": "10:10" }, duration: 50 },
  { id: "period-3", label: "3교시", startTimes: { "1": "11:30", "2": "11:30", "3": "11:30" }, duration: 50 },
];

export function getDefaultTenantData(schoolId) {
  return {
    school: {
      id: schoolId ?? "",
      name: "",
      domain: "",
    },
    students: [],
    enrollments: [],
    rooms: [],
    subjects: [],
  };
}

export function getDefaultPlan(schoolId) {
  return {
    id: "",
    schoolId: schoolId ?? "",
    name: "",
    semester: null,
    academicYear: new Date().getFullYear(),
    examType: "",
    status: "draft",
    activeFilter: "all",
    days: [],
    periods: DEFAULT_PERIODS,
    sessions: [],
    scheduleConfirmed: {},
    roomConfirmed: {},
  };
}
