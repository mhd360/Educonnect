(function () {
  const STORAGE_KEY = 'educonnect-registrations';

  // ===== MODO DEV: senhas fixas por tipo de usuário =====
  const USE_DEV_DEFAULT_PASSWORDS = true; // depois é só mudar para false
  const DEV_DEFAULT_PASSWORDS = {
    professor: 'Profe123',
    aluno: 'Aluno123'
  };

  function resolvePasswordFor(role, cpfDigits) {
    if (USE_DEV_DEFAULT_PASSWORDS) {
      return DEV_DEFAULT_PASSWORDS[role] || '1234';
    }
    // lógica “oficial” (padrão futuro)
    return cpfDigits ? cpfDigits.slice(-4) : '1234';
  }

  function getRegistrations() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveRegistrations(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function formatDateISOToBR(iso) {
    if (!iso) return '—';
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, d] = iso.split('-');
      return `${d}/${m}/${y}`;
    }
    return iso;
  }

  function formatCpfDigits(cpfDigits) {
    const d = String(cpfDigits || '').replace(/\D/g, '');
    if (d.length !== 11) return d || '—';
    return (
      d.slice(0, 3) + '.' +
      d.slice(3, 6) + '.' +
      d.slice(6, 9) + '-' +
      d.slice(9)
    );
  }

  function formatPhoneDigits(phoneDigits) {
    const d = String(phoneDigits || '').replace(/\D/g, '');
    if (!d) return '—';
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 7) return `(${d.slice(0, 2)})${d.slice(2)}`;
    return `(${d.slice(0, 2)})${d.slice(2, 7)}-${d.slice(7)}`;
  }

  function getStatusCode(reg) {
    const raw = (reg && reg.status) || 'pending';
    if (raw === 'inactive') return 'inactive';
    if (raw === 'active' || raw === 'approved') return 'active';
    return 'pending';
  }

  function getStatusMeta(reg) {
    const code = getStatusCode(reg);
    if (code === 'active') {
      return {
        code,
        label: 'Ativo',
        badgeClass: 'admin-badge admin-badge--approved'
      };
    }
    if (code === 'inactive') {
      return {
        code,
        label: 'Inativo',
        badgeClass: 'admin-badge admin-badge--inactive'
      };
    }
    return {
      code: 'pending',
      label: 'Pendente',
      badgeClass: 'admin-badge admin-badge--pending'
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    // ===== ECData / banco em memória =====
    let ecData = null;
    let allTeachers = [];
    let allStudents = [];

    // ===== DOM =====
    const totalStudentsEl = document.getElementById('adminTotalStudents');
    const totalTeachersEl = document.getElementById('adminTotalTeachers');
    const totalPendingEl = document.getElementById('adminTotalPending');

    const reqTableBody = document.querySelector('#adminRequestsTable tbody');
    const reqEmptyEl = document.getElementById('adminRequestsEmpty');

    const regSearchInput = document.getElementById('adminRegSearch');
    const regPendOnlyCheck = document.getElementById('adminRegPendOnly');

    // modal de detalhes
    const modal = document.getElementById('adminRequestModal');
    const modalClose = document.getElementById('adminModalClose');
    const modalCancel = document.getElementById('adminModalCancel');
    const modalGenerate = document.getElementById('adminGenerateMatBtn');
    const modalDeactivate = document.getElementById('adminDeactivateBtn');
    const modalReactivate = document.getElementById('adminReactivateBtn');
    const modalRemove = document.getElementById('adminRemoveBtn');

    const modalTipo = document.getElementById('modalTipo');
    const modalNome = document.getElementById('modalNome');
    const modalNascimento = document.getElementById('modalNascimento');
    const modalCpf = document.getElementById('modalCpf');
    const modalEmail = document.getElementById('modalEmail');
    const modalTelefone = document.getElementById('modalTelefone');
    const modalStatus = document.getElementById('modalStatus');
    const modalMatricula = document.getElementById('modalMatricula');

    // modal de confirmação genérico
    const confirmModal = document.getElementById('adminConfirmModal');
    const confirmCloseBtn = document.getElementById('adminConfirmClose');
    const confirmCancelBtn = document.getElementById('adminConfirmCancel');
    const confirmConfirmBtn = document.getElementById('adminConfirmConfirm');
    const confirmMessage = document.getElementById('adminConfirmMessage');

    let registrations = getRegistrations();
    let selectedRegistrationId = null;
    let confirmAction = null;   // 'generate' | 'deactivate' | 'reactivate' | 'remove'
    let confirmTargetId = null;

    // ===== Carregar ECData =====
    (function loadEcData() {
      if (window.ECData && typeof window.ECData.getAll === 'function') {
        const full = window.ECData.getAll();
        if (full) {
          ecData = full;

          const userList = Array.isArray(full.users)
            ? full.users
            : Object.values(full.users || {});

          allTeachers = userList.filter((u) => u && u.role === 'professor');
          allStudents = userList.filter((u) => u && u.role === 'aluno');
        }
      }
    })();


    function persistEcData() {
      if (window.ECData && typeof window.ECData.save === 'function') {
        window.ECData.save();
      }
    }

    // ===== Matrículas: A1001+ (aluno), P2001+ (professor) =====
    function generateMatricula(tipoCadastro) {
      if (!ecData) return null;

      const isProf = tipoCadastro === 'professor';
      const prefix = isProf ? 'P' : 'A';
      const base = isProf ? 2001 : 1001;

      const users = Array.isArray(ecData.users)
        ? ecData.users
        : Object.values(ecData.users || {});

      let maxNum = 0;

      users.forEach((u) => {
        if (!u || typeof u.matricula !== 'string') return;
        if (isProf && u.role !== 'professor') return;
        if (!isProf && u.role !== 'aluno') return;
        if (!u.matricula.startsWith(prefix)) return;

        const num = parseInt(u.matricula.slice(1), 10);
        if (Number.isFinite(num) && num > maxNum) {
          maxNum = num;
        }
      });

      const next = Math.max(base, maxNum + 1);
      return `${prefix}${next}`;
    }

    function refreshSummary() {
      if (totalStudentsEl) totalStudentsEl.textContent = allStudents.length.toString();
      if (totalTeachersEl) totalTeachersEl.textContent = allTeachers.length.toString();

      const pendingCount = registrations.filter((r) => getStatusCode(r) === 'pending').length;
      if (totalPendingEl) totalPendingEl.textContent = pendingCount.toString();
    }

    // ===== Renderização da tabela de registros =====
    function getFilteredRegistrations() {
  const rawTerm = (regSearchInput && regSearchInput.value || '')
    .trim()
    .toLowerCase();

  const term = rawTerm;
  const termDigits = rawTerm.replace(/\D/g, '');
  const onlyPending = regPendOnlyCheck && regPendOnlyCheck.checked;

  return registrations
    .filter((reg) => {
      const code = getStatusCode(reg);
      if (onlyPending && code !== 'pending') return false;
      return true;
    })
    .filter((reg) => {
      if (!term) return true;

      const nome = [reg.firstName, reg.lastName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const mat = String(reg.matricula || '').toLowerCase();
      const cpfDigits = String(reg.cpf || '').replace(/\D/g, '');
      const cpfFmt = formatCpfDigits(reg.cpf).toLowerCase();

      return (
        (nome && nome.includes(term)) ||
        (mat && mat.includes(term)) ||
        (termDigits && cpfDigits && cpfDigits.includes(termDigits)) ||
        (cpfFmt && cpfFmt.includes(term))
      );
    })
    .sort((a, b) => {
      const aDate = a.createdAt || 0;
      const bDate = b.createdAt || 0;
      return aDate > bDate ? -1 : 1;
    });
}


    function renderRequests() {
      if (!reqTableBody) return;

      const list = getFilteredRegistrations();
      reqTableBody.innerHTML = '';

      if (!list.length) {
        if (reqEmptyEl) {
          reqEmptyEl.textContent = 'Nenhum registro encontrado.';
          reqEmptyEl.style.display = 'block';
        }
        return;
      }
      if (reqEmptyEl) reqEmptyEl.style.display = 'none';

      list.forEach((reg) => {
        const tr = document.createElement('tr');
        const created = reg.createdAt ? new Date(reg.createdAt) : null;
        const createdStr = created
          ? created.toLocaleDateString('pt-BR')
          : '—';

        const tipoStr = reg.tipoCadastro === 'professor'
          ? 'Professor'
          : 'Aluno';

        const nomeStr = [reg.firstName, reg.lastName]
          .filter(Boolean)
          .join(' ') || '—';

        const statusMeta = getStatusMeta(reg);
        const statusBadge = `<span class="${statusMeta.badgeClass}">${statusMeta.label}</span>`;

        tr.innerHTML = `
          <td>${createdStr}</td>
          <td>${tipoStr}</td>
          <td>${nomeStr}</td>
          <td>${formatCpfDigits(reg.cpf)}</td>
          <td>${statusBadge}</td>
          <td>
            <div class="admin-table-actions">
              <button
                type="button"
                class="admin-btn-link"
                data-action="view"
                data-id="${reg.id}"
              >
                Ver detalhes
              </button>
            </div>
          </td>
        `;

        reqTableBody.appendChild(tr);
      });
    }

    // ===== Modal de detalhes =====
    function openModal(reg) {
      if (!modal) return;

      selectedRegistrationId = reg.id;

      const statusMeta = getStatusMeta(reg);

      modalTipo.textContent = reg.tipoCadastro === 'professor' ? 'Professor' : 'Aluno';
      modalNome.textContent = [reg.firstName, reg.lastName].filter(Boolean).join(' ') || '—';
      modalNascimento.textContent = formatDateISOToBR(reg.birthDate);
      modalCpf.textContent = formatCpfDigits(reg.cpf);
      modalEmail.textContent = reg.email || '—';
      modalTelefone.textContent = formatPhoneDigits(reg.phone);
      modalStatus.textContent = statusMeta.label;
      modalStatus.className = `text3 status-text status-text--${statusMeta.code}`;
      modalMatricula.textContent = reg.matricula || '—';


      const code = statusMeta.code;
      if (modalGenerate) modalGenerate.style.display = code === 'pending' ? 'inline-flex' : 'none';
      if (modalDeactivate) modalDeactivate.style.display = code === 'active' ? 'inline-flex' : 'none';
      if (modalReactivate) modalReactivate.style.display = code === 'inactive' ? 'inline-flex' : 'none';
      if (modalRemove) modalRemove.style.display = code === 'inactive' ? 'inline-flex' : 'none';

      modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal() {
      if (!modal) return;
      modal.setAttribute('aria-hidden', 'true');
      selectedRegistrationId = null;
    }

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalCancel) modalCancel.addEventListener('click', closeModal);
    if (modal) {
      const backdrop = modal.querySelector('.admin-modal-backdrop');
      if (backdrop) {
        backdrop.addEventListener('click', closeModal);
      }
    }

    // ===== Modal de confirmação genérico =====
    function openConfirm(action, reg) {
      if (!confirmModal || !confirmMessage) return;

      confirmAction = action;
      confirmTargetId = reg.id;

      const nome = [reg.firstName, reg.lastName]
        .filter(Boolean)
        .join(' ') || 'este usuário';

      const nomeSpan = `<span class="modal-user-name">${nome}</span>`;

      let msg = '';
      let btnLabel = '';
      switch (action) {
        case 'generate':
          msg = `Deseja realmente <span class="modal-highlight">gerar a matrícula</span> para ${nomeSpan}?`;
          btnLabel = 'Sim, gerar matrícula';
          break;
        case 'deactivate':
          msg = `Deseja realmente <span class="modal-highlight">inativar</span> o usuário ${nomeSpan}?`;
          btnLabel = 'Sim, inativar';
          break;
        case 'reactivate':
          msg = `Deseja realmente <span class="modal-highlight">reativar</span> o usuário ${nomeSpan}?`;
          btnLabel = 'Sim, reativar';
          break;
        case 'remove':
          msg = `Deseja realmente <span class="modal-highlight">remover do sistema</span> o registro de ${nomeSpan}? Essa ação não poderá ser desfeita.`;
          btnLabel = 'Sim, remover';
          break;
        default:
          msg = '';
      }

      confirmMessage.innerHTML = msg;
      if (confirmConfirmBtn && btnLabel) {
        confirmConfirmBtn.textContent = btnLabel;
      }

      confirmModal.setAttribute('aria-hidden', 'false');
    }

    function closeConfirmModal() {
      if (!confirmModal) return;
      confirmModal.setAttribute('aria-hidden', 'true');
      confirmAction = null;
      confirmTargetId = null;
    }

    if (confirmCloseBtn) confirmCloseBtn.addEventListener('click', closeConfirmModal);
    if (confirmCancelBtn) confirmCancelBtn.addEventListener('click', closeConfirmModal);
    if (confirmModal) {
      const backdrop = confirmModal.querySelector('.admin-modal-backdrop');
      if (backdrop) {
        backdrop.addEventListener('click', closeConfirmModal);
      }
    }

    function withSelectedRegistration(callback) {
      if (!selectedRegistrationId) return;
      const reg = registrations.find((r) => r.id === selectedRegistrationId);
      if (!reg) return;
      callback(reg);
    }

    // ===== Ações de dados / usuários =====
        function createOrUpdateUserFromRegistration(reg, matricula) {
      if (!ecData || !matricula) return;

      const fullName = [reg.firstName, reg.lastName].filter(Boolean).join(' ') || matricula;
      const cpfDigits = String(reg.cpf || '').replace(/\D/g, '');
      const phoneDigits = String(reg.phone || '').replace(/\D/g, '');
      const role = reg.tipoCadastro === 'professor' ? 'professor' : 'aluno';

      const newUser = {
        matricula,
        nome: fullName,
        email: reg.email || '',
        role,
        cpf: cpfDigits || undefined,
        nascimento: reg.birthDate || undefined,
        telefone: phoneDigits || undefined,
        senha: resolvePasswordFor(role, cpfDigits),  // Profe123 / Aluno123 em modo dev
      };

      // garante estrutura de users
      if (!ecData.users) {
        ecData.users = {};
      }

      if (Array.isArray(ecData.users)) {
        // caso legado, se users tiver virado array em algum momento
        const idx = ecData.users.findIndex((u) => u && u.matricula === matricula);
        if (idx >= 0) ecData.users[idx] = newUser;
        else ecData.users.push(newUser);
      } else {
        // formato oficial: objeto mapeado por matrícula
        ecData.users[matricula] = newUser;
      }

      const userList = Array.isArray(ecData.users)
        ? ecData.users
        : Object.values(ecData.users || {});

      allTeachers = userList.filter((u) => u && u.role === 'professor');
      allStudents = userList.filter((u) => u && u.role === 'aluno');

      persistEcData();
    }


        function removeUserByMatricula(matricula) {
      if (!ecData || !matricula) return;

      if (Array.isArray(ecData.users)) {
        const idx = ecData.users.findIndex((u) => u && u.matricula === matricula);
        if (idx >= 0) ecData.users.splice(idx, 1);
      } else if (ecData.users && typeof ecData.users === 'object') {
        delete ecData.users[matricula];
      }

      const userList = Array.isArray(ecData.users)
        ? ecData.users
        : Object.values(ecData.users || {});

      allTeachers = userList.filter((u) => u && u.role === 'professor');
      allStudents = userList.filter((u) => u && u.role === 'aluno');

      persistEcData();
    }


    function handleGenerate(regId) {
      const idx = registrations.findIndex((r) => r.id === regId);
      if (idx === -1) return;

      const reg = registrations[idx];
      const statusCode = getStatusCode(reg);
      if (statusCode !== 'pending') return;

      const mat = generateMatricula(reg.tipoCadastro);
      if (!mat) {
        if (typeof Toastify === 'function') {
          Toastify({
            text: 'Não foi possível gerar a matrícula.',
            duration: 4000,
            close: true,
            gravity: 'top',
            position: 'right',
            stopOnFocus: true,
            style: { background: '#e53935', color: '#ffffff' }
          }).showToast();
        }
        return;
      }

      reg.status = 'active';
      reg.matricula = mat;
      reg.approvedAt = new Date().toISOString();
      registrations[idx] = reg;
      saveRegistrations(registrations);

      createOrUpdateUserFromRegistration(reg, mat);

      modalStatus.textContent = 'Ativo';
      modalMatricula.textContent = mat;

      refreshSummary();
      renderRequests();

      if (typeof Toastify === 'function') {
        Toastify({
          text: `Matrícula ${mat} gerada com sucesso.`,
          duration: 4000,
          close: true,
          gravity: 'top',
          position: 'right',
          stopOnFocus: true,
          style: { background: '#16c47f', color: '#ffffff' }
        }).showToast();
      }

      closeModal();
    }

    function handleStatusChange(regId, newCode) {
      const idx = registrations.findIndex((r) => r.id === regId);
      if (idx === -1) return;

      const reg = registrations[idx];
      reg.status = newCode === 'inactive' ? 'inactive' : 'active';
      registrations[idx] = reg;
      saveRegistrations(registrations);

      refreshSummary();
      renderRequests();

      if (typeof Toastify === 'function') {
        const isInactive = newCode === 'inactive';
        Toastify({
          text: isInactive ? 'Usuário inativado com sucesso.' : 'Usuário reativado com sucesso.',
          duration: 4000,
          close: true,
          gravity: 'top',
          position: 'right',
          stopOnFocus: true,
          style: { background: '#16c47f', color: '#ffffff' }
        }).showToast();
      }

      closeModal();
    }

    function handleRemove(regId) {
      const idx = registrations.findIndex((r) => r.id === regId);
      if (idx === -1) return;

      const reg = registrations[idx];

      if (reg.matricula) {
        removeUserByMatricula(reg.matricula);
      }

      registrations.splice(idx, 1);
      saveRegistrations(registrations);

      refreshSummary();
      renderRequests();

      if (typeof Toastify === 'function') {
        Toastify({
          text: 'Registro removido do sistema.',
          duration: 4000,
          close: true,
          gravity: 'top',
          position: 'right',
          stopOnFocus: true,
          style: { background: '#e53935', color: '#ffffff' }
        }).showToast();
      }

      closeModal();
    }

    // Clique em "Ver detalhes"
    if (reqTableBody) {
      reqTableBody.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action="view"]');
        if (!btn) return;
        const id = Number(btn.dataset.id);
        const reg = registrations.find((r) => r.id === id);
        if (!reg) return;
        openModal(reg);
      });
    }

    // Botões do modal principal → abrem confirmação
    if (modalGenerate) {
      modalGenerate.addEventListener('click', () => {
        withSelectedRegistration((reg) => openConfirm('generate', reg));
      });
    }
    if (modalDeactivate) {
      modalDeactivate.addEventListener('click', () => {
        withSelectedRegistration((reg) => openConfirm('deactivate', reg));
      });
    }
    if (modalReactivate) {
      modalReactivate.addEventListener('click', () => {
        withSelectedRegistration((reg) => openConfirm('reactivate', reg));
      });
    }
    if (modalRemove) {
      modalRemove.addEventListener('click', () => {
        withSelectedRegistration((reg) => openConfirm('remove', reg));
      });
    }

    // Confirmação final
    if (confirmConfirmBtn) {
      confirmConfirmBtn.addEventListener('click', () => {
        if (!confirmTargetId || !confirmAction) {
          closeConfirmModal();
          return;
        }

        const id = confirmTargetId;
        const action = confirmAction;

        closeConfirmModal();

        if (action === 'generate') {
          handleGenerate(id);
        } else if (action === 'deactivate') {
          handleStatusChange(id, 'inactive');
        } else if (action === 'reactivate') {
          handleStatusChange(id, 'active');
        } else if (action === 'remove') {
          handleRemove(id);
        }
      });
    }

    // ===== Filtros de busca dos registros =====
    if (regSearchInput) {
      regSearchInput.addEventListener('input', renderRequests);
    }
    if (regPendOnlyCheck) {
      regPendOnlyCheck.addEventListener('change', renderRequests);
    }

    // ===== Inicialização =====
    refreshSummary();
    renderRequests();
  });
})();
