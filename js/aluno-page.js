// js/aluno-page.js

document.addEventListener("DOMContentLoaded", async () => {
  const user = getCurrentUser();
  if (!user || (user.perfil || "").toUpperCase() !== "ALUNO") {
    window.location.href = "./index.html";
    return;
  }
  initProfileMenu(user);

  initPasswordModal();

  bindHeaderNavigation();
  await navigateToSection("dashboard", user);
});

function bindHeaderNavigation() {
  const navLinks = document.querySelectorAll(".header-nav .nav-link");

  navLinks.forEach((link) => {
    link.addEventListener("click", async (event) => {
      event.preventDefault();

      const sectionName = link.dataset.section;
      const user = getCurrentUser();

      if (!sectionName || !user) return;

      await navigateToSection(sectionName, user);
    });
  });
}

async function navigateToSection(sectionName, user) {
  setActiveNav(sectionName);

  if (sectionName === "dashboard") {
    await renderDashboard(user);
    return;
  }

  if (sectionName === "notas") {
    await renderNotas();
    return;
  }

  if (sectionName === "atividades") {
    await renderAtividades();
    return;
  }

  if (sectionName === "calendario") {
    await renderCalendario();
    return;
  }
}

function setActiveNav(sectionName) {
  const navLinks = document.querySelectorAll(".header-nav .nav-link");

  navLinks.forEach((link) => {
    const isActive = link.dataset.section === sectionName;
    link.classList.toggle("is-active", isActive);
  });
}

async function renderDashboard(user) {
  const host = document.getElementById("alunoSectionHost");
  if (!host) return;

  try {
    await loadSectionHtml(host, "../pages/sections/aluno/dashboard.html");

    const nameSpan = host.querySelector(".welcome-name span");
    const avgNode = host.querySelector(".avg-number");
    const eventsContainer = host.querySelector(".events-container");

    if (nameSpan) {
      nameSpan.textContent = (user.nome.split(" ")[0] || "Aluno");
    }

    if (avgNode) {
      avgNode.textContent = "...";
    }

    if (eventsContainer) {
      eventsContainer.innerHTML = `<p class="title3 welcome-text">Carregando...</p>`;
    }

    const [notas, eventos] = await Promise.all([
      AlunoService.getNotasMe(),
      AlunoService.getProximosEventosMe(3),
    ]);

    const mediaGeral = calcularMediaGeral(notas);

    if (avgNode) {
      avgNode.textContent = formatOneDecimal(mediaGeral);
    }

    if (eventsContainer) {
      renderNextEvents(eventsContainer, eventos);
    }
  } catch (err) {
    console.error(err);
    host.innerHTML = `
      <section class="container welcome-section with-offset">
        <p class="title3 welcome-text">Erro ao carregar dashboard.</p>
      </section>
    `;
  }
}

function renderPlaceholderSection(title, message) {
  const host = document.getElementById("alunoSectionHost");
  if (!host) return;

  host.innerHTML = `
    <section class="container welcome-section with-offset">
      <h2 class="titleMid section-title with-offset">${escapeHtml(title)}</h2>
      <p class="title3 welcome-text">${escapeHtml(message)}</p>
    </section>
  `;
}

async function loadSectionHtml(host, path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Não foi possível carregar a seção: ${path}`);
  }

  const html = await response.text();
  host.innerHTML = html;
}

function getCurrentUser() {
  const raw = localStorage.getItem("ec_usuario");
  if (!raw) return null;

  try {
    const u = JSON.parse(raw);
    return {
      id: u.id ?? null,
      nome: u.nome ?? "",
      perfil: (u.perfil ?? "").toUpperCase(),
      matricula: u.matricula ?? "",
    };
  } catch {
    return null;
  }
}

function calcularMediaGeral(notas) {
  if (!Array.isArray(notas) || notas.length === 0) return 0;

  let soma = 0;
  let quantidade = 0;

  for (const item of notas) {
    const avaliacoes = [item?.a1, item?.a2, item?.a3];

    for (const nota of avaliacoes) {
      if (typeof nota === "number" && Number.isFinite(nota)) {
        soma += nota;
        quantidade += 1;
      }
    }
  }

  if (quantidade === 0) return 0;
  return soma / quantidade;
}

function renderNextEvents(container, eventos) {
  container.innerHTML = "";

  const lista = Array.isArray(eventos) ? eventos.slice(0, 3) : [];

  if (!lista.length) {
    container.innerHTML = `<p class="title3 welcome-text">Sem eventos próximos.</p>`;
    return;
  }

  for (const evento of lista) {
    const { dateLabel, timeLabel } = formatEvento(evento);

    const card = document.createElement("div");
    card.className = "container next-event-container";
    card.innerHTML = `
      <div class="container next-event-header">
        <h1 class="title1 next-event-date">${dateLabel}</h1>
        <p class="text2 next-event-time">${timeLabel}</p>
      </div>
      <h2 class="title2 next-event-description">${escapeHtml(evento?.titulo || "-")}</h2>
    `;

    container.appendChild(card);
  }
}

function formatEvento(evento) {
  const dateLabel = formatDateDDMM(evento?.data);

  if (evento?.diaInteiro) {
    return { dateLabel, timeLabel: "Dia todo" };
  }

  const timeLabel = formatTimeHHMM(evento?.horaInicio) || "Dia todo";
  return { dateLabel, timeLabel };
}

function formatDateDDMM(valor) {
  if (!valor || typeof valor !== "string") return "--/--";

  const partes = valor.split("-");
  if (partes.length !== 3) return "--/--";

  const [, mes, dia] = partes;
  return `${dia.padStart(2, "0")}/${mes.padStart(2, "0")}`;
}

function formatTimeHHMM(valor) {
  if (!valor || typeof valor !== "string") return "";

  const timeOnlyMatch = valor.match(/^(\d{2}):(\d{2})/);
  if (timeOnlyMatch) {
    return `${timeOnlyMatch[1]}:${timeOnlyMatch[2]}`;
  }

  const dt = new Date(valor);
  if (isNaN(dt.getTime())) return "";

  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");

  return `${hh}:${mm}`;
}

function formatOneDecimal(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return "0.0";
  return numero.toFixed(1);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCssVarValue(variableName, fallback = "") {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();

  return value || fallback;
}

function getChartThemeColors() {
  return {
    textColor: getCssVarValue("--color-gray-6", "#ffffff"),
    gridColor: getCssVarValue("--color-gray-4", "rgba(255,255,255,0.08)"),
    lineColor: getCssVarValue("--color-primary", "#ff1b6b"),
  };
}

function updateNotasChartTheme() {
  const chart = window.alunoNotasChartInstance;
  if (!chart) return;

  const { textColor, gridColor, lineColor } = getChartThemeColors();

  chart.data.datasets.forEach((dataset) => {
    dataset.borderColor = lineColor;
    dataset.backgroundColor = lineColor;
    dataset.pointBackgroundColor = lineColor;
    dataset.pointBorderColor = lineColor;
  });

  if (chart.options?.scales?.x?.ticks) {
    chart.options.scales.x.ticks.color = textColor;
  }

  if (chart.options?.scales?.y?.ticks) {
    chart.options.scales.y.ticks.color = textColor;
  }

  if (chart.options?.scales?.x?.grid) {
    chart.options.scales.x.grid.color = gridColor;
  }

  if (chart.options?.scales?.y?.grid) {
    chart.options.scales.y.grid.color = gridColor;
  }

  chart.update();
}

async function handleDownloadBoletimPdf(button) {
  if (!button) return;

  const originalHtml = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `<span>Baixando...</span><span class="boletim-btn-icon" aria-hidden="true">⬇</span>`;

  try {
    const { blob, fileName } = await AlunoService.downloadBoletimPdf();
    triggerBrowserDownload(blob, fileName);
  } catch (error) {
    console.error(error);

    if (typeof Toastify === "function") {
      Toastify({
        text: error.message || "Erro ao baixar boletim.",
        duration: 3500,
        gravity: "top",
        position: "right",
        close: true,
        stopOnFocus: true,
        style: { background: "#c62828" },
      }).showToast();
    } else {
      alert(error.message || "Erro ao baixar boletim.");
    }
  } finally {
    button.disabled = false;
    button.innerHTML = originalHtml;
  }
}

function triggerBrowserDownload(blob, fileName) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName || "boletim.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}

function observeThemeChangesForNotasChart() {
  if (window.alunoNotasThemeObserver) return;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "data-theme"
      ) {
        updateNotasChartTheme();
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  window.alunoNotasThemeObserver = observer;
}

async function initProfileMenu(user) {
  const profileBtn = document.getElementById("profileBtn");
  const profileDropdown = document.getElementById("profileDropdown");
  const logoutBtn = document.getElementById("logoutBtn");
  const changePasswordBtn = document.getElementById("changePasswordBtn");

  const profileNome = document.getElementById("profileNome");
  const profileMatricula = document.getElementById("profileMatricula");
  const profileTurma = document.getElementById("profileTurma");

  if (
    !profileBtn ||
    !profileDropdown ||
    !logoutBtn ||
    !changePasswordBtn ||
    !profileNome ||
    !profileMatricula ||
    !profileTurma
  ) {
    return;
  }

  profileNome.textContent = user.nome || "-";
  profileMatricula.textContent = user.matricula || "-";
  profileTurma.textContent = "Carregando...";

  // Busca turma na API
  try {
    const turmas = await AlunoService.getTurmasMe();

    if (Array.isArray(turmas) && turmas.length > 0) {
      profileTurma.textContent = turmas[0]?.nome || "Não informado";
    } else {
      profileTurma.textContent = "Não informado";
    }
  } catch (error) {
    console.error(error);
    profileTurma.textContent = "Não informado";
  }

  profileBtn.addEventListener("click", function (event) {
    event.stopPropagation();

    const isOpen = profileDropdown.classList.contains("is-open");
    profileDropdown.classList.toggle("is-open", !isOpen);
    profileBtn.setAttribute("aria-expanded", String(!isOpen));
  });

  profileDropdown.addEventListener("click", function (event) {
    event.stopPropagation();
  });

  document.addEventListener("click", function () {
    profileDropdown.classList.remove("is-open");
    profileBtn.setAttribute("aria-expanded", "false");
  });

  changePasswordBtn.addEventListener("click", function () {
    openPasswordModal();
    profileDropdown.classList.remove("is-open");
    profileBtn.setAttribute("aria-expanded", "false");
  });

  logoutBtn.addEventListener("click", function () {
    localStorage.removeItem("ec_token");
    localStorage.removeItem("ec_usuario");
    localStorage.removeItem("educonnect_current_user");
    window.location.href = "./index.html";
  });


}
function initPasswordModal() {
  const modal = document.getElementById("passwordModal");
  const overlay = document.getElementById("passwordModalOverlay");
  const closeBtn = document.getElementById("passwordModalClose");
  const form = document.getElementById("changePasswordForm");
  const submitBtn = document.getElementById("changePasswordSubmitBtn");
  const novaSenhaInput = document.getElementById("novaSenha");
  const confirmacaoInput = document.getElementById("confirmacaoSenha");
  const errorNode = document.getElementById("changePasswordError");

  if (
    !modal ||
    !overlay ||
    !closeBtn ||
    !form ||
    !submitBtn ||
    !novaSenhaInput ||
    !confirmacaoInput ||
    !errorNode
  ) {
    return;
  }

  initPasswordToggles();

  overlay.addEventListener("click", closePasswordModal);
  closeBtn.addEventListener("click", closePasswordModal);

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closePasswordModal();
    }
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    errorNode.style.display = "none";
    errorNode.textContent = "";

    const novaSenha = novaSenhaInput.value.trim();
    const confirmacao = confirmacaoInput.value.trim();

    const validationError = validatePasswordForm(novaSenha, confirmacao);
    if (validationError) {
      errorNode.textContent = validationError;
      errorNode.style.display = "block";
      return;
    }

    setButtonLoading(submitBtn, true, "Salvando...", "Salvar");

    try {
      await AlunoService.alterarSenha(novaSenha, confirmacao);

      closePasswordModal();
      form.reset();

      if (typeof Toastify === "function") {
        Toastify({
          text: "Senha alterada com sucesso.",
          duration: 3500,
          gravity: "top",
          position: "right",
          close: true,
          stopOnFocus: true,
          style: { background: "#2e7d32" },
        }).showToast();
      }
    } catch (error) {
      errorNode.textContent = error.message || "Erro ao alterar senha.";
      errorNode.style.display = "block";
    } finally {
      setButtonLoading(submitBtn, false, null, "Salvar");
    }
  });
}

function openPasswordModal() {
  const modal = document.getElementById("passwordModal");
  const errorNode = document.getElementById("changePasswordError");

  if (!modal) return;

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");

  if (errorNode) {
    errorNode.style.display = "none";
    errorNode.textContent = "";
  }
}

function closePasswordModal() {
  const modal = document.getElementById("passwordModal");
  const form = document.getElementById("changePasswordForm");
  const errorNode = document.getElementById("changePasswordError");

  if (!modal) return;

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");

  if (form) {
    form.reset();
  }

  if (errorNode) {
    errorNode.style.display = "none";
    errorNode.textContent = "";
  }

  const passwordInputs = modal.querySelectorAll('input[type="text"], input[type="password"]');
  const toggleButtons = modal.querySelectorAll(".password-toggle-btn");

  passwordInputs.forEach((input) => {
    if (input.id === "novaSenha" || input.id === "confirmacaoSenha") {
      input.type = "password";
    }
  });

  toggleButtons.forEach((button) => {
    button.classList.remove("is-visible");
    button.setAttribute("aria-label", "Mostrar senha");
  });
}

function validatePasswordForm(novaSenha, confirmacao) {
  if (!novaSenha || !confirmacao) {
    return "Preencha os dois campos.";
  }

  if (novaSenha !== confirmacao) {
    return "A confirmação da senha não confere.";
  }

  if (!isStrongPassword(novaSenha)) {
    return "A senha deve ter no mínimo 8 caracteres, uma letra maiúscula, uma letra minúscula e um número.";
  }

  return "";
}

function isStrongPassword(password) {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

function setButtonLoading(button, isLoading, loadingText, defaultText) {
  if (!button) return;

  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText || "Carregando...";
    button.disabled = true;
  } else {
    button.disabled = false;
    button.textContent =
      defaultText || button.dataset.originalText || button.textContent;
  }
}

function initPasswordToggles() {
  const toggleButtons = document.querySelectorAll(".password-toggle-btn");

  toggleButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const targetId = button.dataset.target;
      const input = document.getElementById(targetId);

      if (!input) return;

      const willShow = input.type === "password";

      input.type = willShow ? "text" : "password";
      button.classList.toggle("is-visible", willShow);
      button.setAttribute(
        "aria-label",
        willShow ? "Ocultar senha" : "Mostrar senha"
      );
    });
  });
}

async function renderNotas() {
  const host = document.getElementById("alunoSectionHost");
  if (!host) return;

  try {
    await loadSectionHtml(host, "../pages/sections/aluno/notas.html");

    const tableBody = host.querySelector("#gradesTable tbody") || host.querySelector("#gradesTable");
    const subjectSelect = host.querySelector("#subjectSelect");
    const chartCanvas = host.querySelector("#gradesChart");
    const downloadBoletimBtn = host.querySelector("#downloadBoletimBtn");

    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text2">Carregando notas...</td>
        </tr>
      `;
    }

    const notas = await AlunoService.getNotasMe();

    const notasComFrequencia = await Promise.all(
      (Array.isArray(notas) ? notas : []).map(async (item) => {
        if (!item?.ofertaId) {
          return {
            ...item,
            frequenciaPercentual: null,
          };
        }

        try {
          const frequencia = await AlunoService.getFrequenciaMe(item.ofertaId);

          return {
            ...item,
            frequenciaPercentual:
              typeof frequencia?.percentual === "number"
                ? frequencia.percentual
                : null,
          };
        } catch (error) {
          console.error(`Erro ao buscar frequência da oferta ${item.ofertaId}:`, error);
          return {
            ...item,
            frequenciaPercentual: null,
          };
        }
      })
    );

    renderNotasTable(tableBody, notasComFrequencia);
    renderNotasSelect(subjectSelect, notasComFrequencia);
    renderNotasChart(subjectSelect, chartCanvas, notasComFrequencia);
    observeThemeChangesForNotasChart();

    downloadBoletimBtn?.addEventListener("click", async function () {
      await handleDownloadBoletimPdf(downloadBoletimBtn);
    });

    subjectSelect?.addEventListener("change", function () {
      renderNotasChart(subjectSelect, chartCanvas, notasComFrequencia);
    });
  } catch (error) {
    console.error(error);
    host.innerHTML = `
      <section class="container welcome-section with-offset">
        <h2 class="titleMid section-title with-offset">Notas</h2>
        <p class="text2">Erro ao carregar notas.</p>
      </section>
    `;
  }
}

function renderNotasTable(tableRef, notas) {
  if (!tableRef) return;

  const table = tableRef.closest("table");
  let tbody = table?.querySelector("tbody");

  if (!tbody && table) {
    tbody = document.createElement("tbody");
    const rows = Array.from(table.querySelectorAll("tr")).slice(1);
    rows.forEach((row) => tbody.appendChild(row));
    table.appendChild(tbody);
  }

  const target = tbody || tableRef;
  target.innerHTML = "";

  if (!Array.isArray(notas) || notas.length === 0) {
    target.innerHTML = `
      <tr>
        <td colspan="6" class="text2">Nenhuma nota encontrada.</td>
      </tr>
    `;
    return;
  }

  notas.forEach((item) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${escapeHtml(item.disciplinaNome || "-")}</td>
      <td>${formatNota(item.a1)}</td>
      <td>${formatNota(item.a2)}</td>
      <td>${formatNota(item.a3)}</td>
      <td>${formatFrequencia(item.frequenciaPercentual)}</td>
      <td>${formatNota(calcularNotaFinal(item))}</td>
    `;

    target.appendChild(tr);
  });
}

function renderNotasSelect(select, notas) {
  if (!select) return;

  select.innerHTML = "";

  if (!Array.isArray(notas) || notas.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Sem disciplinas";
    select.appendChild(option);
    return;
  }

  notas.forEach((item, index) => {
    const option = document.createElement("option");
    option.value = String(item.ofertaId ?? index);
    option.textContent = item.disciplinaNome || `Disciplina ${index + 1}`;
    option.dataset.index = String(index);
    select.appendChild(option);
  });
}

function renderNotasChart(select, canvas, notas) {
  if (!canvas || typeof Chart === "undefined") return;
  if (!Array.isArray(notas) || notas.length === 0) return;

  const selectedOption = select?.selectedOptions?.[0];
  const selectedIndex = selectedOption ? Number(selectedOption.dataset.index) : 0;
  const item = notas[selectedIndex] || notas[0];

  const values = [
    normalizeNotaForChart(item?.a1),
    normalizeNotaForChart(item?.a2),
    normalizeNotaForChart(item?.a3),
  ];

  if (window.alunoNotasChartInstance) {
    window.alunoNotasChartInstance.destroy();
  }

  const { textColor, gridColor, lineColor } = getChartThemeColors();

  window.alunoNotasChartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels: ["P1", "P2", "P3"],
      datasets: [
        {
          label: item?.disciplinaNome || "Notas",
          data: values,
          borderColor: lineColor,
          backgroundColor: lineColor,
          pointBackgroundColor: lineColor,
          pointBorderColor: lineColor,
          pointRadius: 5,
          pointHoverRadius: 6,
          borderWidth: 3,
          tension: 0.25,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          offset: true,
          ticks: {
            color: textColor,
            font: {
              size: 14,
              weight: "600",
            },
          },
          grid: {
            color: gridColor,
          },
          border: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: 10,
          ticks: {
            stepSize: 2,
            color: textColor,
            font: {
              size: 14,
            },
          },
          grid: {
            color: gridColor,
          },
          border: {
            display: false,
          },
        },
      },
    },
  });
}

function calcularNotaFinal(item) {
  const notas = [item?.a1, item?.a2, item?.a3].filter(
    (nota) => typeof nota === "number" && Number.isFinite(nota)
  );

  if (notas.length === 0) return null;

  const soma = notas.reduce((acc, nota) => acc + nota, 0);
  return soma / notas.length;
}

function formatNota(nota) {
  if (typeof nota !== "number" || !Number.isFinite(nota)) return "-";
  return nota.toFixed(1);
}

function formatFrequencia(percentual) {
  if (typeof percentual !== "number" || !Number.isFinite(percentual)) return "-";
  return `${percentual.toFixed(0)}%`;
}

function normalizeNotaForChart(nota) {
  if (typeof nota !== "number" || !Number.isFinite(nota)) return 0;
  return nota;
}

async function renderAtividades() {
  const host = document.getElementById("alunoSectionHost");
  if (!host) return;

  try {
    await loadSectionHtml(host, "../pages/sections/aluno/atividades.html");

    document.body.classList.add("aluno-atividades-scroll");

    const disciplinasCards = host.querySelector("#disciplinasCards");
    const tarefasTitulo = host.querySelector("#tarefasTitulo");
    const tarefasList = host.querySelector("#tarefasList");
    const tarefasStatusFilter = host.querySelector("#tarefasStatusFilter");

    if (tarefasStatusFilter) {
      tarefasStatusFilter.value = "todas";
      tarefasStatusFilter.disabled = true;
    }

    if (disciplinasCards) {
      disciplinasCards.innerHTML = `<p class="text2">Carregando disciplinas...</p>`;
    }

    const ofertas = await AlunoService.getOfertasMe();

    let ofertaSelecionada = null;
    let tarefasDaOfertaAtual = [];

    function aplicarFiltroERenderizarTarefas() {
      if (!ofertaSelecionada) return;

      const filtro = tarefasStatusFilter?.value || "todas";

      const tarefasFiltradas =
        filtro === "todas"
          ? tarefasDaOfertaAtual
          : tarefasDaOfertaAtual.filter((tarefa) => tarefa.status === filtro);

      renderTarefasList(tarefasList, tarefasFiltradas, ofertaSelecionada);
    }

    renderDisciplinasCards(disciplinasCards, ofertas, async (oferta) => {
      ofertaSelecionada = oferta;

      if (tarefasStatusFilter) {
        tarefasStatusFilter.disabled = false;
      }

      tarefasTitulo.textContent = `Atividades - ${oferta.disciplinaNome}`;
      tarefasList.innerHTML = `<p class="text2">Carregando tarefas...</p>`;

      tarefasDaOfertaAtual = await carregarTarefasDaOferta(oferta);
      aplicarFiltroERenderizarTarefas();
    });

    tarefasStatusFilter?.addEventListener("change", () => {
      aplicarFiltroERenderizarTarefas();
    });

    if (Array.isArray(ofertas) && ofertas.length > 0) {
      tarefasTitulo.textContent = "Selecione uma disciplina";
      tarefasList.innerHTML = `<p class="text2">Clique em uma disciplina para visualizar as tarefas.</p>`;
    } else {
      tarefasTitulo.textContent = "Nenhuma disciplina encontrada";
      tarefasList.innerHTML = `<p class="text2">Você não possui disciplinas matriculadas.</p>`;
      if (tarefasStatusFilter) {
        tarefasStatusFilter.disabled = true;
      }
    }
  } catch (error) {
    console.error(error);
    host.innerHTML = `
      <section class="container atividades-section with-offset">
        <h2 class="titleMid section-title">Atividades</h2>
        <p class="text2">Erro ao carregar atividades.</p>
      </section>
    `;
  }
}

async function carregarTarefasDaOferta(oferta) {
  const tarefas = await AlunoService.getTarefasByOferta(oferta.ofertaId);

  const resultado = await Promise.all(
    (Array.isArray(tarefas) ? tarefas : []).map(async (tarefa) => {
      let resposta = null;
      let correcao = null;

      try {
        resposta = await AlunoService.getMinhaRespostaTarefa(oferta.ofertaId, tarefa.id);
      } catch (error) {
        resposta = null;
      }

      if (resposta?.id) {
        try {
          correcao = await AlunoService.getMinhaCorrecaoTarefa(oferta.ofertaId, tarefa.id);
        } catch (error) {
          correcao = null;
        }
      }

      return {
        ...tarefa,
        ofertaId: oferta.ofertaId,
        disciplinaNome: oferta.disciplinaNome,
        resposta,
        correcao,
        status: correcao
          ? "corrigida"
          : resposta
            ? "respondida"
            : "pendente",
      };
    })
  );

  resultado.sort((a, b) => new Date(b.dataEntrega) - new Date(a.dataEntrega));
  return resultado;
}

function renderDisciplinasCards(container, ofertas, onSelect) {
  if (!container) return;

  if (!Array.isArray(ofertas) || ofertas.length === 0) {
    container.innerHTML = `<p class="text2">Nenhuma disciplina encontrada.</p>`;
    return;
  }

  container.innerHTML = "";

  const ofertasOrdenadas = [...ofertas].sort((a, b) => {
    const anoA = Number(a?.ano || 0);
    const anoB = Number(b?.ano || 0);
    const semestreA = Number(a?.semestre || 0);
    const semestreB = Number(b?.semestre || 0);

    if (anoB !== anoA) return anoB - anoA;
    return semestreB - semestreA;
  });

  ofertasOrdenadas.forEach((oferta) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "disciplina-card";
    button.innerHTML = `
      <div class="disciplina-card-top">
        <span class="title3 disciplina-card-title">${escapeHtml(oferta.disciplinaNome || "-")}</span>
      </div>
      <div class="disciplina-card-bottom">
      <div class="disciplina-card-bottom-left">
        <span class="text2">${escapeHtml(oferta.professorNome || "-")}</span>
        <span class="text2">${escapeHtml(oferta.periodo || "-")}</span>
      </div>
      <span class="text2 disciplina-card-year-semester">
          ${formatAnoSemestre(oferta.ano, oferta.semestre)}
      </span>
      </div>
    `;

    button.addEventListener("click", () => onSelect(oferta));
    container.appendChild(button);
  });
}

function renderTarefasList(container, tarefas, oferta) {
  if (!container) return;

  if (!Array.isArray(tarefas) || tarefas.length === 0) {
    container.innerHTML = `<p class="text2">Nenhuma tarefa encontrada para esta disciplina.</p>`;
    return;
  }

  container.innerHTML = "";

  tarefas.forEach((tarefa) => {
    const article = document.createElement("article");
    article.className = `tarefa-card tarefa-${tarefa.status}`;

    const statusLabel =
      tarefa.status === "corrigida"
        ? "Corrigida"
        : tarefa.status === "respondida"
          ? "Respondida"
          : "Pendente";

    const prazo = formatDateTime(tarefa.dataEntrega);

    let bodyHtml = "";

    if (tarefa.status === "pendente") {
      bodyHtml = `
        <p class="text2">${escapeHtml(tarefa.descricao || "-")}</p>
        <div class="tarefa-meta">
          <p class="text2"><strong>Entrega:</strong> ${prazo}</p>
          <p class="text2"><strong>Peso:</strong> ${formatNota(tarefa.peso)}</p>
        </div>

        <div class="tarefa-form">
          <textarea class="tarefa-textarea text2" rows="5" placeholder="Digite sua resposta"></textarea>
          <button type="button" class="tarefa-enviar-btn title3">Enviar resposta</button>
        </div>
      `;
    }

    if (tarefa.status === "respondida") {
      bodyHtml = `
        <p class="text2">${escapeHtml(tarefa.descricao || "-")}</p>
        <div class="tarefa-meta">
          <p class="text2"><strong>Entrega:</strong> ${prazo}</p>
          <p class="text2"><strong>Resposta enviada em:</strong> ${formatDateTime(tarefa.resposta?.dataEnvio)}</p>
        </div>

        <div class="tarefa-resposta-box text2">
          <strong>Resposta:</strong><br />
          ${escapeHtml(tarefa.resposta?.conteudo || "-")}
        </div>
      `;
    }

    if (tarefa.status === "corrigida") {
      bodyHtml = `
        <p class="text2">${escapeHtml(tarefa.descricao || "-")}</p>

<div class="tarefa-info-row">
  <div class="tarefa-meta">
    <p class="text2"><strong>Entrega:</strong> ${prazo}</p>
    <p class="text2"><strong>Resposta enviada em:</strong> ${formatDateTime(tarefa.resposta?.dataEnvio)}</p>
    <p class="text2"><strong>Corrigida em:</strong> ${formatDateTime(tarefa.correcao?.dataCorrecao)}</p>
  </div>

  <div class="tarefa-nota-box">
    <span class="tarefa-nota-label text2">Nota</span>
    <span class="tarefa-nota-value">${formatNota(tarefa.correcao?.nota)}</span>
  </div>
</div>

<div class="tarefa-resposta-box text2">
  <strong>Resposta:</strong><br />
  ${escapeHtml(tarefa.resposta?.conteudo || "-")}
</div>

<div class="tarefa-feedback-box text2">
  <strong>Feedback do professor:</strong><br />
  ${escapeHtml(tarefa.correcao?.feedback || "-")}
</div>
      `;
    }

    article.innerHTML = `
      <button type="button" class="tarefa-toggle" aria-expanded="false">
        <div class="tarefa-head">
          <h4 class="title3">${escapeHtml(tarefa.titulo || "-")}</h4>
          <div class="tarefa-head-right">
            <span class="text2 tarefa-status">${statusLabel}</span>
            <span class="tarefa-chevron" aria-hidden="true"></span>
          </div>
        </div>
      </button>

      <div class="tarefa-body" hidden>
        ${bodyHtml}
      </div>
    `;

    const toggle = article.querySelector(".tarefa-toggle");
    const body = article.querySelector(".tarefa-body");

    toggle?.addEventListener("click", () => {
      const isOpen = article.classList.contains("is-open");

      article.classList.toggle("is-open", !isOpen);
      toggle.setAttribute("aria-expanded", String(!isOpen));
      body.hidden = isOpen;
    });

    const textarea = article.querySelector(".tarefa-textarea");
    const button = article.querySelector(".tarefa-enviar-btn");

    button?.addEventListener("click", async (event) => {
      event.stopPropagation();

      const conteudo = textarea?.value?.trim();

      if (!conteudo) {
        alert("Digite uma resposta antes de enviar.");
        return;
      }

      button.disabled = true;
      button.textContent = "Enviando...";

      try {
        await AlunoService.enviarRespostaTarefa(oferta.ofertaId, tarefa.id, conteudo);
        const tarefasAtualizadas = await carregarTarefasDaOferta(oferta);
        renderTarefasList(container, tarefasAtualizadas, oferta);
      } catch (error) {
        console.error(error);
        alert(error.message || "Erro ao enviar resposta.");
      } finally {
        button.disabled = false;
        button.textContent = "Enviar resposta";
      }
    });

    container.appendChild(article);
  });
}

async function renderCalendario() {
  const host = document.getElementById("alunoSectionHost");
  if (!host) return;

  try {
    await loadSectionHtml(host, "../pages/sections/aluno/calendario.html");

    // Elementos do HTML (já existem no calendario.html)
    const calMonth = host.querySelector("#calMonth");
    const calYear = host.querySelector("#calYear");
    const calDays = host.querySelector("#calDays");
    const calPrev = host.querySelector("#calPrev");
    const calNext = host.querySelector("#calNext");

    const calModal = document.getElementById("calModal");
    const calModalClose = document.getElementById("calModalClose");
    const calModalDate = document.getElementById("calModalDate");
    const calModalList = document.getElementById("calModalList");

    if (!calMonth || !calYear || !calDays || !calPrev || !calNext) return;

    // Carrega um volume grande de eventos e filtra por mês na UI
    // Ajuste o número se precisar (ex.: 300)
    const eventos = await AlunoService.getProximosEventosMe(200);

    // Indexa por dia: "YYYY-MM-DD" -> [eventos]
    const eventosPorDia = indexEventosPorDia(Array.isArray(eventos) ? eventos : []);

    // Estado do mês atual
    let cursor = new Date();
    cursor.setDate(1);

    function render() {
      const year = cursor.getFullYear();
      const month = cursor.getMonth(); // 0..11

      calMonth.textContent = getMonthNamePt(year, month);
      calYear.textContent = String(year);

      calDays.innerHTML = "";

      // Primeiro dia do mês e quantos dias no mês
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      // Calendário começa no domingo (0)
      const startWeekday = firstDay.getDay();

      // Dias do mês anterior para preencher (cinza)
      const prevMonthLastDay = new Date(year, month, 0).getDate();

      // Preenche dias anteriores
      for (let i = 0; i < startWeekday; i++) {
        const dayNumber = prevMonthLastDay - (startWeekday - 1 - i);
        calDays.appendChild(makeDayCell(dayNumber, true, null));
      }

      // Dias do mês atual
      for (let d = 1; d <= lastDay.getDate(); d++) {
        const dateKey = toDateKey(year, month, d);
        const dayEvents = eventosPorDia.get(dateKey) || [];

        calDays.appendChild(makeDayCell(d, false, { dateKey, dayEvents }));
      }

      // Completa a grade com início do próximo mês (até fechar múltiplo de 7)
      const totalCells = startWeekday + lastDay.getDate();
      const remainder = totalCells % 7;
      const fillNext = remainder === 0 ? 0 : 7 - remainder;

      for (let i = 1; i <= fillNext; i++) {
        calDays.appendChild(makeDayCell(i, true, null));
      }
    }

    function makeDayCell(dayNumber, isOutside, payload) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `cal-day${isOutside ? " cal-day--outside" : ""}`;

      // Número do dia
      const dayTop = document.createElement("div");
      dayTop.className = "cal-day__num";
      dayTop.textContent = String(dayNumber);

      btn.appendChild(dayTop);

      if (!isOutside && payload?.dayEvents?.length) {
        const sorted = [...payload.dayEvents].sort((a, b) => {
          const ta = getEventStartLabelSortable(a);
          const tb = getEventStartLabelSortable(b);
          return ta.localeCompare(tb);
        });

        const first = sorted[0];
        const label = first.diaInteiro ? "Dia todo" : formatHora(first.horaInicio);

        const markerRow = document.createElement("div");
        markerRow.className = "cal-day__marker";

        const dot = document.createElement("span");
        dot.className = "cal-dot";
        markerRow.appendChild(dot);

        const time = document.createElement("span");
        time.className = "cal-time";
        time.textContent = label;
        markerRow.appendChild(time);

        btn.appendChild(markerRow);

        btn.addEventListener("click", () => openDayModal(payload.dateKey, sorted));
      } else if (!isOutside) {
        btn.addEventListener("click", () => openDayModal(payload?.dateKey, []));
      }

      return btn;
    }

    function openDayModal(dateKey, dayEvents) {
      if (!calModal || !calModalList || !calModalDate) return;

      calModalList.innerHTML = "";

      const dateText = formatDateBr(dateKey);
      calModalDate.textContent = dateText;

      if (!dayEvents || dayEvents.length === 0) {
        calModalList.innerHTML = `<li class="text2">Nenhum evento neste dia.</li>`;
      } else {
        dayEvents.forEach((ev) => {
          const li = document.createElement("li");
          li.className = "cal-event";

          const hora = ev.diaInteiro ? "Dia todo" : `${formatHora(ev.horaInicio)} - ${formatHora(ev.horaFim)}`;
          li.innerHTML = `
            <div class="cal-event__main">
              <span class="title3 cal-event__title">${escapeHtml(ev.titulo || "-")}</span>
              <span class="text2 cal-event__meta">${escapeHtml(ev.disciplinaNome || "-")}</span>
            </div>
            <div class="cal-event__side">
              <span class="text2">${dateText}</span>
              <span class="text2">${hora}</span>
            </div>
          `;

          calModalList.appendChild(li);
        });
      }

      calModal.classList.add("is-open");
      calModal.setAttribute("aria-hidden", "false");
    }

    function closeModal() {
      if (!calModal) return;
      calModal.classList.remove("is-open");
      calModal.setAttribute("aria-hidden", "true");
    }

    // Navegação de mês
    calPrev.addEventListener("click", () => {
      cursor.setMonth(cursor.getMonth() - 1);
      cursor.setDate(1);
      render();
    });

    calNext.addEventListener("click", () => {
      cursor.setMonth(cursor.getMonth() + 1);
      cursor.setDate(1);
      render();
    });

    // Modal
    calModalClose?.addEventListener("click", closeModal);
    calModal?.addEventListener("click", (e) => {
      if (e.target === calModal) closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });

    render();
  } catch (error) {
    console.error(error);
    host.innerHTML = `
      <section class="calendar-section container with-offset">
        <h2 class="titleMid section-title with-offset">Calendário</h2>
        <p class="text2">Erro ao carregar calendário.</p>
      </section>
    `;
  }
}

/* ===== Helpers ===== */

function indexEventosPorDia(eventos) {
  const map = new Map();

  eventos.forEach((ev) => {
    const key = ev?.data; // já vem "YYYY-MM-DD"
    if (!key) return;

    if (!map.has(key)) map.set(key, []);
    map.get(key).push(ev);
  });

  return map;
}

function toDateKey(year, monthZeroBased, day) {
  const m = String(monthZeroBased + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function getMonthNamePt(year, monthZeroBased) {
  const date = new Date(year, monthZeroBased, 1);
  const nome = date.toLocaleDateString("pt-BR", { month: "long" });
  // "dezembro" -> "Dezembro"
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

function formatDateBr(dateKey) {
  if (!dateKey) return "-";
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("pt-BR", { dateStyle: "full" });
}

function formatHora(hora) {
  if (!hora) return "-";

  // casos esperados:
  // "17:39:16.425Z" (hora isolada)
  // ou ISO completo
  if (typeof hora === "string" && hora.includes("T")) {
    const dt = new Date(hora);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }
  }

  if (typeof hora === "string") {
    // pega HH:MM
    const m = hora.match(/^(\d{2}):(\d{2})/);
    if (m) return `${m[1]}:${m[2]}`;
  }

  return "-";
}

function getEventStartLabelSortable(ev) {
  if (ev?.diaInteiro) return "00:00";
  return formatHora(ev?.horaInicio);
}

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatAnoSemestre(ano, semestre) {
  const anoFormatado = Number(ano || 0);
  const semestreFormatado = Number(semestre || 0);

  if (!anoFormatado && !semestreFormatado) return "-";
  if (!anoFormatado) return `-/${semestreFormatado || "-"}`;
  if (!semestreFormatado) return `${anoFormatado}/-`;

  return `${anoFormatado}/${semestreFormatado}`;
}