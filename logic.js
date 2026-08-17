function getMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function isSameDay(firstDate, secondDate) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

function isDateWithinLastDays(date, numberOfDays, today = new Date()) {
  const currentDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const checkedDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  const startDate = new Date(currentDay);
  startDate.setDate(startDate.getDate() - (numberOfDays - 1));

  return checkedDay >= startDate && checkedDay <= currentDay;
}

function getTransactionsForMonth(transactions, monthKey) {
  return transactions.filter((transaction) =>
    transaction.date.startsWith(monthKey),
  );
}

function sumTransactions(transactions, type) {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
}

function getTodayExpenses(transactions, today = new Date()) {
  return transactions
    .filter((transaction) => {
      if (transaction.type !== "expense") {
        return false;
      }

      return isSameDay(parseLocalDate(transaction.date), today);
    })
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
}

function getLastSevenDaysExpenses(transactions, today = new Date()) {
  return transactions
    .filter((transaction) => {
      if (transaction.type !== "expense") {
        return false;
      }

      return isDateWithinLastDays(
        parseLocalDate(transaction.date),
        7,
        today,
      );
    })
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
}

function getCategoryBehaviorMap(categories = []) {
  return new Map(
    categories.map((category) => [
      category.id,
      category.budgetBehavior || "normal",
    ]),
  );
}

function calculateRecommendationExpenses(
  transactions,
  categories,
  monthlyPlan = {},
  date = new Date(),
) {
  const behaviorByCategory = getCategoryBehaviorMap(categories);
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const plannedPayments = monthlyPlan.plannedPayments || {};
  const monthKey = getMonthKey(date);
  const monthExpenses = getTransactionsForMonth(transactions, monthKey)
    .filter((transaction) => transaction.type === "expense");

  const reservedActualByCategory = new Map();
  let ordinaryExpenses = 0;
  let compensatedExpenses = 0;

  monthExpenses.forEach((transaction) => {
    const amount = Number(transaction.amount) || 0;
    const behavior = behaviorByCategory.get(transaction.categoryId) || "normal";

    if (behavior === "compensated") {
      compensatedExpenses += amount;
      return;
    }

    if (behavior === "reserved") {
      reservedActualByCategory.set(
        transaction.categoryId,
        (reservedActualByCategory.get(transaction.categoryId) || 0) + amount,
      );
      return;
    }

    ordinaryExpenses += amount;
  });

  const reservedCategoryIds = new Set([
    ...Object.keys(plannedPayments),
    ...reservedActualByCategory.keys(),
  ]);

  const reserveItems = [...reservedCategoryIds]
    .filter((categoryId) => (behaviorByCategory.get(categoryId) || "normal") === "reserved")
    .map((categoryId) => {
      const planned = Number(plannedPayments[categoryId]) || 0;
      const actual = reservedActualByCategory.get(categoryId) || 0;
      return {
        categoryId,
        name: categoryById.get(categoryId)?.name || "Категория",
        icon: categoryById.get(categoryId)?.icon || "📦",
        planned,
        actual,
        remaining: Math.max(0, planned - actual),
        overrun: Math.max(0, actual - planned),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));

  const plannedTotal = reserveItems.reduce((sum, item) => sum + item.planned, 0);
  const remainingReserve = reserveItems.reduce((sum, item) => sum + item.remaining, 0);
  const reservedOverrun = reserveItems.reduce((sum, item) => sum + item.overrun, 0);

  // В дневной лимит входят обычные расходы и только та часть обязательных
  // расходов, которая в текущий день вышла за оставшийся на начало дня резерв.
  const todayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let countableToday = 0;
  const reservedBeforeToday = new Map();
  const reservedToday = new Map();

  monthExpenses.forEach((transaction) => {
    const behavior = behaviorByCategory.get(transaction.categoryId) || "normal";
    const amount = Number(transaction.amount) || 0;
    const transactionDate = parseLocalDate(transaction.date);

    if (behavior === "compensated") return;

    if (behavior === "normal") {
      if (isSameDay(transactionDate, date)) countableToday += amount;
      return;
    }

    if (behavior === "reserved") {
      const target = transactionDate < todayStart
        ? reservedBeforeToday
        : isSameDay(transactionDate, date) ? reservedToday : null;
      if (target) {
        target.set(transaction.categoryId, (target.get(transaction.categoryId) || 0) + amount);
      }
    }
  });

  reservedToday.forEach((todayAmount, categoryId) => {
    const before = reservedBeforeToday.get(categoryId) || 0;
    const planned = Number(plannedPayments[categoryId]) || 0;
    countableToday += Math.max(0, before + todayAmount - planned) - Math.max(0, before - planned);
  });

  return {
    plannedTotal,
    remainingReserve,
    ordinaryExpenses,
    compensatedExpenses,
    reservedOverrun,
    reserveItems,
    countableToday,
  };
}

function calculateMonthlySummary(
  transactions,
  monthlyBudgets,
  date = new Date(),
  categories = [],
  monthlyPlans = {},
) {
  const monthKey = getMonthKey(date);
  const monthTransactions = getTransactionsForMonth(
    transactions,
    monthKey,
  );

  const budget = Number(monthlyBudgets[monthKey] || 0);
  const income = sumTransactions(monthTransactions, "income");
  const expenses = sumTransactions(monthTransactions, "expense");
  const balance = budget + income - expenses;
  const monthlyPlan = monthlyPlans[monthKey] || {};

  const recommendationExpenses = calculateRecommendationExpenses(
    transactions,
    categories,
    monthlyPlan,
    date,
  );

  // Считаем от реального текущего остатка: компенсируемые расходы возвращаем
  // в расчёт, а из обязательных вычитаем только НЕИЗРАСХОДОВАННЫЙ резерв.
  const recommendationBalance =
    balance +
    recommendationExpenses.compensatedExpenses -
    recommendationExpenses.remainingReserve;

  return {
    monthKey,
    budget,
    income,
    expenses,
    balance,
    recommendationBalance,
    plannedTotal: recommendationExpenses.plannedTotal,
    remainingReserve: recommendationExpenses.remainingReserve,
    compensatedExpenses: recommendationExpenses.compensatedExpenses,
    reservedOverrun: recommendationExpenses.reservedOverrun,
    reserveItems: recommendationExpenses.reserveItems,
    dailyCountableExpenses: recommendationExpenses.countableToday,
    todayExpenses: getTodayExpenses(monthTransactions, date),
    weekExpenses: getLastSevenDaysExpenses(monthTransactions, date),
    monthExpenses: expenses,
  };
}

function createCategory(name) {
  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new Error("Введите название категории");
  }

  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `category-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: normalizedName,
    icon: "📦",
    budgetBehavior: "normal",
    isArchived: false,
    createdAt: new Date().toISOString(),
  };
}

function createTransaction({
  type,
  amount,
  categoryId,
  description,
  date,
}) {
  const numericAmount = Number(amount);

  if (!["expense", "income"].includes(type)) {
    throw new Error("Некорректный тип операции");
  }

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Сумма должна быть больше нуля");
  }

  if (type === "expense" && !categoryId) {
    throw new Error("Выберите категорию");
  }

  if (!date) {
    throw new Error("Укажите дату операции");
  }

  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    amount: numericAmount,
    categoryId: type === "expense" ? categoryId : null,
    description: description.trim(),
    date,
    receiptUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function sortTransactionsByNewest(transactions) {
  return [...transactions].sort((firstTransaction, secondTransaction) => {
    const firstCreatedAt =
      firstTransaction.createdAt || `${firstTransaction.date}T00:00:00`;

    const secondCreatedAt =
      secondTransaction.createdAt || `${secondTransaction.date}T00:00:00`;

    return new Date(secondCreatedAt) - new Date(firstCreatedAt);
  });
}

function deleteTransactionById(transactions, transactionId) {
  return transactions.filter(
    (transaction) => transaction.id !== transactionId,
  );
}

function findCategoryById(categories, categoryId) {
  return (
    categories.find((category) => category.id === categoryId) || null
  );
}

function categoryNameExists(categories, name) {
  const normalizedName = name.trim().toLowerCase();

  return categories.some(
    (category) => category.name.trim().toLowerCase() === normalizedName,
  );
}

function updateTransactionById(
  transactions,
  transactionId,
  values,
) {
  const existingTransaction = transactions.find(
    (transaction) => transaction.id === transactionId,
  );

  if (!existingTransaction) {
    throw new Error("Запись не найдена");
  }

  const updatedTransaction = createTransaction(values);

  return transactions.map((transaction) => {
    if (transaction.id !== transactionId) {
      return transaction;
    }

    return {
      ...updatedTransaction,
      id: existingTransaction.id,
      createdAt: existingTransaction.createdAt,
      updatedAt: new Date().toISOString(),
    };
  });
}

function getDaysRemainingInMonth(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

  return lastDayOfMonth - date.getDate() + 1;
}

function calculateDailyRecommendation(summary, date = new Date()) {
  const daysLeft = getDaysRemainingInMonth(date);

  const currentBalance = Number(summary.recommendationBalance) || 0;
  const spentToday = Number(summary.dailyCountableExpenses) || 0;

  const availableAtStartOfToday = currentBalance + spentToday;
  const dailyLimit = daysLeft > 0 ? availableAtStartOfToday / daysLeft : 0;
  const remainingToday = dailyLimit - spentToday;

  let status = "good";
  let message = "Всё идёт по плану";

  if (currentBalance < 0) {
    status = "danger";
    message = "Повседневный бюджет уже превышен";
  } else if (remainingToday <= 0) {
    status = "danger";
    message = "На сегодня дневная норма уже использована";
  } else if (remainingToday < dailyLimit * 0.35) {
    status = "warning";
    message = "Сегодня лучше быть осторожнее с расходами";
  }

  const remainingPercent =
    dailyLimit > 0
      ? Math.max(0, Math.min(100, (remainingToday / dailyLimit) * 100))
      : 0;

  return {
    daysLeft,
    dailyLimit: Math.max(0, dailyLimit),
    spentToday,
    remainingToday: Math.max(0, remainingToday),
    remainingPercent,
    status,
    message,
  };
}

function getExpenseTransactionsForPeriod(
  transactions,
  period = "month",
  today = new Date(),
) {
  const monthKey = getMonthKey(today);

  return transactions.filter((transaction) => {
    if (transaction.type !== "expense") {
      return false;
    }

    const transactionDate = parseLocalDate(transaction.date);

    if (period === "today") {
      return isSameDay(transactionDate, today);
    }

    if (period === "week") {
      return isDateWithinLastDays(transactionDate, 7, today);
    }

    return transaction.date.startsWith(monthKey);
  });
}

function calculateCategoryExpenseSummary(
  transactions,
  categories,
  period = "month",
  today = new Date(),
) {
  const periodTransactions = getExpenseTransactionsForPeriod(
    transactions,
    period,
    today,
  );

  const totals = new Map();

  periodTransactions.forEach((transaction) => {
    const categoryId = transaction.categoryId || "uncategorized";
    const current = totals.get(categoryId) || {
      amount: 0,
      operationsCount: 0,
    };

    current.amount += Number(transaction.amount) || 0;
    current.operationsCount += 1;
    totals.set(categoryId, current);
  });

  const total = [...totals.values()].reduce(
    (sum, item) => sum + item.amount,
    0,
  );

  const items = [...totals.entries()]
    .map(([categoryId, values]) => {
      const category = findCategoryById(categories, categoryId);

      return {
        categoryId,
        name: category?.name || "Без категории",
        icon: category?.icon || "📦",
        amount: values.amount,
        operationsCount: values.operationsCount,
        percent: total > 0 ? (values.amount / total) * 100 : 0,
      };
    })
    .sort((first, second) => second.amount - first.amount);

  return {
    period,
    total,
    items,
  };
}

function updateCategory(category, { name, icon, budgetBehavior }) {
  const normalizedName = String(name || "").trim();
  const normalizedIcon = String(icon || "").trim() || "📦";
  const normalizedBehavior = ["normal", "reserved", "compensated"].includes(budgetBehavior)
    ? budgetBehavior
    : category?.budgetBehavior || "normal";

  if (!category) {
    throw new Error("Категория не найдена");
  }

  if (!normalizedName) {
    throw new Error("Введите название категории");
  }

  return {
    ...category,
    name: normalizedName,
    icon: normalizedIcon,
    budgetBehavior: normalizedBehavior,
    updatedAt: new Date().toISOString(),
  };
}
