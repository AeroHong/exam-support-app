import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { firebaseDb } from "../lib/firebase";

// email → emailKey 변환: @ → _at_, . → _dot_
function emailToKey(email) {
  return email.replace(/@/g, "_at_").replace(/\./g, "_dot_");
}

/**
 * /schoolDomains/{domain} 조회
 * @param {string} domain
 * @returns {Promise<{schoolId: string, schoolName: string} | null>}
 */
export async function lookupSchoolByDomain(domain) {
  if (!firebaseDb || !domain) return null;

  const ref = doc(firebaseDb, "schoolDomains", domain.toLowerCase());
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  const data = snap.data();
  return { schoolId: data.schoolId, schoolName: data.schoolName };
}

/**
 * /userEmailMap/{emailKey} 조회 (emailKey 변환은 내부에서 처리)
 * @param {string} email
 * @returns {Promise<{schoolId: string, schoolName: string} | null>}
 */
export async function lookupSchoolByEmail(email) {
  if (!firebaseDb || !email) return null;

  const emailKey = emailToKey(email);
  const ref = doc(firebaseDb, "userEmailMap", emailKey);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  const data = snap.data();
  return { schoolId: data.schoolId, schoolName: data.schoolName };
}

/**
 * /users/{uid} 조회
 * @param {string} uid
 * @returns {Promise<object | null>}
 */
export async function loadUserDoc(uid) {
  if (!firebaseDb || !uid) return null;

  const ref = doc(firebaseDb, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return snap.data();
}

/**
 * /schools/{schoolId} + /users/{uid} 동시 생성 (guest 최초 등록)
 * @param {string} uid
 * @param {string} email
 * @param {string} displayName
 * @param {string} schoolName
 * @returns {Promise<{schoolId: string, schoolName: string}>}
 */
export async function createGuestSchool(uid, email, displayName, schoolName) {
  if (!firebaseDb) throw new Error("Firestore가 초기화되지 않았습니다.");

  const schoolId = `guest_${uid.slice(0, 8)}`;
  const now = serverTimestamp();

  const batch = writeBatch(firebaseDb);

  const schoolRef = doc(firebaseDb, "schools", schoolId);
  batch.set(schoolRef, {
    name: schoolName,
    isGuest: true,
    ownerUid: uid,
    ownerEmail: email,
    createdAt: now,
  });

  const userRef = doc(firebaseDb, "users", uid);
  batch.set(
    userRef,
    {
      email,
      displayName: displayName ?? "",
      schoolId,
      schoolName,
      role: "guest",
      isGuest: true,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  await batch.commit();

  return { schoolId, schoolName };
}

/**
 * /users/{uid} upsert
 * @param {string} uid
 * @param {object} data
 * @returns {Promise<void>}
 */
export async function upsertUserDoc(uid, data) {
  if (!firebaseDb || !uid) return;

  const ref = doc(firebaseDb, "users", uid);
  await setDoc(
    ref,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

// ── super-admin 전용 함수 ──────────────────────────────────────────────────

/**
 * /schoolDomains/{domain} 에 등록
 * @param {string} domain
 * @param {string} schoolId
 * @param {string} schoolName
 */
export async function registerSchoolDomain(domain, schoolId, schoolName) {
  if (!firebaseDb) throw new Error("Firestore가 초기화되지 않았습니다.");

  const ref = doc(firebaseDb, "schoolDomains", domain.toLowerCase());
  await setDoc(ref, { schoolId, schoolName }, { merge: true });
}

/**
 * /userEmailMap/{emailKey} 에 등록
 * @param {string} email
 * @param {string} schoolId
 * @param {string} schoolName
 */
export async function registerUserEmail(email, schoolId, schoolName) {
  if (!firebaseDb) throw new Error("Firestore가 초기화되지 않았습니다.");

  const emailKey = emailToKey(email);
  const ref = doc(firebaseDb, "userEmailMap", emailKey);
  await setDoc(ref, { email, schoolId, schoolName }, { merge: true });
}

/**
 * /schools 목록 조회
 * @returns {Promise<Array>}
 */
export async function listAllSchools() {
  if (!firebaseDb) return [];

  const snap = await getDocs(collection(firebaseDb, "schools"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * /schoolDomains 목록 조회
 * @returns {Promise<Array>}
 */
export async function listAllDomains() {
  if (!firebaseDb) return [];

  const snap = await getDocs(collection(firebaseDb, "schoolDomains"));
  return snap.docs.map((d) => ({ domain: d.id, ...d.data() }));
}

/**
 * /userEmailMap 목록 조회
 * @returns {Promise<Array>}
 */
export async function listAllUserEmails() {
  if (!firebaseDb) return [];

  const snap = await getDocs(collection(firebaseDb, "userEmailMap"));
  return snap.docs.map((d) => ({ emailKey: d.id, ...d.data() }));
}
