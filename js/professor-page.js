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
        frequencia: () => renderFrequencia(),
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
        const sortLabel = document.getElementById("notasSortLabel");
        const titulo = document.getElementById("notasTitulo");

        if (searchInput) searchInput.value = "";
        if (sortLabel) sortLabel.textContent = "Nome A → Z";
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
    const host = getSectionHost();
    if (!host) return;

    try {
        await loadSectionHtml(host, "../pages/sections/professor/atividades.html");

        resetAtividadesState();
        bindAtividadesEvents();
        bindTarefaModal();
        bindCorrecaoModal();

        const ofertas = await ProfessorService.getMinhasOfertas();
        atividadesState.ofertas = Array.isArray(ofertas) ? ofertas : [];

        renderAtividadesOfertasCards();

        if (!atividadesState.ofertas.length) {
            renderAtividadesEmptyState("Nenhuma disciplina encontrada.");
            return;
        }

        renderAtividadesEmptyState("Selecione uma disciplina.");
    } catch (error) {
        console.error(error);
        host.innerHTML = `
      <section class="container welcome-section with-offset">
        <p class="title3 welcome-text">Erro ao carregar a seção de atividades.</p>
      </section>
    `;
    }
}

async function renderFrequencia() {
    const host = getSectionHost();
    if (!host) return;

    try {
        await loadSectionHtml(host, "../pages/sections/professor/frequencia.html");

        resetFrequenciaState();
        bindFrequenciaEvents();

        const ofertas = await ProfessorService.getMinhasOfertas();
        frequenciaState.ofertas = Array.isArray(ofertas) ? ofertas : [];

        renderFrequenciaOfertasCards();

        if (!frequenciaState.ofertas.length) {
            renderFrequenciaEmpty("Nenhuma disciplina encontrada.");
            return;
        }

        renderFrequenciaEmpty("Selecione uma disciplina.");
    } catch (error) {
        console.error(error);
        host.innerHTML = `
      <section class="container welcome-section with-offset">
        <p class="title3 welcome-text">Erro ao carregar a seção de frequência.</p>
      </section>
    `;
    }
}

const frequenciaState = {
    ofertas: [],
    ofertaSelecionada: null,
    alunos: [],

    totalAulas: 0,
    totalAulasSnapshot: 0,

    numeroAula: 1,

    // alunoId -> presente(true/false)
    presencas: new Map(),
    presencasSnapshot: new Map(),

    // numeroAula -> Set(alunoId) ausentes
    faltasPorAula: new Map(),
};

function resetFrequenciaState() {
    frequenciaState.ofertas = [];
    frequenciaState.ofertaSelecionada = null;
    frequenciaState.alunos = [];
    frequenciaState.totalAulas = 0;
    frequenciaState.numeroAula = 1;
    frequenciaState.presencas = new Map();
    frequenciaState.presencasSnapshot = new Map();
    frequenciaState.faltasPorAula = new Map();
}

function bindFrequenciaEvents() {
    const aulaSelect = document.getElementById("frequenciaAulaSelect");
    const totalAulasInput = document.getElementById("frequenciaTotalAulas");
    const salvarBtn = document.getElementById("frequenciaSalvarBtn");

    aulaSelect?.addEventListener("change", () => {
        frequenciaState.numeroAula = Number(aulaSelect.value) || 1;

        applyPresencasFromGrade();
        renderFrequenciaTable();
        syncFrequenciaSaveButton();
    });

    totalAulasInput?.addEventListener("input", () => {
        const v = Number(totalAulasInput.value);
        frequenciaState.totalAulas = Number.isFinite(v) ? v : 0;

        rebuildAulaSelectOptions();
        applyPresencasFromGrade(); // re-marca a aula selecionada
        renderFrequenciaTable();
        syncFrequenciaSaveButton();
    });

    salvarBtn?.addEventListener("click", async () => {
        await saveFrequencia();
    });
}

function applyPresencasFromGrade() {
    const aula = Number(frequenciaState.numeroAula);
    const ausentesSet = frequenciaState.faltasPorAula.get(aula) || new Set();

    frequenciaState.presencas = new Map();
    frequenciaState.presencasSnapshot = new Map();

    for (const aluno of frequenciaState.alunos) {
        const alunoId = Number(aluno.id);
        const presente = !ausentesSet.has(alunoId);
        frequenciaState.presencas.set(alunoId, presente);
        frequenciaState.presencasSnapshot.set(alunoId, presente);
    }
}

function renderFrequenciaEmpty(message) {
    const tbody = document.getElementById("frequenciaTableBody");
    const titulo = document.getElementById("frequenciaTitulo");
    const aulaSelect = document.getElementById("frequenciaAulaSelect");
    const totalAulasInput = document.getElementById("frequenciaTotalAulas");
    const salvarBtn = document.getElementById("frequenciaSalvarBtn");

    if (titulo && !frequenciaState.ofertaSelecionada) {
        titulo.textContent = "Selecione uma disciplina";
    }

    if (tbody) {
        tbody.innerHTML = `
      <tr>
        <td colspan="2" class="text2">${escapeHtml(message)}</td>
      </tr>
    `;
    }

    if (aulaSelect) aulaSelect.disabled = !frequenciaState.ofertaSelecionada;
    if (totalAulasInput) totalAulasInput.disabled = !frequenciaState.ofertaSelecionada;
    if (salvarBtn) salvarBtn.disabled = true;
}

function renderFrequenciaOfertasCards() {
    const cardsContainer = document.getElementById("frequenciaOfertasCards");
    if (!cardsContainer) return;

    cardsContainer.innerHTML = "";

    if (!frequenciaState.ofertas.length) {
        cardsContainer.innerHTML = `<p class="text2">Nenhuma disciplina disponível.</p>`;
        return;
    }

    for (const oferta of frequenciaState.ofertas) {
        const isActive = frequenciaState.ofertaSelecionada?.ofertaId === oferta.ofertaId;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `disciplina-card${isActive ? " is-active" : ""}`;

        btn.innerHTML = `
      <div class="professor-disciplina-card-top">
        <h4 class="title3">${escapeHtml(oferta.disciplinaNome || "-")}</h4>
      </div>
      <div class="professor-disciplina-card-body">
        <p class="text2">${escapeHtml(oferta.disciplinaCodigo || "-")}</p>
        <p class="text2">${escapeHtml(oferta.turmaNome || "-")}</p>
      </div>
    `;

        btn.addEventListener("click", async () => {
            frequenciaState.ofertaSelecionada = oferta;
            renderFrequenciaOfertasCards();
            await loadFrequenciaOferta();
        });

        cardsContainer.appendChild(btn);
    }
}

async function loadFrequenciaOferta() {
    const titulo = document.getElementById("frequenciaTitulo");
    const aulaSelect = document.getElementById("frequenciaAulaSelect");
    const totalAulasInput = document.getElementById("frequenciaTotalAulas");
    const salvarBtn = document.getElementById("frequenciaSalvarBtn");

    if (!frequenciaState.ofertaSelecionada) {
        renderFrequenciaEmpty("Selecione uma disciplina.");
        return;
    }

    if (titulo) {
        titulo.textContent = `${frequenciaState.ofertaSelecionada.disciplinaNome} - ${frequenciaState.ofertaSelecionada.turmaNome}`;
    }

    aulaSelect && (aulaSelect.disabled = false);
    totalAulasInput && (totalAulasInput.disabled = false);
    salvarBtn && (salvarBtn.disabled = true);

    renderFrequenciaLoading();

    try {
        const ofertaId = frequenciaState.ofertaSelecionada.ofertaId;

        const [alunosResp, totalResp, faltasResp] = await Promise.all([
            // use a rota já usada em Notas
            ProfessorService.getAlunosDaOferta(ofertaId, 1, 999),
            ProfessorService.getTotalAulas(ofertaId),
            ProfessorService.getGradeFaltas(ofertaId),
        ]);

        frequenciaState.alunos = Array.isArray(alunosResp?.items) ? alunosResp.items : [];

        // total aulas vindo do back
        const total = Number(totalResp?.totalAulas ?? 0);
        frequenciaState.totalAulas = Number.isFinite(total) && total > 0 ? total : 1;
        frequenciaState.totalAulasSnapshot = frequenciaState.totalAulas;
        if (totalAulasInput) totalAulasInput.value = String(frequenciaState.totalAulas);

        // montar Map(numeroAula -> Set(alunoId))
        frequenciaState.faltasPorAula = buildFaltasMap(faltasResp);

        // select de aulas e aula atual
        rebuildAulaSelectOptions();

        // marcar presenças conforme a aula selecionada
        applyPresencasFromGrade();

        renderFrequenciaTable();
        syncFrequenciaSaveButton();
    } catch (err) {
        console.error(err);
        renderFrequenciaEmpty("Erro ao carregar alunos.");
    }
}

function renderFrequenciaLoading() {
    const tbody = document.getElementById("frequenciaTableBody");
    if (!tbody) return;

    tbody.innerHTML = `
    <tr>
      <td colspan="2" class="text2">Carregando...</td>
    </tr>
  `;
}

function buildFaltasMap(apiResponse) {
    const map = new Map();
    const arr = Array.isArray(apiResponse) ? apiResponse : [];

    for (const item of arr) {
        const numeroAula = Number(item?.numeroAula);
        if (!Number.isFinite(numeroAula)) continue;

        const set = new Set();
        const alunos = Array.isArray(item?.alunos) ? item.alunos : [];
        for (const a of alunos) {
            if (a?.alunoId != null) set.add(Number(a.alunoId));
        }

        map.set(numeroAula, set);
    }

    return map;
}

function rebuildAulaSelectOptions() {
    const aulaSelect = document.getElementById("frequenciaAulaSelect");
    if (!aulaSelect) return;

    const total = Math.max(1, Math.floor(Number(frequenciaState.totalAulas || 1)));
    const current = Math.min(Math.max(1, frequenciaState.numeroAula), total);

    aulaSelect.innerHTML = "";
    for (let i = 1; i <= total; i++) {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = `Aula ${i}`;
        aulaSelect.appendChild(opt);
    }

    frequenciaState.numeroAula = current;
    aulaSelect.value = String(current);
}

function initPresencasAllPresent() {
    frequenciaState.presencas = new Map();
    frequenciaState.presencasSnapshot = new Map();

    for (const aluno of frequenciaState.alunos) {
        frequenciaState.presencas.set(aluno.id, true);
        frequenciaState.presencasSnapshot.set(aluno.id, true);
    }
}

function renderFrequenciaTable() {
    const tbody = document.getElementById("frequenciaTableBody");
    if (!tbody) return;

    if (!frequenciaState.ofertaSelecionada) {
        renderFrequenciaEmpty("Selecione uma disciplina.");
        return;
    }

    if (!frequenciaState.alunos.length) {
        tbody.innerHTML = `
      <tr>
        <td colspan="2" class="text2">Nenhum aluno matriculado.</td>
      </tr>
    `;
        return;
    }

    tbody.innerHTML = "";

    const sorted = [...frequenciaState.alunos].sort((a, b) =>
        String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR")
    );

    for (const aluno of sorted) {
        const isPresent = frequenciaState.presencas.get(aluno.id) !== false;

        const tr = document.createElement("tr");
        tr.innerHTML = `
      <td class="text2">${escapeHtml(aluno.nome || "-")}</td>
      <td class="text2">
        <input
          type="checkbox"
          class="freq-check"
          data-aluno-id="${aluno.id}"
          ${isPresent ? "checked" : ""}
        />
      </td>
    `;

        tbody.appendChild(tr);
    }

    tbody.querySelectorAll(".freq-check").forEach((chk) => {
        chk.addEventListener("change", () => {
            const alunoId = Number(chk.dataset.alunoId);
            frequenciaState.presencas.set(alunoId, chk.checked);
            syncFrequenciaSaveButton();
        });
    });
}

function syncFrequenciaSaveButton() {
    const salvarBtn = document.getElementById("frequenciaSalvarBtn");
    if (!salvarBtn) return;

    if (!frequenciaState.ofertaSelecionada) {
        salvarBtn.disabled = true;
        return;
    }

    const total = Math.floor(Number(frequenciaState.totalAulas || 0));
    const totalOk = Number.isFinite(total) && total >= 1;

    const totalChanged = total !== Number(frequenciaState.totalAulasSnapshot || 0);
    const presencasChanged = hasPresencasChanged();

    salvarBtn.disabled = !(totalOk && (totalChanged || presencasChanged));
}

function hasPresencasChanged() {
    for (const [alunoId, present] of frequenciaState.presencas.entries()) {
        const old = frequenciaState.presencasSnapshot.get(alunoId);
        if (old !== present) return true;
    }
    return false;
}

async function saveFrequencia() {
    const errorNode = document.getElementById("frequenciaError");
    const salvarBtn = document.getElementById("frequenciaSalvarBtn");

    if (errorNode) {
        errorNode.style.display = "none";
        errorNode.textContent = "";
    }

    if (!frequenciaState.ofertaSelecionada) return;

    const ofertaId = frequenciaState.ofertaSelecionada.ofertaId;
    const numeroAula = Number(frequenciaState.numeroAula);
    const totalAulas = Math.floor(Number(frequenciaState.totalAulas || 0));

    if (!Number.isFinite(numeroAula) || numeroAula < 1) {
        if (errorNode) {
            errorNode.textContent = "Selecione a aula.";
            errorNode.style.display = "block";
        }
        return;
    }

    if (!Number.isFinite(totalAulas) || totalAulas < 1) {
        if (errorNode) {
            errorNode.textContent = "Total de aulas deve ser no mínimo 1.";
            errorNode.style.display = "block";
        }
        return;
    }

    setButtonLoading(salvarBtn, true, "Salvando...", "Salvar");

    try {
        // 1) salvar total de aulas
        await ProfessorService.setTotalAulas(ofertaId, totalAulas);

        // 2) salvar faltas (diff)
        const ops = [];

        for (const aluno of frequenciaState.alunos) {
            const alunoId = aluno.id;
            const nowPresent = frequenciaState.presencas.get(alunoId) !== false;
            const wasPresent = frequenciaState.presencasSnapshot.get(alunoId) !== false;

            if (nowPresent === wasPresent) continue;

            if (!nowPresent) {
                ops.push(() => ProfessorService.registrarFalta(ofertaId, alunoId, numeroAula));
            } else {
                ops.push(() => ProfessorService.removerFalta(ofertaId, alunoId, numeroAula));
            }
        }

        // executa em paralelo (limite simples)
        await Promise.all(ops.map((fn) => fn()));

        // atualiza snapshot
        frequenciaState.totalAulasSnapshot = Math.floor(Number(frequenciaState.totalAulas));
        frequenciaState.presencasSnapshot = new Map(frequenciaState.presencas);

        // atualiza cache de faltas da aula atual
        const aula = Number(frequenciaState.numeroAula);
        const set = new Set();
        for (const [alunoId, presente] of frequenciaState.presencas.entries()) {
            if (presente === false) set.add(Number(alunoId));
        }
        frequenciaState.faltasPorAula.set(aula, set);

        syncFrequenciaSaveButton();
    } catch (err) {
        if (errorNode) {
            errorNode.textContent = err.message || "Erro ao salvar frequência.";
            errorNode.style.display = "block";
        }
    } finally {
        setButtonLoading(salvarBtn, false, null, "Salvar");
    }
}

async function renderCalendario() {
    const host = document.getElementById("professorSectionHost");
    if (!host) return;

    try {
        await loadSectionHtml(host, "../pages/sections/professor/calendario.html");

        const calMonth = host.querySelector("#calMonth");
        const calYear = host.querySelector("#calYear");
        const calDays = host.querySelector("#calDays");
        const calPrev = host.querySelector("#calPrev");
        const calNext = host.querySelector("#calNext");

        const calNewEventBtn = host.querySelector("#calNewEventBtn");

        const calModal = document.getElementById("calModal");
        const calModalClose = document.getElementById("calModalClose");
        const calModalDate = document.getElementById("calModalDate");
        const calModalList = document.getElementById("calModalList");

        const calEventModal = document.getElementById("calEventModal");
        const calEventModalClose = document.getElementById("calEventModalClose");
        const calEventForm = document.getElementById("calEventForm");
        const calEventModalTitle = document.getElementById("calEventModalTitle");
        const calEventModalSubtitle = document.getElementById("calEventModalSubtitle");
        const calEventOferta = document.getElementById("calEventOferta");
        const calEventTitulo = document.getElementById("calEventTitulo");
        const calEventDescricao = document.getElementById("calEventDescricao");
        const calEventDiaInteiro = document.getElementById("calEventDiaInteiro");
        const calEventData = document.getElementById("calEventData");
        const calEventInicio = document.getElementById("calEventInicio");
        const calEventFim = document.getElementById("calEventFim");
        const calEventDeleteBtn = document.getElementById("calEventDeleteBtn");
        const calEventSubmitBtn = document.getElementById("calEventSubmitBtn");
        const calEventError = document.getElementById("calEventError");
        const calDeleteConfirmModal = document.getElementById("calDeleteConfirmModal");
        const calDeleteClose = document.getElementById("calDeleteClose");
        const calDeleteDesc = document.getElementById("calDeleteDesc");
        const calDeleteCancelBtn = document.getElementById("calDeleteCancelBtn");
        const calDeleteConfirmBtn = document.getElementById("calDeleteConfirmBtn");

        if (!calMonth || !calYear || !calDays || !calPrev || !calNext) return;

        // === cache/estado ===
        const ofertas = await ProfessorService.getMinhasOfertas();
        const ofertasArr = Array.isArray(ofertas) ? ofertas : [];

        let eventosArr = [];
        let eventosPorDia = new Map();

        let selectedDayKey = null;
        let editingEvent = null; // objeto evento completo

        let cursor = new Date();
        cursor.setDate(1);

        function indexEventosPorDiaLocal(eventos) {
            const map = new Map();
            eventos.forEach((ev) => {
                const key = ev?.data; // "YYYY-MM-DD"
                if (!key) return;
                if (!map.has(key)) map.set(key, []);
                map.get(key).push(ev);
            });
            return map;
        }

        async function refreshEventos() {
            eventosArr = await ProfessorService.getEventosProfessorMe();
            eventosArr = Array.isArray(eventosArr) ? eventosArr : [];
            eventosPorDia = indexEventosPorDiaLocal(eventosArr);
        }

        function render() {
            const year = cursor.getFullYear();
            const month = cursor.getMonth();

            calMonth.textContent = getMonthNamePt(year, month);
            calYear.textContent = String(year);
            calDays.innerHTML = "";

            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const startWeekday = firstDay.getDay();
            const prevMonthLastDay = new Date(year, month, 0).getDate();

            for (let i = 0; i < startWeekday; i++) {
                const dayNumber = prevMonthLastDay - (startWeekday - 1 - i);
                calDays.appendChild(makeDayCell(dayNumber, true, null));
            }

            for (let d = 1; d <= lastDay.getDate(); d++) {
                const dateKey = toDateKey(year, month, d);
                const dayEvents = eventosPorDia.get(dateKey) || [];
                calDays.appendChild(makeDayCell(d, false, { dateKey, dayEvents }));
            }

            const totalCells = startWeekday + lastDay.getDate();
            const remainder = totalCells % 7;
            const fillNext = remainder === 0 ? 0 : 7 - remainder;

            for (let i = 1; i <= fillNext; i++) {
                calDays.appendChild(makeDayCell(i, true, null));
            }
        }

        function getMonthNamePt(year, monthZeroBased) {
            const date = new Date(year, monthZeroBased, 1);
            const nome = date.toLocaleDateString("pt-BR", { month: "long" });
            // "dezembro" -> "Dezembro"
            return nome.charAt(0).toUpperCase() + nome.slice(1);
        }

        function toDateKey(year, monthZeroBased, day) {
            const m = String(monthZeroBased + 1).padStart(2, "0");
            const d = String(day).padStart(2, "0");
            return `${year}-${m}-${d}`;
        }

        function makeDayCell(dayNumber, isOutside, payload) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = `cal-day${isOutside ? " cal-day--outside" : ""}`;

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

                const maxSlots = 4;
                const showCount = sorted.length >= 5 ? 3 : Math.min(sorted.length, maxSlots);
                const show = sorted.slice(0, showCount);

                const markers = document.createElement("div");
                markers.className = "cal-day__markers";

                show.forEach((ev) => {
                    const label = ev.diaInteiro ? "Dia todo" : formatHora(ev.horaInicio);
                    const row = document.createElement("div");
                    row.className = "cal-day__marker";

                    const dot = document.createElement("span");
                    dot.className = "cal-dot";
                    row.appendChild(dot);

                    const time = document.createElement("span");
                    time.className = "cal-time";
                    time.textContent = label;
                    row.appendChild(time);

                    markers.appendChild(row);
                });

                if (sorted.length >= 5) {
                    const remaining = sorted.length - 3;
                    const more = document.createElement("div");
                    more.className = "cal-day__more";
                    more.textContent = `+${remaining}`;
                    markers.appendChild(more);
                }

                btn.appendChild(markers);
                btn.addEventListener("click", () => openDayModal(payload.dateKey, sorted));
            } else if (!isOutside) {
                btn.addEventListener("click", () => {
                    // se não há eventos, já abre criação com a data do dia
                    openEventModalCreate(payload?.dateKey);
                });
            }

            if (!isOutside && payload?.dateKey) {
                const today = new Date();
                const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());
                if (payload.dateKey === todayKey) btn.classList.add("cal-day--today");
            }

            return btn;
        }

        function openDayModal(dateKey, dayEvents) {
            if (!calModal || !calModalList || !calModalDate) return;

            selectedDayKey = dateKey;
            calModalList.innerHTML = "";
            calModalDate.textContent = formatDateBr(dateKey);
            calModalList.innerHTML = `
                <li class="cal-modal-actions">
                    <button type="button" class="boletim-btn text1" id="calDayNewEventBtn">
                    Novo evento
                    </button>
                </li>
                `;

            const dayNewBtn = document.getElementById("calDayNewEventBtn");
            dayNewBtn?.addEventListener("click", () => {
                closeDayModal();
                openEventModalCreate(dateKey);
            });

            if (!dayEvents || dayEvents.length === 0) {
                const empty = document.createElement("li");
                empty.className = "text2";
                empty.textContent = "Nenhum evento neste dia.";
                calModalList.appendChild(empty);
            } else {
                dayEvents.forEach((ev) => {
                    const li = document.createElement("li");
                    li.className = "cal-event";

                    const hora = ev.diaInteiro
                        ? "Dia todo"
                        : `${formatHora(ev.horaInicio)} - ${formatHora(ev.horaFim)}`;

                    li.innerHTML = `
            <div class="cal-event__main">
              <span class="title3 cal-event__title">${escapeHtml(ev.titulo || "-")}</span>
              <span class="text2 cal-event__meta">${escapeHtml(ev.disciplinaNome || "-")}</span>
            </div>
            <div class="cal-event__side">
              <span class="text2 cal-event__time">${hora}</span>
            </div>
          `;

                    li.addEventListener("click", () => openEventModalEdit(ev));
                    calModalList.appendChild(li);
                });
            }

            calModal.classList.add("is-open");
            calModal.setAttribute("aria-hidden", "false");
        }

        function closeDayModal() {
            if (!calModal) return;
            calModal.classList.remove("is-open");
            calModal.setAttribute("aria-hidden", "true");
        }

        function setTimeEnabled() {
            const enabled = !calEventDiaInteiro.checked;

            calEventInicio.disabled = !enabled;
            calEventFim.disabled = !enabled;

            calEventInicio.classList.toggle("is-disabled", !enabled);
            calEventFim.classList.toggle("is-disabled", !enabled);
        }

        function fillOfertaSelect(selectedOfertaId, disabled = false) {
            calEventOferta.innerHTML = "";
            ofertasArr.forEach((o) => {
                const opt = document.createElement("option");
                opt.value = String(o.ofertaId);
                opt.textContent = `${o.disciplinaNome} (${o.turmaNome})`;
                calEventOferta.appendChild(opt);
            });

            if (selectedOfertaId != null) {
                calEventOferta.value = String(selectedOfertaId);
            }

            calEventOferta.disabled = disabled;
        }

        function openEventModalCreate(dateKey) {
            editingEvent = null;

            calEventModalTitle.textContent = "Novo evento";
            calEventModalSubtitle.textContent = "";

            fillOfertaSelect(ofertasArr[0]?.ofertaId ?? null, false);

            calEventTitulo.value = "";
            calEventDescricao.value = "";
            calEventDiaInteiro.checked = true;

            calEventData.value = dateKey || toDateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

            calEventInicio.value = "08:00";
            calEventFim.value = "09:00";
            setTimeEnabled();

            calEventDeleteBtn.style.display = "none";
            calEventSubmitBtn.textContent = "Criar evento";

            if (calEventError) {
                calEventError.style.display = "none";
                calEventError.textContent = "";
            }

            calEventModal.classList.add("is-open");
            calEventModal.setAttribute("aria-hidden", "false");
        }

        calDeleteConfirmBtn?.addEventListener("click", async () => {
            if (!editingEvent) return;

            try {
                await ProfessorService.excluirEvento(editingEvent.ofertaId, editingEvent.eventoId);

                closeDeleteConfirmModal();
                closeEventModal();

                await refreshEventos();
                render();
            } catch (err) {
                closeDeleteConfirmModal();

                if (calEventError) {
                    calEventError.textContent = err.message || "Erro ao excluir evento.";
                    calEventError.style.display = "block";
                }
            }
        });

        function openEventModalEdit(ev) {
            editingEvent = ev;

            calEventModalTitle.textContent = "Editar evento";
            calEventModalSubtitle.textContent = `${ev.disciplinaNome || ""}`;

            fillOfertaSelect(ev.ofertaId, true);

            calEventTitulo.value = ev.titulo || "";
            calEventDescricao.value = ev.descricao || "";
            calEventDiaInteiro.checked = !!ev.diaInteiro;

            calEventData.value = ev.data;

            calEventInicio.value = timeToHHMM(ev.horaInicio) || "08:00";
            calEventFim.value = timeToHHMM(ev.horaFim) || "09:00";
            setTimeEnabled();

            calEventDeleteBtn.style.display = "inline-flex";
            calEventSubmitBtn.textContent = "Salvar alterações";

            if (calEventError) {
                calEventError.style.display = "none";
                calEventError.textContent = "";
            }

            closeDayModal();

            calEventModal.classList.add("is-open");
            calEventModal.setAttribute("aria-hidden", "false");
        }

        function closeEventModal() {
            calEventModal.classList.remove("is-open");
            calEventModal.setAttribute("aria-hidden", "true");
        }

        function timeToApiFormat(hhmm) {
            if (!hhmm) return null;

            const m = String(hhmm).match(/^(\d{2}):(\d{2})/);
            if (!m) return null;

            return `${m[1]}:${m[2]}`; // HH:mm
        }

        function timeToHHMM(value) {
            if (!value) return "";
            if (typeof value === "string") {
                const m = value.match(/^(\d{2}):(\d{2})/);
                if (m) return `${m[1]}:${m[2]}`;
            }
            const dt = new Date(value);
            if (!Number.isNaN(dt.getTime())) {
                const hh = String(dt.getHours()).padStart(2, "0");
                const mm = String(dt.getMinutes()).padStart(2, "0");
                return `${hh}:${mm}`;
            }
            return "";
        }

        function validateEventForm() {
            const titulo = (calEventTitulo.value || "").trim();
            const data = calEventData.value;
            if (!titulo) return "Informe o título.";
            if (!data) return "Informe a data.";

            if (!calEventDiaInteiro.checked) {
                if (!calEventInicio.value || !calEventFim.value) return "Informe início e fim.";
            }
            return "";
        }

        function openDeleteConfirmModal(ev) {
            if (!calDeleteConfirmModal || !calDeleteDesc) return;

            calDeleteDesc.innerHTML = `
    <strong>${escapeHtml(ev.titulo || "-")}</strong><br />
    ${escapeHtml(ev.disciplinaNome || "-")} • ${formatDateBr(ev.data)}
  `;

            calDeleteConfirmModal.classList.add("is-open");
            calDeleteConfirmModal.setAttribute("aria-hidden", "false");
        }

        function closeDeleteConfirmModal() {
            if (!calDeleteConfirmModal) return;
            calDeleteConfirmModal.classList.remove("is-open");
            calDeleteConfirmModal.setAttribute("aria-hidden", "true");
        }

        // === binds ===

        await refreshEventos();
        render();

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

        calModalClose?.addEventListener("click", closeDayModal);
        calModal?.addEventListener("click", (e) => {
            if (e.target === calModal) closeDayModal();
        });

        calEventModalClose?.addEventListener("click", closeEventModal);
        calEventModal?.addEventListener("click", (e) => {
            if (e.target === calEventModal) closeEventModal();
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                closeDayModal();
                closeEventModal();
            }
        });

        calEventDiaInteiro.addEventListener("change", setTimeEnabled);

        calNewEventBtn?.addEventListener("click", () => {
            openEventModalCreate(selectedDayKey);
        });

        calEventDeleteBtn.addEventListener("click", async () => {
            if (!editingEvent) return;
            openDeleteConfirmModal(editingEvent);
        });

        calDeleteClose?.addEventListener("click", closeDeleteConfirmModal);
        calDeleteCancelBtn?.addEventListener("click", closeDeleteConfirmModal);

        calDeleteConfirmModal?.addEventListener("click", (e) => {
            if (e.target === calDeleteConfirmModal) closeDeleteConfirmModal();
        });

        calEventForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (calEventError) {
                calEventError.style.display = "none";
                calEventError.textContent = "";
            }

            const msg = validateEventForm();
            if (msg) {
                if (calEventError) {
                    calEventError.textContent = msg;
                    calEventError.style.display = "block";
                }
                return;
            }

            const ofertaId = Number(calEventOferta.value);
            const payload = {
                titulo: (calEventTitulo.value || "").trim(),
                descricao: (calEventDescricao.value || "").trim(),
                data: calEventData.value,
                diaInteiro: !!calEventDiaInteiro.checked,
                horaInicio: calEventDiaInteiro.checked ? null : timeToApiFormat(calEventInicio.value),
                horaFim: calEventDiaInteiro.checked ? null : timeToApiFormat(calEventFim.value),
            };

            try {
                if (!editingEvent) {
                    await ProfessorService.criarEvento(ofertaId, payload);
                } else {
                    await ProfessorService.atualizarEvento(editingEvent.ofertaId, editingEvent.eventoId, {
                        ...payload,
                        ativo: true,
                    });
                }

                closeEventModal();
                await refreshEventos();
                render();
            } catch (err) {
                if (calEventError) {
                    calEventError.textContent = err.message || "Erro ao salvar evento.";
                    calEventError.style.display = "block";
                }
            }
        });
    } catch (error) {
        console.error(error);
        host.innerHTML = `
      <section class="calendar-section container with-offset">
        <p class="text2">Erro ao carregar calendário.</p>
      </section>
    `;
    }
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

function getEventStartLabelSortable(ev) {
    if (ev?.diaInteiro) return "00:00";
    return formatHora(ev?.horaInicio);
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

function formatDateBr(dateKey) {
    if (!dateKey) return "-";
    const [y, m, d] = dateKey.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString("pt-BR", { dateStyle: "full" });
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

function initProfileMenu(user) {
  const profileBtn = document.getElementById("profileBtn");
  const profileDropdown = document.getElementById("profileDropdown");
  const logoutBtn = document.getElementById("logoutBtn");
  const changePasswordBtn = document.getElementById("changePasswordBtn");

  const profileNome = document.getElementById("profileNome");
  const profileMatricula = document.getElementById("profileMatricula");

  profileNome.textContent = user?.nome || "-";
  profileMatricula.textContent = user?.matricula || "-";


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
      <div class="professor-disciplina-card-top">
        <h4 class="title3">${escapeHtml(oferta.disciplinaNome || "-")}</h4>
      </div>

      <div class="professor-disciplina-card-body">
        <p class="text2">${escapeHtml(oferta.disciplinaCodigo || "-")}</p>
        <p class="text2">${escapeHtml(oferta.turmaNome || "-")}</p>
      </div>
    `;

        btn.addEventListener("click", async () => {
            notasState.ofertaSelecionada = oferta;
            notasState.page = 1;
            notasState.search = "";

            const searchInput = document.getElementById("notasSearchInput");
            if (searchInput) searchInput.value = "";

            updateSortToggleLabel();
            renderOfertasCards();
            await loadAlunosOfertaSelecionada();
        });

        cardsContainer.appendChild(btn);
    }
}

function bindNotasFilters() {
    const searchInput = document.getElementById("notasSearchInput");
    const sortToggle = document.getElementById("notasSortToggle");

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            notasState.search = searchInput.value.trim().toLowerCase();
            renderTabelaAlunos();
            renderPagination();
        });
    }

    if (sortToggle) {
        sortToggle.addEventListener("click", () => {
            notasState.sort =
                notasState.sort === "nome-asc" ? "nome-desc" : "nome-asc";

            updateSortToggleLabel();
            renderTabelaAlunos();
        });
    }

    updateSortToggleLabel();
}

function updateSortToggleLabel() {
    const sortLabel = document.getElementById("notasSortLabel");
    const sortToggle = document.getElementById("notasSortToggle");

    const isAsc = notasState.sort === "nome-asc";

    if (sortLabel) {
        sortLabel.textContent = isAsc ? "Nome A → Z" : "Nome Z → A";
    }

    if (sortToggle) {
        sortToggle.setAttribute(
            "aria-label",
            isAsc
                ? "Ordenação atual: Nome A para Z. Clique para mudar para Z para A."
                : "Ordenação atual: Nome Z para A. Clique para mudar para A para Z."
        );
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
      <td class="text2">
        <button
            type="button"
            class="nota-edit-btn"
            data-aluno-id="${aluno.id}"
            aria-label="Editar notas"
            title="Editar notas"
        >
            <svg
            class="nota-edit-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
            >
            <path
                d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l8.06-8.06.92.92L5.92 19.58zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.33a1.003 1.003 0 0 0-1.42 0L15.13 5.1l3.75 3.75 1.83-1.81z"
                fill="currentColor"
            ></path>
            </svg>
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

            const notaAtualizada = await ProfessorService.getNotasAluno(
                notasState.ofertaSelecionada.ofertaId,
                notasState.notaAtual.alunoId
            );

            const alunoIndex = notasState.alunos.findIndex(
                (item) => item.id === notasState.notaAtual.alunoId
            );

            if (alunoIndex >= 0) {
                notasState.alunos[alunoIndex] = {
                    ...notasState.alunos[alunoIndex],
                    a1: notaAtualizada?.a1 ?? payload.a1,
                    a2: notaAtualizada?.a2 ?? payload.a2,
                    a3: notaAtualizada?.a3 ?? payload.a3,
                    atualizadoEm: notaAtualizada?.atualizadoEm ?? null,
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

    let dt;

    if (typeof value === "string") {
        const hasTimezone = /(?:Z|[+\-]\d{2}:\d{2})$/.test(value);

        if (hasTimezone) {
            dt = new Date(value);
        } else {
            dt = new Date(`${value}Z`);
        }
    } else {
        dt = new Date(value);
    }

    if (isNaN(dt.getTime())) return "-";

    const dia = String(dt.getDate()).padStart(2, "0");
    const mes = String(dt.getMonth() + 1).padStart(2, "0");
    const ano = dt.getFullYear();
    const hora = String(dt.getHours()).padStart(2, "0");
    const minuto = String(dt.getMinutes()).padStart(2, "0");

    return `${dia}/${mes}/${ano} - ${hora}:${minuto}`;
}

const atividadesState = {
    ofertas: [],
    ofertaSelecionada: null,
    status: "para-corrigir", // para-corrigir | corrigidas | criadas
    tarefas: [],
    tarefaSelecionada: null,
    entregas: [],
    respostaSelecionada: null,

    respostasCache: {},      // { [tarefaId]: respostas[] }
    correcaoSelecionada: null
};

function resetAtividadesState() {
    atividadesState.ofertas = [];
    atividadesState.ofertaSelecionada = null;
    atividadesState.status = "para-corrigir";
    atividadesState.tarefas = [];
    atividadesState.tarefaSelecionada = null;
    atividadesState.entregas = [];
    atividadesState.respostaSelecionada = null;

    atividadesState.respostasCache = {};
    atividadesState.correcaoSelecionada = null;
}

async function loadAtividadesDaOfertaSelecionada() {
    const titulo = document.getElementById("atividadesTitulo");
    const statusSelect = document.getElementById("atividadesStatusSelect");
    const criarTarefaBtn = document.getElementById("criarTarefaBtn");

    if (!atividadesState.ofertaSelecionada) {
        renderAtividadesEmptyState("Selecione uma disciplina.");
        return;
    }

    if (titulo) {
        titulo.textContent = `${atividadesState.ofertaSelecionada.disciplinaNome} - ${atividadesState.ofertaSelecionada.turmaNome}`;
    }

    if (statusSelect) {
        statusSelect.disabled = false;
        statusSelect.value = atividadesState.status;
    }

    if (criarTarefaBtn) {
        criarTarefaBtn.disabled = false;
    }

    renderAtividadesLoading();

    try {
        if (atividadesState.status === "criadas") {
            const tarefas = await ProfessorService.getTarefasDaOferta(
                atividadesState.ofertaSelecionada.ofertaId
            );

            atividadesState.tarefas = (Array.isArray(tarefas) ? tarefas : []).sort(
                (a, b) => new Date(a.dataEntrega).getTime() - new Date(b.dataEntrega).getTime()
            );

            renderListaTarefasCriadas();
            return;
        }

        if (atividadesState.status === "para-corrigir") {
            const pendencias = await ProfessorService.getTarefasParaCorrigir();
            const filtradas = (Array.isArray(pendencias) ? pendencias : [])
                .filter((x) => x.ofertaId === atividadesState.ofertaSelecionada.ofertaId);

            atividadesState.tarefas = groupPendenciasByTarefa(filtradas);
            renderListaTarefasParaCorrigir();
            return;
        }

        if (atividadesState.status === "corrigidas") {
            const corrigidas = await ProfessorService.getTarefasCorrigidas(atividadesState.ofertaSelecionada.ofertaId);
            atividadesState.tarefas = groupCorrigidasByTarefa(Array.isArray(corrigidas) ? corrigidas : []);
            renderListaTarefasCorrigidas();
            return;
        }
    } catch (err) {
        console.error(err);
        renderAtividadesEmptyState("Erro ao carregar atividades.");
    }
}

function groupCorrigidasByTarefa(items) {
    const map = new Map();

    for (const item of items) {
        const tarefaId = item.tarefaId;

        if (!map.has(tarefaId)) {
            map.set(tarefaId, {
                tarefaId: item.tarefaId,
                ofertaId: item.ofertaId,
                tarefaTitulo: item.tarefaTitulo,
                // info agregada só para exibição
                ultimaCorrecaoEm: item.dataCorrecao,
            });
        } else {
            const current = map.get(tarefaId);
            if (String(item.dataCorrecao) > String(current.ultimaCorrecaoEm)) {
                current.ultimaCorrecaoEm = item.dataCorrecao;
            }
        }
    }

    return [...map.values()].sort((a, b) => {
        const da = new Date(a.ultimaCorrecaoEm).getTime();
        const db = new Date(b.ultimaCorrecaoEm).getTime();
        return da - db;
    });
}

function bindAtividadesEvents() {
    const statusSelect = document.getElementById("atividadesStatusSelect");
    const criarTarefaBtn = document.getElementById("criarTarefaBtn");

    if (statusSelect) {
        statusSelect.addEventListener("change", async () => {
            atividadesState.status = statusSelect.value;
            await loadAtividadesDaOfertaSelecionada();
        });
    }

    if (criarTarefaBtn) {
        criarTarefaBtn.addEventListener("click", () => {
            openCriarTarefaModal();
        });
    }
}

function renderAtividadesEmptyState(message) {
    const list = document.getElementById("atividadesList");
    const titulo = document.getElementById("atividadesTitulo");
    const statusSelect = document.getElementById("atividadesStatusSelect");
    const criarTarefaBtn = document.getElementById("criarTarefaBtn");

    if (titulo && !atividadesState.ofertaSelecionada) {
        titulo.textContent = "Selecione uma disciplina";
    }

    if (list) {
        list.innerHTML = `<p class="text2">${escapeHtml(message)}</p>`;
    }

    if (statusSelect) {
        statusSelect.disabled = !atividadesState.ofertaSelecionada;
        statusSelect.value = atividadesState.status;
    }

    if (criarTarefaBtn) {
        criarTarefaBtn.disabled = !atividadesState.ofertaSelecionada;
    }
}

function renderAtividadesOfertasCards() {
    const cardsContainer = document.getElementById("atividadesOfertasCards");
    if (!cardsContainer) return;

    cardsContainer.innerHTML = "";

    if (!atividadesState.ofertas.length) {
        cardsContainer.innerHTML = `<p class="text2">Nenhuma disciplina disponível.</p>`;
        return;
    }

    for (const oferta of atividadesState.ofertas) {
        const isActive = atividadesState.ofertaSelecionada?.ofertaId === oferta.ofertaId;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `disciplina-card${isActive ? " is-active" : ""}`;

        btn.innerHTML = `
      <div class="professor-disciplina-card-top">
        <h4 class="title3">${escapeHtml(oferta.disciplinaNome || "-")}</h4>
      </div>
      <div class="professor-disciplina-card-body">
        <p class="text2">${escapeHtml(oferta.disciplinaCodigo || "-")}</p>
        <p class="text2">${escapeHtml(oferta.turmaNome || "-")}</p>
      </div>
    `;

        btn.addEventListener("click", async () => {
            atividadesState.ofertaSelecionada = oferta;
            atividadesState.status = "para-corrigir";
            atividadesState.tarefaSelecionada = null;
            atividadesState.entregas = [];
            atividadesState.respostaSelecionada = null;

            renderAtividadesOfertasCards();
            await loadAtividadesDaOfertaSelecionada();
        });

        cardsContainer.appendChild(btn);
    }
}

function renderAtividadesLoading() {
    const list = document.getElementById("atividadesList");
    if (!list) return;

    list.innerHTML = `<p class="text2">Carregando...</p>`;
}

function groupPendenciasByTarefa(items) {
    const map = new Map();

    for (const item of items) {
        const key = item.tarefaId;

        if (!map.has(key)) {
            map.set(key, {
                tarefaId: item.tarefaId,
                ofertaId: item.ofertaId,
                titulo: item.tarefaTitulo,
                dataEntrega: item.dataEntrega,
                disciplinaCodigo: item.disciplinaCodigo,
                disciplinaNome: item.disciplinaNome,
                alunos: [],
            });
        }

        map.get(key).alunos.push({
            alunoId: item.alunoId,
            alunoNome: item.alunoNome,
            alunoMatricula: item.alunoMatricula,
            respostaId: item.respostaId,
            dataEnvio: item.dataEnvio,
        });
    }

    return [...map.values()].sort((a, b) => {
        const da = new Date(a.dataEntrega).getTime();
        const db = new Date(b.dataEntrega).getTime();
        return da - db;
    });
}

function renderListaTarefasCriadas() {
    const list = document.getElementById("atividadesList");
    if (!list) return;

    if (!atividadesState.tarefas.length) {
        list.innerHTML = `<p class="text2">Nenhuma tarefa criada.</p>`;
        return;
    }

    list.innerHTML = "";

    for (const tarefa of atividadesState.tarefas) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "atividade-card";
        btn.classList.add("card-status--criada");

        btn.innerHTML = `
      <div>
        <h4 class="title3">${escapeHtml(tarefa.titulo || "-")}</h4>
        <p class="text2">Entrega: ${formatDateTimeBr(tarefa.dataEntrega)}</p>
      </div>
      <p class="text2">Peso: ${formatOneDecimal(tarefa.peso ?? 0)}</p>
    `;

        btn.addEventListener("click", () => {
            openTarefaCriadaModal(tarefa);
        });

        list.appendChild(btn);
    }
}

function renderListaTarefasParaCorrigir() {
    const list = document.getElementById("atividadesList");
    if (!list) return;

    if (!atividadesState.tarefas.length) {
        list.innerHTML = `<p class="text2">Nenhuma tarefa para corrigir.</p>`;
        return;
    }

    list.innerHTML = "";

    for (const tarefa of atividadesState.tarefas) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "atividade-card";
        btn.classList.add("card-status--para-corrigir");
        btn.innerHTML = `
      <div>
        <h4 class="title3">${escapeHtml(tarefa.titulo || "-")}</h4>
        <p class="text2">Entrega: ${formatDateTimeBr(tarefa.dataEntrega)}</p>
      </div>
      <p class="text2">${tarefa.alunos.length} resposta(s)</p>
    `;

        btn.addEventListener("click", async () => {
            await openTarefaParaCorrigirModal(tarefa);
        });

        list.appendChild(btn);
    }
}

function renderListaTarefasCorrigidas() {
    const list = document.getElementById("atividadesList");
    if (!list) return;

    if (!atividadesState.tarefas.length) {
        list.innerHTML = `<p class="text2">Nenhuma tarefa corrigida.</p>`;
        return;
    }

    list.innerHTML = "";

    for (const item of atividadesState.tarefas) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "atividade-card";
        btn.classList.add("card-status--corrigida");
        btn.innerHTML = `
      <div>
        <h4 class="title3">${escapeHtml(item.tarefaTitulo || "-")}</h4>
        <p class="text2">Última correção: ${formatDateTimeBr(item.ultimaCorrecaoEm)}</p>
      </div>
      <p class="text2">Ver alunos</p>
    `;

        btn.addEventListener("click", async () => {
            await openTarefaCorrigidaModal(item);
        });

        list.appendChild(btn);
    }
}

function bindTarefaModal() {
    const modal = document.getElementById("tarefaModal");
    const closeBtn = document.getElementById("tarefaModalClose");

    if (!modal || !closeBtn) return;

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");

    closeBtn.addEventListener("click", closeTarefaModal);

    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeTarefaModal();
        }
    });
}

function closeTarefaModal() {
    const modal = document.getElementById("tarefaModal");
    const body = document.getElementById("tarefaModalBody");
    const dialog = document.querySelector("#tarefaModal .tarefa-modal-dialog");
    dialog?.classList.remove("modal-status--para-corrigir", "modal-status--criada", "modal-status--corrigida");

    if (!modal) return;

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");

    if (body) {
        body.innerHTML = "";
    }
}

function openCriarTarefaModal() {
    const modal = document.getElementById("tarefaModal");
    const titulo = document.getElementById("tarefaModalTitulo");
    const subtitulo = document.getElementById("tarefaModalSubtitulo");
    const body = document.getElementById("tarefaModalBody");

    if (!modal || !titulo || !subtitulo || !body || !atividadesState.ofertaSelecionada) return;

    const disc = atividadesState.ofertaSelecionada?.disciplinaNome || "-";

    titulo.textContent = "Nova tarefa";
    subtitulo.innerHTML = `Para: <span style="color: var(--color-primary); font-weight: 700;">${escapeHtml(disc)}</span>`;

    body.innerHTML = `
    <form id="criarTarefaForm" class="correcao-form">
      <div class="correcao-form-row correcao-form-row--textarea">
        <label class="text2" for="tarefaTituloInput">Título</label>
        <input id="tarefaTituloInput" class="text2" />
      </div>

      <div class="correcao-form-row correcao-form-row--textarea">
        <label class="text2" for="tarefaDescricaoInput">Descrição</label>
        <textarea id="tarefaDescricaoInput" class="text2"></textarea>
      </div>

      <div class="correcao-form-row">
        <label class="text2" for="tarefaDataEntregaInput">Entrega</label>
        <input id="tarefaDataEntregaInput" type="datetime-local" class="text2" />
      </div>

      <div class="correcao-form-row">
        <label class="text2" for="tarefaPesoInput">Peso</label>
        <input id="tarefaPesoInput" type="number" min="0" max="10" step="0.1" class="text2" />
      </div>

      <p class="text2 nota-form-error" id="criarTarefaError" style="display:none;"></p>

      <div class="boletim-actions">
        <button type="submit" id="criarTarefaSubmit" class="boletim-btn text1">Criar tarefa</button>
      </div>
    </form>
  `;

    const form = document.getElementById("criarTarefaForm");
    form?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const errorNode = document.getElementById("criarTarefaError");
        const submitBtn = document.getElementById("criarTarefaSubmit");
        const tituloInput = document.getElementById("tarefaTituloInput");
        const descricaoInput = document.getElementById("tarefaDescricaoInput");
        const dataEntregaInput = document.getElementById("tarefaDataEntregaInput");
        const pesoInput = document.getElementById("tarefaPesoInput");

        if (errorNode) {
            errorNode.style.display = "none";
            errorNode.textContent = "";
        }

        const payload = {
            titulo: tituloInput?.value?.trim() || "",
            descricao: descricaoInput?.value?.trim() || "",
            dataEntrega: dataEntregaInput?.value ? new Date(dataEntregaInput.value).toISOString() : "",
            peso: Number(String(pesoInput?.value || "").replace(",", ".")),
        };

        if (!payload.titulo || !payload.descricao || !payload.dataEntrega || !Number.isFinite(payload.peso) || payload.peso < 0 || payload.peso > 10) {
            if (errorNode) {
                errorNode.textContent = "Preencha os campos corretamente.";
                errorNode.style.display = "block";
            }
            return;
        }

        setButtonLoading(submitBtn, true, "Criando...", "Criar tarefa");

        try {
            await ProfessorService.criarTarefa(
                atividadesState.ofertaSelecionada.ofertaId,
                payload
            );

            closeTarefaModal();
            atividadesState.status = "criadas";

            const statusSelect = document.getElementById("atividadesStatusSelect");
            if (statusSelect) {
                statusSelect.value = "criadas";
            }

            await loadAtividadesDaOfertaSelecionada();

            if (typeof Toastify === "function") {
                Toastify({
                    text: "Tarefa criada com sucesso.",
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    close: true,
                    stopOnFocus: true,
                    style: { background: "#2e7d32" },
                }).showToast();
            }
        } catch (error) {
            if (errorNode) {
                errorNode.textContent = error.message || "Erro ao criar tarefa.";
                errorNode.style.display = "block";
            }
        } finally {
            setButtonLoading(submitBtn, false, null, "Criar tarefa");
        }
    });

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
}

function openTarefaCriadaModal(tarefa) {
    const modal = document.getElementById("tarefaModal");
    const titulo = document.getElementById("tarefaModalTitulo");
    const subtitulo = document.getElementById("tarefaModalSubtitulo");
    const body = document.getElementById("tarefaModalBody");
    const dialog = document.querySelector("#tarefaModal .tarefa-modal-dialog");
    dialog?.classList.remove("modal-status--para-corrigir", "modal-status--criada", "modal-status--corrigida");
    dialog?.classList.add("modal-status--criada");

    if (!modal || !titulo || !subtitulo || !body) return;

    titulo.textContent = tarefa.titulo || "Tarefa";
    subtitulo.textContent = "Detalhes";

    body.innerHTML = `
    <div class="tarefa-detail-block">
      <p class="text2"><strong>Descrição:</strong> ${escapeHtml(tarefa.descricao || "-")}</p>
      <p class="text2"><strong>Entrega:</strong> ${formatDateTimeBr(tarefa.dataEntrega)}</p>
      <p class="text2"><strong>Peso:</strong> ${formatOneDecimal(tarefa.peso ?? 0)}</p>
      <p class="text2"><strong>Status:</strong> ${tarefa.ativa ? "Ativa" : "Inativa"}</p>

      <div class="boletim-actions">
        <button type="button" id="excluirTarefaBtn" class="boletim-btn text1">Excluir tarefa</button>
      </div>
    </div>
  `;

    const excluirBtn = document.getElementById("excluirTarefaBtn");
    excluirBtn?.addEventListener("click", async () => {
        const confirmDelete = window.confirm("Deseja excluir esta tarefa?");
        if (!confirmDelete) return;

        setButtonLoading(excluirBtn, true, "Excluindo...", "Excluir tarefa");

        try {
            await ProfessorService.excluirTarefa(
                atividadesState.ofertaSelecionada.ofertaId,
                tarefa.id
            );

            closeTarefaModal();
            await loadAtividadesDaOfertaSelecionada();
        } catch (error) {
            alert(error.message || "Erro ao excluir tarefa.");
        } finally {
            setButtonLoading(excluirBtn, false, null, "Excluir tarefa");
        }
    });

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
}

async function openTarefaParaCorrigirModal(tarefa) {
    const modal = document.getElementById("tarefaModal");
    const titulo = document.getElementById("tarefaModalTitulo");
    const subtitulo = document.getElementById("tarefaModalSubtitulo");
    const body = document.getElementById("tarefaModalBody");
    const dialog = document.querySelector("#tarefaModal .tarefa-modal-dialog");
    dialog?.classList.remove("modal-status--para-corrigir", "modal-status--criada", "modal-status--corrigida");
    dialog?.classList.add("modal-status--para-corrigir");

    if (!modal || !titulo || !subtitulo || !body) return;

    titulo.textContent = tarefa.titulo || "Tarefa";
    subtitulo.textContent = "Para corrigir";

    body.innerHTML = `
    <div class="tarefa-detail-block">
      <p class="text2"><strong>Entrega:</strong> ${formatDateTimeBr(tarefa.dataEntrega)}</p>
      <h4 class="title3">Alunos que responderam</h4>
      <div id="tarefaPendenciasList" class="tarefas-list"></div>
    </div>
  `;

    const list = document.getElementById("tarefaPendenciasList");
    if (list) {
        list.innerHTML = "";

        for (const aluno of tarefa.alunos) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "atividade-card";
            btn.innerHTML = `
        <div>
          <h4 class="title3">${escapeHtml(aluno.alunoNome || "-")}</h4>
          <p class="text2">${escapeHtml(aluno.alunoMatricula || "-")}</p>
        </div>
        <p class="text2">Enviado em ${formatDateTimeBr(aluno.dataEnvio)}</p>
      `;

            btn.addEventListener("click", async () => {
                await openCorrecaoModalFromPendencia(tarefa, aluno);
            });

            list.appendChild(btn);
        }
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
}

async function openTarefaCorrigidaModal(item) {
    const modal = document.getElementById("tarefaModal");
    const titulo = document.getElementById("tarefaModalTitulo");
    const subtitulo = document.getElementById("tarefaModalSubtitulo");
    const body = document.getElementById("tarefaModalBody");

    if (!modal || !titulo || !subtitulo || !body || !atividadesState.ofertaSelecionada) return;

    // normaliza tarefa selecionada para o submit da correção
    atividadesState.tarefaSelecionada = {
        tarefaId: item.tarefaId,
        ofertaId: atividadesState.ofertaSelecionada.ofertaId,
        titulo: item.tarefaTitulo,
    };

    titulo.textContent = item.tarefaTitulo || "Tarefa";
    subtitulo.textContent = "Corrigidas";

    body.innerHTML = `
    <div class="tarefa-detail-block">
      <p class="text2">Selecione um aluno para ver a resposta e a correção.</p>
      <div id="tarefaCorrigidasAlunosList" class="tarefas-list"></div>
    </div>
  `;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");

    try {
        // 1) respostas (para ter conteudo + alunoId)
        const ofertaId = atividadesState.ofertaSelecionada.ofertaId;
        const tarefaId = item.tarefaId;

        let respostas = atividadesState.respostasCache[tarefaId];

        if (!respostas) {
            respostas = await ProfessorService.getRespostasDaTarefa(ofertaId, tarefaId);
            respostas = Array.isArray(respostas) ? respostas : [];
            atividadesState.respostasCache[tarefaId] = respostas;
        }

        const list = document.getElementById("tarefaCorrigidasAlunosList");
        if (!list) return;

        if (!respostas.length) {
            list.innerHTML = `<p class="text2">Nenhuma resposta encontrada.</p>`;
            return;
        }

        list.innerHTML = "";

        for (const r of respostas) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "atividade-card";

            btn.innerHTML = `
        <div>
          <h4 class="title3">${escapeHtml(r.alunoNome || "-")}</h4>
          <p class="text2">${escapeHtml(r.alunoMatricula || "-")}</p>
        </div>
        <p class="text2">Enviado em ${formatDateTimeBr(r.dataEnvio)}</p>
      `;

            btn.addEventListener("click", async () => {
                await openCorrecaoModalFromCorrigida(ofertaId, tarefaId, r.alunoId);
            });

            list.appendChild(btn);
        }
    } catch (err) {
        console.error(err);
        body.innerHTML = `<p class="text2">Erro ao carregar respostas da tarefa.</p>`;
    }
}

async function openCorrecaoModalFromCorrigida(ofertaId, tarefaId, alunoId) {
    try {
        // resposta (conteudo)
        let respostas = atividadesState.respostasCache[tarefaId];
        if (!respostas) {
            respostas = await ProfessorService.getRespostasDaTarefa(ofertaId, tarefaId);
            respostas = Array.isArray(respostas) ? respostas : [];
            atividadesState.respostasCache[tarefaId] = respostas;
        }

        const resposta = respostas.find((x) => x.alunoId === alunoId);
        if (!resposta) {
            alert("Resposta não encontrada.");
            return;
        }

        const dialog = document.querySelector("#correcaoModal .correcao-modal-dialog");
        dialog?.classList.remove("modal-status--para-corrigir", "modal-status--criada", "modal-status--corrigida");
        dialog?.classList.add("modal-status--corrigida");

        // correção (nota/feedback/data)
        const correcao = await ProfessorService.getCorrecaoAluno(ofertaId, tarefaId, alunoId);

        atividadesState.respostaSelecionada = resposta;
        atividadesState.correcaoSelecionada = correcao;

        const modal = document.getElementById("correcaoModal");
        const titulo = document.getElementById("correcaoModalTitulo");
        const body = document.getElementById("correcaoRespostaBody");
        const notaInput = document.getElementById("correcaoNota");
        const feedbackInput = document.getElementById("correcaoFeedback");
        const errorNode = document.getElementById("correcaoFormError");

        if (!modal || !titulo || !body || !notaInput || !feedbackInput) return;

        if (errorNode) {
            errorNode.style.display = "none";
            errorNode.textContent = "";
        }

        titulo.textContent = resposta.alunoNome || "Correção";

        body.innerHTML = `
        <div class="tarefa-detail-block">
            <p class="text2"><strong>Matrícula:</strong> ${escapeHtml(resposta.alunoMatricula || "-")}</p>
            <p class="text2"><strong>Enviado em:</strong> ${formatDateTimeBr(resposta.dataEnvio)}</p>

            <p class="text2 modal-label-strong">Resposta</p>
            <div class="tarefa-resposta-box text2">
            ${escapeHtml(resposta.conteudo || "-")}
            </div>

            <p class="text2"><strong>Corrigido em:</strong> ${formatDateTimeBr(correcao?.dataCorrecao)}</p>

            <p class="text2 modal-label-strong">Feedback</p>
            <div class="tarefa-feedback-box text2">
            ${escapeHtml(correcao?.feedback || "-")}
            </div>
        </div>
        `;

        notaInput.value = correcao?.nota ?? "";
        feedbackInput.value = correcao?.feedback ?? "";

        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
    } catch (err) {
        console.error(err);
        alert("Erro ao carregar correção.");
    }
}

function bindCorrecaoModal() {
    const modal = document.getElementById("correcaoModal");
    const closeBtn = document.getElementById("correcaoModalClose");
    const form = document.getElementById("correcaoForm");

    if (!modal || !closeBtn || !form) return;

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");

    closeBtn.addEventListener("click", closeCorrecaoModal);

    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeCorrecaoModal();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const errorNode = document.getElementById("correcaoFormError");
        const submitBtn = document.getElementById("correcaoConfirmBtn");
        const notaInput = document.getElementById("correcaoNota");
        const feedbackInput = document.getElementById("correcaoFeedback");

        if (errorNode) {
            errorNode.style.display = "none";
            errorNode.textContent = "";
        }

        if (!atividadesState.respostaSelecionada || !atividadesState.ofertaSelecionada || !atividadesState.tarefaSelecionada) {
            if (errorNode) {
                errorNode.textContent = "Não foi possível identificar a resposta.";
                errorNode.style.display = "block";
            }
            return;
        }

        const nota = Number(String(notaInput?.value || "").replace(",", "."));
        const feedback = feedbackInput?.value?.trim() || "";

        if (!Number.isFinite(nota) || nota < 0 || nota > 10) {
            if (errorNode) {
                errorNode.textContent = "A nota deve estar entre 0 e 10.";
                errorNode.style.display = "block";
            }
            return;
        }

        setButtonLoading(submitBtn, true, "Salvando...", "Salvar correção");

        try {
            await ProfessorService.corrigirTarefa(
                atividadesState.ofertaSelecionada.ofertaId,
                await ProfessorService.corrigirTarefa(
                    atividadesState.ofertaSelecionada.ofertaId,
                    atividadesState.tarefaSelecionada.tarefaId,
                    atividadesState.respostaSelecionada.alunoId,
                    { nota, feedback }
                ),
                atividadesState.respostaSelecionada.alunoId,
                { nota, feedback }
            );

            closeCorrecaoModal();
            closeTarefaModal();
            await loadAtividadesDaOfertaSelecionada();

            if (typeof Toastify === "function") {
                Toastify({
                    text: "Correção salva com sucesso.",
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    close: true,
                    stopOnFocus: true,
                    style: { background: "#2e7d32" },
                }).showToast();
            }
        } catch (error) {
            if (errorNode) {
                errorNode.textContent = error.message || "Erro ao salvar correção.";
                errorNode.style.display = "block";
            }
        } finally {
            setButtonLoading(submitBtn, false, null, "Salvar correção");
        }
    });
}

function closeCorrecaoModal() {
    const modal = document.getElementById("correcaoModal");
    const form = document.getElementById("correcaoForm");
    const errorNode = document.getElementById("correcaoFormError");
    const body = document.getElementById("correcaoRespostaBody");
    const dialog = document.querySelector("#correcaoModal .correcao-modal-dialog");
    dialog?.classList.remove("modal-status--para-corrigir", "modal-status--criada", "modal-status--corrigida");

    if (!modal) return;

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");

    if (form) form.reset();

    if (errorNode) {
        errorNode.style.display = "none";
        errorNode.textContent = "";
    }

    if (body) {
        body.innerHTML = "";
    }

    atividadesState.respostaSelecionada = null;
    atividadesState.correcaoSelecionada = null;
}

async function openCorrecaoModalFromPendencia(tarefa, alunoPendente) {
    const respostas = await ProfessorService.getRespostasDaTarefa(
        atividadesState.ofertaSelecionada.ofertaId,
        tarefa.tarefaId
    );

    const resposta = (Array.isArray(respostas) ? respostas : []).find(
        (item) => item.alunoId === alunoPendente.alunoId
    );

    if (!resposta) {
        alert("Resposta não encontrada.");
        return;
    }

    atividadesState.tarefaSelecionada = {
        tarefaId: tarefa.tarefaId,
        ofertaId: atividadesState.ofertaSelecionada.ofertaId,
        titulo: tarefa.titulo,
    };
    atividadesState.respostaSelecionada = resposta;

    const dialog = document.querySelector("#correcaoModal .correcao-modal-dialog");
    dialog?.classList.remove("modal-status--para-corrigir", "modal-status--criada", "modal-status--corrigida");
    dialog?.classList.add("modal-status--para-corrigir");

    const modal = document.getElementById("correcaoModal");
    const titulo = document.getElementById("correcaoModalTitulo");
    const body = document.getElementById("correcaoRespostaBody");
    const notaInput = document.getElementById("correcaoNota");
    const feedbackInput = document.getElementById("correcaoFeedback");

    if (!modal || !titulo || !body || !notaInput || !feedbackInput) return;

    titulo.textContent = resposta.alunoNome || "Correção";

    body.innerHTML = `
    <div class="tarefa-detail-block">
        <p class="text2"><strong>Matrícula:</strong> ${escapeHtml(resposta.alunoMatricula || "-")}</p>
        <p class="text2"><strong>Enviado em:</strong> ${formatDateTimeBr(resposta.dataEnvio)}</p>

        <p class="text2 modal-label-strong">Resposta:</p>
        <div class="tarefa-resposta-box text2">
        ${escapeHtml(resposta.conteudo || "-")}
        </div>
    </div>
    `;

    notaInput.value = "";
    feedbackInput.value = "";

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
}