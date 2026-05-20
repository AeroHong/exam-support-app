import { useCallback, useEffect, useRef, useState } from "react";
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { firebaseAuth, googleProvider } from "../lib/firebase";
import {
  createSchool,
  joinSchool,
  loadSchoolDoc,
  loadUserDoc,
  lookupSchoolByDomain,
  lookupSchoolByEmail,
  upsertUserDoc,
} from "../lib/firestoreSchool";

const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL ?? "";

const INITIAL_STATE = {
  status: "loading",
  user: null,
  profile: null,
  error: null,
  warning: null,
};

/**
 * 인증 상태 및 프로필 관리 훅
 *
 * status 값:
 *   'loading'             - Firebase 초기화 중 또는 로그인 처리 중
 *   'signed_out'          - 비로그인 상태
 *   'resolving'           - 로그인 후 학교 정보 확인 중
 *   'needs_school_setup'  - 학교 정보를 찾지 못해 학교 검색/등록 대기
 *   'signed_in'           - 로그인 완료
 *   'error'               - 오류 발생
 */
export function useAuth() {
  const [authState, setAuthState] = useState(INITIAL_STATE);

  // needs_school_setup 상태에서 join/create 콜백이 user를 참조할 수 있도록 ref 유지
  const pendingUserRef = useRef(null);

  useEffect(() => {
    if (!firebaseAuth) {
      setAuthState({
        status: "error",
        user: null,
        profile: null,
        error: "Firebase 설정이 비어 있습니다. .env 값을 확인해 주세요.",
        warning: null,
      });
      return undefined;
    }

    let cancelled = false;

    setPersistence(firebaseAuth, browserLocalPersistence).catch(() => {
      // persistence 실패는 로그인을 막지 않음
    });

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        pendingUserRef.current = null;
        if (!cancelled) {
          setAuthState({
            status: "signed_out",
            user: null,
            profile: null,
            error: null,
            warning: null,
          });
        }
        return;
      }

      if (!cancelled) {
        setAuthState((prev) => ({ ...prev, status: "resolving", user, error: null }));
      }

      try {
        // ── 익명 로그인(데모 모드) 처리 ──────────────────────────────────
        if (user.isAnonymous) {
          if (!cancelled) {
            setAuthState({
              status: "signed_in",
              user,
              profile: {
                email: "",
                displayName: "데모 사용자",
                schoolId: "demo-school",
                schoolName: "한빛고등학교",
                role: "demo",
                isGuest: false,
              },
              error: null,
              warning: null,
            });
          }
          return;
        }

        const email = user.email ?? "";

        // ── super_admin 처리 ──────────────────────────────────────────────
        if (email === SUPER_ADMIN_EMAIL) {
          const profile = {
            email,
            displayName: user.displayName ?? "",
            schoolId: null,
            schoolName: "",
            role: "super_admin",
            isGuest: false,
          };

          await upsertUserDoc(user.uid, {
            email,
            displayName: user.displayName ?? "",
            schoolId: null,
            schoolName: "",
            role: "super_admin",
            isGuest: false,
          });

          if (!cancelled) {
            setAuthState({
              status: "signed_in",
              user,
              profile,
              error: null,
              warning: null,
            });
          }
          return;
        }

        // ── 기존 사용자 문서 로드 (role fallback 포함) ───────────────────
        const existingUserDoc = await loadUserDoc(user.uid);

        // ── super_admin 재확인: 이메일 OR 기존 user doc role ───────────
        if (existingUserDoc?.role === "super_admin") {
          const profile = {
            email,
            displayName: user.displayName ?? "",
            schoolId: null,
            schoolName: "",
            role: "super_admin",
            isGuest: false,
          };
          if (!cancelled) {
            setAuthState({ status: "signed_in", user, profile, error: null, warning: null });
          }
          return;
        }

        // ── 학교 조회: 기존 userDoc → 도메인(레거시) → 이메일(레거시) ────
        let school = null;
        const domain = email.split("@")[1]?.toLowerCase() ?? "";

        if (existingUserDoc?.schoolId) {
          const schoolData = await loadSchoolDoc(existingUserDoc.schoolId);
          if (schoolData) {
            school = {
              schoolId: existingUserDoc.schoolId,
              schoolName: schoolData.name ?? existingUserDoc.schoolName ?? "",
            };
          } else {
            // 학교가 삭제됨 → userDoc schoolId 초기화
            await upsertUserDoc(user.uid, { schoolId: null, schoolName: "" });
          }
        }

        // userDoc에 schoolId가 없는 경우 레거시 매핑 조회
        if (!school) school = await lookupSchoolByDomain(domain);
        if (!school) school = await lookupSchoolByEmail(email);

        // ── 학교 찾음 → 로그인 완료 ──────────────────────────────────────
        // 기존 userDoc에 role이 있으면 유지, 신규 유저는 teacher
        if (school) {
          const role = existingUserDoc?.role ?? "teacher";
          const profile = {
            email,
            displayName: user.displayName ?? "",
            schoolId: school.schoolId,
            schoolName: school.schoolName,
            role,
            isGuest: false,
          };

          await upsertUserDoc(user.uid, {
            email,
            displayName: user.displayName ?? "",
            schoolId: school.schoolId,
            schoolName: school.schoolName,
            role,
            isGuest: false,
          });

          if (!cancelled) {
            setAuthState({
              status: "signed_in",
              user,
              profile,
              error: null,
              warning: null,
            });
          }
          return;
        }

        // ── 학교 못 찾음 → 학교 검색/등록 대기 ──────────────────────────
        pendingUserRef.current = user;
        if (!cancelled) {
          setAuthState({
            status: "needs_school_setup",
            user,
            profile: null,
            error: null,
            warning: null,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setAuthState({
            status: "error",
            user: null,
            profile: null,
            error: error instanceof Error ? error.message : "로그인 처리 중 오류가 발생했습니다.",
            warning: null,
          });
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // ── signIn ──────────────────────────────────────────────────────────────
  const signIn = useCallback(async () => {
    if (!firebaseAuth || !googleProvider) {
      setAuthState((prev) => ({
        ...prev,
        status: "error",
        error: "Firebase 설정이 비어 있습니다. .env 값을 확인해 주세요.",
        warning: null,
      }));
      return;
    }

    setAuthState((prev) => ({ ...prev, status: "loading", error: null, warning: null }));

    try {
      await signInWithPopup(firebaseAuth, googleProvider);
      // 이후 onAuthStateChanged가 상태를 처리함
    } catch (error) {
      setAuthState({
        status: "error",
        user: null,
        profile: null,
        error: error instanceof Error ? error.message : "Google 로그인에 실패했습니다.",
        warning: null,
      });
    }
  }, []);

  // ── signInDemo (익명 로그인) ─────────────────────────────────────────────
  const signInDemo = useCallback(async () => {
    if (!firebaseAuth) return;
    setAuthState((prev) => ({ ...prev, status: "loading", error: null, warning: null }));
    try {
      await signInAnonymously(firebaseAuth);
      // onAuthStateChanged가 demo profile을 주입
    } catch (error) {
      setAuthState((prev) => ({
        ...prev,
        status: "signed_out",
        error: error instanceof Error ? error.message : "데모 로그인에 실패했습니다.",
        warning: null,
      }));
    }
  }, []);

  // ── logout ──────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    if (!firebaseAuth) return;
    pendingUserRef.current = null;
    await signOut(firebaseAuth);
  }, []);

  // ── joinExistingSchool: 검색된 기존 학교에 참여 ─────────────────────────
  const joinExistingSchool = useCallback(async (schoolId, schoolName) => {
    const user = pendingUserRef.current;
    if (!user) {
      setAuthState((prev) => ({
        ...prev,
        status: "error",
        error: "로그인 세션이 만료되었습니다. 다시 로그인해 주세요.",
      }));
      return;
    }

    setAuthState((prev) => ({ ...prev, status: "resolving", error: null }));

    try {
      await joinSchool(user.uid, user.email ?? "", user.displayName ?? "", schoolId, schoolName);

      pendingUserRef.current = null;
      setAuthState({
        status: "signed_in",
        user,
        profile: {
          email: user.email ?? "",
          displayName: user.displayName ?? "",
          schoolId,
          schoolName,
          role: "school_admin",
          isGuest: false,
        },
        error: null,
        warning: null,
      });
    } catch (error) {
      setAuthState((prev) => ({
        ...prev,
        status: "needs_school_setup",
        error: error instanceof Error ? error.message : "학교 참여 중 오류가 발생했습니다.",
      }));
    }
  }, []);

  // ── createNewSchool: 새 학교 등록 ────────────────────────────────────────
  const createNewSchool = useCallback(async (schoolName) => {
    const user = pendingUserRef.current;
    if (!user) {
      setAuthState((prev) => ({
        ...prev,
        status: "error",
        error: "로그인 세션이 만료되었습니다. 다시 로그인해 주세요.",
      }));
      return;
    }

    if (!schoolName || !schoolName.trim()) {
      setAuthState((prev) => ({ ...prev, error: "학교명을 입력해 주세요." }));
      return;
    }

    setAuthState((prev) => ({ ...prev, status: "resolving", error: null }));

    try {
      const { schoolId, schoolName: savedName } = await createSchool(
        user.uid,
        user.email ?? "",
        user.displayName ?? "",
        schoolName.trim(),
      );

      pendingUserRef.current = null;
      setAuthState({
        status: "signed_in",
        user,
        profile: {
          email: user.email ?? "",
          displayName: user.displayName ?? "",
          schoolId,
          schoolName: savedName,
          role: "school_admin",
          isGuest: false,
        },
        error: null,
        warning: null,
      });
    } catch (error) {
      setAuthState((prev) => ({
        ...prev,
        status: "needs_school_setup",
        error: error instanceof Error ? error.message : "학교 등록 중 오류가 발생했습니다.",
      }));
    }
  }, []);

  return {
    status: authState.status,
    user: authState.user,
    profile: authState.profile,
    error: authState.error,
    warning: authState.warning,
    signIn,
    signInDemo,
    logout,
    joinExistingSchool,
    createNewSchool,
  };
}
