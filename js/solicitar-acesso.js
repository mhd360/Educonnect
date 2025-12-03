document.addEventListener('DOMContentLoaded', () => {
  const firstName = document.getElementById('firstName');
  const lastName  = document.getElementById('lastName');
  const cpf       = document.getElementById('cpf');
  const phone     = document.getElementById('phone');
  const form      = document.querySelector('.access-form');

  // ===== 1. Nome / Sobrenome – apenas letras (inclui acentos) =====
  const onlyLettersRegex = /[^a-zA-ZÀ-ÿ\s]/g;

  [firstName, lastName].forEach((input) => {
    if (!input) return;
    input.addEventListener('input', () => {
      input.value = input.value.replace(onlyLettersRegex, '');
    });
  });

  // ===== 2. CPF – apenas números + máscara + validação =====
  function isValidCPF(raw) {
    const cpfDigits = raw.replace(/\D/g, '');

    if (cpfDigits.length !== 11) return false;
    if (/^(\d)\1+$/.test(cpfDigits)) return false; // todos iguais

    const calcCheckDigit = (base) => {
      let sum = 0;
      for (let i = 0; i < base.length; i++) {
        sum += parseInt(base.charAt(i), 10) * (base.length + 1 - i);
      }
      const mod = (sum * 10) % 11;
      return mod === 10 ? 0 : mod;
    };

    const firstNine = cpfDigits.slice(0, 9);
    const d1 = calcCheckDigit(firstNine);
    if (d1 !== parseInt(cpfDigits.charAt(9), 10)) return false;

    const firstTen = cpfDigits.slice(0, 10);
    const d2 = calcCheckDigit(firstTen);
    if (d2 !== parseInt(cpfDigits.charAt(10), 10)) return false;

    return true;
  }

  // formata para 000.000.000-00
  function formatCPF(digits) {
    const d = digits.replace(/\D/g, '').slice(0, 11);

    if (d.length <= 3) return d;
    if (d.length <= 6) return d.slice(0, 3) + '.' + d.slice(3);
    if (d.length <= 9) return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6);
    // 10 ou 11 dígitos
    return (
      d.slice(0, 3) +
      '.' +
      d.slice(3, 6) +
      '.' +
      d.slice(6, 9) +
      '-' +
      d.slice(9)
    );
  }

  if (cpf) {
    // só números, no máximo 11, com máscara
    cpf.addEventListener('input', () => {
      const digits = cpf.value.replace(/\D/g, '').slice(0, 11);
      cpf.value = formatCPF(digits);
      cpf.setCustomValidity('');
    });

    // valida CPF ao sair do campo
    cpf.addEventListener('blur', () => {
      const digits = cpf.value.replace(/\D/g, '');
      if (!digits) return; // required do HTML cuida disso

      if (!isValidCPF(digits)) {
        cpf.setCustomValidity('CPF inválido');
        cpf.reportValidity();
      } else {
        cpf.setCustomValidity('');
      }
    });
  }

  // ===== 3. Telefone – apenas números, 11 dígitos, máscara (11)11111-1111 =====
  if (phone) {
    phone.addEventListener('input', () => {
      let digits = phone.value.replace(/\D/g, '');
      digits = digits.slice(0, 11);

      let formatted = '';
      if (digits.length > 0) {
        formatted = '(' + digits.slice(0, Math.min(2, digits.length));
        if (digits.length >= 2) formatted += ')';
        const rest = digits.slice(2);

        if (rest.length > 0 && rest.length <= 5) {
          formatted += rest;
        } else if (rest.length > 5) {
          formatted += rest.slice(0, 5) + '-' + rest.slice(5);
        }
      }

      phone.value = formatted;
      phone.setCustomValidity('');
    });

    phone.addEventListener('blur', () => {
      const digits = phone.value.replace(/\D/g, '');
      if (!digits) return; // required cuida
      if (digits.length !== 11) {
        phone.setCustomValidity('Telefone deve ter 11 dígitos (DDD + número).');
        phone.reportValidity();
      } else {
        phone.setCustomValidity('');
      }
    });
  }

  // ===== 4. Submit – revalida CPF e telefone antes de enviar =====
  if (form) {
    form.addEventListener('submit', (e) => {
      if (cpf) cpf.dispatchEvent(new Event('blur'));
      if (phone) phone.dispatchEvent(new Event('blur'));

      if (!form.checkValidity()) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }
});
