const AuthService = (function () {
  // AJUSTE AQUI PARA A URL REAL DA SUA API
  const API_BASE_URL = "https://localhost:7041";

  async function parseResponse(response) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return response.json();
    }

    const text = await response.text();
    return text;
  }

  async function request(path, method, body) {
    let response;

    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      // Erro de rede/CORS/URL/API offline
      throw new Error(
        "Não foi possível conectar à API. Verifique se a API está rodando, a URL/porta está correta e se o CORS foi liberado."
      );
    }

    const data = await parseResponse(response);

    if (!response.ok) {
      let message = "Não foi possível concluir a solicitação.";

      if (typeof data === "string" && data.trim()) {
        message = data;
      } else if (data && typeof data === "object") {
        message =
          data.message ||
          data.mensagem ||
          data.title ||
          data.error ||
          message;
      }

      throw new Error(message);
    }

    return data;
  }

  async function login(matricula, senha) {
    return request("/api/Auth/login", "POST", {
      matricula,
      senha,
    });
  }

  async function esqueciSenha(email) {
    return request("/api/Auth/esqueci-senha", "POST", {
      email,
    });
  }

  async function primeiroAcesso(cpf, email) {
    return request("/api/Auth/primeiro-acesso", "POST", {
      cpf,
      email,
    });
  }

  return {
    login,
    esqueciSenha,
    primeiroAcesso,
  };
})();