import { useEffect, useRef, useState } from "react";
import { getDefaultPlan } from "../data/defaults";
import { loadLatestPlan, loadPlanById, savePlan, saveVersion } from "../lib/firestorePlanner";

export function usePlannerData({ schoolId, ownerId, planId, enabled }) {
  const [state, setState] = useState({
    status: enabled ? "loading" : "idle",
    plan: getDefaultPlan(schoolId),
    error: null,
    source: "seed",
    saveStatus: "idle",
    saveError: null,
  });

  // 자동저장용 ref — stale closure 방지
  const planRef = useRef(state.plan);
  const dirtyRef = useRef(false);
  const autoSaveTimerRef = useRef(null);
  const persistPlanRef = useRef(null);

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
        // planId가 지정되면 특정 고사 로드, 없으면 최신 plan 로드 (후방 호환)
        const remotePlan = planId
          ? await loadPlanById({ schoolId, planId })
          : await loadLatestPlan({ schoolId, ownerId });
        if (cancelled) return;

        const loaded = remotePlan ?? getDefaultPlan(schoolId);
        planRef.current = loaded;
        dirtyRef.current = false;

        setState((current) => ({
          ...current,
          status: "ready",
          plan: loaded,
          source: remotePlan ? "firestore" : "seed",
          error: null,
        }));
      } catch (error) {
        if (cancelled) return;

        const fallback = getDefaultPlan(schoolId);
        planRef.current = fallback;

        setState((current) => ({
          ...current,
          status: "ready",
          plan: fallback,
          source: "seed",
          error: error instanceof Error ? error.message : "작업본을 불러오지 못했습니다.",
        }));
      }
    }

    run();

    return () => {
      cancelled = true;
      clearTimeout(autoSaveTimerRef.current);
    };
  }, [enabled, ownerId, schoolId, planId]);

  // persistPlan — Firestore 저장 (수동 + 자동저장 공용)
  const persistPlan = async (plan) => {
    setState((current) => ({
      ...current,
      saveStatus: "saving",
      saveError: null,
    }));

    try {
      const savedId = await savePlan({ schoolId, ownerId, plan });
      dirtyRef.current = false;
      setState((current) => ({
        ...current,
        saveStatus: "saved",
        saveError: null,
        source: "firestore",
        plan: current.plan.id === savedId ? current.plan : { ...current.plan, id: savedId },
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        saveStatus: "error",
        saveError: error instanceof Error ? error.message : "작업본 저장에 실패했습니다.",
      }));
    }
  };

  // 항상 최신 persistPlan을 setTimeout이 참조하도록 ref 갱신
  persistPlanRef.current = persistPlan;

  // replacePlan — 상태 갱신 + 2초 디바운스 자동저장
  const replacePlan = (nextPlan) => {
    setState((current) => {
      const value = typeof nextPlan === "function" ? nextPlan(current.plan) : nextPlan;
      planRef.current = value;
      return { ...current, plan: value, saveStatus: "idle" };
    });

    dirtyRef.current = true;
    clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      // 고사명이 입력된 경우에만 자동저장
      if (dirtyRef.current && planRef.current && planRef.current.name) {
        persistPlanRef.current(planRef.current);
      }
    }, 2000);
  };

  const reload = async () => {
    if (!enabled || !schoolId || !ownerId) return;

    clearTimeout(autoSaveTimerRef.current);
    dirtyRef.current = false;

    setState((current) => ({
      ...current,
      status: "loading",
      error: null,
    }));

    try {
      const remotePlan = planId
        ? await loadPlanById({ schoolId, planId })
        : await loadLatestPlan({ schoolId, ownerId });
      const loaded = remotePlan ?? getDefaultPlan(schoolId);
      planRef.current = loaded;

      setState((current) => ({
        ...current,
        status: "ready",
        plan: loaded,
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

  const resetPlan = () => {
    const blank = { ...getDefaultPlan(schoolId), id: "" };
    clearTimeout(autoSaveTimerRef.current);
    dirtyRef.current = false;
    planRef.current = blank;
    setState((current) => ({
      ...current,
      plan: blank,
      saveStatus: "idle",
      saveError: null,
      source: "seed",
    }));
  };

  const createVersion = async (plan) => {
    if (!plan || !plan.name) return;
    try {
      await saveVersion({ schoolId, ownerId, plan });
    } catch {
      // 버전 저장 실패는 자동저장 상태에 영향 없음
    }
  };

  return {
    ...state,
    setPlan: replacePlan,
    savePlan: persistPlan,
    createVersion,
    resetPlan,
    reload,
  };
}
