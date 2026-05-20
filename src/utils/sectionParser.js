import * as XLSX from "xlsx";

function buildStudentId(grade, classNo, number) {
  return `${grade}${String(classNo).padStart(2, "0")}${String(number).padStart(2, "0")}`;
}

function detectFormat(rows) {
  if (!rows || rows.length < 2) return "unknown";
  const row0 = rows[0];
  // 3행 헤더: row0[5]에 "학기" 포함 (삼성고 등)
  if (rows.length >= 3 && String(row0[5] ?? "").includes("학기")) return "samsung";
  // 1행 헤더: row0[0]==="학년"으로 시작하면 generic (계정 열 유무 무관)
  if (String(row0[0] ?? "").trim() === "학년") return "generic";
  return "unknown";
}

function parseSamsungFormat(rows) {
  // Row 0: 학기 정보, Row 1: 지정/선택, Row 2: 과목명, Row 3+: 학생 데이터
  const typeRow = rows[1];
  const nameRow = rows[2];

  const subjectCols = [];
  for (let col = 5; col < nameRow.length; col++) {
    const name = String(nameRow[col] ?? "").trim();
    const type = String(typeRow[col] ?? "").trim();
    if (name) {
      subjectCols.push({ col, name, isElective: type === "선택" });
    }
  }

  const students = [];
  const enrollments = [];

  for (let r = 3; r < rows.length; r++) {
    const row = rows[r];
    const gradeRaw = row[0];
    if (gradeRaw === "" || gradeRaw === null || gradeRaw === undefined) continue;
    if (isNaN(Number(gradeRaw))) continue; // 합계 등 요약 행 건너뜀

    const grade = Number(gradeRaw);
    const classNo = Number(row[1]);
    const number = Number(row[2]);
    const name = String(row[3] ?? "").trim();
    const gender = String(row[4] ?? "").trim();
    if (!name || !classNo || !number) continue;

    const studentId = buildStudentId(grade, classNo, number);
    students.push({ id: studentId, grade, classNo, number, name, gender });

    for (const { col, name: subjectName, isElective } of subjectCols) {
      if (!isElective) continue; // 지정과목 스킵 (학년 전체 응시, 분반 없음)
      const val = row[col];
      if (val === undefined || val === null || val === "") continue;
      const strVal = String(val).trim().toUpperCase();
      if (/^[A-E]$/.test(strVal)) {
        enrollments.push({ studentId, subjectName, grade, section: strVal });
      }
    }
  }

  return { students, enrollments };
}

function parseGenericFormat(rows) {
  // Row 0: 헤더 ["학년","반","번호","이름","성별",(계정?), "과목1",...]
  // Row 1+: 데이터
  // col 5에 "계정"이 포함된 경우 과목은 col 6부터, 아니면 col 5부터
  const headerRow = rows[0];
  const subjectStartCol = String(headerRow[5] ?? "").includes("계정") ? 6 : 5;
  const subjectCols = [];
  for (let col = subjectStartCol; col < headerRow.length; col++) {
    const name = String(headerRow[col] ?? "").trim();
    if (name) subjectCols.push({ col, name });
  }

  const students = [];
  const enrollments = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const gradeRaw = row[0];
    if (gradeRaw === "" || gradeRaw === null || gradeRaw === undefined) continue;
    if (isNaN(Number(gradeRaw))) continue;

    const grade = Number(gradeRaw);
    const classNo = Number(row[1]);
    const number = Number(row[2]);
    const name = String(row[3] ?? "").trim();
    const gender = String(row[4] ?? "").trim();
    if (!name || !classNo || !number) continue;

    const studentId = buildStudentId(grade, classNo, number);
    students.push({ id: studentId, grade, classNo, number, name, gender });

    for (const { col, name: subjectName } of subjectCols) {
      const val = row[col];
      if (val === undefined || val === null || val === "") continue;
      const strVal = String(val).trim().toUpperCase();
      if (/^[A-E]$/.test(strVal)) {
        enrollments.push({ studentId, subjectName, grade, section: strVal });
      }
    }
  }

  return { students, enrollments };
}

/**
 * 이미 파싱된 workbook을 받아 분반 데이터를 추출 — 여러 시트 지원
 * @param {import("xlsx").WorkBook} wb
 * @returns {{ format: string, students: object[], enrollments: object[], sectionsByGrade: object }}
 */
export function parseSectionWorkbook(wb) {

  const studentMap = new Map(); // studentId → student (중복 제거)
  const enrollmentMap = new Map(); // `${studentId}__${subjectName}` → enrollment (중복 제거)
  const detectedFormats = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

    const format = detectFormat(rows);
    if (format === "unknown") continue; // 파싱 불가 시트는 건너뜀

    detectedFormats.push(format);
    const parsed = format === "samsung" ? parseSamsungFormat(rows) : parseGenericFormat(rows);

    for (const student of parsed.students) {
      studentMap.set(student.id, student);
    }
    for (const e of parsed.enrollments) {
      const key = `${e.studentId}__${e.subjectName}`;
      enrollmentMap.set(key, e); // 같은 학생+과목 조합이면 나중 시트가 덮어씀
    }
  }

  if (studentMap.size === 0) {
    throw new Error(
      "파싱 가능한 시트가 없습니다.\n1행 헤더(학년·반·번호·이름·성별·과목…) 또는 3행 헤더 형식이어야 합니다.",
    );
  }

  const students = [...studentMap.values()];
  const enrollments = [...enrollmentMap.values()];

  // 형식 레이블: 시트가 복수이고 형식이 섞이면 "혼합"
  const uniqueFormats = [...new Set(detectedFormats)];
  const format = uniqueFormats.length > 1 ? "mixed" : (uniqueFormats[0] ?? "generic");

  // 미리보기용: grade → subjectName → section → count
  const sectionsByGrade = {};
  for (const e of enrollments) {
    if (!e.section) continue;
    const g = String(e.grade);
    if (!sectionsByGrade[g]) sectionsByGrade[g] = {};
    if (!sectionsByGrade[g][e.subjectName]) sectionsByGrade[g][e.subjectName] = {};
    sectionsByGrade[g][e.subjectName][e.section] =
      (sectionsByGrade[g][e.subjectName][e.section] ?? 0) + 1;
  }

  return { format, students, enrollments, sectionsByGrade };
}

/**
 * 분반 파일 파싱 메인 함수 — 여러 시트 지원
 * @param {ArrayBuffer} buffer
 * @returns {{ format: string, students: object[], enrollments: object[], sectionsByGrade: object }}
 */
export function parseSectionFile(buffer) {
  const wb = XLSX.read(buffer, { type: "array" });
  return parseSectionWorkbook(wb);
}
