import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { firebaseDb } from "./firebase";

// ─── 학생 ───────────────────────────────────────────────

/**
 * @param {string} schoolId
 * @returns {Promise<Array>}
 */
export async function loadStudents(schoolId) {
  const snap = await getDocs(collection(firebaseDb, "schools", schoolId, "students"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Upsert a student. If student.id is absent a new document is created.
 * @param {string} schoolId
 * @param {object} student
 * @returns {Promise<string>} document id
 */
export async function saveStudent(schoolId, student) {
  const { id, ...data } = student;
  if (id) {
    await setDoc(
      doc(firebaseDb, "schools", schoolId, "students", id),
      { ...data, updatedAt: serverTimestamp() },
      { merge: true },
    );
    return id;
  }
  const ref = await addDoc(collection(firebaseDb, "schools", schoolId, "students"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * @param {string} schoolId
 * @param {string} studentId
 * @returns {Promise<void>}
 */
export async function deleteStudent(schoolId, studentId) {
  await deleteDoc(doc(firebaseDb, "schools", schoolId, "students", studentId));
  // cascade: 해당 학생 enrollment 삭제
  const q = query(collection(firebaseDb, "schools", schoolId, "enrollments"), where("studentId", "==", studentId));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const batch = writeBatch(firebaseDb);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

/**
 * 업로드된 학년만 교체. 다른 학년 데이터는 유지.
 * (예: 2학년 파일 업로드 시 2학년만 삭제 후 저장, 1·3학년은 그대로)
 */
export async function bulkSaveStudents(schoolId, students) {
  const uploadedGrades = [...new Set(students.map((s) => s.grade))];
  const existing = await loadStudents(schoolId);
  const toDelete = existing.filter((s) => uploadedGrades.includes(s.grade));
  const CHUNK = 500;

  for (let i = 0; i < toDelete.length; i += CHUNK) {
    const batch = writeBatch(firebaseDb);
    toDelete.slice(i, i + CHUNK).forEach((s) => {
      batch.delete(doc(firebaseDb, "schools", schoolId, "students", s.id));
    });
    await batch.commit();
  }

  // 2. Write new students
  const colRef = collection(firebaseDb, "schools", schoolId, "students");
  for (let i = 0; i < students.length; i += CHUNK) {
    const batch = writeBatch(firebaseDb);
    students.slice(i, i + CHUNK).forEach((student) => {
      const { id, ...data } = student;
      const ref = id ? doc(firebaseDb, "schools", schoolId, "students", id) : doc(colRef);
      batch.set(ref, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }
}

/**
 * 특정 학년(또는 전체) 학생 삭제
 * grade 미지정 시 전체 삭제
 */
export async function deleteStudentsByGrade(schoolId, grade) {
  const existing = await loadStudents(schoolId);
  const targets = grade ? existing.filter((s) => s.grade === grade) : existing;
  const CHUNK = 500;
  for (let i = 0; i < targets.length; i += CHUNK) {
    const batch = writeBatch(firebaseDb);
    targets.slice(i, i + CHUNK).forEach((s) => {
      batch.delete(doc(firebaseDb, "schools", schoolId, "students", s.id));
    });
    await batch.commit();
  }
  // cascade: 해당 학년(또는 전체) enrollment 삭제
  const enrollmentsRef = collection(firebaseDb, "schools", schoolId, "enrollments");
  const snap = grade
    ? await getDocs(query(enrollmentsRef, where("grade", "==", grade)))
    : await getDocs(enrollmentsRef);
  if (!snap.empty) {
    for (let i = 0; i < snap.docs.length; i += CHUNK) {
      const batch = writeBatch(firebaseDb);
      snap.docs.slice(i, i + CHUNK).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
}

// ─── 고사실 ──────────────────────────────────────────────

/**
 * @param {string} schoolId
 * @returns {Promise<Array>}
 */
export async function loadRooms(schoolId) {
  const snap = await getDocs(collection(firebaseDb, "schools", schoolId, "rooms"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * @param {string} schoolId
 * @param {object} room
 * @returns {Promise<string>}
 */
export async function saveRoom(schoolId, room) {
  const { id, ...data } = room;
  if (id) {
    await setDoc(
      doc(firebaseDb, "schools", schoolId, "rooms", id),
      { ...data, updatedAt: serverTimestamp() },
      { merge: true },
    );
    return id;
  }
  const ref = await addDoc(collection(firebaseDb, "schools", schoolId, "rooms"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * @param {string} schoolId
 * @param {string} roomId
 * @returns {Promise<void>}
 */
export async function deleteRoom(schoolId, roomId) {
  await deleteDoc(doc(firebaseDb, "schools", schoolId, "rooms", roomId));
}

// ─── 과목 ────────────────────────────────────────────────

/**
 * @param {string} schoolId
 * @returns {Promise<Array>}
 */
export async function loadSubjects(schoolId) {
  const snap = await getDocs(collection(firebaseDb, "schools", schoolId, "subjects"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * @param {string} schoolId
 * @param {object} subject
 * @returns {Promise<string>}
 */
export async function saveSubject(schoolId, subject) {
  const { id, ...data } = subject;
  if (id) {
    await setDoc(
      doc(firebaseDb, "schools", schoolId, "subjects", id),
      { ...data, updatedAt: serverTimestamp() },
      { merge: true },
    );
    return id;
  }
  const ref = await addDoc(collection(firebaseDb, "schools", schoolId, "subjects"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * @param {string} schoolId
 * @param {string} subjectId
 * @returns {Promise<void>}
 */
export async function deleteSubject(schoolId, subjectId) {
  await deleteDoc(doc(firebaseDb, "schools", schoolId, "subjects", subjectId));
}

/**
 * 특정 입학년도 과목 전체 교체 (기존 동일 entryYear 삭제 후 새로 저장)
 * @param {string} schoolId
 * @param {Array} subjects  — 각 항목에 entryYear 포함
 * @param {number} entryYear
 */
export async function bulkSaveSubjectsByYear(schoolId, subjects, entryYear) {
  const existing = await loadSubjects(schoolId);
  const toDelete = existing.filter((s) => s.entryYear === entryYear);
  const CHUNK = 500;

  for (let i = 0; i < toDelete.length; i += CHUNK) {
    const batch = writeBatch(firebaseDb);
    toDelete.slice(i, i + CHUNK).forEach((s) => {
      batch.delete(doc(firebaseDb, "schools", schoolId, "subjects", s.id));
    });
    await batch.commit();
  }

  const colRef = collection(firebaseDb, "schools", schoolId, "subjects");
  for (let i = 0; i < subjects.length; i += CHUNK) {
    const batch = writeBatch(firebaseDb);
    subjects.slice(i, i + CHUNK).forEach((subject) => {
      const { id, ...data } = subject;
      const ref = doc(colRef);
      batch.set(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    });
    await batch.commit();
  }
}

/**
 * 입학년도별 과목 삭제 (entryYear=null 이면 전체)
 * @param {string} schoolId
 * @param {number|null} entryYear
 */
export async function deleteSubjectsByYear(schoolId, entryYear) {
  const existing = await loadSubjects(schoolId);
  const targets = entryYear != null ? existing.filter((s) => s.entryYear === entryYear) : existing;
  const CHUNK = 500;
  for (let i = 0; i < targets.length; i += CHUNK) {
    const batch = writeBatch(firebaseDb);
    targets.slice(i, i + CHUNK).forEach((s) => {
      batch.delete(doc(firebaseDb, "schools", schoolId, "subjects", s.id));
    });
    await batch.commit();
  }
}

// ─── 수강 신청 (Enrollments) ─────────────────────────────

/**
 * 학년별 enrollment 전체 교체.
 * enrollment 스키마: { studentId, subjectName, grade }
 * subjectId는 추후 과목 매칭 시 채워진다.
 */
export async function bulkSaveEnrollmentsByGrade(schoolId, enrollments, grade) {
  if (!firebaseDb || !schoolId || !grade) return;

  // 해당 학년 기존 enrollment 삭제
  const existing = await getDocs(collection(firebaseDb, "schools", schoolId, "enrollments"));
  const toDelete = existing.docs.filter((d) => d.data().grade === grade);
  const CHUNK = 500;

  for (let i = 0; i < toDelete.length; i += CHUNK) {
    const batch = writeBatch(firebaseDb);
    toDelete.slice(i, i + CHUNK).forEach((d) => {
      batch.delete(doc(firebaseDb, "schools", schoolId, "enrollments", d.id));
    });
    await batch.commit();
  }

  // 새 enrollment 저장
  const colRef = collection(firebaseDb, "schools", schoolId, "enrollments");
  for (let i = 0; i < enrollments.length; i += CHUNK) {
    const batch = writeBatch(firebaseDb);
    enrollments.slice(i, i + CHUNK).forEach((enrollment) => {
      batch.set(doc(colRef), enrollment);
    });
    await batch.commit();
  }
}
