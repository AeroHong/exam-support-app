// ─────────────────────────────────────────────────────────────────────────────
// PDF 출력물 생성 (jsPDF 4.x + jsPDF-autotable 5.x)
//
// ⚠ jspdf-autotable 5.x: doc.autoTable(opts) 메서드 방식 폐기
//   → autoTable(doc, opts) 독립 함수 방식으로 전환
// ⚠ widths 오류 방지: 모든 columnStyles에 cellWidth 명시 (자동 너비 계산 우회)
// ⚠ 한글 폰트: notoSansKR.js 파일이 유효한 TTF가 아니면 helvetica fallback
// ─────────────────────────────────────────────────────────────────────────────

import jsPDF from "jspdf";
import { autoTable } from "jspdf-autotable";
import { notoSansKR } from "./notoSansKR";

let koreanFontLoaded = false;

function setupKoreanFont(doc) {
  try {
    if (!doc.existsFileInVFS("NotoSansKR.ttf")) {
      doc.addFileToVFS("NotoSansKR.ttf", notoSansKR);
    }
    doc.addFont("NotoSansKR.ttf", "NotoSansKR", "normal");
    // bold 요청을 같은 폰트로 매핑 (autoTable headStyles 등의 bold fallback 방지)
    doc.addFont("NotoSansKR.ttf", "NotoSansKR", "bold");
    doc.setFont("NotoSansKR", "normal");
    // addFont은 내부 실패 시 예외 대신 PubSub 로깅만 하므로
    // 실제 메트릭 조회로 등록 성공 여부를 검증
    doc.getStringUnitWidth("A");
    koreanFontLoaded = true;
    return true;
  } catch {
    koreanFontLoaded = false;
    doc.setFont("helvetica", "normal");
    return false;
  }
}

function newDoc() {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  setupKoreanFont(doc);
  return doc;
}

// A4 유효 너비: 210 - 15(left) - 15(right) = 180mm
const PAGE_W = 180;

function runTable(doc, startY, head, body, colWidths) {
  // columnStyles — cellWidth 전부 명시해서 autoTable 자동 계산 우회
  const columnStyles = {};
  colWidths.forEach((w, i) => { columnStyles[i] = { cellWidth: w }; });

  try {
    const result = autoTable(doc, {
      startY,
      head,
      body,
      theme: "grid",
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontSize: 9,
        halign: "center",
      },
      bodyStyles: { fontSize: 8, halign: "center" },
      columnStyles,
      margin: { left: 15, right: 15 },
    });
    return result?.finalY ?? doc.lastAutoTable?.finalY ?? startY + 20;
  } catch (err) {
    console.error("[PDF] autoTable 오류:", err.message);
    return startY + 20;
  }
}

// ─── 과목별 응시 현황표 PDF ──────────────────────────────────────────────────

function drawSubjectPage(doc, roster) {
  const W = doc.internal.pageSize.getWidth();
  let y = 15;

  doc.setFontSize(15);
  doc.text("과목별 응시 현황표", W / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(9);
  doc.text(
    `${roster.grade}학년  ${roster.subjectName}${roster.subjectCode ? ` [${roster.subjectCode}]` : ""}  ${roster.isEssay ? "서논술형" : "선택형"}`,
    W / 2, y, { align: "center" }
  );
  y += 7;

  doc.text(`고사일: ${roster.dayLabel}    교시: ${roster.periodLabel} (${roster.startTime}~${roster.endTime})`, 15, y);
  y += 6;
  doc.text(
    `재적 ${roster.counts.total}명  응시 ${roster.counts.normal}명  도움실 ${roster.counts.special}명  별도실 ${roster.counts.separate}명  위탁 ${roster.counts.delegation}명`,
    15, y
  );
  y += 8;

  const statusLabel = (es) => ({ special: "도움실", separate: "별도실", delegation: "위탁" }[es] || "-");
  const body = roster.students.map((s) => [
    s.classNo ?? "",
    s.number ?? "",
    s.name || "",
    s.gender || "",
    statusLabel(s.examStatus),
    s.roomName || "-",
    s.seatNumber !== "" ? s.seatNumber : "-",
  ]);

  // 합계 180mm: 12+14+30+10+18+22+14 = 120 → 나머지 60 여백
  y = runTable(
    doc, y,
    [["반", "번호", "이름", "성별", "응시형태", "고사실", "좌석"]],
    body,
    [12, 14, 34, 10, 22, 24, 14]
  ) + 4;

  return y;
}

export function generateSubjectRostersPDF(subjectRosters, schoolName = "OO고등학교") {
  if (!subjectRosters.length) return null;
  const doc = newDoc();

  subjectRosters.forEach((roster, i) => {
    if (i > 0) { doc.addPage(); setupKoreanFont(doc); }
    drawSubjectPage(doc, roster);
  });

  return doc;
}

// ─── 고사실별 응시 현황표 PDF ─────────────────────────────────────────────────

function drawRoomPage(doc, roster, rg) {
  const W = doc.internal.pageSize.getWidth();
  let y = 15;

  doc.setFontSize(15);
  doc.text("고사실별 응시 현황표", W / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(9);
  doc.text(`고사일: ${roster.dayLabel}    교시: ${roster.periodLabel} (${roster.startTime}~${roster.endTime})`, 15, y);
  y += 6;
  doc.text(
    `고사실: ${rg.roomName}    과목: ${roster.subjectName}${roster.subjectCode ? ` [${roster.subjectCode}]` : ""}  ${roster.isEssay ? "서논술형" : "선택형"}`,
    15, y
  );
  y += 6;

  const totalInRoom = rg.students.length + (rg.specialInRoom?.length || 0) + (rg.separateInRoom?.length || 0);
  doc.text(
    `재적인원: ${totalInRoom}명  응시인원: ${rg.students.length}명  도움실: ${rg.specialInRoom?.length || 0}명  별도실: ${rg.separateInRoom?.length || 0}명`,
    15, y
  );
  y += 8;

  const body = rg.students.map((s) => [
    s.seatNumber || "",
    s.classNo || "",
    s.number || "",
    s.name || "",
    s.gender || "",
    "",
  ]);

  // 합계: 14+12+14+34+10+14 = 98mm
  y = runTable(
    doc, y,
    [["좌석", "반", "번호", "이름", "성별", "결시"]],
    body,
    [14, 12, 14, 34, 10, 14]
  ) + 4;

  if (rg.specialInRoom?.length) {
    doc.setFontSize(8);
    const makeId = (s) => `${s.grade}${String(s.classNo).padStart(2,"0")}${String(s.number).padStart(2,"0")}`;
    doc.text(
      `[도움실] ${rg.specialInRoom.map(s => `${makeId(s)} ${s.name}`).join(", ")}`,
      15, y
    );
    y += 6;
  }
  if (rg.separateInRoom?.length) {
    doc.setFontSize(8);
    const makeId = (s) => `${s.grade}${String(s.classNo).padStart(2,"0")}${String(s.number).padStart(2,"0")}`;
    doc.text(
      `[별도실] ${rg.separateInRoom.map(s => `${makeId(s)} ${s.name}`).join(", ")}`,
      15, y
    );
    y += 6;
  }

  y += 6;
  doc.setFontSize(9);
  doc.text("감독관 서명:  ______________________ (인)", 15, y);

  return y;
}

export function generateRoomRostersPDF(subjectRosters, schoolName = "OO고등학교") {
  const pages = [];
  subjectRosters.forEach((roster) => {
    roster.roomGroups.forEach((rg) => pages.push({ roster, rg }));
  });
  if (!pages.length) return null;

  const doc = newDoc();
  pages.forEach(({ roster, rg }, i) => {
    if (i > 0) { doc.addPage(); setupKoreanFont(doc); }
    drawRoomPage(doc, roster, rg);
  });

  return doc;
}

// ─── 학생 개인별 시간표 PDF (학급별 통합) ────────────────────────────────────

/**
 * 한 학생의 A4 페이지 렌더.
 * 행 = 교시, 열 = 1일차·2일차…
 * 시험 시간은 각 셀(과목)에 개인화하여 표시.
 */
function drawStudentTimetablePage(doc, student, schoolName, planName, days, periods, waitingRoomMap) {
  const MARGIN   = 15;
  const FONT     = koreanFontLoaded ? "NotoSansKR" : "helvetica";

  // 시험 조회맵: "dayLabel_periodLabel" → exam 객체
  const examMap = {};
  for (const e of student.exams) {
    examMap[`${e.dayLabel}_${e.periodLabel}`] = e;
  }

  // 학생의 날짜별 시험 교시 인덱스 집합: dayLabel → Set<periodIdx>
  const examPeriodsByDay = {};
  for (const e of student.exams) {
    if (!examPeriodsByDay[e.dayLabel]) examPeriodsByDay[e.dayLabel] = new Set();
    const pIdx = periods.findIndex((p) => p.label === e.periodLabel);
    if (pIdx >= 0) examPeriodsByDay[e.dayLabel].add(pIdx);
  }

  const classKey = `${student.grade}-${student.classNo}`;

  // 열 너비: 교시 열 32mm + 날짜 열 균등 분배
  const PERIOD_COL = 32;
  const dayColW    = Math.floor((PAGE_W - PERIOD_COL) / days.length);

  // ── 헤더 (font 명시) ──
  const hdr = autoTable(doc, {
    startY: MARGIN,
    body: [
      [{ content: schoolName, styles: { fontSize: 15, fontStyle: "bold", halign: "center", font: FONT } }],
      [{ content: planName,   styles: { fontSize: 9,  textColor: [80,80,80], halign: "center", font: FONT } }],
      [{
        content: `${student.grade}학년  ${student.classNo}반  ${student.number}번     ${student.name}`,
        styles: { fontSize: 13, fontStyle: "bold", halign: "center", font: FONT },
      }],
    ],
    theme: "plain",
    columnStyles: { 0: { cellWidth: PAGE_W } },
    margin: { left: MARGIN, right: MARGIN },
    bodyStyles: { cellPadding: { top: 1, bottom: 1, left: 2, right: 2 } },
  });

  const yAfterHdr = (hdr?.finalY ?? doc.lastAutoTable?.finalY ?? MARGIN + 28) + 3;
  doc.setLineWidth(0.8);
  doc.setDrawColor(0, 0, 0);
  doc.line(MARGIN, yAfterHdr, MARGIN + PAGE_W, yAfterHdr);

  // ── 시험 일정 그리드 ──
  if (student.exams.length === 0) {
    autoTable(doc, {
      startY: yAfterHdr + 5,
      body: [[{ content: "응시 과목 없음", styles: { textColor: [180,180,180], halign: "center", fontSize: 10, font: FONT } }]],
      theme: "plain",
      columnStyles: { 0: { cellWidth: PAGE_W } },
      margin: { left: MARGIN, right: MARGIN },
    });
    return;
  }

  // 헤더 행: "시험 일정\n교시" + "1일차\n(날짜)" × N
  const head = [[
    { content: "시험 일정\n교시", styles: { halign: "center", fontStyle: "bold", fontSize: 9, font: FONT } },
    ...days.map((day, i) => ({
      content: `${i + 1}일차\n(${day.label})`,
      styles: { halign: "center", fontStyle: "bold", fontSize: 9, font: FONT },
    })),
  ]];

  // 데이터 행: 교시 × 날짜
  // 시험 시간은 각 과목 셀에 개인화 표시 (자습시간 등 반영된 실제 startTime~endTime)
  const body = periods.map((period, periodIdx) => {
    const periodCell = {
      content: period.label,
      styles: { halign: "center", fontStyle: "bold", fontSize: 10, fillColor: [245,245,245], font: FONT },
    };

    const dayCells = days.map((day) => {
      const e = examMap[`${day.label}_${period.label}`];

      // 시험이 있는 셀
      if (e) {
        const statusLabel = e.examStatus === "special"  ? "\n(도움실)"
                          : e.examStatus === "separate" ? "\n(별도실)" : "";
        const seatStr  = e.seatNumber !== "" && e.seatNumber != null ? ` ${e.seatNumber}번` : "";
        const roomStr  = e.roomName ? `${e.roomName}${seatStr}` : "미배정";
        const timeStr  = e.startTime && e.endTime ? `${e.startTime}~${e.endTime}` : "";
        return {
          content: `${e.subjectName}${timeStr ? `\n${timeStr}` : ""}\n${roomStr}${statusLabel}`,
          styles: { halign: "center", fontSize: 9, fillColor: [235,245,255], font: FONT },
        };
      }

      // 대기 여부 판단: 이 날에 시험이 있고, 이 교시 이후에도 시험이 있으면 대기
      const examIdxSet = examPeriodsByDay[day.label];
      if (examIdxSet && examIdxSet.size > 0) {
        const hasLaterExam = [...examIdxSet].some((idx) => idx > periodIdx);
        if (hasLaterExam) {
          const periodKey  = `${day.id}__${period.id}`;
          const waitingRoom = waitingRoomMap?.[periodKey]?.[classKey] ?? null;
          return {
            content: waitingRoom ? `대기\n${waitingRoom}` : "대기",
            styles: { halign: "center", fontSize: 9, fillColor: [255,248,220], font: FONT },
          };
        }
      }

      // 빈 셀 (시험 없고 대기도 아님)
      return { content: "", styles: { halign: "center", font: FONT } };
    });

    return [periodCell, ...dayCells];
  });

  const colStyles = { 0: { cellWidth: PERIOD_COL } };
  days.forEach((_, i) => { colStyles[i + 1] = { cellWidth: dayColW }; });

  autoTable(doc, {
    startY: yAfterHdr + 5,
    head,
    body,
    theme: "grid",
    styles: { font: FONT },
    headStyles: { fillColor: [28,68,140], textColor: [255,255,255], fontSize: 9, halign: "center", fontStyle: "bold", font: FONT },
    bodyStyles: { fontSize: 9, halign: "center", valign: "middle", cellPadding: { top: 3, bottom: 3, left: 2, right: 2 }, font: FONT },
    columnStyles: colStyles,
    margin: { left: MARGIN, right: MARGIN },
  });
}

// 학급 학생 목록 → 단일 jsPDF (학생 1명당 1페이지)
function generateClassTimetablePDF(classStudents, schoolName, planName, days, periods, waitingRoomMap) {
  const doc = newDoc();
  classStudents.forEach((student, i) => {
    if (i > 0) {
      doc.addPage();
      try { doc.setFont("NotoSansKR", "normal"); } catch { doc.setFont("helvetica"); }
    }
    drawStudentTimetablePage(doc, student, schoolName, planName, days, periods, waitingRoomMap);
  });
  return doc;
}

/**
 * 학급별 통합 PDF를 학년 폴더로 묶은 ZIP Blob 생성
 * @param {object[]} studentTimetables  generateStudentTimetables() 반환값
 * @param {string}   schoolName
 * @param {string}   planName
 * @param {Function} onProgress         (done, total) 콜백
 * @returns {Promise<Blob>}
 */
export async function generateStudentTimetablesPDFZip(
  studentTimetables, schoolName, planName, plan, rooms, onProgress,
) {
  const { default: JSZip } = await import("jszip");
  const zip     = new JSZip();
  const days    = plan?.days    ?? [];
  const periods = plan?.periods ?? [];

  // 대기실 조회맵: "dayId__periodId" → { "grade-classNo": roomName }
  const waitingRoomMap = {};
  const waitingAssignments = plan?.waitingAssignments ?? {};
  for (const [periodKey, roomAssign] of Object.entries(waitingAssignments)) {
    const cellMap = {};
    for (const [roomId, classKeys] of Object.entries(roomAssign)) {
      const room = rooms?.find((r) => r.id === roomId);
      const roomName = room?.name ?? "대기실";
      for (const ck of (classKeys ?? [])) {
        cellMap[ck] = roomName;
      }
    }
    waitingRoomMap[periodKey] = cellMap;
  }

  // 학년 → 반 → 학생[] 그룹핑
  const byGradeClass = {};
  for (const s of studentTimetables) {
    const g = String(s.grade);
    const c = String(s.classNo);
    if (!byGradeClass[g])    byGradeClass[g]    = {};
    if (!byGradeClass[g][c]) byGradeClass[g][c] = [];
    byGradeClass[g][c].push(s);
  }

  const grades = Object.keys(byGradeClass).sort();
  const total  = grades.reduce((acc, g) => acc + Object.keys(byGradeClass[g]).length, 0);
  let done = 0;

  for (const grade of grades) {
    const folder  = zip.folder(`${grade}학년`);
    const classes = Object.keys(byGradeClass[grade]).sort((a, b) => Number(a) - Number(b));

    for (const classNo of classes) {
      const classStudents = byGradeClass[grade][classNo];
      const doc  = generateClassTimetablePDF(classStudents, schoolName, planName, days, periods, waitingRoomMap);
      const blob = doc.output("arraybuffer");
      folder.file(`${grade}학년_${classNo}반.pdf`, blob);

      done++;
      onProgress?.(done, total);
      await new Promise((r) => setTimeout(r, 20));
    }
  }

  return zip.generateAsync({ type: "blob" });
}
