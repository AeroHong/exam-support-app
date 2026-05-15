import { useEffect, useRef, useState } from "react";
import { getDefaultTenantData } from "../data/defaults";
import { loadTenantData } from "../lib/firestorePlanner";

export function useTenantData({ schoolId, enabled }) {
  const [state, setState] = useState({
    status: enabled ? "loading" : "idle",
    source: "seed",
    error: null,
    loadedAt: null,
    ...getDefaultTenantData(schoolId),
  });

  const schoolIdRef = useRef(schoolId);
  schoolIdRef.current = schoolId;

  async function doLoad(sid) {
    setState((current) => ({ ...current, status: "loading", error: null }));

    try {
      const remote = await loadTenantData(sid);
      const hasRemoteData =
        (remote?.students?.length ?? 0) > 0 ||
        (remote?.enrollments?.length ?? 0) > 0 ||
        (remote?.rooms?.length ?? 0) > 0 ||
        (remote?.subjects?.length ?? 0) > 0;

      const data = hasRemoteData ? remote : getDefaultTenantData(sid);

      setState((current) => ({
        ...current,
        status: "ready",
        source: hasRemoteData ? "firestore" : "seed",
        error: null,
        loadedAt: Date.now(),
        ...data,
      }));

      return data;
    } catch (error) {
      const fallback = getDefaultTenantData(sid);
      setState((current) => ({
        ...current,
        status: "ready",
        source: "seed",
        error: error instanceof Error ? error.message : "학교 데이터를 불러오지 못했습니다.",
        loadedAt: Date.now(),
        ...fallback,
      }));
      return null;
    }
  }

  useEffect(() => {
    if (!enabled || !schoolId) {
      setState({
        status: "idle",
        source: "seed",
        error: null,
        loadedAt: null,
        ...getDefaultTenantData(schoolId),
      });
      return;
    }

    doLoad(schoolId);
  }, [enabled, schoolId]);

  const reload = () => doLoad(schoolIdRef.current);

  return { ...state, reload };
}
