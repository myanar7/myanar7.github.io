// Firebase Konfigürasyonu
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyARyz3oNgzvIEIp33nmG9JvzTvy8uVhaH8",
    authDomain: "jungle-log.firebaseapp.com",
    databaseURL: "https://jungle-log-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "jungle-log",
    storageBucket: "jungle-log.firebasestorage.app",
    messagingSenderId: "358753101681",
    appId: "1:358753101681:web:e6d7e5aec2caa123b578d0",
    measurementId: "G-009VFHVTSC"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Offline mode için fallback
let isOnline = navigator.onLine;

// Internet bağlantısı kontrolü
window.addEventListener('online', () => {
    isOnline = true;
    console.log('🌐 Internet bağlantısı sağlandı');
});

window.addEventListener('offline', () => {
    isOnline = false;
    console.log('❌ Internet bağlantısı kesildi');
});

// Bağlantı durumu kontrolü
export const checkConnection = () => {
    return isOnline;
};

export { db, analytics };
