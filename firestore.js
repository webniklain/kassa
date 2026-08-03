import { db } from "./firebase.js";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
} from
  "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const FAMILY_ID = "kalinin-family";
const FAMILY_PATH = ["families", FAMILY_ID];

function familyDocument() {
  return doc(db, ...FAMILY_PATH);
}

function familyCollection(name) {
  return collection(db, ...FAMILY_PATH, name);
}

function familyItem(name, itemId) {
  return doc(db, ...FAMILY_PATH, name, itemId);
}

async function verifyFamilyMembership(user) {
  if (!user?.uid) {
    throw new Error("Пользователь не авторизован");
  }

  const memberSnapshot = await getDoc(
    familyItem("members", user.uid),
  );

  if (!memberSnapshot.exists()) {
    throw new Error(
      "Этот аккаунт не добавлен в семейный бюджет",
    );
  }

  return memberSnapshot.data();
}

function subscribeToFamilyData({
  onTransactions,
  onCategories,
  onBudgets,
  onReady,
  onError,
}) {
  const unsubscribers = [];
  let readyCollections = 0;
  const readyCollectionNames = new Set();

  function markCollectionReady(name) {
    if (readyCollectionNames.has(name)) {
      return;
    }

    readyCollectionNames.add(name);
    readyCollections += 1;

    if (readyCollections === 3) {
      onReady?.();
    }
  }

  function handleListenerError(error) {
    console.error("Firestore listener error:", error);
    onError?.(error);
  }

  unsubscribers.push(
    onSnapshot(
      familyCollection("transactions"),
      { includeMetadataChanges: true },
      (snapshot) => {
        const transactions = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        console.log(
          "Kassa: transactions snapshot",
          transactions.length,
          snapshot.metadata.fromCache ? "cache" : "server",
        );

        onTransactions(transactions);
        markCollectionReady("transactions");
      },
      handleListenerError,
    ),
  );

  unsubscribers.push(
    onSnapshot(
      familyCollection("categories"),
      { includeMetadataChanges: true },
      (snapshot) => {
        const categories = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        console.log(
          "Kassa: categories snapshot",
          categories.length,
          snapshot.metadata.fromCache ? "cache" : "server",
        );

        onCategories(categories);
        markCollectionReady("categories");
      },
      handleListenerError,
    ),
  );

  unsubscribers.push(
    onSnapshot(
      familyCollection("budgets"),
      { includeMetadataChanges: true },
      (snapshot) => {
        const budgets = {};

        snapshot.docs.forEach((item) => {
          budgets[item.id] = Number(item.data().amount) || 0;
        });

        console.log(
          "Kassa: budgets snapshot",
          Object.keys(budgets).length,
          snapshot.metadata.fromCache ? "cache" : "server",
        );

        onBudgets(budgets);
        markCollectionReady("budgets");
      },
      handleListenerError,
    ),
  );

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

async function saveCloudTransaction(transaction, user) {
  await setDoc(
    familyItem("transactions", transaction.id),
    {
      ...transaction,
      updatedBy: user.uid,
      updatedByEmail: user.email || "",
    },
  );
}

async function deleteCloudTransaction(transactionId) {
  await deleteDoc(
    familyItem("transactions", transactionId),
  );
}

async function clearCloudTransactions() {
  const snapshot = await getDocs(
    familyCollection("transactions"),
  );

  const chunks = [];
  let currentChunk = [];

  snapshot.docs.forEach((item) => {
    currentChunk.push(item.ref);

    if (currentChunk.length === 450) {
      chunks.push(currentChunk);
      currentChunk = [];
    }
  });

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((reference) => batch.delete(reference));
    await batch.commit();
  }
}

async function saveCloudCategory(category, user) {
  await setDoc(
    familyItem("categories", category.id),
    {
      ...category,
      updatedBy: user.uid,
      updatedByEmail: user.email || "",
    },
  );
}

async function saveCloudBudget(monthKey, amount, user) {
  await setDoc(
    familyItem("budgets", monthKey),
    {
      amount: Number(amount) || 0,
      month: monthKey,
      updatedAt: new Date().toISOString(),
      updatedBy: user.uid,
      updatedByEmail: user.email || "",
    },
  );
}

async function migrateLocalDataToCloud({
  user,
  transactions,
  categories,
  monthlyBudgets,
}) {
  const migrationKey = `kassa-cloud-migrated-${user.uid}`;

  if (localStorage.getItem(migrationKey) === "1") {
    return false;
  }

  const writes = [];

  categories.forEach((category) => {
    writes.push(saveCloudCategory(category, user));
  });

  transactions.forEach((transaction) => {
    writes.push(saveCloudTransaction(transaction, user));
  });

  Object.entries(monthlyBudgets).forEach(
    ([monthKey, amount]) => {
      writes.push(
        saveCloudBudget(monthKey, amount, user),
      );
    },
  );

  await Promise.all(writes);
  localStorage.setItem(migrationKey, "1");

  return writes.length > 0;
}

async function ensureFamilyDocument() {
  const snapshot = await getDoc(familyDocument());

  if (!snapshot.exists()) {
    throw new Error(
      "Семейный документ kalinin-family не найден в Firestore",
    );
  }
}

export {
  FAMILY_ID,
  clearCloudTransactions,
  deleteCloudTransaction,
  ensureFamilyDocument,
  migrateLocalDataToCloud,
  saveCloudBudget,
  saveCloudCategory,
  saveCloudTransaction,
  subscribeToFamilyData,
  verifyFamilyMembership,
};
