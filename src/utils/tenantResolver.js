function parseDomainMap(rawValue) {
  if (!rawValue) {
    return {};
  }

  return rawValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((acc, entry) => {
      const [domain, tenantId] = entry.split(":").map((value) => value?.trim());
      if (domain && tenantId) {
        acc[domain.toLowerCase()] = tenantId;
      }
      return acc;
    }, {});
}

const tenantDomainMap = parseDomainMap(import.meta.env.VITE_TENANT_DOMAIN_MAP);

export function resolveTenantFromEmail(email) {
  const domain = email?.split("@")[1]?.toLowerCase();

  if (!domain) {
    return null;
  }

  const tenantId = tenantDomainMap[domain];

  if (!tenantId) {
    return null;
  }

  return {
    tenantId,
    domain,
  };
}

export function listAllowedDomains() {
  return Object.keys(tenantDomainMap);
}
