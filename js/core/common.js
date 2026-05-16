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

function saveData() {
  localStorage.setItem("income", income);
  localStorage.setItem("expense", expense);
  localStorage.setItem("breakdown", JSON.stringify(breakdown));
  localStorage.setItem("transactions", JSON.stringify(transactions));

  if (currentSession?.groupId && db) {
    db.collection("groupFinance").doc(currentSession.groupId).set({
      income,
      expense,
      breakdown,
      transactions,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(() => { });
  }
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
}

function applyTheme(theme) {
  root.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  themeToggle.innerHTML = theme === "dark"
    ? '<i class="fa-solid fa-sun"></i>'
    : '<i class="fa-solid fa-moon"></i>';
}

function loadTheme() {
  applyTheme(localStorage.getItem("theme") || "light");
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
