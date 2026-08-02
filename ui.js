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
  const formattedMonth = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(date);

  return (
    formattedMonth.charAt(0).toUpperCase() +
    formattedMonth.slice(1)
  );
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

function renderCategoryOptions(categories, selectedCategoryId = "") {
  const select = document.getElementById("transaction-category");

  if (!select) {
    return;
  }

  select.innerHTML = "";

  const activeCategories = categories.filter(
    (category) => !category.isArchived,
  );

  activeCategories.forEach((category) => {
    const option = document.createElement("option");

    option.value = category.id;
    option.textContent = `${category.icon || "📦"} ${category.name}`;

    if (category.id === selectedCategoryId) {
      option.selected = true;
    }

    select.append(option);
  });
}

function getTransactionDisplayTitle(transaction, categories) {
  if (transaction.type === "income") {
    return transaction.description || "Приход";
  }

  const category = findCategoryById(
    categories,
    transaction.categoryId,
  );

  return category
    ? `${category.icon || "📦"} ${category.name}`
    : "📦 Категория недоступна";
}

function createTransactionElement(
  transaction,
  categories,
  onDelete,
) {
  const item = document.createElement("article");
  item.className = "transaction-item";

  const main = document.createElement("div");
  main.className = "transaction-main";

  const title = document.createElement("div");
  title.className = "transaction-title";
  title.textContent = getTransactionDisplayTitle(
    transaction,
    categories,
  );

  const meta = document.createElement("div");
  meta.className = "transaction-meta";
  meta.textContent = formatTransactionDate(transaction.date);

  main.append(title, meta);

  if (
    transaction.type === "expense" &&
    transaction.description
  ) {
    const description = document.createElement("div");
    description.className = "transaction-note";
    description.textContent = transaction.description;
    main.append(description);
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
  deleteButton.addEventListener("click", () => {
    onDelete(transaction.id);
  });

  side.append(amount, deleteButton);
  item.append(main, side);

  return item;
}

function renderTransactions(
  transactions,
  categories,
  onDelete,
) {
  const list = document.getElementById("transactions-list");

  if (!list) {
    return;
  }

  list.innerHTML = "";

  if (transactions.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = "Записей пока нет";
    list.append(emptyState);
    return;
  }

  const sortedTransactions =
    sortTransactionsByNewest(transactions);

  sortedTransactions.forEach((transaction) => {
    list.append(
      createTransactionElement(
        transaction,
        categories,
        onDelete,
      ),
    );
  });
}

function openTransactionDialog(type, categories) {
  const dialog = document.getElementById("transaction-dialog");
  const form = document.getElementById("transaction-form");
  const typeInput = document.getElementById("transaction-type");
  const dialogTitle = document.getElementById(
    "transaction-dialog-title",
  );
  const categoryField = document.getElementById("category-field");
  const dateInput = document.getElementById("transaction-date");

  form.reset();
  typeInput.value = type;
  dateInput.value = getTodayDateInputValue();

  if (type === "expense") {
    dialogTitle.textContent = "Записать расход";
    categoryField.hidden = false;
    renderCategoryOptions(categories);
  } else {
    dialogTitle.textContent = "Записать приход";
    categoryField.hidden = true;
  }

  dialog.showModal();

  window.setTimeout(() => {
    document.getElementById("transaction-amount")?.focus();
  }, 50);
}

function getTodayDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function closeTransactionDialog() {
  document.getElementById("transaction-dialog")?.close();
}

function openCategoryDialog() {
  const dialog = document.getElementById("category-dialog");
  const form = document.getElementById("category-form");
  const input = document.getElementById("new-category-name");

  form.reset();
  dialog.showModal();

  window.setTimeout(() => {
    input.focus();
  }, 50);
}

function closeCategoryDialog() {
  document.getElementById("category-dialog")?.close();
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
    categoryId:
      document.getElementById("transaction-category").value,
    description:
      document.getElementById(
        "transaction-description",
      ).value,
    date: document.getElementById("transaction-date").value,
  };
}

function getNewCategoryName() {
  return document.getElementById("new-category-name").value;
}

function getBudgetFormValue() {
  return Number(
    document.getElementById("monthly-budget").value,
  );
}

function showError(message) {
  alert(message);
}