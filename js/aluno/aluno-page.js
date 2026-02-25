(function () {
  const host = document.getElementById("alunoSectionHost");
  const navButtons = document.querySelectorAll("[data-section]");

  if (!host || !navButtons.length) return;

  const sectionConfig = {
    inicio: {
      htmlPath: "../pages/aluno-sections/dashboard.html",
      init: initAlunoDashboardSection,
    },
    boletim: {
      htmlPath: "../pages/aluno-sections/boletim.html",
      init: initAlunoBoletimSection,
    },
    grafico: {
      htmlPath: "../pages/aluno-sections/grafico.html",
      init: initAlunoGraficoSection,
    },
    calendario: {
      htmlPath: "../pages/aluno-sections/calendario.html",
      init: initAlunoCalendarioSection,
    },
  };

  let currentSection = null;
  const htmlCache = new Map();

  function setActiveButton(sectionKey) {
    navButtons.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.section === sectionKey);
    });
  }

  function renderLoading() {
    host.innerHTML = `<div class="text2">Carregando seção...</div>`;
  }

  function renderError(message) {
    host.innerHTML = `
      <div class="container">
        <h2 class="title2">Erro ao carregar seção</h2>
        <p class="text2">${message}</p>
      </div>
    `;
  }

  async function loadSectionHtml(path) {
    if (htmlCache.has(path)) {
      return htmlCache.get(path);
    }

    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Falha ao carregar o arquivo da seção (${response.status}).`);
    }

    const html = await response.text();
    htmlCache.set(path, html);
    return html;
  }

  async function navigateTo(sectionKey) {
    if (!sectionConfig[sectionKey]) return;
    if (currentSection === sectionKey) return;

    currentSection = sectionKey;
    setActiveButton(sectionKey);
    renderLoading();

    try {
      const config = sectionConfig[sectionKey];
      const html = await loadSectionHtml(config.htmlPath);

      host.innerHTML = html;

      if (typeof config.init === "function") {
        await config.init({
          host,
          sectionKey,
        });
      }
    } catch (error) {
      renderError(error.message || "Não foi possível carregar a seção.");
    }
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      navigateTo(btn.dataset.section);
    });
  });

  // seção inicial
  navigateTo("inicio");

  // ===== INITs (mockadas agora, API depois) =====

  async function initAlunoDashboardSection() {
    // TODO: integrar API do dashboard do aluno
    // Ex.: buscar média geral + próximos eventos
  }

  async function initAlunoBoletimSection() {
    // TODO: integrar API do boletim
    // Ex.: preencher tabela
  }

  async function initAlunoGraficoSection() {
    // TODO: integrar API de notas para gráfico
    // Renderizar gráfico somente quando seção for aberta
    const canvas = document.getElementById("gradesChart");
    if (!canvas || typeof Chart === "undefined") return;

    const ctx = canvas.getContext("2d");

    // Mock temporário
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["P1", "P2", "P3", "Final"],
        datasets: [
          {
            label: "Notas",
            data: [8.5, 7.2, 9.1, 8.3],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  }

  async function initAlunoCalendarioSection() {
    // TODO: integrar API de eventos
    // Renderizar calendário apenas quando abrir a seção
  }
})();