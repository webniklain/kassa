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

function calculateMonthlySummary(
  transactions,
  monthlyBudgets,
  date = new Date(),
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

  return {
    monthKey,
    budget,
    income,
    expenses,
    balance,
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