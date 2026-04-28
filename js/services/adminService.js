const AdminService = (function () {
  const API_BASE_URL = "https://localhost:7041"; // ajuste se necessário

  function getToken() {
    return localStorage.getItem("ec_token") || "";
  }

  async function request(path, method = "GET", body = null) {
    let response;

    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: body ? JSON.stringify(body) : null,
      });
    } catch {
      throw new Error("Falha de conexão com a API.");
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const msg =
        (typeof data === "string" && data) ||
        data?.message ||
        data?.title ||
        `Erro ao consultar a API. (${response.status})`;
      throw new Error(msg);
    }

    return data;
  }

  async function alterarSenha(novaSenha, confirmacao) {
  return request("/api/Auth/alterar-senha", "POST", { novaSenha, confirmacao });
}

  async function getUsuarios() {
    return request("/api/usuarios");
  }

  async function criarUsuario(payload) {
    return request("/api/admin/usuarios", "POST", payload);
  }

  async function editarUsuario(id, payload) {
    return request(`/api/admin/usuarios/${id}`, "PUT", payload);
  }

  async function setUsuarioStatus(id, ativo) {
    return request(`/api/admin/usuarios/${id}/status`, "PATCH", { ativo });
  }

  return {
    getUsuarios,
    criarUsuario,
    editarUsuario,
    setUsuarioStatus,
    alterarSenha,
  };
})();