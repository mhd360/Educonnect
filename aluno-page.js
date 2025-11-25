// js/aluno-page.js

document.addEventListener('DOMContentLoaded', () => {
  const user = window.ECAuth?.getCurrentUser();

  // se não houver usuário logado ou não for aluno, volta para login
  if (!user || user.role !== 'aluno') {
    window.location.href = '/pages/index.html';
    return;
  }

  // Atualiza o nome na saudação
  const nameSpan = document.querySelector('.welcome-name span');
  if (nameSpan) nameSpan.textContent = user.nome;

  const data   = window.ECData.getAll();
  const grades = data.grades[user.matricula] || [];

  const table = document.getElementById('gradesTable');
  if (!table) return;

  // Mantém o header e recria o corpo
  const header = table.querySelector('tr.table-header');
  table.innerHTML = '';
  table.appendChild(header);

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

  // O script app.js que calcula média geral já está observando a tabela,
  // então ao recriar as linhas ele recalcula automático.
});
