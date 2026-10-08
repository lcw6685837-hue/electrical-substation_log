// ===== Firebase 공통 설정 (index.html, login.html에서 공유) =====
const firebaseConfig = {
    apiKey: "AIzaSyA_JNWO5Ke5ZVJDnwP06QW9WsZXNZFv0bc",
    authDomain: "sundochem-dashboard.firebaseapp.com",
    databaseURL: "https://sundochem-dashboard-default-rtdb.firebaseio.com",
    projectId: "sundochem-dashboard",
    storageBucket: "sundochem-dashboard.firebasestorage.app",
    messagingSenderId: "360796635566",
    appId: "1:360796635566:web:d3bf85eb5e5e1574b5483f"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
