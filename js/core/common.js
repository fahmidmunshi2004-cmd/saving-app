function normalizeUsername(value) {
  return value.trim().toLowerCase();
}

function saveSession() {
  if (currentSession) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

function loadSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  currentSession = raw ? JSON.parse(raw) : null;
}

function formatMoney(value) {
  return `${value.toLocaleString("en-BD")} BDT`;
}

const LOG_LEVEL = "info";
const LEVEL_PRIORITY = { debug: 10, info: 20, warn: 30, error: 40 };
let lastPersistKey = "";
let remoteSaveTimer = null;
let hasShownOfflineNotice = false;

function log(level, message, meta) {
  if ((LEVEL_PRIORITY[level] || 99) < (LEVEL_PRIORITY[LOG_LEVEL] || 99)) return;
  const payload = meta ? { message, ...meta } : { message };
  if (level === "error") console.error("[VaultBudget]", payload);
  else if (level === "warn") console.warn("[VaultBudget]", payload);
  else if (level === "debug") console.debug("[VaultBudget]", payload);
  else console.log("[VaultBudget]", payload);
}

function getPersistSnapshot() {
  return {
    income: Number(income) || 0,
    expense: Number(expense) || 0,
    breakdown,
    transactions
  };
}

function getPersistKey() {
  return JSON.stringify(getPersistSnapshot());
}

function scheduleRemoteSave() {
  if (!currentSession?.groupId || !db) return;
  if (remoteSaveTimer) clearTimeout(remoteSaveTimer);
  remoteSaveTimer = setTimeout(async () => {
    try {
      await db.collection("groupFinance").doc(currentSession.groupId).set({
        ...getPersistSnapshot(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      log("debug", "Remote group save completed", { groupId: currentSession.groupId });
    } catch (error) {
      log("warn", "Remote group save failed", { error: error?.message || String(error) });
    }
  }, 600);
}

function saveData() {
  const nextKey = getPersistKey();
  if (nextKey === lastPersistKey) return;
  lastPersistKey = nextKey;

  localStorage.setItem("income", String(income));
  localStorage.setItem("expense", String(expense));
  localStorage.setItem("breakdown", JSON.stringify(breakdown));
  localStorage.setItem("transactions", JSON.stringify(transactions));
  scheduleRemoteSave();
}

function loadData() {
  income = Number(localStorage.getItem("income")) || 0;
  expense = Number(localStorage.getItem("expense")) || 0;

  const localBreakdown = JSON.parse(localStorage.getItem("breakdown")) || {};
  Object.keys(breakdown).forEach((k) => delete breakdown[k]);
  Object.entries(localBreakdown).forEach(([k, v]) => {
    breakdown[k] = Number(v) || 0;
  });

  const localTransactions = JSON.parse(localStorage.getItem("transactions")) || [];
  transactions.length = 0;
  for (const t of localTransactions) {
    transactions.push(t);
  }
}

async function loadGroupSharedData() {
  if (!currentSession?.groupId || !db) {
    loadData();
    return;
  }

  try {
    const ref = db.collection("groupFinance").doc(currentSession.groupId);
    const snap = await ref.get();

    if (!snap.exists) {
      await ref.set({
        income: 0,
        expense: 0,
        breakdown: {},
        transactions: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    const data = snap.exists ? snap.data() : { income: 0, expense: 0, breakdown: {}, transactions: [] };
    income = Number(data.income) || 0;
    expense = Number(data.expense) || 0;

    Object.keys(breakdown).forEach((k) => delete breakdown[k]);
    Object.entries(data.breakdown || {}).forEach(([k, v]) => {
      breakdown[k] = Number(v) || 0;
    });

    transactions.length = 0;
    for (const t of (data.transactions || [])) {
      transactions.push(t);
    }
    lastPersistKey = getPersistKey();
    hasShownOfflineNotice = false;
  } catch (error) {
    loadData();
    if (!hasShownOfflineNotice) {
      hasShownOfflineNotice = true;
      appAlert("Internet/Firestore issue detected. Showing cached local data.");
    }
    log("warn", "Group data load failed; fallback to local cache", {
      error: error?.message || String(error),
      groupId: currentSession.groupId
    });
  }
}

function applyTheme() {
  root.setAttribute("data-theme", "light");
}

function setEditAccess(enabled) {
  canEdit = enabled;
  incomeInput.disabled = !enabled;
  incomeSourceInput.disabled = !enabled;
  expenseInput.disabled = !enabled;
  categoryInput.disabled = !enabled;
  incomeBtn.disabled = !enabled;
  expenseBtn.disabled = !enabled;
  incomeBtn.style.opacity = enabled ? "1" : "0.55";
  expenseBtn.style.opacity = enabled ? "1" : "0.55";
}

function showView(viewId) {
  views.forEach((view) => view.classList.toggle("active", view.id === viewId));
  navButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.view === viewId));
}

function isCurrentAdmin() {
  return currentSession?.role === "admin";
}

let loaderCount = 0;

function showLoader(text = "Please wait...") {
  if (!appLoader) return;
  loaderCount += 1;
  if (loaderText) loaderText.innerText = text;
  appLoader.classList.remove("hidden");
}

function hideLoader() {
  if (!appLoader) return;
  loaderCount = Math.max(0, loaderCount - 1);
  if (loaderCount === 0) {
    appLoader.classList.add("hidden");
  }
}

function appAlert(message, title = "Notice") {
  return new Promise((resolve) => {
    if (!appModal || !modalOkBtn || !modalMessage || !modalTitle || !modalCancelBtn) {
      window.alert(message);
      resolve(true);
      return;
    }

    modalTitle.innerText = title;
    modalMessage.innerText = String(message || "");
    modalCancelBtn.classList.add("hidden");
    appModal.classList.remove("hidden");

    const close = () => {
      appModal.classList.add("hidden");
      modalOkBtn.removeEventListener("click", onOk);
      resolve(true);
    };
    const onOk = () => close();
    modalOkBtn.addEventListener("click", onOk);
  });
}

function appConfirm(message, title = "Confirm") {
  return new Promise((resolve) => {
    if (!appModal || !modalOkBtn || !modalMessage || !modalTitle || !modalCancelBtn) {
      resolve(window.confirm(message));
      return;
    }

    modalTitle.innerText = title;
    modalMessage.innerText = String(message || "");
    modalCancelBtn.classList.remove("hidden");
    appModal.classList.remove("hidden");

    const close = (result) => {
      appModal.classList.add("hidden");
      modalOkBtn.removeEventListener("click", onOk);
      modalCancelBtn.removeEventListener("click", onCancel);
      resolve(result);
    };
    const onOk = () => close(true);
    const onCancel = () => close(false);
    modalOkBtn.addEventListener("click", onOk);
    modalCancelBtn.addEventListener("click", onCancel);
  });
}

async function withLoader(text, task) {
  showLoader(text);
  try {
    return await task();
  } finally {
    hideLoader();
  }
}

async function safeRun(task, fallbackMessage = "Something went wrong. Please try again.") {
  try {
    return await task();
  } catch (error) {
    log("error", "safeRun error", { error: error?.message || String(error) });
    await appAlert(error?.message || fallbackMessage);
    return null;
  }
}
