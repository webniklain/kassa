let transactions = loadTransactions();
let categories = loadCategories();
let monthlyBudgets = loadMonthlyBudgets();

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

function handleDeleteTransaction(transactionId) {
  const confirmed = window.confirm("Удалить эту операцию?");

  if (!confirmed) {
    return;
  }

  transactions = deleteTransactionById(
    transactions,
    transactionId,
  );

  saveTransactions(transactions);
  refreshApp();
}

function handleTransactionSubmit(event) {
  event.preventDefault();

  try {
    const values = getTransactionFormValues();

    if (values.id) {
      transactions = updateTransactionById(
        transactions,
        values.id,
        values,
      );
    } else {
      const transaction = createTransaction(values);
      transactions.push(transaction);
    }

    saveTransactions(transactions);
    closeTransactionDialog();
    refreshApp();
  } catch (error) {
    showError(
      error.message || "Не удалось сохранить запись",
    );
  }
}

function handleCategorySubmit(event) {
  event.preventDefault();

  try {
    const name = getNewCategoryName();

    if (categoryNameExists(categories, name)) {
      showError("Такая категория уже существует");
      return;
    }

    const category = createCategory(name);

    categories.push(category);

    saveCategories(categories);

    renderCategoryOptions(categories, category.id);

    closeCategoryDialog();
  } catch (error) {
    showError(error.message);
  }
}

function handleBudgetSubmit(event) {
  event.preventDefault();

  const budget = getBudgetFormValue();

  if (!Number.isFinite(budget) || budget < 0) {
    showError("Введите корректную сумму бюджета");
    return;
  }

  const currentMonthKey = getMonthKey(new Date());

  monthlyBudgets[currentMonthKey] = budget;
  saveMonthlyBudgets(monthlyBudgets);

  closeBudgetDialog();
  refreshApp();
}

function handleClearAll() {
  if (transactions.length === 0) {
    return;
  }

  const confirmed = window.confirm(
    "Удалить все операции? Отменить это действие будет невозможно.",
  );

  if (!confirmed) {
    return;
  }

  transactions = [];
  saveTransactions(transactions);
  refreshApp();
}

function closeDialogWhenBackdropClicked(event) {
  const dialog = event.currentTarget;

  if (event.target === dialog) {
    dialog.close();
  }
}

function registerEventListeners() {
  document
    .getElementById("add-expense-button")
    .addEventListener("click", () => {
      openTransactionDialog("expense", categories);
    });

  document
    .getElementById("add-income-button")
    .addEventListener("click", () => {
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
}

function startApp() {
  registerEventListeners();
  refreshApp();
}

document.addEventListener("DOMContentLoaded", startApp);