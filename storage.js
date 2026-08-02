const STORAGE_KEYS = {
  transactions: "family-budget-transactions",
  monthlyBudgets: "family-budget-monthly-budgets",
};

function readJson(key, fallbackValue) {
  try {
    const rawValue = localStorage.getItem(key);

    if (!rawValue) {
      return fallbackValue;
    }

    return JSON.parse(rawValue);
  } catch (error) {
    console.error(`Не удалось прочитать данные из localStorage: ${key}`, error);
    return fallbackValue;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Не удалось сохранить данные в localStorage: ${key}`, error);
    return false;
  }
}

function loadTransactions() {
  const transactions = readJson(STORAGE_KEYS.transactions, []);

  if (!Array.isArray(transactions)) {
    return [];
  }

  return transactions;
}

function saveTransactions(transactions) {
  if (!Array.isArray(transactions)) {
    throw new TypeError("transactions должен быть массивом");
  }

  return writeJson(STORAGE_KEYS.transactions, transactions);
}

function loadMonthlyBudgets() {
  const monthlyBudgets = readJson(STORAGE_KEYS.monthlyBudgets, {});

  if (
    typeof monthlyBudgets !== "object" ||
    monthlyBudgets === null ||
    Array.isArray(monthlyBudgets)
  ) {
    return {};
  }

  return monthlyBudgets;
}

function saveMonthlyBudgets(monthlyBudgets) {
  if (
    typeof monthlyBudgets !== "object" ||
    monthlyBudgets === null ||
    Array.isArray(monthlyBudgets)
  ) {
    throw new TypeError("monthlyBudgets должен быть объектом");
  }

  return writeJson(STORAGE_KEYS.monthlyBudgets, monthlyBudgets);
}

function clearStoredData() {
  localStorage.removeItem(STORAGE_KEYS.transactions);
  localStorage.removeItem(STORAGE_KEYS.monthlyBudgets);
}