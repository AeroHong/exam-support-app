import { useEffect, useState } from "react";
import { getDefaultTenantData } from "../data/defaults";
import { loadTenantData } from "../lib/firestorePlanner";

export function useTenantData({ schoolId, enabled }) {
  const [state, setState] = useState({
    status: enabled ? "loading" : "idle",
    source: "seed",
    error: null,
    ...getDefaultTenantData(schoolId),
  });

  useEffect(() => {
    if (!enabled || !schoolId) {
      setState({
        status: "idle",
        source: "seed",
        error: null,
        ...getDefaultTenantData(schoolId),
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
        const remote = await loadTenantData(schoolId);
        if (cancelled) {
          return;
        }

        const hasRemoteData =
          (remote?.students?.length ?? 0) > 0 ||
          (remote?.enrollments?.length ?? 0) > 0 ||
          (remote?.rooms?.length ?? 0) > 0 ||
          (remote?.subjects?.length ?? 0) > 0;

        setState({
          status: "ready",
          source: hasRemoteData ? "firestore" : "seed",
          error: null,
          ...(hasRemoteData ? remote : getDefaultTenantData(schoolId)),
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState({
          status: "ready",
          source: "seed",
          error: error instanceof Error ? error.message : "학교 데이터를 불러오지 못했습니다.",
          ...getDefaultTenantData(schoolId),
        });
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [enabled, schoolId]);

  return state;
}
