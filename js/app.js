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
let currentLang = "en";
const LANGUAGE_OPTIONS = [
  { code: "en", name: "English", native: "English", flagCode: "us", locale: "en-US", dir: "ltr" },
  { code: "bn", name: "Bengali", native: "বাংলা", flagCode: "bd", locale: "bn-BD", dir: "ltr" },
  { code: "ar", name: "Arabic", native: "العربية", flagCode: "sa", locale: "ar-SA", dir: "rtl" },
  { code: "hi", name: "Hindi", native: "हिन्दी", flagCode: "in", locale: "hi-IN", dir: "ltr" },
  { code: "ur", name: "Urdu", native: "اردو", flagCode: "pk", locale: "ur-PK", dir: "rtl" },
  { code: "es", name: "Spanish", native: "Español", flagCode: "es", locale: "es-ES", dir: "ltr" },
  { code: "fr", name: "French", native: "Français", flagCode: "fr", locale: "fr-FR", dir: "ltr" },
  { code: "de", name: "German", native: "Deutsch", flagCode: "de", locale: "de-DE", dir: "ltr" },
  { code: "tr", name: "Turkish", native: "Türkçe", flagCode: "tr", locale: "tr-TR", dir: "ltr" },
  { code: "ru", name: "Russian", native: "Русский", flagCode: "ru", locale: "ru-RU", dir: "ltr" }
];
let langSearchQuery = "";
let i18n = {};
let i18nLoadPromise = null;
const I18N_DIR = "./assets/i18n";

async function loadI18n() {
  if (i18nLoadPromise) return i18nLoadPromise;
  const langCodes = LANGUAGE_OPTIONS.map((option) => option.code);
  i18nLoadPromise = Promise.all(
    langCodes.map(async (code) => {
      try {
        const response = await fetch(`${I18N_DIR}/${code}.json?v=13`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load ${code} i18n JSON (${response.status})`);
        }
        return [code, await response.json()];
      } catch (error) {
        console.error(`Failed to load ${code} i18n JSON`, error);
        return [code, {}];
      }
    })
  ).then((entries) => {
    i18n = Object.fromEntries(entries);
    return i18n;
  });
  return i18nLoadPromise;
}
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

function getFlagUrl(code, size = "w80") {
  return `https://flagcdn.com/${size}/${String(code || "").toLowerCase()}.png`;
}

function renderFlag(option, className = "lang-flag") {
  const alt = `${option?.name || "Language"} flag`;
  const countryCode = option?.flagCode || option?.code || "us";
  return `
    <img
      class="${className}__img"
      src="${getFlagUrl(countryCode)}"
      srcset="${getFlagUrl(countryCode, "w160")} 2x, ${getFlagUrl(countryCode, "w320")} 3x"
      alt="${alt}"
      loading="lazy"
      referrerpolicy="no-referrer"
      onerror="this.remove(); this.parentElement?.classList.add('flag-fallback'); this.parentElement && (this.parentElement.textContent='${(option?.code || "en").toUpperCase()}');"
    />
  `;
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
      <span class="lang-option-flag" aria-hidden="true">${renderFlag(option, "lang-option-flag")}</span>
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
  if (langCurrentFlag) {
    langCurrentFlag.classList.remove("flag-fallback");
    langCurrentFlag.innerHTML = renderFlag(option, "lang-flag");
  }
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
  window.refreshThemeCopy?.(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
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
    const meta = document.createElement("div");
    const labelEl = document.createElement("span");
    const label = m.label || m.email || m.memberId || "Member";
    const role = m.role || "viewer";
    row.className = "member-main";
    meta.className = "member-meta";
    labelEl.className = "member-label";
    labelEl.textContent = label;
    row.appendChild(labelEl);
    meta.textContent = t(`role_${role}`) || role;
    row.appendChild(meta);
    li.appendChild(row);

    if (isCurrentAdmin()) {
      const isSelf = m.memberId === currentSession.memberId;
      const isAdminMember = role === "admin";
      if (!isSelf && !isAdminMember) {
        const kickBtn = document.createElement("button");
        kickBtn.className = "btn danger-btn";
        kickBtn.innerHTML = `<i class="fa-solid fa-user-minus"></i> ${tx("kick_button")}`;
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

  const seenRequesters = new Set();
  snap.forEach((doc) => {
    const req = doc.data();
    const requesterKey = req.fromMemberId || req.fromLabel || doc.id;
    if (seenRequesters.has(requesterKey)) return;
    seenRequesters.add(requesterKey);
    const li = document.createElement("li");
    const info = document.createElement("div");
    const btn = document.createElement("button");
    info.innerText = req.fromLabel ? `${req.fromLabel} (${t("request_access")})` : t("request_access");
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

  const existingPending = await db
    .collection("accessRequests")
    .where("groupId", "==", currentSession.groupId)
    .where("fromMemberId", "==", currentSession.memberId)
    .where("status", "==", "pending")
    .limit(1)
    .get();
  if (!existingPending.empty) {
    appAlert(tx("request_already_pending"));
    requestAccessEmailInput.value = "";
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
      permanentDeleteDeletedTransaction(txn.id).catch((e) =>
        appAlert(e.message || tx("permanent_delete_failed"))
      );
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
      if (isModalOverlayTarget(event)) onCancel();
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
    tx("permanent_delete_title")
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
    navigator.serviceWorker.register("./sw.js?v=15").catch(() => { });
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

async function bootApp() {
  await loadI18n();
  const savedLang = localStorage.getItem(LANG_STORAGE_KEY);
  currentLang = getLanguageOption(savedLang || "en").code;
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
}

bootApp().catch((error) => {
  console.error("Boot failed", error);
});

window.addIncome = addIncome;
window.addExpense = addExpense;
window.renderSavingsRateChart = renderSavingsRateChart;


(function initModalAnimationPreference() {
  const MODAL_ANIMATION_STORAGE_KEY = "vault_modal_animation";
  const OPTIONS = new Set([
    "simple",
    "meep",
    "unfolding",
    "revealing",
    "uncovering",
    "blow-up",
    "sketch",
    "bond"
  ]);

  const modal = document.getElementById("appModal");
  const select = document.getElementById("modalAnimationSelect");
  if (!modal || !select) return;
  if (select.dataset.modalAnimationBound === "true") return;
  select.dataset.modalAnimationBound = "true";

  const normalize = (value) => {
    const next = String(value || "").trim();
    return OPTIONS.has(next) ? next : "simple";
  };

  const apply = (value) => {
    const next = normalize(value);
    modal.dataset.modalAnimation = next;
    select.value = next;
    try {
      localStorage.setItem(MODAL_ANIMATION_STORAGE_KEY, next);
    } catch (_) { }
    return next;
  };

  const saved = (() => {
    try {
      return localStorage.getItem(MODAL_ANIMATION_STORAGE_KEY);
    } catch (_) {
      return "simple";
    }
  })();

  apply(saved || select.value || "simple");
  select.addEventListener("change", () => apply(select.value));
})();
