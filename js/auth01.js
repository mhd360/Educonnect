// js/auth.js

// chave do usuário logado
const CURRENT_USER_KEY = 'educonnect_current_user';

// módulo simples de autenticação, disponível em todas as páginas
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
