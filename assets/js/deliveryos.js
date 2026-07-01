// ============================================================
// DELIVERYOS - CORE DO PAINEL
// ------------------------------------------------------------
// Este arquivo é o bootstrap global do painel administrativo.
// A ideia é que as páginas carreguem apenas este arquivo para
// funcionalidades globais como Toast, Loading e Notificações.
//
// Regras desta versão:
// - Não altera a lógica específica das páginas.
// - Não substitui produtos-admin.js, pedidos-admin.js etc.
// - Carrega notificações globais depois que a página terminou
//   de iniciar, para evitar conflito com Produtos/Configurações.
// ============================================================

(function () {
  "use strict";

  const VERSION = "20260701-core-v1";

  if (window.DeliveryOS && window.DeliveryOS.__version === VERSION) return;

  const DeliveryOS = {
    __version: VERSION,
    scriptsCarregados: new Set(),
    pagina: (location.pathname.split("/").pop() || "admin.html").toLowerCase()
  };

  function log(...args) {
    console.log("[DeliveryOS Core]", ...args);
  }

  function obterContainerToast() {
    let container = document.getElementById("deliveryosToastContainer");

    if (!container) {
      container = document.createElement("div");
      container.id = "deliveryosToastContainer";
      container.className = "deliveryos-toast-container";
      container.setAttribute("aria-live", "polite");
      container.setAttribute("aria-atomic", "true");
      document.body.appendChild(container);
    }

    return container;
  }

  function dadosToast(tipo) {
    const mapa = {
      success: { icone: "✓", titulo: "Sucesso" },
      error: { icone: "!", titulo: "Erro" },
      warning: { icone: "!", titulo: "Atenção" },
      info: { icone: "i", titulo: "Aviso" },
      loading: { icone: "•", titulo: "Aguarde" }
    };

    return mapa[tipo] || mapa.info;
  }

  function removerToast(toast) {
    if (!toast || toast.classList.contains("saindo")) return;

    toast.classList.add("saindo");
    setTimeout(() => toast.remove(), 260);
  }

  DeliveryOS.showToast = function showToast(mensagem, tipo = "success", opcoes = {}) {
    const container = obterContainerToast();
    const dados = dadosToast(tipo);
    const duracao = Number(opcoes.duracao ?? opcoes.duration ?? 3500);
    const titulo = opcoes.titulo || dados.titulo;

    const toast = document.createElement("div");
    toast.className = `deliveryos-toast ${tipo}`;
    toast.innerHTML = `
      <div class="deliveryos-toast-icon">${dados.icone}</div>
      <div class="deliveryos-toast-content">
        <strong>${titulo}</strong>
        <span>${mensagem}</span>
      </div>
      <button type="button" class="deliveryos-toast-close" aria-label="Fechar aviso">×</button>
    `;

    toast.querySelector(".deliveryos-toast-close")?.addEventListener("click", () => removerToast(toast));
    container.appendChild(toast);

    if (duracao > 0) {
      setTimeout(() => removerToast(toast), duracao);
    }

    return toast;
  };

  DeliveryOS.setButtonLoading = function setButtonLoading(botao, carregando, textoCarregando = "Salvando...", textoFinal = null) {
    if (!botao) return;

    if (carregando) {
      if (!botao.dataset.textoOriginal) {
        botao.dataset.textoOriginal = botao.innerHTML;
      }

      botao.classList.add("salvando");
      botao.disabled = true;
      botao.innerHTML = textoCarregando;
      return;
    }

    botao.classList.remove("salvando");
    botao.disabled = false;

    if (textoFinal) {
      botao.innerHTML = textoFinal;
      setTimeout(() => {
        botao.innerHTML = botao.dataset.textoOriginal || "Salvar alterações";
      }, 1600);
      return;
    }

    botao.innerHTML = botao.dataset.textoOriginal || botao.innerHTML;
  };

  DeliveryOS.carregarScript = function carregarScript(src, id = null) {
    return new Promise((resolve, reject) => {
      if (!src) return resolve(false);

      const chave = id || src;
      if (DeliveryOS.scriptsCarregados.has(chave)) return resolve(true);

      if (id && document.getElementById(id)) {
        DeliveryOS.scriptsCarregados.add(chave);
        return resolve(true);
      }

      const script = document.createElement("script");
      script.src = src;
      if (id) script.id = id;
      script.defer = true;

      script.onload = () => {
        DeliveryOS.scriptsCarregados.add(chave);
        resolve(true);
      };

      script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
      document.body.appendChild(script);
    });
  };

  DeliveryOS.iniciarNotificacoes = async function iniciarNotificacoes() {
    // Login/cadastro/cardápio público não fazem parte do painel administrativo.
    const paginasIgnoradas = new Set(["login.html", "cadastro.html", "loja.html", "index.html", "print.html"]);
    if (paginasIgnoradas.has(DeliveryOS.pagina)) return;

    try {
      await DeliveryOS.carregarScript(
        "assets/js/deliveryos-notificacoes.js?v=20260701-core-v1",
        "deliveryos-notificacoes-script"
      );

      if (window.DeliveryOSNotificacoes?.start) {
        window.DeliveryOSNotificacoes.start();
      }
    } catch (erro) {
      console.error("[DeliveryOS Core] Erro ao iniciar notificações:", erro);
    }
  };

  DeliveryOS.init = function init() {
    window.showToast = DeliveryOS.showToast;
    window.setButtonLoading = DeliveryOS.setButtonLoading;

    // Carrega recursos globais depois que a página específica já teve tempo
    // de iniciar. Isso evita conflito com módulos como produtos-admin.js.
    const iniciar = () => {
      setTimeout(() => {
        DeliveryOS.iniciarNotificacoes();
      }, 600);
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", iniciar);
    } else {
      iniciar();
    }

    log("Core iniciado", { pagina: DeliveryOS.pagina, version: VERSION });
  };

  window.DeliveryOS = DeliveryOS;
  window.showToast = DeliveryOS.showToast;
  window.setButtonLoading = DeliveryOS.setButtonLoading;

  DeliveryOS.init();
})();
