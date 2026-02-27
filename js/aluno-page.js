// js/aluno-page.js

document.addEventListener("DOMContentLoaded", async () => {
  console.log("[aluno-page] carregou");
  console.log("[aluno-page] token:", localStorage.getItem("ec_token"));
  console.log("[aluno-page] user:", localStorage.getItem("ec_usuario"));

  const user = getCurrentUser();
  if (!user || (user.perfil || "").toUpperCase() !== "ALUNO") {
    window.location.href = "./index.html";
    return;
  }

  const host = document.getElementById("alunoSectionHost");
  if (!host) return;

  try {
    // 1) carrega o HTML da dashboard dentro do host
    await loadDashboardSection(host);

    // 2) agora os elementos existem no DOM
    const nameSpan = host.querySelector(".welcome-name span");
    const avgNode = host.querySelector(".avg-number");
    const eventsContainer = host.querySelector(".events-container");

    if (nameSpan) {
      nameSpan.textContent = user.nome.split(" ")[0] || "Aluno";
    }

    if (avgNode) {
      avgNode.textContent = "...";
    }

    if (eventsContainer) {
      eventsContainer.innerHTML = `<p class="text2">Carregando...</p>`;
    }

    // 3) busca dados da API
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
        <p class="text2">Erro ao carregar dashboard.</p>
      </section>
    `;
  }
});

async function loadDashboardSection(host) {
  const response = await fetch("../pages/sections/aluno/dashboard.html");

  if (!response.ok) {
    throw new Error("Não foi possível carregar o HTML da dashboard.");
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
    container.innerHTML = `<p class="text2">Sem eventos próximos.</p>`;
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

  const [ano, mes, dia] = partes;
  if (!ano || !mes || !dia) return "--/--";

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