import { useEffect, useState } from "react";
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { firebaseAuth, firebaseDb, googleProvider } from "../lib/firebase";
import { listAllowedDomains, resolveTenantFromEmail } from "../utils/tenantResolver";

function buildLocalProfile(user, role = "editor") {
  const tenant = resolveTenantFromEmail(user.email);

  if (!tenant) {
    throw new Error(
      `허용되지 않은 계정입니다. 허용 도메인: ${listAllowedDomains().join(", ")}`,
    );
  }

  return {
    email: user.email,
    displayName: user.displayName ?? "",
    tenantId: tenant.tenantId,
    role,
  };
}

function isFirestorePermissionError(error) {
  return error?.code === "permission-denied" || error?.code === "unauthenticated";
}

async function upsertUserProfile(user) {
  const baseProfile = buildLocalProfile(user);

  if (!firebaseDb) {
    return {
      profile: baseProfile,
      warning: "Firebase 설정이 없어 로컬 모드로 로그인했습니다.",
    };
  }

  const userRef = doc(firebaseDb, "users", user.uid);
  const snapshot = await getDoc(userRef);
  const existingRole = snapshot.exists() ? snapshot.data().role : "editor";

  const profile = {
    ...baseProfile,
    role: existingRole ?? "editor",
    updatedAt: serverTimestamp(),
  };

  await setDoc(
    userRef,
    {
      ...profile,
      createdAt: snapshot.exists() ? snapshot.data().createdAt ?? serverTimestamp() : serverTimestamp(),
    },
    { merge: true },
  );

  return {
    profile: {
      ...baseProfile,
      role: existingRole ?? "editor",
    },
    warning: null,
  };
}

export function useAuth() {
  const [authState, setAuthState] = useState({
    status: firebaseAuth ? "loading" : "ready",
    user: null,
    profile: null,
    error: firebaseAuth ? null : "Firebase 설정이 비어 있습니다. .env 값을 확인해 주세요.",
    warning: null,
  });

  useEffect(() => {
    if (!firebaseAuth) {
      return undefined;
    }

    let cancelled = false;

    setPersistence(firebaseAuth, browserLocalPersistence).catch(() => {
      // Persistence failure should not block sign-in.
    });

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
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

      try {
        const { profile, warning } = await upsertUserProfile(user);
        if (!cancelled) {
          setAuthState({
            status: "signed_in",
            user,
            profile,
            error: null,
            warning,
          });
        }
      } catch (error) {
        if (isFirestorePermissionError(error)) {
          const profile = buildLocalProfile(user);
          if (!cancelled) {
            setAuthState({
              status: "signed_in",
              user,
              profile,
              error: null,
              warning: "Firestore 권한이 없어 사용자 문서 저장을 건너뛰고 로컬 모드로 로그인했습니다.",
            });
          }
          return;
        }

        await signOut(firebaseAuth);
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

  const signIn = async () => {
    if (!firebaseAuth || !googleProvider) {
      setAuthState((current) => ({
        ...current,
        status: "error",
        error: "Firebase 설정이 비어 있습니다. .env 값을 확인해 주세요.",
        warning: null,
      }));
      return;
    }

    setAuthState((current) => ({ ...current, status: "loading", error: null, warning: null }));

    try {
      await signInWithPopup(firebaseAuth, googleProvider);
    } catch (error) {
      setAuthState({
        status: "error",
        user: null,
        profile: null,
        error: error instanceof Error ? error.message : "Google 로그인에 실패했습니다.",
        warning: null,
      });
    }
  };

  const logout = async () => {
    if (!firebaseAuth) {
      return;
    }
    await signOut(firebaseAuth);
  };

  return {
    ...authState,
    signIn,
    logout,
  };
}
