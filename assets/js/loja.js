const nomeLoja = document.getElementById("nomeLoja");
const descricaoLoja = document.getElementById("descricaoLoja");
const tempoEntrega = document.getElementById("tempoEntrega");
const categoriasLoja = document.getElementById("categoriasLoja");
const produtosLoja = document.getElementById("produtosLoja");

let lojaAtual = null;
let categoriasCache = [];
let produtosCache = [];
let categoriaSelecionada = "todas";

async function carregarLoja() {
  const { data, error } = await supabaseClient
    .from("lojas")
    .select("*")
    .limit(1)
    .single();

  if (error) {
    console.error(error);
    nomeLoja.innerText = "Erro ao carregar loja";
    return;
  }

  lojaAtual = data;

  nomeLoja.innerText = data.nome || "Minha Loja";
  descricaoLoja.innerText = data.descricao || "";
  tempoEntrega.innerText = `${data.tempo_entrega_min || 30} min`;

  await carregarCategorias();
  await carregarProdutos();
}

async function carregarCategorias() {
  const { data, error } = await supabaseClient
    .from("categorias")
    .select("*")
    .eq("loja_id", lojaAtual.id)
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  categoriasCache = data || [];

  categoriasLoja.innerHTML = `
    <button class="active" onclick="selecionarCategoria('todas', this)">
      Todos
    </button>
  `;

  categoriasCache.forEach((categoria) => {
    categoriasLoja.innerHTML += `
      <button onclick="selecionarCategoria('${categoria.id}', this)">
        ${categoria.nome}
      </button>
    `;
  });
}

async function carregarProdutos() {
  const { data, error } = await supabaseClient
    .from("produtos")
    .select("*")
    .eq("loja_id", lojaAtual.id)
    .eq("ativo", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    produtosLoja.innerHTML = "<p>Erro ao carregar produtos.</p>";
    return;
  }

  produtosCache = data || [];
  renderizarProdutos();
}

function selecionarCategoria(categoriaId, botao) {
  categoriaSelecionada = categoriaId;

  document.querySelectorAll(".categorias-loja button").forEach((btn) => {
    btn.classList.remove("active");
  });

  botao.classList.add("active");

  renderizarProdutos();
}

function renderizarProdutos() {
  let produtos = produtosCache;

  if (categoriaSelecionada !== "todas") {
    produtos = produtos.filter((produto) => produto.categoria_id === categoriaSelecionada);
  }

  if (!produtos.length) {
    produtosLoja.innerHTML = "<p>Nenhum produto encontrado.</p>";
    return;
  }

  produtosLoja.innerHTML = produtos.map((produto) => {
    const indisponivel = produto.indisponivel;

    return `
      <div class="produto-card ${indisponivel ? "produto-indisponivel" : ""}">
        <h3>${produto.nome}</h3>
        <p>${produto.descricao || ""}</p>
        <strong>R$ ${Number(produto.preco).toFixed(2)}</strong>

        <button ${indisponivel ? "disabled" : ""}>
          ${indisponivel ? "Indisponível" : "Adicionar"}
        </button>
      </div>
    `;
  }).join("");
}

carregarLoja();
