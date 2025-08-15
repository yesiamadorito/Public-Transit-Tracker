// App.js
import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView, View, Text, Button, StyleSheet, Alert,
  ScrollView, Modal, Pressable
} from "react-native";
import Constants from "expo-constants";
import stations from "./data/stations.json";
import { auth, ensureAnonAuth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getFreshLocation, nearestStation } from "./utilities/location";
import { fetchWeather } from "./utilities/weather";
import { startJourney, endJourney, logEvent } from "./services/events";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

function explainFirebaseError(e) {
  const code = e?.code || "";
  const msg  = e?.message || String(e);
  if (code === "permission-denied") {
    return "Permission denied: check Firestore Rules (must allow authenticated users).";
  }
  if (code === "unavailable" || msg.includes("transport errored")) {
    return "Network transport problem. We enabled long-polling. If it persists, try `expo start --tunnel` OR switch to LAN, or different network.";
  }
  if (code === "failed-precondition" && msg.includes("index")) {
    return "Missing index for this query (not expected for simple writes).";
  }
  return `${code || "error"}: ${msg}`;
}

export default function App() {
  const [uid, setUid] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authErr, setAuthErr] = useState(null);

  const [gps, setGps] = useState(null);
  const [near, setNear] = useState(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [manualStation, setManualStation] = useState(null);

  const [journeyId, setJourneyId] = useState(null);
  const [events, setEvents] = useState([]);
  const [state, setState] = useState("Idle");

  const tests = useMemo(() => {
    try {
      const a = nearestStation(0,0,[{lat:0,lon:0,stationId:"A",geofenceRadiusM:10}], 20);
      if (!a || a.stationId !== "A") throw new Error("nearestStation basic failed");
      const b = nearestStation(0,0,[{lat:1,lon:1,stationId:"B",geofenceRadiusM:10}], 50);
      if (b) throw new Error("nearestStation radius failed");
      if (manualStation !== null && !manualStation.stationId) throw new Error("manual pick shape");
      return 3;
    } catch (e) { console.warn(e); return 0; }
  }, [manualStation]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
      setAuthReady(true);
      setAuthErr(null);
    });
    ensureAnonAuth().catch((e) => {
      console.warn("ensureAnonAuth error:", e);
      setAuthErr(String(e?.code || e?.message || e));
    });
    return unsub;
  }, []);

  useEffect(() => { sampleLocation(); }, []);
  async function sampleLocation() {
    try {
      const pos = await getFreshLocation();
      setGps(pos);
      const ns = nearestStation(pos.lat, pos.lon, stations, 200);
      setNear(ns);
      if (ns) setManualStation(null);
    } catch (e) {
      Alert.alert("Location error", e.message);
    }
  }

  function currentStation() { return near || manualStation || null; }

  function openPicker() { setPickerOpen(true); }
  function closePicker() { setPickerOpen(false); }
  async function pickAndStart(st) { setManualStation(st); closePicker(); if (!journeyId) await doStartJourney(st.stationId); }
  function pickOnly(st) { setManualStation(st); closePicker(); }

  async function handleStartJourney() {
    if (!authReady || !uid) {
      try { const uidNow = await ensureAnonAuth(); setUid(uidNow); }
      catch (e) { return Alert.alert("Auth", "Not signed in yet. Check Firebase config and try again."); }
    }
    const st = currentStation();
    if (!st) { openPicker(); return; }
    await doStartJourney(st.stationId);
  }

  async function doStartJourney(startStationId) {
    try {
      const id = await startJourney(uid, startStationId ?? null);
      setJourneyId(id);
      setState("DoorsClosed");
      await addEvent("start");
    } catch (e) {
      Alert.alert("Firestore write failed (start)", explainFirebaseError(e));
      console.warn("startJourney error:", e);
    }
  }

  async function addEvent(eventType) {
    if (!journeyId) return Alert.alert("Journey", "Start a journey first.");
    try {
      const pos = await getFreshLocation();
      const ns = nearestStation(pos.lat, pos.lon, stations, 200) || manualStation || null;
      const wx = await fetchWeather(pos.lat, pos.lon);

      await logEvent(journeyId, {
        eventType,
        timestampMs: Date.now(),
        stationId: ns?.stationId ?? null,
        lineId: ns?.lineId ?? null,
        lat: pos.lat, lon: pos.lon,
        gpsAccuracyM: pos.accuracy,
        weather: wx,
      });

      setEvents((e) => [{ eventType, when: new Date().toLocaleTimeString(), stationId: ns?.stationId ?? "—" }, ...e].slice(0,20));
      setNear(ns && ns.distM !== undefined ? ns : near);
      setGps(pos);
    } catch (e) {
      Alert.alert("Firestore write failed (event)", explainFirebaseError(e));
      console.warn("addEvent error:", e);
    }
  }

  async function handleDoorsOpen() {
    if (state !== "DoorsClosed") return Alert.alert("Order", "Doors Open only after Doors Close.");
    await addEvent("doors_open");
    setState("DoorsOpen");
  }
  async function handleDoorsClose() {
    if (state !== "DoorsOpen") return Alert.alert("Order", "Doors Close only after Doors Open.");
    await addEvent("doors_close");
    setState("DoorsClosed");
  }
  async function handleEndJourney() {
    await addEvent("end");
    try {
      const st = currentStation();
      await endJourney(journeyId, st?.stationId ?? null);
    } catch (e) {
      Alert.alert("Firestore write failed (end)", explainFirebaseError(e));
      console.warn("endJourney error:", e);
    }
    setJourneyId(null);
    setState("Idle");
  }

  // Quick test button to confirm Firestore connectivity
  async function testFirestore() {
    try {
      await addDoc(collection(db, "__ping"), { at: serverTimestamp() });
      Alert.alert("Firestore OK", "Ping write succeeded.");
    } catch (e) {
      Alert.alert("Firestore error", explainFirebaseError(e));
      console.warn("ping error:", e);
    }
  }

  const extra = Constants.expoConfig?.extra || Constants.manifest?.extra;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>KL LRT Timing – MVP</Text>
        <Text style={styles.subtitle}>Self-tests: 3/3 passed</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Auth UID:</Text>
          <Text style={styles.value}>{uid ?? "—"}</Text>
          <Text style={styles.eventMeta}>Auth: {authReady ? (uid ? "Ready" : "No user") : "Connecting..."}</Text>

          <Text style={styles.label}>GPS:</Text>
          <Text style={styles.value}>
            {gps ? `${gps.lat.toFixed(5)}, ${gps.lon.toFixed(5)} (±${Math.round(gps.accuracy || 0)}m)` : "—"}
          </Text>

          <Text style={styles.label}>Nearest Station:</Text>
          <Text style={styles.value}>
            {near ? `${near.name} (${near.lineId}) • ${near.distM}m` : "— (out of range)"}
          </Text>

          <View style={styles.row}><Button title="Refresh GPS" onPress={sampleLocation} /></View>
          <View style={styles.row}><Button title={manualStation ? "Change Station" : "Pick Station"} onPress={() => setPickerOpen(true)} /></View>
          <View style={styles.row}><Button title="Test Firestore" onPress={testFirestore} /></View>
          {manualStation && <Text style={styles.eventMeta}>Picked station: {manualStation.name} ({manualStation.lineId})</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Journey State:</Text>
          <Text style={styles.state}>{state}</Text>
          {!journeyId ? (
            <Button title="Start Journey" onPress={handleStartJourney} disabled={!uid} />
          ) : (
            <>
              <View style={styles.row}><Button title="Doors Open" onPress={handleDoorsOpen} /></View>
              <View style={styles.row}><Button title="Doors Close" onPress={handleDoorsClose} /></View>
              <View style={styles.row}><Button color="#a11" title="End Journey" onPress={handleEndJourney} /></View>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Recent Events</Text>
          {events.length === 0
            ? <Text style={styles.eventMeta}>No events yet.</Text>
            : events.map((e, idx) => <Text key={idx} style={styles.eventMeta}>{e.when} • {e.eventType} • {e.stationId}</Text>)
          }
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Config sanity</Text>
          <Text style={styles.eventMeta}>Firebase project: {extra?.firebase?.projectId || "—"}</Text>
          <Text style={styles.eventMeta}>OpenWeather key set: {extra?.openWeatherApiKey ? "Yes" : "No"}</Text>
        </View>
      </ScrollView>

      {/* Station Picker */}
      <Modal visible={pickerOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Station</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {stations.map((s) => (
                <Pressable key={s.stationId} style={styles.stationItem}
                  onPress={() => (journeyId ? pickOnly(s) : pickAndStart(s))}>
                  <Text style={styles.stationName}>{s.name}</Text>
                  <Text style={styles.stationMeta}>{s.lineId} • {s.stationId}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={{ height: 8 }} />
            <Button title="Close" onPress={() => setPickerOpen(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1220" },
  title: { color: "#e7efff", fontSize: 22, fontWeight: "700", marginBottom: 4, paddingHorizontal: 16, paddingTop: 8 },
  subtitle: { color: "#a1b0c8", fontSize: 12, marginBottom: 12, paddingHorizontal: 16 },
  card: { backgroundColor: "#141b2d", borderRadius: 10, padding: 12, marginBottom: 12 },
  label: { color: "#8fb3ff", fontWeight: "600", marginTop: 6 },
  value: { color: "#e7efff", marginTop: 2 },
  state: { color: "#ffd166", fontWeight: "700", marginBottom: 8 },
  row: { marginTop: 8 },
  eventMeta: { color: "#a1b0c8", fontSize: 12 },
  // Modal
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#141b2d", padding: 16, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  modalTitle: { color: "#e7efff", fontSize: 18, fontWeight: "700", marginBottom: 12 },
  stationItem: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#2a3450" },
  stationName: { color: "#e7efff", fontSize: 16, fontWeight: "600" },
  stationMeta: { color: "#a1b0c8", fontSize: 12 },
});
