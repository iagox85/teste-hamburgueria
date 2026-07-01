// ============================================================
// DELIVERYOS - LOADER DE NOTIFICAÇÕES
// ------------------------------------------------------------
// Este arquivo não contém a regra de notificações.
// Ele apenas carrega o serviço atual deliveryos-notificacoes.js
// pelo core global, sem tocar nos HTMLs das páginas.
// ============================================================

(function () {
  "use strict";

  if (window.DeliveryOSNotificationsLoader) return;

  let iniciado = false;

  const paginasIgnoradas = new Set(["login.html", "cadastro.html", "loja.html", "index.html", "print.html"]);

  async function start() {
    if (iniciado) return;
    iniciado = true;

    const pagina = window.DeliveryOS?.pagina || (location.pathname.split("/").pop() || "admin.html").toLowerCase();
    if (paginasIgnoradas.has(pagina)) return;

    try {
      await window.DeliveryOS?.carregarScript?.(
        "assets/js/deliveryos-notificacoes.js?v=20260701core2",
        "deliveryos-notificacoes-script"
      );

      if (window.DeliveryOSNotificacoes?.start) {
        window.DeliveryOSNotificacoes.start();
      }
    } catch (erro) {
      console.error("[DeliveryOS Notifications Loader] Erro ao carregar notificações:", erro);
    }
  }

  const Loader = { start };

  window.DeliveryOSNotificationsLoader = Loader;
  window.DeliveryOS?.registrarModulo?.("notificationsLoader", Loader);
})();
