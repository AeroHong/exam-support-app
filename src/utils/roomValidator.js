export function validateRoomCapacity({ sessions, rooms }) {
  const roomMap = Object.fromEntries(rooms.map((room) => [room.id, room]));

  return sessions.flatMap((session) => {
    const totalCapacity = (session.roomIds ?? []).reduce(
      (sum, roomId) => sum + (roomMap[roomId]?.capacity ?? 0),
      0,
    );

    if (totalCapacity === 0) {
      return [
        {
          sessionId: session.id,
          level: "danger",
          message: "배정된 고사실이 없습니다.",
        },
      ];
    }

    if (session.studentCount > totalCapacity + 2) {
      return [
        {
          sessionId: session.id,
          level: "danger",
          message: `수용 인원 ${totalCapacity}명 대비 ${session.studentCount}명으로 초과입니다.`,
        },
      ];
    }

    if (session.studentCount > totalCapacity) {
      return [
        {
          sessionId: session.id,
          level: "warn",
          message: `임시 허용 범위입니다. ${session.studentCount - totalCapacity}명 초과.`,
        },
      ];
    }

    return [];
  });
}
