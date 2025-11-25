const button = document.getElementById('theme-btn');
const icon = document.getElementById('theme-img');

button.addEventListener('click', function() {
  document.documentElement.classList.toggle('light-mode');

  // Muda o ícone dependendo do tema
  if (document.documentElement.classList.contains('light-mode')) {
    icon.src = 'icons/black_moon.svg';  // Ícone da lua (modo claro)
  } else {
    icon.src = 'icons/white_sun.svg';  // Ícone do sol (modo escuro)
  }
});

// Muda o ícone quando o mouse passa por cima do botão
button.addEventListener('mouseover', function() {
  if (!document.documentElement.classList.contains('light-mode')) {
    icon.src = 'icons/suncolor.svg';  // Ícone de destaque para o sol
  } else {
    icon.src = 'icons/mooncolor.svg';  // Ícone de destaque para a lua
  }
});

// Restaura o ícone ao sair do hover
button.addEventListener('mouseout', function() {
  if (!document.documentElement.classList.contains('light-mode')) {
    icon.src = 'icons/white_sun.svg';  // Ícone para o modo escuro
  } else {
    icon.src = 'icons/black_moon.svg';  // Ícone para o modo claro
  }
});


(() => {
  const table = document.getElementById('gradesTable');
  const avgNode = document.querySelector('.avg-number');

  if (!table || !avgNode) return;

  // número com vírgula ou ponto
  const toNum = (s) => {
    const n = parseFloat(String(s).trim().replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };
  const fmt = (n) => (Number.isFinite(n) ? n.toFixed(1) : '—');

  // localiza índices das colunas por título (mais robusto)
  const headerCells = Array.from(table.querySelectorAll('tr.table-header th')).map(th =>
    th.textContent.trim().toUpperCase()
  );
  const idxOf = (labelList) => headerCells.findIndex(t => labelList.includes(t));

  const idxDisc  = idxOf(['DISCIPLINA','MATÉRIA','MATERIA','MAT']) >= 0 ? idxOf(['DISCIPLINA','MATÉRIA','MATERIA','MAT']) : 0;
  const idxP1    = idxOf(['P1']);
  const idxP2    = idxOf(['P2']);
  const idxP3    = idxOf(['P3']);
  const idxFinal = idxOf(['FINAL']);

  function recalc() {
    const rows = Array.from(table.querySelectorAll('tr')).filter(tr => !tr.classList.contains('table-header'));

    let finals = [];

    rows.forEach(tr => {
      const tds = tr.querySelectorAll('td');
      if (!tds.length) return;

      // lê P1..P3 existentes
      const vals = [];
      if (idxP1 >= 0 && tds[idxP1]) { const v = toNum(tds[idxP1].textContent); if (v != null) vals.push(v); }
      if (idxP2 >= 0 && tds[idxP2]) { const v = toNum(tds[idxP2].textContent); if (v != null) vals.push(v); }
      if (idxP3 >= 0 && tds[idxP3]) { const v = toNum(tds[idxP3].textContent); if (v != null) vals.push(v); }

      // média da matéria (somente se houver pelo menos 1 nota)
      const avg = vals.length ? (vals.reduce((a,b)=>a+b,0) / vals.length) : null;

      // escreve na coluna FINAL (se existir)
      if (idxFinal >= 0 && tds[idxFinal]) {
        tds[idxFinal].textContent = fmt(avg);
      }

      if (avg != null) finals.push(avg);
    });

    // média geral das FINAIS
    const overall = finals.length ? (finals.reduce((a,b)=>a+b,0) / finals.length) : null;
    avgNode.textContent = fmt(overall);
  }

  // calcula agora
  recalc();

  // observa mudanças na tabela (edições manuais/dinâmicas)
  const obs = new MutationObserver(recalc);
  obs.observe(table, { subtree: true, characterData: true, childList: true });

  // se você atualizar notas via input/blur, pode chamar recalc() também
})();
