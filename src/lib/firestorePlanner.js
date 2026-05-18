import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
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
      : { id: schoolId, name: "", domain: "" },
    students: mapDocs(studentsSnap),
    enrollments: mapDocs(enrollmentsSnap),
    rooms: mapDocs(roomsSnap),
    subjects: mapDocs(subjectsSnap),
  };
}

/**
 * 실시간 동기화: Firestore 컬렉션 변경 시 콜백 호출
 * @param {string} schoolId
 * @param {(data: object) => void} callback
 * @returns {() => void} unsubscribe 함수
 */
export function subscribeTenantData(schoolId, callback) {
  if (!firebaseDb || !schoolId) {
    return () => {};
  }

  const studentsRef = collection(firebaseDb, "schools", schoolId, "students");
  const enrollmentsRef = collection(firebaseDb, "schools", schoolId, "enrollments");
  const roomsRef = collection(firebaseDb, "schools", schoolId, "rooms");
  const subjectsRef = collection(firebaseDb, "schools", schoolId, "subjects");
  const schoolRef = doc(firebaseDb, "schools", schoolId);

  const latestData = {
    school: { id: schoolId, name: "", domain: "" },
    students: [],
    enrollments: [],
    rooms: [],
    subjects: [],
  };

  // 초기 로드 완료 추적 (5개 컬렉션 모두 준비될 때까지 대기)
  const loadedFlags = { school: false, students: false, enrollments: false, rooms: false, subjects: false };
  let isInitialLoadComplete = false;

  const checkAndEmit = () => {
    // 초기 로드: 모든 컬렉션이 준비될 때까지 대기
    if (!isInitialLoadComplete) {
      if (Object.values(loadedFlags).every(flag => flag)) {
        isInitialLoadComplete = true;
        callback({ ...latestData });
      }
      return;
    }
    // 이후 변경: 즉시 emit
    callback({ ...latestData });
  };

  const unsubSchool = onSnapshot(schoolRef, (snap) => {
    latestData.school = snap.exists()
      ? { id: snap.id, ...snap.data() }
      : { id: schoolId, name: "", domain: "" };
    loadedFlags.school = true;
    checkAndEmit();
  });

  const unsubStudents = onSnapshot(studentsRef, (snap) => {
    latestData.students = mapDocs(snap);
    loadedFlags.students = true;
    checkAndEmit();
  });

  const unsubEnrollments = onSnapshot(enrollmentsRef, (snap) => {
    latestData.enrollments = mapDocs(snap);
    loadedFlags.enrollments = true;
    checkAndEmit();
  });

  const unsubRooms = onSnapshot(roomsRef, (snap) => {
    latestData.rooms = mapDocs(snap);
    loadedFlags.rooms = true;
    checkAndEmit();
  });

  const unsubSubjects = onSnapshot(subjectsRef, (snap) => {
    latestData.subjects = mapDocs(snap);
    loadedFlags.subjects = true;
    checkAndEmit();
  });

  return () => {
    unsubSchool();
    unsubStudents();
    unsubEnrollments();
    unsubRooms();
    unsubSubjects();
  };
}

// ── 멀티 고사 관리 ──────────────────────────────────────────────────────────

/** 학교의 전체 고사(plan) 목록 조회 (sessions 미포함, 메타데이터만) */
export async function loadPlanList({ schoolId }) {
  if (!firebaseDb || !schoolId) return [];

  const snap = await getDocs(collection(firebaseDb, "schools", schoolId, "plans"));
  return snap.docs
    .map((d) => ({
      id: d.id,
      name: d.data().name ?? "",
      academicYear: d.data().academicYear ?? null,
      examType: d.data().examType ?? "",
      status: d.data().status ?? "draft",
      semester: d.data().semester ?? null,
      sessionCount: 0, // 메타만 조회 — 세션 수는 별도 로드 필요 시 추가
      updatedAt: d.data().updatedAt ?? null,
      createdAt: d.data().createdAt ?? null,
      ownerId: d.data().ownerId ?? "",
    }))
    .sort((a, b) => {
      const aTime = a.updatedAt?.seconds ?? 0;
      const bTime = b.updatedAt?.seconds ?? 0;
      return bTime - aTime;
    });
}

/** 특정 고사(plan) + sessions 로드 */
export async function loadPlanById({ schoolId, planId }) {
  if (!firebaseDb || !schoolId || !planId) return null;

  const planRef = doc(firebaseDb, "schools", schoolId, "plans", planId);
  const planSnap = await getDoc(planRef);
  if (!planSnap.exists()) return null;

  const sessionsSnap = await getDocs(
    collection(firebaseDb, "schools", schoolId, "plans", planId, "sessions"),
  );

  return {
    id: planSnap.id,
    ...planSnap.data(),
    sessions: mapDocs(sessionsSnap),
  };
}

/** 고사 보관 (archived) */
export async function archivePlan({ schoolId, planId }) {
  if (!firebaseDb || !schoolId || !planId) return;
  await setDoc(
    doc(firebaseDb, "schools", schoolId, "plans", planId),
    { status: "archived", updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/** 고사 삭제 (plan + sessions 하위 컬렉션) */
export async function deletePlan({ schoolId, planId }) {
  if (!firebaseDb || !schoolId || !planId) return;

  // sessions 하위 컬렉션 삭제
  const sessionsSnap = await getDocs(
    collection(firebaseDb, "schools", schoolId, "plans", planId, "sessions"),
  );
  const CHUNK = 500;
  for (let i = 0; i < sessionsSnap.docs.length; i += CHUNK) {
    const batch = writeBatch(firebaseDb);
    sessionsSnap.docs.slice(i, i + CHUNK).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  // plan 문서 삭제
  await deleteDoc(doc(firebaseDb, "schools", schoolId, "plans", planId));
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
      academicYear: plan.academicYear ?? new Date().getFullYear(),
      examType: plan.examType ?? "",
      days: plan.days,
      periods: plan.periods ?? [],
      activeFilter: plan.activeFilter,
      status: plan.status ?? "draft",
      examPlanConfirmed: plan.examPlanConfirmed ?? {},
      scheduleConfirmed: plan.scheduleConfirmed ?? {},
      roomConfirmed: plan.roomConfirmed ?? {},
      waitingAssignments: plan.waitingAssignments ?? {},
      waitingConfirmed: plan.waitingConfirmed ?? {},
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

  // enrollment 데이터 스냅샷 (응시 과목 확정 데이터 복구용)
  const enrollmentsSnap = await getDocs(
    collection(firebaseDb, "schools", schoolId, "enrollments")
  );
  const enrollments = mapDocs(enrollmentsSnap);

  await addDoc(versionsRef, {
    planId: plan.id || null,
    planName: plan.name || "이름 없음",
    savedAt: serverTimestamp(),
    savedBy: ownerId,
    dayCount: (plan.days ?? []).length,
    sessionCount: (plan.sessions ?? []).length,
    plan: {
      ...plan,
      sessions: plan.sessions ?? [],
    },
    enrollments,
  });

  // 해당 고사의 버전만 10개 유지
  const scopeQuery = plan.id
    ? query(versionsRef, where("planId", "==", plan.id), orderBy("savedAt", "asc"))
    : query(versionsRef, orderBy("savedAt", "asc"));
  const allSnap = await getDocs(scopeQuery);
  if (allSnap.size > MAX_VERSIONS) {
    const toDelete = allSnap.docs.slice(0, allSnap.size - MAX_VERSIONS);
    await Promise.all(toDelete.map((d) => deleteDoc(d.ref)));
  }
}

/** 수동 저장 스냅샷 목록 조회 (planId로 스코핑) */
export async function loadVersions({ schoolId, planId }) {
  if (!firebaseDb || !schoolId) return [];

  const versionsRef = collection(firebaseDb, "schools", schoolId, "planVersions");
  const q = planId
    ? query(versionsRef, where("planId", "==", planId), orderBy("savedAt", "desc"), limit(MAX_VERSIONS))
    : query(versionsRef, orderBy("savedAt", "desc"), limit(MAX_VERSIONS));

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    planId: d.data().planId ?? null,
    planName: d.data().planName,
    savedAt: d.data().savedAt,
    dayCount: d.data().dayCount ?? 0,
    sessionCount: d.data().sessionCount ?? 0,
    plan: d.data().plan,
    enrollments: d.data().enrollments ?? [],
  }));
}

/** 버전 불러오기 시 enrollment 데이터 복구 */
export async function restoreEnrollments({ schoolId, enrollments }) {
  if (!firebaseDb || !schoolId || !enrollments) {
    throw new Error("enrollment 복구에 필요한 정보가 부족합니다.");
  }

  const enrollmentsRef = collection(firebaseDb, "schools", schoolId, "enrollments");
  const CHUNK = 500;

  // 기존 enrollments 삭제
  const existingSnap = await getDocs(enrollmentsRef);
  for (let i = 0; i < existingSnap.docs.length; i += CHUNK) {
    const batch = writeBatch(firebaseDb);
    existingSnap.docs.slice(i, i + CHUNK).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  // 새 enrollments 복구
  for (let i = 0; i < enrollments.length; i += CHUNK) {
    const batch = writeBatch(firebaseDb);
    enrollments.slice(i, i + CHUNK).forEach((enrollment) => {
      const enrollmentRef = doc(enrollmentsRef, enrollment.id);
      batch.set(enrollmentRef, enrollment);
    });
    await batch.commit();
  }
}
