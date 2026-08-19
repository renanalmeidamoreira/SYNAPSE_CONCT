import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseAppletConfig from "../../firebase-applet-config.json";

const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey || "AIzaSyCeKenk84DwnQFJF2K6pyEawdS54D8DtWk",
  authDomain: firebaseAppletConfig.authDomain || "gen-lang-client-0592683985.firebaseapp.com",
  databaseURL: "https://gen-lang-client-0592683985-default-rtdb.firebaseio.com",
  projectId: firebaseAppletConfig.projectId || "gen-lang-client-0592683985",
  storageBucket: firebaseAppletConfig.storageBucket || "gen-lang-client-0592683985.firebasestorage.app",
  messagingSenderId: firebaseAppletConfig.messagingSenderId || "115590423874",
  appId: firebaseAppletConfig.appId || "1:115590423874:web:8de3eab85b53d1c20494db"
};

const app = initializeApp(firebaseConfig);

let firestoreDb: ReturnType<typeof getFirestore>;
try {
  firestoreDb = getFirestore(app);
} catch (e) {
  console.warn('Fallback silencioso de inicialização do Firestore:', e);
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
export const auth = getAuth(app);


