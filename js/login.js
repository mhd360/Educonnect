(function () {
    // Seções principais
    const loginSection = document.getElementById("loginSection");
    const forgotSection = document.getElementById("forgotSection");
    const firstAccessSection = document.getElementById("firstAccessSection");
    const registerBlock = document.getElementById("registerBlock");

    // Login
    const loginForm = document.getElementById("loginForm");
    const matriculaInput = document.getElementById("matricula");
    const passwordInput = document.getElementById("password");
    const loginError = document.getElementById("loginError");
    const loginSubmitBtn = loginForm
        ? loginForm.querySelector('button[type="submit"]')
        : null;

    // Links/botões de navegação
    const forgotPasswordLink = document.getElementById("forgotPasswordLink");
    const topBackBtn = document.getElementById("topBackBtn");
    const firstAccessLink = document.getElementById("firstAccessLink");
    const firstAccessTopBackBtn = document.getElementById("firstAccessTopBackBtn");

    // Fluxo: Esqueci minha senha
    const forgotPasswordForm = document.getElementById("forgotPasswordForm");
    const forgotEmailInput = document.getElementById("forgotEmail");
    const forgotPasswordText = document.getElementById("forgotPasswordText");
    const forgotMainBtn = document.getElementById("forgotMainBtn");

    // Fluxo: Primeiro acesso (CPF + Email)
    const firstAccessForm = document.getElementById("firstAccessForm");
    const firstAccessCpfInput = document.getElementById("firstAccessCpf");
    const firstAccessEmailInput = document.getElementById("firstAccessEmail");
    const firstAccessText = document.getElementById("firstAccessText");
    const firstAccessMainBtn = document.getElementById("firstAccessMainBtn");

    if (
        !loginSection ||
        !forgotSection ||
        !firstAccessSection ||
        !registerBlock ||
        !loginForm ||
        !matriculaInput ||
        !passwordInput ||
        !loginSubmitBtn ||
        !forgotPasswordLink ||
        !topBackBtn ||
        !firstAccessLink ||
        !firstAccessTopBackBtn ||
        !forgotPasswordForm ||
        !forgotEmailInput ||
        !forgotPasswordText ||
        !forgotMainBtn ||
        !firstAccessForm ||
        !firstAccessCpfInput ||
        !firstAccessEmailInput ||
        !firstAccessText ||
        !firstAccessMainBtn
    ) {
        return;
    }

    let forgotFlowSubmitted = false;
    let firstAccessFlowSubmitted = false;

    const INITIAL_FORGOT_TEXT =
        "Caso você já tenha acesso ao EduConnect e tenha esquecido a senha, por favor forneça o E-mail cadastrado. Você receberá um E-mail com uma nova senha provisória.";

    const SUCCESS_FORGOT_TEXT =
        "Caso o E-mail esteja cadastrado, você receberá uma nova senha provisória em instantes...";

    const INITIAL_FIRST_ACCESS_TEXT =
        "Caso nunca tenha acessado o EduConnect, forneça seus dados para receber credenciais para o primeiro acesso.";

    const SUCCESS_FIRST_ACCESS_TEXT =
        "Se seus dados estiverem corretos, suas credenciais de acesso serão enviadas em instantes... Você poderá alterar sua senha no futuro (recomendado).";

    function showToast(message, type) {
        if (typeof Toastify !== "function") return;

        Toastify({
            text: message,
            duration: 4000,
            gravity: "top",
            position: "right",
            close: true,
            stopOnFocus: true,
            style:
                type === "error"
                    ? { background: "#c0392b" }
                    : { background: "#2e7d32" },
        }).showToast();
    }

    function setButtonLoading(button, isLoading, loadingText, defaultText) {
        if (!button) return;

        if (isLoading) {
            button.dataset.originalText = button.textContent;
            button.textContent = loadingText || "Carregando...";
            button.disabled = true;
        } else {
            button.disabled = false;
            button.textContent =
                defaultText || button.dataset.originalText || button.textContent;
        }
    }

    function onlyDigits(value) {
        return (value || "").replace(/\D/g, "");
    }

    function applyCpfMask(value) {
        const digits = onlyDigits(value).slice(0, 11);

        if (digits.length <= 3) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
        if (digits.length <= 9) {
            return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
        }

        return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
    }

    function isValidCpfFormat(value) {
        return onlyDigits(value).length === 11;
    }

    function isValidMatriculaFormat(value) {
        const matricula = (value || "").trim().toUpperCase();

        if (matricula === "0001") return true;        // admin
        if (/^A.+/.test(matricula)) return true;      // aluno
        if (/^P.+/.test(matricula)) return true;      // professor

        return false;
    }

    function redirectByPerfil(perfil, matricula) {
        const perfilFinal =
            (perfil || "").toUpperCase() || inferPerfilFromMatricula(matricula);

        if (perfilFinal === "ADMIN") {
            window.location.href = "../pages/admin.html";
            return;
        }

        if (perfilFinal === "ALUNO") {
            window.location.href = "../pages/aluno.html";
            return;
        }

        if (perfilFinal === "PROFESSOR") {
            window.location.href = "../pages/professor.html";
            return;
        }

        window.location.href = "../pages/indextest.html";
    }

    function showOnly(sectionName) {
        loginSection.style.display = sectionName === "login" ? "block" : "none";
        forgotSection.style.display = sectionName === "forgot" ? "block" : "none";
        firstAccessSection.style.display =
            sectionName === "firstAccess" ? "block" : "none";

        registerBlock.style.display = sectionName === "login" ? "block" : "none";

        if (loginError) {
            loginError.style.display = "none";
        }
    }

    function goToLoginState() {
        showOnly("login");
        resetForgotPasswordFlow();
        resetFirstAccessFlow();
    }

    function goToForgotPasswordState() {
        showOnly("forgot");
    }

    function goToFirstAccessState() {
        showOnly("firstAccess");
    }

    function resetForgotPasswordFlow() {
        forgotFlowSubmitted = false;
        forgotPasswordText.textContent = INITIAL_FORGOT_TEXT;

        forgotEmailInput.style.display = "block";
        forgotEmailInput.required = true;
        forgotEmailInput.value = "";

        forgotMainBtn.textContent = "Enviar";
        forgotMainBtn.type = "submit";
        forgotMainBtn.disabled = false;
    }

    function showForgotPasswordSuccessState() {
        forgotFlowSubmitted = true;

        forgotEmailInput.style.display = "none";
        forgotEmailInput.required = false;

        forgotPasswordText.textContent = SUCCESS_FORGOT_TEXT;

        forgotMainBtn.textContent = "Voltar";
        forgotMainBtn.type = "button";
        forgotMainBtn.disabled = false;
    }

    function resetFirstAccessFlow() {
        firstAccessFlowSubmitted = false;
        firstAccessText.textContent = INITIAL_FIRST_ACCESS_TEXT;

        firstAccessCpfInput.style.display = "block";
        firstAccessCpfInput.required = true;
        firstAccessCpfInput.value = "";

        firstAccessEmailInput.style.display = "block";
        firstAccessEmailInput.required = true;
        firstAccessEmailInput.value = "";

        firstAccessMainBtn.textContent = "Enviar";
        firstAccessMainBtn.type = "submit";
        firstAccessMainBtn.disabled = false;
    }

    function showFirstAccessSuccessState() {
        firstAccessFlowSubmitted = true;

        firstAccessCpfInput.style.display = "none";
        firstAccessCpfInput.required = false;

        firstAccessEmailInput.style.display = "none";
        firstAccessEmailInput.required = false;

        firstAccessText.textContent = SUCCESS_FIRST_ACCESS_TEXT;

        firstAccessMainBtn.textContent = "Voltar";
        firstAccessMainBtn.type = "button";
        firstAccessMainBtn.disabled = false;
    }

    async function handleLoginSubmit(event) {
        event.preventDefault();

        if (loginError) {
            loginError.style.display = "none";
        }

        const matriculaOriginal = matriculaInput.value.trim();
        const matricula = matriculaOriginal.toUpperCase();
        const senha = passwordInput.value;

        if (!matricula || !senha) {
            if (loginError) {
                loginError.textContent = "Preencha matrícula e senha.";
                loginError.style.display = "block";
            }
            return;
        }

        if (!isValidMatriculaFormat(matricula)) {
            if (loginError) {
                loginError.textContent =
                    'Matrícula inválida. Use "0001", ou matrícula iniciada por "A" (aluno) / "P" (professor).';
                loginError.style.display = "block";
            }
            return;
        }

        setButtonLoading(loginSubmitBtn, true, "Entrando...", "Entrar");

        try {
            const data = await AuthService.login(matricula, senha);

            // Backend: { token, Id, Nome, perfil }
            if (data && data.token) {
                localStorage.setItem("ec_token", data.token);
            }

            const usuario = {
                id: data?.id ?? data?.Id ?? null,
                nome: data?.nome ?? data?.Nome ?? "",
                perfil: (data?.perfil || "").toUpperCase(),
                matricula: matricula,
            };

            localStorage.setItem("ec_usuario", JSON.stringify(usuario));

            // redireciona pela resposta da API
            redirectByPerfil(usuario.perfil);

            showToast("Login realizado com sucesso.", "success");

        } catch (error) {
            if (loginError) {
                loginError.textContent = error.message || "Credenciais inválidas.";
                loginError.style.display = "block";
            } else {
                showToast(error.message || "Erro no login.", "error");
            }
        } finally {
            setButtonLoading(loginSubmitBtn, false, null, "Entrar");
        }
    }

    async function handleForgotPasswordSubmit(event) {
        event.preventDefault();

        const email = forgotEmailInput.value.trim();

        if (!email) return;

        setButtonLoading(forgotMainBtn, true, "Enviando...", "Enviar");

        try {
            await AuthService.esqueciSenha(email);
            showForgotPasswordSuccessState();
        } catch (error) {
            showToast(error.message || "Erro ao solicitar nova senha.", "error");
            setButtonLoading(forgotMainBtn, false, null, "Enviar");
        }
    }

    async function handleFirstAccessSubmit(event) {
        event.preventDefault();

        const cpfMasked = firstAccessCpfInput.value.trim();
        const cpfDigits = onlyDigits(cpfMasked);
        const email = firstAccessEmailInput.value.trim();

        if (!cpfMasked || !email) return;

        if (!isValidCpfFormat(cpfMasked)) {
            showToast("CPF inválido. Informe 11 dígitos.", "error");
            return;
        }

        setButtonLoading(firstAccessMainBtn, true, "Enviando...", "Enviar");

        try {
            await AuthService.primeiroAcesso(cpfDigits, email);
            showFirstAccessSuccessState();
        } catch (error) {
            showToast(error.message || "Erro ao solicitar primeiro acesso.", "error");
            setButtonLoading(firstAccessMainBtn, false, null, "Enviar");
        }
    }

    // ===== Eventos =====

    // Máscara CPF em tempo real
    firstAccessCpfInput.addEventListener("input", function (event) {
        event.target.value = applyCpfMask(event.target.value);
    });

    // Padronização da matrícula (maiúsculo)
    matriculaInput.addEventListener("input", function (event) {
        event.target.value = event.target.value.toUpperCase();
    });

    forgotPasswordLink.addEventListener("click", function (event) {
        event.preventDefault();
        goToForgotPasswordState();
    });

    topBackBtn.addEventListener("click", function () {
        goToLoginState();
    });

    firstAccessLink.addEventListener("click", function () {
        goToFirstAccessState();
    });

    firstAccessTopBackBtn.addEventListener("click", function () {
        goToLoginState();
    });

    loginForm.addEventListener("submit", handleLoginSubmit);
    forgotPasswordForm.addEventListener("submit", handleForgotPasswordSubmit);
    firstAccessForm.addEventListener("submit", handleFirstAccessSubmit);

    forgotMainBtn.addEventListener("click", function () {
        if (forgotFlowSubmitted) {
            goToLoginState();
        }
    });

    firstAccessMainBtn.addEventListener("click", function () {
        if (firstAccessFlowSubmitted) {
            goToLoginState();
        }
    });

    goToLoginState();
})();