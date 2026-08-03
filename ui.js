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

function getDaysWord(number) {
  const absoluteNumber = Math.abs(number);
  const lastTwoDigits = absoluteNumber % 100;
  const lastDigit = absoluteNumber % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return "дней";
  }

  if (lastDigit === 1) {
    return "день";
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return "дня";
  }

  return "дней";
}

function renderDailyRecommendation(recommendation, hasBudget) {
  const card = document.getElementById("daily-recommendation");

  if (!card) {
    return;
  }

  card.classList.remove("is-updating");
  void card.offsetWidth;
  card.classList.add("is-updating");

  window.setTimeout(() => {
    card.classList.remove("is-updating");
  }, 180);

  card.classList.remove(
    "daily-recommendation--good",
    "daily-recommendation--warning",
    "daily-recommendation--danger",
  );

  if (!hasBudget) {
    setText("daily-remaining", "—");
    setText(
      "daily-message",
      "Укажите бюджет месяца, чтобы получить рекомендацию",
    );
    setText("days-left", "");
    return;
  }

  const progress = document.querySelector(".daily-progress");

if (progress) {
  progress.style.setProperty(
    "--progress",
    `${recommendation.remainingPercent * 3.6}deg`,
  );
}

  card.classList.add(
    `daily-recommendation--${recommendation.status}`,
  );

  setText(
    "daily-remaining",
    formatMoney(recommendation.remainingToday),
  );

  setText("daily-message", recommendation.message);

  setText(
    "days-left",
    `До конца месяца: ${recommendation.daysLeft} ${getDaysWord(
      recommendation.daysLeft,
    )}`,
  );
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

function renderQuickCategories(
  categories,
  selectedCategoryId = "",
) {
  const container = document.getElementById(
    "quick-categories",
  );

  const select = document.getElementById(
    "transaction-category",
  );

  if (!container || !select) {
    return;
  }

  container.innerHTML = "";

  const quickCategories = categories
    .filter((category) => !category.isArchived)
    .slice(0, 4);

  quickCategories.forEach((category) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "quick-category-button";
    button.dataset.categoryId = category.id;
    button.textContent =
      `${category.icon || "📦"} ${category.name}`;

    if (category.id === selectedCategoryId) {
      button.classList.add("is-selected");
    }

    button.addEventListener("click", () => {
      select.value = category.id;

      renderQuickCategories(
        categories,
        category.id,
      );
    });

    container.append(button);
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
  onEdit,
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

  if (transaction.description) {
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

  const buttons = document.createElement("div");
  buttons.className = "transaction-buttons";

  const editButton = document.createElement("button");
  editButton.className = "edit-button";
  editButton.type = "button";
  editButton.textContent = "Изменить";
  editButton.addEventListener("click", () => {
    onEdit(transaction.id);
  });

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "Удалить";
  deleteButton.addEventListener("click", () => {
    onDelete(transaction.id);
  });

  buttons.append(editButton, deleteButton);
  side.append(amount, buttons);
  item.append(main, side);

  return item;
}

function renderTransactions(
  transactions,
  categories,
  onEdit,
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
        onEdit,
        onDelete,
      ),
    );
  });
}

function openRecordDialog() {
  document.getElementById("record-dialog")?.showModal();
}

function closeRecordDialog() {
  document.getElementById("record-dialog")?.close();
}

function openTransactionDialog(
  type,
  categories,
  transaction = null,
  preferredCategoryId = "",
) {
  const dialog = document.getElementById("transaction-dialog");
  const form = document.getElementById("transaction-form");
  const typeInput = document.getElementById("transaction-type");
  const idInput = document.getElementById("transaction-id");

  const dialogTitle = document.getElementById(
    "transaction-dialog-title",
  );

  const submitButton = document.getElementById(
    "transaction-submit-button",
  );

  const categoryField = document.getElementById("category-field");
  const amountInput = document.getElementById("transaction-amount");

  const categoryInput = document.getElementById(
    "transaction-category",
  );

  const descriptionInput = document.getElementById(
    "transaction-description",
  );

  const dateInput = document.getElementById("transaction-date");

  form.reset();

  const actualType = transaction?.type || type;

  typeInput.value = actualType;
  idInput.value = transaction?.id || "";
  dateInput.value =
    transaction?.date || getTodayDateInputValue();

  if (actualType === "expense") {
    categoryField.hidden = false;

    const preferredCategoryExists = categories.some(
      (category) =>
        category.id === preferredCategoryId &&
        !category.isArchived,
    );

    const selectedCategoryId =
      transaction?.categoryId ||
      (preferredCategoryExists ? preferredCategoryId : "") ||
      categories.find(
        (category) => !category.isArchived,
      )?.id ||
      "";

    renderCategoryOptions(
      categories,
      selectedCategoryId,
    );

    renderQuickCategories(
      categories,
      selectedCategoryId,
    );
  } else {
    categoryField.hidden = true;
  }

  if (transaction) {
    dialogTitle.textContent =
      actualType === "expense"
        ? "Изменить расход"
        : "Изменить приход";

    submitButton.textContent = "Сохранить изменения";
    amountInput.value = transaction.amount;
    descriptionInput.value = transaction.description || "";

    if (actualType === "expense") {
      categoryInput.value = transaction.categoryId;

      renderQuickCategories(
        categories,
        transaction.categoryId,
      );
    }
  } else {
    dialogTitle.textContent =
      actualType === "expense"
        ? "Записать расход"
        : "Записать приход";

    submitButton.textContent = "Сохранить";
  }

  dialog.showModal();

  window.setTimeout(() => {
    amountInput.focus();
    amountInput.select();
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

function openCategoryDialog(category = null) {
  const dialog = document.getElementById("category-dialog");
  const form = document.getElementById("category-form");
  const idInput = document.getElementById("category-id");
  const nameInput = document.getElementById("new-category-name");
  const iconInput = document.getElementById("new-category-icon");
  const title = document.getElementById("category-dialog-title");
  const submitButton = document.getElementById(
    "category-submit-button",
  );

  form?.reset();

  if (idInput) {
    idInput.value = category?.id || "";
  }

  if (nameInput) {
    nameInput.value = category?.name || "";
  }

  if (iconInput) {
    iconInput.value = category?.icon || "📦";
  }

  if (title) {
    title.textContent = category
      ? "Изменить категорию"
      : "Новая категория";
  }

  if (submitButton) {
    submitButton.textContent = category
      ? "Сохранить изменения"
      : "Добавить категорию";
  }

  dialog?.showModal();

  window.setTimeout(() => {
    nameInput?.focus();
    nameInput?.select();
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
    id: document.getElementById("transaction-id").value,
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

function getCategoryFormValues() {
  return {
    id: document.getElementById("category-id")?.value || "",
    name: document.getElementById("new-category-name")?.value || "",
    icon: document.getElementById("new-category-icon")?.value || "📦",
  };
}

function getNewCategoryName() {
  return getCategoryFormValues().name;
}

function getBudgetFormValue() {
  return Number(
    document.getElementById("monthly-budget").value,
  );
}

function showError(message) {
  alert(message);
}

function getAnalyticsPeriodTitle(period) {
  const titles = {
    today: "сегодня",
    week: "за 7 дней",
    month: "за месяц",
  };

  return titles[period] || titles.month;
}

function renderCategoryAnalytics(summary) {
  const list = document.getElementById("analytics-category-list");
  const total = document.getElementById("analytics-total");
  const subtitle = document.getElementById("analytics-subtitle");

  if (!list || !total || !subtitle) {
    return;
  }

  total.textContent = formatMoney(summary.total);
  subtitle.textContent = `Расходы ${getAnalyticsPeriodTitle(summary.period)}`;
  list.innerHTML = "";

  document
    .querySelectorAll("[data-analytics-period]")
    .forEach((button) => {
      button.classList.toggle(
        "is-selected",
        button.dataset.analyticsPeriod === summary.period,
      );
    });

  if (summary.items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Расходов за этот период нет";
    list.append(empty);
    return;
  }

  summary.items.forEach((item) => {
    const row = document.createElement("article");
    row.className = "analytics-category-item";

    const header = document.createElement("div");
    header.className = "analytics-category-header";

    const name = document.createElement("strong");
    name.textContent = `${item.icon} ${item.name}`;

    const amount = document.createElement("strong");
    amount.textContent = formatMoney(item.amount);

    header.append(name, amount);

    const meta = document.createElement("div");
    meta.className = "analytics-category-meta";
    meta.textContent = `${item.operationsCount} операций · ${item.percent.toFixed(1)}%`;

    const track = document.createElement("div");
    track.className = "analytics-progress-track";

    const fill = document.createElement("span");
    fill.className = "analytics-progress-fill";
    fill.style.width = `${Math.max(2, item.percent)}%`;

    track.append(fill);
    row.append(header, meta, track);
    list.append(row);
  });
}

function openAnalyticsDialog() {
  document.getElementById("analytics-dialog")?.showModal();
}

function closeAnalyticsDialog() {
  document.getElementById("analytics-dialog")?.close();
}

function renderCategoryManager(categories, onEdit) {
  const list = document.getElementById("category-manager-list");

  if (!list) {
    return;
  }

  list.innerHTML = "";

  const activeCategories = categories
    .filter((category) => !category.isArchived)
    .sort((first, second) =>
      first.name.localeCompare(second.name, "ru"),
    );

  activeCategories.forEach((category) => {
    const row = document.createElement("article");
    row.className = "category-manager-item";

    const identity = document.createElement("div");
    identity.className = "category-manager-identity";

    const icon = document.createElement("span");
    icon.className = "category-manager-icon";
    icon.textContent = category.icon || "📦";

    const name = document.createElement("strong");
    name.textContent = category.name;

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "secondary-button category-edit-button";
    editButton.textContent = "Изменить";
    editButton.addEventListener("click", () => onEdit(category.id));

    identity.append(icon, name);
    row.append(identity, editButton);
    list.append(row);
  });
}

function openCategoryManagerDialog() {
  document.getElementById("category-manager-dialog")?.showModal();
}

function closeCategoryManagerDialog() {
  document.getElementById("category-manager-dialog")?.close();
}
