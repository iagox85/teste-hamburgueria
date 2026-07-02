// ============================================================
// PRINT / COMANDA - DELIVERYOS
// Visualização manual otimizada para impressoras térmicas 80mm e 58mm.
// Preferência do formato é salva automaticamente por loja.
// ============================================================

const printStatus = document.getElementById("printStatus");
const printApp = document.getElementById("printApp");
const printComanda = document.getElementById("printComanda");
const printActions = document.getElementById("printActions");
const printToolbar = document.getElementById("printToolbar");
const printReady = document.getElementById("printReady");
const printReadyFormato = document.getElementById("printReadyFormato");
const previewFormato = document.getElementById("previewFormato");
const previewTitulo = document.getElementById("previewTitulo");
const btnImprimir = document.getElementById("btnImprimir");
const btnFechar = document.getElementById("btnFechar");
const btnReimprimir = document.getElementById("btnReimprimir");

let pedidoAtual = null;
let lojaAtualPrint = null;
let printSizeAtual = localStorage.getItem("deliveryos_print_size") || "80mm";
if (!["58mm", "80mm"].includes(printSizeAtual)) printSizeAtual = "80mm";

function chavePreferenciaLoja(lojaId) {
  return lojaId ? `deliveryos_print_size_loja_${lojaId}` : "deliveryos_print_size";
}

function normalizarPrintSize(valor) {
  return ["58mm", "80mm"].includes(valor) ? valor : "80mm";
}

function lerPreferenciaImpressao(lojaId) {
  const chaveLoja = chavePreferenciaLoja(lojaId);
  return normalizarPrintSize(
    localStorage.getItem(chaveLoja) ||
    localStorage.getItem("deliveryos_print_size") ||
    "80mm"
  );
}

function salvarPreferenciaImpressao(novoFormato) {
  printSizeAtual = normalizarPrintSize(novoFormato);
  localStorage.setItem("deliveryos_print_size", printSizeAtual);

  const lojaId = pedidoAtual?.loja_id || lojaAtualPrint?.id;
  if (lojaId) {
    localStorage.setItem(chavePreferenciaLoja(lojaId), printSizeAtual);
    salvarPreferenciaLojaNoSupabase(lojaId, printSizeAtual);
  }
}

async function salvarPreferenciaLojaNoSupabase(lojaId, formato) {
  if (!lojaId || !window.supabaseClient) return;

  try {
    const { error } = await supabaseClient
      .from("lojas")
      .update({ formato_impressao: formato })
      .eq("id", lojaId);

    if (error) {
      // Se a coluna ainda não existir no banco, a preferência local continua funcionando.
      console.info("Preferência de impressão salva localmente. Para salvar no banco, crie a coluna lojas.formato_impressao.", error.message || error);
    }
  } catch (error) {
    console.info("Preferência de impressão salva localmente.", error);
  }
}

function escaparHTML(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function pedidoEhRetirada(pedido) {
  return pedido.tipo_recebimento === "retirada" || pedido.tipo_entrega === "retirada";
}

function formatarDocumento(documento) {
  const numeros = String(documento || "").replace(/\D/g, "");
  if (numeros.length === 14) {
    return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  if (numeros.length === 11) {
    return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return documento || "";
}

function formatarPagamento(pedido) {
  const pagamento = String(pedido.pagamento || "").toLowerCase();
  if (pagamento === "pix") return "PIX";
  if (pagamento === "dinheiro") {
    return pedido.troco_para ? `Dinheiro - troco para ${formatarMoeda(pedido.troco_para)}` : "Dinheiro";
  }
  if (pagamento === "cartao_entrega") return "Cartão na entrega";
  if (pagamento === "outro") return "Combinar";
  return pedido.pagamento || "Não informado";
}

function obterItens(pedido) {
  if (Array.isArray(pedido.itens)) return pedido.itens;
  try {
    const parsed = JSON.parse(pedido.itens || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function obterEndereco(pedido) {
  if (!pedido.endereco) return null;
  if (typeof pedido.endereco === "object") return pedido.endereco;
  try {
    return JSON.parse(pedido.endereco);
  } catch (error) {
    return null;
  }
}

function linha(label, valor) {
  if (valor === null || valor === undefined || valor === "") return "";
  return `
    <p class="linha">
      <span>${escaparHTML(label)}</span>
      <strong>${escaparHTML(valor)}</strong>
    </p>
  `;
}

function montarEnderecoHTML(pedido) {
  const endereco = obterEndereco(pedido);

  if (pedidoEhRetirada(pedido)) {
    return `<p><strong>Cliente vai retirar no balcão.</strong></p>`;
  }

  if (!endereco) {
    return `<p><strong>Endereço não informado.</strong></p>`;
  }

  return `
    ${linha("Rua", endereco.rua)}
    ${linha("Número", endereco.numero)}
    ${linha("Bairro", endereco.bairro)}
    ${linha("Cidade", endereco.cidade)}
    ${linha("Complemento", endereco.complemento)}
    ${linha("Referência", endereco.referencia)}
  `;
}

function montarItensHTML(pedido) {
  const itens = obterItens(pedido);
  if (!itens.length) return `<p>Nenhum item registrado.</p>`;

  return itens.map((item) => {
    const adicionais = Array.isArray(item.adicionais) ? item.adicionais : [];
    const quantidade = Number(item.quantidade || item.qtd || 1);
    const nome = item.nome || item.produto_nome || "Produto";
    const precoItem = item.total ?? item.preco_total ?? item.preco ?? item.valor;

    return `
      <div class="item">
        <div class="item-nome">
          <span>${quantidade}x ${escaparHTML(nome)}</span>
          ${precoItem !== undefined ? `<span>${formatarMoeda(precoItem)}</span>` : ""}
        </div>

        ${adicionais.map((adicional) => {
          const nomeAdicional = adicional.nome || adicional.titulo || "Adicional";
          const precoAdicional = adicional.preco ?? adicional.valor;
          return `<span class="item-detalhe">+ ${escaparHTML(nomeAdicional)}${precoAdicional !== undefined ? ` - ${formatarMoeda(precoAdicional)}` : ""}</span>`;
        }).join("")}

        ${item.observacao ? `<span class="item-detalhe obs-item"><strong>Obs:</strong> ${escaparHTML(item.observacao)}</span>` : ""}
      </div>
    `;
  }).join("");
}

function numeroPedido(pedido) {
  if (pedido.numero_pedido) return pedido.numero_pedido;
  if (pedido.codigo) return pedido.codigo;
  return String(pedido.id || "").slice(0, 8).toUpperCase();
}

function montarComanda(pedido, loja) {
  const nomeLoja = loja?.nome || loja?.nome_loja || "DeliveryOS";
  const documentoLoja = formatarDocumento(loja?.cnpj || loja?.documento || loja?.cpf_cnpj || "");
  const telefoneLoja = loja?.whatsapp || loja?.telefone || "";
  const retirada = pedidoEhRetirada(pedido);
  const numero = numeroPedido(pedido);

  if (previewTitulo) previewTitulo.textContent = `Comanda do pedido #${numero}`;

  printComanda.innerHTML = `
    <article class="comanda">
      <header class="comanda-topo">
        <h1 class="comanda-loja">${escaparHTML(nomeLoja)}</h1>
        ${documentoLoja ? `<p class="comanda-subtitulo">CNPJ: ${escaparHTML(documentoLoja)}</p>` : telefoneLoja ? `<p class="comanda-subtitulo">${escaparHTML(telefoneLoja)}</p>` : ""}
        <p class="comanda-numero">PEDIDO #${escaparHTML(numero)}</p>
      </header>

      <section class="comanda-bloco">
        <h2>Pedido</h2>
        ${linha("Data", formatarData(pedido.created_at))}
        ${linha("Tipo", retirada ? "Retirada no balcão" : "Entrega")}
        ${linha("Pagamento", formatarPagamento(pedido))}
      </section>

      <section class="comanda-bloco">
        <h2>Cliente</h2>
        ${linha("Nome", pedido.cliente_nome || "Não informado")}
        ${linha("WhatsApp", pedido.cliente_whatsapp || pedido.cliente_telefone || "Não informado")}
      </section>

      <section class="comanda-bloco">
        <h2>${retirada ? "Retirada" : "Endereço"}</h2>
        ${montarEnderecoHTML(pedido)}
      </section>

      <section class="comanda-bloco">
        <h2>Itens</h2>
        ${montarItensHTML(pedido)}
      </section>

      ${pedido.observacao ? `
        <section class="comanda-bloco">
          <h2>Observação geral</h2>
          <p class="obs-destaque">${escaparHTML(pedido.observacao)}</p>
        </section>
      ` : ""}

      <section class="comanda-bloco">
        <h2>Resumo</h2>
        ${linha("Subtotal", formatarMoeda(pedido.subtotal))}
        ${linha("Entrega", Number(pedido.taxa_entrega || 0) > 0 ? formatarMoeda(pedido.taxa_entrega) : retirada ? "Retirada" : "A combinar")}
        <p class="linha total-final">
          <span>Total</span>
          <strong>${formatarMoeda(pedido.total)}</strong>
        </p>
      </section>

      <footer class="comanda-rodape">
        <p>Obrigado pela preferência</p>
        <p>Impresso pelo DeliveryOS</p>
      </footer>
    </article>
  `;
}

function aplicarPreferenciasImpressao() {
  document.body.classList.remove("print-58mm", "print-80mm");
  document.body.classList.add(`print-${printSizeAtual}`);

  const formatoLabel = printSizeAtual === "58mm" ? "Térmica 58 mm" : "Térmica 80 mm";
  if (printReadyFormato) printReadyFormato.textContent = formatoLabel;
  if (previewFormato) previewFormato.textContent = printSizeAtual === "58mm" ? "58 mm" : "80 mm";

  document.querySelectorAll("[data-print-size]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.printSize === printSizeAtual);
  });
}

function instalarPreferenciasImpressao() {
  document.querySelectorAll("[data-print-size]").forEach((btn) => {
    btn.addEventListener("click", () => {
      salvarPreferenciaImpressao(btn.dataset.printSize || "80mm");
      aplicarPreferenciasImpressao();
    });
  });
}

function mostrarErro(titulo, mensagem) {
  printStatus.classList.remove("oculto");
  printApp?.classList.add("oculto");
  printStatus.innerHTML = `
    <h1>${escaparHTML(titulo)}</h1>
    <p>${escaparHTML(mensagem)}</p>
  `;
}

async function carregarPedido() {
  aplicarPreferenciasImpressao();
  const params = new URLSearchParams(window.location.search);
  const pedidoId = params.get("id") || params.get("pedido") || params.get("pedido_id");
  const tamanhoUrl = params.get("size") || params.get("papel");

  if (["58mm", "80mm"].includes(tamanhoUrl)) {
    salvarPreferenciaImpressao(tamanhoUrl);
  }

  aplicarPreferenciasImpressao();

  if (!pedidoId) {
    mostrarErro("Pedido não informado", "Abra a comanda pelo botão Visualizar comanda dentro da tela de pedidos.");
    return;
  }

  const { data: pedido, error: erroPedido } = await supabaseClient
    .from("pedidos")
    .select("*")
    .eq("id", pedidoId)
    .single();

  if (erroPedido || !pedido) {
    console.error("Erro ao carregar pedido:", erroPedido);
    mostrarErro("Pedido não encontrado", "Não foi possível localizar este pedido no Supabase.");
    return;
  }

  pedidoAtual = pedido;
  let loja = null;

  if (pedido.loja_id) {
    const { data: lojaData, error: erroLoja } = await supabaseClient
      .from("lojas")
      .select("*")
      .eq("id", pedido.loja_id)
      .maybeSingle();

    if (!erroLoja) loja = lojaData;
  }

  lojaAtualPrint = loja;

  const formatoSalvoNoBanco = loja?.formato_impressao || loja?.impressao_formato || loja?.formato_comanda;
  printSizeAtual = normalizarPrintSize(formatoSalvoNoBanco || lerPreferenciaImpressao(pedido.loja_id));
  aplicarPreferenciasImpressao();

  montarComanda(pedido, loja);

  document.title = `Comanda #${numeroPedido(pedido)} - DeliveryOS`;
  printStatus.classList.add("oculto");
  printApp?.classList.remove("oculto");
}

function imprimirComanda() {
  window.print();
  btnReimprimir?.classList.remove("oculto");
}

function fecharComanda() {
  if (window.opener) {
    window.close();
    return;
  }

  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  window.location.href = "pedidos.html";
}

btnImprimir?.addEventListener("click", imprimirComanda);
btnReimprimir?.addEventListener("click", imprimirComanda);
btnFechar?.addEventListener("click", fecharComanda);

document.addEventListener("DOMContentLoaded", () => {
  instalarPreferenciasImpressao();
  carregarPedido();
});
