// grades-chart.js (robusto p/ P1, P2, P3 + espaço nas pontas)
(() => {
  const toNum = (s) => {
    const n = parseFloat(String(s).trim().replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };

  const table = document.getElementById('gradesTable');
  const select = document.getElementById('subjectSelect');
  const canvas = document.getElementById('gradesChart');

  if (!table || !select || !canvas || !window.Chart) return;

  // --- Descobrir índices pelas colunas do THEAD (com fallback) ---
  const thTexts = Array.from(table.querySelectorAll('thead th')).map(th =>
    th.textContent.trim().toUpperCase()
  );

  const findIdx = (keys) => thTexts.findIndex(t => keys.includes(t));

  let idxSubj = findIdx(['MATÉRIA', 'MATERIA', 'DISCIPLINA', 'MAT', 'Disciplina']);
  let idxP1 = findIdx(['P1']);
  let idxP2 = findIdx(['P2']);
  let idxP3 = findIdx(['P3']);

  // Fallback para ordem padrão: Matéria, P1, P2, P3, FINAL
  if (idxSubj === -1) idxSubj = 0;
  if (idxP1 === -1) idxP1 = 1;
  if (idxP2 === -1) idxP2 = 2;
  if (idxP3 === -1) idxP3 = 3;

  // Labels presentes (só inclui se existir coluna de fato na linha)
  const LABELS = ['P1', 'P2', 'P3'].filter((_, i) => {
    const idx = [idxP1, idxP2, idxP3][i];
    return idx >= 0;
  });

  // --- Ler a tabela -> { Matéria: [P1, P2, P3] } ---
  const readTable = () => {
    const rows = table.querySelectorAll('tbody tr');
    const map = {};
    rows.forEach(tr => {
      const tds = tr.querySelectorAll('td');
      if (!tds.length) return;

      const subjCell = tds[idxSubj] || tds[0];
      const subj = subjCell ? subjCell.textContent.trim() : `Matéria ${Object.keys(map).length + 1}`;

      const vals = [];
      const indices = [idxP1, idxP2, idxP3];

      indices.forEach((idx) => {
        if (idx != null && idx >= 0 && tds[idx]) {
          const v = toNum(tds[idx].textContent);
          if (v != null) vals.push(v);
        }
      });

      map[subj] = vals;
    });
    return map;
  };

  const datasetBySubject = readTable();

  // --- Popular o <select> ---
  select.innerHTML = '';
  Object.keys(datasetBySubject).forEach((subj, i) => {
    const opt = document.createElement('option');
    opt.value = subj; opt.textContent = subj;
    if (i === 0) opt.selected = true;
    select.appendChild(opt);
  });

  // --- Cores / estilo ---
  const css = getComputedStyle(document.documentElement);
  const brand = (css.getPropertyValue('--color-primary') || '#ff1e6d').trim();
  const textColor = (css.getPropertyValue('--color-gray-6') || '#ffffff').trim();
  const gridColor = (css.getPropertyValue('--color-gray-4') || '#303030').trim();

console.log(textColor)

  const baseFont = 14;
  Chart.defaults.font.size = baseFont;
  Chart.defaults.color = textColor;
  Chart.defaults.font.family = 'Montserrat, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

  const ctx = canvas.getContext('2d');

  const makeConfig = (subject) => {
    const labels = LABELS.slice();
    const data = (datasetBySubject[subject] || []).slice();

    const cfg = {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: `Notas - ${subject}`,
          data,
          borderColor: brand,
          backgroundColor: brand + '33',
          pointBackgroundColor: brand,
          pointBorderColor: brand,
          pointRadius: 5,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#111318',
            borderColor: gridColor,
            borderWidth: 1,
            titleColor: textColor,
            bodyColor: textColor,
            displayColors: false,
            titleFont: { size: baseFont },
            bodyFont: { size: baseFont },
            callbacks: { label: (c) => ` ${c.parsed.y.toFixed(1)}` }
          }
        },
        scales: {
          x: {
            type: 'category',
            offset: true,
            min: -0.5,
            max: LABELS.length - 0.5,
            grid: { color: gridColor, drawTicks: false },
            ticks: { color: textColor, font: { size: baseFont } }
          },
          y: {
            min: 0, max: 10,
            grid: { color: gridColor, drawTicks: false },
            ticks: { stepSize: 2, color: textColor, font: { size: baseFont } }
          }
        }
      }
    }

    // Só aplica min/max se houver labels
    if(labels.length > 0) {
        cfg.options.scales.x.min = -0.5;
    cfg.options.scales.x.max = labels.length - 0.5;
  }

  return cfg;
};

// Evitar múltiplas instâncias
if (window.__gradesChart) { try { window.__gradesChart.destroy(); } catch { } }
let chart = new Chart(ctx, makeConfig(select.value));
window.__gradesChart = chart;

// Troca de matéria
select.addEventListener('change', () => {
  const subj = select.value;
  chart.data.labels = LABELS;
  chart.data.datasets[0].label = `Notas - ${subj}`;
  chart.data.datasets[0].data = datasetBySubject[subj] || [];

  if (LABELS.length > 0) {
    chart.options.scales.x.min = -0.5;
    chart.options.scales.x.max = LABELS.length - 0.5;
  } else {
    delete chart.options.scales.x.min;
    delete chart.options.scales.x.max;
  }
  chart.update();
});

// Observar mudanças na tabela (se editar valores/linhas)
const observer = new MutationObserver(() => {
  const newMap = readTable();
  // sincroniza mantendo referências
  Object.keys(datasetBySubject).forEach(k => delete datasetBySubject[k]);
  Object.assign(datasetBySubject, newMap);

  const subj = select.value;
  chart.data.labels = LABELS;
  chart.data.datasets[0].data = datasetBySubject[subj] || [];

  if (LABELS.length > 0) {
    chart.options.scales.x.min = -0.5;
    chart.options.scales.x.max = LABELS.length - 0.5;
  } else {
    delete chart.options.scales.x.min;
    delete chart.options.scales.x.max;
  }
  chart.update();
});

if (table.tBodies[0]) {
  observer.observe(table.tBodies[0], { subtree: true, characterData: true, childList: true });
}
}) ();

