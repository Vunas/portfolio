class ProjectManager {
  constructor() {
    // Cấu hình ban đầu
    this.projectsPerLoad = 6;
    this.currentVisible = this.projectsPerLoad;

    // State quản lý dữ liệu
    this.allProjects = [];
    this.filteredProjects = [];
    this.currentFilter = "All";
    this.searchQuery = "";

    // State quản lý bố cục: 'slider' (3D) hoặc 'grid' (Lưới cơ bản)
    this.currentLayout = "slider";

    // Khởi tạo các danh mục filter
    this.categories = ["All", "React", "Next.js", "NestJS", "Python"];

    // Slider State
    this.currentIndex = 0;
    this.isDragging = false;
    this.startX = 0;

    this.injectStyles();
  }

  // Khởi tạo CSS động cho Slider & Grid Animations
  injectStyles() {
    if (document.getElementById("premium-slider-styles")) return;
    const style = document.createElement("style");
    style.id = "premium-slider-styles";
    style.textContent = `
      /* Animation cho Grid Mode */
      @keyframes fade-up {
        from { opacity: 0; transform: translateY(15px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-fade-up { animation: fade-up 0.5s ease-out forwards; }

      /* Styles cho 3D Slider */
      #slider-container {
        perspective: 1200px;
        transform-style: preserve-3d;
      }
      .project-card {
        position: absolute;
        top: 0;
        left: 50%;
        width: 90%;
        max-width: 900px;
        height: 100%;
        transform-origin: center center;
        transition: all 0.7s cubic-bezier(0.2, 0.8, 0.2, 1);
        will-change: transform, opacity, filter;
        cursor: pointer;
        border-radius: 1.5rem;
        box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.15);
      }
      @media (min-width: 768px) {
        .project-card { width: 75%; border-radius: 2rem; }
      }
      .card-content {
        opacity: 0;
        transform: translateX(20px);
        transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) 0.2s;
      }
      .project-card.active .card-content {
        opacity: 1;
        transform: translateX(0);
      }
      .project-card:not(.active) .card-content {
        pointer-events: none;
      }
      .inactive-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.25);
        transition: opacity 0.5s ease;
        z-index: 30;
      }
      .dark .inactive-overlay { background: rgba(0,0,0,0.65); }
      .project-card.active .inactive-overlay {
        opacity: 0;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  async loadProjects() {
    try {
      const response = await fetch("./data/projects.json");
      this.allProjects = await response.json();
      this.filteredProjects = [...this.allProjects];

      // Gắn sự kiện Global và Render UI
      this.initGlobalEvents();
      this.renderFilters();
      this.updateUI();
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu dự án:", error);
      const grid = document.getElementById("projects-grid");
      if (grid)
        grid.innerHTML =
          '<p class="col-span-full text-red-500 text-center">Không thể tải danh sách dự án.</p>';
    }
  }

  // Render thanh Filter Tags
  renderFilters() {
    const filterContainer = document.getElementById("filter-container");
    if (!filterContainer) return;

    filterContainer.innerHTML = this.categories
      .map((category) => {
        const isActive = category === this.currentFilter;
        const activeClasses = isActive
          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md border-transparent"
          : "bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-white";

        return `
        <button 
          data-category="${category}" 
          class="filter-btn px-5 py-2 rounded-lg border text-sm font-medium transition-all duration-300 ease-out ${activeClasses}"
        >
          ${category}
        </button>
      `;
      })
      .join("");
  }

  // Khởi tạo các sự kiện tĩnh (chỉ chạy 1 lần)
  initGlobalEvents() {
    // 1. Sự kiện Filter
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

    // 2. Sự kiện Search
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.applyFiltersAndSearch();
      });
    }

    // 3. Sự kiện chuyển đổi Bố cục (Layout Toggle) - Dùng event delegation
    document.addEventListener("click", (e) => {
      const layoutBtn = e.target.closest(".layout-btn");
      if (layoutBtn) {
        const newLayout = layoutBtn.dataset.layout;
        if (this.currentLayout !== newLayout) {
          this.currentLayout = newLayout;
          // Nếu sang lưới thì reset số lượng hiển thị
          if (newLayout === "grid") this.currentVisible = this.projectsPerLoad;
          this.updateUI();
        }
      }
    });

    // 4. Lắng nghe phím điều hướng (Chỉ khi ở chế độ Slider)
    document.addEventListener("keydown", (e) => {
      if (this.currentLayout !== "slider") return;
      if (e.key === "ArrowRight") this.next();
      if (e.key === "ArrowLeft") this.prev();
    });
  }

  applyFiltersAndSearch() {
    this.filteredProjects = this.allProjects.filter((project) => {
      const matchFilter =
        this.currentFilter === "All" ||
        project.tags.includes(this.currentFilter);
      const matchSearch =
        project.title.toLowerCase().includes(this.searchQuery) ||
        project.tags.some((tag) =>
          tag.toLowerCase().includes(this.searchQuery),
        );
      return matchFilter && matchSearch;
    });

    this.currentIndex = 0;
    this.currentVisible = this.projectsPerLoad;
    this.updateUI();
  }

  // ==========================================
  // HÀM RENDER CHÍNH (GIAO DIỆN)
  // ==========================================
  updateUI() {
    const wrapper = document.getElementById("projects-grid");
    if (!wrapper) return;

    // Ẩn/Hiện div No Results
    const noResults = document.getElementById("no-results");
    if (this.filteredProjects.length === 0) {
      wrapper.innerHTML = "";
      if (noResults) noResults.classList.remove("hidden");
      return;
    } else {
      if (noResults) noResults.classList.add("hidden");
    }

    // Reset lại class của container chính
    wrapper.className = "w-full flex flex-col gap-6 mt-4";

    // 1. THANH TOOLBAR (Tổng dự án & Nút đổi Layout)
    const toolbarHTML = `
      <div class="flex justify-between items-center bg-white dark:bg-slate-800/50 p-3 px-5 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm mb-2">
        <div class="text-slate-600 dark:text-slate-400 text-sm">
          Found <span class="font-bold text-primary-600 dark:text-primary-400">${this.filteredProjects.length}</span> projects
        </div>
        
        <div class="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          <button data-layout="slider" class="layout-btn p-2 rounded-lg flex items-center gap-2 text-xs font-semibold transition-all ${this.currentLayout === "slider" ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}">
            <i data-lucide="gallery-horizontal" class="w-4 h-4"></i> <span class="hidden sm:inline">Carousel</span>
          </button>
          <button data-layout="grid" class="layout-btn p-2 rounded-lg flex items-center gap-2 text-xs font-semibold transition-all ${this.currentLayout === "grid" ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}">
            <i data-lucide="layout-grid" class="w-4 h-4"></i> <span class="hidden sm:inline">Grid</span>
          </button>
        </div>
      </div>
    `;

    // 2. RENDER NỘI DUNG TÙY THEO LAYOUT
    let contentHTML = "";

    if (this.currentLayout === "slider") {
      contentHTML = this.buildSliderHTML();
    } else {
      contentHTML = this.buildGridHTML();
    }

    wrapper.innerHTML = toolbarHTML + contentHTML;

    // Khởi tạo các event sau khi gắn HTML
    if (this.currentLayout === "slider") {
      this.setupSliderInteractions(wrapper);
      this.updateSliderTransforms();
    } else {
      this.setupGridInteractions(wrapper);
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // ==========================================
  // BỐ CỤC 1: 3D SLIDER (HÌNH CHỮ NHẬT WIDESCREEN)
  // ==========================================
  buildSliderHTML() {
    // Chiều cao được thu hẹp (h-450px) để không che hết màn hình
    return `
      <div class="relative w-full h-[500px] md:h-[420px] flex items-center justify-center overflow-hidden rounded-[2rem] bg-slate-50 dark:bg-slate-900/20">
        <div id="slider-container" class="relative w-full h-full mx-auto">
          ${this.filteredProjects
            .map(
              (project, index) => `
            
            <div class="project-card flex flex-col md:flex-row bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group overflow-hidden" data-index="${index}">
              
              <!-- Bên Trái: Cột Hình Ảnh -->
              <div class="w-full md:w-[60%] h-52 md:h-full relative overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-900">
                <img 
                  src="${project.image}" 
                  alt="${project.title}" 
                  onerror="this.src='https://placehold.co/600x400/1e293b/ffffff?text=${encodeURIComponent(project.title)}'; this.onerror=null;" 
                  class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                  <div class="absolute top-5 left-5 flex flex-wrap gap-2 z-20">
                ${project.tags
                  .slice(0, 4)
                  .map(
                    (tag) => `
                  <span class="px-3 py-1 rounded-full backdrop-blur-md bg-black/60 border border-white/20 text-white text-[11px] font-semibold tracking-wide">
                    ${tag}
                  </span>
                `,
                  )
                  .join("")}
              </div>
              </div>

              <!-- Bên Phải: Cột Nội Dung -->
              <div class="w-full md:w-[40%] p-6 md:p-10 flex flex-col justify-center relative z-20">
                <div class="card-content flex flex-col h-full justify-center">
                  
                

                  <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-3 leading-tight">${project.title}</h3>
                  <p class="text-slate-600 dark:text-slate-400 text-sm mb-8 line-clamp-3 md:line-clamp-none leading-relaxed">
                    ${project.description}
                  </p>

                  <div class="flex items-center gap-3 mt-auto">
                    ${
                      project.demo
                        ? `
                      <a href="${project.demo}" target="_blank" class="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-primary-600 dark:hover:bg-primary-500 hover:text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-2">
                        Preview <i class="fa-solid fa-arrow-up-right-from-square"></i>
                      </a>
                    `
                        : ""
                    }
                    ${
                      project.github
                        ? `
                      <a href="${project.github}" target="_blank" class="px-5 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-all flex items-center gap-2">
                        <i class="fa-brands fa-github"></i> Code
                      </a>
                    `
                        : ""
                    }
                  </div>
                </div>
              </div>

              <!-- Lớp phủ cho Card khi không Focus -->
              <div class="inactive-overlay pointer-events-none rounded-[inherit]"></div>
            </div>

          `,
            )
            .join("")}
        </div>

        <!-- Mũi tên điều hướng -->
        <button id="slider-prev" class="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-primary-600 hover:border-primary-500 transition-all shadow-md z-40 md:flex">
          <i data-lucide="chevron-left" class="w-5 h-5"></i>
        </button>
        <button id="slider-next" class="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-primary-600 hover:border-primary-500 transition-all shadow-md z-40 md:flex">
          <i data-lucide="chevron-right" class="w-5 h-5"></i>
        </button>

        <!-- Dấu chấm Pagination -->
        <div id="slider-pagination" class="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-40"></div>
      </div>
    `;
  }

  // ==========================================
  // BỐ CỤC 2: GRID TRUYỀN THỐNG (DANH SÁCH LƯỚI)
  // ==========================================
  buildGridHTML() {
    const visibleProjects = this.filteredProjects.slice(0, this.currentVisible);
    const hasMore = this.currentVisible < this.filteredProjects.length;

    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-up">
        ${visibleProjects
          .map(
            (project, index) => `
          <div class="flex flex-col bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group" style="animation-delay: ${index * 50}ms">
            
            <div class="h-48 relative overflow-hidden bg-slate-100 dark:bg-slate-900">
              <img src="${project.image}" alt="${project.title}" onerror="this.src='https://placehold.co/600x400/1e293b/ffffff?text=${encodeURIComponent(project.title)}'; this.onerror=null;" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ${project.featured ? `<div class="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">Hot</div>` : ""}
            </div>

            <div class="p-5 flex flex-col flex-grow">
              <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary-500 transition-colors">${project.title}</h3>
              <p class="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-2 flex-grow">${project.description}</p>
              
              <div class="flex flex-wrap gap-1.5 mb-5">
                ${project.tags
                  .slice(0, 3)
                  .map(
                    (tag) =>
                      `<span class="bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-[10px] font-medium px-2 py-1 rounded">${tag}</span>`,
                  )
                  .join("")}
              </div>

              <div class="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-700 mt-auto">
                ${project.demo ? `<a href="${project.demo}" target="_blank" class="flex-1 text-center bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 py-2 rounded-lg text-xs font-semibold transition-colors">Preview</a>` : ""}
                ${project.github ? `<a href="${project.github}" target="_blank" class="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"><i class="fa-brands fa-github"></i></a>` : ""}
              </div>
            </div>
          </div>
        `,
          )
          .join("")}
      </div>

      <!-- Nút Load More cho Grid -->
      ${
        hasMore
          ? `
        <div class="text-center mt-8">
          <button class="load-more-btn inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-slate-300 dark:border-slate-600 hover:border-primary-500 dark:hover:border-primary-500 text-sm font-medium transition-all text-slate-600 dark:text-slate-300">
            Show more <i data-lucide="chevron-down" class="w-4 h-4"></i>
          </button>
        </div>
      `
          : ""
      }
    `;
  }

  // ==========================================
  // XỬ LÝ SỰ KIỆN RIÊNG TỪNG LAYOUT
  // ==========================================
  setupGridInteractions(wrapper) {
    const loadMoreBtn = wrapper.querySelector(".load-more-btn");
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", () => {
        this.currentVisible += this.projectsPerLoad;
        this.updateUI();
      });
    }
  }

  setupSliderInteractions(wrapper) {
    const nextBtn = wrapper.querySelector("#slider-next");
    const prevBtn = wrapper.querySelector("#slider-prev");

    if (nextBtn) nextBtn.addEventListener("click", () => this.next());
    if (prevBtn) prevBtn.addEventListener("click", () => this.prev());

    const cards = wrapper.querySelectorAll(".project-card");
    cards.forEach((card, idx) => {
      card.addEventListener("click", () => {
        if (this.currentIndex !== idx) {
          this.currentIndex = idx;
          this.updateSliderTransforms();
        }
      });
    });

    const sliderCont = wrapper.querySelector("#slider-container");
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

    // Đảm bảo update lại vị trí khi đổi size trình duyệt
    window.addEventListener("resize", () => {
      if (this.currentLayout === "slider") this.updateSliderTransforms();
    });
  }

  updateSliderTransforms() {
    if (this.currentLayout !== "slider") return;

    const cards = document.querySelectorAll(".project-card");
    const pagination = document.getElementById("slider-pagination");
    if (!cards.length) return;

    const isMobile = window.innerWidth < 768;
    const xOffset = isMobile ? 100 : 70; // Giãn khoảng cách thẻ 2 bên
    const scaleFactor = isMobile ? 0.9 : 0.8;

    cards.forEach((card, index) => {
      const diff = index - this.currentIndex;
      card.classList.remove("active");

      if (diff === 0) {
        card.classList.add("active");
        card.style.transform = `translateX(-50%) scale(1)`;
        card.style.zIndex = 30;
        card.style.opacity = 1;
        card.style.filter = "blur(0px)";
      } else if (diff === -1) {
        card.style.transform = `translateX(calc(-50% - ${xOffset}%)) scale(${scaleFactor})`;
        card.style.zIndex = 20;
        card.style.opacity = 0.5;
        card.style.filter = "blur(3px)";
      } else if (diff === 1) {
        card.style.transform = `translateX(calc(-50% + ${xOffset}%)) scale(${scaleFactor})`;
        card.style.zIndex = 20;
        card.style.opacity = 0.5;
        card.style.filter = "blur(3px)";
      } else {
        const direction = diff < 0 ? -1 : 1;
        card.style.transform = `translateX(calc(-50% + ${direction * (xOffset * 1.5)}%)) scale(0.6)`;
        card.style.zIndex = 10;
        card.style.opacity = 0;
      }
    });

    if (pagination) {
      pagination.innerHTML = this.filteredProjects
        .map(
          (_, index) => `
        <button class="dot h-1.5 rounded-full transition-all duration-300 ${index === this.currentIndex ? "bg-primary-500 w-6" : "bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 w-2"}" data-index="${index}"></button>
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
}
