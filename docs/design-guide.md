# 디자인 가이드

> 이 파일의 패턴이 프로젝트 UI 표준이다.
> 참고 프로젝트: `C:\Claude code\smart-teachers-office` (동일 색상 토큰 공유)

---

## 색상 토큰

```js
// 주요 색상 (인라인 스타일에서 직접 사용)
primary:       '#4f46e5'   // indigo — 주요 버튼, 활성 탭, 링크
primaryLight:  '#eef2ff'   // indigo 연한 배경 — 활성 탭 bg, 강조 행
primaryBorder: '#c7d2fe'   // indigo 테두리

textPrimary:   '#111827'   // 제목, 데이터 셀
textBody:      '#374151'   // 본문
textSecondary: '#6b7280'   // 설명, 비활성
textMuted:     '#9ca3af'   // 플레이스홀더, 빈 상태

border:        '#e5e7eb'   // 기본 테두리
borderLight:   '#f3f4f6'   // 행 구분선
bg:            '#ffffff'   // 패널/모달 배경
bgSubtle:      '#f9fafb'   // 테이블 헤더, 업로드 박스
bgPage:        '#f8fafc'   // 페이지 배경

danger:        '#dc2626'   // 위험 텍스트/아이콘
dangerBorder:  '#fecaca'   // 위험 테두리
dangerBg:      '#fef2f2'   // 위험 배경

success:       '#15803d'
successBorder: '#bbf7d0'
successBg:     '#f0fdf4'
```

---

## 타이포그래피

```js
// eyebrow (섹션 레이블)
eyebrow: {
  fontSize: '0.75rem', fontWeight: 600, color: '#6b7280',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem'
}

// 페이지 제목
pageTitle: { fontSize: '1.5rem', fontWeight: 800, color: '#111827', margin: 0 }

// 섹션 소제목
sectionTitle: { fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }

// 본문
body: { fontSize: '0.875rem', color: '#374151' }

// 소형 레이블 (테이블 헤더, 필드명)
small: { fontSize: '0.8rem', fontWeight: 700, color: '#374151' }

// 뮤트 텍스트
muted: { fontSize: '0.82rem', color: '#9ca3af' }
```

---

## 레이아웃

```js
// 페이지 래퍼
page: { padding: '1.5rem', maxWidth: '1100px' }

// 페이지 헤더 (제목 + 버튼 행)
pageHeader: {
  display: 'flex', justifyContent: 'space-between',
  alignItems: 'flex-end', marginBottom: '1.25rem'
}

// 버튼 행
btnRow: { display: 'flex', gap: '0.5rem', alignItems: 'center' }

// 필터 행 (탭 + 선택 등)
filterRow: {
  display: 'flex', gap: '0.4rem',
  marginBottom: '0.75rem', alignItems: 'center', flexWrap: 'wrap'
}
```

---

## 버튼

```js
// 주요 버튼 (indigo)
primaryBtn: {
  padding: '0.45rem 1rem',
  backgroundColor: '#4f46e5', color: '#fff',
  border: 'none', borderRadius: '7px',
  cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600
}

// 보조 버튼 (outline)
outlineBtn: {
  padding: '0.45rem 1rem',
  backgroundColor: '#fff', color: '#374151',
  border: '1px solid #d1d5db', borderRadius: '7px',
  cursor: 'pointer', fontSize: '0.85rem'
}

// 소형 편집 버튼
editBtn: {
  padding: '0.2rem 0.55rem',
  backgroundColor: '#fff', color: '#4f46e5',
  border: '1px solid #c7d2fe', borderRadius: '5px',
  cursor: 'pointer', fontSize: '0.75rem'
}

// 소형 삭제 버튼
deleteBtn: {
  padding: '0.2rem 0.55rem',
  backgroundColor: '#fff', color: '#dc2626',
  border: '1px solid #fecaca', borderRadius: '5px',
  cursor: 'pointer', fontSize: '0.75rem'
}

// 위험 outline 버튼
dangerOutlineBtn: {
  padding: '0.35rem 0.75rem',
  backgroundColor: '#fff', color: '#dc2626',
  border: '1px solid #dc2626', borderRadius: '6px',
  cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600
}
```

---

## 필터 탭 (Pill 형태)

```js
// 비활성
tab: {
  padding: '0.3rem 0.75rem',
  border: '1px solid #e5e7eb', borderRadius: '999px',
  cursor: 'pointer', fontSize: '0.82rem',
  backgroundColor: '#fff', color: '#6b7280'
}

// 활성
tabActive: {
  padding: '0.3rem 0.75rem',
  border: '1px solid #4f46e5', borderRadius: '999px',
  cursor: 'pointer', fontSize: '0.82rem',
  backgroundColor: '#eef2ff', color: '#4f46e5', fontWeight: 700
}

// 뱃지 (탭 내 숫자)
badge:       { display: 'inline-block', fontSize: '0.72rem', fontWeight: 600, backgroundColor: '#e5e7eb', color: '#374151', borderRadius: '999px', padding: '0.05rem 0.45rem', marginLeft: '0.3rem' }
badgeActive: { display: 'inline-block', fontSize: '0.72rem', fontWeight: 600, backgroundColor: '#c7d2fe', color: '#3730a3', borderRadius: '999px', padding: '0.05rem 0.45rem', marginLeft: '0.3rem' }
```

---

## 테이블

```js
// 테이블 래퍼 (가로 스크롤)
tableWrap: { overflowX: 'auto' }

// 테이블
table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }

// 헤더 행
thead: { backgroundColor: '#f9fafb' }

// 헤더 셀
th: {
  padding: '0.5rem 0.75rem', fontWeight: 700, color: '#374151',
  textAlign: 'left', borderBottom: '2px solid #e5e7eb',
  fontSize: '0.8rem', whiteSpace: 'nowrap'
}
thRight: { ...th, textAlign: 'right' }

// 데이터 행
tr: { borderBottom: '1px solid #f3f4f6' }
trHover: { backgroundColor: '#f9fafb' }  // onMouseEnter/Leave로 적용

// 데이터 셀
td:      { padding: '0.4rem 0.75rem', color: '#111827', verticalAlign: 'middle' }
tdMuted: { padding: '0.4rem 0.75rem', color: '#9ca3af', fontSize: '0.82rem', verticalAlign: 'middle' }
tdRight: { padding: '0.4rem 0.75rem', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap' }

// 빈 상태
emptyRow: { textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: '0.9rem' }

// 학년 그룹 구분 행 (colspan 전체)
gradeGroupRow: {
  backgroundColor: '#f3f4f6', fontWeight: 700,
  padding: '0.4rem 0.75rem', fontSize: '0.82rem', color: '#374151'
}
```

---

## 인라인 입력 필드

```js
input: {
  width: '100%', padding: '0.45rem 0.75rem',
  border: '1px solid #d1d5db', borderRadius: '7px',
  fontSize: '0.875rem', boxSizing: 'border-box', outline: 'none'
}
select: { ...input, backgroundColor: '#fff' }

// 소형 (테이블 내부 숫자 입력)
inputSm: {
  width: '70px', padding: '0.3rem 0.5rem',
  border: '1px solid #d1d5db', borderRadius: '6px',
  fontSize: '0.82rem', textAlign: 'center'
}
```

---

## 알림 배너 (Notice)

```js
notice:    { padding: '0.6rem 1rem', borderRadius: '7px', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.75rem' }
noticeOk:  { backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }
noticeErr: { backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }
```

---

## 모달

```js
// 배경 오버레이
backdrop: {
  position: 'fixed', inset: 0,
  backgroundColor: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000
}

// 모달 패널
modal: {
  backgroundColor: '#fff', borderRadius: '12px',
  padding: '1.5rem', width: 'min(560px, 95vw)',
  maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
}

// 모달 제목
modalTitle: { fontSize: '1.1rem', fontWeight: 800, color: '#111827', marginBottom: '1.25rem' }

// 모달 액션 행 (우측 정렬)
modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }
```

---

## 뱃지 (콘텐츠 내 상태 표시)

```js
badgeBlue:  { display: 'inline-block', fontSize: '0.72rem', fontWeight: 600, backgroundColor: '#dbeafe', color: '#1d4ed8', borderRadius: '999px', padding: '0.1rem 0.55rem' }
badgeGreen: { display: 'inline-block', fontSize: '0.72rem', fontWeight: 600, backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '999px', padding: '0.1rem 0.55rem' }
badgeGray:  { display: 'inline-block', fontSize: '0.72rem', fontWeight: 600, backgroundColor: '#e5e7eb', color: '#374151', borderRadius: '999px', padding: '0.1rem 0.55rem' }
```

---

## 컴포넌트 패턴 체크리스트

새 컴포넌트 작성 시 확인:

- [ ] `const s = { … }` 스타일 객체로 시작
- [ ] 전역 CSS 클래스(`dense-panel`, `chip` 등) 미사용
- [ ] 페이지 헤더: `eyebrow` + `pageTitle` + `btnRow` 구조
- [ ] 필터: pill 탭 (`tab` / `tabActive`) 패턴
- [ ] 테이블: `tableWrap → table → thead(#f9fafb) → tr(borderBottom) → td` 구조
- [ ] 빈 상태: `emptyRow` 스타일 + 안내 문구
- [ ] 모달: `backdrop → modal → modalTitle → 콘텐츠 → modalActions` 구조
- [ ] 알림: `notice + noticeOk/noticeErr` (자동 사라짐 setTimeout 권장)
