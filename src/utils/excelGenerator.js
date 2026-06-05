// ─────────────────────────────────────────────────────────────────────────────
// Excel 출력물 생성 유틸리티 (xlsx-js-style)
//
// generateSubjectRostersExcel    : 과목별 응시 현황표 (전 세션 → 1파일)
// generateSessionRoomRosterExcel : 고사실별 응시 현황표 (1세션 → 1파일)
//   ┗ 시트 구조: 고사실별 시트(1-1, 1-2…) + 도움실 + 별도실
//   ┗ 양식: docs/2026-04-22_1학년_1교시_공통영어1.xlsx 참고
// ─────────────────────────────────────────────────────────────────────────────

import * as XLSX from "xlsx-js-style";

// ─── 공통 상수 ────────────────────────────────────────────────────────────────

const GRAY_FILL = { patternType: "solid", fgColor: { rgb: "D9D9D9" } };
const THIN_BORDER = {
  top: { style: "thin", color: { rgb: "000000" } },
  bottom: { style: "thin", color: { rgb: "000000" } },
  left: { style: "thin", color: { rgb: "000000" } },
  right: { style: "thin", color: { rgb: "000000" } },
};

// ─── 공통 헬퍼 ────────────────────────────────────────────────────────────────

/** {grade}{classNo:02d}{number:02d} 형식 학번 */
function makeStudentId(s) {
  return `${s.grade}${String(s.classNo).padStart(2, "0")}${String(s.number).padStart(2, "0")}`;
}

/** "홍길동 (1.01 전입)" → "홍길동" */
function extractName(raw) {
  if (!raw) return "";
  return raw.replace(/\s*\(.*?\)\s*$/, "").trim();
}

/** 도움실/별도실 학생 표기: "10102 김린 (여)" */
function specialLabel(s) {
  return `${makeStudentId(s)} ${extractName(s.name)} (${s.gender || "남"})`;
}

function safeSheetName(str) {
  return String(str).replace(/[\\/?*[\]:]/g, "_").substring(0, 31);
}

function uniqueSheetName(wb, name) {
  let n = safeSheetName(name);
  let i = 1;
  while (wb.SheetNames.includes(n)) {
    n = safeSheetName(`${name.substring(0, 28)}_${i}`);
    i++;
  }
  return n;
}

// ─── 고사실별 응시 현황표 (1세션 → 1워크북) ──────────────────────────────────
//
// 양식 (8열: A-H):
//   행1: "{roomName}  {subjectName}  응시현황표"  (A1:H1 병합)
//   행2: (빈칸)
//   행3: 헤더 — 고사일/고사시간 | 고사실 | 과목명(코드) | 재적 | 응시 | (빈) | 도움실인원 | 별도실인원
//   행4: 데이터값
//   행5: (빈칸)
//   행6: 학생 헤더 — 좌석번호 | 학번 | 이름 | 성별 | 결시체크 | (빈) | 도움실응시학생 | 별도고사실응시학생
//   행7+: 학생 데이터 (컬럼 G/H = 도움실·별도실 학생 병렬 표시)

export function generateSessionRoomRosterExcel(subjectRoster, schoolName = "OO고등학교") {
  const wb = XLSX.utils.book_new();

  const {
    subjectName,
    subjectCode,
    grade,
    isEssay,
    dayLabel,
    periodLabel,
    startTime,
    endTime,
    roomGroups,
    specialStudents,
    separateStudents,
  } = subjectRoster;

  const dateTimeCell = `${dayLabel}\n${startTime}~${endTime}`;
  const subjectCell = `${subjectName}${subjectCode ? `(${subjectCode})` : ""}`;

  // 스타일 정의
  const sTitleRow = {
    font: { bold: true, sz: 12 },
    alignment: { horizontal: "center", vertical: "center" },
  };
  const sMetaHeader = {
    font: { bold: true, sz: 10 },
    fill: GRAY_FILL,
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: THIN_BORDER,
  };
  const sMetaData = {
    font: { sz: 10 },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: THIN_BORDER,
  };
  const sColHeader = {
    font: { bold: true, sz: 10 },
    fill: GRAY_FILL,
    alignment: { horizontal: "center", vertical: "center" },
    border: THIN_BORDER,
  };
  const sCell = {
    font: { sz: 10 },
    alignment: { horizontal: "center", vertical: "center" },
    border: THIN_BORDER,
  };
  const sNameCell = {
    font: { sz: 10 },
    alignment: { horizontal: "center", vertical: "center" },
    border: THIN_BORDER,
  };
  const sSideCell = {
    font: { sz: 9 },
    alignment: { horizontal: "left", vertical: "center" },
    border: THIN_BORDER,
  };
  const sEmptyCell = {}; // 도움실/별도실 인원 없는 빈 셀 — 테두리 없음

  function buildRoomSheet(roomName, seated, specialInRoom, separateInRoom) {
    const totalCount = seated.length + specialInRoom.length + separateInRoom.length;
    const normalCount = seated.length;
    const spCount = specialInRoom.length;
    const sepCount = separateInRoom.length;

    const rows = [];

    // 행 1: 제목 (과목코드 포함)
    rows.push([
      { v: `${roomName}  ${subjectCell}  응시현황표`, t: "s", s: sTitleRow },
      "", "", "", "", "", "", "",
    ]);
    // 행 2: 빈칸
    rows.push(["", "", "", "", "", "", "", ""]);
    // 행 3: 메타 헤더
    rows.push([
      { v: "고사일\n고사시간", t: "s", s: sMetaHeader },
      { v: "고사실", t: "s", s: sMetaHeader },
      { v: "과목명(과목코드)", t: "s", s: sMetaHeader },
      { v: "재적인원", t: "s", s: sMetaHeader },
      { v: "응시인원", t: "s", s: sMetaHeader },
      { v: "", t: "s", s: {} },
      { v: "도움실 응시 인원", t: "s", s: sMetaHeader },
      { v: "별도 고사실 응시 인원", t: "s", s: sMetaHeader },
    ]);
    // 행 4: 메타 데이터
    rows.push([
      { v: dateTimeCell, t: "s", s: sMetaData },
      { v: roomName, t: "s", s: sMetaData },
      { v: subjectCell, t: "s", s: sMetaData },
      { v: totalCount, t: "n", s: sMetaData },
      { v: normalCount, t: "n", s: sMetaData },
      { v: "", t: "s", s: {} },
      { v: spCount, t: "n", s: sMetaData },
      { v: sepCount, t: "n", s: sMetaData },
    ]);
    // 행 5: 빈칸
    rows.push(["", "", "", "", "", "", "", ""]);
    // 행 6: 학생 목록 헤더
    rows.push([
      { v: "좌석번호", t: "s", s: sColHeader },
      { v: "학번", t: "s", s: sColHeader },
      { v: "이름", t: "s", s: sColHeader },
      { v: "성별", t: "s", s: sColHeader },
      { v: "결시체크", t: "s", s: sColHeader },
      { v: "", t: "s", s: {} },
      { v: "도움실 응시 학생", t: "s", s: sColHeader },
      { v: "별도 고사실 응시 학생", t: "s", s: sColHeader },
    ]);

    // 행 7+: 학생 데이터
    const rowCount = Math.max(seated.length, spCount, sepCount, 1);
    for (let i = 0; i < rowCount; i++) {
      const s = seated[i];
      const sp = specialInRoom[i];
      const sep = separateInRoom[i];
      rows.push([
        { v: s ? s.seatNumber : "", t: s ? "n" : "s", s: sCell },
        { v: s ? makeStudentId(s) : "", t: "s", s: sCell },
        { v: s ? extractName(s.name) : "", t: "s", s: sNameCell },
        { v: s ? s.gender : "", t: "s", s: sCell },
        s ? { v: "□", t: "s", s: sCell } : { v: "", t: "s", s: sCell },
        { v: "", t: "s", s: {} },
        // 도움실/별도실: 데이터 있는 행만 테두리 표시
        { v: sp ? specialLabel(sp) : "", t: "s", s: sp ? sSideCell : sEmptyCell },
        { v: sep ? specialLabel(sep) : "", t: "s", s: sep ? sSideCell : sEmptyCell },
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);

    ws["!cols"] = [
      { wch: 10 }, // 좌석번호
      { wch: 12 }, // 학번
      { wch: 14 }, // 이름
      { wch: 7 },  // 성별
      { wch: 10 }, // 결시체크
      { wch: 2 },  // 빈칸
      { wch: 24 }, // 도움실 응시 학생
      { wch: 24 }, // 별도 고사실 응시 학생
    ];
    // 전체 행 높이: 메타 행 + 학생 행 모두 설정
    const rowHeights = [
      { hpx: 22 }, // 행1 제목
      { hpx: 6 },  // 행2 빈칸
      { hpx: 32 }, // 행3 메타 헤더 (줄바꿈)
      { hpx: 32 }, // 행4 메타 데이터 (줄바꿈)
      { hpx: 6 },  // 행5 빈칸
      { hpx: 22 }, // 행6 학생 헤더
    ];
    for (let i = 0; i < rowCount; i++) rowHeights.push({ hpx: 22 });
    ws["!rows"] = rowHeights;
    // 제목 병합: A1:H1
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];

    return ws;
  }

  // ── 각 고사실 시트 생성 ─────────────────────────────────────────────────────
  roomGroups.forEach((rg) => {
    const ws = buildRoomSheet(
      rg.roomName,
      rg.students,
      rg.specialInRoom || [],
      rg.separateInRoom || []
    );
    XLSX.utils.book_append_sheet(wb, ws, uniqueSheetName(wb, rg.roomName));
  });

  // ── 도움실 시트 ─────────────────────────────────────────────────────────────
  if (specialStudents.length > 0) {
    const sorted = [...specialStudents].sort((a, b) => {
      const cd = Number(a.classNo) - Number(b.classNo);
      return cd !== 0 ? cd : Number(a.number) - Number(b.number);
    });
    // 도움실 학생은 seated 로 취급, specialInRoom/separateInRoom 없음
    const seatedStyle = sorted.map((s, i) => ({ ...s, seatNumber: i + 1 }));
    const ws = buildRoomSheet("도움실", seatedStyle, [], []);
    XLSX.utils.book_append_sheet(wb, ws, "도움실");
  }

  // ── 별도실 시트 ─────────────────────────────────────────────────────────────
  if (separateStudents.length > 0) {
    const sorted = [...separateStudents].sort((a, b) => {
      const cd = Number(a.classNo) - Number(b.classNo);
      return cd !== 0 ? cd : Number(a.number) - Number(b.number);
    });
    const seatedStyle = sorted.map((s, i) => ({ ...s, seatNumber: i + 1 }));
    const ws = buildRoomSheet("별도실", seatedStyle, [], []);
    XLSX.utils.book_append_sheet(wb, ws, "별도실");
  }

  return wb;
}

/** 세션별 파일명 생성: 날짜_학년학년_교시_과목명.xlsx */
export function sessionFileName(roster) {
  const clean = (s) => String(s).replace(/[^\w가-힣]/g, "");
  return `${clean(roster.dayLabel)}_${roster.grade}학년_${clean(roster.periodLabel)}_${clean(roster.subjectName)}.xlsx`;
}

// ─── 과목별 응시 현황표 (전 세션 → 1파일) ────────────────────────────────────

const LIGHT_FILL = { patternType: "solid", fgColor: { rgb: "E8EAED" } };
const LIGHT_BORDER = {
  top: { style: "thin", color: { rgb: "CCCCCC" } },
  bottom: { style: "thin", color: { rgb: "CCCCCC" } },
  left: { style: "thin", color: { rgb: "CCCCCC" } },
  right: { style: "thin", color: { rgb: "CCCCCC" } },
};

function statusLabel(examStatus) {
  const map = { special: "도움실", separate: "별도실", delegation: "위탁(미응시)" };
  return map[examStatus] || "-";
}

export function generateSubjectRostersExcel(subjectRosters, schoolName = "OO고등학교") {
  const wb = XLSX.utils.book_new();

  subjectRosters.forEach((roster) => {
    const hs = {
      font: { bold: true },
      fill: LIGHT_FILL,
      alignment: { horizontal: "center" },
      border: LIGHT_BORDER,
    };
    const cs = { alignment: { horizontal: "center" }, border: LIGHT_BORDER };

    const rows = [];

    rows.push([schoolName, "", "", "", "", "", ""]);
    rows.push(["과목별 응시 현황표", "", "", "", "", "", ""]);
    rows.push(["", "", "", "", "", "", ""]);
    rows.push(["고사일", roster.dayLabel, "", "", "", "", ""]);
    rows.push([
      "교시",
      `${roster.periodLabel} (${roster.startTime} ~ ${roster.endTime})`,
      "", "", "", "", "",
    ]);
    rows.push(["학년", `${roster.grade}학년`, "", "", "", "", ""]);
    rows.push([
      "과목명",
      `${roster.subjectName}${roster.subjectCode ? ` [${roster.subjectCode}]` : ""}`,
      "", "", "", "", "",
    ]);
    rows.push(["형태", roster.isEssay ? "서논술형" : "선택형", "", "", "", "", ""]);
    rows.push(["", "", "", "", "", "", ""]);

    rows.push([
      { v: "재적", t: "s", s: hs },
      { v: "응시", t: "s", s: hs },
      { v: "도움실", t: "s", s: hs },
      { v: "별도실", t: "s", s: hs },
      { v: "위탁(미응시)", t: "s", s: hs },
      "", "",
    ]);
    rows.push([
      { v: roster.counts.total, t: "n", s: cs },
      { v: roster.counts.normal, t: "n", s: cs },
      { v: roster.counts.special, t: "n", s: cs },
      { v: roster.counts.separate, t: "n", s: cs },
      { v: roster.counts.delegation, t: "n", s: cs },
      "", "",
    ]);
    rows.push(["", "", "", "", "", "", ""]);

    rows.push([
      { v: "반", t: "s", s: hs },
      { v: "번호", t: "s", s: hs },
      { v: "이름", t: "s", s: hs },
      { v: "성별", t: "s", s: hs },
      { v: "응시형태", t: "s", s: hs },
      { v: "고사실", t: "s", s: hs },
      { v: "좌석번호", t: "s", s: hs },
    ]);

    if (roster.students.length === 0) {
      rows.push([
        {
          v: "(수강 학생 없음)",
          t: "s",
          s: { font: { color: { rgb: "9CA3AF" } }, alignment: { horizontal: "center" } },
        },
        "", "", "", "", "", "",
      ]);
    } else {
      roster.students.forEach((s) => {
        const isDelegation = s.examStatus === "delegation";
        const rowCs = isDelegation
          ? { font: { color: { rgb: "9CA3AF" } }, alignment: { horizontal: "center" }, border: LIGHT_BORDER }
          : cs;
        rows.push([
          { v: String(s.classNo ?? ""), t: "s", s: cs },
          { v: String(s.number ?? ""), t: "s", s: cs },
          { v: s.name || "", t: "s", s: { alignment: { horizontal: "left" }, border: LIGHT_BORDER } },
          { v: s.gender || "", t: "s", s: cs },
          { v: statusLabel(s.examStatus), t: "s", s: rowCs },
          { v: s.roomName || "-", t: "s", s: cs },
          { v: s.seatNumber !== "" ? String(s.seatNumber) : "-", t: "s", s: cs },
        ]);
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 6 }, { wch: 7 }, { wch: 12 },
      { wch: 6 }, { wch: 14 }, { wch: 12 }, { wch: 9 },
    ];
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    ];

    const sn = uniqueSheetName(
      wb,
      `${roster.grade}학년_${roster.subjectName}_${roster.periodLabel}`
    );
    XLSX.utils.book_append_sheet(wb, ws, sn);
  });

  return wb;
}

// ─── 학급별 학생 고사 명렬표 ──────────────────────────────────────────────────
//
// 시트 구조 (학급당 1 시트):
//   행1: 제목 (병합)
//   행2: 세션 헤더 — 번호|이름|성별 + [과목명 colspan 2] × N
//   행3: 서브 헤더 — | | | 고사실 | 좌석 × N
//   행4+: 학생 데이터

export function generateClassRostersExcel(classRosters, schoolName = "OO고등학교") {
  const wb = XLSX.utils.book_new();

  const sTitle = {
    font: { bold: true, sz: 13 },
    alignment: { horizontal: "center", vertical: "center" },
  };
  const sHeader = {
    font: { bold: true, sz: 9 },
    fill: GRAY_FILL,
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: THIN_BORDER,
  };
  const sCell = {
    font: { sz: 9 },
    alignment: { horizontal: "center", vertical: "center" },
    border: THIN_BORDER,
  };
  const sNameCell = {
    font: { sz: 9 },
    alignment: { horizontal: "left", vertical: "center" },
    border: THIN_BORDER,
  };

  const ASSIGN_STATUS = { special: "도움실", separate: "별도실", delegation: "위탁" };

  classRosters.forEach(({ grade, classNo, sessions, students }) => {
    if (!sessions.length && !students.length) return;

    const rows = [];
    const colCount = 3 + sessions.length;

    // 행1: 제목
    const titleRow = [
      { v: `${grade}학년 ${classNo}반 학생 고사 명렬표`, t: "s", s: sTitle },
    ];
    for (let i = 1; i < colCount; i++) titleRow.push({ v: "", t: "s", s: {} });
    rows.push(titleRow);

    // 행2: 세션 헤더
    const sessionHeaderRow = [
      { v: "번호", t: "s", s: sHeader },
      { v: "이름", t: "s", s: sHeader },
      { v: "성별", t: "s", s: sHeader },
    ];
    sessions.forEach((sess) => {
      sessionHeaderRow.push({ v: `${sess.dayLabel} ${sess.periodLabel}\n${sess.subjectName}`, t: "s", s: sHeader });
    });
    rows.push(sessionHeaderRow);

    // 행3: 서브 헤더 (고사실만)
    const subHeaderRow = [
      { v: "", t: "s", s: sHeader },
      { v: "", t: "s", s: sHeader },
      { v: "", t: "s", s: sHeader },
    ];
    sessions.forEach(() => {
      subHeaderRow.push({ v: "고사실", t: "s", s: sHeader });
    });
    rows.push(subHeaderRow);

    // 행4+: 학생 데이터
    students.forEach((st) => {
      const row = [
        { v: String(st.number ?? ""), t: "s", s: sCell },
        { v: st.name || "", t: "s", s: sNameCell },
        { v: st.gender || "", t: "s", s: sCell },
      ];
      sessions.forEach((sess) => {
        const asgn = st.assignments.get(sess.sessionId);
        if (!asgn) {
          row.push({ v: "대기", t: "s", s: { ...sCell, font: { sz: 9, color: { rgb: "9CA3AF" } } } });
        } else {
          const status = ASSIGN_STATUS[asgn.examStatus];
          if (status) {
            row.push({ v: status, t: "s", s: { ...sCell, font: { sz: 9, color: { rgb: "9CA3AF" } } } });
          } else {
            row.push({ v: asgn.roomName || "-", t: "s", s: sCell });
          }
        }
      });
      rows.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // 병합: 제목 행 + 번호·이름·성별 rowspan
    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }, // 제목
      { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } }, // 번호 rowspan
      { s: { r: 1, c: 1 }, e: { r: 2, c: 1 } }, // 이름 rowspan
      { s: { r: 1, c: 2 }, e: { r: 2, c: 2 } }, // 성별 rowspan
    ];
    ws["!merges"] = merges;

    // 열 너비
    const cols = [{ wch: 6 }, { wch: 12 }, { wch: 6 }];
    sessions.forEach(() => { cols.push({ wch: 14 }); });
    ws["!cols"] = cols;
    ws["!rows"] = [{ hpx: 20 }, { hpx: 28 }, { hpx: 16 }];

    const sn = uniqueSheetName(wb, `${grade}학년${classNo}반`);
    XLSX.utils.book_append_sheet(wb, ws, sn);
  });

  return wb;
}

// ─── 대기실 학생 명렬표 ────────────────────────────────────────────────────────
//
// 시트 구조 (교시당 1 시트):
//   행1: 제목
//   행2: 메타 정보
//   행3: 빈칸
//   이후: 학급별 블록 (학급 제목 + 학생 목록)

export function generateWaitingRostersExcel(waitingRosters, schoolName = "OO고등학교") {
  const wb = XLSX.utils.book_new();

  const sTitle = {
    font: { bold: true, sz: 12 },
    alignment: { horizontal: "center", vertical: "center" },
  };
  const sClassTitle = {
    font: { bold: true, sz: 10 },
    fill: GRAY_FILL,
    alignment: { horizontal: "center", vertical: "center" },
    border: THIN_BORDER,
  };
  const sHeader = {
    font: { bold: true, sz: 9 },
    fill: GRAY_FILL,
    alignment: { horizontal: "center", vertical: "center" },
    border: THIN_BORDER,
  };
  const sCell = {
    font: { sz: 9 },
    alignment: { horizontal: "center", vertical: "center" },
    border: THIN_BORDER,
  };
  const sNameCell = {
    font: { sz: 9 },
    alignment: { horizontal: "left", vertical: "center" },
    border: THIN_BORDER,
  };

  waitingRosters.forEach(({ dayLabel, periodLabel, startTime, endTime, classes }) => {
    if (!classes.length) return;
    const totalWaiting = classes.reduce((n, c) => n + c.students.length, 0);

    const rows = [];

    // 제목
    rows.push([
      { v: `${dayLabel} ${periodLabel} 대기실 학생 명렬표`, t: "s", s: sTitle },
      "", "", "",
    ]);
    rows.push([
      { v: `고사 시간: ${startTime}~${endTime}  |  대기 학생 합계: ${totalWaiting}명`, t: "s", s: { font: { sz: 9 }, alignment: { horizontal: "left" } } },
      "", "", "",
    ]);
    rows.push(["", "", "", ""]);

    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    ];
    let currentRow = 3;

    classes.forEach(({ grade, classNo, students }) => {
      // 학급 제목
      rows.push([
        { v: `${grade}학년 ${classNo}반 (${students.length}명)`, t: "s", s: sClassTitle },
        "", "", "",
      ]);
      merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 3 } });
      currentRow++;

      // 헤더
      rows.push([
        { v: "번호", t: "s", s: sHeader },
        { v: "이름", t: "s", s: sHeader },
        { v: "성별", t: "s", s: sHeader },
        { v: "비고", t: "s", s: sHeader },
      ]);
      currentRow++;

      students.forEach((st) => {
        rows.push([
          { v: String(st.number ?? ""), t: "s", s: sCell },
          { v: st.name || "", t: "s", s: sNameCell },
          { v: st.gender || "", t: "s", s: sCell },
          { v: "", t: "s", s: sCell },
        ]);
        currentRow++;
      });

      // 학급 간 빈 줄
      rows.push(["", "", "", ""]);
      currentRow++;
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!merges"] = merges;
    ws["!cols"] = [{ wch: 7 }, { wch: 12 }, { wch: 7 }, { wch: 14 }];
    ws["!rows"] = [{ hpx: 20 }, { hpx: 14 }];

    const sn = uniqueSheetName(wb, `${dayLabel}_${periodLabel}`);
    XLSX.utils.book_append_sheet(wb, ws, sn);
  });

  return wb;
}

// ─── 학생 개인별 시간표 ───────────────────────────────────────────────────────
//
// 시트: 학년별 1시트
// 열: 반 | 번호 | 이름 | 성별 | [교시1 고사실/좌석] | [교시2…] | …

export function generateStudentTimetablesExcel(studentTimetables, schoolName = "OO고등학교") {
  const wb = XLSX.utils.book_new();

  const sTitle = {
    font: { bold: true, sz: 12 },
    alignment: { horizontal: "center", vertical: "center" },
  };
  const sHeader = {
    font: { bold: true, sz: 9 },
    fill: GRAY_FILL,
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: THIN_BORDER,
  };
  const sCell = {
    font: { sz: 9 },
    alignment: { horizontal: "center", vertical: "center" },
    border: THIN_BORDER,
  };
  const sNameCell = {
    font: { sz: 9 },
    alignment: { horizontal: "left", vertical: "center" },
    border: THIN_BORDER,
  };
  const sGrayCell = {
    font: { sz: 9, color: { rgb: "9CA3AF" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: THIN_BORDER,
  };

  // 학년별 그룹
  const gradeMap = new Map();
  studentTimetables.forEach((s) => {
    const g = String(s.grade);
    if (!gradeMap.has(g)) gradeMap.set(g, []);
    gradeMap.get(g).push(s);
  });

  // 각 학년의 세션 컬럼 헤더 (exams 배열 순서 기준 — 모든 학생 중 가장 많은 exams 기준)
  gradeMap.forEach((students, grade) => {
    if (!students.length) return;

    // 이 학년에서 등장하는 세션 헤더 목록 (첫 학생 기준으로 컬럼 순서 확정)
    const sessionCols = [];
    const seen = new Set();
    students.forEach((s) => {
      s.exams.forEach((e) => {
        const key = `${e.dayLabel}_${e.periodLabel}_${e.subjectName}`;
        if (!seen.has(key)) {
          seen.add(key);
          sessionCols.push({ key, dayLabel: e.dayLabel, periodLabel: e.periodLabel, subjectName: e.subjectName });
        }
      });
    });

    const colCount = 4 + sessionCols.length;
    const rows = [];

    // 제목
    const titleRow = [{ v: `${grade}학년 학생 개인별 시험 시간표`, t: "s", s: sTitle }];
    for (let i = 1; i < colCount; i++) titleRow.push({ v: "", t: "s", s: {} });
    rows.push(titleRow);

    // 헤더
    const headerRow = [
      { v: "반", t: "s", s: sHeader },
      { v: "번호", t: "s", s: sHeader },
      { v: "이름", t: "s", s: sHeader },
      { v: "성별", t: "s", s: sHeader },
    ];
    sessionCols.forEach((col) => {
      headerRow.push({ v: `${col.dayLabel} ${col.periodLabel}\n${col.subjectName}`, t: "s", s: sHeader });
    });
    rows.push(headerRow);

    // 학생 데이터
    students.forEach((s) => {
      const row = [
        { v: String(s.classNo ?? ""), t: "s", s: sCell },
        { v: String(s.number   ?? ""), t: "s", s: sCell },
        { v: s.name  || "", t: "s", s: sNameCell },
        { v: s.gender || "", t: "s", s: sCell },
      ];
      // 각 세션 컬럼에 맞는 시험 찾기
      sessionCols.forEach((col) => {
        const exam = s.exams.find(
          (e) => e.dayLabel === col.dayLabel && e.periodLabel === col.periodLabel && e.subjectName === col.subjectName
        );
        if (!exam) {
          row.push({ v: "대기", t: "s", s: sGrayCell });
        } else if (exam.examStatus === "special") {
          row.push({ v: `${exam.roomName || "-"} (도움실)`, t: "s", s: sGrayCell });
        } else if (exam.examStatus === "separate") {
          row.push({ v: `${exam.roomName || "-"} (별도실)`, t: "s", s: sGrayCell });
        } else {
          const val = exam.roomName
            ? `${exam.roomName}${exam.seatNumber !== "" ? ` / ${exam.seatNumber}번` : ""}`
            : "미배정";
          row.push({ v: val, t: "s", s: sCell });
        }
      });
      rows.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);

    const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }];
    ws["!merges"] = merges;

    const cols = [{ wch: 5 }, { wch: 6 }, { wch: 10 }, { wch: 5 }];
    sessionCols.forEach(() => cols.push({ wch: 14 }));
    ws["!cols"] = cols;
    ws["!rows"] = [{ hpx: 20 }, { hpx: 30 }];

    const sn = uniqueSheetName(wb, `${grade}학년`);
    XLSX.utils.book_append_sheet(wb, ws, sn);
  });

  return wb;
}

// ─── 시험시간표 (전 학년 통합) ────────────────────────────────────────────────

export function generateExamScheduleExcel(sortedRosters, planName = "", schoolName = "OO고등학교") {
  const wb = XLSX.utils.book_new();

  const hStyle = {
    font: { bold: true, sz: 10 },
    fill: GRAY_FILL,
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: THIN_BORDER,
  };
  const cStyle = { font: { sz: 10 }, alignment: { horizontal: "center", vertical: "center" }, border: THIN_BORDER };
  const lStyle = { font: { sz: 10 }, alignment: { horizontal: "left", vertical: "center" }, border: THIN_BORDER };
  const titleStyle = { font: { bold: true, sz: 13 }, alignment: { horizontal: "center", vertical: "center" } };
  const dayStyle = {
    font: { bold: true, sz: 10 },
    fill: { patternType: "solid", fgColor: { rgb: "F3F4F6" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: THIN_BORDER,
  };

  const rows = [];
  const titleText = `${schoolName}${planName ? " " + planName : ""} 시험시간표`;
  rows.push([{ v: titleText, t: "s", s: titleStyle }, "", "", "", "", "", "", "", ""]);
  rows.push(["", "", "", "", "", "", "", "", ""]);
  rows.push([
    { v: "날짜", t: "s", s: hStyle },
    { v: "교시", t: "s", s: hStyle },
    { v: "시험시간", t: "s", s: hStyle },
    { v: "학년", t: "s", s: hStyle },
    { v: "과목명", t: "s", s: hStyle },
    { v: "과목코드", t: "s", s: hStyle },
    { v: "구분", t: "s", s: hStyle },
    { v: "고사실", t: "s", s: hStyle },
    { v: "응시인원", t: "s", s: hStyle },
  ]);

  const dayGroups = [];
  sortedRosters.forEach((r) => {
    const last = dayGroups[dayGroups.length - 1];
    if (last && last.dayLabel === r.dayLabel) {
      last.rows.push(r);
    } else {
      dayGroups.push({ dayLabel: r.dayLabel, rows: [r] });
    }
  });

  const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];
  let rowIdx = 3;

  dayGroups.forEach((dg) => {
    const dayStartRow = rowIdx;
    dg.rows.forEach((r, i) => {
      const rooms = r.roomGroups.map((rg) => rg.roomName).join(", ") || "-";
      rows.push([
        { v: i === 0 ? r.dayLabel : "", t: "s", s: dayStyle },
        { v: r.periodLabel, t: "s", s: cStyle },
        { v: `${r.startTime || "-"}~${r.endTime || "-"}`, t: "s", s: cStyle },
        { v: `${r.grade}학년`, t: "s", s: cStyle },
        { v: r.subjectName, t: "s", s: lStyle },
        { v: r.subjectCode || "", t: "s", s: cStyle },
        { v: r.isEssay ? "서논술" : "선택", t: "s", s: cStyle },
        { v: rooms, t: "s", s: lStyle },
        { v: r.counts.total, t: "n", s: cStyle },
      ]);
      rowIdx++;
    });
    if (dg.rows.length > 1) {
      merges.push({ s: { r: dayStartRow, c: 0 }, e: { r: rowIdx - 1, c: 0 } });
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 13 }, { wch: 8 }, { wch: 14 }, { wch: 8 },
    { wch: 20 }, { wch: 12 }, { wch: 8 }, { wch: 24 }, { wch: 9 },
  ];
  ws["!rows"] = [{ hpx: 24 }];
  ws["!merges"] = merges;

  XLSX.utils.book_append_sheet(wb, ws, "시험시간표");
  return wb;
}

// ─── 학급별 인원수·고사실 현황 ────────────────────────────────────────────────

export function generateClassCountExcel(sortedRosters, students, planName = "", schoolName = "OO고등학교") {
  const wb = XLSX.utils.book_new();

  const classesByGrade = {};
  students.forEach((s) => {
    const g = String(s.grade);
    if (!classesByGrade[g]) classesByGrade[g] = new Set();
    classesByGrade[g].add(Number(s.classNo));
  });

  const hStyle = {
    font: { bold: true, sz: 10 },
    fill: GRAY_FILL,
    alignment: { horizontal: "center", vertical: "center" },
    border: THIN_BORDER,
  };
  const cStyle = { font: { sz: 10 }, alignment: { horizontal: "center", vertical: "center" }, border: THIN_BORDER };
  const lStyle = { font: { sz: 10 }, alignment: { horizontal: "left", vertical: "center" }, border: THIN_BORDER };
  const boldCStyle = { font: { bold: true, sz: 10 }, alignment: { horizontal: "center", vertical: "center" }, border: THIN_BORDER };
  const titleStyle = { font: { bold: true, sz: 12 }, alignment: { horizontal: "center", vertical: "center" } };

  const grades = Object.keys(classesByGrade).sort();

  grades.forEach((grade) => {
    const classes = [...classesByGrade[grade]].sort((a, b) => a - b);
    const gradeRosters = sortedRosters.filter((r) => String(r.grade) === grade);
    if (!gradeRosters.length) return;

    const totalCols = 4 + classes.length + 4;
    const emptyRow = Array(totalCols).fill("");

    const rows = [];
    const titleText = `${schoolName}${planName ? " " + planName : ""} ${grade}학년 학급별 응시인원 현황`;
    rows.push([{ v: titleText, t: "s", s: titleStyle }, ...Array(totalCols - 1).fill("")]);
    rows.push([...emptyRow]);
    rows.push([
      { v: "날짜", t: "s", s: hStyle },
      { v: "교시", t: "s", s: hStyle },
      { v: "시험시간", t: "s", s: hStyle },
      { v: "과목명", t: "s", s: hStyle },
      ...classes.map((c) => ({ v: `${c}반`, t: "s", s: hStyle })),
      { v: "응시합계", t: "s", s: hStyle },
      { v: "위탁", t: "s", s: hStyle },
      { v: "특수", t: "s", s: hStyle },
      { v: "고사실", t: "s", s: hStyle },
    ]);

    gradeRosters.forEach((r) => {
      const countByClass = {};
      classes.forEach((c) => { countByClass[c] = 0; });
      r.students.forEach((st) => {
        if (st.examStatus !== "delegation") {
          const c = Number(st.classNo);
          if (countByClass[c] !== undefined) countByClass[c]++;
        }
      });

      const rooms = r.roomGroups.map((rg) => rg.roomName).join(", ") || "-";
      const delegation = r.counts.delegation;
      const special = r.counts.special + r.counts.separate;
      const attended = r.counts.total - delegation;

      rows.push([
        { v: r.dayLabel, t: "s", s: cStyle },
        { v: r.periodLabel, t: "s", s: cStyle },
        { v: `${r.startTime || "-"}~${r.endTime || "-"}`, t: "s", s: cStyle },
        { v: r.subjectName, t: "s", s: lStyle },
        ...classes.map((c) => ({ v: countByClass[c] || 0, t: "n", s: cStyle })),
        { v: attended, t: "n", s: boldCStyle },
        { v: delegation || 0, t: "n", s: cStyle },
        { v: special || 0, t: "n", s: cStyle },
        { v: rooms, t: "s", s: lStyle },
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }];
    ws["!cols"] = [
      { wch: 12 }, { wch: 8 }, { wch: 13 }, { wch: 18 },
      ...classes.map(() => ({ wch: 6 })),
      { wch: 10 }, { wch: 6 }, { wch: 6 }, { wch: 22 },
    ];
    ws["!rows"] = [{ hpx: 22 }];

    XLSX.utils.book_append_sheet(wb, ws, uniqueSheetName(wb, `${grade}학년`));
  });

  return wb;
}

// ─── 다운로드 ─────────────────────────────────────────────────────────────────

export function downloadExcel(workbook, fileName) {
  XLSX.writeFile(workbook, fileName);
}
