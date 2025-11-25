// ============ TEMA CLARO/ESCURO ============
document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('theme-btn');
  const icon = document.getElementById('theme-img');

  if (!button || !icon) return;

  const ICON_BASE = '../icons/';

  function setIconForCurrentTheme() {
    const isLight = document.documentElement.classList.contains('light-mode');
    icon.src = isLight
      ? ICON_BASE + 'black_moon.svg'
      : ICON_BASE + 'white_sun.svg';
  }

  button.addEventListener('click', () => {
    document.documentElement.classList.toggle('light-mode');
    setIconForCurrentTheme();
  });

  button.addEventListener('mouseover', () => {
    const isLight = document.documentElement.classList.contains('light-mode');
    icon.src = isLight
      ? ICON_BASE + 'mooncolor.svg'
      : ICON_BASE + 'suncolor.svg';
  });

  button.addEventListener('mouseout', () => {
    setIconForCurrentTheme();
  });

  // inicia com o ícone correto
  setIconForCurrentTheme();
});

// ============ CÁLCULO DE MÉDIAS (BOLETIM) ============
document.addEventListener('DOMContentLoaded', () => {
  const table = document.getElementById('gradesTable');
  const avgNode = document.querySelector('.avg-number');

  if (!table || !avgNode) return;

  const toNum = (s) => {
    const n = parseFloat(String(s).trim().replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };
  const fmt = (n) => (Number.isFinite(n) ? n.toFixed(1) : '—');

  const headerCells = Array.from(
    table.querySelectorAll('tr.table-header th')
  ).map(th => th.textContent.trim().toUpperCase());

  const idxOf = (labels) => headerCells.findIndex(t => labels.includes(t));

  const idxDisc = idxOf(['DISCIPLINA', 'MATÉRIA', 'MATERIA', 'MAT']) >= 0
    ? idxOf(['DISCIPLINA', 'MATÉRIA', 'MATERIA', 'MAT'])
    : 0;
  const idxP1 = idxOf(['P1']);
  const idxP2 = idxOf(['P2']);
  const idxP3 = idxOf(['P3']);
  const idxFinal = idxOf(['FINAL']);

  function recalc() {
    const rows = Array.from(table.querySelectorAll('tr'))
      .filter(tr => !tr.classList.contains('table-header'));

    const finals = [];

    rows.forEach(tr => {
      const tds = tr.querySelectorAll('td');
      if (!tds.length) return;

      const vals = [];

      if (idxP1 >= 0 && tds[idxP1]) {
        const v = toNum(tds[idxP1].textContent);
        if (v != null) vals.push(v);
      }
      if (idxP2 >= 0 && tds[idxP2]) {
        const v = toNum(tds[idxP2].textContent);
        if (v != null) vals.push(v);
      }
      if (idxP3 >= 0 && tds[idxP3]) {
        const v = toNum(tds[idxP3].textContent);
        if (v != null) vals.push(v);
      }

      const avg = vals.length
        ? vals.reduce((a, b) => a + b, 0) / vals.length
        : null;

      if (idxFinal >= 0 && tds[idxFinal]) {
        tds[idxFinal].textContent = fmt(avg);
      }

      if (avg != null) finals.push(avg);
    });

    const overall = finals.length
      ? finals.reduce((a, b) => a + b, 0) / finals.length
      : null;

    avgNode.textContent = fmt(overall);
  }

  // calcula uma vez após a página pronta (já com dados do aluno)
  recalc();

  // se futuramente editar notas via JS, chame ECRecalcGrades()
  window.ECRecalcGrades = recalc;
});

// Média geral dos alunos na página do professor
(() => {
  const table = document.getElementById('profStudentsTable');
  const avgNode = document.getElementById('profStudentsAvg');

  // se não estiver na página do professor, não faz nada
  if (!table || !avgNode) return;

  const toNum = (s) => {
    const n = parseFloat(String(s).trim().replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };

  const fmt = (n) => (Number.isFinite(n) ? n.toFixed(1) : '—');

  // pega os índices das colunas pela linha de header
  const headerCells = Array.from(
    table.querySelectorAll('tr.table-header th')
  ).map((th) => th.textContent.trim().toUpperCase());

  const idxOf = (labels) =>
    headerCells.findIndex((h) =>
      labels.some((lbl) => h === lbl || h.includes(lbl))
    );

  const idxP1 = idxOf(['P1']);
  const idxP2 = idxOf(['P2']);
  const idxP3 = idxOf(['P3']);
  const idxMedia = idxOf(['MÉDIA', 'MEDIA']);

  const getCellNumber = (td) => {
    if (!td) return null;
    const input = td.querySelector('input');
    const raw = input ? input.value : td.textContent;
    return toNum(raw);
  };

  function recalc() {
    const rows = Array.from(table.querySelectorAll('tr'))
      .filter((tr) => !tr.classList.contains('table-header'));

    const medias = [];

    rows.forEach((tr) => {
      const tds = tr.querySelectorAll('td');
      if (!tds.length) return;

      const vals = [];

      if (idxP1 >= 0 && tds[idxP1]) {
        const v = getCellNumber(tds[idxP1]);
        if (v != null) vals.push(v);
      }
      if (idxP2 >= 0 && tds[idxP2]) {
        const v = getCellNumber(tds[idxP2]);
        if (v != null) vals.push(v);
      }
      if (idxP3 >= 0 && tds[idxP3]) {
        const v = getCellNumber(tds[idxP3]);
        if (v != null) vals.push(v);
      }


      const media = vals.length
        ? vals.reduce((a, b) => a + b, 0) / vals.length
        : null;

      // escreve na coluna "Média" se ela existir
      if (idxMedia >= 0 && tds[idxMedia]) {
        tds[idxMedia].textContent = fmt(media);
      }

      if (media != null) medias.push(media);
    });

    // média geral de todas as médias das linhas
    const overall =
      medias.length > 0
        ? medias.reduce((a, b) => a + b, 0) / medias.length
        : null;

    avgNode.textContent = fmt(overall);
  }

  // calcula uma vez ao carregar a página do professor
  recalc();

  // se no futuro você mudar notas via JS, pode chamar isso:
  window.ECRecalcProfAvg = recalc;
})();