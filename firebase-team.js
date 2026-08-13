// Team code system for HH Goa Team mode.
// Fill in the 6 values below from your Firebase project
// (console.firebase.google.com -> Project settings -> Your apps -> Web app config).
const firebaseConfig = {
  apiKey: "AIzaSyBN54-fki-QoMv3FSSkUcUOa5rKbRamPnQ",
  authDomain: "hhgoa-id-82471.firebaseapp.com",
  projectId: "hhgoa-id-82471",
  storageBucket: "hhgoa-id-82471.firebasestorage.app",
  messagingSenderId: "411061262553",
  appId: "1:411061262553:web:2746458e4a4431c22a86c8",
};

const isConfigured = !firebaseConfig.apiKey.startsWith("PASTE");
let db = null;

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function createTeam(teamName, role, hostName) {
  if (!db) throw new Error("not-configured");
  const { doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  const code = randomCode();
  await setDoc(doc(db, "hhgoa_teams", code), {
    teamName: teamName || "HH GOA TEAM",
    role: role || "",
    members: [hostName || "Host"],
    createdAt: serverTimestamp(),
  });
  return code;
}

async function joinTeam(code, memberName) {
  if (!db) throw new Error("not-configured");
  const { doc, getDoc, updateDoc, arrayUnion } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  const ref = doc(db, "hhgoa_teams", code.toUpperCase().trim());
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("not-found");
  if (memberName) await updateDoc(ref, { members: arrayUnion(memberName) });
  const fresh = await getDoc(ref);
  return fresh.data();
}

async function init() {
  if (isConfigured) {
    try {
      const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
      const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      const app = initializeApp(firebaseConfig);
      db = getFirestore(app);
    } catch (error) {
      console.warn("Firebase failed to initialize:", error);
    }
  }
  window.hhFirebase = { isConfigured: isConfigured && !!db, createTeam, joinTeam };
  window.dispatchEvent(new Event("hh-firebase-ready"));
}

init();
