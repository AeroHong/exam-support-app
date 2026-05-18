/**
 * docs 폴더의 학생 명렬 파일에서 개인정보(이름, 이메일)를 익명화
 * 실행: node scripts/anonymizeDocs.mjs
 */
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS = join(__dirname, "..", "docs");

// ── 랜덤 이름 생성 ────────────────────────────────────────────────
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

let counter = 0;
function randomName(gender) {
  counter++;
  const surname = SURNAMES[counter % SURNAMES.length];
  const given = gender === "남"
    ? GIVEN_MALE[counter % GIVEN_MALE.length]
    : GIVEN_FEMALE[counter % GIVEN_FEMALE.length];
  return surname + given;
}

// ── 1학년 CSV ─────────────────────────────────────────────────────
// 컬럼: 학년(0) 반(1) 번호(2) 이름(3) 성별(4) ...
function anonymizeGrade1() {
  const file = join(DOCS, "2026학년도 1학년 전체명렬(05.11 업데이트) - 시트2.csv");
  const wb = XLSX.readFile(file);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] || !row[1] || !row[2]) continue;
    const gender = row[4] === "남" || row[4] === "여" ? row[4] : "남";
    row[3] = randomName(gender); // 이름 교체
    // 이메일 컬럼이 있으면 교체
    for (let c = 5; c < row.length; c++) {
      const val = String(row[c] ?? "");
      if (val.includes("@")) {
        const [grade, cls, num] = [row[0], row[1], row[2]];
        row[c] = `demo${grade}${String(cls).padStart(2,"0")}${String(num).padStart(2,"0")}@demo.school.kr`;
      }
    }
  }

  const newWs = XLSX.utils.aoa_to_sheet(rows);
  const newWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(newWb, newWs, wb.SheetNames[0]);
  XLSX.writeFile(newWb, file);
  console.log(`✓ 1학년 CSV 익명화 완료 (${rows.length - 1}명)`);
}

// ── 2·3학년 XLSX ──────────────────────────────────────────────────
// 컬럼: 학년(0) 반(1) 번호(2) 이름(3) 이메일(4) 과목...(5+)
function anonymizeGradeXlsx(filename, grade) {
  const file = join(DOCS, filename);
  const wb = XLSX.readFile(file);
  let totalStudents = 0;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0] || !row[1] || !row[2]) continue;
      const [g, cls, num] = [row[0], row[1], row[2]];
      row[3] = randomName(Math.random() < 0.5 ? "남" : "여"); // 이름
      row[4] = `demo${g}${String(cls).padStart(2,"0")}${String(num).padStart(2,"0")}@demo.school.kr`; // 이메일
      totalStudents++;
    }

    wb.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(rows);
  }

  XLSX.writeFile(wb, file);
  console.log(`✓ ${grade}학년 XLSX 익명화 완료 (${totalStudents}명)`);
}

// ── 실행 ──────────────────────────────────────────────────────────
anonymizeGrade1();
anonymizeGradeXlsx("[학급별 명렬표] 2학년 1학기 (2026. 5. 14.).xlsx", 2);
anonymizeGradeXlsx("[학급별 명렬표] 3학년 (2026. 5. 14.).xlsx", 3);
console.log("완료!");
