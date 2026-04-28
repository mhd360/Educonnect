const ADMIN_HOST_ID = "adminSectionHost";

const adminUsersState = {
    all: [],
    search: "",
    status: "ativos",   // todos | ativos | inativos
    perfil: "todos",   // todos | ALUNO | PROFESSOR
    editing: null,     // user obj | null
};

document.addEventListener("DOMContentLoaded", async () => {
    const user = getCurrentUser();
    if (!user || String(user.perfil || "").toUpperCase() !== "ADMIN") {
        window.location.href = "./index.html";
        return;
    }
    await initProfileMenu(user);
    initPasswordModal();

    bindHeaderNavigation();
    await navigateToSection("usuarios");
});

function getSectionHost() {
    return document.getElementById(ADMIN_HOST_ID);
}

function bindHeaderNavigation() {
    const navLinks = document.querySelectorAll(".header-nav .nav-link");
    navLinks.forEach((link) => {
        link.addEventListener("click", async (e) => {
            e.preventDefault();
            const sectionName = link.dataset.section;
            await navigateToSection(sectionName);
        });
    });
}

async function navigateToSection(sectionName) {
    setActiveNav(sectionName);

    const map = {
        usuarios: () => renderUsuarios(),
        // futuras: disciplinas, eventos, ofertas...
    };

    const fn = map[sectionName];
    if (!fn) return;

    await fn();
}

function setActiveNav(sectionName) {
    const navLinks = document.querySelectorAll(".header-nav .nav-link");
    navLinks.forEach((link) => {
        link.classList.toggle("is-active", link.dataset.section === sectionName);
    });
}

async function loadSectionHtml(host, path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Não foi possível carregar: ${path}`);
    host.innerHTML = await res.text();
}

async function initProfileMenu(user) {
    const profileBtn = document.getElementById("profileBtn");
    const profileDropdown = document.getElementById("profileDropdown");
    const logoutBtn = document.getElementById("logoutBtn");
    const changePasswordBtn = document.getElementById("changePasswordBtn");

    const profileNome = document.getElementById("profileNome");
    const profileMatricula = document.getElementById("profileMatricula");

    if (!profileBtn || !profileDropdown || !logoutBtn || !changePasswordBtn || !profileNome || !profileMatricula) {
        return;
    }

    profileNome.textContent = user?.nome || "-";
    profileMatricula.textContent = user?.matricula || "-";

    profileBtn.addEventListener("click", function (event) {
        event.stopPropagation();

        const isOpen = profileDropdown.classList.contains("is-open");
        profileDropdown.classList.toggle("is-open", !isOpen);
        profileBtn.setAttribute("aria-expanded", String(!isOpen));
    });

    profileDropdown.addEventListener("click", function (event) {
        event.stopPropagation();
    });

    document.addEventListener("click", function () {
        profileDropdown.classList.remove("is-open");
        profileBtn.setAttribute("aria-expanded", "false");
    });

    changePasswordBtn.addEventListener("click", function () {
        openPasswordModal();
        profileDropdown.classList.remove("is-open");
        profileBtn.setAttribute("aria-expanded", "false");
    });

    logoutBtn.addEventListener("click", function () {
        localStorage.removeItem("ec_token");
        localStorage.removeItem("ec_usuario");
        localStorage.removeItem("educonnect_current_user");
        window.location.href = "./index.html";
    });
}

function initPasswordModal() {
    const modal = document.getElementById("passwordModal");
    const overlay = document.getElementById("passwordModalOverlay");
    const closeBtn = document.getElementById("passwordModalClose");
    const form = document.getElementById("changePasswordForm");
    const submitBtn = document.getElementById("changePasswordSubmitBtn");
    const novaSenhaInput = document.getElementById("novaSenha");
    const confirmacaoInput = document.getElementById("confirmacaoSenha");
    const errorNode = document.getElementById("changePasswordError");

    if (!modal || !overlay || !closeBtn || !form || !submitBtn || !novaSenhaInput || !confirmacaoInput || !errorNode) {
        return;
    }

    initPasswordToggles();

    overlay.addEventListener("click", closePasswordModal);
    closeBtn.addEventListener("click", closePasswordModal);

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && modal.classList.contains("is-open")) {
            closePasswordModal();
        }
    });

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        errorNode.style.display = "none";
        errorNode.textContent = "";

        const novaSenha = (novaSenhaInput.value || "").trim();
        const confirmacao = (confirmacaoInput.value || "").trim();

        const validationError = validatePasswordForm(novaSenha, confirmacao);
        if (validationError) {
            errorNode.textContent = validationError;
            errorNode.style.display = "block";
            return;
        }

        setButtonLoading(submitBtn, true, "Salvando...", "Salvar");

        try {
            // mesmo endpoint usado no professor
            await AdminService.alterarSenha(novaSenha, confirmacao);

            closePasswordModal();
            form.reset();

            if (typeof Toastify === "function") {
                Toastify({
                    text: "Senha alterada com sucesso.",
                    duration: 3500,
                    gravity: "top",
                    position: "right",
                    close: true,
                    stopOnFocus: true,
                    style: { background: "#2e7d32" },
                }).showToast();
            }
        } catch (error) {
            errorNode.textContent = error.message || "Erro ao alterar senha.";
            errorNode.style.display = "block";
        } finally {
            setButtonLoading(submitBtn, false, null, "Salvar");
        }
    });
}

function openPasswordModal() {
    const modal = document.getElementById("passwordModal");
    const errorNode = document.getElementById("changePasswordError");

    if (!modal) return;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");

    if (errorNode) {
        errorNode.style.display = "none";
        errorNode.textContent = "";
    }
}

function closePasswordModal() {
    const modal = document.getElementById("passwordModal");
    const form = document.getElementById("changePasswordForm");
    const errorNode = document.getElementById("changePasswordError");

    if (!modal) return;

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");

    if (form) form.reset();

    if (errorNode) {
        errorNode.style.display = "none";
        errorNode.textContent = "";
    }

    const passwordInputs = modal.querySelectorAll('input[type="text"], input[type="password"]');
    const toggleButtons = modal.querySelectorAll(".password-toggle-btn");

    passwordInputs.forEach((input) => {
        if (input.id === "novaSenha" || input.id === "confirmacaoSenha") {
            input.type = "password";
        }
    });

    toggleButtons.forEach((button) => {
        button.classList.remove("is-visible");
        button.setAttribute("aria-label", "Mostrar senha");
    });
}

function validatePasswordForm(novaSenha, confirmacao) {
    if (!novaSenha || !confirmacao) return "Preencha os dois campos.";
    if (novaSenha !== confirmacao) return "A confirmação da senha não confere.";

    if (!isStrongPassword(novaSenha)) {
        return "A senha deve ter no mínimo 8 caracteres, uma letra maiúscula, uma letra minúscula e um número.";
    }

    return "";
}

function isStrongPassword(password) {
    if (password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    return true;
}

function setButtonLoading(button, isLoading, loadingText, defaultText) {
    if (!button) return;

    if (isLoading) {
        button.dataset.originalText = button.textContent;
        button.textContent = loadingText || "Carregando...";
        button.disabled = true;
    } else {
        button.disabled = false;
        button.textContent = defaultText || button.dataset.originalText || button.textContent;
    }
}

function initPasswordToggles() {
    const toggleButtons = document.querySelectorAll(".password-toggle-btn");

    toggleButtons.forEach((button) => {
        button.addEventListener("click", function () {
            const targetId = button.dataset.target;
            const input = document.getElementById(targetId);
            if (!input) return;

            const willShow = input.type === "password";
            input.type = willShow ? "text" : "password";

            button.classList.toggle("is-visible", willShow);
            button.setAttribute("aria-label", willShow ? "Ocultar senha" : "Mostrar senha");
        });
    });
}

async function renderUsuarios() {
    const host = getSectionHost();
    if (!host) return;

    await loadSectionHtml(host, "../pages/sections/admin/usuarios.html");

    bindAdminUsersModal();
    bindAdminUsersFilters();
    bindAdminConfirmModal();

    await refreshUsuarios();
    renderUsuariosTable();
}

async function refreshUsuarios() {
    const tbody = document.getElementById("adminUsersTbody");
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text2">Carregando...</td></tr>`;

    const data = await AdminService.getUsuarios();
    const all = Array.isArray(data) ? data : [];

    // remove ADMIN da lista
    adminUsersState.all = all.filter((u) => String(u.perfil || "").toUpperCase() !== "ADMIN");
}

function bindAdminUsersFilters() {
    const search = document.getElementById("adminUsersSearch");
    const status = document.getElementById("adminUsersStatus");
    const perfil = document.getElementById("adminUsersPerfil");
    const newBtn = document.getElementById("adminUsersNewBtn");
    status.value = "ativos";
    adminUsersState.status = "ativos";

    search?.addEventListener("input", () => {
        adminUsersState.search = (search.value || "").trim().toLowerCase();
        renderUsuariosTable();
    });

    status?.addEventListener("change", () => {
        adminUsersState.status = status.value;
        renderUsuariosTable();
    });

    perfil?.addEventListener("change", () => {
        adminUsersState.perfil = perfil.value;
        renderUsuariosTable();
    });

    newBtn?.addEventListener("click", () => openAdminUserModalCreate());
}

function getFilteredUsers() {
    let items = [...adminUsersState.all];

    if (adminUsersState.search) {
        const q = adminUsersState.search;
        items = items.filter((u) => {
            const nome = String(u.nome || "").toLowerCase();
            const matricula = String(u.matricula || "").toLowerCase();
            const email = String(u.email || "").toLowerCase();
            return nome.includes(q) || matricula.includes(q) || email.includes(q);
        });
    }

    if (adminUsersState.status !== "todos") {
        const want = adminUsersState.status === "ativos";
        items = items.filter((u) => !!u.ativo === want);
    }

    if (adminUsersState.perfil !== "todos") {
        items = items.filter((u) => String(u.perfil || "").toUpperCase() === adminUsersState.perfil);
    }

    items.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
    return items;
}

function renderUsuariosTable() {
    const tbody = document.getElementById("adminUsersTbody");
    if (!tbody) return;

    const rows = getFilteredUsers();
    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text2">Nenhum usuário encontrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";

    for (const u of rows) {
        const tr = document.createElement("tr");

        const statusLabel = u.ativo ? "Ativo" : "Inativo";
        const statusClass = u.ativo ? "admin-status admin-status--ativo" : "admin-status admin-status--inativo";

        const toggleIcon = u.ativo ? "✕" : "✓";
        const toggleTitle = u.ativo ? "Desativar usuário" : "Ativar usuário";

        tr.innerHTML = `
        <td class="text2">${escapeHtml(u.nome || "-")}</td>
        <td class="text2">${escapeHtml(u.matricula || "-")}</td>
        <td class="text2">${escapeHtml(u.email || "-")}</td>
        <td class="text2">${escapeHtml(String(u.perfil || "").toUpperCase())}</td>
        <td class="text2"><span class="${statusClass}">${statusLabel}</span></td>
        <td class="text2 admin-actions">
            <button
            type="button"
            class="admin-toggle-btn"
            data-action="toggle"
            data-id="${u.id}"
            aria-label="${toggleTitle}"
            title="${toggleTitle}"
            >
            ${toggleIcon}
            </button>

            <button type="button" class="nota-edit-btn" data-action="edit" data-id="${u.id}" aria-label="Editar">
            ${pencilSvg()}
            </button>
        </td>
        `;

        tr.querySelector('[data-action="toggle"]')?.addEventListener("click", async () => {
            await toggleUserStatus(u);
        });

        tr.querySelector('[data-action="edit"]')?.addEventListener("click", () => {
            openAdminUserModalEdit(u);
        });

        tbody.appendChild(tr);
    }
}

async function toggleUserStatus(u) {
    const next = !u.ativo;

    const ok = await openAdminConfirm({
        title: next ? "Ativar usuário" : "Desativar usuário",
        subtitle: "Confirme a alteração de status",
        bodyHtml: `
            <p><strong>Nome:</strong> ${escapeHtml(u.nome || "-")}</p>
            <p><strong>Matrícula:</strong> ${escapeHtml(u.matricula || "-")}</p>
            <p><strong>Email:</strong> ${escapeHtml(u.email || "-")}</p>
            <p><strong>Novo status:</strong> ${next ? "Ativo" : "Inativo"}</p>
            `,
        okText: next ? "Ativar" : "Desativar",
    });

    if (!ok) return;
    await AdminService.setUsuarioStatus(u.id, !u.ativo);
    await refreshUsuarios();
    renderUsuariosTable();
}

function bindAdminUsersModal() {
    const modal = document.getElementById("adminUserModal");
    const closeBtn = document.getElementById("adminUserModalClose");
    const form = document.getElementById("adminUserForm");

    const title = document.getElementById("adminUserModalTitle");
    const subtitle = document.getElementById("adminUserModalSubtitle");

    const nome = document.getElementById("adminUserNome");
    const cpfWrap = document.getElementById("adminUserCpfWrap");
    const cpf = document.getElementById("adminUserCpf");
    const email = document.getElementById("adminUserEmail");
    const perfilWrap = document.getElementById("adminUserPerfilWrap");
    const perfil = document.getElementById("adminUserPerfilSelect");

    const errorNode = document.getElementById("adminUserError");
    const submitBtn = document.getElementById("adminUserSubmitBtn");

    function getAdminUserFormData() {
        return {
            nome: nome?.value || "",
            email: email?.value || "",
            cpf: cpf?.value || "",
            perfil: perfil?.value || "",
        };
    }

    function saveAdminUserSnapshot() {
        modal.dataset.snapshot = JSON.stringify(getAdminUserFormData());
    }

    async function tryCloseUserModal() {
        const current = JSON.stringify(getAdminUserFormData());
        const snapshot = modal.dataset.snapshot || "";

        const hasAnyValue =
            (nome?.value || "").trim() ||
            (email?.value || "").trim() ||
            (cpf?.value || "").trim();

        if (snapshot && current !== snapshot && hasAnyValue) {
            const ok = await openAdminConfirm({
                title: "Descartar alterações?",
                subtitle: "Você tem alterações não salvas.",
                bodyHtml: `<p>Ao sair, as alterações serão perdidas.</p>`,
                okText: "Descartar",
            });

            if (!ok) return;
        }

        closeModal(modal);
    }

    if (!modal || !closeBtn || !form) return;

    closeBtn.addEventListener("click", tryCloseUserModal);

    modal.addEventListener("click", (e) => {
        if (e.target === modal) tryCloseUserModal();
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (errorNode) {
            errorNode.style.display = "none";
            errorNode.textContent = "";
        }

        const payloadNome = (nome.value || "").trim();
        const payloadEmail = (email.value || "").trim();
        const payloadCpf = (cpf?.value || "").trim();
        const payloadPerfil = (perfil?.value || "").toUpperCase();

        if (!payloadNome || !payloadEmail) {
            showFormError(errorNode, "Preencha nome e e-mail.");
            return;
        }

        if (!adminUsersState.editing) {
            if (!payloadCpf) {
                showFormError(errorNode, "CPF é obrigatório no cadastro.");
                return;
            }

            if (payloadPerfil === "ADMIN") {
                showFormError(errorNode, "Não é possível cadastrar usuário ADMIN.");
                return;
            }
        }

        const actionLabel = adminUsersState.editing ? "Salvar alterações" : "Cadastrar";

        const confirmOk = await openAdminConfirm({
            title: adminUsersState.editing ? "Confirmar edição" : "Confirmar cadastro",
            subtitle: "Revise os dados abaixo",
            bodyHtml: `
      <p><strong>Nome:</strong> ${escapeHtml(payloadNome)}</p>
      <p><strong>Email:</strong> ${escapeHtml(payloadEmail)}</p>
      ${adminUsersState.editing
                    ? ""
                    : `<p><strong>CPF:</strong> ${escapeHtml(payloadCpf)}</p>
             <p><strong>Perfil:</strong> ${escapeHtml(payloadPerfil)}</p>`
                }
    `,
            okText: actionLabel,
        });

        if (!confirmOk) return;

        setButtonLoading(submitBtn, true, "Salvando...", submitBtn.textContent);

        try {
            if (!adminUsersState.editing) {
                await AdminService.criarUsuario({
                    nome: payloadNome,
                    email: payloadEmail,
                    cpf: payloadCpf,
                    perfil: payloadPerfil,
                });
            } else {
                await AdminService.editarUsuario(adminUsersState.editing.id, {
                    nome: payloadNome,
                    email: payloadEmail,
                });
            }

            closeModal(modal);
            await refreshUsuarios();
            renderUsuariosTable();
        } catch (err) {
            showFormError(errorNode, err.message || "Erro ao salvar usuário.");
        } finally {
            setButtonLoading(submitBtn, false, null, submitBtn.textContent);
        }
    });

    // expose functions to open/create
    window.openAdminUserModalCreate = function () {
        adminUsersState.editing = null;

        title.textContent = "Novo usuário";
        subtitle.textContent = "";

        cpfWrap.style.display = "flex";
        perfilWrap.style.display = "flex";

        nome.value = "";
        cpf.value = "";
        email.value = "";
        perfil.value = "ALUNO";

        submitBtn.textContent = "Cadastrar";

        if (errorNode) {
            errorNode.style.display = "none";
            errorNode.textContent = "";
        }

        saveAdminUserSnapshot();
        openModal(modal);
    };

    window.openAdminUserModalEdit = function (u) {
        adminUsersState.editing = u;

        title.textContent = "Editar usuário";
        subtitle.textContent = u.matricula ? `Matrícula: ${u.matricula}` : "";

        // CPF e Perfil não editam
        cpfWrap.style.display = "none";
        perfilWrap.style.display = "none";

        nome.value = u.nome || "";
        email.value = u.email || "";

        submitBtn.textContent = "Salvar";

        if (errorNode) {
            errorNode.style.display = "none";
            errorNode.textContent = "";
        }

        saveAdminUserSnapshot();
        openModal(modal);
    };
}

// helpers
function openModal(modal) {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
}

function showFormError(node, msg) {
    if (!node) return;
    node.textContent = msg;
    node.style.display = "block";
}

function setButtonLoading(button, isLoading, loadingText, defaultText) {
    if (!button) return;
    if (isLoading) {
        button.dataset.originalText = button.textContent;
        button.textContent = loadingText || "Carregando...";
        button.disabled = true;
    } else {
        button.disabled = false;
        button.textContent = defaultText || button.dataset.originalText || button.textContent;
    }
}

function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getCurrentUser() {
    const raw = localStorage.getItem("ec_usuario");
    if (!raw) return null;
    try {
        const u = JSON.parse(raw);
        return {
            nome: u.nome ?? "",
            matricula: u.matricula ?? "",
            perfil: (u.perfil ?? "").toUpperCase(),
        };
    } catch {
        return null;
    }
}

function pencilSvg() {
    return `
    <svg class="nota-edit-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l8.06-8.06.92.92L5.92 19.58zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.33a1.003 1.003 0 0 0-1.42 0L15.13 5.1l3.75 3.75 1.83-1.81z" fill="currentColor"></path>
    </svg>
  `;
}

let adminConfirmResolver = null;

function openAdminConfirm({ title, subtitle = "", bodyHtml = "", okText = "Confirmar" }) {
    const modal = document.getElementById("adminConfirmModal");
    const t = document.getElementById("adminConfirmTitle");
    const st = document.getElementById("adminConfirmSubtitle");
    const body = document.getElementById("adminConfirmBody");
    const okBtn = document.getElementById("adminConfirmOkBtn");

    if (!modal || !t || !st || !body || !okBtn) return Promise.resolve(false);

    t.textContent = title;
    st.textContent = subtitle;
    body.innerHTML = bodyHtml;
    okBtn.textContent = okText;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");

    return new Promise((resolve) => {
        adminConfirmResolver = resolve;
    });
}

function closeAdminConfirm(result) {
    const modal = document.getElementById("adminConfirmModal");
    if (!modal) return;

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");

    if (adminConfirmResolver) {
        adminConfirmResolver(result);
        adminConfirmResolver = null;
    }
}

function bindAdminConfirmModal() {
    const modal = document.getElementById("adminConfirmModal");
    const closeBtn = document.getElementById("adminConfirmClose");
    const cancelBtn = document.getElementById("adminConfirmCancelBtn");
    const okBtn = document.getElementById("adminConfirmOkBtn");

    if (!modal || !closeBtn || !cancelBtn || !okBtn) return;

    closeBtn.addEventListener("click", () => closeAdminConfirm(false));
    cancelBtn.addEventListener("click", () => closeAdminConfirm(false));
    okBtn.addEventListener("click", () => closeAdminConfirm(true));

    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeAdminConfirm(false);
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("is-open")) {
            closeAdminConfirm(false);
        }
    });
}