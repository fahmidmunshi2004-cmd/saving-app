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
        role: "personal",
        canEdit: true
      };
      saveSession();
      stopGroupRealtimeSync();
      loadData();
      updateUI(false);
      applyAuthState();
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
  localStorage.setItem("income", income);
  localStorage.setItem("expense", expense);
  localStorage.setItem("breakdown", JSON.stringify(breakdown));
  localStorage.setItem("transactions", JSON.stringify(transactions));
  localStorage.setItem("deletedTransactions", JSON.stringify(deletedTransactions));

  const canSyncGroupFinance = syncRemote && currentSession?.groupId && db && (isCurrentAdmin() || !!currentSession?.canEdit);
  if (canSyncGroupFinance) {
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
const MODAL_ANIMATION_STORAGE_KEY = "vault_modal_animation";
const DEFAULT_MODAL_ANIMATION = "meep";
const MODAL_ANIMATION_SET = new Set([
  "simple",
  "meep",
  "unfolding",
  "revealing",
  "uncovering",
  "blow-up",
  "sketch",
  "bond"
]);
let currentModalAnimation = readPreferredModalAnimation();

function getModalCardElement() {
  return appModal ? appModal.querySelector(".modal-card") : null;
}

function normalizeModalAnimation(value) {
  const next = String(value || "").trim();
  return MODAL_ANIMATION_SET.has(next) ? next : DEFAULT_MODAL_ANIMATION;
}

function readPreferredModalAnimation() {
  try {
    const stored = localStorage.getItem(MODAL_ANIMATION_STORAGE_KEY);
    return normalizeModalAnimation(stored);
  } catch (_) {
    return DEFAULT_MODAL_ANIMATION;
  }
}

function syncModalAnimationSelect(value) {
  if (modalAnimationSelect) {
    modalAnimationSelect.value = normalizeModalAnimation(value);
  }
}

function applyModalAnimation(value, persist = true) {
  currentModalAnimation = normalizeModalAnimation(value);

  if (persist) {
    try {
      localStorage.setItem(MODAL_ANIMATION_STORAGE_KEY, currentModalAnimation);
    } catch (_) {
      // ignore storage errors
    }
  }

  syncModalAnimationSelect(currentModalAnimation);

  if (appModal) {
    appModal.dataset.modalAnimation = currentModalAnimation;
  }
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

function getModalAnimationPreset(animation, phase) {
  const isOut = phase === "out";
  switch (animation) {
    case "simple":
      return isOut
        ? {
          keyframes: [
            { opacity: 1, transform: "translateY(0) scale(1)" },
            { opacity: 0, transform: "translateY(12px) scale(0.96)" }
          ],
          options: { duration: 260, easing: "ease-in" }
        }
        : {
          keyframes: [
            { opacity: 0, transform: "translateY(18px) scale(0.94)" },
            { opacity: 1, transform: "translateY(0) scale(1)" }
          ],
          options: { duration: 340, easing: "cubic-bezier(0.2, 0.85, 0.2, 1)" }
        };
    case "unfolding":
      return isOut
        ? {
          keyframes: [
            { opacity: 1, transform: "perspective(900px) rotateX(0deg) translateY(0) scale(1)" },
            { opacity: 0, transform: "perspective(900px) rotateX(70deg) translateY(-10px) scale(0.95)" }
          ],
          options: { duration: 340, easing: "ease-in" }
        }
        : {
          keyframes: [
            { opacity: 0, transform: "perspective(900px) rotateX(-76deg) translateY(-14px) scale(0.94)" },
            { opacity: 1, transform: "perspective(900px) rotateX(0deg) translateY(0) scale(1)" }
          ],
          options: { duration: 480, easing: "cubic-bezier(0.2, 0.85, 0.18, 1)" }
        };
    case "revealing":
      return isOut
        ? {
          keyframes: [
            { opacity: 1, transform: "translateY(0) scale(1)", clipPath: "inset(0 0 0 0 round 18px)" },
            { opacity: 0, transform: "translateY(10px) scale(0.9)", clipPath: "inset(44% 44% 44% 44% round 18px)" }
          ],
          options: { duration: 280, easing: "ease-in" }
        }
        : {
          keyframes: [
            { opacity: 0, transform: "translateY(10px) scale(0.78)", clipPath: "inset(52% 52% 52% 52% round 18px)" },
            { opacity: 1, transform: "translateY(0) scale(1)", clipPath: "inset(0 0 0 0 round 18px)" }
          ],
          options: { duration: 500, easing: "cubic-bezier(0.15, 0.85, 0.2, 1)" }
        };
    case "uncovering":
      return isOut
        ? {
          keyframes: [
            { opacity: 1, transform: "translateY(0) scale(1)", clipPath: "inset(0 0 0 0 round 18px)" },
            { opacity: 0, transform: "translateY(18px) scale(0.92)", clipPath: "inset(0 0 0 100% round 18px)" }
          ],
          options: { duration: 280, easing: "ease-in" }
        }
        : {
          keyframes: [
            { opacity: 0, transform: "translateY(28px) scale(0.86)", clipPath: "inset(0 100% 0 0 round 18px)" },
            { opacity: 1, transform: "translateY(0) scale(1)", clipPath: "inset(0 0 0 0 round 18px)" }
          ],
          options: { duration: 440, easing: "cubic-bezier(0.2, 0.9, 0.2, 1)" }
        };
    case "blow-up":
      return isOut
        ? {
          keyframes: [
            { opacity: 1, transform: "scale(1) rotate(0deg)", filter: "blur(0)" },
            { opacity: 0, transform: "scale(0.4) rotate(10deg)", filter: "blur(3px)" }
          ],
          options: { duration: 300, easing: "ease-in" }
        }
        : {
          keyframes: [
            { opacity: 0, transform: "scale(0.22) rotate(-18deg)", filter: "blur(2px)" },
            { opacity: 1, transform: "scale(1.06) rotate(2deg)", filter: "blur(0)", offset: 0.7 },
            { opacity: 1, transform: "scale(1) rotate(0deg)", filter: "blur(0)" }
          ],
          options: { duration: 500, easing: "cubic-bezier(0.16, 0.9, 0.2, 1)" }
        };
    case "sketch":
      return isOut
        ? {
          keyframes: [
            { opacity: 1, transform: "translateY(0) scale(1)", boxShadow: "0 0 0 0 rgba(255, 1, 79, 0)" },
            { opacity: 0, transform: "translateY(10px) scale(0.94)", boxShadow: "0 0 0 10px rgba(255, 1, 79, 0.08)" }
          ],
          options: { duration: 280, easing: "ease-in" }
        }
        : {
          keyframes: [
            { opacity: 0, transform: "translateY(10px) scale(0.94)", boxShadow: "0 0 0 0 rgba(255, 1, 79, 0)" },
            { opacity: 1, transform: "translateY(-2px) scale(1.01)", boxShadow: "0 0 0 8px rgba(255, 1, 79, 0.08)", offset: 0.72 },
            { opacity: 1, transform: "translateY(0) scale(1)", boxShadow: "0 0 0 0 rgba(255, 1, 79, 0)" }
          ],
          options: { duration: 520, easing: "cubic-bezier(0.18, 0.85, 0.18, 1)" }
        };
    case "bond":
      return isOut
        ? {
          keyframes: [
            { opacity: 1, transform: "translateY(0) scale(1)", clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" },
            { opacity: 0, transform: "translateY(16px) scale(0.88)", clipPath: "polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%)" }
          ],
          options: { duration: 300, easing: "ease-in" }
        }
        : {
          keyframes: [
            { opacity: 0, transform: "translateY(18px) scale(0.8)", clipPath: "polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%)" },
            { opacity: 1, transform: "translateY(-4px) scale(1.03)", clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", offset: 0.55 },
            { opacity: 1, transform: "translateY(0) scale(1)", clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" }
          ],
          options: { duration: 460, easing: "cubic-bezier(0.2, 0.9, 0.18, 1)" }
        };
    case "meep":
    default:
      return isOut
        ? {
          keyframes: [
            { opacity: 1, transform: "translateY(0) scale(1) rotate(0deg)" },
            { opacity: 0, transform: "translateY(18px) scale(0.82) rotate(5deg)" }
          ],
          options: { duration: 440, easing: "cubic-bezier(0.25, 0.7, 0.2, 1)" }
        }
        : {
          keyframes: [
            { opacity: 0, transform: "translateY(28px) scale(0.72) rotate(-6deg)" },
            { opacity: 1, transform: "translateY(-8px) scale(1.035) rotate(1.5deg)", offset: 0.62 },
            { opacity: 1, transform: "translateY(0) scale(1) rotate(0deg)" }
          ],
          options: { duration: 560, easing: "cubic-bezier(0.18, 0.9, 0.2, 1)" }
        };
  }
}

function playModalCardAnimation(phase) {
  const card = getModalCardElement();
  if (!card || typeof card.animate !== "function") return null;

  card.getAnimations().forEach((animation) => animation.cancel());
  card.style.animation = "none";

  const preset = getModalAnimationPreset(currentModalAnimation, phase);
  const animation = card.animate(preset.keyframes, {
    ...preset.options,
    fill: "both"
  });

  return {
    animation,
    cleanup() {
      card.style.animation = "";
    }
  };
}

function prepareModalMotion() {
  if (!appModal) return;
  clearModalCloseTimer();
  appModal.classList.remove("hidden");
  appModal.classList.remove("closing");
  appModal.classList.remove("modal-motion");
  appModal.dataset.modalAnimation = currentModalAnimation;
  void appModal.offsetWidth;
  window.requestAnimationFrame(() => {
    appModal.classList.add("modal-motion");
    const playback = playModalCardAnimation("in");
    playback?.animation?.finished.finally(playback.cleanup);
  });
}

function closeModalMotion(onDone) {
  if (!appModal) {
    if (typeof onDone === "function") onDone();
    return;
  }

  clearModalCloseTimer();
  appModal.classList.add("closing");
  const playback = playModalCardAnimation("out");
  let finished = false;
  const finishClose = () => {
    if (finished) return;
    finished = true;
    appModal.classList.add("hidden");
    appModal.classList.remove("closing");
    appModal.classList.remove("modal-motion");
    if (typeof onDone === "function") onDone();
  };

  if (playback?.animation) {
    modalCloseTimer = setTimeout(() => {
      finishClose();
      playback.cleanup();
    }, 520);
    playback.animation.finished.finally(() => {
      clearModalCloseTimer();
      finishClose();
      playback.cleanup();
    });
    return;
  }

  modalCloseTimer = setTimeout(() => {
    finishClose();
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
      if (event.target === appModal) close();
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
      if (event.target === appModal) close(false);
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

if (modalAnimationSelect) {
  modalAnimationSelect.addEventListener("change", () => {
    applyModalAnimation(modalAnimationSelect.value);
  });
}

applyModalAnimation(currentModalAnimation, false);
window.setModalAnimation = applyModalAnimation;
window.getModalAnimation = () => currentModalAnimation;

