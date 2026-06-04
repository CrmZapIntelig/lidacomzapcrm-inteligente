import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBcwx-yl9i_J1nJldAjjVGb7OC-9O-dOG4",
  authDomain: "project-1300957a-ea82-4645-845.firebaseapp.com",
  projectId: "project-1300957a-ea82-4645-845",
  storageBucket: "project-1300957a-ea82-4645-845.firebasestorage.app",
  messagingSenderId: "483558069545",
  appId: "1:483558069545:web:74afce08cd3071e7f6d338"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;