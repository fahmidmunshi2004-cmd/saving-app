const modeBtn = document.getElementById("modeBtn");

// 1. Load previous preference
if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
}

// 2. Main Function
modeBtn.addEventListener("click", (e) => {
    if (!document.startViewTransition) {
        toggleTheme();
        return;
    }

    const x = e.clientX;
    const y = e.clientY;

    const endRadius = Math.hypot(
        Math.max(x, innerWidth - x),
        Math.max(y, innerHeight - y)
    );

    const transition = document.startViewTransition(() => {
        toggleTheme();
    });

    transition.ready.then(() => {
        const clipPath = [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`
        ];

        document.documentElement.animate(
            {
                clipPath: clipPath
            },
            {
                duration: 500,
                easing: "ease-in",
                pseudoElement: "::view-transition-new(root)"
            }
        );
    });
});

function toggleTheme() {
    if (document.body.classList.contains("dark")) {
        document.body.classList.remove("dark");
        localStorage.setItem("theme", "light");
    } else {
        document.body.classList.add("dark"); 
        localStorage.setItem("theme", "dark");
    }
}
