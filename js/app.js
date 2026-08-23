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

const LANG_STORAGE_KEY = "vault_lang";
let currentLang = localStorage.getItem(LANG_STORAGE_KEY) || "en";
const i18n = {
  en: {
    app_title: "Vault Budget Prime", app_subtitle: "Clean finance tracker with secure visual identity", language_label: "Language",
    income: "Income", expense: "Expense", balance: "Balance", add_income: "Add Income", income_amount: "Income amount", income_source: "Income source (Salary/Freelance...)",
    save_income: "Save Income", add_expense: "Add Expense", expense_amount: "Expense amount", category: "Category (Food, Travel...)", save_expense: "Save Expense",
    category_overview: "Category Overview", no_expense_category: "No expense category yet.", expense_column_chart: "Expense Column Chart", income_pie_chart: "Income Pie Chart",
    transaction_history: "Transaction History", download_pdf: "Download PDF", time: "Time", type: "Type", category_short: "Category", amount: "Amount", action: "Action",
    no_transactions: "No transactions yet.", home: "Home", report: "Report", wallet: "Wallet", settings: "Settings", records: "records", type_income: "Income", type_expense: "Expense",
    general_income: "General Income", login_required: "Login Required", login_help: "Continue with Google (Gmail) to access the app.", continue_google: "Continue with Google",
    summary: "Summary", current_balance: "Current Balance", total_income: "Total Income", total_expense: "Total Expense", savings_rate: "Savings Rate",
    income_vs_expense: "Income vs Expense Range", animated: "Animated", control: "Control", group_actions: "Group Actions", create_group_account: "Create Group Account",
    add_another_group: "Add Another Group", group_action: "Group Action", group_username: "Group Username", group_password: "Group Password", submit: "Submit",
    account_type: "Account Type", role: "Role", group_credentials_admin: "Group Credentials (Admin)", copy_credentials: "Copy Credentials", group_members: "Group Members",
    invite_member_admin: "Invite Member (Admin)", friend_gmail: "Friend Gmail", send_invite: "Send Invite", request_edit_access: "Request Edit Access",
    admin_gmail: "Admin Gmail", request_access: "Request Access", pending_access_requests: "Pending Access Requests", deleted_transactions_admin: "Deleted Transactions (Admin)",
    danger_zone: "Danger Zone", log_out: "Log Out", clear_all_data: "Clear All Data", please_wait: "Please wait...", notice: "Notice", cancel: "Cancel", ok: "OK",
    save: "Save", group_account: "Group Account", gmail_account: "Gmail Account", role_viewer: "viewer", role_editor: "editor", role_admin: "admin", role_personal: "personal",
    join_group: "Join Group", top_category: "Top Category", top_expense: "Top Expense", categories: "Categories", total_income_label: "Total Income:", total_expense_label: "Total Expense:",
    group_action_help_join: "Use the exact group username and password from the admin.",
    group_action_help_create: "Choose a new group username and password for your admin account.",
    group_action_permission_tip: "If permission errors appear, sign out and sign in again, then try the exact username and password.",
    fixed_light_mode: "App fixed light mode is active.", session_lock_note: "This session has login lock active. Refreshing the page requires login again.",
    storage_note: "Data is saved in local browser storage.", reset_note: "Need reset? Clear browser local storage to reset app data.",
    danger_desc: "Pressing the button below will clear all data.", no_deleted_transactions: "No deleted transactions"
  },
  bn: {
    app_title: "ভল্ট বাজেট প্রাইম", app_subtitle: "নিরাপদ ভিজ্যুয়াল আইডেন্টিটি সহ পরিষ্কার ফাইন্যান্স ট্র্যাকার", language_label: "ভাষা",
    income: "আয়", expense: "খরচ", balance: "ব্যালেন্স", add_income: "আয় যোগ করুন", income_amount: "আয়ের পরিমাণ", income_source: "আয়ের উৎস (বেতন/ফ্রিল্যান্স...)",
    save_income: "আয় সংরক্ষণ", add_expense: "খরচ যোগ করুন", expense_amount: "খরচের পরিমাণ", category: "ক্যাটাগরি (খাবার, ভ্রমণ...)", save_expense: "খরচ সংরক্ষণ",
    category_overview: "ক্যাটাগরি ওভারভিউ", no_expense_category: "এখনও কোনো খরচের ক্যাটাগরি নেই।", expense_column_chart: "খরচ কলাম চার্ট", income_pie_chart: "আয় পাই চার্ট",
    transaction_history: "লেনদেনের ইতিহাস", download_pdf: "পিডিএফ ডাউনলোড", time: "সময়", type: "ধরণ", category_short: "ক্যাটাগরি", amount: "পরিমাণ", action: "অ্যাকশন",
    no_transactions: "এখনও কোনো লেনদেন নেই।", home: "হোম", report: "রিপোর্ট", wallet: "ওয়ালেট", settings: "সেটিংস", records: "রেকর্ড", type_income: "আয়", type_expense: "খরচ",
    general_income: "সাধারণ আয়", login_required: "লগইন প্রয়োজন", login_help: "অ্যাপ ব্যবহার করতে Google (Gmail) দিয়ে লগইন করুন।", continue_google: "Google দিয়ে চালিয়ে যান",
    summary: "সারসংক্ষেপ", current_balance: "বর্তমান ব্যালেন্স", total_income: "মোট আয়", total_expense: "মোট খরচ", savings_rate: "সঞ্চয় হার",
    income_vs_expense: "আয় বনাম খরচ রেঞ্জ", animated: "অ্যানিমেটেড", control: "কন্ট্রোল", group_actions: "গ্রুপ অ্যাকশন", create_group_account: "গ্রুপ অ্যাকাউন্ট তৈরি করুন",
    add_another_group: "আরেকটি গ্রুপ যোগ করুন", group_action: "গ্রুপ অ্যাকশন", group_username: "গ্রুপ ইউজারনেম", group_password: "গ্রুপ পাসওয়ার্ড", submit: "সাবমিট",
    account_type: "অ্যাকাউন্ট টাইপ", role: "রোল", group_credentials_admin: "গ্রুপ ক্রেডেনশিয়াল (অ্যাডমিন)", copy_credentials: "ক্রেডেনশিয়াল কপি করুন", group_members: "গ্রুপ মেম্বার",
    invite_member_admin: "মেম্বার ইনভাইট (অ্যাডমিন)", friend_gmail: "বন্ধুর জিমেইল", send_invite: "ইনভাইট পাঠান", request_edit_access: "এডিট এক্সেস রিকোয়েস্ট",
    admin_gmail: "অ্যাডমিন জিমেইল", request_access: "অ্যাক্সেস রিকোয়েস্ট", pending_access_requests: "অপেক্ষমান এক্সেস রিকোয়েস্ট", deleted_transactions_admin: "ডিলিটেড ট্রানজ্যাকশন (অ্যাডমিন)",
    danger_zone: "ডেঞ্জার জোন", log_out: "লগ আউট", clear_all_data: "সব ডেটা মুছুন", please_wait: "অপেক্ষা করুন...", notice: "নোটিশ", cancel: "বাতিল", ok: "ঠিক আছে",
    save: "সেভ", group_account: "গ্রুপ অ্যাকাউন্ট", gmail_account: "জিমেইল অ্যাকাউন্ট", role_viewer: "ভিউয়ার", role_editor: "এডিটর", role_admin: "অ্যাডমিন", role_personal: "পার্সোনাল",
    join_group: "গ্রুপে যোগ দিন", top_category: "শীর্ষ ক্যাটাগরি", top_expense: "সর্বোচ্চ খরচ", categories: "ক্যাটাগরি", total_income_label: "মোট আয়:", total_expense_label: "মোট খরচ:",
    group_action_help_join: "Admin-এর দেয়া exact group username আর password ব্যবহার করুন।",
    group_action_help_create: "Admin account-এর জন্য নতুন group username আর password দিন।",
    group_action_permission_tip: "Permission error এলে logout করে আবার login করুন, তারপর exact username/password দিয়ে try করুন।",
    fixed_light_mode: "অ্যাপ fixed light mode-এ চলছে।", session_lock_note: "এই session-এ login lock active আছে। page refresh করলে পুনরায় login লাগবে।",
    storage_note: "Data local browser storage-এ save হয়।", reset_note: "Need reset? Browser local storage clear করলে app data reset হবে।",
    danger_desc: "নিচের button চাপলে সব data clear হয়ে যাবে।", no_deleted_transactions: "কোনো deleted transaction নেই"
  },
  ar: {
    app_title: "فولت بدجت برايم", app_subtitle: "متتبع مالي نظيف مع هوية بصرية آمنة", language_label: "اللغة",
    income: "الدخل", expense: "المصروف", balance: "الرصيد", add_income: "إضافة دخل", income_amount: "مبلغ الدخل", income_source: "مصدر الدخل (راتب/عمل حر...)",
    save_income: "حفظ الدخل", add_expense: "إضافة مصروف", expense_amount: "مبلغ المصروف", category: "الفئة (طعام، سفر...)", save_expense: "حفظ المصروف",
    category_overview: "نظرة الفئات", no_expense_category: "لا توجد فئة مصروفات بعد.", expense_column_chart: "مخطط أعمدة المصروفات", income_pie_chart: "مخطط دائري للدخل",
    transaction_history: "سجل المعاملات", download_pdf: "تنزيل PDF", time: "الوقت", type: "النوع", category_short: "الفئة", amount: "المبلغ", action: "الإجراء",
    no_transactions: "لا توجد معاملات بعد.", home: "الرئيسية", report: "التقارير", wallet: "المحفظة", settings: "الإعدادات", records: "سجل", type_income: "دخل", type_expense: "مصروف",
    general_income: "دخل عام", login_required: "تسجيل الدخول مطلوب", login_help: "تابع باستخدام Google (Gmail) للوصول إلى التطبيق.", continue_google: "المتابعة باستخدام Google",
    summary: "ملخص", current_balance: "الرصيد الحالي", total_income: "إجمالي الدخل", total_expense: "إجمالي المصروف", savings_rate: "معدل الادخار",
    income_vs_expense: "نطاق الدخل مقابل المصروف", animated: "متحرك", control: "التحكم", group_actions: "إجراءات المجموعة", create_group_account: "إنشاء حساب مجموعة",
    add_another_group: "إضافة مجموعة أخرى", group_action: "إجراء المجموعة", group_username: "اسم مستخدم المجموعة", group_password: "كلمة مرور المجموعة", submit: "إرسال",
    account_type: "نوع الحساب", role: "الدور", group_credentials_admin: "بيانات المجموعة (المسؤول)", copy_credentials: "نسخ البيانات", group_members: "أعضاء المجموعة",
    invite_member_admin: "دعوة عضو (مسؤول)", friend_gmail: "Gmail الصديق", send_invite: "إرسال دعوة", request_edit_access: "طلب صلاحية التعديل",
    admin_gmail: "Gmail المسؤول", request_access: "طلب صلاحية", pending_access_requests: "طلبات الصلاحية المعلقة", deleted_transactions_admin: "المعاملات المحذوفة (مسؤول)",
    danger_zone: "منطقة الخطر", log_out: "تسجيل الخروج", clear_all_data: "مسح كل البيانات", please_wait: "يرجى الانتظار...", notice: "تنبيه", cancel: "إلغاء", ok: "موافق",
    save: "حفظ", group_account: "حساب مجموعة", gmail_account: "حساب Gmail", role_viewer: "مشاهد", role_editor: "محرر", role_admin: "مسؤول", role_personal: "شخصي",
    join_group: "الانضمام إلى المجموعة", top_category: "أعلى فئة", top_expense: "أعلى مصروف", categories: "الفئات", total_income_label: "إجمالي الدخل:", total_expense_label: "إجمالي المصروف:",
    group_action_help_join: "استخدم اسم المستخدم وكلمة المرور الدقيقة من المسؤول.",
    group_action_help_create: "اختر اسم مستخدم وكلمة مرور جديدين لحساب المسؤول.",
    group_action_permission_tip: "إذا ظهر خطأ صلاحيات، سجّل الخروج ثم سجّل الدخول مرة أخرى وجرب اسم المستخدم وكلمة المرور نفسها.",
    fixed_light_mode: "التطبيق يعمل بوضع الإضاءة الثابت.", session_lock_note: "هذه الجلسة بها قفل تسجيل دخول نشط. تحديث الصفحة يتطلب تسجيل الدخول مرة أخرى.",
    storage_note: "يتم حفظ البيانات في التخزين المحلي للمتصفح.", reset_note: "تحتاج إعادة ضبط؟ امسح التخزين المحلي للمتصفح لإعادة ضبط بيانات التطبيق.",
    danger_desc: "الضغط على الزر أدناه سيمسح كل البيانات.", no_deleted_transactions: "لا توجد معاملات محذوفة"
  }
};

function t(key) {
  return i18n[currentLang]?.[key] || i18n.en[key] || key;
}

function getLocaleForLang() {
  if (currentLang === "bn") return "bn-BD";
  if (currentLang === "ar") return "ar-SA";
  return "en-BD";
}

function applyLanguage(lang = "en") {
  currentLang = i18n[lang] ? lang : "en";
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key);
  });
  const langSwitcher = document.getElementById("langSwitcher");
  if (langSwitcher) langSwitcher.value = currentLang;
  if (currentSession && accountTypeText && accountRoleText) {
    accountTypeText.innerText = currentSession.type === "group" ? t("group_account") : t("gmail_account");
    accountRoleText.innerText = t(`role_${currentSession.role || "viewer"}`);
  }
  if (!groupActionFormCard?.classList.contains("hidden")) {
    openGroupActionForm(groupActionMode);
  }
  localStorage.setItem(LANG_STORAGE_KEY, currentLang);
}

function setGroupActionHelpText(mode = "create") {
  if (!groupActionHelpText) return;
  const helpKey = mode === "join" ? "group_action_help_join" : "group_action_help_create";
  groupActionHelpText.setAttribute("data-i18n", helpKey);
  groupActionHelpText.textContent = t(helpKey);
}

function getFriendlyGroupError(error, fallback = "Group action failed") {
  const message = String(error?.message || error || "").toLowerCase();
  if (message.includes("permission")) {
    return t("group_action_permission_tip");
  }
  return error?.message || fallback;
}

function canManageHistory() {
  if (!currentSession) return false;
  if (isCurrentAdmin()) return true;
  if (!currentSession.groupId && currentSession.type === "gmail") return true;
  return false;
}

function forceHistoryManagerPanel() {
  if (!deletedTransactionsCard || !deletedTransactionsList) return;
  const allowed = canManageHistory();
  deletedTransactionsCard.classList.toggle("hidden", !allowed);
  if (!allowed) {
    deletedTransactionsList.innerHTML = "";
    return;
  }
  renderDeletedTransactions();
}

async function refreshAdminCredentialPanel(isSettingsOpen) {
  if (!adminCredentialCard || !adminCredentialUsername || !adminCredentialPassword) return;

  if (!currentSession?.groupId || !isCurrentAdmin() || !db) {
    adminCredentialCard.classList.add("hidden");
    adminCredentialUsername.innerText = "-";
    adminCredentialPassword.innerText = "-";
    return;
  }

  adminCredentialCard.classList.remove("hidden");
  if (!isSettingsOpen) return;

  const snap = await db
    .collection("groupUsers")
    .where("groupId", "==", currentSession.groupId)
    .where("role", "==", "admin")
    .limit(1)
    .get();

  if (snap.empty) {
    adminCredentialUsername.innerText = "-";
    adminCredentialPassword.innerText = "-";
    return;
  }

  const data = snap.docs[0].data() || {};
  adminCredentialUsername.innerText = data.username || "-";
  adminCredentialPassword.innerText = data.password || "-";
}

async function refreshSettingsPanels() {
  if (!currentSession) {
    accountTypeText.innerText = "-";
    accountRoleText.innerText = "-";
    groupMembersCard.classList.add("hidden");
    inviteCard.classList.add("hidden");
    requestAccessCard.classList.add("hidden");
    pendingRequestsCard.classList.add("hidden");
    adminCredentialCard.classList.add("hidden");
    forceHistoryManagerPanel();
    groupMembersList.innerHTML = "";
    groupActionsCard.classList.add("hidden");
    groupActionFormCard.classList.add("hidden");
    return;
  }

  accountTypeText.innerText = currentSession.type === "group" ? t("group_account") : t("gmail_account");
  accountRoleText.innerText = t(`role_${currentSession.role || "viewer"}`);

  if (!currentSession.groupId || !db) {
    groupMembersCard.classList.add("hidden");
    inviteCard.classList.add("hidden");
    requestAccessCard.classList.add("hidden");
    pendingRequestsCard.classList.add("hidden");
    adminCredentialCard.classList.add("hidden");
    forceHistoryManagerPanel();
    groupMembersList.innerHTML = "";
    groupActionsCard.classList.toggle("hidden", currentSession.type !== "gmail");
    groupActionFormCard.classList.add("hidden");
    return;
  }

  // Skip heavy Firestore reads unless Settings view is currently open.
  const isSettingsOpen = document.getElementById("settingsView")?.classList.contains("active");
  await refreshAdminCredentialPanel(isSettingsOpen);
  if (!isSettingsOpen) {
    groupActionsCard.classList.toggle("hidden", currentSession.type !== "gmail");
    groupActionFormCard.classList.add("hidden");
    groupMembersCard.classList.remove("hidden");
    inviteCard.classList.toggle("hidden", !isCurrentAdmin());
    pendingRequestsCard.classList.toggle("hidden", !isCurrentAdmin());
    forceHistoryManagerPanel();
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
        kickBtn.innerHTML = '<i class="fa-solid fa-user-minus"></i> Kick';
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
  forceHistoryManagerPanel();
  requestAccessCard.classList.toggle("hidden", isCurrentAdmin());
  groupActionsCard.classList.toggle("hidden", currentSession.type !== "gmail");
  groupActionFormCard.classList.add("hidden");

  await renderPendingRequests();
  forceHistoryManagerPanel();
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
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Approve';
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
    stopGroupRealtimeSync();
    authInfo.innerText = "Private mode is enabled. Login first.";
    views.forEach((view) => view.classList.remove("active"));
    document.querySelector(".bottom-nav").classList.add("hidden");
    loginOverlay.classList.remove("hidden");
    setEditAccess(false);
    refreshSettingsPanels();
    return;
  }

  if (currentSession.role === "owner") {
    currentSession.role = "personal";
    saveSession();
  }

  authInfo.innerText = currentSession.type === "gmail"
    ? `Logged in as ${currentSession.email}`
    : `Logged in as group user: ${currentSession.username}`;

  const lastView = sessionStorage.getItem("vault_active_view") || "homeView";
  showView(lastView);
  document.querySelector(".bottom-nav").classList.remove("hidden");
  loginOverlay.classList.add("hidden");

  const editable = isCurrentAdmin() || !!currentSession.canEdit || (!currentSession.groupId && currentSession.type === "gmail");
  setEditAccess(editable);
  startGroupRealtimeSync();
  if (lastView === "walletView") {
    renderSavingsRateChart(true);
  }
  refreshSettingsPanels();
}

let bootOverlayClosed = false;
const BOOT_MIN_SHOW_MS = 1200;
const bootOverlayShownAt = Date.now();

function hideBootOverlay() {
  if (bootOverlayClosed || !appBootOverlay) return;
  const elapsed = Date.now() - bootOverlayShownAt;
  const waitMs = Math.max(0, BOOT_MIN_SHOW_MS - elapsed);
  setTimeout(() => {
    if (bootOverlayClosed || !appBootOverlay) return;
    bootOverlayClosed = true;
    appBootOverlay.style.opacity = "0";
    appBootOverlay.style.visibility = "hidden";
    appBootOverlay.style.pointerEvents = "none";
    setTimeout(() => {
      appBootOverlay.classList.add("hidden");
    }, 420);
  }, waitMs);
}

function normalizeInviteEmail(value) {
  const raw = String(value || "").trim().toLowerCase();
  const atIndex = raw.indexOf("@");
  if (atIndex < 1) return raw;

  const local = raw.slice(0, atIndex);
  const domain = raw.slice(atIndex + 1);
  if (domain !== "gmail.com") return raw;

  const plusIndex = local.indexOf("+");
  const cleanedLocal = (plusIndex >= 0 ? local.slice(0, plusIndex) : local).replace(/\./g, "");
  return `${cleanedLocal}@${domain}`;
}

const INVITE_EXPIRY_MS = 24 * 60 * 60 * 1000;

async function processInviteLink() {
  if (!firebaseUser || !db) return;
  const params = new URLSearchParams(window.location.search);
  const token = params.get("inviteToken");
  const groupId = params.get("groupId");
  if (!token || !groupId) return;

  const invRef = db.collection("invitations").doc(token);
  const invSnap = await invRef.get();
  if (!invSnap.exists) return;
  const inv = invSnap.data();
  if (inv.status !== "pending" || inv.groupId !== groupId) return;

  const expiresAtMs = inv.expiresAt?.toMillis?.();
  const createdAtMs = inv.createdAt?.toMillis?.();
  const isExpiredByExpiresAt = !!expiresAtMs && Date.now() > expiresAtMs;
  const isExpiredByCreatedAt = !!createdAtMs && (Date.now() - createdAtMs) > INVITE_EXPIRY_MS;
  if (isExpiredByExpiresAt || isExpiredByCreatedAt) {
    await invRef.update({
      status: "expired",
      expiredAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(() => { });
    appAlert("এই invite link-এর সময় শেষ হয়ে গেছে। Admin থেকে নতুন invite নিন।", "Invite Expired");
    return;
  }

  const invitedEmail = String(inv.email || "").trim().toLowerCase();
  if (invitedEmail) {
    const currentUserEmail = String(firebaseUser.email || "").trim().toLowerCase();
    const emailMatched = normalizeInviteEmail(currentUserEmail) === normalizeInviteEmail(invitedEmail);
    if (!emailMatched) {
      appAlert(`এই invite ${invitedEmail} এর জন্য। আপনি ${currentUserEmail || "unknown"} দিয়ে login করেছেন।`, "Invite Mismatch");
      return;
    }
  }

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
  syncTransactionState();
  updateUI();

  params.delete("inviteToken");
  params.delete("groupId");
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

let loginProgress = false;

function finalizeLoginFlow() {
  if (!loginProgress) return;
  loginProgress = false;
  if (googleLoginBtn) {
    googleLoginBtn.disabled = false;
    googleLoginBtn.style.opacity = "";
  }
  hideLoader();
}

async function handleGoogleAuthUser(user) {
  firebaseUser = user || null;
  try {
    if (!firebaseUser) {
      if (currentSession?.type === "gmail") {
        currentSession = null;
        saveSession();
      }
      applyAuthState();
      return;
    }

    const previousSession = currentSession ? { ...currentSession } : null;
    const sameGoogleAccount = previousSession?.type === "gmail" && previousSession.uid === firebaseUser.uid;
    if (!sameGoogleAccount && currentSession) {
      currentSession = null;
      saveSession();
    }

    await processInviteLink();

    if (sameGoogleAccount && currentSession?.type === "gmail" && currentSession.uid === firebaseUser.uid) {
      if (currentSession.groupId) {
        const latestMember = await resolveMembershipForUser(`gmail_${firebaseUser.uid}`, currentSession.groupId);
        if (latestMember) {
          currentSession.role = latestMember.role || currentSession.role || "viewer";
          currentSession.canEdit = !!latestMember.canEdit;
          saveSession();
        } else {
          currentSession.groupId = "";
          currentSession.memberId = "";
          currentSession.role = "personal";
          currentSession.canEdit = true;
          saveSession();
        }
        await loadGroupSharedData();
        syncTransactionState();
        updateUI();
      }
      applyAuthState();
      return;
    }

    const memberId = `gmail_${firebaseUser.uid}`;
    const preferredGroupId = sameGoogleAccount ? (previousSession?.groupId || "") : "";
    const m = await resolveMembershipForUser(memberId, preferredGroupId);
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
          role: "personal",
        canEdit: true
      };
    }

    saveSession();
    await loadGroupSharedData();
    syncTransactionState();
    updateUI();
    applyAuthState();
  } finally {
    finalizeLoginFlow();
    hideBootOverlay();
  }
}

function openGroupActionForm(mode = "create") {
  groupActionMode = mode === "join" ? "join" : "create";
  groupActionFormCard.classList.remove("hidden");
  if (groupActionMode === "join") {
    groupActionTitle.innerText = t("add_another_group");
    groupActionSubmitBtn.innerHTML = `<i class="fa-solid fa-right-left"></i> ${t("join_group")}`;
  } else {
    groupActionTitle.innerText = t("create_group_account");
    groupActionSubmitBtn.innerHTML = `<i class="fa-solid fa-people-group"></i> ${t("create_group_account")}`;
  }
  setGroupActionHelpText(groupActionMode);
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
  const memberId = `gmail_${firebaseUser.uid}`;
  const ownedGroupQuery = db
    .collection("groups")
    .where("createdByUid", "==", firebaseUser.uid)
    .limit(1);
  let userSnap;
  let ownedGroupSnap;
  try {
    [userSnap, ownedGroupSnap] = await Promise.all([
      userRef.get(),
      ownedGroupQuery.get()
    ]);
  } catch (e) {
    throw new Error(`Group pre-check failed: ${e?.message || e}`);
  }

  if (userSnap.exists) {
    appAlert("এই group username already আছে।");
    return;
  }

  if (!ownedGroupSnap.empty) {
    const ownedGroupId = ownedGroupSnap.docs[0].id;
    let myCredentialSnap;
    try {
      myCredentialSnap = await db
        .collection("groupUsers")
        .where("groupId", "==", ownedGroupId)
        .where("memberId", "==", memberId)
        .limit(1)
        .get();
    } catch (e) {
      throw new Error(`Owned-group credential check failed: ${e?.message || e}`);
    }
    if (!myCredentialSnap.empty) {
      const cred = myCredentialSnap.docs[0].data() || {};
      const restoredRole = cred.role || "admin";
      const restoredCanEdit = typeof cred.canEdit === "boolean" ? cred.canEdit : (restoredRole !== "viewer");
      const ownedMemberRef = db.collection("groupMembers").doc(`${ownedGroupId}__${memberId}`);
      await ownedMemberRef.set({
        groupId: ownedGroupId,
        memberId,
        type: "gmail",
        label: firebaseUser.email || cred.username || "Admin",
        role: restoredRole,
        canEdit: restoredCanEdit,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      currentSession = {
        type: "gmail",
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        groupId: ownedGroupId,
        memberId,
        role: restoredRole,
        canEdit: restoredCanEdit
      };
      saveSession();
      await loadGroupSharedData();
      syncTransactionState();
      updateUI();
      applyAuthState();
      groupActionUsername.value = "";
      groupActionPassword.value = "";
      appAlert("আপনার আগের group account recover করা হয়েছে।");
      return;
    }
  }

  const groupRef = db.collection("groups").doc();
  const groupId = groupRef.id;
  const memberRef = db.collection("groupMembers").doc(`${groupId}__${memberId}`);
  const financeRef = db.collection("groupFinance").doc(groupId);
  const now = firebase.firestore.FieldValue.serverTimestamp();

  try {
    await groupRef.set({
      id: groupId,
      adminUsername: username,
      adminUsernameLower: unameKey,
      createdByEmail: (firebaseUser.email || "").toLowerCase(),
      createdByUid: firebaseUser.uid,
      createdAt: now
    });
  } catch (e) {
    throw new Error(`Group meta create failed: ${e?.message || e}`);
  }

  try {
    await memberRef.set({
      groupId,
      memberId,
      type: "gmail",
      label: firebaseUser.email || username,
      role: "admin",
      canEdit: true,
      createdAt: now
    }, { merge: true });
  } catch (e) {
    throw new Error(`Group member create failed: ${e?.message || e}`);
  }

  try {
    await userRef.set({
      username,
      password,
      groupId,
      role: "admin",
      canEdit: true,
      memberId,
      createdAt: now
    });
  } catch (e) {
    throw new Error(`Group credentials create failed: ${e?.message || e}`);
  }

  try {
    await financeRef.set({
      income: 0,
      expense: 0,
      breakdown: {},
      transactions: [],
      deletedTransactions: [],
      createdAt: now,
      updatedAt: now
    }, { merge: true });
  } catch (e) {
    throw new Error(`Group finance create failed: ${e?.message || e}`);
  }

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
  income = 0;
  expense = 0;
  Object.keys(breakdown).forEach((k) => delete breakdown[k]);
  transactions.length = 0;
  deletedTransactions.length = 0;
  syncTransactionState();
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
  const memberDocId = `${groupId}__${memberId}`;
  const memberRef = db.collection("groupMembers").doc(memberDocId);
  const isCredentialOwner = userData.memberId === memberId;
  const resolvedRole = isCredentialOwner
    ? (userData.role || "viewer")
    : "viewer";
  const resolvedCanEdit = isCredentialOwner
    ? (typeof userData.canEdit === "boolean" ? userData.canEdit : resolvedRole !== "viewer")
    : false;

  await memberRef.set({
    groupId,
    memberId,
    type: "gmail",
    label: firebaseUser.email || "",
    role: resolvedRole,
    canEdit: resolvedCanEdit,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  currentSession = {
    type: "gmail",
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    groupId,
    memberId,
    role: resolvedRole,
    canEdit: resolvedCanEdit
  };
  saveSession();
  await loadGroupSharedData();
  syncTransactionState();
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
  const myEmail = (firebaseUser?.email || currentSession?.email || "").trim().toLowerCase();
  if (myEmail && email === myEmail) {
    appAlert("নিজের Gmail-এ invite পাঠানো যাবে না। অন্য member-এর Gmail দিন।");
    return;
  }

  const token = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.collection("invitations").doc(token).set({
    token,
    groupId: currentSession.groupId,
    email,
    status: "pending",
    expiresAt: firebase.firestore.Timestamp.fromMillis(Date.now() + INVITE_EXPIRY_MS),
    createdBy: currentSession.memberId,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  const link = `${location.origin}${location.pathname}?groupId=${encodeURIComponent(currentSession.groupId)}&inviteToken=${encodeURIComponent(token)}`;
  const subjectText = "VaultBudget Group Invite";
  const bodyText = `Please join my group account. Click this link: ${link}`;
  const subject = encodeURIComponent(subjectText);
  const body = encodeURIComponent(bodyText);

  let copied = false;
  try {
    await navigator.clipboard.writeText(link);
    copied = true;
  } catch (_) {
    copied = false;
  }

  let shared = false;
  if (navigator.share) {
    try {
      await navigator.share({
        title: subjectText,
        text: bodyText
      });
      shared = true;
    } catch (_) {
      shared = false;
    }
  }

  if (!shared) {
    // Mobile browsers often block popup mail windows; location navigation is more reliable.
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  }

  inviteEmailInput.value = "";
  inviteStatusText.innerText = shared
    ? `Invite share opened for ${email}.`
    : copied
      ? `Invite ready. Mail app opening + link copied for ${email}.`
      : `Invite ready for ${email}.`;

  if (!shared && !copied) {
    appAlert(`Invite compose opened. প্রয়োজনে এই link manually share করুন:\n\n${link}`);
  }
}

function makeTransactionId() {
  return `txn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function ensureTransactionIds() {
  let changed = false;
  for (const txn of transactions) {
    if (!txn.id) {
      txn.id = makeTransactionId();
      changed = true;
    }
  }
  for (const deletedTxn of deletedTransactions) {
    if (deletedTxn?.txn && !deletedTxn.txn.id) {
      deletedTxn.txn.id = makeTransactionId();
      changed = true;
    }
  }
  return changed;
}

function recalculateFinanceFromTransactions() {
  income = 0;
  expense = 0;
  Object.keys(breakdown).forEach((key) => delete breakdown[key]);

  for (const txn of transactions) {
    const amount = Number(txn.amount || 0);
    if (!amount || amount < 0) continue;
    if (txn.type === "income") {
      income += amount;
      continue;
    }
    if (txn.type === "expense") {
      expense += amount;
      const cat = txn.category || "General";
      breakdown[cat] = (breakdown[cat] || 0) + amount;
    }
  }
}

function syncTransactionState() {
  const changed = ensureTransactionIds();
  recalculateFinanceFromTransactions();
  if (changed) {
    saveData();
  }
}

async function deleteTransaction(txnId) {
  if (!canManageHistory()) {
    appAlert("শুধু admin transaction delete করতে পারবে।");
    return;
  }
  const idx = transactions.findIndex((t) => t.id === txnId);
  if (idx < 0) return;

  const txn = transactions[idx];
  const ok = await appConfirm("এই transaction delete করবেন?", "Delete Transaction");
  if (!ok) return;

  transactions.splice(idx, 1);
  deletedTransactions.unshift({
    txn,
    originalIndex: idx,
    deletedAt: new Date().toISOString()
  });

  recalculateFinanceFromTransactions();
  updateUI();
  renderDeletedTransactions();
}

function renderDeletedTransactions() {
  if (!deletedTransactionsList) return;
  if (!canManageHistory()) {
    deletedTransactionsList.innerHTML = "";
    return;
  }

  deletedTransactionsList.innerHTML = "";
  if (!deletedTransactions.length) {
    const li = document.createElement("li");
    li.innerText = t("no_deleted_transactions");
    deletedTransactionsList.appendChild(li);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const item of deletedTransactions) {
    const li = document.createElement("li");
    const txn = item.txn || {};
    const amountText = formatMoney(Number(txn.amount || 0));
    const deletedAtText = item.deletedAt ? new Date(item.deletedAt).toLocaleString("en-BD") : "-";
    const head = document.createElement("div");
    head.className = "deleted-head";
    head.textContent = `${txn.type || "-"} • ${txn.category || "-"}`;

    const meta = document.createElement("div");
    meta.className = "deleted-meta";
    meta.textContent = `${amountText} • Deleted: ${deletedAtText}`;

    li.appendChild(head);
    li.appendChild(meta);

    const actionRow = document.createElement("div");
    actionRow.className = "deleted-actions";

    const restoreBtn = document.createElement("button");
    restoreBtn.className = "btn income-btn";
    restoreBtn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Restore';
    restoreBtn.onclick = () => {
      withLoader("Restoring transaction...", async () => {
        await restoreDeletedTransaction(txn.id);
      }).catch((e) => appAlert(e.message || "Restore failed"));
    };

    const permanentDeleteBtn = document.createElement("button");
    permanentDeleteBtn.className = "btn danger-btn";
    permanentDeleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Delete';
    permanentDeleteBtn.onclick = () => {
      permanentDeleteDeletedTransaction(txn.id).catch((e) => appAlert(e.message || "Delete failed"));
    };

    actionRow.appendChild(restoreBtn);
    actionRow.appendChild(permanentDeleteBtn);
    li.appendChild(actionRow);
    fragment.appendChild(li);
  }
  deletedTransactionsList.appendChild(fragment);
}

async function restoreDeletedTransaction(txnId) {
  if (!canManageHistory()) {
    appAlert("শুধু admin restore করতে পারবে।");
    return;
  }
  const idx = deletedTransactions.findIndex((item) => item?.txn?.id === txnId);
  if (idx < 0) return;

  const [item] = deletedTransactions.splice(idx, 1);
  const insertAt = Math.min(Math.max(Number(item.originalIndex) || 0, 0), transactions.length);
  transactions.splice(insertAt, 0, item.txn);

  recalculateFinanceFromTransactions();
  updateUI();
  renderDeletedTransactions();
}

function closeEditModalCleanup() {
  modalTitle.classList.remove("hidden");
  modalOkBtn.parentElement?.classList.add("single-btn");
  modalOkBtn.innerHTML = `<i class="fa-solid fa-check"></i> ${t("ok")}`;
  modalCancelBtn.innerHTML = `<i class="fa-solid fa-xmark"></i> ${t("cancel")}`;
  modalCancelBtn.classList.add("hidden");
  modalMessage.className = "modal-message";
  modalMessage.innerHTML = "";
}

function openTransactionEditModal(txnId) {
  return new Promise((resolve) => {
    const txn = transactions.find((t) => t.id === txnId);
    if (!txn) {
      resolve(false);
      return;
    }
    if (!canManageHistory()) {
      appAlert("শুধু admin transaction edit করতে পারবে।");
      resolve(false);
      return;
    }

    modalTitle.innerText = "";
    modalTitle.classList.add("hidden");
    modalOkBtn.parentElement?.classList.remove("single-btn");
    modalCancelBtn.classList.remove("hidden");
    modalOkBtn.innerHTML = `<i class="fa-solid fa-check"></i> ${t("save")}`;
    modalCancelBtn.innerHTML = `<i class="fa-solid fa-xmark"></i> ${t("cancel")}`;

    modalMessage.className = "modal-message edit-mode";
    modalMessage.innerHTML = `
      <div class="edit-form">
        <div class="modal-icon modal-icon-edit" aria-hidden="true"><i class="fa-solid fa-pen-to-square"></i></div>
        <div class="modal-copy-title">${txn.type === "income" ? "Edit Income" : "Edit Expense"}</div>
        <div class="edit-meta">Date: ${escapeHtml(txn.time || "-")}</div>
        <div class="field edit-field">
          <input id="editTxnAmount" type="number" min="0" step="0.01" value="${Number(txn.amount || 0)}" placeholder=" " />
          <label class="floating-label" for="editTxnAmount">Amount</label>
        </div>
        <div class="field edit-field">
          <input id="editTxnCategory" type="text" value="${escapeHtml(String(txn.category || ""))}" placeholder=" " />
          <label class="floating-label" for="editTxnCategory">${txn.type === "income" ? "Income source" : "Category"}</label>
        </div>
        <div id="editTxnError" class="edit-error" aria-live="polite"></div>
      </div>
    `;

    prepareModalMotion?.();
    appModal.classList.remove("hidden");

    const amountInput = document.getElementById("editTxnAmount");
    const categoryInputEl = document.getElementById("editTxnCategory");
    const errorNode = document.getElementById("editTxnError");
    if (amountInput) amountInput.focus();

    const cleanup = () => {
      modalOkBtn.removeEventListener("click", onSave);
      modalCancelBtn.removeEventListener("click", onCancel);
      appModal?.removeEventListener("click", onOverlayClick);
      closeEditModalCleanup();
    };

    const onSave = async () => {
      const nextAmount = Number(amountInput?.value);
      const nextCategory = String(categoryInputEl?.value || "").trim();
      if (!nextAmount || nextAmount < 0) {
        if (errorNode) errorNode.innerText = "Valid amount দিন।";
        return;
      }
      if (!nextCategory) {
        if (errorNode) errorNode.innerText = txn.type === "income" ? "Income source দিন।" : "Category দিন।";
        return;
      }

      txn.amount = nextAmount;
      txn.category = nextCategory;
      recalculateFinanceFromTransactions();
      updateUI();
      renderTransactions();
      renderDeletedTransactions();
      if (typeof closeModalMotion === "function") {
        closeModalMotion(() => {
          cleanup();
          resolve(true);
        });
      } else {
        cleanup();
        resolve(true);
      }
    };

    const onCancel = () => {
      if (typeof closeModalMotion === "function") {
        closeModalMotion(() => {
          cleanup();
          resolve(false);
        });
      } else {
        cleanup();
        resolve(false);
      }
    };
    const onOverlayClick = (event) => {
      if (event.target === appModal) onCancel();
    };

    modalOkBtn.addEventListener("click", onSave);
    modalCancelBtn.addEventListener("click", onCancel);
    appModal?.addEventListener("click", onOverlayClick);
  });
}

async function permanentDeleteDeletedTransaction(txnId) {
  if (!canManageHistory()) {
    appAlert("শুধু admin permanent delete করতে পারবে।");
    return;
  }

  const ok = await appConfirm(
    "এই deleted transaction একেবারে মুছে যাবে। এরপর restore করা যাবে না। Continue?",
    "Permanent Delete"
  );
  if (!ok) return;

  const idx = deletedTransactions.findIndex((item) => item?.txn?.id === txnId);
  if (idx < 0) return;

  deletedTransactions.splice(idx, 1);
  updateUI();
  renderDeletedTransactions();
}

function renderTransactions() {
  const tbody = document.getElementById("txnTableBody");
  const txnEmpty = document.getElementById("txnEmpty");
  const txnCount = document.getElementById("txnCount");
  const txnTotalIncome = document.getElementById("txnTotalIncome");
  const txnTotalExpense = document.getElementById("txnTotalExpense");
  tbody.innerHTML = "";
  const fragment = document.createDocumentFragment();
  let totalIncome = 0;
  let totalExpense = 0;

  txnCount.innerText = `${transactions.length} ${t("records")}`;
  txnEmpty.hidden = transactions.length > 0;

  for (const txn of [...transactions].reverse()) {
    const row = document.createElement("tr");
    const time = document.createElement("td");
    const type = document.createElement("td");
    const category = document.createElement("td");
    const amount = document.createElement("td");
    const action = document.createElement("td");
    const chip = document.createElement("span");

    time.innerText = txn.time;
    time.setAttribute("data-label", t("time"));
    chip.className = `type-chip ${txn.type === "income" ? "type-income" : "type-expense"}`;
    chip.innerHTML = txn.type === "income"
      ? `<i class="fa-solid fa-arrow-up"></i> ${t("type_income")}`
      : `<i class="fa-solid fa-arrow-down"></i> ${t("type_expense")}`;
    type.setAttribute("data-label", t("type"));
    type.appendChild(chip);

    category.innerText = txn.category;
    category.setAttribute("data-label", t("category_short"));
    amount.innerText = formatMoney(txn.amount);
    amount.className = txn.type === "income" ? "amount-income" : "amount-expense";
    amount.setAttribute("data-label", t("amount"));
    if (txn.type === "income") {
      totalIncome += Number(txn.amount || 0);
    } else {
      totalExpense += Number(txn.amount || 0);
    }

    if (canManageHistory()) {
      const actionGroup = document.createElement("div");
      actionGroup.className = "txn-action-group";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "txn-edit-btn";
      editBtn.title = "Edit transaction";
      editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
      editBtn.onclick = () => {
        openTransactionEditModal(txn.id).catch((e) => appAlert(e.message || "Edit failed"));
      };

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "txn-delete-btn";
      deleteBtn.title = "Delete transaction";
      deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
      deleteBtn.onclick = () => {
        withLoader("Deleting transaction...", async () => {
          await deleteTransaction(txn.id);
        }).catch((e) => appAlert(e.message || "Delete failed"));
      };
      actionGroup.appendChild(editBtn);
      actionGroup.appendChild(deleteBtn);
      action.appendChild(actionGroup);
    } else {
      action.innerText = "-";
    }
    action.setAttribute("data-label", t("action"));

    row.appendChild(time);
    row.appendChild(type);
    row.appendChild(category);
    row.appendChild(amount);
    row.appendChild(action);
    fragment.appendChild(row);
  }
  tbody.appendChild(fragment);
  if (txnTotalIncome) txnTotalIncome.innerText = formatMoney(totalIncome);
  if (txnTotalExpense) txnTotalExpense.innerText = formatMoney(totalExpense);
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
    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, "#ff014f");
    gradient.addColorStop(0.5, "#ff3a7a");
    gradient.addColorStop(1, "#ff8aa8");

    const expenseBarEnhancer = {
      id: "expenseBarEnhancer",
      afterDatasetsDraw(chart) {
        const { ctx } = chart;
        const meta = chart.getDatasetMeta(0);
        ctx.save();
        meta.data.forEach((bar) => {
          const x = bar.x;
          const y = bar.y;
          ctx.beginPath();
          ctx.fillStyle = "#ffffff";
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.strokeStyle = "rgba(255, 1, 79, 0.32)";
          ctx.lineWidth = 2;
          ctx.arc(x, y, 7, 0, Math.PI * 2);
          ctx.stroke();
        });
        ctx.restore();
      }
    };

    expenseChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [{
          label: "Expense (BDT)",
          data: [],
          borderRadius: 16,
          borderSkipped: false,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.6)",
          maxBarThickness: 38,
          backgroundColor: gradient,
          hoverBackgroundColor: "#ff014f"
        }]
      },
      options: {
        animation: { duration: 950, easing: "easeOutBack" },
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#596274", font: { weight: "700" } }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(89,98,116,0.14)",
              borderDash: [4, 4]
            },
            ticks: { color: "#596274" }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#161b26",
            titleColor: "#fff",
            bodyColor: "#fff",
            displayColors: false
          }
        }
      }
      ,
      plugins: [expenseBarEnhancer]
    });
  }

  expenseChart.data.labels = categories.length ? categories : ["No Data"];
  expenseChart.data.datasets[0].data = categories.length ? values : [0];
  expenseChart.update();
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

function renderSavingsRateChart(animate = true) {
  if (!walletRateChartCanvas) return;
  const monthName = (d) => d.toLocaleString("en", { month: "short" });
  const map = new Map();
  for (const txn of transactions) {
    const date = new Date(txn.time || Date.now());
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (!map.has(key)) {
      map.set(key, { label: monthName(date), income: 0, expense: 0 });
    }
    const bucket = map.get(key);
    if (txn.type === "income") bucket.income += Number(txn.amount || 0);
    if (txn.type === "expense") bucket.expense += Number(txn.amount || 0);
  }

  const series = Array.from(map.values()).slice(-7);
  if (!series.length) {
    series.push({ label: "Now", income: Number(income || 0), expense: Number(expense || 0) });
  }
  const labels = series.map((x) => x.label);
  const incomePoints = series.map((x, i) => ({ x: i, y: Math.max(0, x.income) }));
  const expensePoints = series.map((x, i) => ({ x: i, y: Math.max(0, x.expense) }));

  const rangeLinkPlugin = {
    id: "rangeLinkPlugin",
    afterDatasetsDraw(chart) {
      const metaExpense = chart.getDatasetMeta(0);
      const metaIncome = chart.getDatasetMeta(1);
      if (!metaExpense?.data || !metaIncome?.data) return;
      const { ctx } = chart;
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#0fb5c7";
      for (let i = 0; i < metaExpense.data.length; i += 1) {
        const p1 = metaExpense.data[i];
        const p2 = metaIncome.data[i];
        if (!p1 || !p2) continue;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  const maxY = Math.max(10, ...incomePoints.map((p) => p.y), ...expensePoints.map((p) => p.y));

  if (!walletRateChart) {
    const ctx = walletRateChartCanvas.getContext("2d");
    walletRateChart = new Chart(ctx, {
      type: "scatter",
      data: {
        labels,
        datasets: [
          {
            label: "Expense",
            data: expensePoints,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: "#1e88e5",
            pointBorderWidth: 0,
            showLine: false
          },
          {
            label: "Income",
            data: incomePoints,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: "#10c98d",
            pointBorderWidth: 0,
            showLine: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: animate ? 1150 : 0,
          easing: "easeOutQuart"
        },
        scales: {
          x: {
            type: "linear",
            min: -0.4,
            max: labels.length - 0.6,
            grid: { color: "rgba(120,130,150,0.18)" },
            ticks: {
              stepSize: 1,
              callback(value) {
                return labels[value] || "";
              },
              color: "#5a6475",
              font: { weight: "700" }
            }
          },
          y: {
            beginAtZero: true,
            suggestedMax: maxY * 1.15,
            grid: { color: "rgba(120,130,150,0.16)" },
            ticks: { color: "#5a6475" }
          }
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: { usePointStyle: true, pointStyle: "circle" }
          },
          tooltip: {
            callbacks: {
              label(context) {
                return `${context.dataset.label}: ${formatMoney(Number(context.parsed.y || 0))}`;
              }
            }
          }
        }
      },
      plugins: [rangeLinkPlugin]
    });
    return;
  }

  walletRateChart.options.animation.duration = animate ? 900 : 0;
  walletRateChart.options.scales.x.max = labels.length - 0.6;
  walletRateChart.options.scales.y.suggestedMax = maxY * 1.15;
  walletRateChart.data.labels = labels;
  walletRateChart.data.datasets[0].data = expensePoints;
  walletRateChart.data.datasets[1].data = incomePoints;
  walletRateChart.update();
}

function updateUI(shouldSave = true) {
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
  if (activeViewId === "walletView") {
    renderSavingsRateChart(true);
  }
  if (shouldSave) {
    saveData(true);
  } else {
    saveData(false);
  }
}

function addIncome() {
  if (!canEdit) return;
  const val = Number(incomeInput.value);
  const source = incomeSourceInput.value.trim();
  if (!val || val < 0) return;
  transactions.push({
    id: makeTransactionId(),
    time: new Date().toLocaleString(getLocaleForLang()),
    type: "income",
    category: source || t("general_income"),
    amount: val
  });
  recalculateFinanceFromTransactions();
  incomeInput.value = "";
  incomeSourceInput.value = "";
  updateUI();
}

function addExpense() {
  if (!canEdit) return;
  const val = Number(expenseInput.value);
  const cat = categoryInput.value.trim();
  if (!val || val < 0 || cat === "") return;
  transactions.push({
    id: makeTransactionId(),
    time: new Date().toLocaleString(getLocaleForLang()),
    type: "expense",
    category: cat,
    amount: val
  });
  recalculateFinanceFromTransactions();
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
  const totalIncome = Number(income || 0);
  const totalExpense = Number(expense || 0);
  const totalBalance = totalIncome - totalExpense;
  const totalRecords = Number(transactions.length || 0);

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
    .totals { margin-top: 14px; border: 1px solid #eaecf0; border-radius: 10px; overflow: hidden; }
    .totals-row { display: grid; grid-template-columns: repeat(4, 1fr); }
    .totals-row div { padding: 10px; border-right: 1px solid #eaecf0; font-size: 12px; }
    .totals-row div:last-child { border-right: 0; }
    .totals-row strong { display: block; margin-top: 5px; font-size: 14px; color: #101828; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <h1>VaultBudget Report</h1>
  <p class="meta">Generated: ${escapeHtml(new Date().toLocaleString("en-BD"))}</p>
  <div class="summary">
    <div class="card"><div class="label">Income</div><div class="value">${escapeHtml(formatMoney(totalIncome))}</div></div>
    <div class="card"><div class="label">Expense</div><div class="value">${escapeHtml(formatMoney(totalExpense))}</div></div>
    <div class="card"><div class="label">Balance</div><div class="value">${escapeHtml(formatMoney(totalBalance))}</div></div>
  </div>
  <table>
    <thead><tr><th>Time</th><th>Type</th><th>Category</th><th>Amount</th></tr></thead>
    <tbody>${rows || "<tr><td colspan='4'>No transactions yet</td></tr>"}</tbody>
  </table>
  <div class="totals">
    <div class="totals-row">
      <div>মোট ইনকাম<strong>${escapeHtml(formatMoney(totalIncome))}</strong></div>
      <div>মোট খরচ<strong>${escapeHtml(formatMoney(totalExpense))}</strong></div>
      <div>মোট ব্যালেন্স<strong>${escapeHtml(formatMoney(totalBalance))}</strong></div>
      <div>মোট রেকর্ড<strong>${escapeHtml(String(totalRecords))}</strong></div>
    </div>
  </div>
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
  googleProvider.setCustomParameters({ prompt: "select_account" });
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
  if (btn.dataset.view === "walletView") {
    renderSavingsRateChart(true);
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

copyAdminCredentialBtn?.addEventListener("click", async () => {
  const uname = adminCredentialUsername?.innerText?.trim() || "-";
  const pass = adminCredentialPassword?.innerText?.trim() || "-";
  if (uname === "-" || pass === "-") {
    appAlert("Credential এখনো ready না। একটু পরে try করুন।");
    return;
  }
  const text = `${uname}\n${pass}`;
  try {
    await navigator.clipboard.writeText(text);
    appAlert("Credentials copied.");
  } catch (_) {
    appAlert(`Copy failed. Manually copy করুন:\n\n${text}`);
  }
});

createGroupBtn.addEventListener("click", () => openGroupActionForm("create"));
addAnotherGroupBtn?.addEventListener("click", () => openGroupActionForm("join"));
groupActionSubmitBtn.addEventListener("click", async () => {
  try {
    await withLoader(groupActionMode === "join" ? "Joining group..." : "Creating group...", async () => {
      if (groupActionMode === "join") {
        await joinGroupFromGmail();
      } else {
        await createGroupFromGmail();
      }
    });
  } catch (e) {
    appAlert(getFriendlyGroupError(e));
  }
});

googleLoginBtn.addEventListener("click", async () => {
  if (loginProgress) return;
  try {
    loginProgress = true;
    googleLoginBtn.disabled = true;
    googleLoginBtn.style.opacity = "0.7";
    showLoader("Signing in with Google...");
    await auth.signInWithPopup(googleProvider);
  } catch (error) {
    finalizeLoginFlow();
    appAlert(error?.message || "Google login failed.");
  }
});

logoutBtn?.addEventListener("click", async () => {
  const ok = await appConfirm("You will be logged out only. Your data will stay saved.", "Log Out?");
  if (!ok) return;
  try {
    await withLoader("Logging out...", async () => {
      if (auth && auth.currentUser) {
        await auth.signOut();
      } else {
        currentSession = null;
        saveSession();
        applyAuthState();
      }
    });
    appAlert("Logged out successfully.");
  } catch (e) {
    appAlert(e.message || "Logout failed");
  }
});

clearDataBtn.addEventListener("click", async () => {
  const promptText = "This will permanently delete your data. If you own any group account, that group and related data will also be deleted. Continue?";
  const ok = await appConfirm(promptText, "Clear Data");
  if (!ok) return;
  let remoteClearError = "";
  showLoader("Resetting data...");
  try {
    try {
      if (db && firebaseUser?.uid) {
        const myMemberId = `gmail_${firebaseUser.uid}`;

        // Delete all groups owned by this Gmail, even if the current session is not inside that group.
        const ownedGroupsSnap = await db
          .collection("groups")
          .where("createdByUid", "==", firebaseUser.uid)
          .get();

        for (const groupDoc of ownedGroupsSnap.docs) {
          const groupId = groupDoc.id;
          const myMembershipRef = db.collection("groupMembers").doc(`${groupId}__${myMemberId}`);

          // Ensure admin membership exists so admin-only cleanup operations can pass rules.
          await myMembershipRef.set({
            groupId,
            memberId: myMemberId,
            type: "gmail",
            label: firebaseUser.email || "Admin",
            role: "admin",
            canEdit: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });

          const inviteSnap = await db.collection("invitations").where("groupId", "==", groupId).get();
          for (const doc of inviteSnap.docs) await doc.ref.delete();

          const reqSnap = await db.collection("accessRequests").where("groupId", "==", groupId).get();
          for (const doc of reqSnap.docs) await doc.ref.delete();

          const membersSnap = await db.collection("groupMembers").where("groupId", "==", groupId).get();
          const selfMemberDocId = `${groupId}__${myMemberId}`;
          for (const doc of membersSnap.docs) {
            if (doc.id !== selfMemberDocId) {
              await doc.ref.delete();
            }
          }

          const credsSnap = await db.collection("groupUsers").where("groupId", "==", groupId).get();
          for (const doc of credsSnap.docs) await doc.ref.delete();

          await db.collection("groupFinance").doc(groupId).delete();
          await db.collection("groups").doc(groupId).delete();
          await myMembershipRef.delete();
        }

        // Remove any remaining memberships/credentials linked to this Gmail (joined groups etc.).
        const myMembershipsSnap = await db.collection("groupMembers").where("memberId", "==", myMemberId).get();
        for (const doc of myMembershipsSnap.docs) {
          await doc.ref.delete();
        }

        const myCredSnap = await db.collection("groupUsers").where("memberId", "==", myMemberId).get();
        for (const doc of myCredSnap.docs) {
          await doc.ref.delete();
        }

        await db.collection("userFinance").doc(firebaseUser.uid).delete();
      }
    } catch (err) {
      remoteClearError = err?.message || "Remote clear failed";
    }

    income = 0;
    expense = 0;
    Object.keys(breakdown).forEach((key) => delete breakdown[key]);
    transactions.length = 0;
    deletedTransactions.length = 0;

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
      appAlert("Clear all data complete. Logged out successfully.");
    }
  } finally {
    hideLoader();
  }
});

applyTheme();
applyLanguage(currentLang);
loadData();
syncTransactionState();
updateUI();
loadSession();
applyAuthState();
initFirebase();
initPasswordToggles();
registerServiceWorker();
if (document.querySelector(".view.active")?.id === "walletView") {
  renderSavingsRateChart(false);
}

document.getElementById("langSwitcher")?.addEventListener("change", (event) => {
  applyLanguage(event.target.value);
  updateUI();
});

window.addIncome = addIncome;
window.addExpense = addExpense;
window.renderSavingsRateChart = renderSavingsRateChart;

