/**
 * Firebase 與 API 設定
 * 部署前請替換為你的 Firebase 專案設定值
 */
const firebaseConfig = {
  apiKey: "AIzaSyBzs_-6-VjLWnoEXcxkUwiUKEr_d7W9WnM",
  authDomain: "daka-6e720.firebaseapp.com",
  projectId: "daka-6e720",
  storageBucket: "daka-6e720.firebasestorage.app",
  messagingSenderId: "105424679416",
  appId: "1:105424679416:web:7bdac570051ff93db9a60d",
  measurementId: "G-V34B9ZZ8D1"
};

firebase.initializeApp(firebaseConfig);

const firebaseAuth = firebase.auth();
const API_BASE = "/api";

