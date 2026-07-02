// ============================================================
// DASHBOARD DATA - DELIVERYOS
// Métricas reais do dashboard usando Supabase.
// ============================================================

(function () {
  const elementos = {
    vendasHoje: document.getElementById("dashboardVendasHoje"),
    pedidosHoje: document.getElementById("dashboardPedidosHoje"),
    pedidosNovos: document.getElementById("dashboardPedidosNovos"),
    produtosAtivos: document.getElementById("dashboardProdutosAtivos"),
    pedidosRecentes: document.getElementById("dashboardPedidosRecentes"),
    nomeLoja: document.getElementById("dashboardNomeLoja"),
    resumoLoja: document.getElementById("dashboardResumoLoja"),
    realtimeStatus: document.getElementById("dashboardRealtimeStatus")
  };

  let lojaAtualDashboard = null;
  let canalDashboard = null;

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function formatarData(data) {
    if (!data) return "";

    return new Date(data).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function inicioDoDiaISO() {
    const data = new Date();
    data.setHours(0, 0, 0, 0);
    return data.toISOString();
  }

  function inicioDoMesISO() {
    const data = new Date();
    data.setDate(1);
    data.setHours(0, 0, 0, 0);
    return data.toISOString();
  }

  function normalizarStatus(status) {
    return status || "novo";
  }

  function escaparHTML(texto) {
    return String(texto || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function numeroPedido(pedido) {
    if (pedido.numero_pedido) {
      return `#${String(pedido.numero_pedido).padStart(4, "0")}`;
    }

    return `#${String(pedido.id || "").slice(0, 6)}`;
  }

  function labelStatus(status) {
    const mapa = {
      novo: "Novo",
      aceito: "Aceito",
      preparando: "Preparando",
      pronto: "Pronto",
      saiu_entrega: "Saiu para entrega",
      finalizado: "Finalizado",
      cancelado: "Cancelado"
    };

    return mapa[normalizarStatus(status)] || normalizarStatus(status);
  }

  async function carregarLojaDoUsuario() {
    const {
      data: { user },
      error: erroUsuario
    } = await supabaseClient.auth.getUser();

    if (erroUsuario || !user) return null;

    const { data: vinculo, error: erroVinculo } = await supabaseClient
      .from("usuarios_loja")
      .select("loja_id")
      .eq("user_id", user.id)
      .single();

    if (erroVinculo || !vinculo?.loja_id) return null;

    const { data: loja, error: erroLoja } = await supabaseClient
      .from("lojas")
      .select("*")
      .eq("id", vinculo.loja_id)
      .single();

    if (erroLoja || !loja) return { id: vinculo.loja_id };

    return loja;
  }

  async function carregarPedidosHoje(lojaId) {
    const { data, error } = await supabaseClient
      .from("pedidos")
      .select("id, numero_pedido, cliente_nome, status, total, created_at, tipo_recebimento, tipo_entrega")
      .eq("loja_id", lojaId)
      .gte("created_at", inicioDoDiaISO())
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    return data || [];
  }

  async function carregarPedidosRecentes(lojaId) {
    const { data, error } = await supabaseClient
      .from("pedidos")
      .select("id, numero_pedido, cliente_nome, status, total, created_at")
      .eq("loja_id", lojaId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) throw error;
    return data || [];
  }

  async function carregarProdutosAtivos(lojaId) {
    const { data, error } = await supabaseClient
      .from("produtos")
      .select("id")
      .eq("loja_id", lojaId)
      .eq("ativo", true)
      .eq("indisponivel", false)
      .limit(1000);

    if (error) {
      const fallback = await supabaseClient
        .from("produtos")
        .select("id")
        .eq("loja_id", lojaId)
        .limit(1000);

      if (fallback.error) throw fallback.error;
      return fallback.data?.length || 0;
    }

    return data?.length || 0;
  }

  function renderizarMetricas(pedidosHoje, produtosAtivos) {
    const pedidosValidos = pedidosHoje.filter((pedido) => normalizarStatus(pedido.status) !== "cancelado");
    const vendasHoje = pedidosValidos.reduce((total, pedido) => total + Number(pedido.total || 0), 0);
    const pedidosNovos = pedidosHoje.filter((pedido) => normalizarStatus(pedido.status) === "novo").length;

    if (elementos.vendasHoje) elementos.vendasHoje.innerText = formatarMoeda(vendasHoje);
    if (elementos.pedidosHoje) elementos.pedidosHoje.innerText = String(pedidosHoje.length);
    if (elementos.pedidosNovos) elementos.pedidosNovos.innerText = String(pedidosNovos);
    if (elementos.produtosAtivos) elementos.produtosAtivos.innerText = String(produtosAtivos);
  }

  function renderizarPedidosRecentes(pedidos) {
    if (!elementos.pedidosRecentes) return;

    if (!pedidos.length) {
      elementos.pedidosRecentes.className = "dashboard-empty-state dashboard-empty-polish";
      elementos.pedidosRecentes.innerHTML = `
        <div class="dashboard-empty-icon">📦</div>
        <strong>Ainda não há pedidos recentes</strong>
        <p>Quando um cliente finalizar um pedido, ele aparecerá aqui para você acompanhar rapidamente.</p>
        <a href="pedidos.html" class="btn-admin-secondary">Abrir pedidos</a>
      `;
      return;
    }

    elementos.pedidosRecentes.className = "dashboard-recent-list";
    elementos.pedidosRecentes.innerHTML = pedidos.map((pedido) => {
      const status = normalizarStatus(pedido.status);
      return `
        <a class="dashboard-recent-item dashboard-recent-link" href="pedidos.html">
          <div class="dashboard-recent-icon">${numeroPedido(pedido)}</div>
          <div class="dashboard-recent-info">
            <strong>${escaparHTML(pedido.cliente_nome || "Cliente não informado")}</strong>
            <span>${formatarData(pedido.created_at)} • ${formatarMoeda(pedido.total)}</span>
          </div>
          <span class="dashboard-status-pill status-${escaparHTML(status)}">${escaparHTML(labelStatus(status))}</span>
        </a>
      `;
    }).join("");
  }

  async function atualizarDashboard() {
    if (!lojaAtualDashboard?.id) return;

    try {
      const [pedidosHoje, pedidosRecentes, produtosAtivos] = await Promise.all([
        carregarPedidosHoje(lojaAtualDashboard.id),
        carregarPedidosRecentes(lojaAtualDashboard.id),
        carregarProdutosAtivos(lojaAtualDashboard.id)
      ]);

      renderizarMetricas(pedidosHoje, produtosAtivos);
      renderizarPedidosRecentes(pedidosRecentes);
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
      if (elementos.pedidosRecentes) {
        elementos.pedidosRecentes.className = "dashboard-empty-state dashboard-empty-polish";
        elementos.pedidosRecentes.innerHTML = `
          <div class="dashboard-empty-icon">!</div>
          <strong>Não foi possível carregar o dashboard</strong>
          <p>Verifique a conexão com o Supabase e tente novamente.</p>
        `;
      }
    }
  }

  function iniciarRealtime() {
    if (!lojaAtualDashboard?.id) return;

    if (canalDashboard) {
      supabaseClient.removeChannel(canalDashboard);
    }

    canalDashboard = supabaseClient
      .channel(`deliveryos-dashboard-${lojaAtualDashboard.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "pedidos",
        filter: `loja_id=eq.${lojaAtualDashboard.id}`
      }, () => atualizarDashboard())
      .subscribe((status) => {
        if (elementos.realtimeStatus) {
          elementos.realtimeStatus.innerText = status === "SUBSCRIBED" ? "Conectado" : "Conectando";
        }
      });
  }

  async function iniciarDashboard() {
    lojaAtualDashboard = await carregarLojaDoUsuario();

    if (!lojaAtualDashboard?.id) {
      if (elementos.pedidosRecentes) {
        elementos.pedidosRecentes.innerHTML = `
          <div class="dashboard-empty-icon">!</div>
          <strong>Loja não vinculada</strong>
          <p>Este usuário ainda não está vinculado a uma loja.</p>
        `;
      }
      return;
    }

    const nomeLoja = lojaAtualDashboard.nome || lojaAtualDashboard.nome_loja || lojaAtualDashboard.nome_fantasia || "Sua loja";

    if (elementos.nomeLoja) elementos.nomeLoja.innerText = nomeLoja;
    if (elementos.resumoLoja) elementos.resumoLoja.innerText = "Dados reais da sua operação.";

    await atualizarDashboard();
    iniciarRealtime();
  }

  document.addEventListener("DOMContentLoaded", iniciarDashboard);
})();
