function carregarSidebar(paginaAtiva) {

    const sidebar = document.getElementById("sidebar");

    sidebar.innerHTML = `
    
        <h2>DeliveryOS</h2>

        <nav>

            <a href="admin.html"
                ${paginaAtiva === "dashboard" ? 'class="active"' : ""}>
                📊 Dashboard
            </a>

            <a href="pedidos.html"
                ${paginaAtiva === "pedidos" ? 'class="active"' : ""}>
                📦 Pedidos
            </a>

            <a href="produtos.html"
                ${paginaAtiva === "produtos" ? 'class="active"' : ""}>
                🍔 Produtos
            </a>

            <a href="categorias.html"
                ${paginaAtiva === "categorias" ? 'class="active"' : ""}>
                📂 Categorias
            </a>

            <a href="grupos-adicionais.html"
                ${paginaAtiva === "grupos" ? 'class="active"' : ""}>
                📋 Grupos
            </a>

            <a href="adicionais.html"
                ${paginaAtiva === "adicionais" ? 'class="active"' : ""}>
                🧀 Adicionais
            </a>

            <a href="relatorios.html"
                ${paginaAtiva === "relatorios" ? 'class="active"' : ""}>
                📈 Relatórios
            </a>

            <a href="configuracoes.html"
                ${paginaAtiva === "configuracoes" ? 'class="active"' : ""}>
                ⚙️ Configurações
            </a>

        </nav>

    `;

}
