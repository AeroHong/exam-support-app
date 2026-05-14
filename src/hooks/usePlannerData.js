import { useEffect, useState } from "react";
import { getDefaultPlan } from "../data/defaults";
import { loadLatestPlan, savePlan } from "../lib/firestorePlanner";

export function usePlannerData({ schoolId, ownerId, enabled }) {
  const [state, setState] = useState({
    status: enabled ? "loading" : "idle",
    plan: getDefaultPlan(schoolId),
    error: null,
    source: "seed",
    saveStatus: "idle",
    saveError: null,
  });

  useEffect(() => {
    if (!enabled || !schoolId || !ownerId) {
      setState((current) => ({
        ...current,
        status: "idle",
        plan: getDefaultPlan(schoolId),
      }));
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
        const remotePlan = await loadLatestPlan({ schoolId, ownerId });
        if (cancelled) {
          return;
        }

        setState((current) => ({
          ...current,
          status: "ready",
          plan: remotePlan ?? getDefaultPlan(schoolId),
          source: remotePlan ? "firestore" : "seed",
          error: null,
        }));
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState((current) => ({
          ...current,
          status: "ready",
          plan: getDefaultPlan(schoolId),
          source: "seed",
          error: error instanceof Error ? error.message : "작업본을 불러오지 못했습니다.",
        }));
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [enabled, ownerId, schoolId]);

  const replacePlan = (nextPlan) => {
    setState((current) => ({
      ...current,
      plan: typeof nextPlan === "function" ? nextPlan(current.plan) : nextPlan,
    }));
  };

  const persistPlan = async (plan) => {
    setState((current) => ({
      ...current,
      saveStatus: "saving",
      saveError: null,
    }));

    try {
      await savePlan({ schoolId, ownerId, plan });
      setState((current) => ({
        ...current,
        saveStatus: "saved",
        saveError: null,
        source: "firestore",
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        saveStatus: "error",
        saveError: error instanceof Error ? error.message : "작업본 저장에 실패했습니다.",
      }));
    }
  };

  const reload = async () => {
    if (!enabled || !schoolId || !ownerId) {
      return;
    }

    setState((current) => ({
      ...current,
      status: "loading",
      error: null,
    }));

    try {
      const remotePlan = await loadLatestPlan({ schoolId, ownerId });
      setState((current) => ({
        ...current,
        status: "ready",
        plan: remotePlan ?? getDefaultPlan(schoolId),
        source: remotePlan ? "firestore" : "seed",
        error: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        status: "ready",
        error: error instanceof Error ? error.message : "작업본 새로고침에 실패했습니다.",
      }));
    }
  };

  return {
    ...state,
    setPlan: replacePlan,
    savePlan: persistPlan,
    reload,
  };
}
