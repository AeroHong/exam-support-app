export function getDefaultTenantData(tenantId) {
  return {
    tenant: {
      id: tenantId ?? "",
      name: "",
      domain: "",
    },
    students: [],
    enrollments: [],
    rooms: [],
  };
}

export function getDefaultPlan(tenantId) {
  return {
    id: "",
    tenantId: tenantId ?? "",
    name: "",
    activeFilter: "all",
    days: [],
    sessions: [],
  };
}
