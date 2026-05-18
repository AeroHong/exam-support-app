// 브라우저 인쇄용 HTML 생성 — 고사실별 응시 현황표 / 과목별 응시자 명렬
//
// openPrintWindow(html): 새 탭을 열고 window.print() 호출

function makeStudentId(s) {
  return `${s.grade}${String(s.classNo).padStart(2, "0")}${String(s.number).padStart(2, "0")}`;
}
function specialLabel(s) {
  return `${makeStudentId(s)} ${s.name} (${s.gender || "남"})`;
}

const BASE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: '맑은 고딕', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; font-size: 10pt; }
  .page { padding: 12mm 15mm; page-break-after: always; }
  .page:last-child { page-break-after: avoid; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { border: 1px solid #000; padding: 3px 6px; text-align: center; font-size: 9pt; vertical-align: middle; }
  th { background: #ddd; font-weight: bold; }
  td.left { text-align: left; }
  .title { text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 5px; }
  .subtitle { text-align: center; font-size: 9pt; margin-bottom: 8px; }
  .meta { font-size: 9pt; margin-bottom: 3px; }
  .sign { margin-top: 14px; font-size: 9pt; }
  .dim { color: #888; }
  @media print { @page { margin: 8mm; } }
`;

function wrap(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="UTF-8">
<title>응시 현황표</title>
<style>${BASE_CSS}</style>
</head><body>
${bodyHtml}
</body></html>`;
}

export function openPrintWindow(html) {
  const win = window.open("", "_blank");
  if (!win) {
    alert("팝업이 차단되었습니다. 팝업 허용 후 다시 시도하세요.");
    return;
  }
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

// ─── 고사실별 응시 현황표 ──────────────────────────────────────────────────────

function roomPage(roster, rg) {
  const { subjectName, subjectCode, dayLabel, periodLabel, startTime, endTime } = roster;
  const subjectCell = `${subjectName}${subjectCode ? `(${subjectCode})` : ""}`;
  const seated = rg.students;
  const sp = rg.specialInRoom || [];
  const sep = rg.separateInRoom || [];
  const total = seated.length + sp.length + sep.length;
  const rowCount = Math.max(seated.length, sp.length, sep.length, 1);

  let rows = "";
  for (let i = 0; i < rowCount; i++) {
    const st = seated[i];
    const spSt = sp[i];
    const sepSt = sep[i];
    rows += `<tr>
      <td>${st ? st.seatNumber : ""}</td>
      <td>${st ? makeStudentId(st) : ""}</td>
      <td class="left">${st ? st.name : ""}</td>
      <td>${st ? (st.gender || "") : ""}</td>
      <td>□</td>
      <td style="border:none"></td>
      <td class="left">${spSt ? specialLabel(spSt) : ""}</td>
      <td class="left">${sepSt ? specialLabel(sepSt) : ""}</td>
    </tr>`;
  }

  return `<div class="page">
  <div class="title">${rg.roomName}  ${subjectName}  응시현황표</div>
  <div class="meta">고사일: ${dayLabel}&nbsp;&nbsp;&nbsp;교시: ${periodLabel} (${startTime}~${endTime})</div>
  <div class="meta">고사실: ${rg.roomName}&nbsp;&nbsp;&nbsp;과목: ${subjectCell}</div>
  <div class="meta">재적 ${total}명&nbsp;&nbsp;응시 ${seated.length}명&nbsp;&nbsp;도움실 ${sp.length}명&nbsp;&nbsp;별도실 ${sep.length}명</div>
  <table>
    <thead><tr>
      <th style="width:8%">좌석번호</th>
      <th style="width:10%">학번</th>
      <th style="width:15%">이름</th>
      <th style="width:6%">성별</th>
      <th style="width:8%">결시</th>
      <th style="width:2%;border:none"></th>
      <th style="width:25%">도움실 응시 학생</th>
      <th style="width:26%">별도 고사실 응시 학생</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="sign">감독관 서명: _________________________ (인)</div>
</div>`;
}

export function generateRoomRostersHTML(subjectRosters) {
  const pages = [];
  subjectRosters.forEach((roster) => {
    roster.roomGroups.forEach((rg) => pages.push(roomPage(roster, rg)));

    if (roster.specialStudents?.length) {
      const sorted = [...roster.specialStudents].sort((a, b) => {
        const cd = Number(a.classNo) - Number(b.classNo);
        return cd !== 0 ? cd : Number(a.number) - Number(b.number);
      });
      pages.push(roomPage(roster, {
        roomName: "도움실",
        students: sorted.map((s, i) => ({ ...s, seatNumber: i + 1 })),
        specialInRoom: [],
        separateInRoom: [],
      }));
    }

    if (roster.separateStudents?.length) {
      const sorted = [...roster.separateStudents].sort((a, b) => {
        const cd = Number(a.classNo) - Number(b.classNo);
        return cd !== 0 ? cd : Number(a.number) - Number(b.number);
      });
      pages.push(roomPage(roster, {
        roomName: "별도실",
        students: sorted.map((s, i) => ({ ...s, seatNumber: i + 1 })),
        specialInRoom: [],
        separateInRoom: [],
      }));
    }
  });
  return wrap(pages.join("\n"));
}

// ─── 과목별 응시자 명렬 ───────────────────────────────────────────────────────

const STATUS_LABEL = { special: "도움실", separate: "별도실", delegation: "위탁" };

function subjectPage(roster) {
  const { subjectName, subjectCode, grade, isEssay, dayLabel, periodLabel, startTime, endTime, counts, students } = roster;
  const subjectCell = `${subjectName}${subjectCode ? ` [${subjectCode}]` : ""}`;

  let rows = "";
  students.forEach((s) => {
    const isDel = s.examStatus === "delegation";
    rows += `<tr class="${isDel ? "dim" : ""}">
      <td>${s.classNo ?? ""}</td>
      <td>${s.number ?? ""}</td>
      <td class="left">${s.name || ""}</td>
      <td>${s.gender || ""}</td>
      <td>${STATUS_LABEL[s.examStatus] || "-"}</td>
      <td>${s.roomName || "-"}</td>
      <td>${s.seatNumber !== "" ? s.seatNumber : "-"}</td>
    </tr>`;
  });
  if (!rows) rows = `<tr><td colspan="7" class="dim">(수강 학생 없음)</td></tr>`;

  return `<div class="page">
  <div class="title">과목별 응시자 명렬</div>
  <div class="subtitle">${grade}학년&nbsp;&nbsp;${subjectCell}&nbsp;&nbsp;${isEssay ? "서논술형" : "선택형"}</div>
  <div class="meta">고사일: ${dayLabel}&nbsp;&nbsp;&nbsp;교시: ${periodLabel} (${startTime}~${endTime})</div>
  <div class="meta">재적 ${counts.total}명&nbsp;&nbsp;응시 ${counts.normal}명&nbsp;&nbsp;도움실 ${counts.special}명&nbsp;&nbsp;별도실 ${counts.separate}명&nbsp;&nbsp;위탁 ${counts.delegation}명</div>
  <table>
    <thead><tr>
      <th style="width:7%">반</th>
      <th style="width:7%">번호</th>
      <th style="width:18%">이름</th>
      <th style="width:7%">성별</th>
      <th style="width:12%">응시형태</th>
      <th style="width:15%">고사실</th>
      <th style="width:10%">좌석번호</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
}

export function generateSubjectRostersHTML(subjectRosters) {
  return wrap(subjectRosters.map(subjectPage).join("\n"));
}

// ─── 학급별 학생 고사 명렬표 ──────────────────────────────────────────────────

const ASSIGN_STATUS = { special: "도움실", separate: "별도실", delegation: "위탁" };

function assignCell(asgn) {
  if (!asgn) return "<td>대기</td><td></td>";
  const status = ASSIGN_STATUS[asgn.examStatus];
  if (status) return `<td class="dim">${status}</td><td class="dim"></td>`;
  if (!asgn.roomName) return "<td>-</td><td>-</td>";
  return `<td>${asgn.roomName}</td><td>${asgn.seatNumber !== "" ? asgn.seatNumber : "-"}</td>`;
}

function classPage(cls) {
  const { grade, classNo, sessions, students } = cls;
  if (!sessions.length) return "";

  const sessionHeaders = sessions
    .map((sess) => `<th colspan="2" style="font-size:7.5pt">${sess.dayLabel} ${sess.periodLabel}<br>${sess.subjectName}</th>`)
    .join("");
  const subHeaders = sessions.map(() => `<th style="width:auto">고사실</th><th style="width:auto">좌석</th>`).join("");

  const dataRows = students.map((st) => {
    const cells = sessions.map((sess) => assignCell(st.assignments.get(sess.sessionId))).join("");
    return `<tr>
      <td>${st.number}</td>
      <td class="left">${st.name}</td>
      <td>${st.gender}</td>
      ${cells}
    </tr>`;
  }).join("");

  return `<div class="page landscape">
  <div class="title">${grade}학년 ${classNo}반 학생 고사 명렬표</div>
  <table>
    <thead>
      <tr>
        <th rowspan="2" style="width:5%">번호</th>
        <th rowspan="2" style="width:10%">이름</th>
        <th rowspan="2" style="width:5%">성별</th>
        ${sessionHeaders}
      </tr>
      <tr>${subHeaders}</tr>
    </thead>
    <tbody>${dataRows}</tbody>
  </table>
</div>`;
}

export function generateClassRostersHTML(classRosters) {
  const LANDSCAPE_CSS = `
    .landscape { padding: 10mm 12mm; }
    @media print { .landscape { size: A4 landscape; } }
  `;
  const pages = classRosters.map(classPage).filter(Boolean).join("\n");
  // landscape 전용 CSS를 BASE_CSS에 추가
  const html = wrap(pages).replace("</style>", LANDSCAPE_CSS + "</style>");
  return html;
}

// ─── 대기실 학생 명렬표 ────────────────────────────────────────────────────────

function waitingPage(period) {
  const { dayLabel, periodLabel, startTime, endTime, classes } = period;
  if (!classes.length) return "";

  const totalWaiting = classes.reduce((n, c) => n + c.students.length, 0);

  // 학급별 테이블을 2열 그리드로
  const classTables = classes.map((cls) => {
    const rows = cls.students
      .map((s) => `<tr><td style="width:14%">${s.number}</td><td style="width:50%;text-align:left">${s.name}</td><td style="width:14%">${s.gender}</td></tr>`)
      .join("");
    return `<div class="class-block">
  <div class="class-title">${cls.grade}학년 ${cls.classNo}반 (${cls.students.length}명)</div>
  <table>
    <thead><tr><th>번호</th><th>이름</th><th>성별</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
  }).join("");

  return `<div class="page">
  <div class="title">${dayLabel} ${periodLabel} 대기실 학생 명렬표</div>
  <div class="meta">고사 시간: ${startTime}~${endTime}&nbsp;&nbsp;&nbsp;대기 학생 합계: ${totalWaiting}명</div>
  <div class="class-grid">${classTables}</div>
</div>`;
}

export function generateWaitingRostersHTML(waitingRosters) {
  const WAITING_CSS = `
    .class-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }
    .class-block { break-inside: avoid; }
    .class-title { font-size: 8.5pt; font-weight: bold; background: #eee; padding: 2px 4px; margin-bottom: 2px; }
    .class-block table { margin-top: 0; }
    .class-block th, .class-block td { font-size: 8pt; padding: 2px 4px; }
  `;
  const pages = waitingRosters.map(waitingPage).filter(Boolean).join("\n");
  return wrap(pages).replace("</style>", WAITING_CSS + "</style>");
}

// ─── 학생 개인별 시간표 ────────────────────────────────────────────────────────
// A4 portrait, 4장(2×2) per 페이지

function studentCard(student, schoolName) {
  const { grade, classNo, number, name, exams } = student;
  const examRows = exams.map((e) => {
    const statusLabel = e.examStatus === "special"   ? "(도움실)" :
                        e.examStatus === "separate"  ? "(별도실)" : "";
    const roomCell = e.roomName
      ? `${e.roomName}${e.seatNumber !== "" ? ` ${e.seatNumber}번` : ""} ${statusLabel}`
      : statusLabel || "미배정";
    return `<tr>
      <td>${e.dayLabel}</td>
      <td>${e.periodLabel}</td>
      <td style="font-size:7.5pt;text-align:left">${e.subjectName}</td>
      <td style="text-align:left;font-size:7.5pt">${roomCell}</td>
    </tr>`;
  }).join("");

  const noExam = exams.length === 0
    ? `<tr><td colspan="4" style="color:#aaa;text-align:center">응시 과목 없음</td></tr>` : "";

  return `<div class="s-card">
  <div class="s-header">
    <span class="s-name">${name}</span>
    <span class="s-info">${grade}학년 ${classNo}반 ${number}번</span>
  </div>
  <div class="s-school">${schoolName}</div>
  <table class="s-table">
    <thead><tr><th>날짜</th><th>교시</th><th>과목</th><th>고사실/좌석</th></tr></thead>
    <tbody>${examRows}${noExam}</tbody>
  </table>
</div>`;
}

export function generateStudentTimetablesHTML(studentTimetables, schoolName = "") {
  const TIMETABLE_CSS = `
    .s-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
    .s-card { border: 1.5px solid #333; border-radius: 3px; padding: 4mm 5mm; break-inside: avoid; }
    .s-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1mm; }
    .s-name { font-size: 13pt; font-weight: bold; }
    .s-info { font-size: 9pt; color: #555; }
    .s-school { font-size: 8pt; color: #888; margin-bottom: 3mm; }
    .s-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
    .s-table th, .s-table td { border: 1px solid #aaa; padding: 2px 4px; text-align: center; vertical-align: middle; }
    .s-table th { background: #eee; font-size: 8pt; }
    @media print { @page { size: A4 portrait; margin: 10mm; } }
  `;

  // 4장씩 그룹핑
  const pages = [];
  for (let i = 0; i < studentTimetables.length; i += 4) {
    const group = studentTimetables.slice(i, i + 4);
    const cards = group.map((s) => studentCard(s, schoolName)).join("\n");
    pages.push(`<div class="page" style="padding:8mm"><div class="s-grid">${cards}</div></div>`);
  }

  return wrap(pages.join("\n")).replace("</style>", TIMETABLE_CSS + "</style>");
}
