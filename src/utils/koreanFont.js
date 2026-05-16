// Malgun Gothic (맑은 고딕) 대체용 간단한 한글 폰트
// 실제로는 브라우저 기본 폰트를 사용하므로 PDF에서 fallback 처리

// jsPDF는 한글을 직접 지원하지 않으므로,
// 실용적인 해결책으로 아스키 문자는 기본 폰트 사용하고,
// 한글이 포함된 경우 경고 메시지를 표시하거나,
// 외부 서비스(Google Fonts CDN 등)를 이용한 동적 로드를 고려

// 임시 해결책: 간단한 대체 처리
export function setupKoreanFont(doc) {
  // jsPDF 한글 지원 제한으로 인해
  // 현재는 기본 폰트 사용
  // 추후 Noto Sans KR base64 추가 예정

  // 참고: 완전한 한글 지원을 위해서는
  // 1) 폰트 파일을 base64로 변환
  // 2) doc.addFileToVFS() 및 doc.addFont() 사용
  // 3) 또는 react-pdf/renderer 등 대체 라이브러리 사용

  doc.setFont("helvetica"); // 기본 폰트
  return doc;
}

// 한글 텍스트 감지
export function hasKorean(text) {
  return /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text);
}
