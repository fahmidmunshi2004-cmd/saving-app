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

function previewTheme(theme, persist = true) {
    const nextTheme = theme === "dark" ? "dark" : "light";

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

function commitTheme(theme) {
    const nextTheme = theme === "dark" ? "dark" : "light";

    themeRoot.dataset.theme = nextTheme;
    document.body.dataset.theme = nextTheme;
    document.body.classList.toggle("theme-dark", nextTheme === "dark");
    document.body.classList.toggle("theme-light", nextTheme === "light");

    updateThemeMeta(nextTheme);
    syncThemeButton(nextTheme);
}

function getRevealPoint(event) {
    if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
        return { x: event.clientX, y: event.clientY };
    }

    if (modeBtn) {
        const rect = modeBtn.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }

    return { x: window.innerWidth / 2, y: 48 };
}

function createRevealOverlay(theme, x, y) {
    const overlay = document.createElement("div");
    overlay.className = `theme-reveal theme-reveal--${theme}`;
    overlay.style.setProperty("--reveal-x", `${x}px`);
    overlay.style.setProperty("--reveal-y", `${y}px`);
    document.body.appendChild(overlay);
    return overlay;
}

function animateReveal(theme, event) {
    const { x, y } = getRevealPoint(event);
    const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
    );

    const overlay = createRevealOverlay(theme, x, y);
    if (typeof overlay.animate !== "function") {
        overlay.remove();
        return Promise.resolve();
    }

    const animation = overlay.animate(
        {
            clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${endRadius}px at ${x}px ${y}px)`
            ]
        },
        {
            duration: 620,
            easing: "cubic-bezier(0.2, 0.85, 0.2, 1)",
            fill: "forwards"
        }
    );

    return animation.finished.finally(() => {
        overlay.remove();
    });
}

function toggleTheme(event) {
    const currentTheme = themeRoot.dataset.theme === "dark" ? "dark" : readPreferredTheme();
    const nextTheme = currentTheme === "dark" ? "light" : "dark";

    if (reducedMotion) {
        previewTheme(nextTheme);
        commitTheme(nextTheme);
        return;
    }

    previewTheme(nextTheme);
    animateReveal(nextTheme, event)
        .catch(() => { })
        .finally(() => {
            commitTheme(nextTheme);
        });
}

function initTheme() {
    previewTheme(readPreferredTheme(), false);
    commitTheme(readPreferredTheme());
}

if (modeBtn) {
    modeBtn.addEventListener("click", toggleTheme);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTheme, { once: true });
} else {
    initTheme();
}
