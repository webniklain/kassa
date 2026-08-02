const STORAGE_KEYS = {
  transactions: "kassa-transactions",
  categories: "kassa-categories",
  monthlyBudgets: "kassa-monthly-budgets",
  lastCategory: "kassa-last-category",
};

const DEFAULT_CATEGORIES = [
  {
    id: "category-products",
    name: "Продукты",
    icon: "🛒",
    isArchived: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "category-child",
    name: "Сын",
    icon: "👦",
    isArchived: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "category-other",
    name: "Прочее",
    icon: "📦",
    isArchived: false,
    createdAt: new Date().toISOString(),
  },
];

function readJson(key, fallbackValue) {
  try {
    const rawValue = localStorage.getItem(key);

    if (!rawValue) {
      return fallbackValue;
    }

    return JSON.parse(rawValue);
  } catch (error) {
    console.error(`Не удалось прочитать данные: ${key}`, error);
    return fallbackValue;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Не удалось сохранить данные: ${key}`, error);
    return false;
  }
}

function loadTransactions() {
  const transactions = readJson(STORAGE_KEYS.transactions, []);
  return Array.isArray(transactions) ? transactions : [];
}

function saveTransactions(transactions) {
  if (!Array.isArray(transactions)) {
    throw new TypeError("transactions должен быть массивом");
  }

  return writeJson(STORAGE_KEYS.transactions, transactions);
}

function loadCategories() {
  const categories = readJson(STORAGE_KEYS.categories, null);

  if (!Array.isArray(categories) || categories.length === 0) {
    saveCategories(DEFAULT_CATEGORIES);
    return [...DEFAULT_CATEGORIES];
  }

  return categories;
}

function saveCategories(categories) {
  if (!Array.isArray(categories)) {
    throw new TypeError("categories должен быть массивом");
  }

  return writeJson(STORAGE_KEYS.categories, categories);
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

function loadLastCategoryId() {
  return localStorage.getItem(STORAGE_KEYS.lastCategory) || "";
}

function saveLastCategoryId(categoryId) {
  if (!categoryId) {
    localStorage.removeItem(STORAGE_KEYS.lastCategory);
    return;
  }

  localStorage.setItem(STORAGE_KEYS.lastCategory, categoryId);
}