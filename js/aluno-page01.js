// js/aluno-page.js

document.addEventListener('DOMContentLoaded', () => {
  const auth    = window.ECAuth;
  const dataApi = window.ECData;

  if (!auth || !dataApi) return;

  const user = auth.getCurrentUser();

  // se não houver usuário logado ou não for aluno, volta para login
  if (!user || user.role !== 'aluno') {
    // caminho relativo funciona bem em ambiente local
    window.location.href = './index.html';
    return;
  }

  // Atualiza o nome na saudação
  const nameSpan = document.querySelector('.welcome-name span');
  if (nameSpan) nameSpan.textContent = user.nome;

  const data   = dataApi.getAll();
  const grades = data.grades[user.matricula] || [];

  const table = document.getElementById('gradesTable');
  if (!table) return;

  // Mantém o header e recria o corpo
  const header = table.querySelector('tr.table-header');
  table.innerHTML = '';
  if (header) table.appendChild(header);

  grades.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="text1">${row.disciplina}</td>
      <td>${row.p1}</td>
      <td>${row.p2}</td>
      <td>${row.p3}</td>
      <td class="text1"></td>
    `;
    table.appendChild(tr);
  });

  // Recalcula médias se a função global existir
  if (window.ECRecalcGrades) {
    window.ECRecalcGrades();
  }
});
