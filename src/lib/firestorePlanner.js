import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { firebaseDb } from "./firebase";

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

  // Auto-generate plan ID if not set
  const planId =
    plan.id || doc(collection(firebaseDb, "schools", schoolId, "plans")).id;

  const planRef = doc(firebaseDb, "schools", schoolId, "plans", planId);
  const sessionsCollectionRef = collection(
    firebaseDb,
    "schools",
    schoolId,
    "plans",
    planId,
    "sessions",
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
