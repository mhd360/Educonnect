// grades-chart.js – lê a tabela #gradesTable e monta o gráfico de notas
(() => {
  const table  = document.getElementById('gradesTable');
  const select = document.getElementById('subjectSelect');
  const canvas = document.getElementById('gradesChart');

  if (!table || !select || !canvas || !window.Chart) return;

  // pega a cor primária do tema (CSS variable)
  const rootStyle    = getComputedStyle(document.documentElement);
  const primaryColor = (rootStyle.getPropertyValue('--color-primary') || '#ff1164').trim();

  const toNum = (s) => {
    const n = parseFloat(String(s).trim().replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };

  // ===== header (linha com class="table-header") =====
  const headerRow = table.querySelector('tr.table-header');
  if (!headerRow) return;

  const thTexts = Array.from(headerRow.querySelectorAll('th')).map(th =>
    th.textContent.trim().toUpperCase()
  );

  const findIdx = (keys) => thTexts.findIndex(t => keys.includes(t));

  let idxSubj = findIdx(['DISCIPLINA', 'MATÉRIA', 'MATERIA', 'MAT']);
  let idxP1   = findIdx(['P1']);
  let idxP2   = findIdx(['P2']);
  let idxP3   = findIdx(['P3']);

  // fallback padrão: Disciplina, P1, P2, P3, FINAL
  if (idxSubj === -1) idxSubj = 0;
  if (idxP1   === -1) idxP1   = 1;
  if (idxP2   === -1) idxP2   = 2;
  if (idxP3   === -1) idxP3   = 3;

  const LABELS = ['P1', 'P2', 'P3'].filter((_, i) => {
    const idx = [idxP1, idxP2, idxP3][i];
    return idx >= 0;
  });

  // ===== lê a tabela -> { Disciplina: [P1,P2,P3] } =====
  const readTable = () => {
    let rows = Array.from(table.querySelectorAll('tbody tr'));
    if (!rows.length) {
      rows = Array.from(table.querySelectorAll('tr'))
        .filter(tr => !tr.classList.contains('table-header'));
    }

    const map = {};

    rows.forEach(tr => {
      const tds = tr.querySelectorAll('td');
      if (!tds.length) return;

      const subj = (tds[idxSubj] ? tds[idxSubj].textContent.trim() : '').trim() || 'Disciplina';

      const vals = [];
      if (idxP1 >= 0 && tds[idxP1]) {
        const v1 = toNum(tds[idxP1].textContent);
        if (v1 != null) vals.push(v1);
      }
      if (idxP2 >= 0 && tds[idxP2]) {
        const v2 = toNum(tds[idxP2].textContent);
        if (v2 != null) vals.push(v2);
      }
      if (idxP3 >= 0 && tds[idxP3]) {
        const v3 = toNum(tds[idxP3].textContent);
        if (v3 != null) vals.push(v3);
      }

      map[subj] = vals;
    });

    return map;
  };

  let dataBySubject = readTable();

  // ===== select de disciplinas =====
  const populateSelect = () => {
    select.innerHTML = '';
    const subjects = Object.keys(dataBySubject);

    subjects.forEach((name, i) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      if (i === 0) opt.selected = true;
      select.appendChild(opt);
    });
  };

  // ===== opções do gráfico (estilo igual ao tema) =====
  const baseFont = 14;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#111318',
        borderColor: '#282C34',
        borderWidth: 1,
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        displayColors: false,
        titleFont: { size: baseFont },
        bodyFont: { size: baseFont },
        callbacks: {
          label: (c) => ` ${c.parsed.y.toFixed(1)}`
        }
      }
    },
    scales: {
      x: {
        type: 'category',
        offset: true, // espaço antes do primeiro e depois do último ponto
        ticks: {
          font: { size: baseFont }
        },
        grid: { display: false }
      },
      y: {
        suggestedMin: 0,
        suggestedMax: 10,
        ticks: {
          stepSize: 2,              // mostra 0, 2, 4, 6, 8, 10
          font: { size: baseFont }
        }
      }
    }
  };

  // ===== criação/atualização do gráfico =====
  let chart = null;

  const updateChart = () => {
    const subj = select.value;
    const vals = dataBySubject[subj] || [];

    const ctx = canvas.getContext('2d');

    if (chart) {
      chart.data.labels = LABELS;
      chart.data.datasets[0].data = vals;
      chart.update();
      return;
    }

    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: LABELS,
        datasets: [{
          data: vals,
          borderWidth: 3,
          pointRadius: 5,
          tension: 0.25,
          borderColor: primaryColor,
          backgroundColor: primaryColor,
          pointBackgroundColor: primaryColor,
          pointBorderColor: '#ffffff',
          pointHoverRadius: 6
        }]
      },
      options: chartOptions
    });
  };

  // inicializa
  populateSelect();
  updateChart();

  // muda disciplina
  select.addEventListener('change', updateChart);

  // se a tabela mudar (ex.: futuras edições), atualiza gráfico
  const obs = new MutationObserver(() => {
    dataBySubject = readTable();
    populateSelect();
    updateChart();
  });
  obs.observe(table, { subtree: true, childList: true, characterData: true });
})();
