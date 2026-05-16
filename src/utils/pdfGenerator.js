// ─────────────────────────────────────────────────────────────────────────────
// PDF 생성 유틸리티 (jsPDF + autotable)
// ─────────────────────────────────────────────────────────────────────────────

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { notoSansKR } from "./notoSansKR";

// 한글 폰트 설정 함수
function setupKoreanFont(doc) {
  try {
    // VFS에 폰트 파일 추가
    doc.addFileToVFS("NotoSansKR.ttf", notoSansKR);
    // 폰트 등록
    doc.addFont("NotoSansKR.ttf", "NotoSansKR", "normal");
    // 기본 폰트로 설정
    doc.setFont("NotoSansKR");
    console.log("[PDF] Korean font loaded successfully");
  } catch (err) {
    console.error("[PDF] Failed to load Korean font:", err);
    doc.setFont("helvetica"); // fallback
  }
  return doc;
}

/**
 * 고사실별 응시 현황표 PDF 생성
 * @param {Object} roster - 고사실별 현황표 데이터 (roomRosterGenerator 출력)
 * @param {string} schoolName - 학교명
 * @returns {jsPDF} PDF 문서 객체
 */
export function generateRoomRosterPDF(roster, schoolName = "OO고등학교") {
  console.log("[PDF] Generating roster for:", roster.roomName, "Students:", roster.students?.length);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // 한글 폰트 설정
  setupKoreanFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 15;

  // 제목
  doc.setFontSize(18);
  doc.text("고사실별 응시 현황표", pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  doc.setFontSize(10);
  doc.text(schoolName, pageWidth / 2, yPos, { align: "center" });
  yPos += 12;

  // 고사 정보
  doc.setFontSize(11);
  doc.text(`고사일: ${roster.examDate}`, 15, yPos);
  yPos += 6;
  doc.text(
    `교시: ${roster.period} (${roster.startTime} - ${roster.endTime})`,
    15,
    yPos
  );
  yPos += 6;
  doc.text(`고사실: ${roster.roomName}`, 15, yPos);
  yPos += 6;
  doc.text(
    `과목: ${roster.subjectName}${roster.subjectCode ? ` [${roster.subjectCode}]` : ""}`,
    15,
    yPos
  );
  doc.text(`형태: ${roster.isEssay ? "서논술형" : "선택형"}`, 100, yPos);
  yPos += 10;

  // 인원 통계
  doc.setFontSize(10);
  doc.text(`재적인원: ${roster.totalCount}명`, 15, yPos);
  doc.text(
    `(응시 ${roster.attendCount} + 도움실 ${roster.specialCount} + 별도실 ${roster.separateCount})`,
    50,
    yPos
  );
  yPos += 5;
  doc.text(`응시인원: ${roster.attendCount}명`, 15, yPos);
  if (roster.specialCount > 0) {
    doc.text(`도움실: ${roster.specialCount}명`, 60, yPos);
  }
  if (roster.separateCount > 0) {
    doc.text(`별도실: ${roster.separateCount}명`, 95, yPos);
  }
  yPos += 8;

  // 학생 목록 테이블
  const tableData = (roster.students || []).map((s) => [
    s.seatNumber || "",
    s.studentId || "",
    s.name || "",
    s.gender || "",
    "", // 결시 체크박스 (빈칸)
  ]);

  console.log("[PDF] Table data rows:", tableData.length);

  autoTable(doc, {
    startY: yPos,
    head: [["좌석", "학번", "이름", "성별", "결시"]],
    body: tableData,
    theme: "grid",
    styles: {
      font: "NotoSansKR",
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontSize: 10,
      halign: "center",
      font: "NotoSansKR",
    },
    bodyStyles: {
      fontSize: 9,
      halign: "center",
      font: "NotoSansKR",
    },
    columnStyles: {
      0: { cellWidth: 15 }, // 좌석
      1: { cellWidth: 25 }, // 학번
      2: { cellWidth: 30 }, // 이름
      3: { cellWidth: 15 }, // 성별
      4: { cellWidth: 15 }, // 결시
    },
    margin: { left: 15, right: 15 },
  });

  yPos = doc.lastAutoTable.finalY + 8;

  // 도움실 응시 학생
  if (roster.specialStudents.length > 0) {
    doc.setFontSize(10);
    doc.text("도움실 응시:", 15, yPos);
    const specialText = roster.specialStudents
      .map((s) => `${s.studentId} ${s.name}`)
      .join(", ");
    doc.setFontSize(9);
    doc.text(specialText, 40, yPos);
    yPos += 6;
  }

  // 별도실 응시 학생
  if (roster.separateStudents.length > 0) {
    doc.setFontSize(10);
    doc.text("별도실 응시:", 15, yPos);
    const separateText = roster.separateStudents
      .map((s) => `${s.studentId} ${s.name}`)
      .join(", ");
    doc.setFontSize(9);
    doc.text(separateText, 40, yPos);
    yPos += 6;
  }

  // 감독관 서명란
  yPos += 10;
  doc.setFontSize(10);
  doc.text("감독관 서명:", 15, yPos);
  doc.text("______________________ (인)", 50, yPos);

  return doc;
}

/**
 * 여러 고사실 현황표를 하나의 PDF로 생성
 * @param {Array} rosters - 고사실별 현황표 배열
 * @param {string} schoolName - 학교명
 * @returns {jsPDF} PDF 문서 객체
 */
export function generateMultipleRoomRostersPDF(rosters, schoolName = "OO고등학교") {
  if (rosters.length === 0) return null;

  console.log(`[PDF Multi] Generating ${rosters.length} rosters`);

  let doc = null;

  rosters.forEach((roster, index) => {
    if (index === 0) {
      doc = generateRoomRosterPDF(roster, schoolName);
    } else {
      doc.addPage();

      // 새 페이지에도 한글 폰트 적용 (폰트는 이미 VFS에 있으므로 setFont만 호출)
      doc.setFont("NotoSansKR");

      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 15;

      doc.setFontSize(18);
      doc.text("고사실별 응시 현황표", pageWidth / 2, yPos, { align: "center" });
      yPos += 10;

      doc.setFontSize(10);
      doc.text(schoolName, pageWidth / 2, yPos, { align: "center" });
      yPos += 12;

      doc.setFontSize(11);
      doc.text(`고사일: ${roster.examDate}`, 15, yPos);
      yPos += 6;
      doc.text(
        `교시: ${roster.period} (${roster.startTime} - ${roster.endTime})`,
        15,
        yPos
      );
      yPos += 6;
      doc.text(`고사실: ${roster.roomName}`, 15, yPos);
      yPos += 6;
      doc.text(
        `과목: ${roster.subjectName}${roster.subjectCode ? ` [${roster.subjectCode}]` : ""}`,
        15,
        yPos
      );
      doc.text(`형태: ${roster.isEssay ? "서논술형" : "선택형"}`, 100, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.text(`재적인원: ${roster.totalCount}명`, 15, yPos);
      doc.text(
        `(응시 ${roster.attendCount} + 도움실 ${roster.specialCount} + 별도실 ${roster.separateCount})`,
        50,
        yPos
      );
      yPos += 5;
      doc.text(`응시인원: ${roster.attendCount}명`, 15, yPos);
      if (roster.specialCount > 0) {
        doc.text(`도움실: ${roster.specialCount}명`, 60, yPos);
      }
      if (roster.separateCount > 0) {
        doc.text(`별도실: ${roster.separateCount}명`, 95, yPos);
      }
      yPos += 8;

      const tableData = (roster.students || []).map((s) => [
        s.seatNumber || "",
        s.studentId || "",
        s.name || "",
        s.gender || "",
        "",
      ]);

      console.log(`[PDF Multi] Page ${index + 1} table rows:`, tableData.length);

      autoTable(doc, {
        startY: yPos,
        head: [["좌석", "학번", "이름", "성별", "결시"]],
        body: tableData,
        theme: "grid",
        styles: {
          font: "NotoSansKR",
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontSize: 10,
          halign: "center",
          font: "NotoSansKR",
        },
        bodyStyles: {
          fontSize: 9,
          halign: "center",
          font: "NotoSansKR",
        },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 25 },
          2: { cellWidth: 30 },
          3: { cellWidth: 15 },
          4: { cellWidth: 15 },
        },
        margin: { left: 15, right: 15 },
      });

      yPos = doc.lastAutoTable.finalY + 8;

      if (roster.specialStudents.length > 0) {
        doc.setFontSize(10);
        doc.text("도움실 응시:", 15, yPos);
        const specialText = roster.specialStudents
          .map((s) => `${s.studentId} ${s.name}`)
          .join(", ");
        doc.setFontSize(9);
        doc.text(specialText, 40, yPos);
        yPos += 6;
      }

      if (roster.separateStudents.length > 0) {
        doc.setFontSize(10);
        doc.text("별도실 응시:", 15, yPos);
        const separateText = roster.separateStudents
          .map((s) => `${s.studentId} ${s.name}`)
          .join(", ");
        doc.setFontSize(9);
        doc.text(separateText, 40, yPos);
        yPos += 6;
      }

      yPos += 10;
      doc.setFontSize(10);
      doc.text("감독관 서명:", 15, yPos);
      doc.text("______________________ (인)", 50, yPos);
    }
  });

  return doc;
}
