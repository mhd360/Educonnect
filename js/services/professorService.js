const ProfessorService = (function () {
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

    async function getMediasDashboard() {
        return request("/api/notas/professor/medias");
    }

    async function getProximosEventosMe(limit = 3) {
        return request(`/api/eventos/me/proximos?limit=${encodeURIComponent(limit)}`);
    }

    async function alterarSenha(novaSenha, confirmacao) {
        return requestWithBody("/api/Auth/alterar-senha", "POST", {
            novaSenha,
            confirmacao,
        });
    }

    async function getMinhasOfertas() {
        return request("/api/Ofertas/me");
    }

    async function getAlunosDaOferta(ofertaId, page = 1, pageSize = 10) {
        const query = new URLSearchParams({
            page: String(page),
            pageSize: String(pageSize),
        });

        return request(`/api/Ofertas/${ofertaId}/alunos?${query.toString()}`);
    }

    async function getNotasAluno(ofertaId, alunoId) {
        return request(`/api/ofertas/${ofertaId}/notas/${alunoId}`);
    }

    async function atualizarNotasAluno(ofertaId, alunoId, payload) {
        let response;

        try {
            response = await fetch(`${API_BASE_URL}/api/ofertas/${ofertaId}/notas/${alunoId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify(payload),
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
                "Erro ao atualizar notas.";
            throw new Error(msg);
        }

        return data;
    }

    async function getTarefasDaOferta(ofertaId) {
        return request(`/api/ofertas/${ofertaId}/tarefas`);
    }

    async function criarTarefa(ofertaId, payload) {
        return requestWithBody(`/api/ofertas/${ofertaId}/tarefas`, "POST", payload);
    }

    async function excluirTarefa(ofertaId, tarefaId) {
        let response;

        try {
            response = await fetch(`${API_BASE_URL}/api/ofertas/${ofertaId}/tarefas/${tarefaId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`,
                },
            });
        } catch {
            throw new Error("Falha de conexão com a API.");
        }

        if (!response.ok) {
            const data = await response.json().catch(() => null);
            const msg =
                (typeof data === "string" && data) ||
                data?.message ||
                data?.title ||
                "Erro ao excluir atividade.";
            throw new Error(msg);
        }

        return true;
    }

    async function getTarefasParaCorrigir() {
        return request("/api/tarefas/me/para-corrigir");
    }

    async function getTarefasCorrigidas(ofertaId) {
        return request(`/api/ofertas/${ofertaId}/tarefas/corrigidas`);
    }

    async function getRespostasDaTarefa(ofertaId, tarefaId) {
        return request(`/api/ofertas/${ofertaId}/tarefas/${tarefaId}/respostas`);
    }

    async function corrigirTarefa(ofertaId, tarefaId, alunoId, payload) {
        return requestWithBody(
            `/api/ofertas/${ofertaId}/tarefas/${tarefaId}/correcoes/${alunoId}`,
            "POST",
            payload
        );
    }

    async function getCorrecaoAluno(ofertaId, tarefaId, alunoId) {
        return request(`/api/ofertas/${ofertaId}/tarefas/${tarefaId}/alunos/${alunoId}/correcao`);
    }

    async function getEventosProfessorMe() {
        return request("/api/eventos/professor/me");
    }

    async function criarEvento(ofertaId, payload) {
        return requestWithBody(`/api/ofertas/${ofertaId}/eventos`, "POST", payload);
    }

    async function atualizarEvento(ofertaId, eventoId, payload) {
        return requestWithBody(`/api/ofertas/${ofertaId}/eventos/${eventoId}`, "PUT", payload);
    }

    async function excluirEvento(ofertaId, eventoId) {
        let response;

        try {
            response = await fetch(`${API_BASE_URL}/api/ofertas/${ofertaId}/eventos/${eventoId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`,
                },
            });
        } catch {
            throw new Error("Falha de conexão com a API.");
        }

        if (!response.ok) {
            const data = await response.json().catch(() => null);
            const msg =
                (typeof data === "string" && data) ||
                data?.message ||
                data?.title ||
                "Erro ao excluir evento.";
            throw new Error(msg);
        }

        return true;
    }

    return {
        getMediasDashboard,
        getProximosEventosMe,
        alterarSenha,
        getMinhasOfertas,
        getAlunosDaOferta,
        getNotasAluno,
        atualizarNotasAluno,
        getTarefasDaOferta,
        criarTarefa,
        excluirTarefa,
        getTarefasParaCorrigir,
        corrigirTarefa,
        getTarefasCorrigidas,
        getRespostasDaTarefa,
        getCorrecaoAluno,
        getEventosProfessorMe,
        criarEvento,
        atualizarEvento,
        excluirEvento,
    };
})();