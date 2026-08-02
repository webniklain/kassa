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

function createTransaction({
  type,
  amount,
  title,
  category,
  date,
  note,
}) {
  const numericAmount = Number(amount);

  if (!["expense", "income"].includes(type)) {
    throw new Error("Некорректный тип операции");
  }

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Сумма должна быть больше нуля");
  }

  if (!title.trim()) {
    throw new Error("Укажите название операции");
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
    title: title.trim(),
    category: type === "expense" ? category : "Приход",
    date,
    note: note.trim(),
    createdAt: new Date().toISOString(),
  };
}

function sortTransactionsByNewest(transactions) {
  return [...transactions].sort((firstTransaction, secondTransaction) => {
    const firstDate = new Date(
      `${firstTransaction.date}T${firstTransaction.createdAt?.slice(11) || "00:00:00"}`,
    );

    const secondDate = new Date(
      `${secondTransaction.date}T${secondTransaction.createdAt?.slice(11) || "00:00:00"}`,
    );

    return secondDate - firstDate;
  });
}

function deleteTransactionById(transactions, transactionId) {
  return transactions.filter(
    (transaction) => transaction.id !== transactionId,
  );
}