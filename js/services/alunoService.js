// js/services/alunoService.js

const AlunoService = (function () {
  const API_BASE_URL = "https://localhost:7041"; // ajuste se necessário

  function getToken() {
    return localStorage.getItem("ec_token") || "";
  }

  async function request(path) {
    let response;

    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
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
        "Erro ao consultar a API.";
      throw new Error(msg);
    }

    return data;
  }

  async function getNotasMe() {
    return request("/api/notas/me");
  }

  async function getProximosEventosMe(limit = 3) {
    return request(`/api/eventos/me/proximos?limit=${encodeURIComponent(limit)}`);
  }

  return {
    getNotasMe,
    getProximosEventosMe,
  };
})();