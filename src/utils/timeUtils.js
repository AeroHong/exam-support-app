export function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function addMinutes(time, amount) {
  const total = toMinutes(time) + amount;
  const hours = String(Math.floor(total / 60)).padStart(2, "0");
  const minutes = String(total % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function buildTimeSlots(startTime, endTime, stepMinutes) {
  const slots = [];
  let current = toMinutes(startTime);
  const end = toMinutes(endTime);

  while (current <= end) {
    const hours = String(Math.floor(current / 60)).padStart(2, "0");
    const minutes = String(current % 60).padStart(2, "0");
    slots.push(`${hours}:${minutes}`);
    current += stepMinutes;
  }

  return slots;
}

export function rangesOverlap(startA, durationA, startB, durationB) {
  const aStart = toMinutes(startA);
  const aEnd = aStart + durationA;
  const bStart = toMinutes(startB);
  const bEnd = bStart + durationB;
  return aStart < bEnd && bStart < aEnd;
}

export function getSessionOrderMap(sessions) {
  const grouped = sessions.reduce((acc, session) => {
    const key = `${session.dayId}:${session.grade}`;
    acc[key] ??= [];
    acc[key].push(session);
    return acc;
  }, {});

  return Object.values(grouped).reduce((acc, items) => {
    items
      .slice()
      .sort((left, right) => toMinutes(left.startTime) - toMinutes(right.startTime))
      .forEach((session, index) => {
        acc[session.id] = index + 1;
      });
    return acc;
  }, {});
}
