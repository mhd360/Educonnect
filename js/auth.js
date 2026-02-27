const LEGACY_USER_KEY = "educonnect_current_user"; // antigo
const NEW_USER_KEY = "ec_usuario";                 // novo (login integrado)

window.ECAuth = {
  setCurrentUser(user) {
    // compat: salva no padrão novo (ec_usuario)
    localStorage.setItem(
      NEW_USER_KEY,
      JSON.stringify({
        id: user.id ?? null,
        nome: user.nome ?? "",
        perfil: (user.perfil ?? user.role ?? "").toUpperCase(),
        matricula: user.matricula ?? "",
      })
    );
  },

  getCurrentUser() {
    // 1) padrão novo
    const rawNew = localStorage.getItem(NEW_USER_KEY);
    if (rawNew) {
      try {
        const u = JSON.parse(rawNew);
        return {
          id: u.id ?? null,
          nome: u.nome ?? "",
          matricula: u.matricula ?? "",
          perfil: (u.perfil ?? "").toUpperCase(),
          // compat com código antigo
          role: (u.perfil ?? "").toLowerCase(), // "aluno"/"professor"/"admin"
        };
      } catch {}
    }

    // 2) fallback legado
    const rawOld = localStorage.getItem(LEGACY_USER_KEY);
    if (!rawOld) return null;

    try {
      return JSON.parse(rawOld);
    } catch {
      return null;
    }
  },

  clearCurrentUser() {
    localStorage.removeItem(NEW_USER_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
  },
};