import { useCallback, useRef, useState } from "react";
import { getDefaultPlan } from "../data/defaults";

const STORAGE_KEY = "demo-plans";
const DEMO_SCHOOL_ID = "demo-school";

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToStorage(plans) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  } catch { /* quota exceeded 등 무시 */ }
}

/** 데모 모드용 plan 목록 조회 */
export function loadDemoPlanList() {
  const plans = loadFromStorage();
  return Object.entries(plans)
    .map(([id, p]) => ({
      id,
      name: p.name ?? "",
      academicYear: p.academicYear ?? new Date().getFullYear(),
      examType: p.examType ?? "",
      status: p.status ?? "draft",
      semester: p.semester ?? null,
      updatedAt: p.updatedAt ? { seconds: p.updatedAt / 1000 } : null,
      createdAt: p.createdAt ? { seconds: p.createdAt / 1000 } : null,
      ownerId: "demo-user",
    }))
    .sort((a, b) => (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0));
}

/** 데모 모드용 plan 저장 (새 생성 시 id 반환) */
export function saveDemoPlan(plan) {
  const plans = loadFromStorage();
  const id = plan.id || `demo-plan-${Date.now()}`;
  const now = Date.now();
  plans[id] = {
    ...plan,
    id,
    updatedAt: now,
    createdAt: plans[id]?.createdAt ?? now,
  };
  // sessions는 plan 객체 안에 직접 포함
  saveToStorage(plans);
  return id;
}

/** 데모 모드용 plan 삭제 */
export function deleteDemoPlan(planId) {
  const plans = loadFromStorage();
  delete plans[planId];
  saveToStorage(plans);
}

/** 데모 모드용 plan 보관 */
export function archiveDemoPlan(planId) {
  const plans = loadFromStorage();
  if (plans[planId]) {
    plans[planId].status = "archived";
    plans[planId].updatedAt = Date.now();
    saveToStorage(plans);
  }
}

/** usePlannerData와 동일한 인터페이스의 데모 모드 훅 */
export function useDemoPlannerData({ planId, enabled }) {
  const [state, setState] = useState({
    status: enabled ? "loading" : "idle",
    plan: getDefaultPlan(DEMO_SCHOOL_ID),
    error: null,
    source: "seed",
    saveStatus: "idle",
    saveError: null,
  });

  const planRef = useRef(state.plan);
  const dirtyRef = useRef(false);
  const autoSaveTimerRef = useRef(null);

  // planId가 변경되면 로드
  const lastLoadedId = useRef(null);
  if (enabled && planId && planId !== lastLoadedId.current) {
    lastLoadedId.current = planId;
    const plans = loadFromStorage();
    const loaded = plans[planId] ?? getDefaultPlan(DEMO_SCHOOL_ID);
    planRef.current = loaded;
    // 동기적으로 상태 갱신 (다음 렌더에 반영)
    if (state.plan.id !== planId || state.status !== "ready") {
      setTimeout(() => {
        setState({
          status: "ready",
          plan: loaded,
          error: null,
          source: plans[planId] ? "localStorage" : "seed",
          saveStatus: "idle",
          saveError: null,
        });
      }, 0);
    }
  }

  const persistPlan = useCallback((plan) => {
    setState((cur) => ({ ...cur, saveStatus: "saving", saveError: null }));
    try {
      const savedId = saveDemoPlan(plan);
      dirtyRef.current = false;
      setState((cur) => ({
        ...cur,
        saveStatus: "saved",
        saveError: null,
        source: "localStorage",
        plan: cur.plan.id === savedId ? cur.plan : { ...cur.plan, id: savedId },
      }));
    } catch {
      setState((cur) => ({ ...cur, saveStatus: "error", saveError: "저장 실패" }));
    }
  }, []);

  const replacePlan = useCallback((nextPlan) => {
    setState((cur) => {
      const value = typeof nextPlan === "function" ? nextPlan(cur.plan) : nextPlan;
      planRef.current = value;
      return { ...cur, plan: value, saveStatus: "idle" };
    });

    dirtyRef.current = true;
    clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      if (dirtyRef.current && planRef.current && planRef.current.name) {
        const plan = planRef.current;
        saveDemoPlan(plan);
        dirtyRef.current = false;
        setState((cur) => ({ ...cur, saveStatus: "saved" }));
      }
    }, 1000);
  }, []);

  const resetPlan = useCallback(() => {
    const blank = { ...getDefaultPlan(DEMO_SCHOOL_ID), id: "" };
    clearTimeout(autoSaveTimerRef.current);
    dirtyRef.current = false;
    planRef.current = blank;
    setState((cur) => ({
      ...cur,
      plan: blank,
      saveStatus: "idle",
      saveError: null,
      source: "seed",
    }));
  }, []);

  const createVersion = useCallback(() => {
    // 데모에서는 버전 관리 생략
  }, []);

  const reload = useCallback(() => {
    if (!planId) return;
    const plans = loadFromStorage();
    const loaded = plans[planId] ?? getDefaultPlan(DEMO_SCHOOL_ID);
    planRef.current = loaded;
    setState({
      status: "ready",
      plan: loaded,
      error: null,
      source: plans[planId] ? "localStorage" : "seed",
      saveStatus: "idle",
      saveError: null,
    });
  }, [planId]);

  return {
    ...state,
    setPlan: replacePlan,
    savePlan: persistPlan,
    createVersion,
    resetPlan,
    reload,
  };
}
