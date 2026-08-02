import {
  initialAuthPromise,
  subscribeToAuth,
} from "./firebase.js";

import {
  clearCloudTransactions,
  deleteCloudTransaction,
  ensureFamilyDocument,
  migrateLocalDataToCloud,
  saveCloudBudget,
  saveCloudCategory,
  saveCloudTransaction,
  subscribeToFamilyData,
  verifyFamilyMembership,
} from "./firestore.js";

let transactions = loadTransactions();
let categories = loadCategories();
let monthlyBudgets = loadMonthlyBudgets();
let lastCategoryId = loadLastCategoryId();
let currentUser = null;
let stopCloudSubscription = null;
let eventListenersRegistered = false;
let dayRefreshTimer = null;

function getLocalDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

let lastRenderedDayKey = getLocalDayKey();

function setSyncStatus(message, state = "idle") {
  const element = document.getElementById("sync-status");

  if (!element) {
    return;
  }

  element.textContent = message;
  element.dataset.state = state;
}

function refreshApp() {
  const summary = calculateMonthlySummary(
    transactions,
    monthlyBudgets,
    new Date(),
  );

  renderSummary(summary);

  const dailyRecommendation =
    calculateDailyRecommendation(summary, new Date());

  renderDailyRecommendation(
    dailyRecommendation,
    summary.budget > 0,
  );

  renderCategoryOptions(categories);

  renderTransactions(
    transactions,
    categories,
    handleEditTransaction,
    handleDeleteTransaction,
  );
}

let dayRefreshTimer = null;

function getLocalDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

let lastRenderedDayKey = getLocalDayKey();

function handleEditTransaction(transactionId) {
  const transaction = transactions.find(
    (item) => item.id === transactionId,
  );

  if (!transaction) {
    showError("Запись не найдена");
    return;
  }

  openTransactionDialog(
    transaction.type,
    categories,
    transaction,
  );
}

async function handleDeleteTransaction(transactionId) {
  const confirmed = window.confirm("Удалить эту операцию?");

  if (!confirmed) {
    return;
  }

  try {
    setSyncStatus("Удаляем…", "syncing");
    await deleteCloudTransaction(transactionId);
    setSyncStatus("Синхронизировано", "online");
  } catch (error) {
    console.error(error);
    setSyncStatus("Ошибка синхронизации", "error");
    showError(error.message || "Не удалось удалить операцию");
  }
}

async function handleTransactionSubmit(event) {
  event.preventDefault();

  try {
    if (!currentUser) {
      throw new Error("Сначала войдите в приложение");
    }

    const values = getTransactionFormValues();
    let transaction;

    if (values.type === "expense" && values.categoryId) {
      lastCategoryId = values.categoryId;
      saveLastCategoryId(lastCategoryId);
    }

    if (values.id) {
      const updatedTransactions = updateTransactionById(
        transactions,
        values.id,
        values,
      );

      transaction = updatedTransactions.find(
        (item) => item.id === values.id,
      );
    } else {
      transaction = createTransaction(values);
    }

    setSyncStatus("Сохраняем…", "syncing");
    await saveCloudTransaction(transaction, currentUser);

    closeTransactionDialog();
    setSyncStatus("Синхронизировано", "online");
  } catch (error) {
    console.error(error);
    setSyncStatus("Ошибка синхронизации", "error");
    showError(
      error.message || "Не удалось сохранить запись",
    );
  }
}

async function handleCategorySubmit(event) {
  event.preventDefault();

  try {
    if (!currentUser) {
      throw new Error("Сначала войдите в приложение");
    }

    const name = getNewCategoryName();

    if (categoryNameExists(categories, name)) {
      showError("Такая категория уже существует");
      return;
    }

    const category = createCategory(name);

    setSyncStatus("Сохраняем…", "syncing");
    await saveCloudCategory(category, currentUser);

    lastCategoryId = category.id;
    saveLastCategoryId(lastCategoryId);

    renderCategoryOptions(
      [...categories, category],
      category.id,
    );

    renderQuickCategories(
      [...categories, category],
      category.id,
    );

    closeCategoryDialog();
    setSyncStatus("Синхронизировано", "online");
  } catch (error) {
    console.error(error);
    setSyncStatus("Ошибка синхронизации", "error");
    showError(error.message || "Не удалось создать категорию");
  }
}

async function handleBudgetSubmit(event) {
  event.preventDefault();

  try {
    if (!currentUser) {
      throw new Error("Сначала войдите в приложение");
    }

    const budget = getBudgetFormValue();

    if (!Number.isFinite(budget) || budget < 0) {
      showError("Введите корректную сумму бюджета");
      return;
    }

    const currentMonthKey = getMonthKey(new Date());

    setSyncStatus("Сохраняем…", "syncing");
    await saveCloudBudget(
      currentMonthKey,
      budget,
      currentUser,
    );

    closeBudgetDialog();
    setSyncStatus("Синхронизировано", "online");
  } catch (error) {
    console.error(error);
    setSyncStatus("Ошибка синхронизации", "error");
    showError(error.message || "Не удалось сохранить бюджет");
  }
}

async function handleClearAll() {
  if (transactions.length === 0) {
    return;
  }

  const confirmed = window.confirm(
    "Удалить все операции у обоих пользователей? Отменить это действие будет невозможно.",
  );

  if (!confirmed) {
    return;
  }

  try {
    setSyncStatus("Удаляем операции…", "syncing");
    await clearCloudTransactions();
    setSyncStatus("Синхронизировано", "online");
  } catch (error) {
    console.error(error);
    setSyncStatus("Ошибка синхронизации", "error");
    showError(error.message || "Не удалось очистить операции");
  }
}

function closeDialogWhenBackdropClicked(event) {
  const dialog = event.currentTarget;

  if (event.target === dialog) {
    dialog.close();
  }
}

function registerEventListeners() {
  if (eventListenersRegistered) {
    return;
  }

  eventListenersRegistered = true;

  document
    .getElementById("transaction-category")
    .addEventListener("change", (event) => {
      renderQuickCategories(
        categories,
        event.target.value,
      );
    });

  document
    .getElementById("open-record-dialog-button")
    .addEventListener("click", openRecordDialog);

  document
    .getElementById("close-record-dialog")
    .addEventListener("click", closeRecordDialog);

  document
    .getElementById("record-expense-button")
    .addEventListener("click", () => {
      closeRecordDialog();
      openTransactionDialog(
        "expense",
        categories,
        null,
        lastCategoryId,
      );
    });

  document
    .getElementById("record-income-button")
    .addEventListener("click", () => {
      closeRecordDialog();
      openTransactionDialog("income", categories);
    });

  document
    .getElementById("open-budget-button")
    .addEventListener("click", () => {
      const currentMonthKey = getMonthKey(new Date());
      const currentBudget =
        Number(monthlyBudgets[currentMonthKey]) || 0;

      openBudgetDialog(currentBudget);
    });

  document
    .getElementById("close-transaction-dialog")
    .addEventListener("click", closeTransactionDialog);

  document
    .getElementById("close-budget-dialog")
    .addEventListener("click", closeBudgetDialog);

  document
    .getElementById("transaction-form")
    .addEventListener("submit", handleTransactionSubmit);

  document
    .getElementById("budget-form")
    .addEventListener("submit", handleBudgetSubmit);

  document
    .getElementById("clear-all-button")
    .addEventListener("click", handleClearAll);

  document
    .getElementById("transaction-dialog")
    .addEventListener(
      "click",
      closeDialogWhenBackdropClicked,
    );

  document
    .getElementById("budget-dialog")
    .addEventListener(
      "click",
      closeDialogWhenBackdropClicked,
    );

  document
    .getElementById("add-category-button")
    .addEventListener("click", openCategoryDialog);

  document
    .getElementById("category-form")
    .addEventListener("submit", handleCategorySubmit);

  document
    .getElementById("close-category-dialog")
    .addEventListener("click", closeCategoryDialog);

  document
    .getElementById("record-dialog")
    .addEventListener(
      "click",
      closeDialogWhenBackdropClicked,
    );
}

function stopCloudSession() {
  stopCloudSubscription?.();
  stopCloudSubscription = null;
  currentUser = null;
  setSyncStatus("Не подключено", "idle");
}

async function startCloudSession(user) {
  stopCloudSession();
  currentUser = user;

  setSyncStatus("Подключаем облако…", "syncing");

  try {
    await ensureFamilyDocument();
    await verifyFamilyMembership(user);

    await migrateLocalDataToCloud({
      user,
      transactions: loadTransactions(),
      categories: loadCategories(),
      monthlyBudgets: loadMonthlyBudgets(),
    });

    stopCloudSubscription = subscribeToFamilyData({
      onTransactions(nextTransactions) {
        transactions = nextTransactions;
        saveTransactions(transactions);
        refreshApp();
        setSyncStatus("Синхронизировано", "online");
      },

      onCategories(nextCategories) {
        categories = nextCategories.length > 0
          ? nextCategories
          : [...DEFAULT_CATEGORIES];

        saveCategories(categories);
        refreshApp();
        setSyncStatus("Синхронизировано", "online");
      },

      onBudgets(nextBudgets) {
        monthlyBudgets = nextBudgets;
        saveMonthlyBudgets(monthlyBudgets);
        refreshApp();
        setSyncStatus("Синхронизировано", "online");
      },

      onError(error) {
        console.error("Firestore subscription error:", error);
        setSyncStatus("Ошибка доступа к облаку", "error");
        showError(
          error.code === "permission-denied"
            ? "Firestore отклонил доступ. Проверьте Rules и документы members."
            : "Не удалось синхронизировать данные",
        );
      },
    });
  } catch (error) {
    console.error("Не удалось запустить облачную сессию:", error);
    setSyncStatus("Облако не подключено", "error");
    showError(error.message || "Не удалось подключить Firestore");
  }
}

function handleAuthChange(user) {
  if (!user) {
    stopCloudSession();
    return;
  }

  startCloudSession(user);
}

function startApp() {
  registerEventListeners();
  registerDateRefreshListeners();
  refreshAppForCurrentDate();
  subscribeToAuth(handleAuthChange);
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    startApp,
    { once: true },
  );
} else {
  startApp();
}

await initialAuthPromise;
