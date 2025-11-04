(function () {
  const links = Array.from(document.querySelectorAll('.header-nav .nav-link'));
  if (!links.length) return;

  const idToLink = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
  const targets = Array.from(document.querySelectorAll('.with-offset'));

  // IntersectionObserver configurado para detectar seções visíveis de forma mais precisa
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const link = idToLink.get(entry.target.id);
      if (entry.isIntersecting) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }, {
    threshold: 0.4,   // Seção precisa ter pelo menos 40% visível
    rootMargin: "0px 0px -40% 0px" // Ajusta a margem para que a seção seja ativada quando estiver em 40% da tela
  });

  // Observa as seções da página
  targets.forEach(t => io.observe(t));
})();