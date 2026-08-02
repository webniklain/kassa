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
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
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

let db;

try {
  db = initializeFirestore(firebaseApp, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (error) {
  console.warn(
    "Постоянный офлайн-кэш Firestore недоступен. Используется память вкладки.",
    error,
  );
  db = getFirestore(firebaseApp);
}

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Не удалось сохранить Firebase-сессию:", error);
});

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

    case "auth/unauthorized-domain":
      return "Этот адрес сайта не разрешён в Firebase Authentication";

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

  if (!element) {
    return;
  }

  element.textContent = message;
  element.hidden = !message;
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
    await signInWithEmailAndPassword(auth, email, password);
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

  document
    .getElementById("login-form")
    ?.addEventListener("submit", handleLoginSubmit);

  document
    .getElementById("logout-button")
    ?.addEventListener("click", handleLogout);
}

const authSubscribers = new Set();
let currentAuthUser = null;
let initialAuthResolved = false;
let resolveInitialAuth;

const initialAuthPromise = new Promise((resolve) => {
  resolveInitialAuth = resolve;
});

onAuthStateChanged(auth, (user) => {
  currentAuthUser = user;

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

  if (!initialAuthResolved) {
    initialAuthResolved = true;
    resolveInitialAuth(user);
  }

  authSubscribers.forEach((subscriber) => {
    subscriber(user);
  });
});

function subscribeToAuth(callback) {
  authSubscribers.add(callback);

  if (initialAuthResolved) {
    callback(currentAuthUser);
  }

  return () => {
    authSubscribers.delete(callback);
  };
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    registerAuthListeners,
    { once: true },
  );
} else {
  registerAuthListeners();
}

export {
  auth,
  db,
  initialAuthPromise,
  subscribeToAuth,
};
