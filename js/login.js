// js/login.js

// chave do usuário logado
const CURRENT_USER_KEY = 'educonnect_current_user';

// módulo simples de autenticação
window.ECAuth = {
  setCurrentUser(user) {
    localStorage.setItem(
      CURRENT_USER_KEY,
      JSON.stringify({
        matricula: user.matricula,
        nome: user.nome,
        role: user.role,
      }),
    );
  },

  getCurrentUser() {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  clearCurrentUser() {
    localStorage.removeItem(CURRENT_USER_KEY);
  },
};

document.addEventListener('DOMContentLoaded', () => {
  const form   = document.getElementById('loginForm');
  const inputM = document.getElementById('matricula');
  const inputS = document.getElementById('password');
  const errMsg = document.getElementById('loginError');

  // se não for a página de login, sai fora
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const matricula = inputM.value.trim();
    const senha     = inputS.value.trim();

    const data = window.ECData.getAll();
    const user = data.users[matricula];

    if (!user || user.senha !== senha) {
      // Toast de erro (preferencial)
      if (typeof Toastify === 'function') {
        Toastify({
          text: 'Matrícula ou senha inválidos.',
          duration: 4000,
          close: true,
          gravity: 'top',
          position: 'right',
          stopOnFocus: true,
          style: {
            background: '#e53935', // vermelho
            color: '#ffffff'
          }
        }).showToast();
      } else if (errMsg) {
        // fallback se Toastify não estiver disponível
        errMsg.style.display = 'block';
      }
      return;
    }

    // login válido: garante que a mensagem de erro (fallback) não apareça
    if (errMsg) errMsg.style.display = 'none';

    // salva usuário logado
    window.ECAuth.setCurrentUser(user);

    // roteia pelo perfil
    if (user.role === 'admin') {
      window.location.href = '/pages/admin.html';
    } else if (user.role === 'professor') {
      window.location.href = '/pages/professor.html';
    } else {
      window.location.href = '/pages/aluno.html';
    }
  });
});
