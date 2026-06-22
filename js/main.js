const App = {
  init() {
    this.initLucide();
    this.updateYear();
    this.initTheme();
    this.initMobileMenu();
    this.initScrollReveal();
    this.initNavbar();
    this.initTypewriter();
  },

  initLucide() {
    if (window.lucide) {
      lucide.createIcons();
    }
  },

  updateYear() {
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  },

  initTheme() {
    const themeToggleBtns = [
      document.getElementById("theme-toggle"),
      document.getElementById("theme-toggle-mobile"),
    ];
    const htmlElement = document.documentElement;

    const applyTheme = (isDark) => {
      if (isDark) {
        htmlElement.classList.add("dark");
        localStorage.theme = "dark";
      } else {
        htmlElement.classList.remove("dark");
        localStorage.theme = "light";
      }
    };

    if (
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      applyTheme(true);
    } else {
      applyTheme(false);
    }

    themeToggleBtns.forEach((btn) => {
      if (btn) {
        btn.addEventListener("click", () => {
          applyTheme(!htmlElement.classList.contains("dark"));
        });
      }
    });
  },

  initMobileMenu() {
    const mobileMenuBtn = document.getElementById("mobile-menu-btn");
    const mobileMenu = document.getElementById("mobile-menu");
    if (!mobileMenuBtn || !mobileMenu) return;

    const mobileLinks = mobileMenu.querySelectorAll("a");

    mobileMenuBtn.addEventListener("click", () => {
      mobileMenu.classList.toggle("hidden");
      mobileMenu.classList.toggle("flex");
    });

    mobileLinks.forEach((link) => {
      link.addEventListener("click", () => {
        mobileMenu.classList.add("hidden");
        mobileMenu.classList.remove("flex");
      });
    });
  },

  initScrollReveal() {
    const reveal = () => {
      const reveals = document.querySelectorAll(".reveal");
      for (let i = 0; i < reveals.length; i++) {
        const windowHeight = window.innerHeight;
        const elementTop = reveals[i].getBoundingClientRect().top;
        const elementVisible = 100;
        if (elementTop < windowHeight - elementVisible) {
          reveals[i].classList.add("active");
        }
      }
    };
    window.addEventListener("scroll", reveal);
    reveal();

    window.triggerReveal = reveal;
  },

  initNavbar() {
    const navbar = document.getElementById("navbar");
    if (!navbar) return;
    window.addEventListener("scroll", () => {
      if (window.scrollY > 10) {
        navbar.classList.add(
          "shadow-sm",
          "py-3",
          "border-slate-200",
          "dark:border-slate-800",
        );
        navbar.classList.remove("py-4", "border-transparent");
      } else {
        navbar.classList.remove(
          "shadow-sm",
          "py-3",
          "border-slate-200",
          "dark:border-slate-800",
        );
        navbar.classList.add("py-4", "border-transparent");
      }
    });
  },

  initTypewriter() {
    const phrases = [
      "Software Engineer.",
      "Backend Developer.",
      "SE Student.",
    ];
    let loopNum = 0;
    let isDeleting = false;
    let text = "";
    let typingSpeed = 100;

    const type = () => {
      const i = loopNum % phrases.length;
      const fullText = phrases[i];

      if (isDeleting) {
        text = fullText.substring(0, text.length - 1);
        typingSpeed = 50;
      } else {
        text = fullText.substring(0, text.length + 1);
        typingSpeed = 120;
      }

      const typewriterElement = document.getElementById("typewriter");
      if (typewriterElement) {
        typewriterElement.textContent = text;
      }

      let delta = typingSpeed;

      if (!isDeleting && text === fullText) {
        delta = 2000;
        isDeleting = true;
      } else if (isDeleting && text === "") {
        isDeleting = false;
        loopNum++;
        delta = 500;
      }

      setTimeout(type, delta);
    };
    setTimeout(type, 1000);
  },
};
