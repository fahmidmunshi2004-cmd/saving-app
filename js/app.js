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
const LANGUAGE_OPTIONS = [
  { code: "en", name: "English", native: "English", flag: "🇺🇸", locale: "en-US", dir: "ltr" },
  { code: "bn", name: "Bengali", native: "বাংলা", flag: "🇧🇩", locale: "bn-BD", dir: "ltr" },
  { code: "ar", name: "Arabic", native: "العربية", flag: "🇸🇦", locale: "ar-SA", dir: "rtl" },
  { code: "hi", name: "Hindi", native: "हिन्दी", flag: "🇮🇳", locale: "hi-IN", dir: "ltr" },
  { code: "ur", name: "Urdu", native: "اردو", flag: "🇵🇰", locale: "ur-PK", dir: "rtl" },
  { code: "es", name: "Spanish", native: "Español", flag: "🇪🇸", locale: "es-ES", dir: "ltr" },
  { code: "fr", name: "French", native: "Français", flag: "🇫🇷", locale: "fr-FR", dir: "ltr" },
  { code: "de", name: "German", native: "Deutsch", flag: "🇩🇪", locale: "de-DE", dir: "ltr" },
  { code: "tr", name: "Turkish", native: "Türkçe", flag: "🇹🇷", locale: "tr-TR", dir: "ltr" },
  { code: "ru", name: "Russian", native: "Русский", flag: "🇷🇺", locale: "ru-RU", dir: "ltr" }
];
let langSearchQuery = "";

const i18n = {
  en: {
    app_title: "Vault Budget Prime", app_subtitle: "Clean finance tracker with secure visual identity", language_label: "Language", language_search: "Search languages", language_no_match: "No language found",
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
    danger_desc: "Pressing the button below will clear all data.", no_deleted_transactions: "No deleted transactions",
    no_pending_request: "No pending request", edit_access_requested: "Access request sent to the admin queue.",
    login_first: "Please log in with Gmail first.", username_password_required: "Please enter username and password.",
    group_username_exists: "That group username already exists.", group_account_recovered: "Your previous group account has been restored.",
    group_account_created: "Group account created.", group_username_not_found: "Group username not found.", wrong_password: "Wrong password.",
    joined_group_success: "Joined group successfully.", friend_gmail_required: "Please enter a friend Gmail.", invite_self_error: "You cannot invite your own Gmail. Use another member's Gmail.",
    invite_compose_opened: "Invite compose opened. Please share this link manually if needed:\n\n{link}", invite_expired: "This invite link has expired. Ask the admin for a new invite.",
    invite_mismatch: "This invite is for {invited}. You are signed in as {current}.", admin_only_delete: "Only the admin can delete transactions.",
    invite_expired: "This invite link has expired. Ask the admin for a new invite.",
    invite_mismatch_title: "Invite Mismatch",
    delete_transaction_confirm: "Do you want to delete this transaction?", admin_only_restore: "Only the admin can restore transactions.",
    admin_only_edit: "Only the admin can edit transactions.", admin_only_permanent_delete: "Only the admin can permanently delete transactions.",
    permanent_delete_confirm: "This deleted transaction will be removed forever. It cannot be restored. Continue?",
    popup_blocked: "Popup blocked. Please allow popups and try again.", auth_error: "Authentication error.", google_login_failed: "Google login failed.",
    logout_confirm: "You will be logged out only. Your data will stay saved.", logout_title: "Log Out?", clear_data_title: "Clear Data",
    logout_success: "Logged out successfully.", logout_failed: "Logout failed", clear_data_confirm: "This will permanently delete your data. If you own any group account, that group and related data will also be deleted. Continue?",
    local_reset_remote_failed: "Local reset complete, but cloud data delete failed: {error}", clear_all_data_complete: "Clear all data complete. Logged out successfully.",
    credentials_not_ready: "Credentials are not ready yet. Please try again later.", credentials_copied: "Credentials copied.",
    copy_failed: "Copy failed. Please copy manually:\n\n{text}", kick_member_confirm: "Do you want to remove {label} from the group?", kick_title: "Kick Member",
    kick_failed: "Kick failed", invite_failed: "Invite failed", request_failed: "Request failed", restore_failed: "Restore failed",
    delete_failed: "Delete failed", edit_failed: "Edit failed", signing_in: "Signing in with Google...", logging_out: "Logging out...",
    resetting_data: "Resetting data...", joining_group: "Joining group...", creating_group: "Creating group...", sending_invite: "Sending invite...",
    submitting_request: "Submitting request...", restoring_transaction: "Restoring transaction...", deleting_transaction: "Deleting transaction...",
    copying_credentials: "Copying credentials...", no_pending_request_label: "No pending request", delete_transaction_title: "Delete Transaction",
    edit_income_title: "Edit Income", edit_expense_title: "Edit Expense", edit_date: "Date", edit_amount: "Amount",
    edit_income_source: "Income source", edit_category: "Category", valid_amount_required: "Please enter a valid amount.",
    income_source_required: "Please enter an income source.", category_required: "Please enter a category.",
    private_mode_login_first: "Private mode is enabled. Log in first.", logged_in_as_email: "Logged in as {email}",
    logged_in_as_group_user: "Logged in as group user: {username}", approve: "Approve", remove: "Remove", restore: "Restore"
  },
  bn: {
    app_title: "ভল্ট বাজেট প্রাইম", app_subtitle: "নিরাপদ ভিজ্যুয়াল আইডেন্টিটি সহ পরিষ্কার ফাইন্যান্স ট্র্যাকার", language_label: "ভাষা", language_search: "ভাষা খুঁজুন", language_no_match: "কোনো ভাষা পাওয়া যায়নি",
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
    fixed_light_mode: "অ্যাপ স্থির লাইট মোডে চলছে।", session_lock_note: "এই সেশনে login lock active আছে। page refresh করলে আবার login লাগবে।",
    storage_note: "ডেটা local browser storage-এ save হয়।", reset_note: "রিসেট দরকার? App data reset করতে browser local storage clear করুন।",
    danger_desc: "নিচের বাটন চাপলে সব ডেটা মুছে যাবে।", no_deleted_transactions: "কোনো মুছে ফেলা লেনদেন নেই",
    no_pending_request: "কোনো pending request নেই", edit_access_requested: "অ্যাক্সেস রিকোয়েস্ট admin queue-তে গেছে।",
    login_first: "আগে Gmail দিয়ে লগইন করুন।", username_password_required: "Username আর password দিন।",
    group_username_exists: "এই group username আগে থেকেই আছে।", group_account_recovered: "আপনার আগের group account recover করা হয়েছে।",
    group_account_created: "Group account তৈরি হয়েছে।", group_username_not_found: "Group username পাওয়া যায়নি।", wrong_password: "Password ভুল।",
    joined_group_success: "সফলভাবে group-এ যোগ দিয়েছেন।", friend_gmail_required: "Friend Gmail দিন।", invite_self_error: "নিজের Gmail-এ invite পাঠানো যাবে না। অন্য member-এর Gmail দিন।",
    invite_compose_opened: "Invite compose খুলেছে। দরকার হলে link manually share করুন:\n\n{link}", invite_expired: "এই invite link-এর সময় শেষ হয়ে গেছে। Admin থেকে নতুন invite নিন।",
    invite_mismatch: "এই invite {invited} এর জন্য। আপনি {current} দিয়ে login করেছেন।", admin_only_delete: "শুধু admin transaction delete করতে পারবে।",
    invite_expired: "এই invite link-এর সময় শেষ হয়ে গেছে। Admin থেকে নতুন invite নিন।", invite_mismatch_title: "Invite Mismatch",
    delete_transaction_confirm: "এই transaction delete করবেন?", admin_only_restore: "শুধু admin restore করতে পারবে।",
    admin_only_edit: "শুধু admin transaction edit করতে পারবে।", admin_only_permanent_delete: "শুধু admin permanent delete করতে পারবে।",
    permanent_delete_confirm: "এই deleted transaction একেবারে মুছে যাবে। এরপর restore করা যাবে না। Continue?",
    popup_blocked: "Popup blocked. Please allow popups and try again.", auth_error: "Authentication error.", google_login_failed: "Google login failed.",
    logout_confirm: "আপনি শুধু logout হবেন। আপনার data সেভ থাকবে।", logout_title: "Log Out?", clear_data_title: "ডেটা মুছুন",
    logout_success: "সফলভাবে লগ out হয়েছে।", logout_failed: "Logout failed", clear_data_confirm: "এটি আপনার সব data স্থায়ীভাবে মুছে ফেলবে। কোনো group account থাকলে সেটিও delete হবে। Continue?",
    local_reset_remote_failed: "Local reset complete, কিন্তু cloud data delete failed: {error}", clear_all_data_complete: "সব data clear হয়েছে। সফলভাবে logout হয়েছে।",
    credentials_not_ready: "Credential এখনো ready না। একটু পরে try করুন।", credentials_copied: "Credentials copied.",
    copy_failed: "Copy failed. Manually copy করুন:\n\n{text}", kick_member_confirm: "{label} কে group থেকে remove করতে চান?", kick_title: "Kick Member",
    kick_failed: "Kick failed", invite_failed: "Invite failed", request_failed: "Request failed", restore_failed: "Restore failed",
    delete_failed: "Delete failed", edit_failed: "Edit failed", signing_in: "Google দিয়ে sign in করা হচ্ছে...", logging_out: "Logging out...",
    resetting_data: "Data reset করা হচ্ছে...", joining_group: "Group-এ join করা হচ্ছে...", creating_group: "Group account তৈরি করা হচ্ছে...", sending_invite: "Invite পাঠানো হচ্ছে...",
    submitting_request: "Request পাঠানো হচ্ছে...", restoring_transaction: "Transaction restore করা হচ্ছে...", deleting_transaction: "Transaction delete করা হচ্ছে...",
    copying_credentials: "Credentials copy করা হচ্ছে...", no_pending_request_label: "No pending request", delete_transaction_title: "Delete Transaction",
    edit_income_title: "আয় সম্পাদনা", edit_expense_title: "খরচ সম্পাদনা", edit_date: "তারিখ", edit_amount: "পরিমাণ",
    edit_income_source: "আয়ের উৎস", edit_category: "ক্যাটাগরি", valid_amount_required: "সঠিক পরিমাণ দিন।",
    income_source_required: "আয়ের উৎস দিন।", category_required: "ক্যাটাগরি দিন।",
    private_mode_login_first: "Private mode চালু আছে। আগে লগইন করুন।", logged_in_as_email: "{email} হিসেবে লগইন করা আছে",
    logged_in_as_group_user: "গ্রুপ ইউজার হিসেবে লগইন করা আছে: {username}", approve: "Approve", remove: "Remove", restore: "Restore"
  },
  ar: {
    app_title: "فولت بدجت برايم", app_subtitle: "متتبع مالي نظيف مع هوية بصرية آمنة", language_label: "اللغة", language_search: "ابحث عن اللغات", language_no_match: "لم يتم العثور على لغة",
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
    danger_zone: "منطقة الخطر", log_out: "تسجيل الخروج", clear_all_data: "مسح كل البيانات", clear_data_title: "مسح البيانات", clear_data_confirm: "سيؤدي هذا إلى حذف بياناتك نهائيًا. إذا كان لديك أي حساب مجموعة، فسيتم حذف تلك المجموعة وبياناتها أيضًا. هل تريد المتابعة؟", please_wait: "يرجى الانتظار...", notice: "تنبيه", cancel: "إلغاء", ok: "موافق",
    save: "حفظ", group_account: "حساب مجموعة", gmail_account: "حساب Gmail", role_viewer: "مشاهد", role_editor: "محرر", role_admin: "مسؤول", role_personal: "شخصي",
    join_group: "الانضمام إلى المجموعة", top_category: "أعلى فئة", top_expense: "أعلى مصروف", categories: "الفئات", total_income_label: "إجمالي الدخل:", total_expense_label: "إجمالي المصروف:",
    group_action_help_join: "استخدم اسم المستخدم وكلمة المرور الدقيقة من المسؤول.",
    group_action_help_create: "اختر اسم مستخدم وكلمة مرور جديدين لحساب المسؤول.",
    group_action_permission_tip: "إذا ظهر خطأ صلاحيات، سجّل الخروج ثم سجّل الدخول مرة أخرى وجرب اسم المستخدم وكلمة المرور نفسها.",
    fixed_light_mode: "التطبيق يعمل بوضع الإضاءة الثابت.", session_lock_note: "هذه الجلسة بها قفل تسجيل دخول نشط. تحديث الصفحة يتطلب تسجيل الدخول مرة أخرى.",
    storage_note: "يتم حفظ البيانات في التخزين المحلي للمتصفح.", reset_note: "تحتاج إعادة ضبط؟ امسح التخزين المحلي للمتصفح لإعادة ضبط بيانات التطبيق.",
    danger_desc: "الضغط على الزر أدناه سيمسح كل البيانات.", no_deleted_transactions: "لا توجد معاملات محذوفة", delete_transaction_title: "حذف المعاملة"
  },
  hi: {
    app_title: "वॉल्ट बजट प्राइम", app_subtitle: "सुरक्षित दृश्य पहचान के साथ साफ़ वित्त ट्रैकर", language_label: "भाषा", language_search: "भाषा खोजें", language_no_match: "कोई भाषा नहीं मिली",
    income: "आय", expense: "खर्च", balance: "बैलेंस", add_income: "आय जोड़ें", income_amount: "आय राशि", income_source: "आय का स्रोत (वेतन/फ्रीलांस...)",
    save_income: "आय सहेजें", add_expense: "खर्च जोड़ें", expense_amount: "खर्च राशि", category: "श्रेणी (भोजन, यात्रा...)", save_expense: "खर्च सहेजें",
    category_overview: "श्रेणी अवलोकन", no_expense_category: "अभी कोई खर्च श्रेणी नहीं।", expense_column_chart: "खर्च कॉलम चार्ट", income_pie_chart: "आय पाई चार्ट",
    transaction_history: "लेनदेन इतिहास", download_pdf: "PDF डाउनलोड", time: "समय", type: "प्रकार", category_short: "श्रेणी", amount: "राशि", action: "क्रिया",
    no_transactions: "अभी कोई लेनदेन नहीं।", home: "होम", report: "रिपोर्ट", wallet: "वॉलेट", settings: "सेटिंग्स", records: "रिकॉर्ड", type_income: "आय", type_expense: "खर्च",
    general_income: "सामान्य आय", login_required: "लॉगिन आवश्यक", login_help: "ऐप तक पहुंचने के लिए Google (Gmail) से जारी रखें।", continue_google: "Google से जारी रखें",
    summary: "सारांश", current_balance: "वर्तमान बैलेंस", total_income: "कुल आय", total_expense: "कुल खर्च", savings_rate: "बचत दर",
    income_vs_expense: "आय बनाम खर्च सीमा", animated: "एनिमेटेड", control: "नियंत्रण", group_actions: "समूह क्रियाएँ", create_group_account: "समूह खाता बनाएं",
    add_another_group: "एक और समूह जोड़ें", group_action: "समूह क्रिया", group_username: "समूह उपयोगकर्ता नाम", group_password: "समूह पासवर्ड", submit: "सबमिट",
    account_type: "खाता प्रकार", role: "भूमिका", group_credentials_admin: "समूह क्रेडेंशियल (एडमिन)", copy_credentials: "क्रेडेंशियल कॉपी करें", group_members: "समूह सदस्य",
    invite_member_admin: "सदस्य आमंत्रित करें (एडमिन)", friend_gmail: "दोस्त का Gmail", send_invite: "आमंत्रण भेजें", request_edit_access: "एडिट एक्सेस अनुरोध",
    admin_gmail: "एडमिन Gmail", request_access: "एक्सेस अनुरोध", pending_access_requests: "लंबित एक्सेस अनुरोध", deleted_transactions_admin: "हटाए गए लेनदेन (एडमिन)",
    danger_zone: "खतरनाक क्षेत्र", log_out: "लॉग आउट", clear_all_data: "सभी डेटा साफ़ करें", clear_data_title: "डेटा साफ़ करें", clear_data_confirm: "यह आपके सभी डेटा को स्थायी रूप से हटा देगा। यदि आपका कोई समूह खाता है, तो वह समूह और उसका डेटा भी हट जाएगा। जारी रखें?", please_wait: "कृपया प्रतीक्षा करें...", notice: "सूचना", cancel: "रद्द करें", ok: "ठीक है",
    save: "सहेजें", group_account: "समूह खाता", gmail_account: "Gmail खाता", role_viewer: "दर्शक", role_editor: "संपादक", role_admin: "प्रशासक", role_personal: "व्यक्तिगत",
    join_group: "समूह में जुड़ें", top_category: "शीर्ष श्रेणी", top_expense: "शीर्ष खर्च", categories: "श्रेणियाँ", total_income_label: "कुल आय:", total_expense_label: "कुल खर्च:",
    group_action_help_join: "एडमिन से मिला exact group username और password इस्तेमाल करें।",
    group_action_help_create: "अपने एडमिन खाते के लिए नया group username और password चुनें।",
    group_action_permission_tip: "अगर permission error दिखे, logout करके फिर login करें, फिर exact username/password से try करें।",
    fixed_light_mode: "ऐप fixed light mode में चल रहा है।", session_lock_note: "इस session में login lock active है। page refresh करने पर फिर से login करना होगा।",
    storage_note: "डेटा local browser storage में save होता है।", reset_note: "Reset चाहिए? app data reset करने के लिए browser local storage clear करें।",
    danger_desc: "नीचे दिया गया बटन दबाने से सभी डेटा साफ़ हो जाएंगे।", no_deleted_transactions: "कोई deleted transaction नहीं", delete_transaction_title: "लेनदेन हटाएँ"
  },
  ur: {
    app_title: "والٹ بجٹ پرائم", app_subtitle: "محفوظ بصری شناخت کے ساتھ صاف مالی ٹریکر", language_label: "زبان", language_search: "زبانیں تلاش کریں", language_no_match: "کوئی زبان نہیں ملی",
    income: "آمدن", expense: "خرچ", balance: "بیلنس", add_income: "آمدن شامل کریں", income_amount: "آمدن کی رقم", income_source: "آمدن کا ذریعہ (تنخواہ/فری لانس...)",
    save_income: "آمدن محفوظ کریں", add_expense: "خرچ شامل کریں", expense_amount: "خرچ کی رقم", category: "زمرہ (کھانا، سفر...)", save_expense: "خرچ محفوظ کریں",
    category_overview: "زمرہ جائزہ", no_expense_category: "ابھی کوئی خرچ زمرہ نہیں۔", expense_column_chart: "خرچ کالم چارٹ", income_pie_chart: "آمدن پائی چارٹ",
    transaction_history: "لین دین کی تاریخ", download_pdf: "PDF ڈاؤن لوڈ", time: "وقت", type: "قسم", category_short: "زمرہ", amount: "رقم", action: "عمل",
    no_transactions: "ابھی کوئی لین دین نہیں۔", home: "ہوم", report: "رپورٹ", wallet: "والٹ", settings: "سیٹنگز", records: "ریکارڈ", type_income: "آمدن", type_expense: "خرچ",
    general_income: "عام آمدن", login_required: "لاگ اِن ضروری", login_help: "ایپ تک رسائی کے لیے Google (Gmail) کے ساتھ جاری رکھیں۔", continue_google: "Google کے ساتھ جاری رکھیں",
    summary: "خلاصہ", current_balance: "موجودہ بیلنس", total_income: "کل آمدن", total_expense: "کل خرچ", savings_rate: "بچت کی شرح",
    income_vs_expense: "آمدن بمقابلہ خرچ حد", animated: "متحرک", control: "کنٹرول", group_actions: "گروپ ایکشنز", create_group_account: "گروپ اکاؤنٹ بنائیں",
    add_another_group: "ایک اور گروپ شامل کریں", group_action: "گروپ ایکشن", group_username: "گروپ صارف نام", group_password: "گروپ پاس ورڈ", submit: "جمع کریں",
    account_type: "اکاؤنٹ کی قسم", role: "کردار", group_credentials_admin: "گروپ اسناد (ایڈمن)", copy_credentials: "اسناد کاپی کریں", group_members: "گروپ ممبران",
    invite_member_admin: "رکن مدعو کریں (ایڈمن)", friend_gmail: "دوست کا Gmail", send_invite: "دعوت بھیجیں", request_edit_access: "ایڈٹ رسائی کی درخواست",
    admin_gmail: "ایڈمن Gmail", request_access: "رسائی کی درخواست", pending_access_requests: "زیر التواء رسائی درخواستیں", deleted_transactions_admin: "حذف شدہ لین دین (ایڈمن)",
    danger_zone: "خطرناک زون", log_out: "لاگ آؤٹ", clear_all_data: "تمام ڈیٹا صاف کریں", clear_data_title: "ڈیٹا صاف کریں", clear_data_confirm: "اس سے آپ کا تمام ڈیٹا مستقل طور پر حذف ہو جائے گا۔ اگر آپ کا کوئی گروپ اکاؤنٹ ہے تو وہ گروپ اور اس کا ڈیٹا بھی حذف ہو جائے گا۔ جاری رکھیں؟", please_wait: "براہ کرم انتظار کریں...", notice: "نوٹس", cancel: "منسوخ", ok: "ٹھیک ہے",
    save: "محفوظ کریں", group_account: "گروپ اکاؤنٹ", gmail_account: "Gmail اکاؤنٹ", role_viewer: "ناظر", role_editor: "مدیر", role_admin: "ایڈمن", role_personal: "ذاتی",
    join_group: "گروپ میں شامل ہوں", top_category: "اعلیٰ زمرہ", top_expense: "اعلیٰ خرچ", categories: "زمرے", total_income_label: "کل آمدن:", total_expense_label: "کل خرچ:",
    group_action_help_join: "ایڈمن سے ملا ہوا exact group username اور password استعمال کریں۔",
    group_action_help_create: "اپنے ایڈمن اکاؤنٹ کے لیے نیا group username اور password منتخب کریں۔",
    group_action_permission_tip: "اگر permission error آئے تو logout کر کے دوبارہ login کریں، پھر exact username/password کے ساتھ try کریں۔",
    fixed_light_mode: "ایپ fixed light mode میں چل رہی ہے۔", session_lock_note: "اس session میں login lock active ہے۔ page refresh کرنے پر دوبارہ login کرنا ہوگا۔",
    storage_note: "ڈیٹا local browser storage میں محفوظ ہوتا ہے۔", reset_note: "Reset چاہیے؟ app data reset کرنے کے لیے browser local storage clear کریں۔",
    danger_desc: "نیچے والا بٹن دبانے سے تمام ڈیٹا صاف ہو جائے گا۔", no_deleted_transactions: "کوئی deleted transaction نہیں", delete_transaction_title: "معاملہ حذف کریں"
  },
  es: {
    app_title: "Vault Budget Prime", app_subtitle: "Rastreador financiero limpio con identidad visual segura", language_label: "Idioma", language_search: "Buscar idiomas", language_no_match: "No se encontró ningún idioma",
    income: "Ingresos", expense: "Gastos", balance: "Saldo", add_income: "Agregar ingreso", income_amount: "Monto de ingreso", income_source: "Fuente de ingreso (salario/freelance...)",
    save_income: "Guardar ingreso", add_expense: "Agregar gasto", expense_amount: "Monto de gasto", category: "Categoría (comida, viaje...)", save_expense: "Guardar gasto",
    category_overview: "Resumen por categoría", no_expense_category: "Aún no hay categorías de gasto.", expense_column_chart: "Gráfico de columnas de gastos", income_pie_chart: "Gráfico circular de ingresos",
    transaction_history: "Historial de transacciones", download_pdf: "Descargar PDF", time: "Hora", type: "Tipo", category_short: "Categoría", amount: "Monto", action: "Acción",
    no_transactions: "Aún no hay transacciones.", home: "Inicio", report: "Informe", wallet: "Billetera", settings: "Configuración", records: "registros", type_income: "Ingreso", type_expense: "Gasto",
    general_income: "Ingreso general", login_required: "Inicio de sesión requerido", login_help: "Continúa con Google (Gmail) para acceder a la app.", continue_google: "Continuar con Google",
    summary: "Resumen", current_balance: "Saldo actual", total_income: "Ingreso total", total_expense: "Gasto total", savings_rate: "Tasa de ahorro",
    income_vs_expense: "Rango ingreso vs gasto", animated: "Animado", control: "Control", group_actions: "Acciones de grupo", create_group_account: "Crear cuenta de grupo",
    add_another_group: "Agregar otro grupo", group_action: "Acción de grupo", group_username: "Usuario de grupo", group_password: "Contraseña de grupo", submit: "Enviar",
    account_type: "Tipo de cuenta", role: "Rol", group_credentials_admin: "Credenciales del grupo (admin)", copy_credentials: "Copiar credenciales", group_members: "Miembros del grupo",
    invite_member_admin: "Invitar miembro (admin)", friend_gmail: "Gmail del amigo", send_invite: "Enviar invitación", request_edit_access: "Solicitar acceso de edición",
    admin_gmail: "Gmail del admin", request_access: "Solicitar acceso", pending_access_requests: "Solicitudes pendientes", deleted_transactions_admin: "Transacciones eliminadas (admin)",
    danger_zone: "Zona de peligro", log_out: "Cerrar sesión", clear_all_data: "Borrar todos los datos", clear_data_title: "Borrar datos", clear_data_confirm: "Esto eliminará tus datos de forma permanente. Si tienes alguna cuenta de grupo, ese grupo y sus datos también se borrarán. ¿Continuar?", please_wait: "Por favor espera...", notice: "Aviso", cancel: "Cancelar", ok: "OK",
    save: "Guardar", group_account: "Cuenta de grupo", gmail_account: "Cuenta de Gmail", role_viewer: "espectador", role_editor: "editor", role_admin: "admin", role_personal: "personal",
    join_group: "Unirse al grupo", top_category: "Categoría principal", top_expense: "Gasto principal", categories: "Categorías", total_income_label: "Ingresos totales:", total_expense_label: "Gastos totales:",
    group_action_help_join: "Usa el nombre de usuario y la contraseña exactos del admin.",
    group_action_help_create: "Elige un nuevo nombre de usuario y contraseña para tu cuenta de admin.",
    group_action_permission_tip: "Si aparece un error de permisos, cierra sesión y vuelve a entrar, luego prueba con el usuario y contraseña exactos.",
    fixed_light_mode: "La app usa modo claro fijo.", session_lock_note: "Esta sesión tiene bloqueo de inicio activo. Al refrescar la página tendrás que iniciar sesión otra vez.",
    storage_note: "Los datos se guardan en el almacenamiento local del navegador.", reset_note: "¿Necesitas reiniciar? Borra el almacenamiento local del navegador para reiniciar los datos.",
    danger_desc: "Pulsar el botón de abajo borrará todos los datos.", no_deleted_transactions: "No hay transacciones eliminadas", delete_transaction_title: "Eliminar transacción"
  },
  fr: {
    app_title: "Vault Budget Prime", app_subtitle: "Suivi financier épuré avec identité visuelle sécurisée", language_label: "Langue", language_search: "Rechercher des langues", language_no_match: "Aucune langue trouvée",
    income: "Revenu", expense: "Dépense", balance: "Solde", add_income: "Ajouter un revenu", income_amount: "Montant du revenu", income_source: "Source du revenu (salaire/freelance...)",
    save_income: "Enregistrer le revenu", add_expense: "Ajouter une dépense", expense_amount: "Montant de la dépense", category: "Catégorie (nourriture, voyage...)", save_expense: "Enregistrer la dépense",
    category_overview: "Aperçu par catégorie", no_expense_category: "Aucune catégorie de dépense pour le moment.", expense_column_chart: "Graphique en colonnes des dépenses", income_pie_chart: "Graphique circulaire des revenus",
    transaction_history: "Historique des transactions", download_pdf: "Télécharger le PDF", time: "Heure", type: "Type", category_short: "Catégorie", amount: "Montant", action: "Action",
    no_transactions: "Aucune transaction pour le moment.", home: "Accueil", report: "Rapport", wallet: "Portefeuille", settings: "Paramètres", records: "enregistrements", type_income: "Revenu", type_expense: "Dépense",
    general_income: "Revenu général", login_required: "Connexion requise", login_help: "Continuez avec Google (Gmail) pour accéder à l’application.", continue_google: "Continuer avec Google",
    summary: "Résumé", current_balance: "Solde actuel", total_income: "Revenu total", total_expense: "Dépense totale", savings_rate: "Taux d’épargne",
    income_vs_expense: "Plage revenu vs dépense", animated: "Animé", control: "Contrôle", group_actions: "Actions du groupe", create_group_account: "Créer un compte de groupe",
    add_another_group: "Ajouter un autre groupe", group_action: "Action de groupe", group_username: "Nom d’utilisateur du groupe", group_password: "Mot de passe du groupe", submit: "Envoyer",
    account_type: "Type de compte", role: "Rôle", group_credentials_admin: "Identifiants du groupe (admin)", copy_credentials: "Copier les identifiants", group_members: "Membres du groupe",
    invite_member_admin: "Inviter un membre (admin)", friend_gmail: "Gmail de l’ami", send_invite: "Envoyer l’invitation", request_edit_access: "Demander l’accès d’édition",
    admin_gmail: "Gmail de l’admin", request_access: "Demander l’accès", pending_access_requests: "Demandes d’accès en attente", deleted_transactions_admin: "Transactions supprimées (admin)",
    danger_zone: "Zone de danger", log_out: "Déconnexion", clear_all_data: "Effacer toutes les données", clear_data_title: "Effacer les données", clear_data_confirm: "Cela supprimera définitivement vos données. Si vous possédez un compte de groupe, ce groupe et ses données seront également supprimés. Continuer ?", please_wait: "Veuillez patienter...", notice: "Avis", cancel: "Annuler", ok: "OK",
    save: "Enregistrer", group_account: "Compte de groupe", gmail_account: "Compte Gmail", role_viewer: "observateur", role_editor: "éditeur", role_admin: "admin", role_personal: "personnel",
    join_group: "Rejoindre le groupe", top_category: "Catégorie principale", top_expense: "Dépense principale", categories: "Catégories", total_income_label: "Revenu total :", total_expense_label: "Dépense totale :",
    group_action_help_join: "Utilisez exactement le nom d’utilisateur et le mot de passe fournis par l’admin.",
    group_action_help_create: "Choisissez un nouveau nom d’utilisateur et mot de passe pour votre compte admin.",
    group_action_permission_tip: "Si une erreur de permission apparaît, déconnectez-vous puis reconnectez-vous et réessayez avec le nom d’utilisateur et le mot de passe exacts.",
    fixed_light_mode: "L’application est en mode clair fixe.", session_lock_note: "Cette session a un verrou de connexion actif. Au rafraîchissement, il faudra se reconnecter.",
    storage_note: "Les données sont enregistrées dans le stockage local du navigateur.", reset_note: "Besoin de réinitialiser ? Effacez le stockage local du navigateur pour réinitialiser les données.",
    danger_desc: "Appuyer sur le bouton ci-dessous effacera toutes les données.", no_deleted_transactions: "Aucune transaction supprimée", delete_transaction_title: "Supprimer la transaction"
  },
  de: {
    app_title: "Vault Budget Prime", app_subtitle: "Übersichtlicher Finanz-Tracker mit sicherer visueller Identität", language_label: "Sprache", language_search: "Sprachen suchen", language_no_match: "Keine Sprache gefunden",
    income: "Einnahmen", expense: "Ausgaben", balance: "Saldo", add_income: "Einnahme hinzufügen", income_amount: "Einnahmebetrag", income_source: "Einnahmequelle (Gehalt/Freelance...)",
    save_income: "Einnahme speichern", add_expense: "Ausgabe hinzufügen", expense_amount: "Ausgabebetrag", category: "Kategorie (Essen, Reise...)", save_expense: "Ausgabe speichern",
    category_overview: "Kategorieübersicht", no_expense_category: "Noch keine Ausgabenkategorie.", expense_column_chart: "Ausgaben-Spaltendiagramm", income_pie_chart: "Einnahmen-Kreisdiagramm",
    transaction_history: "Transaktionsverlauf", download_pdf: "PDF herunterladen", time: "Zeit", type: "Typ", category_short: "Kategorie", amount: "Betrag", action: "Aktion",
    no_transactions: "Noch keine Transaktionen.", home: "Start", report: "Bericht", wallet: "Wallet", settings: "Einstellungen", records: "Einträge", type_income: "Einnahme", type_expense: "Ausgabe",
    general_income: "Allgemeine Einnahme", login_required: "Anmeldung erforderlich", login_help: "Mit Google (Gmail) fortfahren, um auf die App zuzugreifen.", continue_google: "Mit Google fortfahren",
    summary: "Zusammenfassung", current_balance: "Aktueller Saldo", total_income: "Gesamteinnahmen", total_expense: "Gesamtausgaben", savings_rate: "Sparquote",
    income_vs_expense: "Einnahmen vs. Ausgaben Bereich", animated: "Animiert", control: "Steuerung", group_actions: "Gruppenaktionen", create_group_account: "Gruppenkonto erstellen",
    add_another_group: "Weitere Gruppe hinzufügen", group_action: "Gruppenaktion", group_username: "Gruppenname", group_password: "Gruppenpasswort", submit: "Senden",
    account_type: "Kontotyp", role: "Rolle", group_credentials_admin: "Gruppen-Zugangsdaten (Admin)", copy_credentials: "Zugangsdaten kopieren", group_members: "Gruppenmitglieder",
    invite_member_admin: "Mitglied einladen (Admin)", friend_gmail: "Gmail des Freundes", send_invite: "Einladung senden", request_edit_access: "Bearbeitungszugriff anfordern",
    admin_gmail: "Admin-Gmail", request_access: "Zugriff anfordern", pending_access_requests: "Ausstehende Zugriffe", deleted_transactions_admin: "Gelöschte Transaktionen (Admin)",
    danger_zone: "Gefahrenbereich", log_out: "Abmelden", clear_all_data: "Alle Daten löschen", clear_data_title: "Daten löschen", clear_data_confirm: "Dadurch werden deine Daten dauerhaft gelöscht. Wenn du ein Gruppenkonto besitzt, werden diese Gruppe und die zugehörigen Daten ebenfalls gelöscht. Fortfahren?", please_wait: "Bitte warten...", notice: "Hinweis", cancel: "Abbrechen", ok: "OK",
    save: "Speichern", group_account: "Gruppenkonto", gmail_account: "Gmail-Konto", role_viewer: "Betrachter", role_editor: "Editor", role_admin: "Admin", role_personal: "persönlich",
    join_group: "Gruppe beitreten", top_category: "Top-Kategorie", top_expense: "Top-Ausgabe", categories: "Kategorien", total_income_label: "Gesamteinnahmen:", total_expense_label: "Gesamtausgaben:",
    group_action_help_join: "Verwende genau den Gruppen-Nutzernamen und das Passwort vom Admin.",
    group_action_help_create: "Wähle einen neuen Gruppen-Nutzernamen und ein neues Passwort für dein Admin-Konto.",
    group_action_permission_tip: "Wenn ein Berechtigungsfehler erscheint, abmelden und erneut anmelden, dann mit exakt demselben Nutzernamen und Passwort versuchen.",
    fixed_light_mode: "Die App läuft im festen Hellmodus.", session_lock_note: "Diese Sitzung hat eine aktive Login-Sperre. Beim Aktualisieren muss man sich erneut anmelden.",
    storage_note: "Daten werden im lokalen Browser-Speicher gespeichert.", reset_note: "Zurücksetzen nötig? Browser-Lokalspeicher löschen, um App-Daten zurückzusetzen.",
    danger_desc: "Das Drücken der Schaltfläche unten löscht alle Daten.", no_deleted_transactions: "Keine gelöschten Transaktionen", delete_transaction_title: "Transaktion löschen"
  },
  tr: {
    app_title: "Vault Budget Prime", app_subtitle: "Güvenli görsel kimlikle temiz finans takipçisi", language_label: "Dil", language_search: "Dilleri ara", language_no_match: "Dil bulunamadı",
    income: "Gelir", expense: "Gider", balance: "Bakiye", add_income: "Gelir ekle", income_amount: "Gelir tutarı", income_source: "Gelir kaynağı (Maaş/Freelance...)",
    save_income: "Geliri kaydet", add_expense: "Gider ekle", expense_amount: "Gider tutarı", category: "Kategori (Yemek, Seyahat...)", save_expense: "Gideri kaydet",
    category_overview: "Kategori özeti", no_expense_category: "Henüz gider kategorisi yok.", expense_column_chart: "Gider sütun grafiği", income_pie_chart: "Gelir pasta grafiği",
    transaction_history: "İşlem geçmişi", download_pdf: "PDF indir", time: "Zaman", type: "Tür", category_short: "Kategori", amount: "Tutar", action: "Eylem",
    no_transactions: "Henüz işlem yok.", home: "Ana Sayfa", report: "Rapor", wallet: "Cüzdan", settings: "Ayarlar", records: "kayıt", type_income: "Gelir", type_expense: "Gider",
    general_income: "Genel Gelir", login_required: "Giriş gerekli", login_help: "Uygulamaya erişmek için Google (Gmail) ile devam edin.", continue_google: "Google ile devam et",
    summary: "Özet", current_balance: "Mevcut bakiye", total_income: "Toplam gelir", total_expense: "Toplam gider", savings_rate: "Tasarruf oranı",
    income_vs_expense: "Gelir - Gider aralığı", animated: "Animasyonlu", control: "Kontrol", group_actions: "Grup işlemleri", create_group_account: "Grup hesabı oluştur",
    add_another_group: "Başka grup ekle", group_action: "Grup işlemi", group_username: "Grup kullanıcı adı", group_password: "Grup parolası", submit: "Gönder",
    account_type: "Hesap türü", role: "Rol", group_credentials_admin: "Grup kimlik bilgileri (Yönetici)", copy_credentials: "Kimlik bilgilerini kopyala", group_members: "Grup üyeleri",
    invite_member_admin: "Üye davet et (Yönetici)", friend_gmail: "Arkadaşın Gmail'i", send_invite: "Davet gönder", request_edit_access: "Düzenleme erişimi iste",
    admin_gmail: "Yönetici Gmail", request_access: "Erişim iste", pending_access_requests: "Bekleyen erişim istekleri", deleted_transactions_admin: "Silinen işlemler (Yönetici)",
    danger_zone: "Tehlikeli alan", log_out: "Çıkış yap", clear_all_data: "Tüm verileri sil", clear_data_title: "Verileri sil", clear_data_confirm: "Bu, tüm verilerinizi kalıcı olarak silecek. Bir grup hesabınız varsa, o grup ve verileri de silinecek. Devam edilsin mi?", please_wait: "Lütfen bekleyin...", notice: "Uyarı", cancel: "İptal", ok: "Tamam",
    save: "Kaydet", group_account: "Grup hesabı", gmail_account: "Gmail hesabı", role_viewer: "izleyici", role_editor: "editör", role_admin: "yönetici", role_personal: "kişisel",
    join_group: "Gruba katıl", top_category: "En yüksek kategori", top_expense: "En yüksek gider", categories: "Kategoriler", total_income_label: "Toplam gelir:", total_expense_label: "Toplam gider:",
    group_action_help_join: "Yöneticiden aldığınız tam grup kullanıcı adını ve parolayı kullanın.",
    group_action_help_create: "Yönetici hesabınız için yeni bir grup kullanıcı adı ve parolası seçin.",
    group_action_permission_tip: "İzin hatası görünürse çıkış yapıp yeniden giriş yapın, sonra aynı kullanıcı adı ve parola ile tekrar deneyin.",
    fixed_light_mode: "Uygulama sabit açık modda çalışıyor.", session_lock_note: "Bu oturumda giriş kilidi aktif. Sayfayı yenilerseniz yeniden giriş gerekir.",
    storage_note: "Veriler yerel tarayıcı depolamasında saklanır.", reset_note: "Sıfırlamak mı istiyorsunuz? Uygulama verilerini sıfırlamak için tarayıcı yerel depolamasını temizleyin.",
    danger_desc: "Aşağıdaki düğmeye basmak tüm verileri siler.", no_deleted_transactions: "Silinmiş işlem yok", delete_transaction_title: "İşlemi sil"
  },
  ru: {
    app_title: "Vault Budget Prime", app_subtitle: "Чистый финансовый трекер с безопасной визуальной идентичностью", language_label: "Язык", language_search: "Поиск языков", language_no_match: "Язык не найден",
    income: "Доход", expense: "Расход", balance: "Баланс", add_income: "Добавить доход", income_amount: "Сумма дохода", income_source: "Источник дохода (зарплата/фриланс...)",
    save_income: "Сохранить доход", add_expense: "Добавить расход", expense_amount: "Сумма расхода", category: "Категория (еда, поездка...)", save_expense: "Сохранить расход",
    category_overview: "Обзор категорий", no_expense_category: "Пока нет категории расходов.", expense_column_chart: "Столбчатая диаграмма расходов", income_pie_chart: "Круговая диаграмма доходов",
    transaction_history: "История транзакций", download_pdf: "Скачать PDF", time: "Время", type: "Тип", category_short: "Категория", amount: "Сумма", action: "Действие",
    no_transactions: "Пока нет транзакций.", home: "Главная", report: "Отчёт", wallet: "Кошелёк", settings: "Настройки", records: "записи", type_income: "Доход", type_expense: "Расход",
    general_income: "Общий доход", login_required: "Требуется вход", login_help: "Продолжите с Google (Gmail), чтобы получить доступ к приложению.", continue_google: "Продолжить с Google",
    summary: "Сводка", current_balance: "Текущий баланс", total_income: "Общий доход", total_expense: "Общий расход", savings_rate: "Уровень сбережений",
    income_vs_expense: "Диапазон доходов и расходов", animated: "Анимировано", control: "Управление", group_actions: "Действия группы", create_group_account: "Создать групповую учётную запись",
    add_another_group: "Добавить ещё одну группу", group_action: "Действие группы", group_username: "Имя пользователя группы", group_password: "Пароль группы", submit: "Отправить",
    account_type: "Тип аккаунта", role: "Роль", group_credentials_admin: "Учётные данные группы (админ)", copy_credentials: "Скопировать учётные данные", group_members: "Участники группы",
    invite_member_admin: "Пригласить участника (админ)", friend_gmail: "Gmail друга", send_invite: "Отправить приглашение", request_edit_access: "Запросить доступ к редактированию",
    admin_gmail: "Gmail администратора", request_access: "Запросить доступ", pending_access_requests: "Ожидающие запросы", deleted_transactions_admin: "Удалённые транзакции (админ)",
    danger_zone: "Опасная зона", log_out: "Выйти", clear_all_data: "Очистить все данные", clear_data_title: "Очистить данные", clear_data_confirm: "Это навсегда удалит все ваши данные. Если у вас есть групповая учётная запись, эта группа и её данные тоже будут удалены. Продолжить?", please_wait: "Пожалуйста, подождите...", notice: "Уведомление", cancel: "Отмена", ok: "ОК",
    save: "Сохранить", group_account: "Групповая учётная запись", gmail_account: "Аккаунт Gmail", role_viewer: "наблюдатель", role_editor: "редактор", role_admin: "админ", role_personal: "личный",
    join_group: "Присоединиться к группе", top_category: "Основная категория", top_expense: "Основной расход", categories: "Категории", total_income_label: "Общий доход:", total_expense_label: "Общий расход:",
    group_action_help_join: "Используйте точное имя пользователя группы и пароль от администратора.",
    group_action_help_create: "Выберите новое имя пользователя и пароль группы для своей учётной записи администратора.",
    group_action_permission_tip: "Если появляется ошибка прав, выйдите и войдите снова, затем попробуйте точные имя пользователя и пароль.",
    fixed_light_mode: "Приложение работает в фиксированном светлом режиме.", session_lock_note: "В этой сессии включена блокировка входа. После обновления страницы нужно войти снова.",
    storage_note: "Данные сохраняются в локальном хранилище браузера.", reset_note: "Нужно сбросить? Очистите локальное хранилище браузера, чтобы сбросить данные приложения.",
    danger_desc: "Нажатие кнопки ниже удалит все данные.", no_deleted_transactions: "Удалённых транзакций нет", delete_transaction_title: "Удалить транзакцию"
  }
};

function t(key) {
  return i18n[currentLang]?.[key] || i18n.en[key] || key;
}

function tx(key, vars = {}) {
  return String(t(key)).replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ""));
}

function getLocaleForLang() {
  const option = LANGUAGE_OPTIONS.find((item) => item.code === currentLang);
  return option?.locale || "en-US";
}

function getLanguageOption(code) {
  return LANGUAGE_OPTIONS.find((item) => item.code === code) || LANGUAGE_OPTIONS[0];
}

function isRtlLanguage(code) {
  return ["ar", "ur"].includes(code);
}

function getLangMenuRefs() {
  if (!langMenu) return {};
  return {
    search: langMenu.querySelector(".lang-search"),
    list: langMenu.querySelector(".lang-menu-list"),
    empty: langMenu.querySelector(".lang-menu-empty")
  };
}

function filterLanguageOptions(query = "") {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) return LANGUAGE_OPTIONS;
  return LANGUAGE_OPTIONS.filter((option) => {
    const haystack = [option.code, option.name, option.native].join(" ").toLowerCase();
    return haystack.includes(normalized);
  });
}

function renderLanguageMenu() {
  if (!langMenu) return;
  const currentQuery = langSearchQuery || getLangMenuRefs().search?.value || "";
  const options = filterLanguageOptions(currentQuery);
  langMenu.innerHTML = `
    <div class="lang-menu-head">
      <div class="lang-menu-title">${t("language_label")}</div>
      <div class="lang-search-wrap">
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <input class="lang-search" type="search" autocomplete="off" spellcheck="false" placeholder="${t("language_search")}" aria-label="${t("language_search")}" />
      </div>
    </div>
    <div class="lang-menu-list" role="listbox" aria-label="${t("language_label")}"></div>
    <div class="lang-menu-empty${options.length ? " hidden" : ""}">${t("language_no_match")}</div>
  `;

  const { search, list, empty } = getLangMenuRefs();
  if (search) {
    search.value = currentQuery;
    search.addEventListener("input", () => {
      langSearchQuery = search.value;
      renderLanguageMenu();
      updateLanguagePickerUI();
      openLanguageMenu();
      search.focus({ preventScroll: true });
      const refreshedSearch = getLangMenuRefs().search;
      if (refreshedSearch) {
        refreshedSearch.setSelectionRange(refreshedSearch.value.length, refreshedSearch.value.length);
      }
    });
  }

  if (!list || !empty) return;
  list.innerHTML = "";

  for (const option of options) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lang-option";
    btn.setAttribute("role", "option");
    btn.setAttribute("data-lang", option.code);
    btn.setAttribute("aria-selected", String(option.code === currentLang));
    btn.innerHTML = `
      <span class="lang-option-flag" aria-hidden="true">${option.flag}</span>
      <span class="lang-option-main">
        <span class="lang-option-name">${option.native}</span>
        <span class="lang-option-meta">${option.name}</span>
      </span>
    `;
    btn.addEventListener("click", () => {
      applyLanguage(option.code);
      langSearchQuery = "";
      closeLanguageMenu();
    });
    list.appendChild(btn);
  }

  empty.classList.toggle("hidden", options.length > 0);
}

function updateLanguagePickerUI() {
  const option = getLanguageOption(currentLang);
  const previousLang = langSwitcher?.getAttribute("data-current-lang");
  if (langCurrentLabel) langCurrentLabel.textContent = option.native;
  if (langCurrentFlag) langCurrentFlag.textContent = option.flag;
  if (langSwitcher) {
    langSwitcher.setAttribute("aria-expanded", langMenu ? String(!langMenu.classList.contains("hidden")) : "false");
    langSwitcher.classList.toggle("is-open", !!langMenu && !langMenu.classList.contains("hidden"));
    if (previousLang !== option.code) {
      langSwitcher.setAttribute("data-current-lang", option.code);
      langSwitcher.classList.remove("pop");
      window.requestAnimationFrame(() => {
        langSwitcher.classList.add("pop");
        window.setTimeout(() => langSwitcher?.classList.remove("pop"), 480);
      });
    }
  }
  if (langMenu) {
    langMenu.querySelectorAll(".lang-option").forEach((btn) => {
      const active = btn.getAttribute("data-lang") === currentLang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    const { search, list, empty } = getLangMenuRefs();
    if (search && langSearchQuery !== search.value) {
      search.value = langSearchQuery;
    }
    const hasOptions = !!list?.children.length;
    if (empty) empty.classList.toggle("hidden", hasOptions);
  }
}

function openLanguageMenu() {
  if (!langMenu || !langSwitcher) return;
  langMenu.classList.remove("hidden");
  updateLanguagePickerUI();
}

function closeLanguageMenu() {
  if (!langMenu || !langSwitcher) return;
  langMenu.classList.add("hidden");
  updateLanguagePickerUI();
}

function toggleLanguageMenu() {
  if (!langMenu || !langSwitcher) return;
  if (langMenu.classList.contains("hidden")) {
    openLanguageMenu();
  } else {
    closeLanguageMenu();
  }
}

function applyLanguage(lang = "en") {
  const option = getLanguageOption(lang);
  currentLang = option?.code || "en";
  document.documentElement.lang = currentLang;
  document.documentElement.dir = option?.dir || (isRtlLanguage(currentLang) ? "rtl" : "ltr");
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key);
  });
  if (currentSession && accountTypeText && accountRoleText) {
    accountTypeText.innerText = currentSession.type === "group" ? t("group_account") : t("gmail_account");
    accountRoleText.innerText = t(`role_${currentSession.role || "viewer"}`);
  }
  if (!groupActionFormCard?.classList.contains("hidden")) {
    openGroupActionForm(groupActionMode);
  }
  renderLanguageMenu();
  updateLanguagePickerUI();
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

const BUTTON_CLICK_SOUND_SRC = "assets/btn-click-sound.mp3";
const buttonClickSoundTemplate = new Audio(BUTTON_CLICK_SOUND_SRC);
buttonClickSoundTemplate.preload = "auto";
buttonClickSoundTemplate.volume = 0.35;

function playButtonClickSound() {
  try {
    const clip = buttonClickSoundTemplate.cloneNode(true);
    clip.volume = buttonClickSoundTemplate.volume;
    clip.play().catch(() => { });
  } catch (_) {
    // Ignore sound failures so buttons still work normally.
  }
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
        withLoader(tx("removing_member"), async () => {
            await removeGroupMember(doc.id, label);
          }).catch((e) => appAlert(e.message || tx("kick_failed")));
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
  const ok = await appConfirm(tx("kick_member_confirm", { label }), tx("kick_title"));
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
    li.innerText = tx("no_pending_request");
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
    btn.innerHTML = `<i class="fa-solid fa-check"></i> ${tx("approve")}`;
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
  appAlert(tx("edit_access_requested"));
}

function applyAuthState() {
  if (!currentSession) {
    stopGroupRealtimeSync();
    authInfo.innerText = tx("private_mode_login_first");
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
    ? tx("logged_in_as_email", { email: currentSession.email })
    : tx("logged_in_as_group_user", { username: currentSession.username });

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
    appAlert(tx("invite_expired"), tx("notice"));
    return;
  }

  const invitedEmail = String(inv.email || "").trim().toLowerCase();
  if (invitedEmail) {
    const currentUserEmail = String(firebaseUser.email || "").trim().toLowerCase();
    const emailMatched = normalizeInviteEmail(currentUserEmail) === normalizeInviteEmail(invitedEmail);
    if (!emailMatched) {
      appAlert(tx("invite_mismatch", { invited: invitedEmail, current: currentUserEmail || "unknown" }), tx("invite_mismatch_title"));
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
    appAlert(tx("login_first"));
    return;
  }
  const username = groupActionUsername.value.trim();
  const password = groupActionPassword.value;
  if (!username || !password) {
    appAlert(tx("username_password_required"));
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
    appAlert(tx("group_username_exists"));
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
      appAlert(tx("group_account_recovered"));
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
  appAlert(tx("group_account_created"));
}

async function joinGroupFromGmail() {
  if (!firebaseUser || !db) {
    appAlert(tx("login_first"));
    return;
  }
  const username = groupActionUsername.value.trim();
  const password = groupActionPassword.value;
  if (!username || !password) {
    appAlert(tx("username_password_required"));
    return;
  }

  const unameKey = normalizeUsername(username);
  const userSnap = await db.collection("groupUsers").doc(unameKey).get();
  if (!userSnap.exists) {
    appAlert(tx("group_username_not_found"));
    return;
  }

  const userData = userSnap.data();
  if (userData.password !== password) {
    appAlert(tx("wrong_password"));
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
  appAlert(tx("joined_group_success"));
}

async function sendInviteToGmail() {
  if (!isCurrentAdmin() || !currentSession?.groupId) return;
  const email = inviteEmailInput.value.trim().toLowerCase();
  if (!email) {
    appAlert(tx("friend_gmail_required"));
    return;
  }
  const myEmail = (firebaseUser?.email || currentSession?.email || "").trim().toLowerCase();
  if (myEmail && email === myEmail) {
    appAlert(tx("invite_self_error"));
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
    appAlert(tx("invite_compose_opened", { link }));
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
    appAlert(tx("admin_only_delete"));
    return;
  }
  const idx = transactions.findIndex((t) => t.id === txnId);
  if (idx < 0) return;

  const txn = transactions[idx];
  const ok = await appConfirm(tx("delete_transaction_confirm"), tx("delete_transaction_title"));
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
    restoreBtn.innerHTML = `<i class="fa-solid fa-rotate-left"></i> ${tx("restore")}`;
    restoreBtn.onclick = () => {
      withLoader(tx("restoring_transaction"), async () => {
        await restoreDeletedTransaction(txn.id);
      }).catch((e) => appAlert(e.message || tx("restore_failed")));
    };

    const permanentDeleteBtn = document.createElement("button");
    permanentDeleteBtn.className = "btn danger-btn";
    permanentDeleteBtn.innerHTML = `<i class="fa-solid fa-trash-can"></i> ${tx("delete_transaction_title")}`;
    permanentDeleteBtn.onclick = () => {
      permanentDeleteDeletedTransaction(txn.id).catch((e) => appAlert(e.message || tx("delete_failed")));
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
    appAlert(tx("admin_only_restore"));
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
    appAlert(tx("admin_only_edit"));
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
        <div class="modal-copy-title">${txn.type === "income" ? tx("edit_income_title") : tx("edit_expense_title")}</div>
        <div class="edit-meta">${tx("edit_date")}: ${escapeHtml(txn.time || "-")}</div>
        <div class="field edit-field">
          <input id="editTxnAmount" type="number" min="0" step="0.01" value="${Number(txn.amount || 0)}" placeholder=" " />
          <label class="floating-label" for="editTxnAmount">${tx("edit_amount")}</label>
        </div>
        <div class="field edit-field">
          <input id="editTxnCategory" type="text" value="${escapeHtml(String(txn.category || ""))}" placeholder=" " />
          <label class="floating-label" for="editTxnCategory">${txn.type === "income" ? tx("edit_income_source") : tx("edit_category")}</label>
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
        if (errorNode) errorNode.innerText = tx("valid_amount_required");
        return;
      }
      if (!nextCategory) {
        if (errorNode) errorNode.innerText = txn.type === "income" ? tx("income_source_required") : tx("category_required");
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
    appAlert(tx("admin_only_permanent_delete"));
    return;
  }

  const ok = await appConfirm(
    tx("permanent_delete_confirm"),
    tx("admin_only_permanent_delete")
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
        openTransactionEditModal(txn.id).catch((e) => appAlert(e.message || tx("edit_failed")));
      };

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "txn-delete-btn";
      deleteBtn.title = tx("delete_transaction_title");
      deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
      deleteBtn.onclick = () => {
        withLoader(tx("deleting_transaction"), async () => {
          await deleteTransaction(txn.id);
        }).catch((e) => appAlert(e.message || tx("delete_failed")));
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
    appAlert(tx("popup_blocked"));
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
    handleGoogleAuthUser(user).catch((e) => appAlert(e.message || tx("auth_error")));
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
  withLoader(tx("sending_invite"), async () => {
    await sendInviteToGmail();
  }).catch((e) => appAlert(e.message || tx("invite_failed")));
});

requestAccessBtn.addEventListener("click", () => {
  withLoader(tx("submitting_request"), async () => {
    await requestEditAccess();
  }).catch((e) => appAlert(e.message || tx("request_failed")));
});

copyAdminCredentialBtn?.addEventListener("click", async () => {
  const uname = adminCredentialUsername?.innerText?.trim() || "-";
  const pass = adminCredentialPassword?.innerText?.trim() || "-";
  if (uname === "-" || pass === "-") {
    appAlert(tx("credentials_not_ready"));
    return;
  }
  const text = `${uname}\n${pass}`;
  try {
    await navigator.clipboard.writeText(text);
    appAlert(tx("credentials_copied"));
  } catch (_) {
    appAlert(tx("copy_failed", { text }));
  }
});

createGroupBtn.addEventListener("click", () => openGroupActionForm("create"));
addAnotherGroupBtn?.addEventListener("click", () => openGroupActionForm("join"));
groupActionSubmitBtn.addEventListener("click", async () => {
  try {
    await withLoader(groupActionMode === "join" ? tx("joining_group") : tx("creating_group"), async () => {
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

document.addEventListener("click", (event) => {
  const button = event.target?.closest?.("button");
  if (!button || button.disabled) return;
  playButtonClickSound();
}, true);

langSwitcher?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleLanguageMenu();
});

langMenu?.addEventListener("click", (event) => {
  event.stopPropagation();
});

document.addEventListener("click", (event) => {
  if (!langMenu || !langSwitcher) return;
  if (!langSwitcher.contains(event.target) && !langMenu.contains(event.target)) {
    closeLanguageMenu();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeLanguageMenu();
  }
});

googleLoginBtn.addEventListener("click", async () => {
  if (loginProgress) return;
  try {
    loginProgress = true;
    googleLoginBtn.disabled = true;
    googleLoginBtn.style.opacity = "0.7";
    showLoader(tx("signing_in"));
    await auth.signInWithPopup(googleProvider);
  } catch (error) {
    finalizeLoginFlow();
    appAlert(error?.message || tx("google_login_failed"));
  }
});

logoutBtn?.addEventListener("click", async () => {
  const ok = await appConfirm(tx("logout_confirm"), tx("logout_title"));
  if (!ok) return;
  try {
    await withLoader(tx("logging_out"), async () => {
      if (auth && auth.currentUser) {
        await auth.signOut();
      } else {
        currentSession = null;
        saveSession();
        applyAuthState();
      }
    });
    appAlert(tx("logout_success"));
  } catch (e) {
    appAlert(e.message || tx("logout_failed"));
  }
});

clearDataBtn.addEventListener("click", async () => {
  const ok = await appConfirm(tx("clear_data_confirm"), tx("clear_data_title"));
  if (!ok) return;
  let remoteClearError = "";
  showLoader(tx("resetting_data"));
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
      appAlert(tx("local_reset_remote_failed", { error: remoteClearError }));
    } else {
      appAlert(tx("clear_all_data_complete"));
    }
  } finally {
    hideLoader();
  }
});

applyTheme();
applyLanguage(currentLang);
renderLanguageMenu();
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

window.addIncome = addIncome;
window.addExpense = addExpense;
window.renderSavingsRateChart = renderSavingsRateChart;

