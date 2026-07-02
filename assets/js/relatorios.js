// ============================================================
// RELATÓRIOS - DELIVERYOS
// Indicadores reais usando pedidos do Supabase.
// ============================================================

(function () {
  const el = {
    vendasHoje: document.getElementById("relatorioVendasHoje"),
    pedidosHoje: document.getElementById("relatorioPedidosHoje"),
    faturamentoMensal: document.getElementById("relatorioFaturamentoMensal"),
    ticketMedio: document.getElementById("relatorioTicketMedio"),
    comparativoHoje: document.getElementById("relatorioComparativoHoje"),
    pedidosNovosHoje: document.getElementById("relatorioPedidosNovosHoje"),
    pedidosMes: document.getElementById("relatorioPedidosMes"),
    graficoDias: document.getElementById("relatorioGraficoDias"),
    statusPedidos: document.getElementById("relatorioStatusPedidos"),
    produtosVendidos: document.getElementById("relatorioProdutosVendidos"),
    pedidosRecentes: document.getElementById("relatorioPedidosRecentes")
  };

  let lojaAtualRelatorios = null;
  let canalRelatorios = null;

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

  function escaparHTML(texto) {
    return String(texto || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizarStatus(status) {
    return status || "novo";
  }

  function statusLabel(status) {
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

  function numeroPedido(pedido) {
    if (pedido.numero_pedido) {
      return `#${String(pedido.numero_pedido).padStart(4, "0")}`;
    }

    return `#${String(pedido.id || "").slice(0, 6)}`;
  }

  function inicioDoDia(data = new Date()) {
    const novaData = new Date(data);
    novaData.setHours(0, 0, 0, 0);
    return novaData;
  }

  function inicioDoMes(data = new Date()) {
    const novaData = new Date(data);
    novaData.setDate(1);
    novaData.setHours(0, 0, 0, 0);
    return novaData;
  }

  function chaveDia(data) {
    const d = new Date(data);
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  function labelDia(chave) {
    const [ano, mes, dia] = chave.split("-").map(Number);
    const data = new Date(ano, mes - 1, dia);
    return data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit"
    });
  }

  function pedidoValido(pedido) {
    return normalizarStatus(pedido.status) !== "cancelado";
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

    return { id: vinculo.loja_id };
  }

  async function carregarPedidosDoPeriodo(lojaId) {
    const seteDiasAtras = inicioDoDia();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 6);

    const inicioConsulta = new Date(Math.min(seteDiasAtras.getTime(), inicioDoMes().getTime()));

    const { data, error } = await supabaseClient
      .from("pedidos")
      .select("id, numero_pedido, cliente_nome, status, total, subtotal, taxa_entrega, itens, created_at, tipo_recebimento, tipo_entrega, pagamento")
      .eq("loja_id", lojaId)
      .gte("created_at", inicioConsulta.toISOString())
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) throw error;
    return data || [];
  }

  function calcularMetricas(pedidos) {
    const inicioHoje = inicioDoDia();
    const inicioMesAtual = inicioDoMes();

    const pedidosHoje = pedidos.filter((pedido) => new Date(pedido.created_at) >= inicioHoje);
    const pedidosMes = pedidos.filter((pedido) => new Date(pedido.created_at) >= inicioMesAtual);
    const pedidosHojeValidos = pedidosHoje.filter(pedidoValido);
    const pedidosMesValidos = pedidosMes.filter(pedidoValido);

    const vendasHoje = pedidosHojeValidos.reduce((total, pedido) => total + Number(pedido.total || 0), 0);
    const faturamentoMes = pedidosMesValidos.reduce((total, pedido) => total + Number(pedido.total || 0), 0);
    const ticketMedio = pedidosMesValidos.length ? faturamentoMes / pedidosMesValidos.length : 0;
    const pedidosNovosHoje = pedidosHoje.filter((pedido) => normalizarStatus(pedido.status) === "novo").length;

    return {
      pedidosHoje,
      pedidosMes,
      pedidosHojeValidos,
      pedidosMesValidos,
      vendasHoje,
      faturamentoMes,
      ticketMedio,
      pedidosNovosHoje
    };
  }

  function renderizarMetricas(metricas) {
    if (el.vendasHoje) el.vendasHoje.innerText = formatarMoeda(metricas.vendasHoje);
    if (el.pedidosHoje) el.pedidosHoje.innerText = String(metricas.pedidosHoje.length);
    if (el.faturamentoMensal) el.faturamentoMensal.innerText = formatarMoeda(metricas.faturamentoMes);
    if (el.ticketMedio) el.ticketMedio.innerText = formatarMoeda(metricas.ticketMedio);

    if (el.comparativoHoje) {
      el.comparativoHoje.innerText = `${metricas.pedidosHojeValidos.length} pedidos válidos hoje`;
    }

    if (el.pedidosNovosHoje) {
      el.pedidosNovosHoje.innerText = `${metricas.pedidosNovosHoje} novos aguardando`;
    }

    if (el.pedidosMes) {
      el.pedidosMes.innerText = `${metricas.pedidosMes.length} pedidos no mês`;
    }
  }

  function montarDiasBase() {
    const dias = [];
    const hoje = inicioDoDia();

    for (let i = 6; i >= 0; i -= 1) {
      const data = new Date(hoje);
      data.setDate(hoje.getDate() - i);
      dias.push(chaveDia(data));
    }

    return dias;
  }

  function renderizarGraficoDias(pedidos) {
    if (!el.graficoDias) return;

    const dias = montarDiasBase();
    const totais = Object.fromEntries(dias.map((dia) => [dia, 0]));

    pedidos.filter(pedidoValido).forEach((pedido) => {
      const chave = chaveDia(pedido.created_at);
      if (chave in totais) {
        totais[chave] += Number(pedido.total || 0);
      }
    });

    const maiorValor = Math.max(...Object.values(totais), 0);

    if (maiorValor <= 0) {
      el.graficoDias.innerHTML = `
        <div class="relatorio-vazio">
          Nenhum faturamento nos últimos 7 dias.
        </div>
      `;
      return;
    }

    el.graficoDias.innerHTML = dias.map((dia) => {
      const valor = totais[dia];
      const largura = maiorValor > 0 ? Math.max(4, (valor / maiorValor) * 100) : 0;
      return `
        <div class="relatorio-barra-linha">
          <div class="relatorio-barra-dia">${labelDia(dia)}</div>
          <div class="relatorio-barra-trilho">
            <div class="relatorio-barra-preenchimento" style="width: ${largura}%"></div>
          </div>
          <div class="relatorio-barra-valor">${formatarMoeda(valor)}</div>
        </div>
      `;
    }).join("");
  }

  function renderizarStatus(pedidos) {
    if (!el.statusPedidos) return;

    const ordem = ["novo", "aceito", "preparando", "pronto", "saiu_entrega", "finalizado", "cancelado"];
    const contagem = pedidos.reduce((acc, pedido) => {
      const status = normalizarStatus(pedido.status);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const itens = ordem
      .filter((status) => contagem[status])
      .map((status) => ({ status, total: contagem[status] }));

    if (!itens.length) {
      el.statusPedidos.innerHTML = `
        <div class="relatorio-vazio">Nenhum pedido encontrado para calcular status.</div>
      `;
      return;
    }

    el.statusPedidos.innerHTML = itens.map((item) => `
      <div class="relatorio-status-item">
        <div>
          <strong>${statusLabel(item.status)}</strong>
          <span>Pedidos com este status</span>
        </div>
        <div class="relatorio-status-total">
          <span class="relatorio-status-pill status-${escaparHTML(item.status)}">${item.total}</span>
        </div>
      </div>
    `).join("");
  }

  function renderizarProdutosVendidos(pedidos) {
    if (!el.produtosVendidos) return;

    const ranking = new Map();

    pedidos.filter(pedidoValido).forEach((pedido) => {
      const itens = Array.isArray(pedido.itens) ? pedido.itens : [];

      itens.forEach((item) => {
        const nome = item.nome || "Produto sem nome";
        const quantidade = Number(item.quantidade || 1);
        const preco = Number(item.preco_unitario || item.preco || item.valor || 0);
        const atual = ranking.get(nome) || { nome, quantidade: 0, total: 0 };

        atual.quantidade += quantidade;
        atual.total += preco * quantidade;
        ranking.set(nome, atual);
      });
    });

    const produtos = [...ranking.values()]
      .sort((a, b) => b.quantidade - a.quantidade || b.total - a.total)
      .slice(0, 6);

    if (!produtos.length) {
      el.produtosVendidos.innerHTML = `
        <div class="relatorio-vazio">Nenhum item vendido ainda.</div>
      `;
      return;
    }

    el.produtosVendidos.innerHTML = produtos.map((produto, index) => `
      <div class="relatorio-ranking-item">
        <div class="relatorio-ranking-posicao">${index + 1}</div>
        <div>
          <strong>${escaparHTML(produto.nome)}</strong>
          <span>${produto.quantidade} unidade(s) vendida(s)</span>
        </div>
        <div class="relatorio-ranking-total">${formatarMoeda(produto.total)}</div>
      </div>
    `).join("");
  }

  function renderizarPedidosRecentes(pedidos) {
    if (!el.pedidosRecentes) return;

    const recentes = pedidos.slice(0, 6);

    if (!recentes.length) {
      el.pedidosRecentes.innerHTML = `
        <div class="relatorio-vazio">Nenhum pedido recente encontrado.</div>
      `;
      return;
    }

    el.pedidosRecentes.innerHTML = recentes.map((pedido) => {
      const status = normalizarStatus(pedido.status);
      return `
        <div class="relatorio-pedido-item">
          <div>
            <strong>${numeroPedido(pedido)} · ${escaparHTML(pedido.cliente_nome || "Cliente não informado")}</strong>
            <span>${formatarData(pedido.created_at)} · ${statusLabel(status)}</span>
          </div>
          <div class="relatorio-pedido-total">${formatarMoeda(pedido.total)}</div>
        </div>
      `;
    }).join("");
  }

  function renderizarErro() {
    const erroHTML = `<div class="relatorio-vazio">Não foi possível carregar os relatórios. Verifique a conexão com o Supabase.</div>`;

    if (el.graficoDias) el.graficoDias.innerHTML = erroHTML;
    if (el.statusPedidos) el.statusPedidos.innerHTML = erroHTML;
    if (el.produtosVendidos) el.produtosVendidos.innerHTML = erroHTML;
    if (el.pedidosRecentes) el.pedidosRecentes.innerHTML = erroHTML;
  }

  async function atualizarRelatorios() {
    if (!lojaAtualRelatorios?.id) return;

    try {
      const pedidos = await carregarPedidosDoPeriodo(lojaAtualRelatorios.id);
      const metricas = calcularMetricas(pedidos);

      renderizarMetricas(metricas);
      renderizarGraficoDias(pedidos);
      renderizarStatus(pedidos);
      renderizarProdutosVendidos(pedidos);
      renderizarPedidosRecentes(pedidos);
    } catch (error) {
      console.error("Erro ao carregar relatórios:", error);
      renderizarErro();
    }
  }

  function iniciarRealtime() {
    if (!lojaAtualRelatorios?.id) return;

    if (canalRelatorios) {
      supabaseClient.removeChannel(canalRelatorios);
    }

    canalRelatorios = supabaseClient
      .channel(`deliveryos-relatorios-${lojaAtualRelatorios.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "pedidos",
        filter: `loja_id=eq.${lojaAtualRelatorios.id}`
      }, () => atualizarRelatorios())
      .subscribe();
  }

  async function iniciarRelatorios() {
    lojaAtualRelatorios = await carregarLojaDoUsuario();

    if (!lojaAtualRelatorios?.id) {
      renderizarErro();
      return;
    }

    await atualizarRelatorios();
    iniciarRealtime();
  }

  document.addEventListener("DOMContentLoaded", iniciarRelatorios);
})();
