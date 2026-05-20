let income = 0;
let expense = 0;
let canEdit = false;
let expenseChart = null;
let incomePieChart = null;
let walletRateChart = null;

const breakdown = JSON.parse(localStorage.getItem("breakdown")) || {};
const transactions = JSON.parse(localStorage.getItem("transactions")) || [];
const deletedTransactions = JSON.parse(localStorage.getItem("deletedTransactions")) || [];
const SESSION_KEY = "vault_session";

const root = document.documentElement;
const authInfo = document.getElementById("authInfo");
const loginOverlay = document.getElementById("loginOverlay");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const appBootOverlay = document.getElementById("appBootOverlay");
const appLoader = document.getElementById("appLoader");
const loaderText = document.getElementById("loaderText");
const appModal = document.getElementById("appModal");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalOkBtn = document.getElementById("modalOkBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");

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
const incomePieChartCanvas = document.getElementById("incomePieChart");
const walletRateChartCanvas = document.getElementById("walletRateChart");
const topCategory = document.getElementById("topCategory");
const topExpense = document.getElementById("topExpense");
const totalCategory = document.getElementById("totalCategory");

const accountTypeText = document.getElementById("accountTypeText");
const accountRoleText = document.getElementById("accountRoleText");
const adminCredentialCard = document.getElementById("adminCredentialCard");
const adminCredentialUsername = document.getElementById("adminCredentialUsername");
const adminCredentialPassword = document.getElementById("adminCredentialPassword");
const copyAdminCredentialBtn = document.getElementById("copyAdminCredentialBtn");
const groupMembersCard = document.getElementById("groupMembersCard");
const groupMemberCount = document.getElementById("groupMemberCount");
const groupMembersList = document.getElementById("groupMembersList");
const inviteCard = document.getElementById("inviteCard");
const inviteEmailInput = document.getElementById("inviteEmailInput");
const sendInviteBtn = document.getElementById("sendInviteBtn");
const inviteStatusText = document.getElementById("inviteStatusText");
const requestAccessCard = document.getElementById("requestAccessCard");
const requestAccessEmailInput = document.getElementById("requestAccessEmailInput");
const requestAccessBtn = document.getElementById("requestAccessBtn");
const pendingRequestsCard = document.getElementById("pendingRequestsCard");
const pendingRequestsList = document.getElementById("pendingRequestsList");
const deletedTransactionsCard = document.getElementById("deletedTransactionsCard");
const deletedTransactionsList = document.getElementById("deletedTransactionsList");
const groupActionsCard = document.getElementById("groupActionsCard");
const createGroupBtn = document.getElementById("createGroupBtn");
const addAnotherGroupBtn = document.getElementById("addAnotherGroupBtn");
const groupActionFormCard = document.getElementById("groupActionFormCard");
const groupActionTitle = document.getElementById("groupActionTitle");
const groupActionUsername = document.getElementById("groupActionUsername");
const groupActionPassword = document.getElementById("groupActionPassword");
const groupActionSubmitBtn = document.getElementById("groupActionSubmitBtn");

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
let groupActionMode = null;
