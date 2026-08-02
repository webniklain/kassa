import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from
  "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  getFirestore,
} from
  "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAR85_qNqaARJMH_a_RVlk6m4AdBE1LrpI",
  authDomain: "kassa-767ea.firebaseapp.com",
  projectId: "kassa-767ea",
  storageBucket: "kassa-767ea.firebasestorage.app",
  messagingSenderId: "1032842360389",
  appId: "1:1032842360389:web:2cae218fec45eb43ca952c",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

await setPersistence(auth, browserLocalPersistence);

function getReadableAuthError(error) {
  switch (error?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Неверный email или пароль";

    case "auth/invalid-email":
      return "Введите корректный email";

    case "auth/too-many-requests":
      return "Слишком много попыток. Попробуйте немного позже";

    case "auth/network-request-failed":
      return "Не удалось подключиться к интернету";

    default:
      console.error("Firebase Auth error:", error);
      return "Не удалось выполнить вход";
  }
}

function setAuthLoading(isLoading) {
  const button = document.getElementById("login-submit-button");

  if (!button) {
    return;
  }

  button.disabled = isLoading;
  button.textContent = isLoading ? "Входим…" : "Войти";
}

function showLoginError(message = "") {
  const element = document.getElementById("login-error");

  if (element) {
    element.textContent = message;
    element.hidden = !message;
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  showLoginError("");
  setAuthLoading(true);

  const email = document
    .getElementById("login-email")
    .value
    .trim();

  const password = document
    .getElementById("login-password")
    .value;

    try {
    const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
    );

    console.log(
        "Вход выполнен:",
        userCredential.user.email,
    );

    document.getElementById("login-password").value = "";
    } catch (error) {
    showLoginError(getReadableAuthError(error));
  } finally {
    setAuthLoading(false);
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Не удалось выйти:", error);
  }
}

let authListenersRegistered = false;

function registerAuthListeners() {
  if (authListenersRegistered) {
    return;
  }

  authListenersRegistered = true;

  const loginForm = document.getElementById("login-form");
  const logoutButton = document.getElementById("logout-button");

  loginForm?.addEventListener("submit", handleLoginSubmit);
  logoutButton?.addEventListener("click", handleLogout);
}

onAuthStateChanged(auth, (user) => {
  console.log(
    "Состояние Firebase Auth:",
    user ? `выполнен вход: ${user.email}` : "гость",
  );

  document.body.classList.toggle(
    "is-authenticated",
    Boolean(user),
  );

  document.body.classList.toggle(
    "is-guest",
    !user,
  );

  const userEmail = document.getElementById(
    "current-user-email",
  );

  if (userEmail) {
    userEmail.textContent = user?.email || "";
  }

  window.dispatchEvent(
    new CustomEvent("kassa-auth-changed", {
      detail: { user },
    }),
  );
});

window.KassaFirebase = {
  auth,
  db,
  getCurrentUser() {
    return auth.currentUser;
  },
};

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    registerAuthListeners,
    { once: true },
  );
} else {
  registerAuthListeners();
}