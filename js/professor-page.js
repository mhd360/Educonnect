const PROFESSOR_HOST_ID = "professorSectionHost";
const PROFESSOR_PROFILE = "PROFESSOR";

document.addEventListener("DOMContentLoaded", async () => {
    const user = getCurrentUser();

    if (!isProfessor(user)) {
        window.location.href = "./index.html";
        return;
    }

    await initProfileMenu(user);
    initPasswordModal();
    bindHeaderNavigation();

    await navigateToSection("dashboard", user);
});

const notasState = {
    ofertas: [],
    ofertaSelecionada: null,
    alunos: [],
    total: 0,
    page: 1,
    pageSize: 10,
    search: "",
    sort: "nome-asc",
    notaAtual: null,
    notaOriginal: null,
};

function isProfessor(user) {
    return !!user && (user.perfil || "").toUpperCase() === PROFESSOR_PROFILE;
}

function getSectionHost() {
    return document.getElementById(PROFESSOR_HOST_ID);
}

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

    const sectionMap = {
        dashboard: () => renderDashboard(user),
        notas: () => renderNotas(),
        atividades: () => renderAtividades(),
        calendario: () => renderCalendario(),
    };

    const renderFn = sectionMap[sectionName];

    if (!renderFn) {
        renderPlaceholderSection("Seção", "Seção não encontrada.");
        return;
    }

    await renderFn();
}

function setActiveNav(sectionName) {
    const navLinks = document.querySelectorAll(".header-nav .nav-link");

    navLinks.forEach((link) => {
        const isActive = link.dataset.section === sectionName;
        link.classList.toggle("is-active", isActive);
    });
}

async function renderDashboard(user) {
    const host = getSectionHost();
    if (!host) return;

    try {
        await loadSectionHtml(host, "../pages/sections/professor/dashboard.html");

        const nameSpan = host.querySelector(".welcome-name span");
        const avgNode = host.querySelector(".avg-number");
        const eventsContainer = host.querySelector(".events-container");

        if (nameSpan) {
            nameSpan.textContent = user?.nome?.split(" ")[0] || "Professor";
        }

        if (avgNode) {
            avgNode.textContent = "...";
        }

        if (eventsContainer) {
            eventsContainer.innerHTML = `<p class="title3 welcome-text">Carregando...</p>`;
        }

        const [medias, eventos] = await Promise.all([
            ProfessorService.getMediasDashboard(),
            ProfessorService.getProximosEventosMe(3),
        ]);

        if (avgNode) {
            avgNode.textContent = formatOneDecimal(medias?.mediaGeral ?? 0);
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

async function renderNotas() {
    const host = getSectionHost();
    if (!host) return;

    try {
        await loadSectionHtml(host, "../pages/sections/professor/notas.html");

        resetNotasState();
        bindNotaModal();
        bindNotasFilters();

        const searchInput = document.getElementById("notasSearchInput");
        const sortSelect = document.getElementById("notasSortSelect");
        const titulo = document.getElementById("notasTitulo");

        if (searchInput) searchInput.value = "";
        if (sortSelect) sortSelect.value = "nome-asc";
        if (titulo) titulo.textContent = "Selecione uma disciplina";

        const ofertas = await ProfessorService.getMinhasOfertas();
        notasState.ofertas = Array.isArray(ofertas) ? ofertas : [];

        renderOfertasCards();

        if (!notasState.ofertas.length) {
            renderTabelaSemDados("Nenhuma disciplina encontrada.");
            return;
        }

        renderTabelaSemDados("Selecione uma disciplina.");
    } catch (err) {
        console.error(err);
        host.innerHTML = `
      <section class="container welcome-section with-offset">
        <p class="title3 welcome-text">Erro ao carregar a seção de notas.</p>
      </section>
    `;
    }
}

function resetNotasState() {
    notasState.ofertas = [];
    notasState.ofertaSelecionada = null;
    notasState.alunos = [];
    notasState.total = 0;
    notasState.page = 1;
    notasState.pageSize = 10;
    notasState.search = "";
    notasState.sort = "nome-asc";
    notasState.notaAtual = null;
    notasState.notaOriginal = null;
}

async function renderAtividades() {
    renderPlaceholderSection(
        "Atividades",
        "Seção de atividades do professor em construção."
    );
}

async function renderCalendario() {
    renderPlaceholderSection(
        "Calendário",
        "Seção de calendário do professor em construção."
    );
}

function renderPlaceholderSection(title, message) {
    const host = getSectionHost();
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
    profileTurma.textContent = "Professor";

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
            await ProfessorService.alterarSenha(novaSenha, confirmacao);

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

function renderOfertasCards() {
  const cardsContainer = document.getElementById("ofertasCards");
  if (!cardsContainer) return;

  cardsContainer.innerHTML = "";

  if (!notasState.ofertas.length) {
    cardsContainer.innerHTML = `<p class="text2">Nenhuma disciplina disponível.</p>`;
    return;
  }

  for (const oferta of notasState.ofertas) {
    const isActive = notasState.ofertaSelecionada?.ofertaId === oferta.ofertaId;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `disciplina-card${isActive ? " is-active" : ""}`;

    btn.innerHTML = `
      <strong>${escapeHtml(oferta.disciplinaNome || "-")}</strong>
      <span>${escapeHtml(oferta.disciplinaCodigo || "-")}</span>
      <span>${escapeHtml(oferta.turmaNome || "-")}</span>
    `;

    btn.addEventListener("click", async () => {
      notasState.ofertaSelecionada = oferta;
      notasState.page = 1;
      notasState.search = "";

      const searchInput = document.getElementById("notasSearchInput");
      if (searchInput) searchInput.value = "";

      renderOfertasCards();
      await loadAlunosOfertaSelecionada();
    });

    cardsContainer.appendChild(btn);
  }
}

function bindNotasFilters() {
    const searchInput = document.getElementById("notasSearchInput");
    const sortSelect = document.getElementById("notasSortSelect");

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            notasState.search = searchInput.value.trim().toLowerCase();
            renderTabelaAlunos();
            renderPagination();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener("change", () => {
            notasState.sort = sortSelect.value;
            renderTabelaAlunos();
        });
    }
}

async function loadAlunosOfertaSelecionada() {
    const titulo = document.getElementById("notasTitulo");

    if (!notasState.ofertaSelecionada) {
        renderTabelaSemDados("Selecione uma disciplina.");
        return;
    }

    if (titulo) {
        titulo.textContent = `${notasState.ofertaSelecionada.disciplinaNome} - ${notasState.ofertaSelecionada.turmaNome}`;
    }

    renderTabelaCarregando();

    try {
        const response = await ProfessorService.getAlunosDaOferta(
            notasState.ofertaSelecionada.ofertaId,
            notasState.page,
            notasState.pageSize
        );

        const alunosBase = Array.isArray(response?.items) ? response.items : [];

        const alunosComNotas = await Promise.all(
            alunosBase.map(async (aluno) => {
                try {
                    const nota = await ProfessorService.getNotasAluno(
                        notasState.ofertaSelecionada.ofertaId,
                        aluno.id
                    );

                    return {
                        ...aluno,
                        a1: nota?.a1 ?? null,
                        a2: nota?.a2 ?? null,
                        a3: nota?.a3 ?? null,
                        atualizadoEm: nota?.atualizadoEm ?? null,
                    };
                } catch {
                    return {
                        ...aluno,
                        a1: null,
                        a2: null,
                        a3: null,
                        atualizadoEm: null,
                    };
                }
            })
        );

        notasState.total = Number(response?.total || 0);
        notasState.alunos = alunosComNotas;

        renderTabelaAlunos();
        renderPagination();
    } catch (error) {
        console.error(error);
        renderTabelaSemDados("Erro ao carregar alunos da disciplina.");
    }
}

function renderTabelaCarregando() {
    const tbody = document.getElementById("professorGradesTableBody");
    if (!tbody) return;

    tbody.innerHTML = `
    <tr>
      <td colspan="6" class="text2">Carregando...</td>
    </tr>
  `;
}

function renderTabelaSemDados(message) {
    const tbody = document.getElementById("professorGradesTableBody");
    const pagination = document.getElementById("notasPagination");

    if (tbody) {
        tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text2">${escapeHtml(message)}</td>
      </tr>
    `;
    }

    if (pagination) {
        pagination.innerHTML = "";
    }
}

function renderTabelaAlunos() {
  const tbody = document.getElementById("professorGradesTableBody");
  if (!tbody) return;

  if (!notasState.ofertaSelecionada) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text2">Selecione uma disciplina.</td>
      </tr>
    `;
    return;
  }

  const rows = getFilteredAndSortedAlunos();

  if (!rows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text2">Nenhum aluno encontrado.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = "";

  for (const aluno of rows) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="text2">${escapeHtml(aluno.nome || "-")}</td>
      <td class="text2">${formatNota(aluno.a1)}</td>
      <td class="text2">${formatNota(aluno.a2)}</td>
      <td class="text2">${formatNota(aluno.a3)}</td>
      <td class="text2">${calcularMediaNotas(aluno.a1, aluno.a2, aluno.a3)}</td>
      <td>
        <button
          type="button"
          class="nota-edit-btn"
          data-aluno-id="${aluno.id}"
          aria-label="Editar notas"
          title="Editar notas"
        >
          ✏️
        </button>
      </td>
    `;

    const editBtn = tr.querySelector(".nota-edit-btn");
    editBtn.addEventListener("click", async () => {
      await openNotaModal(aluno);
    });

    tbody.appendChild(tr);
  }
}

function getFilteredAndSortedAlunos() {
    let items = [...notasState.alunos];

    if (notasState.search) {
        items = items.filter((aluno) =>
            String(aluno.nome || "").toLowerCase().includes(notasState.search)
        );
    }

    items.sort((a, b) => {
        const nomeA = String(a.nome || "").toLowerCase();
        const nomeB = String(b.nome || "").toLowerCase();

        if (notasState.sort === "nome-desc") {
            return nomeB.localeCompare(nomeA, "pt-BR");
        }

        return nomeA.localeCompare(nomeB, "pt-BR");
    });

    return items;
}

function renderPagination() {
    const container = document.getElementById("notasPagination");
    if (!container) return;

    const totalPages = Math.max(1, Math.ceil(notasState.total / notasState.pageSize));

    container.innerHTML = "";

    if (totalPages <= 1) return;

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "text2";
    prevBtn.textContent = "Anterior";
    prevBtn.disabled = notasState.page <= 1;
    prevBtn.addEventListener("click", async () => {
        if (notasState.page <= 1) return;
        notasState.page -= 1;
        await loadAlunosOfertaSelecionada();
    });

    const pageInfo = document.createElement("span");
    pageInfo.className = "text2";
    pageInfo.textContent = `Página ${notasState.page} de ${totalPages}`;

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "text2";
    nextBtn.textContent = "Próxima";
    nextBtn.disabled = notasState.page >= totalPages;
    nextBtn.addEventListener("click", async () => {
        if (notasState.page >= totalPages) return;
        notasState.page += 1;
        await loadAlunosOfertaSelecionada();
    });

    container.appendChild(prevBtn);
    container.appendChild(pageInfo);
    container.appendChild(nextBtn);
}

function bindNotaModal() {
  const modal = document.getElementById("notaModal");
  const closeBtn = document.getElementById("notaModalClose");
  const form = document.getElementById("notaForm");
  const btnConfirm = document.getElementById("notaConfirmBtn");

  if (!modal || !closeBtn || !form || !btnConfirm) return;

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");

  form.reset();
  btnConfirm.disabled = true;

  closeBtn.addEventListener("click", closeNotaModal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeNotaModal();
    }
  });

  form.addEventListener("input", () => {
    syncNotaConfirmButton();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const erro = document.getElementById("notaFormError");
    const notaA1 = document.getElementById("notaA1");
    const notaA2 = document.getElementById("notaA2");
    const notaA3 = document.getElementById("notaA3");

    if (erro) {
      erro.style.display = "none";
      erro.textContent = "";
    }

    if (!notasState.ofertaSelecionada || !notasState.notaAtual) {
      if (erro) {
        erro.textContent = "Não foi possível identificar o aluno.";
        erro.style.display = "block";
      }
      return;
    }

    const payload = {
      a1: normalizeNotaInput(notaA1?.value),
      a2: normalizeNotaInput(notaA2?.value),
      a3: normalizeNotaInput(notaA3?.value),
    };

    const isValid = [payload.a1, payload.a2, payload.a3].every(isNotaValidaOuNula);

    if (!isValid) {
      if (erro) {
        erro.textContent = "As notas devem estar entre 0 e 10.";
        erro.style.display = "block";
      }
      return;
    }

    setButtonLoading(btnConfirm, true, "Salvando...", "Confirmar");

    try {
      await ProfessorService.atualizarNotasAluno(
        notasState.ofertaSelecionada.ofertaId,
        notasState.notaAtual.alunoId,
        payload
      );

      const alunoIndex = notasState.alunos.findIndex(
        (item) => item.id === notasState.notaAtual.alunoId
      );

      const atualizadoEm = new Date().toISOString();

      if (alunoIndex >= 0) {
        notasState.alunos[alunoIndex] = {
          ...notasState.alunos[alunoIndex],
          a1: payload.a1,
          a2: payload.a2,
          a3: payload.a3,
          atualizadoEm,
        };
      }

      renderTabelaAlunos();
      renderPagination();
      closeNotaModal();

      if (typeof Toastify === "function") {
        Toastify({
          text: "Notas atualizadas com sucesso.",
          duration: 3000,
          gravity: "top",
          position: "right",
          close: true,
          stopOnFocus: true,
          style: { background: "#2e7d32" },
        }).showToast();
      }
    } catch (error) {
      if (erro) {
        erro.textContent = error.message || "Erro ao atualizar notas.";
        erro.style.display = "block";
      }
    } finally {
      setButtonLoading(btnConfirm, false, null, "Confirmar");
      syncNotaConfirmButton();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closeNotaModal();
    }
  });
}

async function openNotaModal(aluno) {
    const modal = document.getElementById("notaModal");
    const alunoNome = document.getElementById("notaModalAlunoNome");
    const notaA1 = document.getElementById("notaA1");
    const notaA2 = document.getElementById("notaA2");
    const notaA3 = document.getElementById("notaA3");
    const ultimaAlteracao = document.getElementById("notaUltimaAlteracao");
    const erro = document.getElementById("notaFormError");
    const confirmBtn = document.getElementById("notaConfirmBtn");

    if (!modal || !alunoNome || !notaA1 || !notaA2 || !notaA3 || !ultimaAlteracao) {
        return;
    }

    if (erro) {
        erro.style.display = "none";
        erro.textContent = "";
    }

    if (confirmBtn) {
        confirmBtn.disabled = true;
    }

    alunoNome.textContent = aluno.nome || "Aluno";
    notaA1.value = "";
    notaA2.value = "";
    notaA3.value = "";
    ultimaAlteracao.textContent = "Carregando...";
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");

    try {
        const nota = await ProfessorService.getNotasAluno(
            notasState.ofertaSelecionada.ofertaId,
            aluno.id
        );

        notasState.notaAtual = {
            ofertaId: nota.ofertaId,
            alunoId: nota.alunoId,
            nome: nota.nome,
            a1: nota.a1,
            a2: nota.a2,
            a3: nota.a3,
            atualizadoEm: nota.atualizadoEm,
        };

        const snapshot = {
            a1: nota.a1 ?? null,
            a2: nota.a2 ?? null,
            a3: nota.a3 ?? null,
        };

        notasState.notaOriginal = JSON.stringify(snapshot);

        notaA1.value = nota.a1 ?? "";
        notaA2.value = nota.a2 ?? "";
        notaA3.value = nota.a3 ?? "";

        ultimaAlteracao.textContent = `Última alteração ${formatDateTimeBr(nota.atualizadoEm)}`;
        syncNotaConfirmButton();
    } catch (error) {
        console.error(error);
        ultimaAlteracao.textContent = "Erro ao carregar notas.";
    }
}

function closeNotaModal() {
  const modal = document.getElementById("notaModal");
  const form = document.getElementById("notaForm");
  const erro = document.getElementById("notaFormError");
  const confirmBtn = document.getElementById("notaConfirmBtn");
  const ultimaAlteracao = document.getElementById("notaUltimaAlteracao");

  if (!modal) return;

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");

  if (form) form.reset();

  if (erro) {
    erro.style.display = "none";
    erro.textContent = "";
  }

  if (ultimaAlteracao) {
    ultimaAlteracao.textContent = "Última alteração -";
  }

  if (confirmBtn) {
    confirmBtn.disabled = true;
  }

  notasState.notaAtual = null;
  notasState.notaOriginal = null;
}

function syncNotaConfirmButton() {
    const btn = document.getElementById("notaConfirmBtn");
    const a1 = document.getElementById("notaA1");
    const a2 = document.getElementById("notaA2");
    const a3 = document.getElementById("notaA3");

    if (!btn || !a1 || !a2 || !a3) return;

    const current = {
        a1: normalizeNotaInput(a1.value),
        a2: normalizeNotaInput(a2.value),
        a3: normalizeNotaInput(a3.value),
    };

    const hasChanged = JSON.stringify(current) !== notasState.notaOriginal;
    const isValid = [current.a1, current.a2, current.a3].every(isNotaValidaOuNula);

    btn.disabled = !(hasChanged && isValid);
}

function normalizeNotaInput(value) {
    if (value === "" || value === null || value === undefined) return null;

    const num = Number(String(value).replace(",", "."));
    return Number.isFinite(num) ? num : NaN;
}

function isNotaValidaOuNula(value) {
    if (value === null) return true;
    return Number.isFinite(value) && value >= 0 && value <= 10;
}

function formatNota(value) {
    if (value === null || value === undefined || value === "") return "-";

    const num = Number(value);
    if (!Number.isFinite(num)) return "-";

    return num.toFixed(1);
}

function calcularMediaNotas(a1, a2, a3) {
    const notas = [a1, a2, a3].filter((n) => Number.isFinite(Number(n)));
    if (!notas.length) return "-";

    const total = notas.reduce((acc, n) => acc + Number(n), 0);
    return (total / notas.length).toFixed(1);
}

function formatDateTimeBr(value) {
    if (!value) return "-";

    const dt = new Date(value);
    if (isNaN(dt.getTime())) return "-";

    const dia = String(dt.getDate()).padStart(2, "0");
    const mes = String(dt.getMonth() + 1).padStart(2, "0");
    const ano = dt.getFullYear();
    const hora = String(dt.getHours()).padStart(2, "0");
    const minuto = String(dt.getMinutes()).padStart(2, "0");

    return `${dia}/${mes}/${ano} - ${hora}:${minuto}`;
}