const btnNovaCategoria = document.getElementById("btnNovaCategoria");
const formCategoria = document.getElementById("formCategoria");
const listaCategorias = document.getElementById("listaCategorias");

let lojaAtual = null;
let categoriasCache = [];

btnNovaCategoria.addEventListener("click", () => {
  formCategoria.classList.toggle("oculto");
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
  carregarCategorias();
}

async function carregarCategorias() {
  const { data, error } = await supabaseClient
    .from("categorias")
    .select("*")
    .eq("loja_id", lojaAtual)
    .order("created_at", { ascending: false });

  if (error) {
    listaCategorias.innerHTML = "<p>Erro ao carregar categorias.</p>";
    console.error(error);
    return;
  }

  categoriasCache = data || [];
  renderizarCategorias();
}

function renderizarCategorias() {
  if (!categoriasCache.length) {
    listaCategorias.innerHTML = "<p>Nenhuma categoria cadastrada ainda.</p>";
    return;
  }

  listaCategorias.innerHTML = categoriasCache.map((categoria) => `
    <div class="produto-admin-item">
      <div>
        <strong>${categoria.nome}</strong>
        <p>${categoria.descricao || ""}</p>
        <span>${categoria.ativo ? "🟢 Ativa" : "🔴 Pausada"}</span>
      </div>

      <div class="produto-acoes">
        <button onclick="alternarCategoria('${categoria.id}', ${categoria.ativo})">
          ${categoria.ativo ? "Pausar" : "Ativar"}
        </button>

        <button class="btn-excluir" onclick="excluirCategoria('${categoria.id}')">
          Excluir
        </button>
      </div>
    </div>
  `).join("");
}

formCategoria.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("categoriaNome").value.trim();
  const descricao = document.getElementById("categoriaDescricao").value.trim();

  const { error } = await supabaseClient
    .from("categorias")
    .insert({
      loja_id: lojaAtual,
      nome,
      descricao,
      ativo: true
    });

  if (error) {
    alert("Erro ao salvar categoria.");
    console.error(error);
    return;
  }

  formCategoria.reset();
  formCategoria.classList.add("oculto");
  carregarCategorias();
});

async function alternarCategoria(id, ativoAtual) {
  const { error } = await supabaseClient
    .from("categorias")
    .update({ ativo: !ativoAtual })
    .eq("id", id)
    .eq("loja_id", lojaAtual);

  if (error) {
    alert("Erro ao alterar categoria.");
    console.error(error);
    return;
  }

  carregarCategorias();
}

async function excluirCategoria(id) {
  if (!confirm("Deseja excluir esta categoria?")) return;

  const { error } = await supabaseClient
    .from("categorias")
    .delete()
    .eq("id", id)
    .eq("loja_id", lojaAtual);

  if (error) {
    alert("Erro ao excluir categoria.");
    console.error(error);
    return;
  }

  carregarCategorias();
}

carregarLoja();
