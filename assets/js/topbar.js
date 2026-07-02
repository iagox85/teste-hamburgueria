function carregarTopbar(titulo, subtitulo) {
  const topbar = document.getElementById("topbar");

  topbar.innerHTML = `
    <button type="button" class="mobile-menu-button" id="mobileMenuButton" aria-label="Abrir menu">☰</button>
    <strong class="mobile-topbar-brand">DeliveryOS</strong>

    <div>
      <h1>${titulo}</h1>
      <p>${subtitulo}</p>
    </div>

    <div class="topbar-actions">
      <button class="notification">🔔</button>
      <button id="sair">Sair</button>
    </div>
  `;

  if (typeof inicializarMenuMobile === "function") {
    inicializarMenuMobile();
  }
}
