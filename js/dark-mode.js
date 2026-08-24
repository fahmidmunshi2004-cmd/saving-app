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

function getRevealBackground(theme) {
    if (theme === "dark") {
        return `
            radial-gradient(620px 260px at 0% 0%, rgba(57, 83, 143, 0.24) 0%, transparent 62%),
            radial-gradient(620px 260px at 100% 0%, rgba(120, 51, 112, 0.18) 0%, transparent 60%),
            linear-gradient(160deg, #08111f, #111b2f)
        `;
    }

    return `
        radial-gradient(600px 220px at 0% 0%, #d8e7ff 0%, transparent 60%),
        radial-gradient(600px 260px at 100% 0%, #d9f2ff 0%, transparent 62%),
        linear-gradient(160deg, #ffffff, #f6f6f6)
    `;
}

function createRevealOverlay(theme, x, y) {
    const overlay = document.createElement("div");
    overlay.className = "theme-reveal-overlay";
    overlay.style.setProperty("--reveal-x", `${x}px`);
    overlay.style.setProperty("--reveal-y", `${y}px`);
    overlay.style.background = getRevealBackground(theme);
    document.body.appendChild(overlay);
    return overlay;
}

function toggleTheme(event) {
    const currentTheme = themeRoot.dataset.theme === "dark" ? "dark" : readPreferredTheme();
    const nextTheme = currentTheme === "dark" ? "light" : "dark";

    if (reducedMotion || typeof Element.prototype.animate !== "function") {
        applyTheme(nextTheme);
        return;
    }

    const { x, y } = getRevealPoint(event);
    const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
    );

    const overlay = createRevealOverlay(nextTheme, x, y);
    applyTheme(nextTheme);

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

    animation.finished.catch(() => { }).finally(() => {
        overlay.remove();
    });

    if (themeRoot.animate) {
        themeRoot.animate(
            {
                filter: [
                    "brightness(1.02) saturate(1.02)",
                    "brightness(1) saturate(1)"
                ]
            },
            {
                duration: 220,
                easing: "ease-out"
            }
        );
    }
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
