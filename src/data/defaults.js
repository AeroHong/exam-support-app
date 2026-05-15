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
    activeFilter: "all",
    days: [],
    periods: DEFAULT_PERIODS,
    sessions: [],
    scheduleConfirmed: {},
    roomConfirmed: {},
  };
}
