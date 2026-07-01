async function protegerAdmin() {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
    return;
  }
}

protegerAdmin();

async function sairDoSistema() {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}

// Usa clique delegado para funcionar tanto em páginas com botão fixo
// quanto em páginas onde o botão "Sair" é criado depois pela topbar.
document.addEventListener("click", async (evento) => {
  const botaoSair = evento.target.closest("#sair");

  if (!botaoSair) return;

  evento.preventDefault();
  await sairDoSistema();
});
