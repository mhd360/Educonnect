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

        const maxSlots = 4;

        // 5+ eventos: mostra 3 e reserva o 4º slot para "+N"
        // 1-4 eventos: mostra todos (até 4)
        const showCount = sorted.length >= 5 ? 3 : Math.min(sorted.length, maxSlots);
        const show = sorted.slice(0, showCount);

        // container para múltiplos markers
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
        btn.addEventListener("click", () => openDayModal(payload?.dateKey, []));
      }

      if (!isOutside && payload?.dateKey) {
        const today = new Date();
        const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());
        if (payload.dateKey === todayKey) {
          btn.classList.add("cal-day--today");
        }
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