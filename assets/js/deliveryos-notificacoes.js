// ============================================================
// DELIVERYOS - NOTIFICAÇÕES GLOBAIS DE PEDIDOS
// ------------------------------------------------------------
// - Som sempre ativo por padrão no painel inteiro.
// - Sem botão de ativar/desativar som.
// - Funciona em Pedidos, Produtos, Configurações, Relatórios etc.
// - No celular/navegador, desbloqueia o áudio no primeiro toque/clique.
// - Ao aceitar/cancelar pedido em Pedidos, para o alerta em todas as abas.
// ============================================================

(function () {
  if (window.DeliveryOSPedidosNotifier) return;

  const CANAL_ABAS = "deliveryos_pedidos";
  const PEDIDO_RESOLVIDO_KEY = "deliveryos_pedido_notificacao_resolvida";
  const AUDIO_DESBLOQUEADO_KEY = "deliveryos_audio_pedidos_desbloqueado";
  const ULTIMO_PEDIDO_NOTIFICADO_KEY = "deliveryos_ultimo_pedido_notificado";

  let canalPedidosGlobal = null;
  let lojaIdAtual = null;
  let intervaloSom = null;
  let intervaloTitulo = null;
  let tituloOriginal = document.title;
  let ultimoPedidoNotificado = null;
  let audioContext = null;
  let audioDesbloqueado = false;
  let broadcastChannel = null;
  let pedidoAtualNotificando = null;
  let pedidoAtualDados = null;

  function normalizarTexto(valor) {
    return String(valor || "").trim();
  }

  function somSempreAtivo() {
    return true;
  }

  function obterPedidoResolvidoSalvo() {
    try {
      const bruto = localStorage.getItem(PEDIDO_RESOLVIDO_KEY);
      return bruto ? JSON.parse(bruto) : null;
    } catch (error) {
      return null;
    }
  }

  function pedidoFoiResolvidoOuSilenciado(pedidoId) {
    const resolvido = obterPedidoResolvidoSalvo();
    return Boolean(resolvido?.pedido_id && pedidoId && String(resolvido.pedido_id) === String(pedidoId));
  }

  function marcarAudioDesbloqueado() {
    audioDesbloqueado = true;
    try {
      localStorage.setItem(AUDIO_DESBLOQUEADO_KEY, "sim");
    } catch (error) {
      // ignora
    }
    ocultarAvisoAudio();
  }

  function audioJaFoiDesbloqueado() {
    try {
      return localStorage.getItem(AUDIO_DESBLOQUEADO_KEY) === "sim";
    } catch (error) {
      return false;
    }
  }

  function obterAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    return audioContext;
  }

  function mostrarAvisoAudio() {
    if (!somSempreAtivo()) return;
    if (audioDesbloqueado) return;
    if (document.getElementById("deliveryosAvisoAudioPedidos")) return;

    const aviso = document.createElement("div");
    aviso.id = "deliveryosAvisoAudioPedidos";
    aviso.className = "deliveryos-audio-pedidos-aviso";
    aviso.innerHTML = `
      <span>🔔</span>
      <div>
        <strong>Alertas de pedidos ativos</strong>
        <small>Toque ou clique na tela para liberar o som neste dispositivo.</small>
      </div>
    `;
    document.body.appendChild(aviso);
  }

  function ocultarAvisoAudio() {
    const aviso = document.getElementById("deliveryosAvisoAudioPedidos");
    if (aviso) aviso.remove();
  }

  async function tentarDesbloquearAudio() {
    if (!somSempreAtivo()) return false;

    try {
      const ctx = obterAudioContext();
      if (!ctx) return false;

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const oscilador = ctx.createOscillator();
      const ganho = ctx.createGain();

      ganho.gain.setValueAtTime(0.0001, ctx.currentTime);
      oscilador.connect(ganho);
      ganho.connect(ctx.destination);
      oscilador.start();
      oscilador.stop(ctx.currentTime + 0.02);

      marcarAudioDesbloqueado();
      return true;
    } catch (error) {
      mostrarAvisoAudio();
      return false;
    }
  }

  async function tocarSomPedido() {
    if (!somSempreAtivo()) return false;

    try {
      const ctx = obterAudioContext();
      if (!ctx) return false;

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      if (ctx.state !== "running") {
        mostrarAvisoAudio();
        return false;
      }

      const agora = ctx.currentTime;

      function nota(frequencia, inicio, duracao, volume) {
        const oscilador = ctx.createOscillator();
        const ganho = ctx.createGain();

        oscilador.type = "sine";
        oscilador.frequency.setValueAtTime(frequencia, agora + inicio);

        ganho.gain.setValueAtTime(0.001, agora + inicio);
        ganho.gain.exponentialRampToValueAtTime(volume, agora + inicio + 0.03);
        ganho.gain.exponentialRampToValueAtTime(0.001, agora + inicio + duracao);

        oscilador.connect(ganho);
        ganho.connect(ctx.destination);

        oscilador.start(agora + inicio);
        oscilador.stop(agora + inicio + duracao);
      }

      nota(784, 0.00, 0.28, 0.25);
      nota(1046, 0.18, 0.34, 0.27);
      nota(784, 0.58, 0.28, 0.23);
      nota(1046, 0.76, 0.38, 0.25);

      marcarAudioDesbloqueado();
      return true;
    } catch (error) {
      console.warn("DeliveryOS: o navegador bloqueou o áudio até uma interação do usuário.", error);
      mostrarAvisoAudio();
      return false;
    }
  }

  async function iniciarSomContinuo() {
    if (!somSempreAtivo()) return;

    pararSomContinuo();

    const tocou = await tocarSomPedido();
    if (!tocou) mostrarAvisoAudio();

    intervaloSom = setInterval(() => {
      tocarSomPedido();
    }, 2200);
  }

  function pararSomContinuo() {
    if (intervaloSom) {
      clearInterval(intervaloSom);
      intervaloSom = null;
    }
  }

  function formatarMoeda(valor) {
    const numero = Number(valor || 0);
    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function obterNomeCliente(pedido) {
    return (
      normalizarTexto(pedido?.cliente_nome) ||
      normalizarTexto(pedido?.nome_cliente) ||
      normalizarTexto(pedido?.nome) ||
      "Cliente"
    );
  }

  function obterTotalPedido(pedido) {
    return pedido?.total ?? pedido?.valor_total ?? pedido?.total_pedido ?? 0;
  }

  function iniciarPiscarTitulo() {
    pararPiscarTitulo();
    let alternar = false;

    intervaloTitulo = setInterval(() => {
      alternar = !alternar;
      document.title = alternar ? "🔔 Novo pedido!" : tituloOriginal;
    }, 900);
  }

  function pararPiscarTitulo() {
    if (intervaloTitulo) {
      clearInterval(intervaloTitulo);
      intervaloTitulo = null;
    }

    document.title = tituloOriginal;
  }

  function criarAlertaVisual() {
    let alerta = document.getElementById("deliveryosPedidoGlobalAlert");

    if (!alerta) {
      alerta = document.createElement("div");
      alerta.id = "deliveryosPedidoGlobalAlert";
      alerta.className = "deliveryos-pedido-global-alert oculto";
      alerta.innerHTML = `
        <div class="deliveryos-pedido-global-icon">🔔</div>
        <div class="deliveryos-pedido-global-content">
          <strong>Novo pedido recebido</strong>
          <span id="deliveryosPedidoGlobalTexto">Abra a tela de pedidos para aceitar.</span>
        </div>
        <div class="deliveryos-pedido-global-actions">
          <button type="button" id="deliveryosBtnVerPedidoGlobal">Ver pedidos</button>
          <button type="button" id="deliveryosBtnSilenciarPedidoGlobal">Silenciar</button>
        </div>
      `;
      document.body.appendChild(alerta);

      alerta.querySelector("#deliveryosBtnVerPedidoGlobal")?.addEventListener("click", () => {
        pararNotificacaoGlobal(true, pedidoAtualNotificando);
        window.location.href = "pedidos.html";
      });

      alerta.querySelector("#deliveryosBtnSilenciarPedidoGlobal")?.addEventListener("click", () => {
        pararNotificacaoGlobal(true, pedidoAtualNotificando);
      });
    }

    return alerta;
  }

  function mostrarAlertaVisual(pedido) {
    const alerta = criarAlertaVisual();
    const texto = alerta.querySelector("#deliveryosPedidoGlobalTexto");
    const cliente = obterNomeCliente(pedido);
    const total = obterTotalPedido(pedido);

    if (texto) {
      texto.textContent = `${cliente} • ${formatarMoeda(total)} • clique em Ver pedidos para aceitar.`;
    }

    alerta.classList.remove("oculto");
  }

  function ocultarAlertaVisual() {
    const alerta = document.getElementById("deliveryosPedidoGlobalAlert");
    if (alerta) alerta.classList.add("oculto");
  }

  function mostrarToastPedido(pedido) {
    const cliente = obterNomeCliente(pedido);
    const total = obterTotalPedido(pedido);

    if (typeof window.showToast === "function") {
      window.showToast(`${cliente} • ${formatarMoeda(total)}. Abra Pedidos para aceitar.`, "warning", {
        titulo: "Novo pedido recebido",
        duracao: 9000
      });
    }
  }

  function publicarPedidoResolvido(pedidoId = null) {
    const payload = {
      tipo: "pedido_resolvido",
      pedido_id: pedidoId,
      origem: (window.location.pathname || "painel").split("/").pop() || "painel",
      timestamp: Date.now()
    };

    try {
      localStorage.setItem(PEDIDO_RESOLVIDO_KEY, JSON.stringify(payload));
    } catch (error) {
      // ignora
    }

    try {
      if (broadcastChannel) broadcastChannel.postMessage(payload);
    } catch (error) {
      // ignora
    }
  }

  function pararNotificacaoGlobal(publicar = false, pedidoId = null) {
    pararSomContinuo();
    pararPiscarTitulo();
    ocultarAlertaVisual();
    pedidoAtualNotificando = null;
    pedidoAtualDados = null;

    if (publicar) publicarPedidoResolvido(pedidoId);
  }

  function statusAindaNovo(status) {
    const valor = normalizarTexto(status).toLowerCase();
    return valor === "novo" || valor === "novo_pedido" || valor === "pendente" || valor === "recebido" || valor === "";
  }

  function salvarUltimoPedidoNotificado(pedidoId) {
    try {
      localStorage.setItem(ULTIMO_PEDIDO_NOTIFICADO_KEY, String(pedidoId || ""));
    } catch (error) {
      // ignora
    }
  }

  function notificarNovoPedido(pedido, origem = "realtime") {
    if (!pedido?.id) return;
    if (!statusAindaNovo(pedido.status)) return;
    if (pedidoFoiResolvidoOuSilenciado(pedido.id)) return;
    if (pedido.id === ultimoPedidoNotificado && pedidoAtualNotificando === pedido.id) return;

    ultimoPedidoNotificado = pedido.id;
    pedidoAtualNotificando = pedido.id;
    pedidoAtualDados = pedido;
    salvarUltimoPedidoNotificado(pedido.id);

    mostrarToastPedido(pedido);
    mostrarAlertaVisual(pedido);
    iniciarPiscarTitulo();
    iniciarSomContinuo();

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("Novo pedido recebido", {
          body: `${obterNomeCliente(pedido)} • ${formatarMoeda(obterTotalPedido(pedido))}`,
          tag: `deliveryos-pedido-${pedido.id}`
        });
      } catch (error) {
        // ignora
      }
    }

    if (origem === "inicial" && !audioDesbloqueado) {
      mostrarAvisoAudio();
    }
  }

  async function carregarLojaDoUsuario() {
    if (!window.supabaseClient) return null;

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

    lojaIdAtual = vinculo.loja_id;
    return lojaIdAtual;
  }

  async function verificarPedidoPendenteInicial() {
    if (!lojaIdAtual || !window.supabaseClient) return;

    const { data, error } = await supabaseClient
      .from("pedidos")
      .select("*")
      .eq("loja_id", lojaIdAtual)
      .eq("status", "novo")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !Array.isArray(data) || !data.length) return;

    const pedido = data[0];
    if (!pedido?.id) return;
    notificarNovoPedido(pedido, "inicial");
  }

  async function iniciarRealtimeGlobal() {
    const lojaId = await carregarLojaDoUsuario();
    if (!lojaId || !window.supabaseClient) return;

    if (canalPedidosGlobal) {
      supabaseClient.removeChannel(canalPedidosGlobal);
    }

    canalPedidosGlobal = supabaseClient
      .channel(`deliveryos-pedidos-global-${lojaId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos",
          filter: `loja_id=eq.${lojaId}`
        },
        (payload) => {
          const pedidoNovo = payload.new;
          const pedidoAntigo = payload.old;

          if (payload.eventType === "INSERT") {
            if (!pedidoNovo || pedidoNovo.loja_id !== lojaIdAtual) return;
            notificarNovoPedido(pedidoNovo, "realtime");
            return;
          }

          if (payload.eventType === "UPDATE") {
            if (!pedidoNovo || pedidoNovo.loja_id !== lojaIdAtual) return;
            if (pedidoAtualNotificando && pedidoNovo.id === pedidoAtualNotificando && !statusAindaNovo(pedidoNovo.status)) {
              pararNotificacaoGlobal(true, pedidoNovo.id);
            }
            return;
          }

          if (payload.eventType === "DELETE") {
            if (pedidoAtualNotificando && pedidoAntigo?.id === pedidoAtualNotificando) {
              pararNotificacaoGlobal(true, pedidoAntigo.id);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("DeliveryOS notificações globais de pedidos:", status);
      });

    verificarPedidoPendenteInicial();
  }

  function pedirPermissaoNotificacaoDepoisDeInteracao() {
    tentarDesbloquearAudio();

    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;

    const jaPerguntou = localStorage.getItem("deliveryos_notificacao_browser_perguntou");
    if (jaPerguntou === "sim") return;

    localStorage.setItem("deliveryos_notificacao_browser_perguntou", "sim");
    Notification.requestPermission().catch(() => {});
  }

  function configurarEventosGlobais() {
    ["pointerdown", "keydown", "touchstart", "click"].forEach((evento) => {
      window.addEventListener(evento, pedirPermissaoNotificacaoDepoisDeInteracao, { passive: true });
    });

    window.addEventListener("storage", (event) => {
      if (event.key === PEDIDO_RESOLVIDO_KEY) {
        pararNotificacaoGlobal(false);
      }
    });

    window.addEventListener("visibilitychange", () => {
      if (!document.hidden && pedidoAtualDados && pedidoAtualNotificando) {
        tocarSomPedido();
      }
    });
  }

  function configurarBroadcast() {
    try {
      broadcastChannel = new BroadcastChannel(CANAL_ABAS);
      broadcastChannel.onmessage = (event) => {
        if (event?.data?.tipo === "pedido_resolvido") {
          pararNotificacaoGlobal(false);
        }
      };
    } catch (error) {
      broadcastChannel = null;
    }
  }

  window.DeliveryOSPedidosNotifier = {
    iniciar: iniciarRealtimeGlobal,
    parar: pararNotificacaoGlobal,
    publicarPedidoResolvido,
    notificarNovoPedido,
    desbloquearAudio: tentarDesbloquearAudio
  };

  document.addEventListener("DOMContentLoaded", () => {
    audioDesbloqueado = audioJaFoiDesbloqueado();
    configurarBroadcast();
    configurarEventosGlobais();
    iniciarRealtimeGlobal();

    setTimeout(() => {
      if (!audioDesbloqueado) mostrarAvisoAudio();
    }, 900);
  });
})();
