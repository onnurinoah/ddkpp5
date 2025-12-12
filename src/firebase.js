import firebase from "firebase/compat/app";
import "firebase/compat/database";

const firebaseConfig = {
  apiKey: "AIzaSyDlDvuA4NCjQxfH2Z1wUI89jybVGzLZHBA",
  authDomain: "memory-984c9.firebaseapp.com",
  projectId: "memory-984c9",
  storageBucket: "memory-984c9.firebasestorage.app",
  messagingSenderId: "361490884024",
  appId: "1:361490884024:web:b546dedbda87ca12555b4d",
  measurementId: "G-YT8VY0THF1",
  databaseURL: "https://memory-984c9-default-rtdb.firebaseio.com",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const db = firebase.database();
