(() => {
  // ===== Config inicial =====
  const elDays  = document.getElementById('calDays');
  const elMonth = document.getElementById('calMonth');
  const elYear  = document.getElementById('calYear');
  const btnPrev = document.getElementById('calPrev');
  const btnNext = document.getElementById('calNext');

  // Modal (lista de eventos do dia)
  const modal  = document.getElementById('calModal');
  const mClose = document.getElementById('calModalClose');
  const mDate  = document.getElementById('calModalDate');
  const mList  = document.getElementById('calModalList');

  if (!elDays || !elMonth) return;

  // ===== Configuráveis =====
  const MAX_PILLS_PER_DAY = 2; // <- mude aqui se quiser mostrar mais/menos bolinhas por dia

  // ===== Eventos (exemplo). Formato: { date:'YYYY-MM-DD', time:'HH:MM'|'Dia todo', title, desc }
  const EVENTS = [
    { date: '2025-12-23', time: '11:00',   title: 'Entrega: Atividade 2 - Python', desc: 'Entrega via portal.' },
    { date: '2025-12-23', time: '14:00',   title: 'Prova 3 - React',               desc: 'Conteúdo: hooks e roteamento.' },
    { date: '2025-12-25', time: 'Dia todo',title: 'Recesso',                       desc: 'Sem aulas.' },
  ];

  // Índice por data
  const byDate = EVENTS.reduce((acc, ev) => {
    (acc[ev.date] ||= []).push(ev);
    return acc;
  }, {});

  // ===== helpers =====
  const pad2 = (n) => String(n).padStart(2, '0');
  const fmtDate = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`;
  const MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

  // Ordenação: "Dia todo" primeiro, depois horários crescentes HH:MM
  function timeKey(t){
    if (!t) return 1e9;
    const s = String(t).toLowerCase().trim();
    if (s.includes('dia todo')) return -1;
    const m = s.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return 1e9;
    return parseInt(m[1],10)*60 + parseInt(m[2],10);
  }

  // formato dd/mm/aaaa para o modal
  function brazilFmt(key){
    const [y,m,d] = key.split('-');
    return `${d}/${m}/${y}`;
  }

  let view = new Date(); // mês em exibição

  function render(){
    const year  = view.getFullYear();
    const month = view.getMonth(); // 0..11

    elMonth.textContent = MONTHS[month][0].toUpperCase() + MONTHS[month].slice(1);
    elYear.textContent  = String(year);

    const first = new Date(year, month, 1);
    const last  = new Date(year, month + 1, 0);
    const daysInMonth = last.getDate();
    const startOffset = first.getDay(); // domingo = 0

    elDays.innerHTML = '';

    // Dias do mês anterior para preencher a 1ª linha
    const prevLast = new Date(year, month, 0).getDate();
    for(let i=0; i<startOffset; i++){
      const num = prevLast - (startOffset - 1 - i);
      elDays.appendChild(makeDay(num, true, year, month-1));
    }

    // Dias do mês atual
    for(let d=1; d<=daysInMonth; d++){
      elDays.appendChild(makeDay(d, false, year, month));
    }

    // Completa a grade até múltiplo de 7
    const cells = elDays.children.length;
    const toFill = (Math.ceil(cells/7)*7) - cells;
    for(let i=1; i<=toFill; i++){
      elDays.appendChild(makeDay(i, true, year, month+1));
    }
  }

  function makeDay(dayNumber, isOut, y, mZeroBased){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cal-day' + (isOut ? ' is-out' : '');
    btn.setAttribute('data-day', dayNumber);
    btn.setAttribute('tabindex','0');

    const y2 = (new Date(y, mZeroBased, 1)).getFullYear();
    const m2 = (new Date(y, mZeroBased, 1)).getMonth() + 1;
    const key = fmtDate(y2, m2, dayNumber);

    const head = document.createElement('div');
    head.className = 'cal-day__num text3';
    head.textContent = dayNumber;
    btn.appendChild(head);

    // Hoje?
    const today = new Date();
    if (!isOut &&
        dayNumber === today.getDate() &&
        ((mZeroBased % 12 + 12) % 12) === today.getMonth() &&
        y2 === today.getFullYear()){
      btn.classList.add('is-today');
    }

    // ---- Indicadores (bolinha + horário), limitados com "+N" ----
    const evsSorted = (byDate[key] || []).slice().sort((a,b)=> timeKey(a.time) - timeKey(b.time));
    const total = evsSorted.length;

    if (total){
      const wrap = document.createElement('div');
      wrap.className = 'cal-day__events';

      const show = evsSorted.slice(0, MAX_PILLS_PER_DAY);
      show.forEach(ev => {
        const pill = document.createElement('span');
        pill.className = 'cal-pill';
        pill.innerHTML = `<span class="cal-dot"></span><small class=" text3 cal-time">${ev.time || ''}</small>`;
        wrap.appendChild(pill);
      });

      if (total > MAX_PILLS_PER_DAY){
        const more = document.createElement('button');
        more.type = 'button';
        more.className = 'cal-pill cal-more';
        more.innerHTML = `+${total - MAX_PILLS_PER_DAY}`;
        more.addEventListener('click', (e) => { e.stopPropagation(); selectDay(key, evsSorted); });
        wrap.appendChild(more);
      }

      btn.appendChild(wrap);
    }

    // Abrir modal ao clicar no dia (mesmo sem eventos, mostra “Nenhum evento…”)
    btn.addEventListener('click', () => selectDay(key, evsSorted));

    return btn;
  }

  // ===== Modal =====
  function openModal(){ modal.setAttribute('aria-hidden','false'); }
  function closeModal(){ modal.setAttribute('aria-hidden','true'); }
  mClose?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  // Monta a lista completa para a data
  function selectDay(key, evs){
    mDate.textContent = brazilFmt(key);

    mList.innerHTML = '';
    if (!evs.length){
      mList.innerHTML = `<li class="cal-event"><div class="cal-event__title">Nenhum evento neste dia.</div></li>`;
    } else {
      evs.forEach(ev => {
        const li = document.createElement('li');
        li.className = 'cal-event';
        li.innerHTML = `
          <div class="cal-event__title">${ev.title}</div>
          <div class="cal-event__time text3">${ev.time}</div>
          ${ev.desc ? `<div class="text2">${ev.desc}</div>` : ''}
        `;
        mList.appendChild(li);
      });
    }
    openModal();
  }

  // Navegação
  btnPrev?.addEventListener('click', () => { view.setMonth(view.getMonth()-1); render(); });
  btnNext?.addEventListener('click', () => { view.setMonth(view.getMonth()+1); render(); });

  render();
})();
