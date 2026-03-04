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

  async function getTurmasMe() {
    return request("/api/Turmas/me");
  }

  async function alterarSenha(novaSenha, confirmacao) {
    return requestWithBody("/api/Auth/alterar-senha", "POST", {
      novaSenha,
      confirmacao,
    });
  }

  async function requestWithBody(path, method, body) {
    let response;

    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
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

  async function getFrequenciaMe(ofertaId) {
    return request(`/api/ofertas/${encodeURIComponent(ofertaId)}/frequencia/me`);
  }

  async function downloadBoletimPdf() {
    let response;

    try {
      response = await fetch(`${API_BASE_URL}/api/Boletim/me/pdf`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
    } catch {
      throw new Error("Falha de conexão com a API.");
    }

    if (!response.ok) {
      let errorMessage = "Erro ao baixar boletim.";

      try {
        const data = await response.json();
        errorMessage =
          (typeof data === "string" && data) ||
          data?.message ||
          data?.title ||
          errorMessage;
      } catch {
        // mantém mensagem padrão
      }

      throw new Error(errorMessage);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get("content-disposition") || "";

    return {
      blob,
      fileName: extractFileNameFromDisposition(contentDisposition) || "boletim.pdf",
    };
  }

  async function getOfertasMe() {
    return request("/api/ofertas/me");
  }

  async function getTarefasByOferta(ofertaId) {
    return request(`/api/ofertas/${encodeURIComponent(ofertaId)}/tarefas`);
  }

  async function enviarRespostaTarefa(ofertaId, tarefaId, conteudo) {
    return requestWithBody(
      `/api/ofertas/${encodeURIComponent(ofertaId)}/tarefas/${encodeURIComponent(tarefaId)}/respostas`,
      "POST",
      { conteudo }
    );
  }

  async function getMinhaRespostaTarefa(ofertaId, tarefaId) {
    return request(
      `/api/ofertas/${encodeURIComponent(ofertaId)}/tarefas/${encodeURIComponent(tarefaId)}/respostas/me`
    );
  }

  async function getMinhaCorrecaoTarefa(ofertaId, tarefaId) {
    return request(
      `/api/ofertas/${encodeURIComponent(ofertaId)}/tarefas/${encodeURIComponent(tarefaId)}/correcoes/me`
    );
  }

  function extractFileNameFromDisposition(contentDisposition) {
    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1].replace(/["']/g, ""));
    }

    const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    if (fileNameMatch?.[1]) {
      return fileNameMatch[1];
    }

    return null;
  }

  return {
    getNotasMe,
    getProximosEventosMe,
    getTurmasMe,
    alterarSenha,
    getFrequenciaMe,
    downloadBoletimPdf,
    getOfertasMe,
    getTarefasByOferta,
    enviarRespostaTarefa,
    getMinhaRespostaTarefa,
    getMinhaCorrecaoTarefa,
  };


})();