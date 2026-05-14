let income = 0;
let expense = 0;
let canEdit = false;
let expenseChart = null;
let auth = null;
let db = null;
let googleProvider = null;
let firebaseUser = null;
let currentSession = null;
let pendingInviteInfo = null;
let dbOfflineWarned = false;

const breakdown = {};
const transactions = [];
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

function formatMoney(value) {
    return `${Number(value || 0).toLocaleString("en-BD")} BDT`;
}

function showView(viewId) {
    views.forEach((view) => view.classList.toggle("active", view.id === viewId));
    navButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.view === viewId));
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

function saveSession() {
  if (currentSession) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));
  } else {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }
}

function loadSession() {
  const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
  currentSession = raw ? JSON.parse(raw) : null;
}

function getDataScopeId() {
    if (!currentSession) return null;
    if (currentSession.groupId) return `group_${currentSession.groupId}`;
    if (currentSession.uid) return `user_${currentSession.uid}`;
    return null;
}

function getCacheKey() {
  const scopeId = getDataScopeId();
  return scopeId ? `vault_cache_${scopeId}` : null;
}

function saveFinanceCache() {
  const key = getCacheKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify({ income, expense, breakdown, transactions }));
}

function loadFinanceCache() {
  const key = getCacheKey();
  if (!key) return false;
  const raw = localStorage.getItem(key);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    income = Number(data?.income || 0);
    expense = Number(data?.expense || 0);
    Object.keys(breakdown).forEach((k) => delete breakdown[k]);
    Object.assign(breakdown, data?.breakdown || {});
    transactions.length = 0;
    (data?.transactions || []).forEach((t) => transactions.push(t));
    return true;
  } catch {
    return false;
  }
}

async function loadFinanceData() {
  const scopeId = getDataScopeId();
  if (!scopeId || !db) {
    // Keep current in-memory/cache state until auth/session is ready.
    return;
  }

  let snap;
  try {
    snap = await db.collection("finance_data").doc(scopeId).get();
  } catch (error) {
    const loaded = loadFinanceCache();
    const isOfflineErr = String(error?.message || "").toLowerCase().includes("offline");
    if (!loaded && !isOfflineErr) {
      window.alert(`Data load fail: ${error?.message || "unknown error"}`);
    } else if (isOfflineErr && !dbOfflineWarned) {
      dbOfflineWarned = true;
      window.alert("Internet/Firestore offline. Cached data দেখানো হচ্ছে।");
    }
    return;
  }
  dbOfflineWarned = false;
  const data = snap.exists ? snap.data() : null;

    income = Number(data?.income || 0);
    expense = Number(data?.expense || 0);
    Object.keys(breakdown).forEach((k) => delete breakdown[k]);
    Object.assign(breakdown, data?.breakdown || {});
  transactions.length = 0;
  (data?.transactions || []).forEach((t) => transactions.push(t));
  saveFinanceCache();
}

async function saveFinanceData() {
  const scopeId = getDataScopeId();
  if (!scopeId || !db) return;
  // Save immediate cache first so quick reload won't lose data.
  saveFinanceCache();

  try {
    await db.collection("finance_data").doc(scopeId).set({
      income,
      expense,
      breakdown,
      transactions,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    saveFinanceCache();
  } catch (error) {
    window.alert(`Data save fail: ${error?.message || "unknown error"}`);
    saveFinanceCache();
  }
}

async function getGroupDoc(groupId) {
    const snap = await db.collection("groups").doc(groupId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
}

async function saveGroupDoc(groupId, payload) {
    await db.collection("groups").doc(groupId).set(payload, { merge: true });
}

function isCurrentAdmin() {
    return currentSession?.role === "admin";
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

    if (!currentSession.groupId) {
        groupMembersCard.classList.add("hidden");
        inviteCard.classList.add("hidden");
        requestAccessCard.classList.add("hidden");
        pendingRequestsCard.classList.add("hidden");
        return;
    }

    const group = await getGroupDoc(currentSession.groupId);
    if (!group) return;

    groupMembersCard.classList.remove("hidden");
    groupMemberCount.innerText = String((group.members || []).length || 1);
    inviteCard.classList.toggle("hidden", !isCurrentAdmin());
    pendingRequestsCard.classList.toggle("hidden", !isCurrentAdmin());
    requestAccessCard.classList.toggle("hidden", isCurrentAdmin());

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
        btn.onclick = async () => {
            const g = await getGroupDoc(currentSession.groupId);
            if (!g) return;
            const reqItem = (g.accessRequests || []).find((r) => r.id === req.id);
            if (!reqItem) return;
            const member = (g.members || []).find((m) => m.memberId === reqItem.fromId);
            if (member) {
                member.role = "editor";
                member.canEdit = true;
            }
            reqItem.status = "approved";
            await saveGroupDoc(g.id, { members: g.members || [], accessRequests: g.accessRequests || [] });
            await refreshSettingsPanels();
        };
        li.appendChild(info);
        li.appendChild(btn);
        pendingRequestsList.appendChild(li);
    }
}

async function applyAuthState() {
    if (!currentSession) {
        authInfo.innerText = "Private mode is enabled. Login first.";
        views.forEach((v) => v.classList.remove("active"));
        document.querySelector(".bottom-nav").classList.add("hidden");
        loginOverlay.classList.remove("hidden");
        setEditAccess(false);
        await refreshSettingsPanels();
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

    await loadFinanceData();
    updateUI();
    await refreshSettingsPanels();
}

async function processInviteLinkAfterGmailLogin() {
    if (!firebaseUser) return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("inviteToken");
    const groupId = params.get("groupId");
    const invitedEmail = params.get("email");

    if (!token || !groupId || !invitedEmail) return;
    if (firebaseUser.email?.toLowerCase() !== invitedEmail.toLowerCase()) return;

    const group = await getGroupDoc(groupId);
    if (!group) return;

    const invites = group.invites || [];
    const invite = invites.find((i) => i.token === token && i.status === "pending");
    if (!invite) return;

    const memberId = `gmail_${firebaseUser.uid}`;
    const members = group.members || [];
    if (!members.some((m) => m.memberId === memberId)) {
        members.push({ memberId, type: "gmail", label: firebaseUser.email, role: "viewer", canEdit: false });
    }
    invite.status = "accepted";

    await saveGroupDoc(groupId, { members, invites });

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
        await applyAuthState();
        return;
    }

    const memberId = `gmail_${firebaseUser.uid}`;

    const groupsSnap = await db.collection("groups").get();
    let matchedGroup = null;
    let matchedMember = null;

    groupsSnap.forEach((doc) => {
        if (matchedGroup) return;
        const g = { id: doc.id, ...doc.data() };
        const m = (g.members || []).find((it) => it.memberId === memberId);
        if (m) {
            matchedGroup = g;
            matchedMember = m;
        }
    });

    if (matchedGroup && matchedMember) {
        currentSession = {
            type: "gmail",
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            groupId: matchedGroup.id,
            memberId,
            role: matchedMember.role || "viewer",
            canEdit: !!matchedMember.canEdit
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
    await processInviteLinkAfterGmailLogin();
    await applyAuthState();
}

async function loginOrCreateGroupAccount() {
    if (!db) {
        window.alert("Database ready না। 2-3 সেকেন্ড wait করে আবার চেষ্টা করুন।");
        return;
    }
    const username = groupUsername.value.trim();
    const password = groupPassword.value;
    if (!username || !password) {
        window.alert("Username and password দিন।");
        return;
    }

    const usernameKey = username.toLowerCase();
    let ref;
    let snap;
    try {
        ref = db.collection("group_accounts").doc(usernameKey);
        snap = await ref.get();
    } catch (error) {
        window.alert(`Group account load fail: ${error?.message || "unknown error"}`);
        return;
    }

    let account = snap.exists ? snap.data() : null;

    if (!account) {
        const groupId = pendingInviteInfo?.groupId || `grp_${Date.now()}`;
        const memberId = `group_${usernameKey}`;
        account = {
            username,
            password,
            groupId,
            memberId,
            role: pendingInviteInfo ? "viewer" : "admin",
            canEdit: !pendingInviteInfo,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        try {
            await ref.set(account);
        } catch (error) {
            window.alert(`Group account create fail: ${error?.message || "unknown error"}`);
            return;
        }

        const g = await getGroupDoc(groupId);
        if (!g) {
            try {
                await saveGroupDoc(groupId, {
                    adminUsername: pendingInviteInfo ? "" : username,
                    members: [{ memberId, type: "group", label: username, role: account.role, canEdit: account.canEdit }],
                    invites: [],
                    accessRequests: []
                });
            } catch (error) {
                window.alert(`Group তৈরি করা যায়নি: ${error?.message || "unknown error"}`);
                return;
            }
        } else {
            const members = g.members || [];
            if (!members.some((m) => m.memberId === memberId)) {
                members.push({ memberId, type: "group", label: username, role: "viewer", canEdit: false });
                try {
                    await saveGroupDoc(groupId, { members });
                } catch (error) {
                    window.alert(`Group member add fail: ${error?.message || "unknown error"}`);
                    return;
                }
            }
        }
    } else {
        if (account.password !== password) {
            window.alert("Password ভুল।");
            return;
        }
        if (pendingInviteInfo && account.groupId !== pendingInviteInfo.groupId) {
            window.alert("এই username অন্য group-এর। নতুন username দিন।");
            return;
        }
    }

    if (pendingInviteInfo) {
        const g = await getGroupDoc(pendingInviteInfo.groupId);
        if (!g) {
            window.alert("Invite group পাওয়া যায়নি।");
            return;
        }
        const invites = g.invites || [];
        const inv = invites.find((i) => i.token === pendingInviteInfo.token && i.status === "pending");
        if (!inv) {
            window.alert("Invite expired বা invalid.");
            return;
        }
        inv.status = "accepted";
        try {
            await saveGroupDoc(g.id, { invites });
        } catch (error) {
            window.alert(`Invite accept update fail: ${error?.message || "unknown error"}`);
            return;
        }
        account.role = "viewer";
        account.canEdit = false;
        try {
            await ref.set({ role: "viewer", canEdit: false }, { merge: true });
        } catch (error) {
            window.alert(`Role update fail: ${error?.message || "unknown error"}`);
            return;
        }
    }

    currentSession = {
        type: "group",
        username: account.username,
        groupId: account.groupId,
        memberId: account.memberId,
        role: account.role || "viewer",
        canEdit: !!account.canEdit
    };
    pendingInviteInfo = null;
    groupLoginBtn.innerText = "Create/Login Group";
    saveSession();
    await applyAuthState();
    window.alert("Group login successful.");
}

async function sendInviteToGmail() {
    if (!isCurrentAdmin()) return;
    const email = inviteEmailInput.value.trim().toLowerCase();
    if (!email) {
        window.alert("Friend Gmail দিন");
        return;
    }

    const g = await getGroupDoc(currentSession.groupId);
    if (!g) return;

    const invites = g.invites || [];
    const token = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    invites.push({ email, token, status: "pending" });
    await saveGroupDoc(g.id, { invites });

    const link = `${location.origin}${location.pathname}?groupId=${encodeURIComponent(g.id)}&inviteToken=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    window.open(`mailto:${email}?subject=${encodeURIComponent("VaultBudget Group Invite")}&body=${encodeURIComponent(`Please join my group: ${link}`)}`, "_blank");
    inviteEmailInput.value = "";
}

async function requestEditAccess() {
    if (!currentSession?.groupId) return;
    const adminEmail = requestAccessEmailInput.value.trim();
    if (!adminEmail) {
        window.alert("Admin Gmail দিন");
        return;
    }

    const g = await getGroupDoc(currentSession.groupId);
    if (!g) return;

    const requests = g.accessRequests || [];
    requests.push({
        id: `req_${Date.now()}`,
        fromId: currentSession.memberId,
        fromLabel: currentSession.type === "gmail" ? currentSession.email : currentSession.username,
        toEmail: adminEmail,
        status: "pending"
    });

    await saveGroupDoc(g.id, { accessRequests: requests });
    requestAccessEmailInput.value = "";
    window.alert("Access request admin queue-তে গেছে।");
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
        row.innerHTML = `<td>${txn.time}</td><td><span class="type-chip ${txn.type === "income" ? "type-income" : "type-expense"}">${txn.type}</span></td><td>${txn.category}</td><td>${formatMoney(txn.amount)}</td>`;
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
            datasets: [{ data: categories.length ? values : [0], borderRadius: 12, maxBarThickness: 38, backgroundColor: gradient }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
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
    const cats = Object.keys(breakdown);
    const maxValue = Math.max(1, ...Object.values(breakdown));
    emptyState.hidden = cats.length > 0;

    for (const key of cats) {
        const li = document.createElement("li");
        li.innerHTML = `<div class="row"><span>${key}</span><strong>${formatMoney(breakdown[key])}</strong></div><div class="bar"><span style="width:${(breakdown[key] / maxValue) * 100}%"></span></div>`;
        list.appendChild(li);
    }

  renderTransactions();
  renderExpenseChart();
  saveFinanceCache();
}

async function addIncome() {
    if (!canEdit) return;
    const val = Number(incomeInput.value);
    const source = incomeSourceInput.value.trim();
    if (!val || val < 0) return;
    income += val;
    transactions.push({ time: new Date().toLocaleString("en-BD"), type: "income", category: source || "General Income", amount: val });
    incomeInput.value = "";
    incomeSourceInput.value = "";
    updateUI();
    await saveFinanceData();
}

async function addExpense() {
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
    await saveFinanceData();
}

function downloadReportPdf() {
    if (!window.jspdf || !window.jspdf.jsPDF) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("VaultBudget Report", 14, 16);
    doc.text(`Total Income: ${formatMoney(income)}`, 14, 30);
    doc.text(`Total Expense: ${formatMoney(expense)}`, 14, 36);
    doc.text(`Balance: ${formatMoney(income - expense)}`, 14, 42);
    doc.save(`vaultbudget-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function initFirebaseCore() {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  db = firebase.firestore();
  db.enablePersistence({ synchronizeTabs: true }).catch(() => {
    // Ignore persistence init errors (private mode / multiple tabs with restrictions).
  });
  auth = firebase.auth();
  googleProvider = new firebase.auth.GoogleAuthProvider();
}

function initGoogleAuthListener() {
  auth.onAuthStateChanged(async (user) => {
    await handleGoogleAuthUser(user);
  });
}

themeToggle.addEventListener("click", () => {
    const current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    applyTheme(current === "dark" ? "light" : "dark");
});

navButtons.forEach((btn) => btn.addEventListener("click", () => showView(btn.dataset.view)));
downloadPdfBtn.addEventListener("click", downloadReportPdf);

groupModeBtn.addEventListener("click", () => groupLoginFields.classList.toggle("hidden"));
groupLoginBtn.addEventListener("click", async () => {
    try {
        await loginOrCreateGroupAccount();
    } catch (error) {
        window.alert(`Group login failed: ${error?.message || "unknown error"}`);
    }
});
sendInviteBtn.addEventListener("click", () => { sendInviteToGmail(); });
requestAccessBtn.addEventListener("click", () => { requestEditAccess(); });

googleLoginBtn.addEventListener("click", async () => {
    try {
        await auth.signInWithPopup(googleProvider);
    } catch (error) {
        window.alert(error?.message || "Google login failed.");
    }
});

clearDataBtn.addEventListener("click", async () => {
    const ok = window.confirm("Are you sure? This will clear all app data for this account/group.");
    if (!ok) return;

    income = 0;
    expense = 0;
    Object.keys(breakdown).forEach((k) => delete breakdown[k]);
    transactions.length = 0;
    await saveFinanceData();

    if (auth && auth.currentUser) await auth.signOut();
    currentSession = null;
    saveSession();
    applyTheme("light");
    updateUI();
    await applyAuthState();
});

async function bootApp() {
  loadTheme();
  loadSession();
  initFirebaseCore();
  await applyAuthState();
  initGoogleAuthListener();
  updateUI();
}

bootApp();

const params = new URLSearchParams(window.location.search);
const token = params.get("inviteToken");
const groupId = params.get("groupId");
const invitedEmail = params.get("email");
if (token && groupId) {
    pendingInviteInfo = { token, groupId, invitedEmail: invitedEmail || "" };
    groupLoginFields.classList.remove("hidden");
    groupLoginBtn.innerText = "Join Group";
}

window.addIncome = addIncome;
window.addExpense = addExpense;
