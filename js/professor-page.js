// js/professor-page.js

document.addEventListener('DOMContentLoaded', () => {
  const auth = window.ECAuth;
  const dataApi = window.ECData;

  if (!auth || !dataApi) return;

  const user = auth.getCurrentUser();

  // apenas professores acessam
  if (!user || user.role !== 'professor') {
    window.location.href = './index.html';
    return;
  }

  // SEMPRE carrega os dados já normalizados
  const data = dataApi.getAll();

  function recalcProfAvgCard() {
    if (window.ECRecalcProfAvg) {
      window.ECRecalcProfAvg();
    }
  }

  // --------- saudação / contagem de alunos ----------
  const nameSpan = document.querySelector('.welcome-name span');
  if (nameSpan) nameSpan.textContent = user.nome || 'Professor';

  // alunos = todos os usuários com role "aluno"
  const students = Object.values(data.users || {}).filter(
    (u) => u && u.role === 'aluno'
  );

  // todas as disciplinas presentes nas notas (fallback de apresentação)
  const allSubjectsFromGrades = Object.values(data.grades || {}).flatMap(
    (list) => (list || []).map((g) => g.disciplina)
  );
  const uniqueAllSubjects = [...new Set(allSubjectsFromGrades)];

  // disciplinas do professor; se não houver, usa todas (dados de exemplo)
  let subjectsForTeacher = data.subjectsByTeacher[user.matricula];
  if (!subjectsForTeacher || !subjectsForTeacher.length) {
    subjectsForTeacher = uniqueAllSubjects;
  }

  const studentsCountNode = document.getElementById('profStudentsCount');

  const studentsWithThisTeacher = students.filter((stu) => {
    const grades = data.grades[stu.matricula] || [];
    return grades.some((g) => subjectsForTeacher.includes(g.disciplina));
  });

  if (studentsCountNode) {
    studentsCountNode.textContent = String(studentsWithThisTeacher.length);
  }

    // =========================================================
    // PRÓXIMOS EVENTOS
    // =========================================================

    const eventsContainer = document.getElementById('profEventsContainer');

    function parseDateTime(ev) {
        const [y, m, d] = ev.date.split('-').map(Number);
        if (ev.time === 'Dia todo') return new Date(y, m - 1, d, 0, 0, 0);
        const [hh, mm] = (ev.time || '00:00').split(':').map(Number);
        return new Date(y, m - 1, d, hh, mm, 0);
    }

    function renderUpcomingEvents() {
        if (!eventsContainer) return;

        eventsContainer.innerHTML = '';

        const now = new Date();
        const upcoming = (data.events || [])
            .slice()
            .filter(ev => {
                try {
                    return parseDateTime(ev) >= now;
                } catch {
                    return true;
                }
            })
            .sort((a, b) => parseDateTime(a) - parseDateTime(b))
            .slice(0, 3);

        if (!upcoming.length) {
            const p = document.createElement('p');
            p.className = 'text3';
            p.style.color = 'var(--color-gray-5)';
            p.textContent = 'Nenhum evento futuro cadastrado.';
            eventsContainer.appendChild(p);
            return;
        }

        upcoming.forEach(ev => {
            const [y, m, d] = ev.date.split('-');
            const dateStr = `${d}/${m}`;
            const timeStr = ev.time || 'Dia todo';

            const card = document.createElement('div');
            card.className = 'container next-event-container';
            card.innerHTML = `
        <div class="container next-event-header">
          <h1 class="title1 next-event-date">${dateStr}</h1>
          <p class="text2 next-event-time">${timeStr}</p>
        </div>
        <h2 class="title2 next-event-description">${ev.title}</h2>
      `;
            eventsContainer.appendChild(card);
        });
    }

    renderUpcomingEvents();

    // sempre que o calendário alterar a lista de eventos (criar/excluir),
    // ele pode chamar ECOnEventsChanged para atualizar os cards
    window.ECOnEventsChanged = () => {
        renderUpcomingEvents();
    };

    // =========================================================
    // MODAL DE NOVO EVENTO
    // =========================================================

    const btnNewEvent = document.getElementById('btnNewEvent');
    const eventModal = document.getElementById('eventModal');
    const eventModalCls = document.getElementById('eventModalClose');
    const eventForm = document.getElementById('eventForm');
    const eventTitleI = document.getElementById('eventTitle');
    const eventDateI = document.getElementById('eventDate');
    const eventTimeI = document.getElementById('eventTime');
    const eventAllDayI = document.getElementById('eventAllDay');
    const eventGroupI = document.getElementById('eventGroup');
    const eventDescI = document.getElementById('eventDesc');
    const eventCancel = document.getElementById('eventCancel');

    // Sincroniza campo de horário com o checkbox "Dia todo"
    if (eventAllDayI && eventTimeI) {
        const syncTimeDisabled = () => {
            if (eventAllDayI.checked) {
                eventTimeI.value = '';
                eventTimeI.disabled = true;
            } else {
                eventTimeI.disabled = false;
            }
        };

        eventAllDayI.addEventListener('change', syncTimeDisabled);
        // estado inicial
        syncTimeDisabled();
    }

    function openEventModal() {
        if (!eventModal) return;
        eventModal.setAttribute('aria-hidden', 'false');

        // limpa campos
        if (eventTitleI) eventTitleI.value = '';
        if (eventDateI) eventDateI.value = '';
        if (eventTimeI) eventTimeI.value = '';

        // "Dia todo" marcado por padrão
        if (eventAllDayI) eventAllDayI.checked = true;
        if (eventTimeI) {
            eventTimeI.value = '';
            eventTimeI.disabled = true;
        }

        if (eventGroupI) eventGroupI.value = 'Todos';
        if (eventDescI) eventDescI.value = '';
    }

    function closeEventModal() {
        if (!eventModal) return;
        eventModal.setAttribute('aria-hidden', 'true');
    }

    if (btnNewEvent) {
        btnNewEvent.addEventListener('click', openEventModal);
    }
    if (eventModalCls) {
        eventModalCls.addEventListener('click', closeEventModal);
    }
    if (eventCancel) {
        eventCancel.addEventListener('click', (e) => {
            e.preventDefault();
            closeEventModal();
        });
    }
    if (eventModal) {
        eventModal.addEventListener('click', (e) => {
            if (e.target === eventModal) closeEventModal();
        });
    }

    if (eventForm) {
        eventForm.addEventListener('submit', (e) => {
            e.preventDefault();

            if (!eventTitleI.value || !eventDateI.value) {
                alert('Preencha ao menos título e data do evento.');
                return;
            }

            const title = eventTitleI.value.trim();
            const date = eventDateI.value;
            let time = eventTimeI.value;

            if (eventAllDayI.checked || !time) {
                time = 'Dia todo';
            }

            const group = eventGroupI.value || 'Todos';
            const descExtra = eventDescI.value.trim();

            const newEvent = {
                id: 'EVT_' + Date.now(),
                date,
                time,
                title,
                desc: `Grupo: ${group}` + (descExtra ? ` — ${descExtra}` : '')
            };

            data.events.push(newEvent);
            dataApi.save();

            renderUpcomingEvents();
            if (window.ECRefreshCalendar) window.ECRefreshCalendar();

            closeEventModal();
            alert('Evento criado com sucesso.');
        });
    }

    // =========================================================
    // LISTA DE ALUNOS / NOTAS
    // =========================================================

    const tblStudents = document.getElementById('profStudentsTable');
    const filterSearch = document.getElementById('filterSearch');
    const filterSubject = document.getElementById('filterSubject');
    const filterGroup = document.getElementById('filterGroup');

    let rowsData = [];

    function buildRowsData() {
        rowsData = [];

        studentsWithThisTeacher.forEach(stu => {
            const grades = data.grades[stu.matricula] || [];
            grades
                .filter(g => subjectsForTeacher.includes(g.disciplina))
                .forEach(g => {
                    const vals = [g.p1, g.p2, g.p3].map(v => Number(v) || 0);
                    const media = vals.length
                        ? vals.reduce((a, b) => a + b, 0) / vals.length
                        : 0;

                    rowsData.push({
                        alunoNome: stu.nome,
                        matricula: stu.matricula,
                        disciplina: g.disciplina,
                        p1: g.p1,
                        p2: g.p2,
                        p3: g.p3,
                        media,
                    });
                });
        });
    }

    function populateSubjectFilter() {
        if (!filterSubject) return;
        filterSubject.innerHTML = '<option value="">Todas as disciplinas</option>';
        subjectsForTeacher.forEach(subj => {
            const opt = document.createElement('option');
            opt.value = subj;
            opt.textContent = subj;
            filterSubject.appendChild(opt);
        });
    }

    function applyFilters() {
        const search = (filterSearch?.value || '').toLowerCase();
        const subj = filterSubject?.value || '';
        const group = filterGroup?.value || '';

        return rowsData.filter(r => {
            if (subj && r.disciplina !== subj) return false;

            if (search) {
                const txt = (r.alunoNome + ' ' + r.matricula).toLowerCase();
                if (!txt.includes(search)) return false;
            }

            if (group === 'low' && r.media >= 6) return false;
            if (group === 'high' && r.media < 6) return false;

            return true;
        });
    }

    function renderStudentsTable() {
        if (!tblStudents) return;

        const header = tblStudents.querySelector('tr.table-header');
        tblStudents.innerHTML = '';
        if (header) tblStudents.appendChild(header);

        const filtered = applyFilters();

        filtered.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td class="text1">${r.alunoNome}</td>
        <td>${r.matricula}</td>
        <td>${r.disciplina}</td>
        <td>${r.p1}</td>
        <td>${r.p2}</td>
        <td>${r.p3}</td>
        <td class="text1">${r.media.toFixed(1)}</td>
        <td><button class="text3" data-edit="${r.matricula}|||${r.disciplina}" style="background:transparent; color:var(--color-primary);">Editar</button></td>
      `;
            tblStudents.appendChild(tr);
        });
    }

    buildRowsData();
    populateSubjectFilter();
    renderStudentsTable();
    recalcProfAvgCard(); // atualiza o card "Média dos alunos"

    if (filterSearch) filterSearch.addEventListener('input', () => {
        renderStudentsTable();
        recalcProfAvgCard();
    });
    if (filterSubject) filterSubject.addEventListener('change', () => {
        renderStudentsTable();
        recalcProfAvgCard();
    });
    if (filterGroup) filterGroup.addEventListener('change', () => {
        renderStudentsTable();
        recalcProfAvgCard();
    });

    if (tblStudents) {
        tblStudents.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-edit]');
            if (!btn) return;

            const [matricula, disciplina] = btn.dataset.edit.split('|||');
            const grades = data.grades[matricula] || [];
            const row = grades.find(g => g.disciplina === disciplina);
            if (!row) return;

            const p1 = prompt(`P1 de ${disciplina} para ${matricula}:`, row.p1);
            if (p1 === null) return;
            const p2 = prompt(`P2 de ${disciplina} para ${matricula}:`, row.p2);
            if (p2 === null) return;
            const p3 = prompt(`P3 de ${disciplina} para ${matricula}:`, row.p3);
            if (p3 === null) return;

            row.p1 = Number(p1);
            row.p2 = Number(p2);
            row.p3 = Number(p3);

            dataApi.save();
            buildRowsData();
            renderStudentsTable();
            recalcProfAvgCard();

            alert('Notas atualizadas. O aluno verá as alterações no boletim.');

        });
    }

    // =========================================================
    // ATIVIDADES
    // =========================================================

    const activityForm = document.getElementById('activityForm');
    const activitySubjectSel = document.getElementById('activitySubject');
    const activityTitleInput = document.getElementById('activityTitle');
    const activityDueInput = document.getElementById('activityDueDate');
    const activityDescInput = document.getElementById('activityDescription');
    const tblActivities = document.getElementById('profActivitiesTable');

    function populateActivitySubjectSelect() {
        if (!activitySubjectSel) return;
        activitySubjectSel.innerHTML = '';
        subjectsForTeacher.forEach(subj => {
            const opt = document.createElement('option');
            opt.value = subj;
            opt.textContent = subj;
            activitySubjectSel.appendChild(opt);
        });
    }

    function renderActivitiesTable() {
        if (!tblActivities) return;

        const header = tblActivities.querySelector('tr.table-header');
        tblActivities.innerHTML = '';
        if (header) tblActivities.appendChild(header);

        (data.activities || [])
            .filter(a => subjectsForTeacher.includes(a.subject))
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
            .forEach(a => {
                const [y, m, d] = a.dueDate.split('-');
                const dateStr = `${d}/${m}/${y}`;
                const tr = document.createElement('tr');
                tr.innerHTML = `
          <td class="text1">${a.subject}</td>
          <td>${a.title}</td>
          <td>${dateStr}</td>
          <td>${a.description || ''}</td>
        `;
                tblActivities.appendChild(tr);
            });
    }

    populateActivitySubjectSelect();
    renderActivitiesTable();

    if (activityForm) {
        activityForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!activitySubjectSel.value || !activityTitleInput.value || !activityDueInput.value) {
                alert('Preencha disciplina, título e data de entrega.');
                return;
            }

            const newActivity = {
                id: 'ATV_' + Date.now(),
                subject: activitySubjectSel.value,
                title: activityTitleInput.value.trim(),
                dueDate: activityDueInput.value,
                description: activityDescInput.value.trim()
            };

            data.activities.push(newActivity);

            data.events.push({
                id: 'EVT_' + Date.now(),
                date: newActivity.dueDate,
                time: '11:00',
                title: `Entrega: ${newActivity.title}`,
                desc: `Disciplina: ${newActivity.subject}`
            });

            dataApi.save();

            renderActivitiesTable();
            renderUpcomingEvents();
            if (window.ECRefreshCalendar) window.ECRefreshCalendar();

            activityTitleInput.value = '';
            activityDueInput.value = '';
            activityDescInput.value = '';

            alert('Atividade criada e adicionada ao calendário dos alunos.');
        });
    }
});
