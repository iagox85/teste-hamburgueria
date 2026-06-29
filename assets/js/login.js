const formLogin = document.getElementById("formLogin");
const mensagemLogin = document.getElementById("mensagemLogin");

formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();

  mensagemLogin.innerText = "Entrando...";

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: senha
  });

  if (error) {
    mensagemLogin.innerText = "E-mail ou senha inválidos.";
    return;
  }

  mensagemLogin.innerText = "Login realizado com sucesso!";
  window.location.href = "admin.html";
});
