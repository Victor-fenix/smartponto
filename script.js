const SENHA_MESTRE = "admin123";
let indexEdicaoGlobal = null;

// ======================================================
// CHAVES DO SISTEMA
// ======================================================

const STORAGE_FUNCIONARIOS = "funcionarios";
const STORAGE_PONTOS = "meusPontos";

// ======================================================
// FUNÇÕES SEGURAS
// ======================================================

function obterFuncionarios() {

    try {

        return JSON.parse(
            localStorage.getItem(STORAGE_FUNCIONARIOS)
        ) || [];

    } catch {

        return [];

    }

}

function salvarFuncionarios(funcionarios) {

    localStorage.setItem(
        STORAGE_FUNCIONARIOS,
        JSON.stringify(funcionarios)
    );

}

function obterPontos() {

    try {

        return JSON.parse(
            localStorage.getItem(STORAGE_PONTOS)
        ) || [];

    } catch {

        return [];

    }

}

function salvarPontos(pontos) {

    localStorage.setItem(
        STORAGE_PONTOS,
        JSON.stringify(pontos)
    );

}

function limparInput(id) {

    const campo = document.getElementById(id);

    if (campo) {
        campo.value = "";
    }

}

// ======================================================
// INICIALIZAÇÃO DO SISTEMA
// ======================================================

window.addEventListener('load', async () => {

    console.log("🔄 Iniciando SmartPonto...");

    try {

        // Cria estrutura inicial
        if (!localStorage.getItem(STORAGE_FUNCIONARIOS)) {
            salvarFuncionarios([]);
        }

        if (!localStorage.getItem(STORAGE_PONTOS)) {
            salvarPontos([]);
        }

        // Recupera nuvem
        if (typeof window.recuperarDadosNuvem === "function") {

            await window.recuperarDadosNuvem();

        }

        exibirPontos();
        atualizarListaFuncionarios();

        if (
            sessionStorage.getItem('gestorLogado') === 'true'
        ) {

            ativarModoGestor();

        }

        mostrarTela('secao-ponto');

        console.log("✅ Sistema iniciado");

    } catch (erro) {

        console.error(
            "Erro ao iniciar:",
            erro
        );

    }

});

// ======================================================
// ATUALIZAÇÃO ENTRE ABAS
// ======================================================

window.addEventListener("storage", (evento) => {

    if (
        evento.key === STORAGE_PONTOS ||
        evento.key === STORAGE_FUNCIONARIOS
    ) {

        exibirPontos();
        atualizarListaFuncionarios();
        renderizarDashboard();

        if (
            document.getElementById('secao-ajustes')?.style.display !== 'none'
        ) {

            atualizarTabelaAjustes();

        }

        if (
            document.getElementById('secao-banco')?.style.display !== 'none'
        ) {

            calcularBancoHoras();

        }

    }

});

// ======================================================
// SINCRONIZAÇÃO FIREBASE
// ======================================================

async function sincronizarComFirebase() {

    try {

        if (
            typeof window.sincronizarManual === "function"
        ) {

            await window.sincronizarManual();

        }

    } catch (erro) {

        console.error(
            "Erro ao sincronizar:",
            erro
        );

    }

}

// ======================================================
// ATUALIZAÇÃO AUTOMÁTICA
// ======================================================

setInterval(async () => {

    try {

        if (
            typeof window.recuperarDadosNuvem === "function"
        ) {

            await window.recuperarDadosNuvem();

            exibirPontos();

            if (
                sessionStorage.getItem('gestorLogado') === 'true'
            ) {

                atualizarListaFuncionarios();

                renderizarDashboard();

                if (
                    document.getElementById('secao-ajustes')?.style.display !== 'none'
                ) {

                    atualizarTabelaAjustes();

                }

                if (
                    document.getElementById('secao-banco')?.style.display !== 'none'
                ) {

                    calcularBancoHoras();

                }

            }

        }

    } catch (erro) {

        console.error(
            "Erro atualização automática:",
            erro
        );

    }

}, 5000);

// ======================================================
// LOGIN
// ======================================================

function abrirLogin() {

    document.getElementById(
        'tela-login'
    ).style.display = 'flex';

}

function fecharLogin() {

    document.getElementById(
        'tela-login'
    ).style.display = 'none';

}

function autenticarGestor() {

    const user =
        document.getElementById('login-usuario')
        .value
        .trim();

    const pass =
        document.getElementById('login-senha')
        .value
        .trim();

    if (
        user === "admin" &&
        pass === SENHA_MESTRE
    ) {

        sessionStorage.setItem(
            'gestorLogado',
            'true'
        );

        ativarModoGestor();

        fecharLogin();

        alert("✅ Login realizado");

    } else {

        alert("❌ Usuário ou senha incorretos");

    }

}

function ativarModoGestor() {

    document.getElementById(
        'menu-admin'
    ).style.display = 'block';

    document.getElementById(
        'dashboard-gestor'
    ).style.display = 'grid';

    document.getElementById(
        'btn-login-admin'
    ).style.display = 'none';

    document.getElementById(
        'btn-sair-admin'
    ).style.display = 'block';

    renderizarDashboard();

}

function sairAdmin() {

    sessionStorage.removeItem(
        'gestorLogado'
    );

    alert("👋 Sessão encerrada");

    location.reload();

}

// ======================================================
// NAVEGAÇÃO
// ======================================================

function mostrarTela(id) {

    const logado =
        sessionStorage.getItem('gestorLogado') === 'true';

    if (
        !logado &&
        id !== 'secao-ponto'
    ) {

        alert("🔒 Acesso restrito");

        return;

    }

    document
        .querySelectorAll('.modulo-tela')
        .forEach(secao => {

            secao.style.display = 'none';

        });

    document.getElementById(id)
        .style.display = 'block';

    document
        .querySelectorAll('.sidebar nav ul li a')
        .forEach(link => {

            link.classList.remove('active');

        });

    const linkAtivo =
        document.querySelector(
            `.sidebar nav ul li a[onclick*="${id}"]`
        );

    if (linkAtivo) {

        linkAtivo.classList.add('active');

    }

    if (id === 'secao-ajustes') {

        atualizarTabelaAjustes();

    }

    if (id === 'secao-banco') {

        calcularBancoHoras();

    }

}

// ======================================================
// BATER PONTO
// ======================================================

async function baterPonto(tipo) {

    const entrada =
        document.getElementById(
            'identificador-ponto'
        ).value.trim();

    const funcionarios =
        obterFuncionarios();

    let funcionario = null;

    if (entrada.length === 4) {

        funcionario =
            funcionarios.find(
                f => f.pin === entrada
            );

    } else if (entrada.length === 11) {

        funcionario =
            funcionarios.find(
                f => f.cpf === entrada
            );

    } else {

        alert(
            "Digite PIN ou CPF válido"
        );

        return;

    }

    if (!funcionario) {

        alert(
            "❌ Funcionário não encontrado"
        );

        return;

    }

    const pontos =
        obterPontos();

    let agora = new Date();

    // Ajuste Cuiabá
    if (
        funcionario.unidade === "Cuiabá"
    ) {

        agora.setHours(
            agora.getHours() - 1
        );

    }

    // Evita duplicidade
    const ultimoRegistro =
        pontos[pontos.length - 1];

    if (
        ultimoRegistro &&
        ultimoRegistro.cpf === funcionario.cpf &&
        ultimoRegistro.tipo === tipo
    ) {

        alert(
            `⚠️ Último registro já é ${tipo}`
        );

        return;

    }

    pontos.push({

        colaborador: funcionario.nome,

        cpf: funcionario.cpf,

        unidade: funcionario.unidade,

        horario: agora.toISOString(),

        tipo: tipo

    });

    salvarPontos(pontos);

    exibirPontos();

    renderizarDashboard();

    await sincronizarComFirebase();

    limparInput('identificador-ponto');

    alert(
        `✅ ${tipo} registrado`
    );

}

// ======================================================
// EXIBIR PONTOS
// ======================================================

function exibirPontos() {

    const tabela =
        document.getElementById(
            'tabelaPontos'
        );

    const pontos =
        obterPontos();

    tabela.innerHTML =
        [...pontos]
        .reverse()
        .slice(0, 5)
        .map(p => `

        <tr>

            <td>${p.colaborador}</td>

            <td>${p.unidade || '---'}</td>

            <td>
                ${new Date(
                    p.horario
                ).toLocaleString()}
            </td>

            <td>${p.tipo}</td>

        </tr>

        `)
        .join('');

}

// ======================================================
// SALVAR FUNCIONÁRIO
// ======================================================

async function salvarFuncionario() {

    const nome =
        document.getElementById('cad-nome')
        .value
        .trim();

    const cpf =
        document.getElementById('cad-cpf')
        .value
        .replace(/\D/g, '');

    const pin =
        document.getElementById('cad-pin')
        .value
        .replace(/\D/g, '');

    if (!nome || !cpf || !pin) {

        alert("Preencha todos os campos");

        return;

    }

    if (cpf.length !== 11) {

        alert(
            "CPF deve conter 11 números"
        );

        return;

    }

    if (pin.length !== 4) {

        alert(
            "PIN deve conter 4 números"
        );

        return;

    }

    const funcionarios =
        obterFuncionarios();

    if (
        funcionarios.some(
            f => f.cpf === cpf
        )
    ) {

        alert("⚠️ CPF já cadastrado");

        return;

    }

    if (
        funcionarios.some(
            f => f.pin === pin
        )
    ) {

        alert("⚠️ PIN já em uso");

        return;

    }

    funcionarios.push({

        nome,

        cpf,

        pin,

        unidade:
            document.getElementById(
                'cad-unidade'
            ).value,

        jornada:
            document.getElementById(
                'cad-jornada'
            ).value

    });

    salvarFuncionarios(funcionarios);

    atualizarListaFuncionarios();

    renderizarDashboard();

    await sincronizarComFirebase();

    limparInput('cad-nome');
    limparInput('cad-cpf');
    limparInput('cad-pin');

    alert(
        "✅ Funcionário cadastrado"
    );

}

// ======================================================
// LISTA FUNCIONÁRIOS
// ======================================================

function atualizarListaFuncionarios() {

    const lista =
        document.getElementById(
            'listaFuncionarios'
        );

    const funcionarios =
        obterFuncionarios();

    lista.innerHTML =
        funcionarios.map((f, i) => `

        <tr>

            <td>${f.cpf}</td>

            <td>${f.nome}</td>

            <td>${f.unidade}</td>

            <td>${f.jornada}</td>

            <td>

                <button
                    onclick="removerFunc(${i})"
                >
                    ❌
                </button>

            </td>

        </tr>

        `)
        .join('');

}

// ======================================================
// REMOVER FUNCIONÁRIO
// ======================================================

async function removerFunc(i) {

    if (
        !confirm(
            "Deseja excluir?"
        )
    ) return;

    const funcionarios =
        obterFuncionarios();

    funcionarios.splice(i, 1);

    salvarFuncionarios(funcionarios);

    atualizarListaFuncionarios();

    renderizarDashboard();

    await sincronizarComFirebase();

}
