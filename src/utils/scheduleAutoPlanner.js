/**
 * 일정 자동 배치 알고리즘 — Graph Coloring + Slot Scoring
 * 규칙 상세: docs/schedule-algorithm.md
 */

// ── 학생 집합 구축 ────────────────────────────────────────────────────────────

/**
 * 각 session의 수강생 Set 구축
 * 지정과목 → 해당 학년 전체 / 선택과목 → enrollments 기반
 */
export function buildStudentSets(sessions, students, enrollments) {
  // 위탁 학생은 시험 전체 제외
  const activeStudentIds = new Set(
    students.filter((s) => s.examStatus !== "delegation").map((s) => s.id),
  );

  const sets = {};
  for (const session of sessions) {
    if (session.isRequired) {
      sets[session.id] = new Set(
        students
          .filter((s) => String(s.grade) === String(session.grade) && s.examStatus !== "delegation")
          .map((s) => s.id),
      );
    } else {
      sets[session.id] = new Set(
        enrollments
          .filter((e) => {
            // 학년 먼저 필터 — 동명 과목이 여러 학년에 있어도 섞이지 않도록
            if (String(e.grade) !== String(session.grade)) return false;
            // subjectId 매칭 우선 (있는 경우), 없으면 subjectName으로
            if (session.subjectId && e.subjectId) return e.subjectId === session.subjectId;
            return e.subjectName === session.subjectName;
          })
          .map((e) => e.studentId)
          .filter((sid) => activeStudentIds.has(sid)),
      );
    }
  }
  return sets;
}

// ── Conflict Graph 구축 ───────────────────────────────────────────────────────

function overlapSize(setA, setB) {
  if (!setA || !setB || setA.size === 0 || setB.size === 0) return 0;
  const [small, large] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
  let count = 0;
  for (const id of small) if (large.has(id)) count++;
  return count;
}

/**
 * 세션 쌍별 conflict graph 구축
 * - 지정과목(isRequired)은 같은 학년 전체 학생이 응시 → 같은 학년 모든 세션과 반드시 충돌
 * - 선택과목끼리는 수강생 교집합으로 판단
 * @returns {{ conflictGraph: Map, overlapMatrix: Map }}
 */
export function buildConflictGraph(sessions, studentSets) {
  const conflictGraph = new Map(sessions.map((s) => [s.id, new Set()]));
  const overlapMatrix = new Map(sessions.map((s) => [s.id, new Map()]));

  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const a = sessions[i];
      const b = sessions[j];
      if (String(a.grade) !== String(b.grade)) continue;

      // 지정과목이 하나라도 있으면 무조건 충돌 (학년 전체 응시 → 수강생 ID 불일치에 무관)
      const hasConflict =
        a.isRequired || b.isRequired
          ? true
          : overlapSize(studentSets[a.id], studentSets[b.id]) > 0;

      const size = hasConflict ? 1 : 0;
      overlapMatrix.get(a.id).set(b.id, size);
      overlapMatrix.get(b.id).set(a.id, size);
      if (hasConflict) {
        conflictGraph.get(a.id).add(b.id);
        conflictGraph.get(b.id).add(a.id);
      }
    }
  }
  return { conflictGraph, overlapMatrix };
}

// ── 슬롯 유효성 ──────────────────────────────────────────────────────────────

/**
 * 해당 슬롯에 session 배치 가능 여부 (규칙 3: 중복 학생 금지)
 * @param {string} sessionId
 * @param {string} dayId
 * @param {string} periodId
 * @param {{ sessionId, dayId, periodId }[]} placement 현재까지의 배치
 * @param {Map} conflictGraph
 */
export function isSlotValid(sessionId, dayId, periodId, placement, conflictGraph) {
  const slotSessionIds = placement
    .filter((p) => p.dayId === dayId && p.periodId === periodId && p.sessionId !== sessionId)
    .map((p) => p.sessionId);
  const conflicts = conflictGraph.get(sessionId) ?? new Set();
  return slotSessionIds.every((sid) => !conflicts.has(sid));
}

// ── 전략별 가중치 ─────────────────────────────────────────────────────────────
//
// [Hard 규칙 — 가중치로 보장]
//   emptyDay (300): 빈 날짜를 덮는 것이 fillSlot·dayFirst보다 항상 우선
//   → 가장 낮은 emptyDay 기대값(300-dayFirst*maxDays) >> fillSlot(최대 90)
//
// [Soft 규칙 — 전략별 조정]
//   dayFirst  : 앞쪽 날짜 선호 (앞 날짜일수록 패널티 감소)
//   periodFirst: 앞쪽 교시 선호
//   fillSlot  : 기존 슬롯 채우기 (교시 수 최소화)
//   triple    : 3교시 연속 응시 페널티 (학생×가중치)
//   waitConc  : 대기 학생 특정일 집중 보너스

export const STRATEGIES = {
  balanced: {
    label: "균형 배치",
    desc: "모든 규칙을 균형 있게 적용",
    dayFirst: 25, periodFirst: 5, fillSlot: 60, triple: 3, waitConc: 10, emptyDay: 300,
  },
  minTriple: {
    label: "3연속 최소화",
    desc: "하루 3교시 연속 응시 학생 최소화 우선",
    dayFirst: 20, periodFirst: 5, fillSlot: 20, triple: 20, waitConc: 5, emptyDay: 300,
  },
  minWaiting: {
    label: "대기 최소화",
    desc: "대기 학생 수 최소화 우선 (슬롯 채우기 강화)",
    dayFirst: 25, periodFirst: 8, fillSlot: 90, triple: 1, waitConc: 15, emptyDay: 300,
  },
};

// ── 슬롯 스코어링 ─────────────────────────────────────────────────────────────

function scoreSlot(session, dayId, periodId, placement, studentSets, days, periods, w) {
  const dayIndex    = days.findIndex((d) => d.id === dayId);
  const periodIndex = periods.findIndex((p) => p.id === periodId);
  let score = 0;

  // 앞쪽 날짜·교시 선호 (규칙 1, 2)
  score -= dayIndex * w.dayFirst;
  score -= periodIndex * w.periodFirst;

  // 기존 세션 있는 슬롯 선호 (규칙 4: 슬롯 채우기)
  const slotSessions = placement.filter(
    (p) => p.dayId === dayId && p.periodId === periodId,
  );
  if (slotSessions.length > 0) score += w.fillSlot;

  // 규칙 6: 이 날에 이미 2개 이상 교시 배치 → 3연속 페널티
  const dayPlaced = placement.filter(
    (p) => p.dayId === dayId && String(p.grade) === String(session.grade),
  );
  const dayPeriods = new Set(dayPlaced.map((p) => p.periodId));
  if (dayPeriods.size >= 2 && !dayPeriods.has(periodId)) {
    // 지정과목은 학년 전체이므로 무조건 3연속 페널티
    if (session.isRequired) {
      score -= (session.studentCount ?? 1) * w.triple;
    } else {
      const myStudents = studentSets[session.id] ?? new Set();
      for (const placed of dayPlaced) {
        const other = studentSets[placed.sessionId] ?? new Set();
        score -= overlapSize(myStudents, other) * w.triple;
      }
    }
  }

  // 규칙 7: 대기 학생 집중
  const dayHasWaiting = dayPlaced.length > 0 && dayPeriods.size < periods.length;
  if (dayHasWaiting) score += w.waitConc;

  // Hard 3: 빈 날짜 반드시 커버 — 항상 활성 (emptyDay=300이 fillSlot·dayFirst 압도)
  const dayAlreadyHasSession = placement.some(
    (p) => p.dayId === dayId && String(p.grade) === String(session.grade),
  );
  if (!dayAlreadyHasSession) score += w.emptyDay;

  return score;
}

// ── 자동 배치 메인 ────────────────────────────────────────────────────────────

/**
 * 단일 학년 세션 자동 배치 (Graph Coloring + Slot Scoring)
 * @param {object[]} sessions 해당 학년 전체 세션 (기배치 포함) — conflict graph 정확성을 위해 전체 전달
 * @param {object[]} days plan.days
 * @param {object[]} periods plan.periods
 * @param {object[]} students
 * @param {object[]} enrollments
 * @returns {{ [sessionId]: { dayId, periodId } }} 새로 배치된 세션만 (기배치 세션 제외)
 */
export function autoPlace(sessions, days, periods, students, enrollments, weights = STRATEGIES.balanced) {
  if (!days.length || !periods.length) return {};

  // 전체 세션 기준으로 student set + conflict graph 구축
  const studentSets    = buildStudentSets(sessions, students, enrollments);
  const { conflictGraph } = buildConflictGraph(sessions, studentSets);

  // 이미 배치된 세션으로 placement 초기화 (이들이 슬롯을 선점하고 있음)
  const placement = sessions
    .filter((s) => s.dayId && s.periodId)
    .map((s) => ({ sessionId: s.id, dayId: s.dayId, periodId: s.periodId, grade: s.grade }));

  // 미배치 세션만 배치 대상
  const toPlace = sessions.filter((s) => !s.dayId || !s.periodId);

  const sorted = [...toPlace].sort((a, b) => {
    // Hard 2: 서논술 과목(isEssay)이 객관식보다 반드시 먼저 배치
    const priorityOf = (s) => {
      if (s.isRequired && s.isEssay) return 0;  // 지정 서논술 — 최우선
      if (s.isEssay)                 return 1;  // 선택 서논술 — 객관식 전체보다 우선
      if (s.isRequired)              return 2;  // 지정 객관식
      return 3;                                  // 선택 객관식
    };
    const pa = priorityOf(a), pb = priorityOf(b);
    if (pa !== pb) return pa - pb;
    const da = conflictGraph.get(a.id)?.size ?? 0;
    const db = conflictGraph.get(b.id)?.size ?? 0;
    if (da !== db) return db - da;
    return (b.studentCount ?? 0) - (a.studentCount ?? 0);
  });

  const result = {};

  for (const session of sorted) { // toPlace 순서대로 배치
    let bestSlot = null;
    let bestScore = -Infinity;

    for (const day of days) {
      for (const period of periods) {
        if (!isSlotValid(session.id, day.id, period.id, placement, conflictGraph)) continue;
        const score = scoreSlot(
          session, day.id, period.id, placement, studentSets, days, periods, weights,
        );
        if (score > bestScore) {
          bestScore = score;
          bestSlot = { dayId: day.id, periodId: period.id };
        }
      }
    }

    if (bestSlot) {
      result[session.id] = bestSlot;
      placement.push({
        sessionId: session.id,
        dayId: bestSlot.dayId,
        periodId: bestSlot.periodId,
        grade: session.grade,
      });
    }
    // 유효 슬롯 없으면 미배치 (result에 키 없음)
  }

  return result;
}

// ── 실시간 통계 ──────────────────────────────────────────────────────────────

/**
 * 단일 날짜의 학년별 실시간 통계
 * @returns {{
 *   periodStats: { [periodId]: { testingCount, waitingCount } },
 *   tripleCount: number,
 *   conflicts: Set<sessionId>  ← 같은 슬롯 내 중복 학생 있는 세션 ID
 * }}
 */
export function computeDayStats(sessions, studentSets, dayId, periods, grade) {
  const dayGradeSessions = sessions.filter(
    (s) => s.dayId === dayId && String(s.grade) === String(grade),
  );

  // 이 날 시험 있는 학생 전체
  const dayStudents = new Set();
  for (const s of dayGradeSessions) {
    for (const sid of studentSets[s.id] ?? []) dayStudents.add(sid);
  }

  // 교시별 응시 학생 집합 사전 계산
  const periodTestingSets = {};
  for (const period of periods) {
    const ps = dayGradeSessions.filter((s) => s.periodId === period.id);
    const st = new Set();
    for (const s of ps) for (const sid of studentSets[s.id] ?? []) st.add(sid);
    periodTestingSets[period.id] = st;
  }

  // 교시별 통계
  // 대기 = 이 교시에 시험 없고, 이 교시 이후에 시험이 있는 학생 (마지막 시험 후 하교 → 대기 아님)
  const periodStats = {};
  for (let pIdx = 0; pIdx < periods.length; pIdx++) {
    const period = periods[pIdx];
    const testingStudents = periodTestingSets[period.id];

    const waitingStudentIds = new Set();
    for (const studentId of dayStudents) {
      if (testingStudents.has(studentId)) continue; // 이 교시 시험 있음
      // 이 교시 이후(pIdx+1~)에 시험이 있는지 확인
      const hasLaterExam = periods.slice(pIdx + 1).some(
        (laterPeriod) => periodTestingSets[laterPeriod.id].has(studentId),
      );
      if (hasLaterExam) waitingStudentIds.add(studentId);
    }

    periodStats[period.id] = {
      testingCount: testingStudents.size,
      waitingCount: waitingStudentIds.size,
      waitingStudentIds,
    };
  }

  // 3교시 모두 응시 학생 수 (교시 3개 이상일 때)
  const periodStudentSets = periods
    .map((p) => {
      const ps = dayGradeSessions.filter((s) => s.periodId === p.id);
      const st = new Set();
      for (const s of ps) for (const sid of studentSets[s.id] ?? []) st.add(sid);
      return st;
    })
    .filter((s) => s.size > 0);

  let tripleCount = 0;
  let tripleStudentIds = new Set();
  if (periodStudentSets.length >= 3) {
    const intersection = periodStudentSets.reduce(
      (acc, s) => new Set([...acc].filter((x) => s.has(x))),
    );
    tripleCount = intersection.size;
    tripleStudentIds = intersection;
  }

  // 슬롯 내 충돌 세션 감지 — 지정과목 포함 쌍은 무조건 충돌
  const conflicts = new Set();
  for (const period of periods) {
    const slotSessions = dayGradeSessions.filter((s) => s.periodId === period.id);
    for (let i = 0; i < slotSessions.length; i++) {
      for (let j = i + 1; j < slotSessions.length; j++) {
        const a = slotSessions[i];
        const b = slotSessions[j];
        const hasConflict =
          a.isRequired || b.isRequired
            ? true
            : overlapSize(studentSets[a.id], studentSets[b.id]) > 0;
        if (hasConflict) {
          conflicts.add(a.id);
          conflicts.add(b.id);
        }
      }
    }
  }

  return { periodStats, tripleCount, tripleStudentIds, conflicts, dayStudentCount: dayStudents.size, dayStudentIds: dayStudents };
}

// ── 배치 결과 평가 ────────────────────────────────────────────────────────────

/**
 * 자동 배치 결과를 기존 세션에 병합하여 품질 지표 계산
 * @param {{ [sessionId]: { dayId, periodId } }} newResult autoPlace 반환값
 * @param {object[]} sessions 전체 세션 (기존 배치 포함)
 * @param {{ [sessionId]: Set }} studentSets
 * @param {object[]} days
 * @param {object[]} periods
 * @param {string} grade
 * @returns {{ totalWaiting, maxTriple, emptyDays, unplacedCount }}
 */
export function evaluatePlacement(newResult, sessions, studentSets, days, periods, grade) {
  // 새 결과로 세션 덮어쓰기
  const merged = sessions.map((s) =>
    newResult[s.id]
      ? { ...s, dayId: newResult[s.id].dayId, periodId: newResult[s.id].periodId }
      : s,
  );

  let totalWaiting = 0;
  let maxTriple    = 0;
  let emptyDays    = 0;

  for (const day of days) {
    const dStats = computeDayStats(merged, studentSets, day.id, periods, grade);
    const hasAny = merged.some(
      (s) => s.dayId === day.id && String(s.grade) === String(grade),
    );
    if (!hasAny) emptyDays++;
    maxTriple = Math.max(maxTriple, dStats.tripleCount);
    for (const pStat of Object.values(dStats.periodStats)) {
      totalWaiting += pStat.waitingCount;
    }
  }

  const unplacedCount = sessions
    .filter((s) => String(s.grade) === String(grade))
    .filter((s) => !newResult[s.id] && (!s.dayId || !s.periodId)).length;

  return { totalWaiting, maxTriple, emptyDays, unplacedCount };
}
