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
    groupMembersList.innerHTML = "";
    groupActionsCard.classList.add("hidden");
    groupActionFormCard.classList.add("hidden");
    return;
  }

  accountTypeText.innerText = currentSession.type === "group" ? "Group Account" : "Gmail Account";
  accountRoleText.innerText = currentSession.role || "viewer";

  if (!currentSession.groupId || !db) {
    groupMembersCard.classList.add("hidden");
    inviteCard.classList.add("hidden");
    requestAccessCard.classList.add("hidden");
    pendingRequestsCard.classList.add("hidden");
    groupMembersList.innerHTML = "";
    groupActionsCard.classList.toggle("hidden", currentSession.type !== "gmail");
    groupActionFormCard.classList.add("hidden");
    return;
  }

  // Skip heavy Firestore reads unless Settings view is currently open.
  const isSettingsOpen = document.getElementById("settingsView")?.classList.contains("active");
  if (!isSettingsOpen) {
    groupMembersCard.classList.remove("hidden");
    inviteCard.classList.toggle("hidden", !isCurrentAdmin());
    pendingRequestsCard.classList.toggle("hidden", !isCurrentAdmin());
    requestAccessCard.classList.toggle("hidden", isCurrentAdmin());
    return;
  }

  const memberSnap = await db.collection("groupMembers").where("groupId", "==", currentSession.groupId).get();
  groupMembersCard.classList.remove("hidden");
  groupMemberCount.innerText = String(memberSnap.size || 0);
  groupMembersList.innerHTML = "";
  memberSnap.forEach((doc) => {
    const m = doc.data();
    const li = document.createElement("li");
    const row = document.createElement("div");
    const label = m.label || m.email || m.memberId || "Member";
    const role = m.role || "viewer";
    row.innerText = `${label} (${role})`;
    li.appendChild(row);

    if (isCurrentAdmin()) {
      const isSelf = m.memberId === currentSession.memberId;
      const isAdminMember = role === "admin";
      if (!isSelf && !isAdminMember) {
        const kickBtn = document.createElement("button");
        kickBtn.className = "btn danger-btn";
        kickBtn.innerText = "Kick";
        kickBtn.onclick = () => {
          withLoader("Removing member...", async () => {
            await removeGroupMember(doc.id, label);
          }).catch((e) => appAlert(e.message || "Kick failed"));
        };
        li.appendChild(kickBtn);
      }
    }

    groupMembersList.appendChild(li);
  });

  inviteCard.classList.toggle("hidden", !isCurrentAdmin());
  pendingRequestsCard.classList.toggle("hidden", !isCurrentAdmin());
  requestAccessCard.classList.toggle("hidden", isCurrentAdmin());
  groupActionsCard.classList.add("hidden");
  groupActionFormCard.classList.add("hidden");

  await renderPendingRequests();
}

async function removeGroupMember(memberDocId, label) {
  if (!isCurrentAdmin() || !currentSession?.groupId || !memberDocId || !db) return;
  const ok = await appConfirm(`${label} কে group থেকে remove করতে চান?`, "Kick Member");
  if (!ok) return;

  await db.collection("groupMembers").doc(memberDocId).delete();
  await refreshSettingsPanels();
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
  let adminEmail = requestAccessEmailInput.value.trim().toLowerCase();
  if (!adminEmail) {
    const adminSnap = await db
      .collection("groupMembers")
      .where("groupId", "==", currentSession.groupId)
      .where("role", "==", "admin")
      .limit(1)
      .get();
    if (!adminSnap.empty) {
      const adminData = adminSnap.docs[0].data();
      adminEmail = (adminData.label || "").toLowerCase();
    }
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
  appAlert("Access request admin queue-তে গেছে। Admin approve করতে পারবে।");
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
  await loadGroupSharedData();
  updateUI();

  params.delete("inviteToken");
  params.delete("groupId");
  params.delete("email");
  history.replaceState({}, "", `${location.pathname}${params.toString() ? `?${params.toString()}` : ""}`);
}

async function resolveMembershipForUser(memberId, preferredGroupId = "") {
  if (!db || !memberId) return null;
  const snap = await db
    .collection("groupMembers")
    .where("memberId", "==", memberId)
    .get();

  if (snap.empty) return null;
  const memberships = snap.docs.map((d) => d.data());

  if (preferredGroupId) {
    const preferred = memberships.find((m) => m.groupId === preferredGroupId);
    if (preferred) return preferred;
  }

  const adminMembership = memberships.find((m) => m.role === "admin");
  if (adminMembership) return adminMembership;
  return memberships[0];
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
    if (currentSession.groupId) {
      const latestMember = await resolveMembershipForUser(`gmail_${firebaseUser.uid}`, currentSession.groupId);
      if (latestMember) {
        currentSession.role = latestMember.role || currentSession.role || "viewer";
        currentSession.canEdit = !!latestMember.canEdit;
        saveSession();
      } else {
        currentSession.groupId = "";
        currentSession.memberId = "";
        currentSession.role = "owner";
        currentSession.canEdit = true;
        saveSession();
      }
      await loadGroupSharedData();
      updateUI();
    }
    applyAuthState();
    return;
  }

  const memberId = `gmail_${firebaseUser.uid}`;
  const m = await resolveMembershipForUser(memberId, currentSession?.groupId || "");
  if (m) {
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

function openGroupActionForm() {
  groupActionMode = "create";
  groupActionFormCard.classList.remove("hidden");
  groupActionTitle.innerText = "Create Group Account";
  groupActionSubmitBtn.innerText = "Create Group";
}

async function createGroupFromGmail() {
  if (!firebaseUser || !db) {
    appAlert("আগে Gmail login করুন।");
    return;
  }
  const username = groupActionUsername.value.trim();
  const password = groupActionPassword.value;
  if (!username || !password) {
    appAlert("Username এবং password দিন।");
    return;
  }

  const unameKey = normalizeUsername(username);
  const userRef = db.collection("groupUsers").doc(unameKey);
  const userSnap = await userRef.get();
  if (userSnap.exists) {
    appAlert("এই group username already আছে।");
    return;
  }

  const ownedGroupSnap = await db
    .collection("groups")
    .where("createdByEmail", "==", (firebaseUser.email || "").toLowerCase())
    .limit(1)
    .get();
  if (!ownedGroupSnap.empty) {
    appAlert("আপনার Gmail দিয়ে already group account তৈরি আছে।");
    return;
  }

  const groupRef = db.collection("groups").doc();
  const groupId = groupRef.id;
  const memberId = `gmail_${firebaseUser.uid}`;

  await groupRef.set({
    id: groupId,
    adminUsername: username,
    adminUsernameLower: unameKey,
    createdByEmail: (firebaseUser.email || "").toLowerCase(),
    createdByUid: firebaseUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  await userRef.set({
    username,
    password,
    groupId,
    role: "admin",
    canEdit: true,
    memberId,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  await db.collection("groupMembers").doc(`${groupId}__${memberId}`).set({
    groupId,
    memberId,
    type: "gmail",
    label: firebaseUser.email || username,
    role: "admin",
    canEdit: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  currentSession = {
    type: "gmail",
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    groupId,
    memberId,
    role: "admin",
    canEdit: true
  };
  saveSession();
  await loadGroupSharedData();
  updateUI();
  applyAuthState();
  groupActionUsername.value = "";
  groupActionPassword.value = "";
  appAlert("Group account created.");
}

async function joinGroupFromGmail() {
  if (!firebaseUser || !db) {
    appAlert("আগে Gmail login করুন।");
    return;
  }
  const username = groupActionUsername.value.trim();
  const password = groupActionPassword.value;
  if (!username || !password) {
    appAlert("Username এবং password দিন।");
    return;
  }

  const unameKey = normalizeUsername(username);
  const userSnap = await db.collection("groupUsers").doc(unameKey).get();
  if (!userSnap.exists) {
    appAlert("Group username পাওয়া যায়নি।");
    return;
  }

  const userData = userSnap.data();
  if (userData.password !== password) {
    appAlert("Password ভুল।");
    return;
  }

  const groupId = userData.groupId;
  const memberId = `gmail_${firebaseUser.uid}`;

  await db.collection("groupMembers").doc(`${groupId}__${memberId}`).set({
    groupId,
    memberId,
    type: "gmail",
    label: firebaseUser.email || "",
    role: "viewer",
    canEdit: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

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
  await loadGroupSharedData();
  updateUI();
  applyAuthState();
  groupActionUsername.value = "";
  groupActionPassword.value = "";
  appAlert("Joined group successfully.");
}

async function sendInviteToGmail() {
  if (!isCurrentAdmin() || !currentSession?.groupId) return;
  const email = inviteEmailInput.value.trim().toLowerCase();
  if (!email) {
    appAlert("Friend Gmail দিন");
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
    appAlert(`Popup blocked. এই invite link manually share করুন:\n\n${link}`);
    return;
  }

  if (!copied) {
    appAlert(`Invite compose opened. প্রয়োজনে এই link manually share করুন:\n\n${link}`);
  }
}

function renderTransactions() {
  const tbody = document.getElementById("txnTableBody");
  const txnEmpty = document.getElementById("txnEmpty");
  const txnCount = document.getElementById("txnCount");
  tbody.innerHTML = "";
  const fragment = document.createDocumentFragment();

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
    fragment.appendChild(row);
  }
  tbody.appendChild(fragment);
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

  if (!expenseChart) {
    const ctx = expenseChartCanvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, "#ff014f");
    gradient.addColorStop(0.5, "#f9004d");
    gradient.addColorStop(1, "#d11414");

    expenseChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [{
          label: "Expense (BDT)",
          data: [],
          borderRadius: 12,
          borderSkipped: false,
          maxBarThickness: 38,
          backgroundColor: gradient,
          hoverBackgroundColor: "#ff014f"
        }]
      },
      options: {
        animation: { duration: 500, easing: "easeOutQuart" },
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  expenseChart.data.labels = categories.length ? categories : ["No Data"];
  expenseChart.data.datasets[0].data = categories.length ? values : [0];
  expenseChart.update("none");
}

function renderIncomePieChart() {
  const incomeBySource = {};
  for (const txn of transactions) {
    if (txn.type === "income") {
      const src = txn.category || "General Income";
      incomeBySource[src] = (incomeBySource[src] || 0) + Number(txn.amount || 0);
    }
  }

  const labels = Object.keys(incomeBySource);
  const values = labels.map((k) => incomeBySource[k]);
  const colors = ["#ff014f", "#d11414", "#f9004d", "#3EB75E", "#1BA2DB", "#FF8F3C", "#7289da", "#C231A1"];

  if (!incomePieChart) {
    const ctx = incomePieChartCanvas.getContext("2d");
    incomePieChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: colors,
          borderColor: "#ffffff",
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom" }
        }
      }
    });
  }

  incomePieChart.data.labels = labels.length ? labels : ["No Income Data"];
  incomePieChart.data.datasets[0].data = labels.length ? values : [1];
  incomePieChart.update("none");
}

function updateUI() {
  document.getElementById("income").innerText = formatMoney(income);
  document.getElementById("expense").innerText = formatMoney(expense);
  document.getElementById("balance").innerText = formatMoney(income - expense);
  document.getElementById("walletIncome").innerText = formatMoney(income);
  document.getElementById("walletExpense").innerText = formatMoney(expense);
  document.getElementById("walletBalance").innerText = formatMoney(income - expense);
  document.getElementById("walletRate").innerText = income > 0 ? `${Math.max(0, Math.round(((income - expense) / income) * 100))}%` : "0%";

  const activeViewId = document.querySelector(".view.active")?.id;
  if (activeViewId === "reportView") {
    const list = document.getElementById("list");
    const emptyState = document.getElementById("emptyState");
    list.innerHTML = "";

    const categories = Object.keys(breakdown);
    const maxValue = Math.max(1, ...Object.values(breakdown));
    emptyState.hidden = categories.length > 0;

    const fragment = document.createDocumentFragment();
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
      fragment.appendChild(li);
    }
    list.appendChild(fragment);

    renderTransactions();
    renderExpenseChart();
    renderIncomePieChart();
  }
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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function downloadReportPdf() {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    appAlert("Popup blocked. Please allow popups and try again.");
    return;
  }

  const rows = [...transactions].reverse().map((txn) => {
    const typeLabel = txn.type === "income" ? "ইনকাম" : "খরচ";
    return `<tr>
      <td>${escapeHtml(txn.time || "-")}</td>
      <td>${escapeHtml(typeLabel)}</td>
      <td>${escapeHtml(txn.category || "-")}</td>
      <td>${escapeHtml(formatMoney(Number(txn.amount || 0)))}</td>
    </tr>`;
  }).join("");

  const html = `<!doctype html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VaultBudget Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root { color-scheme: light; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: "Noto Sans Bengali", sans-serif; margin: 24px; color: #101828; }
    h1 { margin: 0 0 8px; font-size: 22px; }
    .meta { margin: 0 0 14px; color: #475467; font-size: 13px; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
    .card { border: 1px solid #eaecf0; border-radius: 10px; padding: 10px; }
    .label { font-size: 12px; color: #667085; }
    .value { font-size: 15px; font-weight: 700; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #eaecf0; padding: 8px; text-align: left; font-size: 12px; }
    th { background: #ff014f !important; color: #fff !important; }
    tr:nth-child(even) td { background: #fff4f8; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <h1>VaultBudget Report</h1>
  <p class="meta">Generated: ${escapeHtml(new Date().toLocaleString("en-BD"))}</p>
  <div class="summary">
    <div class="card"><div class="label">Income</div><div class="value">${escapeHtml(formatMoney(income))}</div></div>
    <div class="card"><div class="label">Expense</div><div class="value">${escapeHtml(formatMoney(expense))}</div></div>
    <div class="card"><div class="label">Balance</div><div class="value">${escapeHtml(formatMoney(income - expense))}</div></div>
  </div>
  <table>
    <thead><tr><th>Time</th><th>Type</th><th>Category</th><th>Amount</th></tr></thead>
    <tbody>${rows || "<tr><td colspan='4'>No transactions yet</td></tr>"}</tbody>
  </table>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = async () => {
    try {
      if (printWindow.document?.fonts?.ready) {
        await printWindow.document.fonts.ready;
      }
    } catch (_) {
      // no-op
    }
    printWindow.focus();
    printWindow.print();
  };
}

function initFirebase() {
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
  googleProvider = new firebase.auth.GoogleAuthProvider();
  auth.onAuthStateChanged((user) => {
    handleGoogleAuthUser(user).catch((e) => appAlert(e.message || "Auth error"));
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => { });
  });
}

function initPasswordToggles() {
  document.querySelectorAll(".toggle-pass").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = targetId ? document.getElementById(targetId) : null;
      if (!input) return;
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      const icon = btn.querySelector("i");
      if (icon) {
        icon.className = isHidden ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
      }
    });
  });
}

navButtons.forEach((btn) => btn.addEventListener("click", async () => {
  showView(btn.dataset.view);
  if (btn.dataset.view === "reportView") {
    renderTransactions();
    renderExpenseChart();
    renderIncomePieChart();
  }
  if (btn.dataset.view === "settingsView") {
    await refreshSettingsPanels();
  }
}));
downloadPdfBtn.addEventListener("click", downloadReportPdf);

sendInviteBtn.addEventListener("click", () => {
  withLoader("Sending invite...", async () => {
    await sendInviteToGmail();
  }).catch((e) => appAlert(e.message || "Invite failed"));
});

requestAccessBtn.addEventListener("click", () => {
  withLoader("Submitting request...", async () => {
    await requestEditAccess();
  }).catch((e) => appAlert(e.message || "Request failed"));
});

createGroupBtn.addEventListener("click", () => openGroupActionForm());
groupActionSubmitBtn.addEventListener("click", async () => {
  try {
    await withLoader("Creating group...", async () => {
      await createGroupFromGmail();
    });
  } catch (e) {
    appAlert(e.message || "Group action failed");
  }
});

googleLoginBtn.addEventListener("click", async () => {
  try {
    await withLoader("Signing in with Google...", async () => {
      await auth.signInWithPopup(googleProvider);
    });
  } catch (error) {
    appAlert(error?.message || "Google login failed.");
  }
});

clearDataBtn.addEventListener("click", async () => {
  const isGroupMember = !!currentSession?.groupId;
  const adminMode = isGroupMember && isCurrentAdmin();
  const promptText = adminMode
    ? "Admin reset: This will delete FULL group data for everyone. Continue?"
    : "This will clear only your app data/session on this device. Continue?";
  const ok = await appConfirm(promptText, "Clear Data");
  if (!ok) return;
  let remoteClearError = "";
  showLoader("Resetting data...");
  try {
    // Clear remote data based on role
    try {
      if (db) {
        if (adminMode) {
          const groupId = currentSession.groupId;

          // group finance
          await db.collection("groupFinance").doc(currentSession.groupId).delete();

          // group meta doc
          await db.collection("groups").doc(groupId).delete().catch(() => { });

          // group members
          const membersSnap = await db.collection("groupMembers").where("groupId", "==", groupId).get();
          for (const d of membersSnap.docs) {
            await d.ref.delete().catch(() => { });
          }

          // invitations
          const inviteSnap = await db.collection("invitations").where("groupId", "==", groupId).get();
          for (const d of inviteSnap.docs) {
            await d.ref.delete().catch(() => { });
          }

          // access requests
          const reqSnap = await db.collection("accessRequests").where("groupId", "==", groupId).get();
          for (const d of reqSnap.docs) {
            await d.ref.delete().catch(() => { });
          }

          // group user credential docs linked with this group
          const groupUsersSnap = await db.collection("groupUsers").where("groupId", "==", groupId).get();
          for (const d of groupUsersSnap.docs) {
            await d.ref.delete().catch(() => { });
          }
        } else if (!isGroupMember && firebaseUser?.uid) {
          await db.collection("userFinance").doc(firebaseUser.uid).delete();
        }
      }
    } catch (err) {
      // If remote delete fails, continue local cleanup + logout.
      remoteClearError = err?.message || "Remote clear failed";
    }

    income = 0;
    expense = 0;
    Object.keys(breakdown).forEach((key) => delete breakdown[key]);
    transactions.length = 0;

    // full local reset
    localStorage.clear();
    sessionStorage.clear();

    if (auth && auth.currentUser) {
      await auth.signOut();
    }

    currentSession = null;
    saveSession();
    applyTheme();
    updateUI();
    applyAuthState();
    if (groupActionFormCard) groupActionFormCard.classList.add("hidden");
    if (inviteStatusText) inviteStatusText.innerText = "";
    if (remoteClearError) {
      appAlert(`Local reset complete, but cloud data delete failed: ${remoteClearError}`);
    } else {
      if (adminMode) {
        appAlert("Admin group reset complete. Logged out successfully.");
      } else {
        appAlert("Your app reset is complete. Group data was kept safe.");
      }
    }
  } finally {
    hideLoader();
  }
});

applyTheme();
loadData();
updateUI();
loadSession();
applyAuthState();
initFirebase();
initPasswordToggles();
registerServiceWorker();

window.addIncome = addIncome;
window.addExpense = addExpense;

