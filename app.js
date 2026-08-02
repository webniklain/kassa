let transactions = loadTransactions();
let monthlyBudgets = loadMonthlyBudgets();

function refreshApp() {
  const summary = calculateMonthlySummary(
    transactions,
    monthlyBudgets,
    new Date(),
  );

  renderSummary(summary);
  renderTransactions(transactions, handleDeleteTransaction);
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
    const transaction = createTransaction(
      getTransactionFormValues(),
    );

    transactions.push(transaction);
    saveTransactions(transactions);

    closeTransactionDialog();
    refreshApp();
  } catch (error) {
    showError(error.message || "Не удалось сохранить операцию");
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
      openTransactionDialog("expense");
    });

  document
    .getElementById("add-income-button")
    .addEventListener("click", () => {
      openTransactionDialog("income");
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
}

function startApp() {
  registerEventListeners();
  refreshApp();
}

document.addEventListener("DOMContentLoaded", startApp);