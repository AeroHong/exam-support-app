// ─────────────────────────────────────────────────────────────────────────────
// PDF 출력물 생성 (jsPDF 4.x + jsPDF-autotable 5.x)
//
// ⚠ jsPDF 4.x: autoTable(doc, opts) 함수 방식 → doc.autoTable(opts) 메서드 방식으로 변경
//   → import 시 jsPDF.prototype에 autoTable 자동 등록됨
// ⚠ widths 오류 방지: 모든 columnStyles에 cellWidth 명시 (자동 너비 계산 우회)
// ⚠ 한글 폰트: NotoSansKR 임베딩 시도, 실패 시 helvetica fallback (인쇄용 제한 있음)
// ─────────────────────────────────────────────────────────────────────────────

import jsPDF from "jspdf";
import "jspdf-autotable"; // doc.autoTable() 메서드 등록용 side-effect import
import { notoSansKR } from "./notoSansKR";

let koreanFontLoaded = false;

function setupKoreanFont(doc) {
  try {
    doc.addFileToVFS("NotoSansKR.ttf", notoSansKR);
    doc.addFont("NotoSansKR.ttf", "NotoSansKR", "normal");
    doc.setFont("NotoSansKR", "normal");
    koreanFontLoaded = true;
    return true;
  } catch {
    koreanFontLoaded = false;
    doc.setFont("helvetica");
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
    doc.autoTable({
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
    return doc.lastAutoTable?.finalY ?? startY + 20;
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
