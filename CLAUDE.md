# 고사업무 지원앱 — Claude Code 지침

## 프로젝트 개요

고등학교 지필고사 전 과정(과목 확정 → 일정 배치 → 고사실 배정)을 지원하는 멀티테넌트 웹앱.

### 주요 모듈

| 탭 | 컴포넌트 | 역할 |
|----|----------|------|
| 기초 데이터 | `DataManagementPage` | 학생 명렬, 고사실, 과목 관리 |
| 시험계획 | `ExamPlanPage` | 고사 기간·교시 설정, 응시 과목 확정, 세션 생성 |
| 고사실 배정 | `RoomAssignmentPage` | 응시 인원 기반 고사실 배정 |
| 일정 배치 | `ScheduleBoardPage` | 드래그·선택으로 날짜·교시 배정 |
| 개요 | `DashboardPanel` | 메트릭 요약, 충돌 경고 |

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React 19 + Vite |
| DB / 인증 / 호스팅 | Firebase (Firestore, Auth, Hosting) |
| 스타일링 | Inline Styles (`const s = { … }`) |
| 파싱 | xlsx (엑셀/CSV 업로드) |

---

## 디자인 원칙

> **모든 UI 작업은 반드시 `docs/design-guide.md`를 먼저 확인하고 그 패턴을 따를 것.**

- `StudentRosterTab`, `SubjectsTab`의 `const s = {}` 인라인 스타일 패턴이 **표준**
- `index.css`의 카드/glassmorphism 클래스(`dense-panel`, `chip`, `hero-panel` 등) **신규 사용 금지**
- 참고 프로젝트: `C:\Claude code\smart-teachers-office` (동일한 색상 토큰, 컴포넌트 패턴 공유)

---

## 에이전트 활용 가이드

| 상황 | 권장 방법 |
|------|----------|
| 파일/패턴 탐색 | Explore 에이전트 |
| 새 기능 설계 | Plan 에이전트 → 사용자 승인 후 구현 |
| UI 컴포넌트 구현 | 구현 전 `docs/design-guide.md` 패턴 확인 명시 |
| 디자인 일관성 검토 | `/simplify` skill |
| 대규모 독립 작업 병렬화 | general-purpose 에이전트 × N (background) |

---

## 코딩 컨벤션

- **스타일**: `const s = { key: { … } }` 객체 정의 → JSX에서 `style={s.key}` 사용. 전역 CSS 클래스 혼용 금지.
- **컴포넌트명**: PascalCase / **변수·함수명**: camelCase
- **Firebase 접근**: `src/lib/firebase.js`의 `firebaseDb` import
- **주석**: WHY가 자명하면 생략, 한글 허용
- **환경변수**: `import.meta.env.VITE_*` 형태, 코드에 하드코딩 금지
- **커밋**: 명시적 요청 전까지 금지

---

## Firestore 컬렉션 구조

```
schools/{schoolId}/
  students/{studentId}       — { grade, classNo, number, name, email, electiveSubjects[] }
  rooms/{roomId}             — { name, capacity }
  subjects/{subjectId}       — { name, subjectGroup, courseType, grade, entryYear, credits, … }
  enrollments/{enrollmentId} — { studentId, subjectName, grade }
  plans/{planId}/
    (plan metadata)          — { name, days[], periods[], activeFilter, status, … }
    sessions/{sessionId}     — { subjectId, subjectName, grade, dayId, periodId, startTime,
                                 duration, isEssay, isRequired, studentCount, roomIds[], … }
```

### 핵심 스키마 메모

- **과목 `courseType`**: `"school"` = 학교지정(전 학급 응시) / `"student"` = 학생선택
- **기간 `periods[].startTimes`**: `{ "1": "08:30", "2": "08:30", "3": "08:20" }` — 학년별 교시 시작시각
- **enrollment**: `subjectId`가 없을 수 있음 → `subjectName`으로 과목 매칭

---

## 개발 워크플로우

```bash
npm run dev      # 로컬 개발 서버
npm run build    # 빌드 (배포 전 확인)
firebase deploy  # 명시적 요청 시에만 실행
```

**배포 URL**: https://exam-support-kr.web.app

---

## 참고 문서

- `docs/design-guide.md` — UI 스타일 토큰 및 컴포넌트 패턴
- `docs/workflow.md` — 고사 업무 전체 워크플로우 및 도메인 규칙
