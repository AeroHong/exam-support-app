import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
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
}

/**
 * Replace the entire student roster with the provided list.
 * Uses writeBatch in chunks of 500 to respect Firestore limits.
 * @param {string} schoolId
 * @param {Array} students  Each item may have an optional `id` field.
 * @returns {Promise<void>}
 */
export async function bulkSaveStudents(schoolId, students) {
  // 1. Delete all existing students
  const existing = await loadStudents(schoolId);
  const CHUNK = 500;

  for (let i = 0; i < existing.length; i += CHUNK) {
    const batch = writeBatch(firebaseDb);
    existing.slice(i, i + CHUNK).forEach((s) => {
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
