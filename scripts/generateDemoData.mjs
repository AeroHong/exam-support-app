/**
 * 선유고 학생 데이터를 읽어 개인정보를 익명화한 데모 데이터 생성
 * 실행: node scripts/generateDemoData.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS = join(__dirname, "..", "docs");
const OUT = join(__dirname, "..", "src", "data", "demoData.js");

// ── 랜덤 이름 생성용 ────────────────────────────────────────────
const SURNAMES = [
  "김","이","박","정","최","조","강","윤","장","임","한","오","서","신","권",
  "황","안","송","류","전","홍","고","문","양","손","배","백","허","유","남",
  "심","노","하","곽","성","차","주","우","구","민","진","나","변","엄","원",
];
const GIVEN_MALE = [
  "민준","서준","도윤","예준","시우","하준","주원","지호","지훈","준서",
  "건우","현우","승현","도현","수호","유준","태윤","정우","민재","우진",
  "재윤","한결","지원","승우","현준","은호","준혁","민성","시윤","동현",
];
const GIVEN_FEMALE = [
  "서연","서윤","지우","서현","하은","하윤","민서","지유","윤서","채원",
  "수아","지아","은서","다은","예은","수빈","지윤","소율","예린","나윤",
  "수현","하린","시은","유진","채은","예서","소연","다인","지민","하영",
];

let nameCounter = 0;
function randomName(gender) {
  nameCounter++;
  const surname = SURNAMES[nameCounter % SURNAMES.length];
  const pool = gender === "남" ? GIVEN_MALE : GIVEN_FEMALE;
  const given = pool[Math.floor(Math.random() * pool.length)];
  return surname + given;
}

function randomGender() {
  return Math.random() < 0.5 ? "남" : "여";
}

// ── 1학년 CSV 읽기 ───────────────────────────────────────────────
function readGrade1() {
  const wb = XLSX.readFile(join(DOCS, "2026학년도 1학년 전체명렬(05.11 업데이트) - 시트2.csv"));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
  const students = [];
  for (let i = 1; i < rows.length; i++) {
    const [grade, classNo, number, , gender, , ] = rows[i];
    if (!grade || !classNo || !number) continue;
    const g = gender === "남" || gender === "여" ? gender : randomGender();
    const name = randomName(g);
    students.push({
      grade: Number(grade),
      classNo: Number(classNo),
      number: Number(number),
      name,
      gender: g,
      email: `demo${grade}${String(classNo).padStart(2,"0")}${String(number).padStart(2,"0")}@demo.school.kr`,
      electiveSubjects: [],
    });
  }
  return students;
}

// ── 2·3학년 XLSX 읽기 (시트별 반) ────────────────────────────────
function readGradeMultiSheet(filename, grade) {
  const wb = XLSX.readFile(join(DOCS, filename));
  const students = [];
  const enrollments = [];

  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const [g, classNo, number, , email, ...electiveCols] = row;
      if (!g || !classNo || !number) continue;

      const gender = randomGender();
      const name = randomName(gender);
      const studentId = `demo-${grade}-${classNo}-${number}`;

      students.push({
        id: studentId,
        grade: Number(g),
        classNo: Number(classNo),
        number: Number(number),
        name,
        gender,
        email: `demo${grade}${String(classNo).padStart(2,"0")}${String(number).padStart(2,"0")}@demo.school.kr`,
        electiveSubjects: electiveCols.filter(Boolean).map(s => String(s).replace(/_[A-Z]$/, "")),
      });

      // enrollment 생성
      for (const col of electiveCols) {
        if (!col) continue;
        const subjectName = String(col).replace(/_[A-Z0-9]$/, "");
        enrollments.push({
          studentId,
          subjectName,
          grade: Number(g),
        });
      }
    }
  }

  return { students, enrollments };
}

// ── 1학년용 ID 부여 ─────────────────────────────────────────────
function assignIds(students) {
  return students.map(s => ({
    ...s,
    id: `demo-${s.grade}-${s.classNo}-${s.number}`,
  }));
}

// ── 고사실 데이터 생성 (선유고 기준 7반 구조) ────────────────────
function generateRooms() {
  const rooms = [];
  for (const grade of [1, 2, 3]) {
    for (let c = 1; c <= 7; c++) {
      rooms.push({
        id: `room-${grade}-${c}`,
        name: `${grade}-${c}반`,
        capacity: 32,
        roomType: "class",
      });
    }
  }
  // 추가 고사실
  rooms.push({ id: "room-extra-1", name: "시청각실", capacity: 60, roomType: "extra" });
  rooms.push({ id: "room-extra-2", name: "도서실", capacity: 40, roomType: "extra" });
  rooms.push({ id: "room-special", name: "도움실", capacity: 10, roomType: "extra" });
  return rooms;
}

// ── 과목 데이터 생성 ─────────────────────────────────────────────
function generateSubjects(enrollments) {
  // enrollment에서 고유 과목 추출
  const subjectSet = new Map();
  for (const e of enrollments) {
    const key = `${e.subjectName}__${e.grade}`;
    if (!subjectSet.has(key)) {
      subjectSet.set(key, { name: e.subjectName, grade: e.grade, count: 0 });
    }
    subjectSet.get(key).count++;
  }

  const subjects = [];
  let idx = 0;

  // 학교지정 과목 (학년별 공통)
  const required = [
    { name: "국어", grades: [1, 2, 3] },
    { name: "수학", grades: [1, 2, 3] },
    { name: "영어", grades: [1, 2, 3] },
    { name: "한국사", grades: [1, 2] },
    { name: "통합사회", grades: [1] },
    { name: "통합과학", grades: [1] },
  ];
  for (const r of required) {
    for (const g of r.grades) {
      subjects.push({
        id: `subj-req-${idx++}`,
        name: r.name,
        grade: g,
        courseType: "school",
        category: "학교지정",
        entryYear: 2026 - g + 1,
        credits: 3,
      });
    }
  }

  // 선택 과목 (enrollment 기반)
  for (const [, info] of subjectSet) {
    subjects.push({
      id: `subj-elec-${idx++}`,
      name: info.name,
      grade: info.grade,
      courseType: "student",
      category: "학생선택",
      entryYear: 2026 - info.grade + 1,
      credits: 3,
    });
  }

  return subjects;
}

// ── 메인 ─────────────────────────────────────────────────────────
const grade1 = assignIds(readGrade1());
const grade2 = readGradeMultiSheet("[학급별 명렬표] 2학년 1학기 (2026. 5. 14.) (1).xlsx", 2);
const grade3 = readGradeMultiSheet("[학급별 명렬표] 3학년 (2026. 5. 14.) (1).xlsx", 3);

const allStudents = [...grade1, ...grade2.students, ...grade3.students];
const allEnrollments = [...grade2.enrollments, ...grade3.enrollments];
const rooms = generateRooms();
const subjects = generateSubjects(allEnrollments);

const output = `// 자동 생성된 데모 데이터 — scripts/generateDemoData.mjs
// 개인정보가 익명화된 가상 데이터입니다.

export const DEMO_SCHOOL = {
  id: "demo-school",
  name: "한빛고등학교",
  domain: "demo.school.kr",
};

export const DEMO_STUDENTS = ${JSON.stringify(allStudents, null, 2)};

export const DEMO_ENROLLMENTS = ${JSON.stringify(allEnrollments, null, 2)};

export const DEMO_ROOMS = ${JSON.stringify(rooms, null, 2)};

export const DEMO_SUBJECTS = ${JSON.stringify(subjects, null, 2)};
`;

writeFileSync(OUT, output, "utf-8");

console.log(`Generated demo data:`);
console.log(`  Students:    ${allStudents.length}`);
console.log(`  Enrollments: ${allEnrollments.length}`);
console.log(`  Rooms:       ${rooms.length}`);
console.log(`  Subjects:    ${subjects.length}`);
console.log(`  Output:      ${OUT}`);
