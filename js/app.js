let income = 0;
let expense = 0;
let canEdit = false;
let expenseChart = null;

const breakdown = JSON.parse(localStorage.getItem("breakdown")) || {};
const transactions = JSON.parse(localStorage.getItem("transactions")) || [];
const SESSION_KEY = "vault_session";

const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");
const authInfo = document.getElementById("authInfo");
const loginOverlay = document.getElementById("loginOverlay");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const groupModeBtn = document.getElementById("groupModeBtn");
const groupLoginFields = document.getElementById("groupLoginFields");
const groupUsername = document.getElementById("groupUsername");
const groupPassword = document.getElementById("groupPassword");
const groupLoginBtn = document.getElementById("groupLoginBtn");

const clearDataBtn = document.getElementById("clearDataBtn");
const incomeInput = document.getElementById("incomeInput");
const incomeSourceInput = document.getElementById("incomeSourceInput");
const expenseInput = document.getElementById("expenseInput");
const categoryInput = document.getElementById("categoryInput");
const incomeBtn = document.getElementById("incomeBtn");
const expenseBtn = document.getElementById("expenseBtn");

const navButtons = document.querySelectorAll(".nav-btn");
const views = document.querySelectorAll(".view");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");
const expenseChartCanvas = document.getElementById("expenseColumnChart");
const topCategory = document.getElementById("topCategory");
const topExpense = document.getElementById("topExpense");
const totalCategory = document.getElementById("totalCategory");

const accountTypeText = document.getElementById("accountTypeText");
const accountRoleText = document.getElementById("accountRoleText");
const groupMembersCard = document.getElementById("groupMembersCard");
const groupMemberCount = document.getElementById("groupMemberCount");
const inviteCard = document.getElementById("inviteCard");
const inviteEmailInput = document.getElementById("inviteEmailInput");
const sendInviteBtn = document.getElementById("sendInviteBtn");
const inviteStatusText = document.getElementById("inviteStatusText");
const requestAccessCard = document.getElementById("requestAccessCard");
const requestAccessEmailInput = document.getElementById("requestAccessEmailInput");
const requestAccessBtn = document.getElementById("requestAccessBtn");
const pendingRequestsCard = document.getElementById("pendingRequestsCard");
const pendingRequestsList = document.getElementById("pendingRequestsList");

const firebaseConfig = {
  apiKey: "AIzaSyDDGb1bNysz2Vszt116K2a3GGL9Rzsx9II",
  authDomain: "saving-app-da3b7.firebaseapp.com",
  projectId: "saving-app-da3b7",
  storageBucket: "saving-app-da3b7.firebasestorage.app",
  messagingSenderId: "989914118071",
  appId: "1:989914118071:web:6ee7e72b5eda7c7f311a32",
  measurementId: "G-8T0TCWSVCM"
};

let auth = null;
let db = null;
let googleProvider = null;
let firebaseUser = null;
let currentSession = null;
let pendingInviteInfo = null;

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

  // For group accounts, keep a shared copy in Firestore so all members see same data.
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

async function getCurrentMemberDoc() {
  if (!currentSession?.groupId || !currentSession?.memberId || !db) return null;
  const snap = await db
    .collection("groupMembers")
    .where("groupId", "==", currentSession.groupId)
    .where("memberId", "==", currentSession.memberId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

async function refreshSettingsPanels() {
  if (!currentSession) {
    accountTypeText.innerText = "-";
    accountRoleText.innerText = "-";
    groupMembersCard.classList.add("hidden");
    inviteCard.classList.add("hidden");
    requestAccessCard.classList.add("hidden");
    pendingRequestsCard.classList.add("hidden");
    return;
  }

  accountTypeText.innerText = currentSession.type === "group" ? "Group Account" : "Gmail Account";
  accountRoleText.innerText = currentSession.role || "viewer";

  if (!currentSession.groupId || !db) {
    groupMembersCard.classList.add("hidden");
    inviteCard.classList.add("hidden");
    requestAccessCard.classList.add("hidden");
    pendingRequestsCard.classList.add("hidden");
    return;
  }

  const memberSnap = await db.collection("groupMembers").where("groupId", "==", currentSession.groupId).get();
  groupMembersCard.classList.remove("hidden");
  groupMemberCount.innerText = String(memberSnap.size || 0);

  inviteCard.classList.toggle("hidden", !isCurrentAdmin());
  pendingRequestsCard.classList.toggle("hidden", !isCurrentAdmin());
  requestAccessCard.classList.toggle("hidden", isCurrentAdmin());

  await renderPendingRequests();
}

async function renderPendingRequests() {
  if (!isCurrentAdmin() || !currentSession?.groupId) return;
  pendingRequestsList.innerHTML = "";

  const snap = await db
    .collection("accessRequests")
    .where("groupId", "==", currentSession.groupId)
    .where("status", "==", "pending")
    .get();

  if (snap.empty) {
    const li = document.createElement("li");
    li.innerText = "No pending request";
    pendingRequestsList.appendChild(li);
    return;
  }

  snap.forEach((doc) => {
    const req = doc.data();
    const li = document.createElement("li");
    const info = document.createElement("div");
    const btn = document.createElement("button");
    info.innerText = `${req.fromLabel} চাইছে edit access`;
    btn.className = "btn income-btn";
    btn.style.marginTop = "8px";
    btn.innerText = "Approve";
    btn.onclick = () => approveAccessRequest(doc.id, req.fromMemberId);
    li.appendChild(info);
    li.appendChild(btn);
    pendingRequestsList.appendChild(li);
  });
}

async function approveAccessRequest(requestId, fromMemberId) {
  const memberSnap = await db
    .collection("groupMembers")
    .where("groupId", "==", currentSession.groupId)
    .where("memberId", "==", fromMemberId)
    .limit(1)
    .get();

  if (!memberSnap.empty) {
    await db.collection("groupMembers").doc(memberSnap.docs[0].id).update({ role: "editor", canEdit: true });
  }

  await db.collection("accessRequests").doc(requestId).update({ status: "approved" });
  await refreshSettingsPanels();
}

async function requestEditAccess() {
  if (!currentSession?.groupId) return;
  const adminEmail = requestAccessEmailInput.value.trim().toLowerCase();
  if (!adminEmail) {
    window.alert("Admin Gmail দিন");
    return;
  }

  await db.collection("accessRequests").add({
    groupId: currentSession.groupId,
    fromMemberId: currentSession.memberId,
    fromLabel: currentSession.type === "gmail" ? currentSession.email : currentSession.username,
    toEmail: adminEmail,
    status: "pending",
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  requestAccessEmailInput.value = "";
  window.alert("Access request admin queue-তে গেছে।");
}

function applyAuthState() {
  if (!currentSession) {
    authInfo.innerText = "Private mode is enabled. Login first.";
    views.forEach((view) => view.classList.remove("active"));
    document.querySelector(".bottom-nav").classList.add("hidden");
    loginOverlay.classList.remove("hidden");
    setEditAccess(false);
    refreshSettingsPanels();
    return;
  }

  authInfo.innerText = currentSession.type === "gmail"
    ? `Logged in as ${currentSession.email}`
    : `Logged in as group user: ${currentSession.username}`;

  showView("homeView");
  document.querySelector(".bottom-nav").classList.remove("hidden");
  loginOverlay.classList.add("hidden");

  const editable = isCurrentAdmin() || !!currentSession.canEdit || (!currentSession.groupId && currentSession.type === "gmail");
  setEditAccess(editable);
  refreshSettingsPanels();
}

async function processInviteLink() {
  if (!firebaseUser || !db) return;
  const params = new URLSearchParams(window.location.search);
  const token = params.get("inviteToken");
  const groupId = params.get("groupId");
  const invitedEmail = params.get("email");
  if (!token || !groupId || !invitedEmail) return;
  if (firebaseUser.email?.toLowerCase() !== invitedEmail.toLowerCase()) return;

  const invRef = db.collection("invitations").doc(token);
  const invSnap = await invRef.get();
  if (!invSnap.exists) return;
  const inv = invSnap.data();
  if (inv.status !== "pending" || inv.groupId !== groupId) return;

  const memberId = `gmail_${firebaseUser.uid}`;
  const memberDocId = `${groupId}__${memberId}`;

  await db.collection("groupMembers").doc(memberDocId).set({
    groupId,
    memberId,
    type: "gmail",
    label: firebaseUser.email,
    role: "viewer",
    canEdit: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  await invRef.update({ status: "accepted", acceptedAt: firebase.firestore.FieldValue.serverTimestamp() });

  currentSession = {
    type: "gmail",
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    groupId,
    memberId,
    role: "viewer",
    canEdit: false
  };
  saveSession();

  params.delete("inviteToken");
  params.delete("groupId");
  params.delete("email");
  history.replaceState({}, "", `${location.pathname}${params.toString() ? `?${params.toString()}` : ""}`);
}

async function handleGoogleAuthUser(user) {
  firebaseUser = user || null;
  if (!firebaseUser) {
    if (currentSession?.type === "gmail") {
      currentSession = null;
      saveSession();
    }
    applyAuthState();
    return;
  }

  await processInviteLink();

  if (currentSession?.type === "gmail" && currentSession.uid === firebaseUser.uid) {
    applyAuthState();
    return;
  }

  const memberId = `gmail_${firebaseUser.uid}`;
  const snap = await db
    .collection("groupMembers")
    .where("memberId", "==", memberId)
    .limit(1)
    .get();

  if (!snap.empty) {
    const m = snap.docs[0].data();
    currentSession = {
      type: "gmail",
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      groupId: m.groupId,
      memberId,
      role: m.role || "viewer",
      canEdit: !!m.canEdit
    };
  } else {
    currentSession = {
      type: "gmail",
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      role: "owner",
      canEdit: true
    };
  }

  saveSession();
  await loadGroupSharedData();
  updateUI();
  applyAuthState();
}

async function loginOrCreateGroupAccount() {
  if (!db) {
    window.alert("Firebase not ready");
    return;
  }

  const username = groupUsername.value.trim();
  const password = groupPassword.value;
  if (!username || !password) {
    window.alert("Username and password দিন।");
    return;
  }

  const unameKey = normalizeUsername(username);
  const userRef = db.collection("groupUsers").doc(unameKey);
  const userSnap = await userRef.get();
  const invitedGroupId = pendingInviteInfo?.groupId || null;
  const invitedToken = pendingInviteInfo?.token || null;

  if (!userSnap.exists) {
    const groupId = invitedGroupId || db.collection("groups").doc().id;
    const groupRef = db.collection("groups").doc(groupId);
    const memberId = `group_${unameKey}`;

    const existingGroup = await groupRef.get();
    if (!existingGroup.exists) {
      await groupRef.set({
        id: groupId,
        adminUsername: invitedGroupId ? "" : username,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    await userRef.set({
      username,
      password,
      groupId,
      role: invitedGroupId ? "viewer" : "admin",
      canEdit: invitedGroupId ? false : true,
      memberId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await db.collection("groupMembers").doc(`${groupId}__${memberId}`).set({
      groupId,
      memberId,
      type: "group",
      label: username,
      role: invitedGroupId ? "viewer" : "admin",
      canEdit: invitedGroupId ? false : true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    if (invitedGroupId && invitedToken) {
      const invRef = db.collection("invitations").doc(invitedToken);
      const invSnap = await invRef.get();
      if (invSnap.exists) {
        const inv = invSnap.data();
        if (inv.status === "pending" && inv.groupId === invitedGroupId) {
          await invRef.update({ status: "accepted", acceptedAt: firebase.firestore.FieldValue.serverTimestamp() });
        }
      }
    }

    currentSession = {
      type: "group",
      username,
      groupId,
      memberId,
      role: invitedGroupId ? "viewer" : "admin",
      canEdit: invitedGroupId ? false : true
    };
  } else {
    const d = userSnap.data();
    if (d.password !== password) {
      window.alert("Password ভুল।");
      return;
    }
    if (invitedGroupId && d.groupId !== invitedGroupId) {
      window.alert("এই username অন্য group-এর। নতুন username দিন।");
      return;
    }

    currentSession = {
      type: "group",
      username: d.username,
      groupId: d.groupId,
      memberId: d.memberId,
      role: d.role || "admin",
      canEdit: d.canEdit !== false
    };
  }

  pendingInviteInfo = null;
  saveSession();
  await loadGroupSharedData();
  updateUI();
  applyAuthState();
}

async function sendInviteToGmail() {
  if (!isCurrentAdmin() || !currentSession?.groupId) return;
  const email = inviteEmailInput.value.trim().toLowerCase();
  if (!email) {
    window.alert("Friend Gmail দিন");
    return;
  }

  const token = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.collection("invitations").doc(token).set({
    token,
    groupId: currentSession.groupId,
    email,
    status: "pending",
    createdBy: currentSession.memberId,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  const link = `${location.origin}${location.pathname}?groupId=${encodeURIComponent(currentSession.groupId)}&inviteToken=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  const subject = encodeURIComponent("VaultBudget Group Invite");
  const body = encodeURIComponent(`Please join my group account. Click this link: ${link}`);

  let copied = false;
  try {
    await navigator.clipboard.writeText(link);
    copied = true;
  } catch (_) {
    copied = false;
  }

  const mailWindow = window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
  const popupBlocked = !mailWindow;

  inviteEmailInput.value = "";
  inviteStatusText.innerText = copied
    ? `Invite ready. Link copied for ${email}.`
    : `Invite created for ${email}.`;

  if (popupBlocked) {
    window.alert(`Popup blocked. এই invite link manually share করুন:\n\n${link}`);
    return;
  }

  if (!copied) {
    window.alert(`Invite compose opened. প্রয়োজনে এই link manually share করুন:\n\n${link}`);
  }
}

function renderTransactions() {
  const tbody = document.getElementById("txnTableBody");
  const txnEmpty = document.getElementById("txnEmpty");
  const txnCount = document.getElementById("txnCount");
  tbody.innerHTML = "";

  txnCount.innerText = `${transactions.length} records`;
  txnEmpty.hidden = transactions.length > 0;

  for (const txn of [...transactions].reverse()) {
    const row = document.createElement("tr");
    const time = document.createElement("td");
    const type = document.createElement("td");
    const category = document.createElement("td");
    const amount = document.createElement("td");
    const chip = document.createElement("span");

    time.innerText = txn.time;
    chip.className = `type-chip ${txn.type === "income" ? "type-income" : "type-expense"}`;
    chip.innerHTML = txn.type === "income" ? '<i class="fa-solid fa-arrow-up"></i> Income' : '<i class="fa-solid fa-arrow-down"></i> Expense';
    type.appendChild(chip);

    category.innerText = txn.category;
    amount.innerText = formatMoney(txn.amount);
    amount.className = txn.type === "income" ? "amount-income" : "amount-expense";

    row.appendChild(time);
    row.appendChild(type);
    row.appendChild(category);
    row.appendChild(amount);
    tbody.appendChild(row);
  }
}

function renderExpenseChart() {
  const categories = Object.keys(breakdown);
  const values = categories.map((cat) => breakdown[cat]);
  totalCategory.innerText = String(categories.length);

  if (!categories.length) {
    topCategory.innerText = "-";
    topExpense.innerText = "0 BDT";
  } else {
    const maxIndex = values.indexOf(Math.max(...values));
    topCategory.innerText = categories[maxIndex];
    topExpense.innerText = formatMoney(values[maxIndex]);
  }

  const ctx = expenseChartCanvas.getContext("2d");
  if (expenseChart) expenseChart.destroy();

  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, "#ff014f");
  gradient.addColorStop(0.5, "#f9004d");
  gradient.addColorStop(1, "#d11414");

  expenseChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: categories.length ? categories : ["No Data"],
      datasets: [{
        label: "Expense (BDT)",
        data: categories.length ? values : [0],
        borderRadius: 12,
        borderSkipped: false,
        maxBarThickness: 38,
        backgroundColor: gradient,
        hoverBackgroundColor: "#ff014f"
      }]
    },
    options: {
      animation: { duration: 900, easing: "easeOutQuart" },
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    }
  });
}

function updateUI() {
  document.getElementById("income").innerText = formatMoney(income);
  document.getElementById("expense").innerText = formatMoney(expense);
  document.getElementById("balance").innerText = formatMoney(income - expense);
  document.getElementById("walletIncome").innerText = formatMoney(income);
  document.getElementById("walletExpense").innerText = formatMoney(expense);
  document.getElementById("walletBalance").innerText = formatMoney(income - expense);
  document.getElementById("walletRate").innerText = income > 0 ? `${Math.max(0, Math.round(((income - expense) / income) * 100))}%` : "0%";

  const list = document.getElementById("list");
  const emptyState = document.getElementById("emptyState");
  list.innerHTML = "";

  const categories = Object.keys(breakdown);
  const maxValue = Math.max(1, ...Object.values(breakdown));
  emptyState.hidden = categories.length > 0;

  for (const key of categories) {
    const li = document.createElement("li");
    const row = document.createElement("div");
    const cat = document.createElement("span");
    const amount = document.createElement("strong");
    const bar = document.createElement("div");
    const fill = document.createElement("span");

    row.className = "row";
    bar.className = "bar";
    cat.innerText = key;
    amount.innerText = formatMoney(breakdown[key]);
    fill.style.width = `${(breakdown[key] / maxValue) * 100}%`;

    row.appendChild(cat);
    row.appendChild(amount);
    bar.appendChild(fill);
    li.appendChild(row);
    li.appendChild(bar);
    list.appendChild(li);
  }

  renderTransactions();
  renderExpenseChart();
  saveData();
}

function addIncome() {
  if (!canEdit) return;
  const val = Number(incomeInput.value);
  const source = incomeSourceInput.value.trim();
  if (!val || val < 0) return;
  income += val;
  transactions.push({ time: new Date().toLocaleString("en-BD"), type: "income", category: source || "General Income", amount: val });
  incomeInput.value = "";
  incomeSourceInput.value = "";
  updateUI();
}

function addExpense() {
  if (!canEdit) return;
  const val = Number(expenseInput.value);
  const cat = categoryInput.value.trim();
  if (!val || val < 0 || cat === "") return;
  expense += val;
  breakdown[cat] = (breakdown[cat] || 0) + val;
  transactions.push({ time: new Date().toLocaleString("en-BD"), type: "expense", category: cat, amount: val });
  expenseInput.value = "";
  categoryInput.value = "";
  updateUI();
}

function downloadReportPdf() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    window.alert("PDF library load hoyni. Please refresh and try again.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text("VaultBudget Report", 14, 16);
  doc.text(`Total Income: ${formatMoney(income)}`, 14, 30);
  doc.text(`Total Expense: ${formatMoney(expense)}`, 14, 36);
  doc.text(`Balance: ${formatMoney(income - expense)}`, 14, 42);
  doc.save(`vaultbudget-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function initFirebase() {
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
  googleProvider = new firebase.auth.GoogleAuthProvider();
  auth.onAuthStateChanged((user) => {
    handleGoogleAuthUser(user).catch((e) => window.alert(e.message || "Auth error"));
  });
}

function captureInviteInfoFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("groupId");
  const token = params.get("inviteToken");
  const email = params.get("email");
  if (groupId && token) {
    pendingInviteInfo = { groupId, token, email: email || "" };
    groupLoginFields.classList.remove("hidden");
    groupLoginBtn.innerText = "Join Group";
  }
}

themeToggle.addEventListener("click", () => {
  const current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  applyTheme(current === "dark" ? "light" : "dark");
});

navButtons.forEach((btn) => btn.addEventListener("click", () => showView(btn.dataset.view)));
downloadPdfBtn.addEventListener("click", downloadReportPdf);

groupModeBtn.addEventListener("click", () => groupLoginFields.classList.toggle("hidden"));
groupLoginBtn.addEventListener("click", () => {
  loginOrCreateGroupAccount().catch((e) => window.alert(e.message || "Group login error"));
});

sendInviteBtn.addEventListener("click", () => {
  sendInviteToGmail().catch((e) => window.alert(e.message || "Invite failed"));
});

requestAccessBtn.addEventListener("click", () => {
  requestEditAccess().catch((e) => window.alert(e.message || "Request failed"));
});

googleLoginBtn.addEventListener("click", async () => {
  try {
    await auth.signInWithPopup(googleProvider);
  } catch (error) {
    window.alert(error?.message || "Google login failed.");
  }
});

clearDataBtn.addEventListener("click", async () => {
  const ok = window.confirm("Are you sure? This will clear all app data.");
  if (!ok) return;

  income = 0;
  expense = 0;
  Object.keys(breakdown).forEach((key) => delete breakdown[key]);
  transactions.length = 0;

  localStorage.removeItem("income");
  localStorage.removeItem("expense");
  localStorage.removeItem("breakdown");
  localStorage.removeItem("transactions");
  localStorage.removeItem("theme");

  if (auth && auth.currentUser) {
    await auth.signOut();
  }

  currentSession = null;
  saveSession();
  applyTheme("light");
  updateUI();
  applyAuthState();
});

loadTheme();
loadData();
updateUI();
loadSession();
applyAuthState();
captureInviteInfoFromUrl();
initFirebase();

window.addIncome = addIncome;
window.addExpense = addExpense;
