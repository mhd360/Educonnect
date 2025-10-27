const button = document.getElementById('theme-btn');
const icon = document.getElementById('theme-img');

button.addEventListener('click', function() {
  document.documentElement.classList.toggle('light-mode');

  // Muda o ícone dependendo do tema
  if (document.documentElement.classList.contains('light-mode')) {
    icon.src = 'icons/black_moon.svg';  // Ícone da lua (modo claro)
  } else {
    icon.src = 'icons/white_sun.svg';  // Ícone do sol (modo escuro)
  }
});

// Muda o ícone quando o mouse passa por cima do botão
button.addEventListener('mouseover', function() {
  if (!document.documentElement.classList.contains('light-mode')) {
    icon.src = 'icons/suncolor.svg';  // Ícone de destaque para o sol
  } else {
    icon.src = 'icons/mooncolor.svg';  // Ícone de destaque para a lua
  }
});

// Restaura o ícone ao sair do hover
button.addEventListener('mouseout', function() {
  if (!document.documentElement.classList.contains('light-mode')) {
    icon.src = 'icons/white_sun.svg';  // Ícone para o modo escuro
  } else {
    icon.src = 'icons/black_moon.svg';  // Ícone para o modo claro
  }
});
