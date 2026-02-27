// js/aluno-page.js

document.addEventListener("DOMContentLoaded", async () => {
  const user = getCurrentUser();
  if (!user || (user.perfil || "").toUpperCase() !== "ALUNO") {
    window.location.href = "./index.html";
    return;
  }
  initProfileMenu(user);

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
    renderPlaceholderSection("Notas", "Seção em construção.");
    return;
  }

  if (sectionName === "atividades") {
    renderPlaceholderSection("Atividades", "Seção em construção.");
    return;
  }

  if (sectionName === "calendario") {
    renderPlaceholderSection("Calendário", "Seção em construção.");
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
      nameSpan.textContent = user.nome || "Aluno";
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
    alert("A funcionalidade de alterar senha será integrada no próximo passo.");
  });

  logoutBtn.addEventListener("click", function () {
    localStorage.removeItem("ec_token");
    localStorage.removeItem("ec_usuario");
    localStorage.removeItem("educonnect_current_user");
    window.location.href = "./index.html";
  });
}