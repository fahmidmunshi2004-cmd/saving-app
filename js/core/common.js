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

function stopGroupRealtimeSync() {
  if (typeof groupFinanceUnsub === "function") {
    groupFinanceUnsub();
  }
  if (typeof groupMembersUnsub === "function") {
    groupMembersUnsub();
  }
  if (typeof pendingRequestsUnsub === "function") {
    pendingRequestsUnsub();
  }
  groupFinanceUnsub = null;
  groupMembersUnsub = null;
  pendingRequestsUnsub = null;
  activeRealtimeGroupId = "";
  activeRealtimeIsAdmin = false;
}

function applyGroupFinanceSnapshot(data = {}) {
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

function financeStorageKey(key) {
  if (currentSession?.groupId) return `jomao_group_${currentSession.groupId}_${key}`;
  if (currentSession?.uid) return `jomao_user_${currentSession.uid}_${financeProviderKey()}_${key}`;
  return `jomao_guest_${key}`;
}

function financeProviderKey() {
  const provider = currentSession?.authProvider || sessionStorage.getItem("vault_auth_provider");
  if (provider === "facebook" || provider === "facebook.com") return "facebook";
  if (provider === "google" || provider === "google.com") return "google";
  if (provider === "email" || provider === "password") return "email";
  if (firebaseUser?.providerData?.some((item) => item.providerId === "password")) return "email";
  return firebaseUser?.providerData?.some((item) => item.providerId === "facebook.com") ? "facebook" : "google";
}

function readFinanceFromStorage() {
  income = Number(localStorage.getItem(financeStorageKey("income"))) || 0;
  expense = Number(localStorage.getItem(financeStorageKey("expense"))) || 0;

  const localBreakdown = JSON.parse(localStorage.getItem(financeStorageKey("breakdown")) || "{}") || {};
  Object.keys(breakdown).forEach((k) => delete breakdown[k]);
  Object.entries(localBreakdown).forEach(([k, v]) => {
    breakdown[k] = Number(v) || 0;
  });

  const localTransactions = JSON.parse(localStorage.getItem(financeStorageKey("transactions")) || "[]") || [];
  transactions.length = 0;
  transactions.push(...localTransactions);

  const localDeletedTransactions = JSON.parse(localStorage.getItem(financeStorageKey("deletedTransactions")) || "[]") || [];
  deletedTransactions.length = 0;
  deletedTransactions.push(...localDeletedTransactions);
}

function migrateLegacyFinanceToGoogle(uid) {
  const migrationKey = "jomao_finance_migrated_to_google_v2";
  if (!uid) return false;

  const legacyKeys = ["income", "expense", "breakdown", "transactions", "deletedTransactions"];
  let migratedAny = false;
  legacyKeys.forEach((key) => {
    const targetKey = `jomao_user_${uid}_google_${key}`;
    if (localStorage.getItem(targetKey) !== null) return;

    const oldUserValue = localStorage.getItem(`jomao_user_${uid}_${key}`);
    const legacyValue = localStorage.getItem(key);
    const value = oldUserValue !== null ? oldUserValue : (!localStorage.getItem(migrationKey) ? legacyValue : null);
    if (value !== null) {
      localStorage.setItem(targetKey, value);
      migratedAny = true;
    }
  });
  if (!localStorage.getItem(migrationKey)) localStorage.setItem(migrationKey, "1");
  return migratedAny;
}

function syncCurrentSessionFromGroupMembers(docs = []) {
  if (!currentSession?.groupId || !firebaseUser) return;
  const myMemberId = currentSession.memberId || `gmail_${firebaseUser.uid}`;
  const selfDoc = docs.find((doc) => {
    const data = typeof doc.data === "function" ? doc.data() : doc;
    return data?.memberId === myMemberId;
  });

  if (!selfDoc) {
    if (currentSession.type === "gmail") {
      currentSession = {
        type: "gmail",
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        authProvider: sessionStorage.getItem("vault_auth_provider") || "google",
        displayName: typeof getAuthDisplayName === "function"
          ? getAuthDisplayName(firebaseUser, sessionStorage.getItem("vault_auth_provider") || "google")
          : (firebaseUser.displayName || ""),
        role: "personal",
        canEdit: true
      };
      saveSession();
      stopGroupRealtimeSync();
      loadGroupSharedData().then(() => {
        syncTransactionState();
        updateUI(false);
        applyAuthState();
      }).catch((error) => console.error("Personal finance load failed", error));
    }
    return;
  }

  const selfData = typeof selfDoc.data === "function" ? selfDoc.data() : selfDoc;
  const nextRole = selfData.role || currentSession.role || "viewer";
  const nextCanEdit = !!selfData.canEdit;
  let changed = false;

  if (currentSession.role !== nextRole) {
    currentSession.role = nextRole;
    changed = true;
  }
  if (currentSession.canEdit !== nextCanEdit) {
    currentSession.canEdit = nextCanEdit;
    changed = true;
  }

  if (changed) {
    saveSession();
    setEditAccess(isCurrentAdmin() || !!currentSession.canEdit || (!currentSession.groupId && currentSession.type === "gmail"));
    updateUI(false);
    applyAuthState();
  }
}

function startGroupRealtimeSync() {
  if (!db || !currentSession?.groupId) {
    stopGroupRealtimeSync();
    return;
  }

  const isAdminNow = isCurrentAdmin();
  if (
    activeRealtimeGroupId === currentSession.groupId
    && activeRealtimeIsAdmin === isAdminNow
    && groupFinanceUnsub
    && groupMembersUnsub
    && (!isAdminNow || pendingRequestsUnsub)
  ) {
    return;
  }

  stopGroupRealtimeSync();
  activeRealtimeGroupId = currentSession.groupId;
  activeRealtimeIsAdmin = isAdminNow;
  const groupId = currentSession.groupId;

  groupFinanceUnsub = db.collection("groupFinance").doc(groupId).onSnapshot((snap) => {
    if (!currentSession?.groupId || currentSession.groupId !== groupId) return;
    if (!snap.exists) {
      applyGroupFinanceSnapshot({ income: 0, expense: 0, breakdown: {}, transactions: [], deletedTransactions: [] });
      updateUI(false);
      if (typeof forceHistoryManagerPanel === "function") {
        forceHistoryManagerPanel();
      }
      return;
    }

    applyGroupFinanceSnapshot(snap.data() || {});
    updateUI(false);
    if (typeof forceHistoryManagerPanel === "function") {
      forceHistoryManagerPanel();
    }
  }, () => { });

  groupMembersUnsub = db.collection("groupMembers").where("groupId", "==", groupId).onSnapshot((snap) => {
    if (!currentSession?.groupId || currentSession.groupId !== groupId) return;
    syncCurrentSessionFromGroupMembers(snap.docs || []);
    if (typeof refreshSettingsPanels === "function") {
      refreshSettingsPanels().catch(() => { });
    }
  }, () => { });

  if (isAdminNow) {
    pendingRequestsUnsub = db.collection("accessRequests")
      .where("groupId", "==", groupId)
      .where("status", "==", "pending")
      .onSnapshot(() => {
        if (!currentSession?.groupId || currentSession.groupId !== groupId) return;
        if (typeof refreshSettingsPanels === "function") {
          refreshSettingsPanels().catch(() => { });
        }
      }, () => { });
  }
}

function saveData(syncRemote = true) {
  localStorage.setItem(financeStorageKey("income"), income);
  localStorage.setItem(financeStorageKey("expense"), expense);
  localStorage.setItem(financeStorageKey("breakdown"), JSON.stringify(breakdown));
  localStorage.setItem(financeStorageKey("transactions"), JSON.stringify(transactions));
  localStorage.setItem(financeStorageKey("deletedTransactions"), JSON.stringify(deletedTransactions));

  const canSyncGroupFinance = syncRemote && currentSession?.groupId && db && (isCurrentAdmin() || !!currentSession?.canEdit);
  if (canSyncGroupFinance) {
    const groupFinanceUpdate = {
      income,
      expense,
      breakdown,
      transactions,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (isCurrentAdmin()) groupFinanceUpdate.deletedTransactions = deletedTransactions;
    const financeRef = db.collection("groupFinance").doc(currentSession.groupId);
    db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(financeRef);
      if (!snapshot.exists) throw new Error("Shared group finance is missing.");
      const remote = snapshot.data() || {};
      if (!isCurrentAdmin()) {
        const remoteTransactions = Array.isArray(remote.transactions) ? remote.transactions : [];
        const localIds = new Set(transactions.map((item) => item?.id).filter(Boolean));
        const additions = transactions.filter((item) => item?.id && !remoteTransactions.some((existing) => existing?.id === item.id));
        if (additions.length !== 1 || transactions.length !== remoteTransactions.length + 1
          || remoteTransactions.some((item) => !localIds.has(item?.id))) {
          throw new Error("A group editor can only add a single new transaction at a time.");
        }
        groupFinanceUpdate.transactions = [...remoteTransactions, additions[0]];
        groupFinanceUpdate.income = Number(remote.income || 0) + (additions[0].type === "income" ? Number(additions[0].amount || 0) : 0);
        groupFinanceUpdate.expense = Number(remote.expense || 0) + (additions[0].type === "expense" ? Number(additions[0].amount || 0) : 0);
        groupFinanceUpdate.breakdown = { ...(remote.breakdown || {}) };
        if (additions[0].type === "expense") {
          const category = String(additions[0].category || "");
          groupFinanceUpdate.breakdown[category] = Number(groupFinanceUpdate.breakdown[category] || 0) + Number(additions[0].amount || 0);
        }
      }
      transaction.update(financeRef, groupFinanceUpdate);
    }).catch((error) => {
      console.error("Group finance sync failed", error);
      if (typeof appAlert === "function") appAlert(error.message || "Could not save group transaction.");
    });
    return;
  }

  if (syncRemote && currentSession?.uid && !currentSession?.groupId && db) {
    db.collection("userFinance").doc(currentSession.uid).collection("accounts").doc(financeProviderKey()).set({
      income,
      expense,
      breakdown,
      transactions,
      deletedTransactions,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch((error) => console.error("Personal finance sync failed", error));
  }
}

function loadData() {
  if (!currentSession?.uid && !currentSession?.groupId) {
    income = 0;
    expense = 0;
    Object.keys(breakdown).forEach((k) => delete breakdown[k]);
    transactions.length = 0;
    deletedTransactions.length = 0;
    return;
  }

  if (!currentSession.groupId && financeProviderKey() === "google") {
    migrateLegacyFinanceToGoogle(currentSession.uid);
  }
  readFinanceFromStorage();
}

async function loadGroupSharedData() {
  if (!currentSession?.groupId || !db) {
    loadData();
    if (currentSession?.uid && db) {
      const userFinanceRef = db.collection("userFinance").doc(currentSession.uid);
      const providerKey = financeProviderKey();
      const ref = userFinanceRef.collection("accounts").doc(providerKey);
      try {
        const snap = await ref.get();
        if (snap.exists) {
          applyGroupFinanceSnapshot(snap.data() || {});
          saveData(false);
        } else {
          const legacySnap = await userFinanceRef.get();
          const legacyData = legacySnap.exists ? legacySnap.data() || {} : {};
          const hasLegacyFinance = ["income", "expense", "transactions"].some((key) => Object.prototype.hasOwnProperty.call(legacyData, key));
          if (hasLegacyFinance) {
            await userFinanceRef.collection("accounts").doc("google").set({
              income: Number(legacyData.income) || 0,
              expense: Number(legacyData.expense) || 0,
              breakdown: legacyData.breakdown || {},
              transactions: legacyData.transactions || [],
              deletedTransactions: legacyData.deletedTransactions || []
            }, { merge: true });
            if (providerKey === "google") {
              applyGroupFinanceSnapshot(legacyData);
              saveData(false);
              return;
            }
          }
          saveData(true);
        }
      } catch (error) {
        console.error("Personal finance load failed", error);
      }
    }
    return;
  }

  const ref = db.collection("groupFinance").doc(currentSession.groupId);
  const snap = await ref.get();

  if (!snap.exists) {
    const canCreateSharedFinance = isCurrentAdmin() || !!currentSession?.canEdit;
    if (canCreateSharedFinance) {
      await ref.set({
        income: 0,
        expense: 0,
        breakdown: {},
        transactions: [],
        deletedTransactions: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  }

  const data = snap.exists ? snap.data() : { income: 0, expense: 0, breakdown: {}, transactions: [], deletedTransactions: [] };
  applyGroupFinanceSnapshot(data);

  if (!snap.exists && (isCurrentAdmin() || !!currentSession?.canEdit)) {
    await ref.set({
      income,
      expense,
      breakdown,
      transactions,
      deletedTransactions,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(() => { });
  }
}

function applyTheme() {
  let theme = "light";

  try {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark" || storedTheme === "light") {
      theme = storedTheme;
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      theme = "dark";
    }
  } catch (_) {
    // ignore storage errors
  }

  root.setAttribute("data-theme", theme);
  if (document.body) {
    document.body.dataset.theme = theme;
    document.body.classList.toggle("theme-dark", theme === "dark");
    document.body.classList.toggle("theme-light", theme === "light");
  }

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute("content", theme === "dark" ? "#0b1020" : "#ffffff");
  }
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
const MODAL_CONTAINER_CLASSES = [
  "hidden",
  "out",
  "modal-container",
  "five"
];

function getModalElement() {
  return appModal ? appModal.querySelector(".modal") : null;
}

function isModalOverlayTarget(event) {
  return Boolean(event && (event.target === appModal || event.target?.classList?.contains("modal-background")));
}

function bindModalClickGuard() {
  const modal = getModalElement();
  if (!modal || modal.dataset.clickGuardBound === "true") return;
  modal.dataset.clickGuardBound = "true";
  modal.addEventListener("click", (event) => event.stopPropagation());
}

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
  bindModalClickGuard();
  appModal.classList.remove(...MODAL_CONTAINER_CLASSES);
  appModal.classList.add("modal-container");
  document.body.classList.add("modal-active");
  document.documentElement.classList.add("modal-active");
  void appModal.offsetWidth;
  appModal.classList.add("five");
}

function closeModalMotion(onDone) {
  if (!appModal) {
    if (typeof onDone === "function") onDone();
    return;
  }

  clearModalCloseTimer();
  appModal.classList.add("out");
  const closeDelay = 500;
  let finished = false;
  const finishClose = () => {
    if (finished) return;
    finished = true;
    document.body.classList.remove("modal-active");
    document.documentElement.classList.remove("modal-active");
    appModal.classList.remove(...MODAL_CONTAINER_CLASSES.filter((name) => name !== "hidden"));
    appModal.classList.add("hidden");
    if (typeof onDone === "function") onDone();
  };

  modalCloseTimer = setTimeout(() => {
    finishClose();
  }, closeDelay);
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
  const safeTitle = modalEscapeHtml(title);
  return `
    <div class="modal-icon modal-icon-${iconCfg.klass}" aria-hidden="true"><i class="fa-solid ${iconCfg.icon}"></i></div>
    <div class="modal-copy-title">${safeTitle}</div>
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

    modalTitle.innerText = "";
    modalTitle.classList.add("hidden");
    modalOkBtn.parentElement?.classList.add("single-btn");
    modalMessage.className = "modal-message centered";
    modalMessage.innerHTML = buildModalMessageHtml(title, message, false);
    modalCancelBtn.classList.add("hidden");
    prepareModalMotion();

    const close = () => {
      modalOkBtn.removeEventListener("click", onOk);
      appModal.removeEventListener("click", onOverlayClick);
      closeModalMotion(() => resolve(true));
    };
    const onOk = () => close();
    const onOverlayClick = (event) => {
      if (isModalOverlayTarget(event)) close();
    };
    modalOkBtn.addEventListener("click", onOk);
    appModal.addEventListener("click", onOverlayClick);
  });
}

function appConfirm(message, title = "Confirm") {
  return new Promise((resolve) => {
    if (!appModal || !modalOkBtn || !modalMessage || !modalTitle || !modalCancelBtn) {
      resolve(window.confirm(message));
      return;
    }

    modalTitle.innerText = "";
    modalTitle.classList.add("hidden");
    modalOkBtn.parentElement?.classList.remove("single-btn");
    modalMessage.className = "modal-message centered";
    modalMessage.innerHTML = buildModalMessageHtml(title, message, true);
    modalCancelBtn.classList.remove("hidden");
    prepareModalMotion();

    const close = (result) => {
      modalOkBtn.removeEventListener("click", onOk);
      modalCancelBtn.removeEventListener("click", onCancel);
      appModal.removeEventListener("click", onOverlayClick);
      closeModalMotion(() => resolve(result));
    };
    const onOk = () => close(true);
    const onCancel = () => close(false);
    const onOverlayClick = (event) => {
      if (isModalOverlayTarget(event)) close(false);
    };
    modalOkBtn.addEventListener("click", onOk);
    modalCancelBtn.addEventListener("click", onCancel);
    appModal.addEventListener("click", onOverlayClick);
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

bindModalClickGuard();

if (modalCloseBtn) {
  modalCloseBtn.addEventListener("click", () => {
    if (modalCancelBtn && !modalCancelBtn.classList.contains("hidden")) {
      modalCancelBtn.click();
    } else {
      modalOkBtn?.click();
    }
  });
}
