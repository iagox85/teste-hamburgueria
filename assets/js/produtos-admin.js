const formProduto = document.getElementById("formProduto");
const listaProdutos = document.getElementById("listaProdutos");
const btnNovoProduto = document.getElementById("btnNovoProduto");

let lojaAtual = null;

btnNovoProduto.addEventListener("click", () => {
  formProduto.classList.toggle("oculto");
});

async function carregarLoja() {
  const {
    data: { user }
  } = await supabaseClient.auth.getUser();

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const { data, error } = await supabaseClient
    .from("usuarios_loja")
    .select("loja_id")
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    alert("Usuário sem loja vinculada.");
    console.error(error);
    return;
  }

  lojaAtual = data.loja_id;
  carregarProdutos();
}

async function carregarProdutos() {
  const { data, error } = await supabaseClient
    .from("produtos")
    .select("*")
    .eq("loja_id", lojaAtual)
    .order("created_at", { ascending: false });

  if (error) {
    listaProdutos.innerHTML = "<p>Erro ao carregar produtos.</p>";
    console.error(error);
    return;
  }

  if (!data.length) {
    listaProdutos.innerHTML = "<p>Nenhum produto cadastrado ainda.</p>";
    return;
  }

  listaProdutos.innerHTML = data.map((produto) => `
    <div class="produto-admin-item">
      <div>
        <strong>${produto.nome}</strong>
        <p>${produto.descricao || ""}</p>
        <span>R$ ${Number(produto.preco).toFixed(2)}</span>
      </div>

      <div class="produto-acoes">
        <span>${produto.indisponivel ? "🔴 Indisponível" : "🟢 Disponível"}</span>

        <button onclick="alternarDisponibilidade('${produto.id}', ${produto.indisponivel})">
          ${produto.indisponivel ? "Ativar" : "Pausar"}
        </button>

        <button class="btn-excluir" onclick="excluirProduto('${produto.id}')">
          Excluir
        </button>
      </div>
    </div>
  `).join("");
}

formProduto.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("produtoNome").value.trim();
  const descricao = document.getElementById("produtoDescricao").value.trim();
  const preco = Number(document.getElementById("produtoPreco").value);

  const { error } = await supabaseClient
    .from("produtos")
    .insert({
      loja_id: lojaAtual,
      nome,
      descricao,
      preco,
      ativo: true,
      indisponivel: false
    });

  if (error) {
    alert("Erro ao salvar produto.");
    console.error(error);
    return;
  }

  formProduto.reset();
  formProduto.classList.add("oculto");
  carregarProdutos();
});

async function alternarDisponibilidade(id, indisponivelAtual) {
  const { error } = await supabaseClient
    .from("produtos")
    .update({
      indisponivel: !indisponivelAtual
    })
    .eq("id", id)
    .eq("loja_id", lojaAtual);

  if (error) {
    alert("Erro ao alterar disponibilidade.");
    console.error(error);
    return;
  }

  carregarProdutos();
}

async function excluirProduto(id) {
  const confirmar = confirm("Tem certeza que deseja excluir este produto?");

  if (!confirmar) return;

  const { error } = await supabaseClient
    .from("produtos")
    .delete()
    .eq("id", id)
    .eq("loja_id", lojaAtual);

  if (error) {
    alert("Erro ao excluir produto.");
    console.error(error);
    return;
  }

  carregarProdutos();
}

carregarLoja();
