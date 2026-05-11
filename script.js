const SENHA_MESTRE = "admin123";

let indexEdicaoGlobal = null;

let sincronizandoAgora = false;

// ======================================================
// INICIALIZAÇÃO DO SISTEMA
// ======================================================

window.addEventListener('load', async () => {

    console.log("🔄 Iniciando SmartPonto...");

    try {

        // Recupera dados da nuvem
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
            "Erro sincronização:",
            erro
        );

    }

}

// ======================================================
// ATUALIZAÇÃO AUTOMÁTICA
// ======================================================

setInterval(async () => {

    if (sincronizandoAgora) return;

    sincronizandoAgora = true;

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

                const secaoAjustes =
                    document.getElementById('secao-ajustes');

                const secaoBanco =
                    document.getElementById('secao-banco');

                if (
                    secaoAjustes &&
                    secaoAjustes.style.display !== 'none'
                ) {

                    atualizarTabelaAjustes();

                }

                if (
                    secaoBanco &&
                    secaoBanco.style.display !== 'none'
                ) {

                    calcularBancoHoras();

                }

            }

        }

    } catch (erro) {

        console.error(
            "Erro atualização:",
            erro
        );

    } finally {

        sincronizandoAgora = false;

    }

}, 5000);

// ======================================================
// LOGIN
// ======================================================

function abrirLogin() {

    document.getElementById('tela-login').style.display = 'flex';

}

function fecharLogin() {

    document.getElementById('tela-login').style.display = 'none';

}

function autenticarGestor() {

    const usuario =
        document.getElementById('login-usuario')
        .value
        .trim();

    const senha =
        document.getElementById('login-senha')
        .value
        .trim();

    if (
        usuario === "admin" &&
        senha === SENHA_MESTRE
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

    document.getElementById('menu-admin').style.display = 'block';

    document.getElementById('dashboard-gestor').style.display = 'grid';

    document.getElementById('btn-login-admin').style.display = 'none';

    document.getElementById('btn-sair-admin').style.display = 'block';

    renderizarDashboard();

}

function sairAdmin() {

    sessionStorage.removeItem('gestorLogado');

    alert("👋 Sessão encerrada");

    location.reload();

}

// ======================================================
// NAVEGAÇÃO
// ======================================================

function mostrarTela(id) {

    const logado =
        sessionStorage.getItem('gestorLogado') === 'true';

    if (!logado && id !== 'secao-ponto') {

        alert("🔒 Acesso restrito");

        return;

    }

    document.querySelectorAll('.modulo-tela')
        .forEach(secao => {

            secao.style.display = 'none';

        });

    document.getElementById(id).style.display = 'block';

    document.querySelectorAll('.sidebar nav ul li a')
        .forEach(link => {

            link.classList.remove('active');

        });

    const ativo =
        document.querySelector(
            `.sidebar nav ul li a[onclick*="${id}"]`
        );

    if (ativo) {

        ativo.classList.add('active');

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
        document.getElementById('identificador-ponto')
        .value
        .trim();

    const funcionarios =
        JSON.parse(
            localStorage.getItem('funcionarios') || '[]'
        );

    let funcionario = null;

    // PIN
    if (/^\d{4}$/.test(entrada)) {

        funcionario =
            funcionarios.find(
                f => f.pin === entrada
            );

    }

    // CPF
    else if (/^\d{11}$/.test(entrada)) {

        funcionario =
            funcionarios.find(
                f => f.cpf === entrada
            );

    }

    else {

        alert(
            "Digite PIN (4 números) ou CPF (11 números)"
        );

        return;

    }

    if (!funcionario) {

        alert("❌ Funcionário não encontrado");

        return;

    }

    let pontos =
        JSON.parse(
            localStorage.getItem('meusPontos') || '[]'
        );

    // EVITAR DUPLICAÇÃO
    const ultimoRegistro = pontos
        .filter(p => p.cpf === funcionario.cpf)
        .slice(-1)[0];

    if (
        ultimoRegistro &&
        ultimoRegistro.tipo === tipo
    ) {

        alert(`⚠️ Último registro já foi ${tipo}`);

        return;

    }

    let agora = new Date();

    // Ajuste Cuiabá
    if (funcionario.unidade === "Cuiabá") {

        agora.setHours(
            agora.getHours() - 1
        );

    }

    const novoRegistro = {

        colaborador: funcionario.nome,

        cpf: funcionario.cpf,

        unidade: funcionario.unidade,

        horario: agora.toISOString(),

        tipo: tipo

    };

    pontos.push(novoRegistro);

    localStorage.setItem(
        'meusPontos',
        JSON.stringify(pontos)
    );

    exibirPontos();

    renderizarDashboard();

    await sincronizarComFirebase();

    document.getElementById(
        'identificador-ponto'
    ).value = "";

    alert(
        `✅ ${tipo} registrado para ${funcionario.nome}`
    );

}

// ======================================================
// EXIBIR PONTOS
// ======================================================

function exibirPontos() {

    const tabela =
        document.getElementById('tabelaPontos');

    const pontos =
        JSON.parse(
            localStorage.getItem('meusPontos') || '[]'
        );

    tabela.innerHTML = [...pontos]
        .reverse()
        .slice(0, 5)
        .map(p => `

            <tr>

                <td>${p.colaborador}</td>

                <td>${p.unidade || '---'}</td>

                <td>
                    ${new Date(p.horario)
                        .toLocaleString()}
                </td>

                <td>${p.tipo}</td>

            </tr>

        `)
        .join('');

}

// ======================================================
// FUNCIONÁRIOS
// ======================================================

async function salvarFuncionario() {

    const nome =
        document.getElementById('cad-nome')
        .value
        .trim();

    const cpf =
        document.getElementById('cad-cpf')
        .value
        .trim();

    const pin =
        document.getElementById('cad-pin')
        .value
        .trim();

    if (!nome || !cpf || !pin) {

        alert("Preencha todos os campos");

        return;

    }

    // VALIDAR CPF
    if (!/^\d{11}$/.test(cpf)) {

        alert(
            "CPF deve conter 11 números"
        );

        return;

    }

    // VALIDAR PIN
    if (!/^\d{4}$/.test(pin)) {

        alert(
            "PIN deve conter 4 números"
        );

        return;

    }

    let funcionarios =
        JSON.parse(
            localStorage.getItem('funcionarios') || '[]'
        );

    // CPF REPETIDO
    if (
        funcionarios.some(
            f => f.cpf === cpf
        )
    ) {

        alert("⚠️ CPF já cadastrado");

        return;

    }

    // PIN REPETIDO
    if (
        funcionarios.some(
            f => f.pin === pin
        )
    ) {

        alert("⚠️ PIN já em uso");

        return;

    }

    funcionarios.push({

        nome: nome,

        cpf: cpf,

        pin: pin,

        unidade:
            document.getElementById('cad-unidade').value,

        jornada:
            document.getElementById('cad-jornada').value

    });

    localStorage.setItem(
        'funcionarios',
        JSON.stringify(funcionarios)
    );

    atualizarListaFuncionarios();

    renderizarDashboard();

    await sincronizarComFirebase();

    document.getElementById('cad-nome').value = "";

    document.getElementById('cad-cpf').value = "";

    document.getElementById('cad-pin').value = "";

    alert("✅ Funcionário cadastrado");

}

function atualizarListaFuncionarios() {

    const lista =
        document.getElementById('listaFuncionarios');

    const funcionarios =
        JSON.parse(
            localStorage.getItem('funcionarios') || '[]'
        );

    lista.innerHTML = funcionarios
        .map((f, i) => `

            <tr>

                <td>${f.cpf}</td>

                <td>${f.nome}</td>

                <td>${f.unidade}</td>

                <td>${f.jornada}</td>

                <td>

                    <button onclick="removerFunc(${i})">

                        ❌

                    </button>

                </td>

            </tr>

        `)
        .join('');

}

async function removerFunc(i) {

    if (
        !confirm(
            "Deseja excluir este funcionário?"
        )
    ) return;

    let funcionarios =
        JSON.parse(
            localStorage.getItem('funcionarios') || '[]'
        );

    funcionarios.splice(i, 1);

    localStorage.setItem(
        'funcionarios',
        JSON.stringify(funcionarios)
    );

    atualizarListaFuncionarios();

    renderizarDashboard();

    await sincronizarComFirebase();

}

// RESTANTE DO CÓDIGO CONTINUA IGUAL
// MANTENHA:
// - AJUSTES
// - DASHBOARD
// - BANCO DE HORAS
// - EXPORTAÇÃO CSV
