import { useEffect, useState } from "react";
import { getDefaultTenantData } from "../data/defaults";
import { loadTenantData } from "../lib/firestorePlanner";

export function useTenantData({ tenantId, enabled }) {
  const [state, setState] = useState({
    status: enabled ? "loading" : "idle",
    source: "seed",
    error: null,
    ...getDefaultTenantData(tenantId),
  });

  useEffect(() => {
    if (!enabled || !tenantId) {
      setState({
        status: "idle",
        source: "seed",
        error: null,
        ...getDefaultTenantData(tenantId),
      });
      return;
    }

    let cancelled = false;

    async function run() {
      setState((current) => ({
        ...current,
        status: "loading",
        error: null,
      }));

      try {
        const remote = await loadTenantData(tenantId);
        if (cancelled) {
          return;
        }

        const hasRemoteData =
          (remote?.students?.length ?? 0) > 0 ||
          (remote?.enrollments?.length ?? 0) > 0 ||
          (remote?.rooms?.length ?? 0) > 0;

        setState({
          status: "ready",
          source: hasRemoteData ? "firestore" : "seed",
          error: null,
          ...(hasRemoteData ? remote : getDefaultTenantData(tenantId)),
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState({
          status: "ready",
          source: "seed",
          error: error instanceof Error ? error.message : "테넌트 데이터를 불러오지 못했습니다.",
          ...getDefaultTenantData(tenantId),
        });
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [enabled, tenantId]);

  return state;
}
