let income = 0;
let expense = 0;
let canEdit = false;
let expenseChart = null;

const breakdown = JSON.parse(localStorage.getItem("breakdown")) || {};
const transactions = JSON.parse(localStorage.getItem("transactions")) || [];

const GROUPS_KEY = "vault_groups";
const GROUP_ACCOUNTS_KEY = "vault_group_accounts";
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
let googleProvider = null;
let firebaseUser = null;
let currentSession = null;

function getGroups() {
  return JSON.parse(localStorage.getItem(GROUPS_KEY)) || [];
}

function saveGroups(groups) {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

function getGroupAccounts() {
  return JSON.parse(localStorage.getItem(GROUP_ACCOUNTS_KEY)) || [];
}

function saveGroupAccounts(accounts) {
  localStorage.setItem(GROUP_ACCOUNTS_KEY, JSON.stringify(accounts));
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
}

function loadData() {
  income = Number(localStorage.getItem("income")) || 0;
  expense = Number(localStorage.getItem("expense")) || 0;
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

function getCurrentGroup() {
  if (!currentSession?.groupId) return null;
  return getGroups().find((g) => g.id === currentSession.groupId) || null;
}

function isCurrentAdmin() {
  return currentSession?.role === "admin";
}

function refreshSettingsPanels() {
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

  const group = getCurrentGroup();
  if (!group) {
    groupMembersCard.classList.add("hidden");
    inviteCard.classList.add("hidden");
    requestAccessCard.classList.add("hidden");
    pendingRequestsCard.classList.add("hidden");
    return;
  }

  groupMembersCard.classList.remove("hidden");
  groupMemberCount.innerText = String(group.members.length || 1);

  inviteCard.classList.toggle("hidden", !isCurrentAdmin());
  pendingRequestsCard.classList.toggle("hidden", !isCurrentAdmin());
  requestAccessCard.classList.toggle("hidden", isCurrentAdmin());

  renderPendingRequests(group);
}

function renderPendingRequests(group) {
  pendingRequestsList.innerHTML = "";
  const pending = (group.accessRequests || []).filter((r) => r.status === "pending");

  if (!pending.length) {
    const li = document.createElement("li");
    li.innerText = "No pending request";
    pendingRequestsList.appendChild(li);
    return;
  }

  for (const req of pending) {
    const li = document.createElement("li");
    const info = document.createElement("div");
    const btn = document.createElement("button");
    info.innerText = `${req.fromLabel} চাইছে edit access`;
    btn.className = "btn income-btn";
    btn.style.marginTop = "8px";
    btn.innerText = "Approve";
    btn.onclick = () => approveAccessRequest(group.id, req.id);
    li.appendChild(info);
    li.appendChild(btn);
    pendingRequestsList.appendChild(li);
  }
}

function approveAccessRequest(groupId, reqId) {
  const groups = getGroups();
  const idx = groups.findIndex((g) => g.id === groupId);
  if (idx < 0) return;
  const group = groups[idx];

  const request = (group.accessRequests || []).find((r) => r.id === reqId);
  if (!request) return;

  const member = group.members.find((m) => m.memberId === request.fromId);
  if (member) {
    member.canEdit = true;
    member.role = "editor";
  }

  request.status = "approved";
  saveGroups(groups);

  if (currentSession && currentSession.memberId === request.fromId) {
    currentSession.role = "editor";
    currentSession.canEdit = true;
    saveSession();
  }

  refreshSettingsPanels();
  setEditAccess(isCurrentAdmin() || !!currentSession?.canEdit);
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

function processInviteLink() {
  if (!firebaseUser) return;
  const params = new URLSearchParams(window.location.search);
  const token = params.get("inviteToken");
  const groupId = params.get("groupId");
  const invitedEmail = params.get("email");

  if (!token || !groupId || !invitedEmail) return;
  if (firebaseUser.email?.toLowerCase() !== invitedEmail.toLowerCase()) return;

  const groups = getGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return;

  const invite = (group.invites || []).find((i) => i.token === token && i.status === "pending");
  if (!invite) return;

  const memberId = `gmail_${firebaseUser.uid}`;
  const exists = group.members.some((m) => m.memberId === memberId);
  if (!exists) {
    group.members.push({
      memberId,
      type: "gmail",
      label: firebaseUser.email,
      role: "viewer",
      canEdit: false
    });
  }
  invite.status = "accepted";
  saveGroups(groups);

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
  applyAuthState();

  params.delete("inviteToken");
  params.delete("groupId");
  params.delete("email");
  history.replaceState({}, "", `${location.pathname}${params.toString() ? `?${params.toString()}` : ""}`);
}

function handleGoogleAuthUser(user) {
  firebaseUser = user || null;
  if (!firebaseUser) {
    if (currentSession?.type === "gmail") {
      currentSession = null;
      saveSession();
    }
    applyAuthState();
    return;
  }

  const groups = getGroups();
  const memberId = `gmail_${firebaseUser.uid}`;
  const group = groups.find((g) => (g.members || []).some((m) => m.memberId === memberId));

  if (group) {
    const member = group.members.find((m) => m.memberId === memberId);
    currentSession = {
      type: "gmail",
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      groupId: group.id,
      memberId,
      role: member.role || "viewer",
      canEdit: !!member.canEdit
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
  processInviteLink();
  applyAuthState();
}

function loginOrCreateGroupAccount() {
  const username = groupUsername.value.trim();
  const password = groupPassword.value;
  if (!username || !password) {
    window.alert("Username and password দিন।");
    return;
  }

  const accounts = getGroupAccounts();
  let account = accounts.find((a) => a.username.toLowerCase() === username.toLowerCase());

  if (!account) {
    const groupId = `grp_${Date.now()}`;
    account = { username, password, groupId, role: "admin", canEdit: true, memberId: `group_${username}` };
    accounts.push(account);
    saveGroupAccounts(accounts);

    const groups = getGroups();
    groups.push({
      id: groupId,
      adminUsername: username,
      members: [{ memberId: account.memberId, type: "group", label: username, role: "admin", canEdit: true }],
      invites: [],
      accessRequests: []
    });
    saveGroups(groups);
  } else {
    if (account.password !== password) {
      window.alert("Password ভুল।");
      return;
    }
  }

  currentSession = {
    type: "group",
    username: account.username,
    groupId: account.groupId,
    memberId: account.memberId,
    role: account.role || "admin",
    canEdit: account.canEdit !== false
  };
  saveSession();
  applyAuthState();
}

function sendInviteToGmail() {
  if (!isCurrentAdmin()) return;
  const email = inviteEmailInput.value.trim().toLowerCase();
  if (!email) {
    window.alert("Friend Gmail দিন");
    return;
  }

  const groups = getGroups();
  const group = groups.find((g) => g.id === currentSession.groupId);
  if (!group) return;

  group.invites = group.invites || [];
  const token = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  group.invites.push({ email, token, status: "pending" });
  saveGroups(groups);

  const link = `${location.origin}${location.pathname}?groupId=${encodeURIComponent(group.id)}&inviteToken=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  const subject = encodeURIComponent("VaultBudget Group Invite");
  const body = encodeURIComponent(`Please join my group account. Click this link: ${link}`);

  window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
  inviteEmailInput.value = "";
  window.alert("Invite email compose window খুলবে। Send করলে invite যাবে।");
}

function requestEditAccess() {
  const adminEmail = requestAccessEmailInput.value.trim().toLowerCase();
  if (!adminEmail) {
    window.alert("Admin Gmail দিন");
    return;
  }

  const groups = getGroups();
  const group = groups.find((g) => g.id === currentSession?.groupId);
  if (!group) return;

  group.accessRequests = group.accessRequests || [];
  const reqId = `req_${Date.now()}`;
  const fromLabel = currentSession.type === "gmail" ? currentSession.email : currentSession.username;

  group.accessRequests.push({
    id: reqId,
    fromId: currentSession.memberId,
    fromLabel,
    toEmail: adminEmail,
    status: "pending"
  });

  saveGroups(groups);
  requestAccessEmailInput.value = "";
  window.alert("Access request admin queue-তে গেছে। Admin approve করলে edit access পাবেন।");
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

function initGoogleAuth() {
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  googleProvider = new firebase.auth.GoogleAuthProvider();
  auth.onAuthStateChanged(handleGoogleAuthUser);
}

themeToggle.addEventListener("click", () => {
  const current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  applyTheme(current === "dark" ? "light" : "dark");
});

navButtons.forEach((btn) => btn.addEventListener("click", () => showView(btn.dataset.view)));
downloadPdfBtn.addEventListener("click", downloadReportPdf);

groupModeBtn.addEventListener("click", () => groupLoginFields.classList.toggle("hidden"));
groupLoginBtn.addEventListener("click", loginOrCreateGroupAccount);
sendInviteBtn.addEventListener("click", sendInviteToGmail);
requestAccessBtn.addEventListener("click", requestEditAccess);

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

  if (auth && auth.currentUser) await auth.signOut();
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
initGoogleAuth();

window.addIncome = addIncome;
window.addExpense = addExpense;
