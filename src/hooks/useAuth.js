import { useCallback, useEffect, useRef, useState } from "react";
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { firebaseAuth, googleProvider } from "../lib/firebase";
import {
  createGuestSchool,
  loadUserDoc,
  lookupSchoolByDomain,
  lookupSchoolByEmail,
  upsertUserDoc,
} from "../lib/firestoreSchool";

const SUPER_ADMIN_EMAIL = "hckgood@gmail.com";

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
 *   'loading'           - Firebase 초기화 중 또는 로그인 처리 중
 *   'signed_out'        - 비로그인 상태
 *   'resolving'         - 로그인 후 학교 정보 확인 중
 *   'needs_school_name' - 학교 정보를 찾지 못해 학교명 입력 대기
 *   'signed_in'         - 로그인 완료
 *   'error'             - 오류 발생
 */
export function useAuth() {
  const [authState, setAuthState] = useState(INITIAL_STATE);

  // needs_school_name 상태에서 submitSchoolName이 user를 참조할 수 있도록 ref 유지
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
        const email = user.email ?? "";
        const domain = email.split("@")[1]?.toLowerCase() ?? "";

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

        // ── 학교 조회: 도메인 → 이메일 → 기존 사용자 문서 ────────────────
        let school = await lookupSchoolByDomain(domain);

        if (!school) {
          school = await lookupSchoolByEmail(email);
        }

        if (!school) {
          const userDoc = await loadUserDoc(user.uid);
          if (userDoc?.schoolId) {
            school = { schoolId: userDoc.schoolId, schoolName: userDoc.schoolName ?? "" };
          }
        }

        // ── 학교 찾음 → school_admin으로 로그인 완료 ─────────────────────
        if (school) {
          const profile = {
            email,
            displayName: user.displayName ?? "",
            schoolId: school.schoolId,
            schoolName: school.schoolName,
            role: "school_admin",
            isGuest: false,
          };

          await upsertUserDoc(user.uid, {
            email,
            displayName: user.displayName ?? "",
            schoolId: school.schoolId,
            schoolName: school.schoolName,
            role: "school_admin",
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

        // ── 학교 못 찾음 → 학교명 입력 대기 ─────────────────────────────
        pendingUserRef.current = user;
        if (!cancelled) {
          setAuthState({
            status: "needs_school_name",
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

  // ── logout ──────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    if (!firebaseAuth) return;
    pendingUserRef.current = null;
    await signOut(firebaseAuth);
  }, []);

  // ── submitSchoolName ────────────────────────────────────────────────────
  const submitSchoolName = useCallback(async (schoolName) => {
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
      setAuthState((prev) => ({
        ...prev,
        error: "학교명을 입력해 주세요.",
      }));
      return;
    }

    setAuthState((prev) => ({ ...prev, status: "resolving", error: null }));

    try {
      const { schoolId, schoolName: savedName } = await createGuestSchool(
        user.uid,
        user.email ?? "",
        user.displayName ?? "",
        schoolName.trim(),
      );

      const profile = {
        email: user.email ?? "",
        displayName: user.displayName ?? "",
        schoolId,
        schoolName: savedName,
        role: "guest",
        isGuest: true,
      };

      pendingUserRef.current = null;

      setAuthState({
        status: "signed_in",
        user,
        profile,
        error: null,
        warning: null,
      });
    } catch (error) {
      setAuthState((prev) => ({
        ...prev,
        status: "error",
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
    logout,
    submitSchoolName,
  };
}
