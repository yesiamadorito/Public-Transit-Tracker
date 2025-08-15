import { db } from "../firebase";
import { collection, addDoc, doc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";

export async function startJourney(userId, startStationId) {
  const ref = doc(collection(db, "journeys"));
  await setDoc(ref, {
    userId,
    startStationId: startStationId ?? null,
    startTimestamp: serverTimestamp(),
    createdAt: serverTimestamp()
  });
  return ref.id;
}

export async function endJourney(journeyId, endStationId) {
  const ref = doc(db, "journeys", journeyId);
  await updateDoc(ref, {
    endStationId: endStationId ?? null,
    endTimestamp: serverTimestamp()
  });
}

export async function logEvent(journeyId, payload) {
  return await addDoc(collection(db, "events"), {
    journeyId,
    createdAt: serverTimestamp(),
    ...payload
  });
}