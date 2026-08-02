function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} GEL`;
}

function formatTransactionDate(dateString) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parseLocalDate(dateString));
}

function formatMonthTitle(date = new Date()) {
  const formatted = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function setText(elementId, value) {
  const element = document.getElementById(elementId);

  if (element) {
    element.textContent = value;
  }
}

function renderSummary(summary) {
  setText("current-month", formatMonthTitle());
  setText("budget-total", formatMoney(summary.budget));
  setText("income-total", `+${formatMoney(summary.income)}`);
  setText("expense-total", `−${formatMoney(summary.expenses)}`);
  setText("balance-total", formatMoney(summary.balance));
  setText("today-expenses", formatMoney(summary.todayExpenses));
  setText("week-expenses", formatMoney(summary.weekExpenses));
  setText("month-expenses", formatMoney(summary.monthExpenses));
}

function createTransactionElement(transaction, onDelete) {
  const item = document.createElement("article");
  item.className = "transaction-item";

  const main = document.createElement("div");
  main.className = "transaction-main";

  const title = document.createElement("div");
  title.className = "transaction-title";
  title.textContent = transaction.title;

  const meta = document.createElement("div");
  meta.className = "transaction-meta";
  meta.textContent = `${transaction.category} · ${formatTransactionDate(
    transaction.date,
  )}`;

  main.append(title, meta);

  if (transaction.note) {
    const note = document.createElement("div");
    note.className = "transaction-note";
    note.textContent = transaction.note;
    main.append(note);
  }

  const side = document.createElement("div");
  side.className = "transaction-side";

  const amount = document.createElement("div");
  amount.className = `transaction-amount ${transaction.type}`;
  amount.textContent =
    transaction.type === "expense"
      ? `−${formatMoney(transaction.amount)}`
      : `+${formatMoney(transaction.amount)}`;

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "Удалить";
  deleteButton.addEventListener("click", () => onDelete(transaction.id));

  side.append(amount, deleteButton);
  item.append(main, side);

  return item;
}

function renderTransactions(transactions, onDelete) {
  const list = document.getElementById("transactions-list");

  if (!list) {
    return;
  }

  list.innerHTML = "";

  if (transactions.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = "Операций пока нет";
    list.append(emptyState);
    return;
  }

  const sortedTransactions = sortTransactionsByNewest(transactions);

  sortedTransactions.forEach((transaction) => {
    list.append(createTransactionElement(transaction, onDelete));
  });
}

function openTransactionDialog(type) {
  const dialog = document.getElementById("transaction-dialog");
  const form = document.getElementById("transaction-form");
  const typeInput = document.getElementById("transaction-type");
  const title = document.getElementById("transaction-dialog-title");
  const categoryField = document.getElementById("category-field");
  const dateInput = document.getElementById("transaction-date");

  form.reset();
  typeInput.value = type;
  dateInput.value = new Date().toISOString().slice(0, 10);

  if (type === "expense") {
    title.textContent = "Добавить расход";
    categoryField.hidden = false;
  } else {
    title.textContent = "Добавить приход";
    categoryField.hidden = true;
  }

  dialog.showModal();

  window.setTimeout(() => {
    document.getElementById("transaction-amount")?.focus();
  }, 50);
}

function closeTransactionDialog() {
  document.getElementById("transaction-dialog")?.close();
}

function openBudgetDialog(currentBudget) {
  const dialog = document.getElementById("budget-dialog");
  const input = document.getElementById("monthly-budget");

  input.value = currentBudget || "";
  dialog.showModal();

  window.setTimeout(() => {
    input.focus();
  }, 50);
}

function closeBudgetDialog() {
  document.getElementById("budget-dialog")?.close();
}

function getTransactionFormValues() {
  return {
    type: document.getElementById("transaction-type").value,
    amount: document.getElementById("transaction-amount").value,
    title: document.getElementById("transaction-title").value,
    category: document.getElementById("transaction-category").value,
    date: document.getElementById("transaction-date").value,
    note: document.getElementById("transaction-note").value,
  };
}

function getBudgetFormValue() {
  return Number(document.getElementById("monthly-budget").value);
}

function showError(message) {
  alert(message);
}