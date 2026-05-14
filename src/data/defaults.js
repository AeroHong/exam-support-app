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
  };
}

export function getDefaultPlan(schoolId) {
  return {
    id: "",
    schoolId: schoolId ?? "",
    name: "",
    activeFilter: "all",
    days: [],
    sessions: [],
  };
}
