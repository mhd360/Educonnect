// js/login.js

document.addEventListener('DOMContentLoaded', () => {
  const form   = document.getElementById('loginForm');
  const inputM = document.getElementById('matricula');
  const inputS = document.getElementById('password');
  const errMsg = document.getElementById('loginError');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const matricula = inputM.value.trim();
    const senha     = inputS.value.trim();

    const data = window.ECData.getAll();
    const user = data.users[matricula];

    if (!user || user.senha !== senha) {
      if (typeof Toastify === 'function') {
        Toastify({
          text: 'Matrícula ou senha inválidos.',
          duration: 4000,
          close: true,
          gravity: 'top',
          position: 'right',
          stopOnFocus: true,
          style: {
            background: '#e53935',
            color: '#ffffff'
          }
        }).showToast();
      } else if (errMsg) {
        errMsg.style.display = 'block';
      }
      return;
    }

    if (errMsg) errMsg.style.display = 'none';

    // usa o ECAuth global definido em auth.js
    window.ECAuth.setCurrentUser(user);

    // para evitar problemas de caminho, use caminhos relativos
    if (user.role === 'admin') {
      window.location.href = 'admin.html';
    } else if (user.role === 'professor') {
      window.location.href = 'professor.html';
    } else {
      window.location.href = 'aluno.html';
    }
  });
});
