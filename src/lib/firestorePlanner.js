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

export async function loadTenantData(tenantId) {
  if (!firebaseDb || !tenantId) {
    return null;
  }

  const tenantRef = doc(firebaseDb, "tenants", tenantId);
  const [tenantSnap, studentsSnap, enrollmentsSnap, roomsSnap] = await Promise.all([
    getDoc(tenantRef),
    getDocs(collection(firebaseDb, "tenants", tenantId, "students")),
    getDocs(collection(firebaseDb, "tenants", tenantId, "enrollments")),
    getDocs(collection(firebaseDb, "tenants", tenantId, "rooms")),
  ]);

  return {
    tenant: tenantSnap.exists()
      ? { id: tenantSnap.id, ...tenantSnap.data() }
      : { id: tenantId, name: tenantId, domain: "" },
    students: mapDocs(studentsSnap),
    enrollments: mapDocs(enrollmentsSnap),
    rooms: mapDocs(roomsSnap),
  };
}

export async function loadLatestPlan({ tenantId, ownerId }) {
  if (!firebaseDb || !tenantId || !ownerId) {
    return null;
  }

  const plansSnap = await getDocs(collection(firebaseDb, "tenants", tenantId, "plans"));
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
    collection(firebaseDb, "tenants", tenantId, "plans", ownedPlan.id, "sessions"),
  );

  return {
    ...ownedPlan,
    sessions: mapDocs(sessionsSnap),
  };
}

export async function savePlan({ tenantId, ownerId, plan }) {
  if (!firebaseDb || !tenantId || !ownerId || !plan) {
    throw new Error("저장에 필요한 Firebase 정보가 부족합니다.");
  }

  const planId = plan.id;
  const planRef = doc(firebaseDb, "tenants", tenantId, "plans", planId);
  const sessionsCollectionRef = collection(
    firebaseDb,
    "tenants",
    tenantId,
    "plans",
    planId,
    "sessions",
  );

  const batch = writeBatch(firebaseDb);

  batch.set(
    planRef,
    {
      ownerId,
      tenantId,
      name: plan.name,
      days: plan.days,
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
