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
  { code: "bn", name: "Bengali", native: "à¦¬à¦¾à¦‚à¦²à¦¾", flagCode: "bd", locale: "bn-BD", dir: "ltr" },
  { code: "ar", name: "Arabic", native: "Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©", flagCode: "sa", locale: "ar-SA", dir: "rtl" },
  { code: "hi", name: "Hindi", native: "à¤¹à¤¿à¤¨à¥à¤¦à¥€", flagCode: "in", locale: "hi-IN", dir: "ltr" },
  { code: "ur", name: "Urdu", native: "Ø§Ø±Ø¯Ùˆ", flagCode: "pk", locale: "ur-PK", dir: "rtl" },
  { code: "es", name: "Spanish", native: "EspaÃ±ol", flagCode: "es", locale: "es-ES", dir: "ltr" },
  { code: "fr", name: "French", native: "FranÃ§ais", flagCode: "fr", locale: "fr-FR", dir: "ltr" },
  { code: "de", name: "German", native: "Deutsch", flagCode: "de", locale: "de-DE", dir: "ltr" },
  { code: "tr", name: "Turkish", native: "TÃ¼rkÃ§e", flagCode: "tr", locale: "tr-TR", dir: "ltr" },
  { code: "ru", name: "Russian", native: "Ð ÑƒÑÑÐºÐ¸Ð¹", flagCode: "ru", locale: "ru-RU", dir: "ltr" }
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
        const response = await fetch(`${I18N_DIR}/${code}.json?v=16`, { cache: "no-store" });
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
    if (!langMenu.classList.contains("hidden") && window.matchMedia("(max-width: 620px)").matches) {
      const triggerRect = langSwitcher?.getBoundingClientRect();
      if (triggerRect) {
        const menuWidth = Math.min(420, window.innerWidth - 24);
        const margin = 12;
        const left = Math.max(margin, Math.min(triggerRect.right - menuWidth, window.innerWidth - menuWidth - margin));
        const bottomNav = document.querySelector(".bottom-nav:not(.hidden)");
        const bottomLimit = bottomNav ? bottomNav.getBoundingClientRect().top - 12 : window.innerHeight - 12;
        const topLimit = 12;
        const gap = 8;
        const belowTop = triggerRect.bottom + gap;
        const belowSpace = bottomLimit - belowTop;
        const aboveSpace = triggerRect.top - gap - topLimit;
        const openBelow = belowSpace >= aboveSpace || belowSpace >= 220;
        const available = Math.max(100, openBelow ? belowSpace : aboveSpace);
        const menuHeight = Math.max(100, Math.min(Math.min(72 * window.innerHeight / 100, 560), available));
        const top = openBelow ? belowTop : Math.max(topLimit, triggerRect.top - gap - menuHeight);
        langMenu.style.setProperty("--lang-menu-left", `${left}px`);
        langMenu.style.setProperty("--lang-menu-top", `${top}px`);
        langMenu.style.setProperty("--lang-menu-max-height", `${menuHeight}px`);
      }
    } else {
      langMenu.style.removeProperty("--lang-menu-left");
      langMenu.style.removeProperty("--lang-menu-top");
      langMenu.style.removeProperty("--lang-menu-max-height");
    }
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

window.addEventListener("resize", () => {
  if (langMenu && !langMenu.classList.contains("hidden")) updateLanguagePickerUI();
});
window.addEventListener("scroll", () => {
  if (langMenu && !langMenu.classList.contains("hidden")) updateLanguagePickerUI();
}, true);

function applyLanguage(lang = "en") {
  const option = getLanguageOption(lang);
  currentLang = option?.code || "en";
  document.documentElement.lang = currentLang;
  document.documentElement.dir = option?.dir || (isRtlLanguage(currentLang) ? "rtl" : "ltr");
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key);
  });
  if (authFormContent && authModeToggle) setAuthFormMode(authFormMode);
  if (currentSession && accountTypeText && accountRoleText) {
    accountTypeText.innerText = currentSession.type === "group" ? t("group_account") : t("gmail_account");
    accountRoleText.innerText = t(`role_${currentSession.role || "viewer"}`);
  }
  if (!groupActionFormCard?.classList.contains("hidden")) {
    openGroupActionForm(groupActionMode);
  }
  renderLanguageMenu();
  updateLanguagePickerUI();
  window.applyGameCornerLanguage?.(currentLang);
  window.refreshThemeCopy?.(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  localStorage.setItem(LANG_STORAGE_KEY, currentLang);
}

function setGroupActionHelpText(mode = "create") {
  if (!groupActionHelpText) return;
  const helpKey = mode === "join" ? "group_action_help_join_password" : "group_action_help_create_password";
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

async function refreshSettingsPanels() {
  if (!currentSession) {
    accountTypeText.innerText = "-";
    accountRoleText.innerText = "-";
    groupMembersCard.classList.add("hidden");
    inviteCard.classList.add("hidden");
    requestAccessCard.classList.add("hidden");
    pendingRequestsCard.classList.add("hidden");
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
    forceHistoryManagerPanel();
    groupMembersList.innerHTML = "";
    groupActionsCard.classList.toggle("hidden", currentSession.type !== "gmail");
    groupActionFormCard.classList.add("hidden");
    return;
  }

  // Skip heavy Firestore reads unless Settings view is currently open.
  const isSettingsOpen = document.getElementById("settingsView")?.classList.contains("active");
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
    await db.collection("groupMembers").doc(memberSnap.docs[0].id).update({
      role: "editor",
      canEdit: true,
      grantedByUid: firebaseUser.uid
    });
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
    authInfo.setAttribute("data-i18n", "private_mode_login_first");
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

  const loginProvider = currentSession.authProvider || sessionStorage.getItem("vault_auth_provider");
  const loginLabel = currentSession.displayName
    || (firebaseUser ? getAuthDisplayName(firebaseUser, loginProvider) : "")
    || currentSession.username
    || currentSession.email
    || "";
  authInfo.replaceChildren();
  authInfo.removeAttribute("data-i18n");
  const avatar = document.createElement("span");
  avatar.className = "auth-avatar";
  const fallbackLetter = (loginLabel.trim()[0] || currentSession.email?.trim()[0] || "?").toLocaleUpperCase();
  const photoURL = (firebaseUser ? getAuthPhotoURL(firebaseUser, loginProvider) : "") || currentSession.photoURL || "";
  const showAvatarFallback = () => {
    avatar.classList.add("auth-avatar-fallback");
    avatar.textContent = fallbackLetter;
  };
  if (photoURL) {
    const photo = document.createElement("img");
    photo.src = photoURL;
    photo.alt = "";
    photo.referrerPolicy = "no-referrer";
    photo.onerror = () => {
      const providerId = loginProvider === "facebook" ? "facebook.com" : "google.com";
      const providerPhoto = firebaseUser?.providerData?.find((provider) => provider.providerId === providerId)?.photoURL
        || firebaseUser?.photoURL
        || "";
      if (providerPhoto && photo.src !== providerPhoto) {
        photo.onerror = showAvatarFallback;
        photo.src = providerPhoto;
      } else {
        showAvatarFallback();
      }
    };
    avatar.appendChild(photo);
  } else {
    showAvatarFallback();
  }
  authInfo.appendChild(avatar);
  const name = document.createElement("span");
  name.textContent = loginLabel;
  authInfo.appendChild(name);

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
const BOOT_COMPLETE_ANIMATION_MS = 520;
const bootOverlayShownAt = Date.now();
let bootProgress = 5;
const bootProgressBar = appBootOverlay?.querySelector(".app-boot-line.native");
if (bootProgressBar) {
  bootProgressBar.style.setProperty("--boot-progress", `${bootProgress}%`);
}
const bootProgressTimer = window.setInterval(() => {
  if (bootOverlayClosed || !bootProgressBar) {
    window.clearInterval(bootProgressTimer);
    return;
  }
  bootProgress = Math.min(88, bootProgress + Math.max(0.15, (88 - bootProgress) * 0.035));
  bootProgressBar.style.setProperty("--boot-progress", `${bootProgress}%`);
}, 100);

function hideBootOverlay() {
  if (bootOverlayClosed || !appBootOverlay) return;
  appBootOverlay.classList.add("is-complete");
  window.clearInterval(bootProgressTimer);
  const elapsed = Date.now() - bootOverlayShownAt;
  const waitMs = Math.max(BOOT_COMPLETE_ANIMATION_MS, BOOT_MIN_SHOW_MS - elapsed);
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
  return String(value || "").trim().toLowerCase();
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

  const memberRef = db.collection("groupMembers").doc(memberDocId);
  const memberSnap = await memberRef.get();
  const batch = db.batch();
  const membershipData = {
    groupId,
    memberId,
    type: "gmail",
    label: firebaseUser.email,
    role: "viewer",
    canEdit: false,
    invitationToken: token
  };
  if (!memberSnap.exists) {
    membershipData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
  }
  batch.set(memberRef, membershipData, { merge: true });
  batch.update(invRef, { status: "accepted", acceptedAt: firebase.firestore.FieldValue.serverTimestamp() });
  await batch.commit();

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
  const memberships = await Promise.all(snap.docs.map(async (doc) => {
    const membership = doc.data();
    if (!membership.groupId || membership.memberId !== memberId
      || doc.id !== `${membership.groupId}__${memberId}`) return null;
    try {
      return await resolveTrustedMembership(membership, firebaseUser?.uid);
    } catch (_) {
      return null;
    }
  }));
  const validMemberships = memberships.filter(Boolean);

  if (preferredGroupId) {
    const preferred = validMemberships.find((m) => m.groupId === preferredGroupId);
    if (preferred) return preferred;
  }

  const adminMembership = validMemberships.find((m) => m.role === "admin");
  if (adminMembership) return adminMembership;
  return validMemberships[0] || null;
}

async function resolveTrustedMembership(membership, uid) {
  if (!membership?.groupId || !db) return membership;
  const groupSnap = await db.collection("groups").doc(membership.groupId).get();
  const ownerUid = groupSnap.exists ? groupSnap.data()?.createdByUid : "";
  if (membership.role === "admin" && ownerUid !== uid) {
    return { ...membership, role: "viewer", canEdit: false };
  }
  if (membership.role === "editor"
    && (!membership.canEdit || !ownerUid || membership.grantedByUid !== ownerUid)) {
    return { ...membership, role: "viewer", canEdit: false };
  }
  return membership;
}

let loginProgress = false;
let loginProgressTimer = 0;
let pendingSocialCredential = null;
let activeSocialProviderName = "";
let authFormMode = "signin";

function getSigningInText(providerName) {
  const names = { google: "Google", facebook: "Facebook", email: "Email" };
  const providerLabel = names[providerName] || names.email;
  return currentLang === "bn"
    ? `${providerLabel} à¦¦à¦¿à¦¯à¦¼à§‡ à¦¸à¦¾à¦‡à¦¨ à¦‡à¦¨ à¦•à¦°à¦¾ à¦¹à¦šà§à¦›à§‡...`
    : `Signing in with ${providerLabel}...`;
}

function setAuthFormMode(mode = "signin") {
  authFormMode = mode === "signup" ? "signup" : "signin";
  const isSignup = authFormMode === "signup";
  authNameField.classList.toggle("hidden", !isSignup);
  authSignInOptions.classList.toggle("hidden", isSignup);
  authPassword.autocomplete = isSignup ? "new-password" : "current-password";
  authFormTitle.textContent = t(isSignup ? "auth_create_account_title" : "auth_welcome_back");
  authFormSubtitle.textContent = t(isSignup ? "auth_signup_subtitle" : "auth_login_subtitle");
  authDisplayName.placeholder = t("auth_name_placeholder");
  authEmail.placeholder = t("auth_email_placeholder");
  authPassword.placeholder = t("auth_password_placeholder");
  authModePrompt.textContent = t(isSignup ? "auth_already_have_account" : "auth_dont_have_account");
  authModeAction.textContent = t(isSignup ? "auth_login" : "auth_sign_up");
  emailAuthSubmit.querySelector("span").textContent = t(isSignup ? "auth_create_account" : "auth_login");
  emailAuthError.textContent = "";
  authFormContent.classList.remove("is-animating");
  void authFormContent.offsetWidth;
  authFormContent.classList.add("is-animating");
  window.setTimeout(() => authFormContent.classList.remove("is-animating"), 700);
}

function getEmailAuthError(error, mode) {
  const code = error?.code || "";
  if (code === "auth/operation-not-allowed") return "Email and password sign-in is not enabled in Firebase Authentication.";
  if (code === "auth/email-already-in-use") return "This email already has an account. Switch to Login, or use another email to create an account.";
  if (code === "auth/weak-password") return "Use a password with at least 6 characters.";
  if (code === "auth/invalid-email") return "Enter a valid email address.";
  if (code === "auth/too-many-requests") return "Too many attempts. Please wait a little and try again.";
  if (mode === "signup") return error?.message || "Could not create the account. Please try again.";
  if (code === "auth/user-not-found") return "No account exists for this email yet. Switch to Sign Up first.";
  if (["auth/wrong-password", "auth/invalid-credential"].includes(code)) {
    return "Password does not match this email. Use the password you chose when signing up.";
  }
  return error?.message || "Could not log in. Please try again.";
}

async function submitEmailAuth(event) {
  event.preventDefault();
  emailAuthError.textContent = "";
  const email = authEmail.value.trim().toLowerCase();
  const password = authPassword.value;
  const displayName = authDisplayName.value.trim();
  if (!email || !password || (authFormMode === "signup" && !displayName)) {
    emailAuthError.textContent = authFormMode === "signup"
      ? "Enter your name, email, and password."
      : "Enter your email and password.";
    return;
  }
  if (authFormMode === "signup" && password.length < 6) {
    emailAuthError.textContent = "Password must be at least 6 characters long.";
    authPassword.focus();
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    emailAuthError.textContent = "Enter an email in a valid format, such as name@example.com.";
    authEmail.focus();
    return;
  }
  if (!auth) {
    emailAuthError.textContent = tx("auth_error");
    return;
  }

  const isSignup = authFormMode === "signup";
  const previousAuthProvider = sessionStorage.getItem("vault_auth_provider");
  emailAuthSubmit.disabled = true;
  emailAuthSubmit.classList.add("is-loading");
  loginProgress = true;
  showLoader(getSigningInText("email"));
  try {
    const persistence = authRemember.checked
      ? firebase.auth.Auth.Persistence.LOCAL
      : firebase.auth.Auth.Persistence.SESSION;
    await auth.setPersistence(persistence);
    sessionStorage.setItem("vault_auth_provider", "email");
    if (isSignup) {
      const credential = await auth.createUserWithEmailAndPassword(email, password);
      await credential.user.updateProfile({ displayName });
      if (currentSession?.uid === credential.user.uid) {
        currentSession.displayName = displayName;
        currentSession.email = credential.user.email || email;
        currentSession.authProvider = "email";
        saveSession();
        applyAuthState();
      }
    } else {
      await auth.signInWithEmailAndPassword(email, password);
    }
  } catch (error) {
    if (firebaseUser) {
      if (previousAuthProvider) sessionStorage.setItem("vault_auth_provider", previousAuthProvider);
      else sessionStorage.removeItem("vault_auth_provider");
    }
    emailAuthError.textContent = getEmailAuthError(error, authFormMode);
  } finally {
    loginProgress = false;
    hideLoader();
    emailAuthSubmit.disabled = false;
    emailAuthSubmit.classList.remove("is-loading");
  }
}

async function sendAuthPasswordReset() {
  const email = authEmail.value.trim().toLowerCase();
  emailAuthError.textContent = "";
  if (!email) {
    emailAuthError.textContent = "Enter your email address first.";
    authEmail.focus();
    return;
  }
  try {
    await auth.sendPasswordResetEmail(email);
    emailAuthError.textContent = "Password reset email sent. Check your inbox.";
  } catch (error) {
    emailAuthError.textContent = getEmailAuthError(error, "signin");
  }
}

function resolveAuthProviderName(user) {
  if (user?.email?.endsWith("@groups.jomao.app")) return "group";
  if (activeSocialProviderName === "facebook" || activeSocialProviderName === "google") {
    return activeSocialProviderName;
  }
  const savedProvider = sessionStorage.getItem("vault_auth_provider");
  if (savedProvider === "facebook" || savedProvider === "google") return savedProvider;
  if (user?.providerData?.some((provider) => provider.providerId === "facebook.com")) return "facebook";
  if (user?.providerData?.some((provider) => provider.providerId === "google.com")) return "google";
  return "email";
}

function getAuthDisplayName(user, providerName) {
  if (providerName === "group") return user?.displayName || "";
  const providerId = providerName === "facebook" ? "facebook.com" : "google.com";
  return user?.providerData?.find((provider) => provider.providerId === providerId)?.displayName
    || user?.displayName
    || "";
}

function getAuthPhotoURL(user, providerName) {
  if (providerName === "facebook") {
    const facebookProfile = user?.providerData?.find((provider) => provider.providerId === "facebook.com");
    return facebookProfile?.photoURL || user?.photoURL || (facebookProfile?.uid
      ? `https://graph.facebook.com/${encodeURIComponent(facebookProfile.uid)}/picture?type=large`
      : "");
  }
  const providerId = providerName === "facebook" ? "facebook.com" : "google.com";
  return user?.providerData?.find((provider) => provider.providerId === providerId)?.photoURL
    || user?.photoURL
    || "";
}

function finalizeLoginFlow() {
  window.clearTimeout(loginProgressTimer);
  loginProgressTimer = 0;
  if (!loginProgress) return;
  loginProgress = false;
  [googleLoginBtn, facebookLoginBtn].forEach((button) => {
    if (!button) return;
    button.disabled = false;
    button.style.opacity = "";
  });
  hideLoader();
}

async function handleGoogleAuthUser(user) {
  firebaseUser = user || null;
  try {
    if (!firebaseUser) {
      sessionStorage.removeItem("vault_auth_provider");
      if (currentSession?.type === "gmail") {
        currentSession = null;
        saveSession();
        stopGroupRealtimeSync();
        loadData();
        updateUI(false);
      }
      applyAuthState();
      return;
    }

    const authProvider = resolveAuthProviderName(firebaseUser);
    sessionStorage.setItem("vault_auth_provider", authProvider);
    if (authProvider === "group") {
      if (currentSession?.uid !== firebaseUser.uid) {
        currentSession = null;
        saveSession();
      }
      await handleGroupAccountAuth(firebaseUser);
      return;
    }
    const previousSession = currentSession ? { ...currentSession } : null;
    const sameGoogleAccount = previousSession?.type === "gmail"
      && previousSession.uid === firebaseUser.uid
      && (!previousSession.authProvider || previousSession.authProvider === authProvider);
    if (!sameGoogleAccount && currentSession) {
      currentSession = null;
      saveSession();
    }

    await processInviteLink();

    if (sameGoogleAccount && currentSession?.type === "gmail" && currentSession.uid === firebaseUser.uid) {
      currentSession.authProvider = authProvider;
      currentSession.displayName = getAuthDisplayName(firebaseUser, authProvider);
      currentSession.photoURL = getAuthPhotoURL(firebaseUser, authProvider);
      currentSession.email = firebaseUser.email || currentSession.email;
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
      }
      await loadGroupSharedData();
      syncTransactionState();
      updateUI();
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
        authProvider,
        displayName: getAuthDisplayName(firebaseUser, authProvider),
        photoURL: getAuthPhotoURL(firebaseUser, authProvider),
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
          authProvider,
          displayName: getAuthDisplayName(firebaseUser, authProvider),
          photoURL: getAuthPhotoURL(firebaseUser, authProvider),
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
  groupActionTitle.innerText = t(groupActionMode === "join" ? "join_group" : "create_group_account");
  groupActionSubmitBtn.innerHTML = groupActionMode === "join"
    ? `<i class="fa-solid fa-right-to-bracket"></i> ${t("join_group")}`
    : `<i class="fa-solid fa-people-group"></i> ${t("create_group_account")}`;
  setGroupActionHelpText(groupActionMode);
}

async function getGroupAuthEmail(groupName) {
  const normalizedName = String(groupName || "").normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, " ");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalizedName));
  const nameKey = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
  return `group-${nameKey}@groups.jomao.app`;
}

async function createGroupFromGmail() {
  if (!auth || !db) {
    appAlert(tx("login_first"));
    return;
  }
  const groupName = groupActionUsername.value.trim();
  const password = groupActionPassword.value;
  if (!groupName || !password) {
    appAlert(tx("username_password_required"));
    return;
  }
  if (password.length < 6) {
    appAlert(tx("group_password_min_length"));
    return;
  }
  const email = await getGroupAuthEmail(groupName);
  const pendingSetupKey = "jomao_pending_group_setup";
  sessionStorage.setItem(pendingSetupKey, JSON.stringify({ email, groupName }));
  try {
    await auth.createUserWithEmailAndPassword(email, password);
  } catch (error) {
    sessionStorage.removeItem(pendingSetupKey);
    if (error?.code === "auth/email-already-in-use") {
      throw new Error(tx("group_username_exists"));
    }
    if (error?.code === "auth/operation-not-allowed") {
      throw new Error(tx("group_password_provider_disabled"));
    }
    throw error;
  }
}

async function finishGroupAccountSetup(user, pendingSetup) {
  const { groupName } = pendingSetup;
  await user.updateProfile({ displayName: groupName });
  const memberId = `gmail_${user.uid}`;
  const groupRef = db.collection("groups").doc();
  const groupId = groupRef.id;
  const memberRef = db.collection("groupMembers").doc(`${groupId}__${memberId}`);
  const financeRef = db.collection("groupFinance").doc(groupId);
  const now = firebase.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(groupRef, {
    id: groupId,
    name: groupName,
    createdByEmail: (user.email || "").toLowerCase(),
    createdByUid: user.uid,
    createdAt: now
  });
  batch.set(memberRef, {
    groupId, memberId, type: "gmail", label: groupName,
    role: "admin", canEdit: true, createdAt: now
  });
  batch.set(financeRef, {
    income: 0, expense: 0, breakdown: {}, transactions: [],
    deletedTransactions: [], createdAt: now, updatedAt: now
  });
  await batch.commit();
  sessionStorage.removeItem("jomao_pending_group_setup");
  sessionStorage.setItem("vault_auth_provider", "group");
  currentSession = {
    type: "gmail", uid: user.uid, email: user.email, authProvider: "group",
    displayName: groupName, groupId, memberId, role: "admin", canEdit: true
  };
  saveSession();
  await loadGroupSharedData();
  syncTransactionState();
  updateUI();
  applyAuthState();
  groupActionUsername.value = "";
  groupActionPassword.value = "";
  appAlert(tx("group_account_created"));
}

async function joinGroupWithCredentials() {
  if (!auth) {
    appAlert(tx("login_first"));
    return;
  }
  const groupName = groupActionUsername.value.trim();
  const password = groupActionPassword.value;
  if (!groupName || !password) {
    appAlert(tx("username_password_required"));
    return;
  }
  const email = await getGroupAuthEmail(groupName);
  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (error) {
    if (error?.code === "auth/user-not-found" || error?.code === "auth/invalid-email") {
      throw new Error(tx("group_username_not_found"));
    }
    if (error?.code === "auth/wrong-password" || error?.code === "auth/invalid-credential") {
      throw new Error(tx("wrong_password"));
    }
    if (error?.code === "auth/operation-not-allowed") {
      throw new Error(tx("group_password_provider_disabled"));
    }
    throw error;
  }
}

async function handleGroupAccountAuth(user) {
  const pendingRaw = sessionStorage.getItem("jomao_pending_group_setup");
  if (pendingRaw) {
    let pendingSetup;
    try { pendingSetup = JSON.parse(pendingRaw); } catch (_) { pendingSetup = null; }
    if (pendingSetup?.email === user.email) {
      await finishGroupAccountSetup(user, pendingSetup);
      return;
    }
  }
  const memberId = `gmail_${user.uid}`;
  const membership = await resolveMembershipForUser(memberId);
  if (!membership) {
    currentSession = null;
    saveSession();
    await auth.signOut();
    throw new Error(tx("group_username_not_found"));
  }
  sessionStorage.setItem("vault_auth_provider", "group");
  currentSession = {
    type: "gmail", uid: user.uid, email: user.email, authProvider: "group",
    displayName: user.displayName || membership.label || t("group_account"),
    groupId: membership.groupId, memberId,
    role: membership.role || "viewer", canEdit: !!membership.canEdit
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
    head.textContent = `${txn.type || "-"} â€¢ ${txn.category || "-"}`;

    const meta = document.createElement("div");
    meta.className = "deleted-meta";
    meta.textContent = `${amountText} â€¢ Deleted: ${deletedAtText}`;

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
    const typeLabel = txn.type === "income" ? "à¦‡à¦¨à¦•à¦¾à¦®" : "à¦–à¦°à¦š";
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
      <div>à¦®à§‹à¦Ÿ à¦‡à¦¨à¦•à¦¾à¦®<strong>${escapeHtml(formatMoney(totalIncome))}</strong></div>
      <div>à¦®à§‹à¦Ÿ à¦–à¦°à¦š<strong>${escapeHtml(formatMoney(totalExpense))}</strong></div>
      <div>à¦®à§‹à¦Ÿ à¦¬à§à¦¯à¦¾à¦²à§‡à¦¨à§à¦¸<strong>${escapeHtml(formatMoney(totalBalance))}</strong></div>
      <div>à¦®à§‹à¦Ÿ à¦°à§‡à¦•à¦°à§à¦¡<strong>${escapeHtml(String(totalRecords))}</strong></div>
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
  facebookProvider = new firebase.auth.FacebookAuthProvider();
  auth.onAuthStateChanged((user) => {
    finalizeLoginFlow();
    handleGoogleAuthUser(user).catch((e) => appAlert(e.message || tx("auth_error")));
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js?v=53").catch(() => { });
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

createGroupBtn.addEventListener("click", () => openGroupActionForm("create"));
addAnotherGroupBtn?.addEventListener("click", () => openGroupActionForm("join"));
groupActionSubmitBtn.addEventListener("click", async () => {
  try {
    const joining = groupActionMode === "join";
    await withLoader(tx(joining ? "joining_group" : "creating_group"), joining ? joinGroupWithCredentials : createGroupFromGmail);
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

async function startSocialLogin(provider, button, providerName) {
  if (loginProgress) return;
  if (!auth || !provider) {
    appAlert(tx("auth_error"));
    return;
  }
  try {
    loginProgress = true;
    window.clearTimeout(loginProgressTimer);
    loginProgressTimer = window.setTimeout(() => {
      if (!loginProgress) return;
      finalizeLoginFlow();
      appAlert(tx("auth_error"));
    }, 30000);
    button.disabled = true;
    button.style.opacity = "0.7";
    showLoader(getSigningInText(providerName));
    await auth.setPersistence(authRemember.checked
      ? firebase.auth.Auth.Persistence.LOCAL
      : firebase.auth.Auth.Persistence.SESSION);
    activeSocialProviderName = providerName;
    const result = await auth.signInWithPopup(provider);
    sessionStorage.setItem("vault_auth_provider", providerName);
    activeSocialProviderName = "";
    if (pendingSocialCredential && providerName !== pendingSocialCredential.providerName) {
      const pending = pendingSocialCredential;
      pendingSocialCredential = null;
      if (String(result.user?.email || "").toLowerCase() !== pending.email) {
        appAlert(tx("social_link_email_mismatch"));
        return;
      }
      try {
        const linkedResult = await result.user.linkWithCredential(pending.credential);
        sessionStorage.setItem("vault_auth_provider", pending.providerName);
        if (currentSession?.uid === linkedResult.user.uid) {
          currentSession.authProvider = pending.providerName;
          currentSession.displayName = getAuthDisplayName(linkedResult.user, pending.providerName);
          currentSession.photoURL = getAuthPhotoURL(linkedResult.user, pending.providerName);
          currentSession.email = linkedResult.user.email || currentSession.email;
          saveSession();
          await loadGroupSharedData();
          syncTransactionState();
          updateUI();
          applyAuthState();
        }
        appAlert(tx("social_account_linked"));
      } catch (linkError) {
        console.error("Social account linking failed", linkError);
        appAlert(tx("social_link_failed"));
      }
    }
  } catch (error) {
    activeSocialProviderName = "";
    finalizeLoginFlow();
    if (error?.code === "auth/popup-closed-by-user") return;
    if (error?.code === "auth/account-exists-with-different-credential") {
      const AuthProvider = providerName === "facebook"
        ? firebase.auth.FacebookAuthProvider
        : firebase.auth.GoogleAuthProvider;
      const credential = AuthProvider.credentialFromError(error);
      const email = String(error?.customData?.email || "").trim().toLowerCase();
      if (credential && email) pendingSocialCredential = { credential, email, providerName };
      appAlert(tx("auth_account_exists"));
      return;
    }
    if (providerName === "facebook" && error?.code === "auth/operation-not-allowed") {
      appAlert(tx("facebook_login_not_enabled"));
      return;
    }
    appAlert(tx(providerName === "facebook" ? "facebook_login_failed" : "google_login_failed"));
  }
}

authModeToggle.addEventListener("click", () => setAuthFormMode(authFormMode === "signin" ? "signup" : "signin"));
emailAuthForm.addEventListener("submit", submitEmailAuth);
authForgotPassword.addEventListener("click", sendAuthPasswordReset);
googleLoginBtn.addEventListener("click", () => startSocialLogin(googleProvider, googleLoginBtn, "google"));
facebookLoginBtn.addEventListener("click", () => startSocialLogin(facebookProvider, facebookLoginBtn, "facebook"));

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

          // Restore the owner's admin membership only if a legacy group is missing it.
          const myMembershipSnap = await myMembershipRef.get();
          if (!myMembershipSnap.exists) {
            await myMembershipRef.set({
              groupId,
              memberId: myMemberId,
              type: "gmail",
              label: firebaseUser.email || "Admin",
              role: "admin",
              canEdit: true,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          } else if (myMembershipSnap.data()?.role !== "admin") {
            await myMembershipRef.update({ role: "admin", canEdit: true });
          }

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

          await db.collection("groupFinance").doc(groupId).delete();
          await db.collection("groups").doc(groupId).delete();
          await myMembershipRef.delete();
        }

        // Remove any remaining memberships/credentials linked to this Gmail (joined groups etc.).
        const myMembershipsSnap = await db.collection("groupMembers").where("memberId", "==", myMemberId).get();
        for (const doc of myMembershipsSnap.docs) {
          await doc.ref.delete();
        }

        const userFinanceRef = db.collection("userFinance").doc(firebaseUser.uid);
        await Promise.all(["google", "facebook"].map((provider) =>
          userFinanceRef.collection("accounts").doc(provider).delete()
        ));
        await userFinanceRef.delete();
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
}).finally(() => {
  hideBootOverlay();
});

window.addIncome = addIncome;
window.addExpense = addExpense;
window.renderSavingsRateChart = renderSavingsRateChart;
