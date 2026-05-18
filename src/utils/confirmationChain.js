/**
 * 단계별 확정 chain 검증
 * 시험계획(세션 존재) → 일정 확정 → 고사실 확정
 *                    → 대기실 확정
 * 앞 단계가 미확정이면 뒤 단계 확정을 자동 해제
 * @returns {object|null} 수정된 필드 객체 또는 변경 없으면 null
 */
export function validateConfirmationChain(plan) {
  const sc = { ...(plan.scheduleConfirmed ?? {}) };
  const wc = { ...(plan.waitingConfirmed  ?? {}) };
  const rc = { ...(plan.roomConfirmed     ?? {}) };
  let changed = false;

  ["1", "2", "3"].forEach((grade) => {
    const hasSessions = plan.sessions.some((s) => String(s.grade) === grade);

    if (!hasSessions) {
      if (sc[grade]) { sc[grade] = false; changed = true; }
      if (rc[grade]) { rc[grade] = false; changed = true; }
    } else if (!sc[grade]) {
      if (rc[grade]) { rc[grade] = false; changed = true; }
    }
  });

  // 대기실: 세션이 있는 학년 중 일정 미확정인 학년이 하나라도 있으면 전체 해제
  const anyScheduleGap = ["1", "2", "3"].some(
    (g) => plan.sessions.some((s) => String(s.grade) === g) && !sc[g],
  );
  if (anyScheduleGap) {
    Object.keys(wc).forEach((k) => {
      if (wc[k]) { wc[k] = false; changed = true; }
    });
  }

  return changed ? { scheduleConfirmed: sc, waitingConfirmed: wc, roomConfirmed: rc } : null;
}
