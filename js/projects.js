class ProjectManager {
  constructor(containerId) {
    this.containerId = containerId;
    this.projectsPerLoad = 6;
    this.currentVisible = this.projectsPerLoad;
    this.allProjects = [];
    this.filteredProjects = [];
    this.currentFilter = "All";
    this.searchQuery = "";
    this.currentLayout = "slider";
    this.categories = ["All", "React", "Next.js", "NestJS", "Python"];
    this.currentIndex = 0;
    this.isDragging = false;
    this.startX = 0;

    window.projectManager = this;
  }

  async loadProjects() {
    try {
      const response = await fetch("./data/projects.json");
      if (!response.ok) throw new Error("Network response was not ok");

      this.allProjects = await response.json();
      this.filteredProjects = [...this.allProjects];

      this.initGlobalEvents();
      this.renderFilters();
      this.updateUI();
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu project:", error);
      const grid = document.getElementById("grid-container");
      if (grid) {
        grid.innerHTML =
          '<p class="col-span-full text-red-500 text-center">Không thể tải dữ liệu. Vui lòng kiểm tra file JSON.</p>';
      }
    }
  }

  renderFilters() {
    const filterContainer = document.getElementById("filter-container");
    if (!filterContainer) return;

    filterContainer.innerHTML = this.categories
      .map((category) => {
        const isActive = category === this.currentFilter;
        const activeClasses = isActive
          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md border-transparent"
          : "bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50 hover:border-slate-400";
        return `<button data-category="${category}" class="filter-btn px-5 py-2 rounded-lg border text-sm font-medium transition-all duration-300 ease-out ${activeClasses}">${category}</button>`;
      })
      .join("");
  }

  initGlobalEvents() {
    // Sự kiện Filter
    const filterContainer = document.getElementById("filter-container");
    if (filterContainer) {
      filterContainer.addEventListener("click", (e) => {
        const btn = e.target.closest(".filter-btn");
        if (!btn) return;
        this.currentFilter = btn.dataset.category;
        this.applyFiltersAndSearch();
        this.renderFilters();
      });
    }

    // Sự kiện Search
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.applyFiltersAndSearch();
      });
    }

    // Chuyển layout (Grid/Slider)
    document.addEventListener("click", (e) => {
      const layoutBtn = e.target.closest(".layout-btn");
      if (layoutBtn) {
        const newLayout = layoutBtn.dataset.layout;
        if (this.currentLayout !== newLayout) {
          this.currentLayout = newLayout;
          if (newLayout === "grid") this.currentVisible = this.projectsPerLoad;
          this.updateUI();
        }
      }
    });

    // Load more cho Grid
    const loadMoreBtn = document.getElementById("load-more-btn");
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", () => {
        this.currentVisible += this.projectsPerLoad;
        this.updateUI();
      });
    }

    // Sự kiện Bàn phím
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closeModal();
      const modalRoot = document.getElementById("project-modal-root");
      const modalOpen = modalRoot && !modalRoot.classList.contains("hidden");
      if (this.currentLayout === "slider" && !modalOpen) {
        if (e.key === "ArrowRight") this.next();
        if (e.key === "ArrowLeft") this.prev();
      }
    });

    // Các nút Next/Prev của Slider
    const nextBtn = document.getElementById("slider-next");
    const prevBtn = document.getElementById("slider-prev");
    if (nextBtn) nextBtn.addEventListener("click", () => this.next());
    if (prevBtn) prevBtn.addEventListener("click", () => this.prev());

    // Swipe Slider trên Mobile
    const sliderCont = document.getElementById("slider-container");
    if (sliderCont) {
      sliderCont.addEventListener(
        "touchstart",
        (e) => (this.startX = e.touches[0].clientX),
        { passive: true },
      );
      sliderCont.addEventListener(
        "touchend",
        (e) => {
          const diff = this.startX - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 40) diff > 0 ? this.next() : this.prev();
        },
        { passive: true },
      );
    }

    // Cập nhật lại transform khi resize
    window.addEventListener("resize", () => {
      if (this.currentLayout === "slider") this.updateSliderTransforms();
    });
  }

  applyFiltersAndSearch() {
    this.filteredProjects = this.allProjects.filter((project) => {
      const matchFilter =
        this.currentFilter === "All" ||
        (project.tags && project.tags.includes(this.currentFilter));
      const matchSearch =
        project.title.toLowerCase().includes(this.searchQuery) ||
        (project.tags &&
          project.tags.some((tag) =>
            tag.toLowerCase().includes(this.searchQuery),
          ));
      return matchFilter && matchSearch;
    });
    this.currentIndex = 0;
    this.currentVisible = this.projectsPerLoad;
    this.updateUI();
  }

  updateUI() {
    // Đếm số lượng
    const countEl = document.getElementById("project-count");
    if (countEl) countEl.textContent = this.filteredProjects.length;

    // Cập nhật Style của layout buttons
    document.querySelectorAll(".layout-btn").forEach((btn) => {
      const isAct = btn.dataset.layout === this.currentLayout;
      btn.className = `layout-btn p-2 rounded-lg flex items-center gap-2 text-xs font-semibold transition-all ${isAct ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`;
    });

    const gridView = document.getElementById("grid-view");
    const sliderView = document.getElementById("slider-view");
    const noResults = document.getElementById("no-results");

    if (this.filteredProjects.length === 0) {
      gridView.classList.add("hidden");
      sliderView.classList.add("hidden");
      noResults.classList.remove("hidden");
      return;
    }

    noResults.classList.add("hidden");

    if (this.currentLayout === "slider") {
      gridView.classList.add("hidden");
      sliderView.classList.remove("hidden");
      this.renderSlider();
    } else {
      sliderView.classList.add("hidden");
      gridView.classList.remove("hidden");
      this.renderGrid();
    }

    // Kích hoạt lại icon sau khi render HTML mới
    if (window.lucide) window.lucide.createIcons();
  }

  renderGrid() {
    const container = document.getElementById("grid-container");
    const loadMoreCont = document.getElementById("load-more-container");
    const visibleProjects = this.filteredProjects.slice(0, this.currentVisible);
    const hasMore = this.currentVisible < this.filteredProjects.length;

    container.innerHTML = visibleProjects
      .map(
        (project, index) => `
      <div class="flex flex-col bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer grid-card" data-index="${index}" style="animation-delay: ${index * 50}ms">
        <div class="h-48 relative overflow-hidden bg-slate-100 dark:bg-slate-900 shrink-0">
          <img src="${project.image}" alt="${project.title}" onerror="this.src='https://placehold.co/600x400/1e293b/ffffff?text=${encodeURIComponent(project.title)}'; this.onerror=null;" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ${project.featured ? `<div class="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">Hot</div>` : ""}
        </div>
        <div class="p-5 flex flex-col flex-grow">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary-500 transition-colors">${project.title}</h3>
          <p class="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-2">${project.description}</p>
          <div class="flex flex-wrap gap-1.5 mb-4 flex-grow">
            ${(project.tags || [])
              .slice(0, 3)
              .map(
                (tag) =>
                  `<span class="bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-[10px] font-medium px-2 py-1 rounded">${tag}</span>`,
              )
              .join("")}
          </div>
          <div class="flex items-center gap-3 mt-auto pt-4 border-t border-slate-100 dark:border-slate-700/50" onclick="event.stopPropagation()">
            ${project.demo ? `<a href="${project.demo}" target="_blank" class="flex-1 flex justify-center items-center gap-2 px-3 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-primary-600 dark:hover:bg-primary-500 rounded-lg text-sm font-semibold transition-all shadow-sm"><i data-lucide="external-link" class="w-4 h-4"></i> Live</a>` : ""}
            ${project.github ? `<a href="${project.github}" target="_blank" class="flex-1 flex justify-center items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-all shadow-sm"><i class="fa-brands fa-github"></i> Code</a>` : ""}
          </div>
        </div>
      </div>
    `,
      )
      .join("");

    if (hasMore) loadMoreCont.classList.remove("hidden");
    else loadMoreCont.classList.add("hidden");

    container.querySelectorAll(".grid-card").forEach((card) => {
      card.addEventListener("click", () => {
        const project = this.filteredProjects[card.getAttribute("data-index")];
        if (project) this.openModal(project);
      });
    });
  }

  renderSlider() {
    const container = document.getElementById("slider-container");
    container.innerHTML = this.filteredProjects
      .map(
        (project, index) => `
      <div class="project-card flex flex-col md:flex-row bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group overflow-hidden" data-index="${index}">
        <div class="w-full md:w-[60%] h-52 md:h-full relative overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-900">
          <img src="${project.image}" alt="${project.title}" onerror="this.src='[https://placehold.co/600x400/1e293b/ffffff?text=$](https://placehold.co/600x400/1e293b/ffffff?text=$){encodeURIComponent(project.title)}'; this.onerror=null;" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div class="absolute top-5 left-5 flex flex-wrap gap-2 z-20">
            ${(project.tags || [])
              .slice(0, 4)
              .map(
                (tag) =>
                  `<span class="px-3 py-1 rounded-full backdrop-blur-md bg-black/60 border border-white/20 text-white text-[11px] font-semibold tracking-wide">${tag}</span>`,
              )
              .join("")}
          </div>
        </div>
        <div class="w-full md:w-[40%] p-6 md:p-10 flex flex-col justify-center relative z-20">
          <div class="card-content flex flex-col h-full justify-center">
            <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-3 leading-tight group-hover:text-primary-600 transition-colors">${project.title}</h3>
            <p class="text-slate-600 dark:text-slate-400 text-sm mb-8 line-clamp-3 md:line-clamp-none leading-relaxed">${project.description}</p>
            <div class="flex items-center gap-3 mt-auto" onclick="event.stopPropagation()">
              ${project.demo ? `<a href="${project.demo}" target="_blank" class="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-primary-600 dark:hover:bg-primary-500 hover:text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-2">Preview <i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ""}
              ${project.github ? `<a href="${project.github}" target="_blank" class="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-all flex items-center gap-2"><i class="fa-brands fa-github"></i> Code</a>` : ""}
            </div>
          </div>
        </div>
        <div class="inactive-overlay pointer-events-none rounded-[inherit]"></div>
      </div>
    `,
      )
      .join("");

    container.querySelectorAll(".project-card").forEach((card, idx) => {
      card.addEventListener("click", () => {
        if (this.currentIndex !== idx) {
          this.currentIndex = idx;
          this.updateSliderTransforms();
        } else {
          this.openModal(this.filteredProjects[idx]);
        }
      });
    });

    this.updateSliderTransforms();
  }

  updateSliderTransforms() {
    const cards = document.querySelectorAll(".project-card");
    const pagination = document.getElementById("slider-pagination");
    if (!cards.length) return;

    const isMobile = window.innerWidth < 768;

    const xOffset = isMobile ? 85 : 65;
    const scaleFactor = isMobile ? 0.85 : 0.8;
    const rotateAngle = isMobile ? 25 : 35;

    cards.forEach((card, index) => {
      const diff = index - this.currentIndex;
      card.classList.remove("active");

      card.style.transition = "all 0.6s cubic-bezier(0.25, 1, 0.5, 1)";
      card.style.transformStyle = "preserve-3d";

      if (diff === 0) {
        card.classList.add("active");
        card.style.transform = `translateX(-50%) perspective(1200px) translateZ(100px) rotateY(0deg) scale(1)`;
        card.style.zIndex = 30;
        card.style.opacity = 1;
        card.style.filter = "blur(0px) brightness(1)";
        card.style.boxShadow = "0 25px 50px -12px rgba(0,0,0,0.3)";
      } else if (diff === -1) {
        card.style.transform = `translateX(calc(-50% - ${xOffset}%)) perspective(1200px) translateZ(-50px) rotateY(${rotateAngle}deg) scale(${scaleFactor})`;
        card.style.zIndex = 20;
        card.style.opacity = 0.6;
        card.style.filter = "blur(2px) brightness(0.6)";
        card.style.boxShadow = "-15px 10px 30px -10px rgba(0,0,0,0.2)";
      } else if (diff === 1) {
        card.style.transform = `translateX(calc(-50% + ${xOffset}%)) perspective(1200px) translateZ(-50px) rotateY(${-rotateAngle}deg) scale(${scaleFactor})`;
        card.style.zIndex = 20;
        card.style.opacity = 0.6;
        card.style.filter = "blur(2px) brightness(0.6)";
        card.style.boxShadow = "15px 10px 30px -10px rgba(0,0,0,0.2)";
      } else {
        const direction = diff < 0 ? -1 : 1;
        const extraRotate = diff < 0 ? rotateAngle + 15 : -(rotateAngle + 15);
        card.style.transform = `translateX(calc(-50% + ${direction * (xOffset * 1.5)}%)) perspective(1200px) translateZ(-250px) rotateY(${extraRotate}deg) scale(0.5)`;
        card.style.zIndex = 10;
        card.style.opacity = 0;
        card.style.filter = "blur(6px) brightness(0.3)";
      }
    });

    if (pagination) {
      pagination.innerHTML = this.filteredProjects
        .map(
          (_, index) => `
        <button class="dot h-1.5 rounded-full transition-all duration-300 ${index === this.currentIndex ? "bg-primary-500 w-6" : "bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 w-2"}"></button>
      `,
        )
        .join("");

      pagination.querySelectorAll(".dot").forEach((dot, idx) => {
        dot.addEventListener("click", () => {
          this.currentIndex = idx;
          this.updateSliderTransforms();
        });
      });
    }
  }

  next() {
    if (this.currentIndex < this.filteredProjects.length - 1) {
      this.currentIndex++;
      this.updateSliderTransforms();
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateSliderTransforms();
    }
  }

  openModal(project) {
    const modalRoot = document.getElementById("project-modal-root");
    if (!modalRoot) return;

    // --- THÊM LOGIC CẬP NHẬT URL ---
    if (project.slug) {
      const newUrl =
        window.location.protocol +
        "//" +
        window.location.host +
        window.location.pathname +
        `?project=${project.slug}`;
      window.history.pushState({ path: newUrl }, "", newUrl);
    }
    // -------------------------------

    const images =
      project.images && project.images.length > 0
        ? project.images
        : [project.image];
    const featuresList =
      project.features && project.features.length > 0
        ? project.features
        : ["Chi tiết tính năng đang cập nhật..."];

    const timelineStr = project.timeline ? project.timeline : "2023";

    modalRoot.innerHTML = `
      <div class="modal-backdrop absolute inset-0 bg-slate-900/40 dark:bg-black/60 opening" onclick="window.projectManager.closeModal()"></div>
      
      <div class="modal-content relative w-full h-full sm:h-[90vh] max-w-7xl bg-white dark:bg-slate-900 sm:rounded-[2rem] shadow-2xl flex flex-col opening overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
        
        <header class="glass-header sticky top-0 z-50 px-5 py-4 border-b border-slate-200/50 dark:border-slate-800/80 flex items-start justify-between gap-4 shrink-0">
          <div class="flex flex-col pr-2">
            <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">${project.title}</h2>
            
            <div class="flex items-center flex-wrap gap-3 mt-2">
              <div class="flex flex-wrap gap-1.5">
                ${(project.tags || [])
                  .slice(0, 4)
                  .map(
                    (tag) =>
                      `<span class="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-medium tracking-wide">${tag}</span>`,
                  )
                  .join("")}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3 shrink-0">
            <div class="hidden sm:flex items-center gap-2 mr-2">
              ${project.demo ? `<a href="${project.demo}" target="_blank" class="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2"><i data-lucide="external-link" class="w-4 h-4"></i> Live</a>` : ""}
              ${project.github ? `<a href="${project.github}" target="_blank" class="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2"><i class="fa-brands fa-github"></i> Code</a>` : ""}
            </div>
            <div class="hidden sm:block w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
            
            <button onclick="window.projectManager.closeModal()" class="w-9 h-9 flex items-center justify-center shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" title="Close (Esc)">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>
        </header>

        <div class="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden bg-slate-50/30 dark:bg-slate-900/30">
          
          <div class="w-full lg:w-[58%] shrink-0 p-5 sm:p-8 flex flex-col lg:overflow-y-auto custom-scrollbar lg:border-r border-slate-200/50 dark:border-slate-800/80">
            <div class="relative w-full rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800/50 aspect-video shadow-sm border border-slate-200/80 dark:border-slate-700/50 group">
              <img id="modal-main-img" src="${images[0]}" alt="${project.title}" onerror="this.src='https://placehold.co/800x600/1e293b/ffffff?text=${encodeURIComponent(project.title)}'; this.onerror=null;" class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
            </div>
            ${
              images.length > 1
                ? `
            <div class="mt-4 flex gap-3 overflow-x-auto pb-2 custom-scrollbar px-1">
              ${images.map((img, i) => `<button class="thumbnail-btn relative w-28 h-16 shrink-0 rounded-lg overflow-hidden border-2 ${i === 0 ? "border-primary-500 ring-2 ring-primary-500/20" : "border-transparent"} hover:border-slate-300 transition-all opacity-80 hover:opacity-100" data-img="${img}"><img src="${img}" class="w-full h-full object-cover" /></button>`).join("")}
            </div>`
                : ""
            }
          </div>

          <div class="w-full lg:w-[42%] shrink-0 p-5 sm:p-8 flex flex-col bg-white dark:bg-slate-900 lg:overflow-y-auto custom-scrollbar">
            
            <div class="mb-8">
              <h3 class="text-sm font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                <i data-lucide="calendar-days" class="w-4 h-4 text-slate-400"></i> Timeline
              </h3>
              <p class="text-slate-600 dark:text-slate-400 text-sm md:text-[15px] font-medium bg-slate-50 dark:bg-slate-800/50 inline-block px-3 py-1.5 rounded-md border border-slate-200/80 dark:border-slate-700/50 shadow-sm">${timelineStr}</p>
            </div>

            <div class="mb-8">
              <h3 class="text-sm font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                <i data-lucide="align-left" class="w-4 h-4 text-slate-400"></i> Project Overview
              </h3>
              <p class="text-slate-600 dark:text-slate-400 text-sm md:text-[15px] leading-relaxed">${project.description}</p>
            </div>

            <div class="mb-8">
              <h3 class="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                <i data-lucide="cpu" class="w-4 h-4 text-slate-400"></i> Key Features
              </h3>
              <ul class="space-y-4">
                ${featuresList
                  .map(
                    (feature) => `
                <li class="flex items-start gap-3 group">
                  <div class="mt-1 flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-primary-50 group-hover:text-primary-500 transition-colors"><i data-lucide="check" class="w-3 h-3"></i></div>
                  <span class="text-[14px] text-slate-700 dark:text-slate-300 leading-relaxed">${feature}</span>
                </li>`,
                  )
                  .join("")}
              </ul>
            </div>

            <div class="mb-8">
              <h3 class="text-sm font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                <i data-lucide="layers" class="w-4 h-4 text-slate-400"></i> Technology Stack
              </h3>
              <div class="flex flex-wrap gap-2">
                ${(project.tags || []).map((tag) => `<span class="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-700 dark:text-slate-300 text-[13px] font-medium shadow-sm hover:border-slate-300 transition-colors">${tag}</span>`).join("")}
              </div>
            </div>

          </div>
        </div>

        <div class="sm:hidden sticky bottom-0 z-50 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex gap-3 shrink-0">
          ${project.demo ? `<a href="${project.demo}" target="_blank" class="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-bold shadow-md">Live Preview</a>` : ""}
          ${project.github ? `<a href="${project.github}" target="_blank" class="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold"><i class="fa-brands fa-github text-lg"></i> Code</a>` : ""}
        </div>
      </div>
    `;

    document.body.classList.add("modal-open");
    modalRoot.classList.remove("hidden");
    modalRoot.classList.add("flex");
    if (window.lucide) window.lucide.createIcons({ root: modalRoot });

    if (images.length > 1) {
      const thumbnails = modalRoot.querySelectorAll(".thumbnail-btn");
      const mainImg = modalRoot.querySelector("#modal-main-img");
      thumbnails.forEach((btn) => {
        btn.addEventListener("click", () => {
          mainImg.style.opacity = "0.3";
          mainImg.style.transform = "scale(0.98)";
          setTimeout(() => {
            mainImg.src = btn.dataset.img;
            mainImg.style.opacity = "1";
            mainImg.style.transform = "scale(1)";
          }, 200);
          thumbnails.forEach(
            (t) =>
              (t.className =
                "thumbnail-btn relative w-28 h-16 shrink-0 rounded-lg overflow-hidden border-2 border-transparent hover:border-slate-300 transition-all opacity-80 hover:opacity-100"),
          );
          btn.className =
            "thumbnail-btn relative w-28 h-16 shrink-0 rounded-lg overflow-hidden border-2 border-primary-500 ring-2 ring-primary-500/20 transition-all opacity-100";
        });
      });
    }
  }

  closeModal() {
    const modalRoot = document.getElementById("project-modal-root");
    if (!modalRoot || modalRoot.classList.contains("hidden")) return;

    // --- THÊM LOGIC XÓA THAM SỐ URL KHI ĐÓNG MODAL ---
    const newUrl =
      window.location.protocol +
      "//" +
      window.location.host +
      window.location.pathname;
    window.history.pushState({ path: newUrl }, "", newUrl);
    // --------------------------------------------------

    const backdrop = modalRoot.querySelector(".modal-backdrop");
    const content = modalRoot.querySelector(".modal-content");

    if (backdrop) {
      backdrop.classList.remove("opening");
      backdrop.classList.add("closing");
    }
    if (content) {
      content.classList.remove("opening");
      content.classList.add("closing");
    }

    setTimeout(() => {
      modalRoot.classList.add("hidden");
      modalRoot.classList.remove("flex");
      document.body.classList.remove("modal-open");
      modalRoot.innerHTML = "";
    }, 200);
  }
}
