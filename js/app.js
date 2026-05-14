let income = 0;
        let expense = 0;
        let canEdit = false;
        let expenseChart = null;
        const breakdown = JSON.parse(localStorage.getItem("breakdown")) || {};
        const transactions = JSON.parse(localStorage.getItem("transactions")) || [];

        const root = document.documentElement;
        const themeToggle = document.getElementById("themeToggle");
        const authInfo = document.getElementById("authInfo");
        const loginOverlay = document.getElementById("loginOverlay");
        const googleLoginBtn = document.getElementById("googleLoginBtn");
        const loginError = document.getElementById("loginError");
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

        function formatMoney(value) {
            return `${value.toLocaleString("en-BD")} BDT`;
        }

        function save() {
            localStorage.setItem("income", income);
            localStorage.setItem("expense", expense);
            localStorage.setItem("breakdown", JSON.stringify(breakdown));
            localStorage.setItem("transactions", JSON.stringify(transactions));
        }

        function load() {
            income = Number(localStorage.getItem("income")) || 0;
            expense = Number(localStorage.getItem("expense")) || 0;
        }

        function applyTheme(theme) {
            root.setAttribute("data-theme", theme);
            localStorage.setItem("theme", theme);
            themeToggle.innerHTML = theme === "dark" ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
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

        function applyAuthState(user) {
            if (!user) {
                authInfo.innerText = "Private mode is enabled. Login first.";
                views.forEach((view) => view.classList.remove("active"));
                document.querySelector(".bottom-nav").classList.add("hidden");
                loginOverlay.classList.remove("hidden");
                setEditAccess(false);
                return;
            }
            authInfo.innerText = `Logged in as ${user.email}`;
            showView("homeView");
            document.querySelector(".bottom-nav").classList.remove("hidden");
            loginOverlay.classList.add("hidden");
            setEditAccess(true);
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

            if (expenseChart) {
                expenseChart.destroy();
            }

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
                    animation: {
                        duration: 900,
                        easing: "easeOutQuart"
                    },
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                        padding: { top: 8, right: 8, left: 4, bottom: 0 }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: "#1f2c44",
                            titleColor: "#ffffff",
                            bodyColor: "#dce8ff",
                            cornerRadius: 10,
                            displayColors: false,
                            callbacks: {
                                label: (ctx) => ` ${formatMoney(ctx.parsed.y)}`
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                color: "#6d7f99",
                                font: { size: 11, weight: "600" }
                            },
                            grid: { display: false },
                            border: { display: false }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: "#6d7f99",
                                callback: (value) => `${Number(value).toLocaleString("en-BD")}`
                            },
                            grid: {
                                color: "rgba(100,120,160,0.12)",
                                drawBorder: false
                            },
                            border: { display: false }
                        }
                    }
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
            save();
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
            let y = 16;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.text("VaultBudget Report", 14, y);
            y += 8;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString("en-BD")}`, 14, y);
            y += 8;

            doc.setFont("helvetica", "bold");
            doc.text("Summary", 14, y);
            y += 6;
            doc.setFont("helvetica", "normal");
            doc.text(`Total Income: ${formatMoney(income)}`, 14, y);
            y += 6;
            doc.text(`Total Expense: ${formatMoney(expense)}`, 14, y);
            y += 6;
            doc.text(`Balance: ${formatMoney(income - expense)}`, 14, y);
            y += 10;

            doc.setFont("helvetica", "bold");
            doc.text("Category Breakdown", 14, y);
            y += 6;
            doc.setFont("helvetica", "normal");

            const categories = Object.keys(breakdown);
            if (!categories.length) {
                doc.text("No category data", 14, y);
                y += 6;
            } else {
                for (const cat of categories) {
                    doc.text(`- ${cat}: ${formatMoney(breakdown[cat])}`, 14, y);
                    y += 6;
                    if (y > 275) {
                        doc.addPage();
                        y = 16;
                    }
                }
            }

            y += 4;
            doc.setFont("helvetica", "bold");
            doc.text("Transactions", 14, y);
            y += 6;
            doc.setFont("helvetica", "normal");

            if (!transactions.length) {
                doc.text("No transactions yet", 14, y);
            } else {
                for (const txn of [...transactions].reverse()) {
                    const line = `${txn.time} | ${txn.type.toUpperCase()} | ${txn.category} | ${formatMoney(txn.amount)}`;
                    const wrapped = doc.splitTextToSize(line, 180);
                    doc.text(wrapped, 14, y);
                    y += wrapped.length * 5;
                    if (y > 275) {
                        doc.addPage();
                        y = 16;
                    }
                }
            }

            doc.save(`vaultbudget-report-${new Date().toISOString().slice(0, 10)}.pdf`);
        }

        themeToggle.addEventListener("click", () => {
            const current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
            applyTheme(current === "dark" ? "light" : "dark");
        });

        navButtons.forEach((btn) => {
            btn.addEventListener("click", () => showView(btn.dataset.view));
        });

        downloadPdfBtn.addEventListener("click", downloadReportPdf);

        googleLoginBtn.addEventListener("click", async () => {
            if (!auth || !googleProvider) {
                loginError.innerText = "Google login is not configured yet.";
                return;
            }
            try {
                loginError.innerText = "";
                await auth.signInWithPopup(googleProvider);
            } catch (error) {
                if (error?.code === "auth/configuration-not-found") {
                    loginError.innerText = "Google Sign-In Firebase এ Enable করা নেই বা domain authorize করা হয়নি.";
                } else if (error?.code === "auth/unauthorized-domain") {
                    loginError.innerText = "এই domain Firebase Authorized Domains এ add করা নেই.";
                } else if (error?.code === "auth/popup-blocked") {
                    loginError.innerText = "Popup block হয়েছে। browser popup allow করে আবার চেষ্টা করুন।";
                } else {
                    loginError.innerText = error?.message || "Google login failed.";
                }
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

            applyTheme("light");
            updateUI();
            if (auth && auth.currentUser) {
                await auth.signOut();
            } else {
                applyAuthState(null);
            }
            loginError.innerText = "";
        });

        function initGoogleAuth() {
            const notConfigured = Object.values(firebaseConfig).some((v) => !v || v.startsWith("REPLACE_WITH"));
            if (notConfigured) {
                loginError.innerText = "Firebase config দিন, তারপর Google login কাজ করবে।";
                applyAuthState(null);
                return;
            }

            firebase.initializeApp(firebaseConfig);
            auth = firebase.auth();
            googleProvider = new firebase.auth.GoogleAuthProvider();

            auth.onAuthStateChanged((user) => {
                applyAuthState(user);
            });
        }

        loadTheme();
        load();
        updateUI();
        initGoogleAuth();

