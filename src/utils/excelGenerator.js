// ─────────────────────────────────────────────────────────────────────────────
// Excel 출력물 생성 유틸리티 (xlsx-js-style)
// ─────────────────────────────────────────────────────────────────────────────

import * as XLSX from "xlsx-js-style";

/**
 * 고사실별 응시 현황표 Excel 생성
 * @param {Array} rosters - 고사실별 현황표 데이터 배열
 * @param {string} schoolName - 학교명
 * @returns {Blob} Excel 파일 Blob
 */
export function generateRoomRostersExcel(rosters, schoolName = "OO고등학교") {
  const wb = XLSX.utils.book_new();

  rosters.forEach((roster, index) => {
    console.log(`[Excel] Generating sheet for roster ${index}:`, {
      roomName: roster.roomName,
      studentsCount: roster.students?.length,
      students: roster.students,
    });

    // 시트 데이터 생성
    const sheetData = [];

    // 헤더 정보
    sheetData.push([schoolName]);
    sheetData.push(["고사실별 응시 현황표"]);
    sheetData.push([]);
    sheetData.push(["고사일", roster.examDate]);
    sheetData.push(["교시", `${roster.period} (${roster.startTime} - ${roster.endTime})`]);
    sheetData.push(["고사실", roster.roomName]);
    sheetData.push([
      "과목",
      `${roster.subjectName}${roster.subjectCode ? ` [${roster.subjectCode}]` : ""}`,
    ]);
    sheetData.push(["형태", roster.isEssay ? "서논술형" : "선택형"]);
    sheetData.push([]);

    // 인원 통계
    sheetData.push(["재적인원", `${roster.totalCount}명`]);
    sheetData.push(["응시인원", `${roster.attendCount}명`]);
    if (roster.specialCount > 0) {
      sheetData.push(["도움실", `${roster.specialCount}명`]);
    }
    if (roster.separateCount > 0) {
      sheetData.push(["별도실", `${roster.separateCount}명`]);
    }
    sheetData.push([]);

    // 학생 목록 테이블 헤더
    const headerRowIndex = sheetData.length;
    sheetData.push(["좌석", "학번", "이름", "성별", "결시"]);

    // 학생 목록 데이터
    const studentStartRow = sheetData.length;
    roster.students.forEach((student) => {
      sheetData.push([
        student.seatNumber,
        student.studentId,
        student.name,
        student.gender,
        "", // 결시 체크 (빈칸)
      ]);
    });

    sheetData.push([]);

    // 도움실 응시 학생
    if (roster.specialStudents && roster.specialStudents.length > 0) {
      const specialText = roster.specialStudents
        .map((s) => `${s.studentId} ${s.name}`)
        .join(", ");
      sheetData.push(["도움실 응시", specialText]);
    }

    // 별도실 응시 학생
    if (roster.separateStudents && roster.separateStudents.length > 0) {
      const separateText = roster.separateStudents
        .map((s) => `${s.studentId} ${s.name}`)
        .join(", ");
      sheetData.push(["별도실 응시", separateText]);
    }

    // 워크시트 생성
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // 열 너비 설정
    ws["!cols"] = [
      { wch: 8 },  // 좌석
      { wch: 15 }, // 학번
      { wch: 12 }, // 이름
      { wch: 8 },  // 성별
      { wch: 8 },  // 결시
    ];

    // 스타일 적용 (제목/헤더)
    // A1: 학교명 - 중앙정렬, 굵게
    if (ws["A1"]) {
      ws["A1"].s = {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: "center", vertical: "center" },
      };
    }
    // A2: 제목 - 중앙정렬, 굵게
    if (ws["A2"]) {
      ws["A2"].s = {
        font: { bold: true, sz: 12 },
        alignment: { horizontal: "center", vertical: "center" },
      };
    }

    // 헤더 행 스타일 (좌석/학번/이름/성별/결시)
    const headerRow = headerRowIndex + 1; // Excel은 1-based
    ["A", "B", "C", "D", "E"].forEach((col) => {
      const cellAddr = `${col}${headerRow}`;
      if (ws[cellAddr]) {
        ws[cellAddr].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "F0F0F0" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } },
          },
        };
      }
    });

    // 학생 데이터 행 테두리
    for (let i = studentStartRow; i < studentStartRow + roster.students.length; i++) {
      const rowNum = i + 1; // Excel 1-based
      ["A", "B", "C", "D", "E"].forEach((col) => {
        const cellAddr = `${col}${rowNum}`;
        if (ws[cellAddr]) {
          ws[cellAddr].s = {
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "CCCCCC" } },
              bottom: { style: "thin", color: { rgb: "CCCCCC" } },
              left: { style: "thin", color: { rgb: "CCCCCC" } },
              right: { style: "thin", color: { rgb: "CCCCCC" } },
            },
          };
        }
      });
    }

    // 시트 이름 생성: 과목명_고사실_교시 (Excel 시트명 제한: 31자, 중복 방지)
    let sheetName = `${roster.subjectName}_${roster.roomName}_${roster.period}`.substring(0, 31);

    // 중복 시트명 처리
    let counter = 1;
    let uniqueSheetName = sheetName;
    while (wb.SheetNames.includes(uniqueSheetName)) {
      uniqueSheetName = `${sheetName.substring(0, 28)}_${counter}`;
      counter++;
    }

    XLSX.utils.book_append_sheet(wb, ws, uniqueSheetName);
  });

  // Excel 파일 생성
  return wb;
}

/**
 * Excel 파일 다운로드
 * @param {Object} workbook - XLSX workbook 객체
 * @param {string} fileName - 파일명
 */
export function downloadExcel(workbook, fileName) {
  XLSX.writeFile(workbook, fileName);
}
