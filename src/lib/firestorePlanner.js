import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { firebaseDb } from "./firebase";

const MAX_VERSIONS = 10;

function mapDocs(snapshot) {
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function loadTenantData(schoolId) {
  if (!firebaseDb || !schoolId) {
    return null;
  }

  const schoolRef = doc(firebaseDb, "schools", schoolId);
  const [schoolSnap, studentsSnap, enrollmentsSnap, roomsSnap, subjectsSnap] = await Promise.all([
    getDoc(schoolRef),
    getDocs(collection(firebaseDb, "schools", schoolId, "students")),
    getDocs(collection(firebaseDb, "schools", schoolId, "enrollments")),
    getDocs(collection(firebaseDb, "schools", schoolId, "rooms")),
    getDocs(collection(firebaseDb, "schools", schoolId, "subjects")),
  ]);

  return {
    school: schoolSnap.exists()
      ? { id: schoolSnap.id, ...schoolSnap.data() }
      : { id: schoolId, name: schoolId, domain: "" },
    students: mapDocs(studentsSnap),
    enrollments: mapDocs(enrollmentsSnap),
    rooms: mapDocs(roomsSnap),
    subjects: mapDocs(subjectsSnap),
  };
}

export async function loadLatestPlan({ schoolId, ownerId }) {
  if (!firebaseDb || !schoolId || !ownerId) {
    return null;
  }

  const plansSnap = await getDocs(collection(firebaseDb, "schools", schoolId, "plans"));
  const plans = mapDocs(plansSnap);
  const sortedPlans = plans.sort((left, right) => {
    const leftTime = left.updatedAt?.seconds ?? 0;
    const rightTime = right.updatedAt?.seconds ?? 0;
    return rightTime - leftTime;
  });
  const ownedPlan = sortedPlans.find((plan) => plan.ownerId === ownerId) ?? sortedPlans[0];

  if (!ownedPlan) {
    return null;
  }

  const sessionsSnap = await getDocs(
    collection(firebaseDb, "schools", schoolId, "plans", ownedPlan.id, "sessions"),
  );

  return {
    ...ownedPlan,
    sessions: mapDocs(sessionsSnap),
  };
}

export async function savePlan({ schoolId, ownerId, plan }) {
  if (!firebaseDb || !schoolId || !ownerId || !plan) {
    throw new Error("저장에 필요한 Firebase 정보가 부족합니다.");
  }

  const planId =
    plan.id || doc(collection(firebaseDb, "schools", schoolId, "plans")).id;

  const planRef = doc(firebaseDb, "schools", schoolId, "plans", planId);
  const sessionsCollectionRef = collection(
    firebaseDb, "schools", schoolId, "plans", planId, "sessions",
  );

  const batch = writeBatch(firebaseDb);

  batch.set(
    planRef,
    {
      ownerId,
      schoolId,
      name: plan.name,
      semester: plan.semester ?? null,
      days: plan.days,
      periods: plan.periods ?? [],
      activeFilter: plan.activeFilter,
      status: plan.status ?? "draft",
      updatedAt: serverTimestamp(),
      createdAt: plan.createdAt ?? serverTimestamp(),
    },
    { merge: true },
  );

  plan.sessions.forEach((session) => {
    const sessionRef = doc(sessionsCollectionRef, session.id);
    batch.set(sessionRef, session, { merge: true });
  });

  await batch.commit();
  return planId;
}

// ── 버전 관리 ──────────────────────────────────────────────────────────────

/** 수동 저장 스냅샷 생성 (최대 10개 유지) */
export async function saveVersion({ schoolId, ownerId, plan }) {
  if (!firebaseDb || !schoolId || !ownerId || !plan) {
    throw new Error("버전 저장에 필요한 정보가 부족합니다.");
  }

  const versionsRef = collection(firebaseDb, "schools", schoolId, "planVersions");

  await addDoc(versionsRef, {
    planName: plan.name || "이름 없음",
    savedAt: serverTimestamp(),
    savedBy: ownerId,
    dayCount: (plan.days ?? []).length,
    sessionCount: (plan.sessions ?? []).length,
    plan: {
      ...plan,
      sessions: plan.sessions ?? [],
    },
  });

  // 10개 초과 시 가장 오래된 것 삭제
  const allSnap = await getDocs(
    query(versionsRef, orderBy("savedAt", "asc")),
  );
  if (allSnap.size > MAX_VERSIONS) {
    const toDelete = allSnap.docs.slice(0, allSnap.size - MAX_VERSIONS);
    await Promise.all(toDelete.map((d) => deleteDoc(d.ref)));
  }
}

/** 수동 저장 스냅샷 목록 조회 */
export async function loadVersions({ schoolId }) {
  if (!firebaseDb || !schoolId) return [];

  const snap = await getDocs(
    query(
      collection(firebaseDb, "schools", schoolId, "planVersions"),
      orderBy("savedAt", "desc"),
      limit(MAX_VERSIONS),
    ),
  );

  return snap.docs.map((d) => ({
    id: d.id,
    planName: d.data().planName,
    savedAt: d.data().savedAt,
    dayCount: d.data().dayCount ?? 0,
    sessionCount: d.data().sessionCount ?? 0,
    plan: d.data().plan,
  }));
}
