import {
  initializeApp,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

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
    "Постоянный кэш Firestore недоступен:",
    error,
  );

  db = getFirestore(firebaseApp);
}

/*
 * Дожидаемся включения локального хранения сессии,
 * прежде чем разрешать пользователю входить.
 */
const authPersistenceReady = setPersistence(
  auth,
  browserLocalPersistence,
).catch((error) => {
  console.error(
    "Не удалось включить сохранение авторизации:",
    error,
  );
});

const authSubscribers = new Set();

let currentAuthUser = null;
let initialAuthResolved = false;
let resolveInitialAuth;

const initialAuthPromise = new Promise((resolve) => {
  resolveInitialAuth = resolve;
});

function getInterfaceElements() {
  return {
    loginScreen: document.getElementById("login-screen"),
    app: document.querySelector(".app"),
    floatingButton: document.getElementById(
      "open-record-dialog-button",
    ),
    userEmail: document.getElementById(
      "current-user-email",
    ),
  };
}

function updateAuthInterface(user) {
  const {
    loginScreen,
    app,
    floatingButton,
    userEmail,
  } = getInterfaceElements();

  const isAuthenticated = Boolean(user);

  /*
   * Управляем отображением напрямую.
   * CSS-классы остаются дополнительным механизмом.
   */
  if (loginScreen) {
    loginScreen.hidden = isAuthenticated;
  }

  if (app) {
    app.hidden = !isAuthenticated;
  }

  if (floatingButton) {
    floatingButton.hidden = !isAuthenticated;
  }

  document.body.classList.toggle(
    "is-authenticated",
    isAuthenticated,
  );

  document.body.classList.toggle(
    "is-guest",
    !isAuthenticated,
  );

  if (userEmail) {
    userEmail.textContent = user?.email || "";
  }
}

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
      return "Этот адрес сайта не разрешён в Firebase";

    case "auth/operation-not-allowed":
      return "Вход по email и паролю не включён в Firebase";

    default:
      console.error("Firebase Auth error:", error);

      return `Не удалось выполнить вход: ${
        error?.code || "неизвестная ошибка"
      }`;
  }
}

function setAuthLoading(isLoading) {
  const button = document.getElementById(
    "login-submit-button",
  );

  if (!button) {
    return;
  }

  button.disabled = isLoading;
  button.textContent = isLoading
    ? "Входим…"
    : "Войти";
}

function showLoginError(message = "") {
  const element = document.getElementById(
    "login-error",
  );

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

  const emailInput =
    document.getElementById("login-email");

  const passwordInput =
    document.getElementById("login-password");

  const email = emailInput?.value.trim() || "";
  const password = passwordInput?.value || "";

  try {
    await authPersistenceReady;

    const userCredential =
      await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );

    /*
     * Не ждём только onAuthStateChanged:
     * сразу переключаем интерфейс после успешного входа.
     */
    currentAuthUser = userCredential.user;
    updateAuthInterface(userCredential.user);

    if (passwordInput) {
      passwordInput.value = "";
    }
  } catch (error) {
    console.error("Ошибка входа:", error);
    showLoginError(getReadableAuthError(error));
  } finally {
    setAuthLoading(false);
  }
}

async function handleLogout() {
  try {
    await signOut(auth);

    currentAuthUser = null;
    updateAuthInterface(null);
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
    ?.addEventListener(
      "submit",
      handleLoginSubmit,
    );

  document
    .getElementById("logout-button")
    ?.addEventListener(
      "click",
      handleLogout,
    );
}

/*
 * Главный источник состояния авторизации.
 */
onAuthStateChanged(
  auth,

  (user) => {
    console.log(
      "Firebase Auth:",
      user ? `вход выполнен: ${user.email}` : "гость",
    );

    currentAuthUser = user;
    updateAuthInterface(user);

    if (!initialAuthResolved) {
      initialAuthResolved = true;
      resolveInitialAuth(user);
    }

    authSubscribers.forEach((subscriber) => {
      try {
        subscriber(user);
      } catch (error) {
        console.error(
          "Ошибка обработчика авторизации:",
          error,
        );
      }
    });
  },

  (error) => {
    console.error(
      "Ошибка восстановления Firebase-сессии:",
      error,
    );

    currentAuthUser = null;
    updateAuthInterface(null);

    showLoginError(
      "Не удалось проверить сессию. Обновите страницу.",
    );

    if (!initialAuthResolved) {
      initialAuthResolved = true;
      resolveInitialAuth(null);
    }
  },
);

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
    () => {
      registerAuthListeners();

      /*
       * Если состояние Firebase уже определилось до загрузки DOM,
       * применяем его к только что появившимся элементам.
       */
      if (initialAuthResolved) {
        updateAuthInterface(currentAuthUser);
      }
    },
    { once: true },
  );
} else {
  registerAuthListeners();
  updateAuthInterface(currentAuthUser);
}

export {
  auth,
  db,
  initialAuthPromise,
  subscribeToAuth,
};