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
    school: { id: schoolId, name: schoolId, domain: "" },
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
      : { id: schoolId, name: schoolId, domain: "" };
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
    planName: plan.name || "이름 없음",
    savedAt: serverTimestamp(),
    savedBy: ownerId,
    dayCount: (plan.days ?? []).length,
    sessionCount: (plan.sessions ?? []).length,
    plan: {
      ...plan,
      sessions: plan.sessions ?? [],
    },
    enrollments, // 응시 과목 확정 데이터 포함
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
    enrollments: d.data().enrollments ?? [], // 응시 과목 확정 데이터 포함
  }));
}

/** 버전 불러오기 시 enrollment 데이터 복구 */
export async function restoreEnrollments({ schoolId, enrollments }) {
  if (!firebaseDb || !schoolId || !enrollments) {
    throw new Error("enrollment 복구에 필요한 정보가 부족합니다.");
  }

  const enrollmentsRef = collection(firebaseDb, "schools", schoolId, "enrollments");

  // 기존 enrollments 삭제
  const existingSnap = await getDocs(enrollmentsRef);
  const batch = writeBatch(firebaseDb);
  existingSnap.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  // 새 enrollments 복구
  enrollments.forEach((enrollment) => {
    const enrollmentRef = doc(enrollmentsRef, enrollment.id);
    batch.set(enrollmentRef, enrollment);
  });

  await batch.commit();
}
