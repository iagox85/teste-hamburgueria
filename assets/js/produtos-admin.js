const modalProduto = document.getElementById("modalProduto");
const fecharModalProduto = document.getElementById("fecharModalProduto");
const formProduto = document.getElementById("formProduto");
const listaProdutos = document.getElementById("listaProdutos");
const btnNovoProduto = document.getElementById("btnNovoProduto");
const buscarProduto = document.getElementById("buscarProduto");

let lojaAtual = null;
let produtosCache = [];

btnNovoProduto.addEventListener("click", () => {
  modalProduto.classList.remove("oculto");
});

fecharModalProduto.addEventListener("click", () => {
  modalProduto.classList.add("oculto");
});

modalProduto.addEventListener("click", (e) => {
  if (e.target === modalProduto) {
    modalProduto.classList.add("oculto");
  }
});

buscarProduto.addEventListener("input", () => {
  renderizarProdutos();
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
    console.error(error);
    listaProdutos.innerHTML = "<p>Erro ao carregar produtos.</p>";
    return;
  }

  produtosCache = data || [];
  renderizarProdutos();
}

function renderizarProdutos() {
  const termo = buscarProduto.value.toLowerCase().trim();

  const produtosFiltrados = produtosCache.filter((produto) => {
    return produto.nome.toLowerCase().includes(termo);
  });

  if (!produtosFiltrados.length) {
    listaProdutos.innerHTML = "<p>Nenhum produto encontrado.</p>";
    return;
  }

  listaProdutos.innerHTML = produtosFiltrados.map((produto) => `
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
    alert("Erro ao salvar.");
    console.error(error);
    return;
  }

  formProduto.reset();
  modalProduto.classList.add("oculto");
  carregarProdutos();
});

async function alternarDisponibilidade(id, indisponivelAtual) {
  const { error } = await supabaseClient
    .from("produtos")
    .update({ indisponivel: !indisponivelAtual })
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
  if (!confirm("Deseja excluir este produto?")) return;

  const { error } = await supabaseClient
    .from("produtos")
    .delete()
    .eq("id", id)
    .eq("loja_id", lojaAtual);

  if (error) {
    alert("Erro ao excluir.");
    console.error(error);
    return;
  }

  carregarProdutos();
}

carregarLoja();
