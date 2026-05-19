import { createElement, useState, useCallback } from "react";

/**
 * 테이블 컬럼 정렬 상태 훅
 *
 * @param {string|null} defaultKey  초기 정렬 컬럼 (null = 정렬 없음)
 * @param {"asc"|"desc"} defaultDir 초기 정렬 방향
 *
 * @returns
 *   toggle(key)          — 헤더 클릭 시 호출. 같은 컬럼이면 방향 전환, 다른 컬럼이면 asc로 초기화
 *   sortData(arr, getters) — arr 를 현재 sort 상태에 따라 정렬한 새 배열 반환
 *     getters: { [key]: (item) => value }  컬럼별 값 추출 함수. 없으면 item[key] 사용
 *   Ind(col)             — 정렬 표시 아이콘 JSX 반환 (th 안에서 호출)
 *   thSort               — 정렬 가능한 th 에 추가할 inline style
 */
export function useTableSort(defaultKey = null, defaultDir = "asc") {
  const [sort, setSort] = useState({ key: defaultKey, dir: defaultDir });

  const toggle = useCallback((key) => {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  }, []);

  function sortData(arr, getters = {}) {
    if (!sort.key) return arr;
    const get = getters[sort.key] ?? ((item) => item[sort.key] ?? "");
    return [...arr].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (va === vb) return 0;
      if (va == null || va === "") return 1;
      if (vb == null || vb === "") return -1;
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "ko");
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }

  function Ind(col) {
    const active = sort.key === col;
    return createElement("span", {
      style: {
        fontSize: "0.68rem",
        marginLeft: "3px",
        color: active ? "#4f46e5" : "#d1d5db",
        fontWeight: "normal",
      },
    }, active ? (sort.dir === "asc" ? "↑" : "↓") : "↕");
  }

  const thSort = { cursor: "pointer", userSelect: "none" };

  return { sort, toggle, sortData, Ind, thSort };
}
