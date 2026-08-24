const THEME_STORAGE_KEY = "theme";
const LIGHT_THEME_COLOR = "#ffffff";
const DARK_THEME_COLOR = "#0b1020";
const modeBtn = document.getElementById("modeBtn");
const themeLabel = modeBtn?.querySelector(".theme-switcher-label");
const themeIcon = modeBtn?.querySelector(".theme-switcher-icon");
const themeMeta = document.querySelector('meta[name="theme-color"]');
const themeRoot = document.documentElement;
const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

function updateThemeMeta(theme) {
    if (!themeMeta) return;
    themeMeta.setAttribute("content", theme === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
}

function syncThemeButton(theme) {
    if (!modeBtn) return;

    const isDark = theme === "dark";
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

function applyTheme(theme, persist = true) {
    const nextTheme = theme === "dark" ? "dark" : "light";

    themeRoot.dataset.theme = nextTheme;
    document.body.dataset.theme = nextTheme;
    document.body.classList.toggle("theme-dark", nextTheme === "dark");
    document.body.classList.toggle("theme-light", nextTheme === "light");

    if (persist) {
        try {
            localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        } catch (_) {
            // ignore storage errors
        }
    }

    updateThemeMeta(nextTheme);
    syncThemeButton(nextTheme);
}

function toggleTheme(event) {
    const currentTheme = themeRoot.dataset.theme === "dark" ? "dark" : readPreferredTheme();
    const nextTheme = currentTheme === "dark" ? "light" : "dark";

    if (!document.startViewTransition || reducedMotion) {
        applyTheme(nextTheme);
        return;
    }

    const x = Number.isFinite(event?.clientX) ? event.clientX : window.innerWidth / 2;
    const y = Number.isFinite(event?.clientY) ? event.clientY : 48;
    const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(() => {
        applyTheme(nextTheme);
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
                duration: 560,
                easing: "ease-in-out",
                pseudoElement: "::view-transition-new(root)"
            }
        );
    });
}

function initTheme() {
    applyTheme(readPreferredTheme(), false);
}

if (modeBtn) {
    modeBtn.addEventListener("click", toggleTheme);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTheme, { once: true });
} else {
    initTheme();
}
