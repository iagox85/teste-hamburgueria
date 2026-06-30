const btnNovoGrupo = document.getElementById("btnNovoGrupo");
const formGrupo = document.getElementById("formGrupo");
const listaGrupos = document.getElementById("listaGrupos");

let lojaAtual = null;
let gruposCache = [];
let grupoEditandoId = null;

btnNovoGrupo.addEventListener("click", () => {
    grupoEditandoId = null;
    formGrupo.reset();
    formGrupo.classList.toggle("oculto");
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

    carregarGrupos();
}

async function carregarGrupos() {

    const { data, error } = await supabaseClient
        .from("grupos_adicionais")
        .select("*")
        .eq("loja_id", lojaAtual)
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        listaGrupos.innerHTML = "<p>Erro ao carregar grupos.</p>";
        return;
    }

    gruposCache = data || [];

    renderizarGrupos();
}

function renderizarGrupos() {

    if (!gruposCache.length) {
        listaGrupos.innerHTML = "<p>Nenhum grupo cadastrado.</p>";
        return;
    }

    listaGrupos.innerHTML = gruposCache.map(grupo => `

        <div class="produto-admin-item">

            <div>

                <strong>${grupo.nome}</strong>

                <p>${grupo.descricao || ""}</p>

                <small>
                    Mínimo: ${grupo.minimo}
                    |
                    Máximo: ${grupo.maximo}
                </small>

            </div>

            <div class="produto-acoes">

                <span>
                    ${grupo.ativo ? "🟢 Ativo" : "🔴 Pausado"}
                </span>

                <button onclick="editarGrupo('${grupo.id}')">
                    Editar
                </button>

                <button onclick="alternarGrupo('${grupo.id}', ${grupo.ativo})">
                    ${grupo.ativo ? "Pausar" : "Ativar"}
                </button>

                <button
                    class="btn-excluir"
                    onclick="excluirGrupo('${grupo.id}')">

                    Excluir

                </button>

            </div>

        </div>

    `).join("");
}

function editarGrupo(id) {

    const grupo = gruposCache.find(g => g.id === id);

    if (!grupo) return;

    grupoEditandoId = id;

    document.getElementById("grupoNome").value = grupo.nome;
    document.getElementById("grupoDescricao").value = grupo.descricao || "";
    document.getElementById("grupoMinimo").value = grupo.minimo;
    document.getElementById("grupoMaximo").value = grupo.maximo;

    formGrupo.classList.remove("oculto");
}

formGrupo.addEventListener("submit", async (e) => {

    e.preventDefault();

    const nome = document.getElementById("grupoNome").value.trim();
    const descricao = document.getElementById("grupoDescricao").value.trim();
    const minimo = Number(document.getElementById("grupoMinimo").value);
    const maximo = Number(document.getElementById("grupoMaximo").value);

    let error;

    if (grupoEditandoId) {

        const resposta = await supabaseClient
            .from("grupos_adicionais")
            .update({
                nome,
                descricao,
                minimo,
                maximo
            })
            .eq("id", grupoEditandoId)
            .eq("loja_id", lojaAtual);

        error = resposta.error;

    } else {

        const resposta = await supabaseClient
            .from("grupos_adicionais")
            .insert({
                loja_id: lojaAtual,
                nome,
                descricao,
                minimo,
                maximo,
                ativo: true
            });

        error = resposta.error;
    }

    if (error) {
        console.error(error);
        alert("Erro ao salvar grupo.");
        return;
    }

    grupoEditandoId = null;

    formGrupo.reset();

    formGrupo.classList.add("oculto");

    carregarGrupos();

});

async function alternarGrupo(id, ativoAtual) {

    const { error } = await supabaseClient
        .from("grupos_adicionais")
        .update({
            ativo: !ativoAtual
        })
        .eq("id", id)
        .eq("loja_id", lojaAtual);

    if (error) {
        console.error(error);
        return;
    }

    carregarGrupos();
}

async function excluirGrupo(id) {

    if (!confirm("Deseja excluir este grupo?")) return;

    const { error } = await supabaseClient
        .from("grupos_adicionais")
        .delete()
        .eq("id", id)
        .eq("loja_id", lojaAtual);

    if (error) {
        console.error(error);
        return;
    }

    carregarGrupos();
}

carregarLoja();
