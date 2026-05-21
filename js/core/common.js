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
  localStorage.setItem("deletedTransactions", JSON.stringify(deletedTransactions));

  if (currentSession?.groupId && db) {
    db.collection("groupFinance").doc(currentSession.groupId).set({
      income,
      expense,
      breakdown,
      transactions,
      deletedTransactions,
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

  const localDeletedTransactions = JSON.parse(localStorage.getItem("deletedTransactions")) || [];
  deletedTransactions.length = 0;
  for (const t of localDeletedTransactions) {
    deletedTransactions.push(t);
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

  const data = snap.exists ? snap.data() : { income: 0, expense: 0, breakdown: {}, transactions: [], deletedTransactions: [] };
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

  deletedTransactions.length = 0;
  for (const t of (data.deletedTransactions || [])) {
    deletedTransactions.push(t);
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
  const exists = Array.from(views).some((view) => view.id === viewId);
  const safeViewId = exists ? viewId : "homeView";
  views.forEach((view) => view.classList.toggle("active", view.id === safeViewId));
  navButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.view === safeViewId));
  if (safeViewId === "walletView" && typeof window.renderSavingsRateChart === "function") {
    requestAnimationFrame(() => window.renderSavingsRateChart(true));
  }
  try {
    sessionStorage.setItem("vault_active_view", safeViewId);
  } catch (_) {
    // ignore storage errors
  }
}

function isCurrentAdmin() {
  return currentSession?.role === "admin";
}

let loaderCount = 0;
let loaderDotsTimer = null;
let modalCloseTimer = null;

function clearLoaderDotsTimer() {
  if (!loaderDotsTimer) return;
  clearInterval(loaderDotsTimer);
  loaderDotsTimer = null;
}

function clearModalCloseTimer() {
  if (!modalCloseTimer) return;
  clearTimeout(modalCloseTimer);
  modalCloseTimer = null;
}

function prepareModalMotion() {
  if (!appModal) return;
  clearModalCloseTimer();
  appModal.classList.remove("closing");
  appModal.classList.add("modal-meep");
}

function closeModalMotion(onDone) {
  if (!appModal) {
    if (typeof onDone === "function") onDone();
    return;
  }

  clearModalCloseTimer();
  appModal.classList.add("closing");
  modalCloseTimer = setTimeout(() => {
    appModal.classList.add("hidden");
    appModal.classList.remove("closing");
    appModal.classList.remove("modal-meep");
    if (typeof onDone === "function") onDone();
  }, 460);
}

function showLoader(text = "Please wait...") {
  if (!appLoader) return;
  loaderCount += 1;
  clearLoaderDotsTimer();
  if (loaderText) {
    const rawText = String(text || "");
    const ellipsisIndex = rawText.indexOf("...");
    const hasEllipsis = ellipsisIndex >= 0;
    const prefixText = hasEllipsis ? rawText.slice(0, ellipsisIndex) : rawText;
    const suffixText = hasEllipsis ? rawText.slice(ellipsisIndex + 3) : "";
    loaderText.textContent = "";
    const baseNode = document.createElement("span");
    baseNode.className = "loader-base-text";
    baseNode.textContent = prefixText;
    loaderText.appendChild(baseNode);

    if (hasEllipsis) {
      const dotsNode = document.createElement("span");
      dotsNode.className = "loader-dots";
      dotsNode.textContent = "";
      loaderText.appendChild(dotsNode);

      if (suffixText) {
        const suffixNode = document.createElement("span");
        suffixNode.className = "loader-suffix-text";
        suffixNode.textContent = suffixText;
        loaderText.appendChild(suffixNode);
      }

      let step = 0;
      loaderDotsTimer = setInterval(() => {
        step = (step + 1) % 4;
        const dots = ".".repeat(step);
        dotsNode.textContent = dots;
      }, 320);
    } else {
      const suffixNode = document.createElement("span");
      suffixNode.className = "loader-suffix-text";
      suffixNode.textContent = suffixText;
      if (suffixNode.textContent) loaderText.appendChild(suffixNode);
    }
  }
  appLoader.classList.remove("hidden");
}

function hideLoader() {
  if (!appLoader) return;
  loaderCount = Math.max(0, loaderCount - 1);
  if (loaderCount === 0) {
    clearLoaderDotsTimer();
    appLoader.classList.add("hidden");
  }
}

function modalEscapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getModalIconConfig(title, message, isConfirm = false) {
  const text = `${String(title || "")} ${String(message || "")}`.toLowerCase();
  if (/delete|remove|clear|permanent/.test(text)) return { klass: "danger", icon: "fa-trash-can" };
  if (/edit/.test(text)) return { klass: "edit", icon: "fa-pen-to-square" };
  if (/success|created|joined|copied|complete|approved/.test(text)) return { klass: "success", icon: "fa-check" };
  if (/error|failed|expired|mismatch|warning|kick/.test(text)) return { klass: "warn", icon: "fa-triangle-exclamation" };
  if (isConfirm) return { klass: "confirm", icon: "fa-circle-question" };
  return { klass: "info", icon: "fa-circle-info" };
}

function buildModalMessageHtml(title, message, isConfirm = false) {
  const iconCfg = getModalIconConfig(title, message, isConfirm);
  return `
    <div class="modal-icon modal-icon-${iconCfg.klass}" aria-hidden="true"><i class="fa-solid ${iconCfg.icon}"></i></div>
    <div class="modal-copy">${modalEscapeHtml(message)}</div>
  `;
}

function appAlert(message, title = "Notice") {
  return new Promise((resolve) => {
    if (!appModal || !modalOkBtn || !modalMessage || !modalTitle || !modalCancelBtn) {
      window.alert(message);
      resolve(true);
      return;
    }

    modalTitle.innerText = title;
    modalMessage.className = "modal-message centered";
    modalMessage.innerHTML = buildModalMessageHtml(title, message, false);
    modalCancelBtn.classList.add("hidden");
    prepareModalMotion();
    appModal.classList.remove("hidden");

    const close = () => {
      modalOkBtn.removeEventListener("click", onOk);
      closeModalMotion(() => resolve(true));
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
    modalMessage.className = "modal-message centered";
    modalMessage.innerHTML = buildModalMessageHtml(title, message, true);
    modalCancelBtn.classList.remove("hidden");
    prepareModalMotion();
    appModal.classList.remove("hidden");

    const close = (result) => {
      modalOkBtn.removeEventListener("click", onOk);
      modalCancelBtn.removeEventListener("click", onCancel);
      closeModalMotion(() => resolve(result));
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
