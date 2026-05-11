const SENHA_MESTRE = "admin123";
let indexEdicaoGlobal = null;

// ======================================================
// INICIALIZAÇÃO DO SISTEMA
// ======================================================

window.addEventListener('load', async () => {

    console.log("🔄 Iniciando SmartPonto...");

    try {

        // Recupera dados da nuvem ao abrir
        if (typeof window.recuperarDadosNuvem === "function") {
            await window.recuperarDadosNuvem();
        }

        exibirPontos();
        atualizarListaFuncionarios();

        if (sessionStorage.getItem('gestorLogado') === 'true') {
            ativarModoGestor();
        }

        mostrarTela('secao-ponto');

        console.log("✅ Sistema iniciado com sucesso");

    } catch (erro) {

        console.error("Erro ao iniciar sistema:", erro);

    }

});

// ======================================================
// SINCRONIZAÇÃO AUTOMÁTICA
// ======================================================

async function sincronizarComFirebase() {

    try {

        if (typeof window.sincronizarManual === "function") {
            await window.sincronizarManual();
        }

    } catch (erro) {

        console.error("Erro ao sincronizar:", erro);

    }

}

// Atualização automática a cada 5 segundos
setInterval(async () => {

    try {

        if (typeof window.recuperarDadosNuvem === "function") {

            await window.recuperarDadosNuvem();

            exibirPontos();

            if (sessionStorage.getItem('gestorLogado') === 'true') {

                atualizarListaFuncionarios();
                renderizarDashboard();

                if (document.getElementById('secao-ajustes').style.display !== 'none') {
                    atualizarTabelaAjustes();
                }

                if (document.getElementById('secao-banco').style.display !== 'none') {
                    calcularBancoHoras();
                }

            }

        }

    } catch (erro) {

        console.error("Erro na atualização automática:", erro);

    }

}, 5000);

// ======================================================
// LOGIN E SEGURANÇA
// ======================================================

function abrirLogin() {
    document.getElementById('tela-login').style.display = 'flex';
}

function fecharLogin() {
    document.getElementById('tela-login').style.display = 'none';
}

function autenticarGestor() {

    const user = document.getElementById('login-usuario').value.trim();
    const pass = document.getElementById('login-senha').value.trim();

    if (user === "admin" && pass === SENHA_MESTRE) {

        sessionStorage.setItem('gestorLogado', 'true');

        ativarModoGestor();

        fecharLogin();

        alert("✅ Login realizado com sucesso!");

    } else {

        alert("❌ Usuário ou senha incorretos!");

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

    const logado = sessionStorage.getItem('gestorLogado') === 'true';

    if (!logado && id !== 'secao-ponto') {

        alert("🔒 Acesso restrito!");

        return;

    }

    document.querySelectorAll('.modulo-tela').forEach(secao => {
        secao.style.display = 'none';
    });

    document.getElementById(id).style.display = 'block';

    document.querySelectorAll('.sidebar nav ul li a').forEach(link => {
        link.classList.remove('active');
    });

    const linkAtivo = document.querySelector(`.sidebar nav ul li a[onclick*="${id}"]`);

    if (linkAtivo) {
        linkAtivo.classList.add('active');
    }

    if (id === 'secao-ajustes') atualizarTabelaAjustes();

    if (id === 'secao-banco') calcularBancoHoras();

}

// ======================================================
// REGISTRO DE PONTO
// ======================================================

async function baterPonto(tipo) {

    const entrada = document.getElementById('identificador-ponto').value.trim();

    const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');

    let funcionario = null;

    // Busca por PIN
    if (entrada.length === 4) {

        funcionario = funcionarios.find(f => f.pin === entrada);

    }

    // Busca por CPF
    else if (entrada.length === 11) {

        funcionario = funcionarios.find(f => f.cpf === entrada);

    }

    else {

        alert("Digite PIN (4 dígitos) ou CPF (11 números)");

        return;

    }

    if (!funcionario) {

        alert("❌ Funcionário não encontrado");

        return;

    }

    let pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');

    let agora = new Date();

    // Ajuste de fuso Cuiabá
    if (funcionario.unidade === "Cuiabá") {
        agora.setHours(agora.getHours() - 1);
    }

    const novoRegistro = {
        colaborador: funcionario.nome,
        cpf: funcionario.cpf,
        unidade: funcionario.unidade,
        horario: agora.toISOString(),
        tipo: tipo
    };

    pontos.push(novoRegistro);

    localStorage.setItem('meusPontos', JSON.stringify(pontos));

    exibirPontos();

    renderizarDashboard();

    await sincronizarComFirebase();

    document.getElementById('identificador-ponto').value = "";

    alert(`✅ ${tipo} registrado para ${funcionario.nome}`);

}

// ======================================================
// EXIBIR PONTOS
// ======================================================

function exibirPontos() {

    const tabela = document.getElementById('tabelaPontos');

    const pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');

    tabela.innerHTML = [...pontos]
        .reverse()
        .slice(0, 5)
        .map(p => `
            <tr>
                <td>${p.colaborador}</td>
                <td>${p.unidade || '---'}</td>
                <td>${new Date(p.horario).toLocaleString()}</td>
                <td>${p.tipo}</td>
            </tr>
        `)
        .join('');

}

// ======================================================
// FUNCIONÁRIOS
// ======================================================

async function salvarFuncionario() {

    const nome = document.getElementById('cad-nome').value.trim();
    const cpf = document.getElementById('cad-cpf').value.trim();
    const pin = document.getElementById('cad-pin').value.trim();

    if (!nome || !cpf || !pin) {

        alert("Preencha todos os campos");

        return;

    }

    if (cpf.length !== 11) {

        alert("CPF deve conter 11 números");

        return;

    }

    if (pin.length !== 4) {

        alert("PIN deve conter 4 números");

        return;

    }

    let funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');

    // CPF repetido
    if (funcionarios.some(f => f.cpf === cpf)) {

        alert("⚠️ CPF já cadastrado");

        return;

    }

    // PIN repetido
    if (funcionarios.some(f => f.pin === pin)) {

        alert("⚠️ PIN já está em uso");

        return;

    }

    funcionarios.push({
        nome,
        cpf,
        pin,
        unidade: document.getElementById('cad-unidade').value,
        jornada: document.getElementById('cad-jornada').value
    });

    localStorage.setItem('funcionarios', JSON.stringify(funcionarios));

    atualizarListaFuncionarios();

    renderizarDashboard();

    await sincronizarComFirebase();

    document.getElementById('cad-nome').value = "";
    document.getElementById('cad-cpf').value = "";
    document.getElementById('cad-pin').value = "";

    alert("✅ Funcionário cadastrado");

}

function atualizarListaFuncionarios() {

    const lista = document.getElementById('listaFuncionarios');

    const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');

    lista.innerHTML = funcionarios.map((f, i) => `
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
    `).join('');

}

async function removerFunc(i) {

    if (!confirm("Deseja excluir este funcionário?")) return;

    let funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');

    funcionarios.splice(i, 1);

    localStorage.setItem('funcionarios', JSON.stringify(funcionarios));

    atualizarListaFuncionarios();

    renderizarDashboard();

    await sincronizarComFirebase();

}

// ======================================================
// AJUSTES DE PONTO
// ======================================================

function atualizarTabelaAjustes() {

    const lista = document.getElementById("listaAjustesGeral");

    const pontos = JSON.parse(localStorage.getItem("meusPontos") || "[]");

    lista.innerHTML = [...pontos]
        .reverse()
        .map((p, idxOriginal) => {

            const idx = pontos.length - 1 - idxOriginal;

            return `
            <tr>
                <td style="text-align:center">
                    <button onclick="abrirModal(${idx})">✏️</button>
                </td>

                <td>${p.colaborador}</td>

                <td>${p.unidade || '---'}</td>

                <td>${new Date(p.horario).toLocaleString()}</td>

                <td>${p.tipo}</td>

                <td style="text-align:center">
                    <button onclick="excluirPonto(${idx})">🗑️</button>
                </td>
            </tr>
            `;

        })
        .join('');

}

function abrirModal(idx) {

    const pontos = JSON.parse(localStorage.getItem("meusPontos") || "[]");

    indexEdicaoGlobal = idx;

    const ponto = pontos[idx];

    document.getElementById('modal-nome').innerText = ponto.colaborador;

    const data = new Date(ponto.horario);

    data.setMinutes(data.getMinutes() - data.getTimezoneOffset());

    document.getElementById('edit-horario').value =
        data.toISOString().slice(0, 16);

    document.getElementById('edit-tipo').value = ponto.tipo;

    document.getElementById('modal-edicao').style.display = 'flex';

}

function fecharModal() {

    document.getElementById('modal-edicao').style.display = 'none';

}

async function salvarEdicaoModal() {

    let pontos = JSON.parse(localStorage.getItem("meusPontos") || "[]");

    const novaData = document.getElementById('edit-horario').value;

    if (!novaData) {

        alert("Selecione uma data");

        return;

    }

    pontos[indexEdicaoGlobal].horario =
        new Date(novaData).toISOString();

    pontos[indexEdicaoGlobal].tipo =
        document.getElementById('edit-tipo').value;

    localStorage.setItem("meusPontos", JSON.stringify(pontos));

    fecharModal();

    atualizarTabelaAjustes();

    exibirPontos();

    await sincronizarComFirebase();

}

async function excluirPonto(idx) {

    if (!confirm("Deseja apagar este registro?")) return;

    let pontos = JSON.parse(localStorage.getItem("meusPontos") || '[]');

    pontos.splice(idx, 1);

    localStorage.setItem("meusPontos", JSON.stringify(pontos));

    atualizarTabelaAjustes();

    exibirPontos();

    renderizarDashboard();

    await sincronizarComFirebase();

}

// ======================================================
// DASHBOARD
// ======================================================

function renderizarDashboard() {

    const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');

    const pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');

    document.getElementById('card-total-func').innerText =
        funcionarios.length;

    document.getElementById('card-registros-hoje').innerText =
        pontos.filter(p =>
            new Date(p.horario).toLocaleDateString() ===
            new Date().toLocaleDateString()
        ).length;

}

// ======================================================
// BANCO DE HORAS
// ======================================================

function calcularBancoHoras() {

    const lista = document.getElementById("listaBancoHoras");

    const funcionarios = JSON.parse(localStorage.getItem("funcionarios") || '[]');

    const pontos = JSON.parse(localStorage.getItem("meusPontos") || '[]');

    lista.innerHTML = "";

    funcionarios.forEach(funcionario => {

        const registros = pontos.filter(p => p.cpf === funcionario.cpf);

        for (let i = 0; i < registros.length; i++) {

            if (
                registros[i].tipo === "Entrada" &&
                registros[i + 1]?.tipo === "Saída"
            ) {

                const entrada = new Date(registros[i].horario);

                const saida = new Date(registros[i + 1].horario);

                const minutos =
                    Math.floor((saida - entrada) / 60000);

                lista.innerHTML += `
                <tr>

                    <td>${funcionario.nome}</td>

                    <td>${funcionario.unidade}</td>

                    <td>${entrada.toLocaleDateString()}</td>

                    <td>
                        ${entrada.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </td>

                    <td>
                        ${saida.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </td>

                    <td>${formatarHoras(minutos)}</td>

                    <td>--</td>

                </tr>
                `;

                i++;

            }

        }

    });

}

function formatarHoras(minutos) {

    const negativo = minutos < 0 ? "-" : "";

    const absoluto = Math.abs(minutos);

    const horas = String(Math.floor(absoluto / 60)).padStart(2, '0');

    const mins = String(absoluto % 60).padStart(2, '0');

    return `${negativo}${horas}:${mins}`;

}

// ======================================================
// EXPORTAÇÃO CSV
// ======================================================

function exportarRelatorioExcel() {

    const pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');

    let csv = "Colaborador;Unidade;Data;Hora;Tipo\n";

    pontos.forEach(p => {

        const data = new Date(p.horario);

        csv += `${p.colaborador};${p.unidade || '---'};${data.toLocaleDateString()};${data.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        })};${p.tipo}\n`;

    });

    const blob = new Blob(
        ["\ufeff" + csv],
        { type: 'text/csv;charset=utf-8;' }
    );

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);

    link.download = `SmartPonto_Relatorio.csv`;

    link.click();

}
