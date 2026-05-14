import { useState } from "react";

function LoginScreen({ status, error, onSignIn, onSubmitSchoolName }) {
  const [schoolName, setSchoolName] = useState("");
  const isLoading = status === "loading" || status === "resolving";

  if (status === "needs_school_name") {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-8 sm:px-6">
        <section className="hero-panel w-full">
          <div>
            <p className="eyebrow">학교 등록</p>
            <h1>학교 이름을 입력해주세요</h1>
            <p className="hero-copy">
              등록되지 않은 계정입니다. 학교 이름을 입력하면 개인 작업 공간이 생성됩니다.
            </p>
          </div>

          <div className="login-actions">
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="학교 이름 (예: 선유고등학교)"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-base focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              className="primary-button"
              disabled={!schoolName.trim()}
              onClick={() => onSubmitSchoolName(schoolName.trim())}
            >
              시작하기
            </button>
            {error ? <p className="login-error">{error}</p> : null}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-8 sm:px-6">
      <section className="hero-panel w-full">
        <div>
          <p className="eyebrow">Google Sign-In</p>
          <h1>학교 계정으로 로그인</h1>
          <p className="hero-copy">
            이 시스템은 Google 로그인만 사용합니다. Google 계정으로 누구나 로그인 가능하며,
            로그인 후 사용자 문서가 자동으로 생성됩니다.
          </p>
        </div>

        <div className="login-actions">
          <button type="button" className="primary-button" disabled={isLoading} onClick={onSignIn}>
            {isLoading ? "로그인 처리 중" : "Google로 로그인"}
          </button>
          {error ? <p className="login-error">{error}</p> : null}
        </div>
      </section>
    </main>
  );
}

export default LoginScreen;
