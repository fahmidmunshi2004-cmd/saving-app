const THEME_STORAGE_KEY = "theme";
const LIGHT_THEME_COLOR = "#ffffff";
const DARK_THEME_COLOR = "#0b1020";
const modeBtn = document.getElementById("modeBtn");
const themeLabel = modeBtn?.querySelector(".theme-switcher-label");
const themeIcon = modeBtn?.querySelector(".theme-switcher-icon");
const themeMeta = document.querySelector('meta[name="theme-color"]');
const themeRoot = document.documentElement;
const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

function readPreferredTheme() {
    try {
        const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (storedTheme === "dark" || storedTheme === "light") {
            return storedTheme;
        }
    } catch (_) {
        // ignore storage errors
    }

    return prefersDark ? "dark" : "light";
}

function syncThemeButton(isDark) {
    if (!modeBtn) return;

    modeBtn.setAttribute("aria-pressed", String(isDark));
    modeBtn.title = isDark ? "Switch to light mode" : "Switch to dark mode";

    if (themeLabel) {
        themeLabel.textContent = isDark ? "Light mode" : "Dark mode";
    }

    if (themeIcon) {
        themeIcon.classList.toggle("fa-moon", !isDark);
        themeIcon.classList.toggle("fa-sun", isDark);
    }
}

function setTheme(theme, persist = true) {
    const isDark = theme === "dark";

    themeRoot.dataset.theme = isDark ? "dark" : "light";
    document.body.classList.toggle("dark", isDark);
    document.body.classList.toggle("theme-dark", isDark);
    document.body.classList.toggle("theme-light", !isDark);
    document.body.dataset.theme = isDark ? "dark" : "light";

    if (persist) {
        try {
            localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
        } catch (_) {
            // ignore storage errors
        }
    }

    if (themeMeta) {
        themeMeta.setAttribute("content", isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
    }

    syncThemeButton(isDark);
}

function toggleTheme(event) {
    const isDark = themeRoot.dataset.theme === "dark" || document.body.classList.contains("dark");
    const nextTheme = isDark ? "light" : "dark";

    if (!document.startViewTransition) {
        setTheme(nextTheme);
        return;
    }

    const x = Number.isFinite(event?.clientX) ? event.clientX : window.innerWidth / 2;
    const y = Number.isFinite(event?.clientY) ? event.clientY : window.innerHeight / 2;

    const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(() => {
        setTheme(nextTheme);
    });

    transition.ready.then(() => {
        document.documentElement.animate(
            {
                clipPath: [
                    `circle(0px at ${x}px ${y}px)`,
                    `circle(${endRadius}px at ${x}px ${y}px)`
                ]
            },
            {
                duration: 500,
                easing: "ease-in",
                pseudoElement: "::view-transition-new(root)"
            }
        );
    });
}

function initTheme() {
    setTheme(readPreferredTheme(), false);
}

if (modeBtn) {
    modeBtn.addEventListener("click", toggleTheme);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTheme, { once: true });
} else {
    initTheme();
}
