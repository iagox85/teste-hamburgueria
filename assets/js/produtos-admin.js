const formProduto = document.getElementById("formProduto");
const listaProdutos = document.getElementById("listaProdutos");

const LOJA_ID = null; // vamos ligar isso automaticamente depois

formProduto.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("produtoNome").value.trim();
  const descricao = document.getElementById("produtoDescricao").value.trim();
  const preco = Number(document.getElementById("produtoPreco").value);

  alert("Próximo passo: antes de salvar produto, precisamos criar a primeira loja no banco.");
});
