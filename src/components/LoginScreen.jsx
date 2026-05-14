function LoginScreen({ error, isLoading, onSignIn }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-8 sm:px-6">
      <section className="hero-panel w-full">
        <div>
          <p className="eyebrow">Google Sign-In</p>
          <h1>학교 계정으로 로그인</h1>
          <p className="hero-copy">
            이 시스템은 Google 로그인만 사용합니다. 허용된 학교 도메인 계정만 접근할 수
            있으며, 로그인 후 사용자 문서가 자동으로 생성됩니다.
          </p>
        </div>

        <div className="login-actions">
          <button type="button" className="primary-button" disabled={isLoading} onClick={onSignIn}>
            {isLoading ? "로그인 처리 중" : "Google로 로그인"}
          </button>
          <p className="login-note">선유고 또는 등록된 학교 도메인 계정으로만 로그인 가능합니다.</p>
          {error ? <p className="login-error">{error}</p> : null}
        </div>
      </section>
    </main>
  );
}

export default LoginScreen;
