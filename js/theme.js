document.addEventListener('DOMContentLoaded', () => {
  const root   = document.documentElement;
  const button = document.getElementById('theme-btn');
  const icon   = document.getElementById('theme-img');

  if (!button || !icon) return;

  // Descobre o caminho base a partir do src atual (só troca o arquivo, não o diretório)
  const basePath = icon.src.replace(/[^/]+$/, '');

  const ICONS = {
    dark: {
      normal: 'white_sun.svg',
      hover:  'suncolor.svg'
    },
    light: {
      normal: 'black_moon.svg',
      hover:  'mooncolor.svg'
    }
  };

  function setIcon(theme, hover) {
    const mode = hover ? 'hover' : 'normal';
    const file = ICONS[theme][mode];
    icon.src = basePath + file;
  }

  function applyTheme(theme) {
    const t = theme === 'light' ? 'light' : 'dark';

    root.setAttribute('data-theme', t);
    localStorage.setItem('ec-theme', t);

    // ícone condizente com o tema atual
    setIcon(t, false);
  }

  // Lê o tema salvo ou o atributo atual; se nada, assume dark
  const saved =
    localStorage.getItem('ec-theme') ||
    root.getAttribute('data-theme') ||
    'dark';

  // aplica tema + ícone logo ao carregar a página
  applyTheme(saved);

  // Clique: alterna tema
  button.addEventListener('click', () => {
    const current = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next    = current === 'light' ? 'dark' : 'light';
    applyTheme(next);
  });

  // Hover: troca ícone para versão colorida
  button.addEventListener('mouseover', () => {
    const current = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    setIcon(current, true);
  });

  button.addEventListener('mouseout', () => {
    const current = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    setIcon(current, false);
  });
});
