// calendar.js – monta o calendário e lista eventos
(() => {
  const elDays = document.getElementById('calDays');
  const elMonth = document.getElementById('calMonth');
  const elYear = document.getElementById('calYear');
  const btnPrev = document.getElementById('calPrev');
  const btnNext = document.getElementById('calNext');

  const modal = document.getElementById('calModal');
  const mClose = document.getElementById('calModalClose');
  const mDate = document.getElementById('calModalDate');
  const mList = document.getElementById('calModalList');

  if (!elDays || !elMonth || !elYear) return;

  const MAX_PILLS_PER_DAY = 2;

  // autenticacao: identifica se é professor
  const auth = window.ECAuth;
  const currentUser = auth?.getCurrentUser?.();
  const IS_PROFESSOR = !!(currentUser && currentUser.role === 'professor');

  // eventos: tenta ler do ECData; se não houver, usa padrão
  const allData = window.ECData?.getAll?.();
  let EVENTS = allData?.events || [
    { date: '2025-12-23', time: '11:00', title: 'Entrega: Atividade 2 - Python', desc: 'Entrega via portal.' },
    { date: '2025-12-23', time: '14:00', title: 'Prova 3 - React', desc: 'Conteúdo: hooks e roteamento.' },
    { date: '2025-12-25', time: 'Dia todo', title: 'Recesso', desc: 'Sem aulas.' }
  ];

  let byDate = {};
  function rebuildIndex() {
    byDate = EVENTS.reduce((acc, ev) => {
      (acc[ev.date] ||= []).push(ev);
      return acc;
    }, {});
  }
  rebuildIndex();


  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function fmtDateKey(y, m, d) {
    return y + '-' + pad2(m) + '-' + pad2(d);
  }

  const MONTHS = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];

  function timeKey(t) {
    if (t === 'Dia todo') return 0;
    const m = /^(\d{2}):(\d{2})$/.exec(t || '');
    if (!m) return 1e9;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }

  function deleteEvent(ev) {
    if (!allData || !Array.isArray(EVENTS)) return;

    const idx = EVENTS.indexOf(ev);
    if (idx === -1) return;

    // remove da lista em memória
    EVENTS.splice(idx, 1);
    if (allData && Array.isArray(allData.events)) {
      allData.events = EVENTS;
    }

    // persiste
    if (window.ECData && typeof window.ECData.save === 'function') {
      window.ECData.save();
    }

    // reindexa e redesenha
    rebuildIndex();
    render();

    // avisa outras páginas (professor) para atualizarem cards de "Próximos eventos"
    if (typeof window.ECOnEventsChanged === 'function') {
      window.ECOnEventsChanged();
    }
  }

  // função global usada por outras páginas (ex.: professor) para recarregar calendário
  window.ECRefreshCalendar = function () {
    if (window.ECData && typeof window.ECData.getAll === 'function') {
      const fresh = window.ECData.getAll();
      if (fresh && Array.isArray(fresh.events)) {
        EVENTS = fresh.events;
        rebuildIndex();
        render();
      }
    }
  };

  function brazilFmt(key) {
    const parts = key.split('-');
    if (parts.length !== 3) return key;
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  let view = new Date();

  function makeDay(dayNumber, isOut, yearRef, monthZeroBased) {
    const y = yearRef;
    const m = monthZeroBased + 1;
    const key = fmtDateKey(y, m, dayNumber);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cal-day';
    if (isOut) btn.classList.add('is-out');

    const head = document.createElement('div');
    head.className = 'cal-day__num text3';
    head.textContent = dayNumber;
    btn.appendChild(head);

    const today = new Date();
    if (
      !isOut &&
      dayNumber === today.getDate() &&
      monthZeroBased === today.getMonth() &&
      y === today.getFullYear()
    ) {
      btn.classList.add('is-today');
    }

    const list = byDate[key];
    if (list && list.length) {
      const wrap = document.createElement('div');
      wrap.className = 'cal-day__events';

      list
        .slice()
        .sort(function (a, b) { return timeKey(a.time) - timeKey(b.time); })
        .slice(0, MAX_PILLS_PER_DAY)
        .forEach(function (ev) {
          const pill = document.createElement('span');
          pill.className = 'cal-pill';

          const dot = document.createElement('span');
          dot.className = 'cal-dot';

          const time = document.createElement('span');
          time.className = 'cal-time';
          time.textContent = ev.time || '';

          pill.appendChild(dot);
          pill.appendChild(time);
          wrap.appendChild(pill);
        });

      if (list.length > MAX_PILLS_PER_DAY) {
        const more = document.createElement('span');
        more.className = 'cal-pill';
        more.textContent = '+' + (list.length - MAX_PILLS_PER_DAY);
        wrap.appendChild(more);
      }

      btn.appendChild(wrap);

      btn.addEventListener('click', function () {
        if (!modal || !mDate || !mList) return;

        mDate.textContent = brazilFmt(key);
        mList.innerHTML = '';

        list
          .slice()
          .sort((a, b) => timeKey(a.time) - timeKey(b.time))
          .forEach(ev => {
            const li = document.createElement('li');
            li.className = 'cal-modal__item';

            const row = document.createElement('div');
            row.className = 'cal-modal__row';

            const main = document.createElement('div');
            main.className = 'cal-modal__main';

            const timeEl = document.createElement('span');
            timeEl.className = 'cal-event__time';
            timeEl.textContent = ev.time;

            const titleEl = document.createElement('span');
            titleEl.className = 'cal-event__title';
            titleEl.textContent = ev.title;

            main.appendChild(timeEl);
            main.appendChild(titleEl);

            if (ev.desc) {
              const descEl = document.createElement('p');
              descEl.className = 'cal-event__desc';
              descEl.textContent = ev.desc;
              main.appendChild(descEl);
            }

            row.appendChild(main);

            let confirmBox = null;

            // só professor vê o botão de excluir
            if (IS_PROFESSOR) {
              const actions = document.createElement('div');
              actions.className = 'cal-modal__actions';

              const delBtn = document.createElement('button');
              delBtn.type = 'button';
              delBtn.className = 'cal-modal__icon-btn cal-modal__delete-btn';
              delBtn.setAttribute('aria-label', 'Excluir evento');
              actions.appendChild(delBtn);

              row.appendChild(actions);

              confirmBox = document.createElement('div');
              confirmBox.className = 'cal-modal__confirm';

              const msg = document.createElement('p');
              msg.className = 'text3 cal-confirm-text';
              msg.textContent = 'Você realmente quer excluir o evento para você e para os alunos?';

              const btnRow = document.createElement('div');
              btnRow.className = 'cal-confirm-actions';

              const cancelBtn = document.createElement('button');
              cancelBtn.type = 'button';
              cancelBtn.className = 'text3 cal-btn-secondary';
              cancelBtn.textContent = 'Cancelar';

              const okBtn = document.createElement('button');
              okBtn.type = 'button';
              okBtn.className = 'text3 cal-btn-danger';
              okBtn.textContent = 'Excluir';

              btnRow.appendChild(cancelBtn);
              btnRow.appendChild(okBtn);

              confirmBox.appendChild(msg);
              confirmBox.appendChild(btnRow);

              delBtn.addEventListener('click', () => {
                confirmBox.classList.add('is-open');
              });

              cancelBtn.addEventListener('click', () => {
                confirmBox.classList.remove('is-open');
              });

              okBtn.addEventListener('click', () => {
                deleteEvent(ev);
                confirmBox.classList.remove('is-open');
                li.remove();

                const updatedList = byDate[key] || [];
                if (!updatedList.length) {
                  modal.classList.remove('open');
                }
              });
            }

            li.appendChild(row);
            if (confirmBox) {
              li.appendChild(confirmBox);
            }

            mList.appendChild(li);
          });

        modal.classList.add('open');


        modal.setAttribute('aria-hidden', 'false');
      });
    }

    return btn;
  }

  function render() {

    const year = view.getFullYear();
    const month = view.getMonth();

    const monthName = MONTHS[month] || '';
    elMonth.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    elYear.textContent = String(year);

    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const daysInMonth = last.getDate();
    const startOffset = first.getDay();

    elDays.innerHTML = '';

    const prevLast = new Date(year, month, 0).getDate();
    for (let i = 0; i < startOffset; i++) {
      const num = prevLast - (startOffset - 1 - i);
      elDays.appendChild(makeDay(num, true, year, month - 1));
    }

    for (let d = 1; d <= daysInMonth; d++) {
      elDays.appendChild(makeDay(d, false, year, month));
    }

    const cells = elDays.children.length;
    const toFill = (Math.ceil(cells / 7) * 7) - cells;
    for (let i = 1; i <= toFill; i++) {
      elDays.appendChild(makeDay(i, true, year, month + 1));
    }
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', function () {
      view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
      render();
    });
  }
  if (btnNext) {
    btnNext.addEventListener('click', function () {
      view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
      render();
    });
  }

  if (mClose && modal) {
    mClose.addEventListener('click', function () {
      modal.setAttribute('aria-hidden', 'true');
    });
  }
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        modal.setAttribute('aria-hidden', 'true');
      }
    });
  }

  // primeira renderização
  render();

})();
