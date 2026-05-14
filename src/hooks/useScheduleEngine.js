import { useMemo } from "react";
import { buildConflictReport } from "../utils/conflictChecker";
import { validateRoomCapacity } from "../utils/roomValidator";
import {
  buildSessionMetrics,
  calculateStudentStatusLists,
  summarizeMetrics,
} from "../utils/studentStatusCalculator";

export function useScheduleEngine({ sessions, students, enrollments, rooms }) {
  return useMemo(() => {
    const conflictReport = buildConflictReport({ sessions, students, enrollments });
    const statusLists = calculateStudentStatusLists({
      sessions,
      students,
      enrollments,
      conflictStudentIds: conflictReport.conflictStudentIds,
    });
    const roomWarnings = validateRoomCapacity({ sessions, rooms });
    const sessionMetrics = buildSessionMetrics({
      sessions,
      enrollments,
      conflictReport,
    });

    return {
      conflicts: conflictReport.conflicts,
      conflictStudentIds: conflictReport.conflictStudentIds,
      roomWarnings,
      sessionMetrics,
      metricStudentDetails: {
        waitingStudents: statusLists.waitingStudents,
        noExamStudents: statusLists.noExamStudents,
        tripleStudents: statusLists.tripleStudents,
        conflictingStudents: statusLists.conflictingStudents,
      },
      summary: summarizeMetrics({
        waitingStudents: statusLists.waitingStudents,
        noExamStudents: statusLists.noExamStudents,
        tripleStudents: statusLists.tripleStudents,
        conflictingStudents: statusLists.conflictingStudents,
        roomWarnings,
      }),
    };
  }, [enrollments, rooms, sessions, students]);
}
