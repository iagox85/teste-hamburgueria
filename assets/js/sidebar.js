function carregarSidebar(paginaAtiva) {
  const sidebar = document.getElementById("sidebar");

  sidebar.innerHTML = `
    <button type="button" class="sidebar-close-mobile" id="sidebarCloseMobile" aria-label="Fechar menu">×</button>
    <h2>DeliveryOS</h2>

    <nav>
      <a href="admin.html" class="${paginaAtiva === "dashboard" ? "active" : ""}">📊 Dashboard</a>
      <a href="pedidos.html" class="${paginaAtiva === "pedidos" ? "active" : ""}">📦 Pedidos</a>
      <a href="produtos.html" class="${paginaAtiva === "produtos" ? "active" : ""}">🍔 Produtos</a>
      <a href="categorias.html" class="${paginaAtiva === "categorias" ? "active" : ""}">📂 Categorias</a>
      <a href="grupos-adicionais.html" class="${paginaAtiva === "grupos" ? "active" : ""}">📋 Grupos</a>
      <a href="adicionais.html" class="${paginaAtiva === "adicionais" ? "active" : ""}">🧀 Adicionais</a>
      <a href="relatorios.html" class="${paginaAtiva === "relatorios" ? "active" : ""}">📈 Relatórios</a>
      <a href="configuracoes.html" class="${paginaAtiva === "configuracoes" ? "active" : ""}">⚙️ Configurações</a>
    </nav>
  `;

  inicializarMenuMobile();
}

function inicializarMenuMobile() {
  let backdrop = document.querySelector(".mobile-menu-backdrop");

  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.className = "mobile-menu-backdrop";
    document.body.appendChild(backdrop);
  }

  const abrirMenu = () => document.body.classList.add("mobile-menu-open");
  const fecharMenu = () => document.body.classList.remove("mobile-menu-open");

  const botaoAbrir = document.getElementById("mobileMenuButton");
  const botaoFechar = document.getElementById("sidebarCloseMobile");

  if (botaoAbrir) botaoAbrir.onclick = abrirMenu;
  if (botaoFechar) botaoFechar.onclick = fecharMenu;
  backdrop.onclick = fecharMenu;

  document.querySelectorAll("#sidebar a").forEach((link) => {
    link.addEventListener("click", fecharMenu);
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") fecharMenu();
  }, { once: true });
}
