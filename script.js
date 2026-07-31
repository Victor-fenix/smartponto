// ======================================================
// CONFIGURAÇÕES GERAIS E SEGURANÇA
// ======================================================
const SENHA_MESTRE = "SmartPonto@2026";
let cpfModalAtual = null;
let dataModalAtual = null;
const SENHA_MESTRE = "admin123";
let indexEdicaoGlobal = null;

// ======================================================
// INICIALIZAÇÃO DO SISTEMA
// ======================================================
document.addEventListener("DOMContentLoaded", async () => {

    configurarMesAtual();
window.addEventListener('load', async () => {
    console.log("🔄 Iniciando SmartPonto...");

    // Restaura os dados da nuvem antes de renderizar
    try {
        // Recupera dados da nuvem ao abrir
        if (typeof window.recuperarDadosNuvem === "function") {
            await window.recuperarDadosNuvem();
        }
    } catch (erro) {
        console.error("Erro ao recuperar dados na inicialização:", erro);
    }

    // Garante que a estrutura do modal exista, mesmo que o HTML da página
    // esteja desatualizado — evita telas em branco/quebradas por mismatch.
    injetarEstruturaModalSeNecessario();
        carregarSeletores();
        atualizarVisualizacaoMaster();

    carregarSeletores();
    atualizarVisualizacaoMaster();
    renderizarDashboard();
    renderizarLogs();
        if (sessionStorage.getItem('gestorLogado') === 'true') {
            ativarModoGestor();
        }

    document.getElementById('cad-cpf')?.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
    });
    document.getElementById('cad-pin')?.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
    });
        mostrarTela('secao-ponto');
        console.log("✅ Sistema iniciado com sucesso");

    if (sessionStorage.getItem('gestorLogado') === 'true') {
        ativarModoGestor();
    } catch (erro) {
        console.error("Erro ao iniciar sistema:", erro);
    }
});

function configurarMesAtual() {
    const inputMes = document.getElementById('filtro-mes-extrato');
    if (inputMes && !inputMes.value) {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        inputMes.value = `${ano}-${mes}`;
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

// ======================================================
// ATUALIZAÇÃO AUTOMÁTICA ENTRE DISPOSITIVOS
// ======================================================

setInterval(async () => {
    try {
        if (typeof window.recuperarDadosNuvem === "function") {
            await window.recuperarDadosNuvem();
            carregarSeletores();
            atualizarVisualizacaoMaster();
            renderizarDashboard();
            renderizarLogs();
            console.log("☁️ Sistema sincronizado automaticamente");
        }
    } catch (erro) {
        console.error("Erro na atualização automática:", erro);
    }
}, 10000);
}, 5000);

// ======================================================
// SISTEMA DE AUDITORIA AUTOMÁTICA (LOGS)
// LOGIN E SEGURANÇA
// ======================================================
function registrarLog(usuario, acao) {
    const logs = JSON.parse(localStorage.getItem("logs") || "[]");
    logs.push({
        usuario: usuario,
        acao: acao,
        data: new Date().toLocaleString('pt-BR')
    });
    localStorage.setItem("logs", JSON.stringify(logs));
    renderizarLogs();
}
window.registrarLog = registrarLog;

function renderizarLogs() {
    const listaLogs = document.getElementById('listaLogsAuditoria');
    if (!listaLogs) return;
    const logs = JSON.parse(localStorage.getItem("logs") || "[]");
    listaLogs.innerHTML = [...logs].reverse().map(log => `
        <tr>
            <td><strong>${log.usuario}</strong></td>
            <td>${log.acao}</td>
            <td>${log.data}</td>
        </tr>
    `).join('');
function abrirLogin() {
    document.getElementById('tela-login').style.display = 'flex';
}

// ======================================================
// GERENCIAMENTO DE TELAS
// ======================================================
function mostrarTela(idTela) {
    const logado = sessionStorage.getItem('gestorLogado') === 'true';

    if (!logado && idTela !== 'secao-ponto') {
        alert("🔒 Acesso restrito! Faça login como gestor.");
        return;
    }

    document.querySelectorAll('.modulo-tela').forEach(s => s.style.display = 'none');
    document.getElementById(idTela).style.display = 'block';

    document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'));
    const linkAtivo = document.getElementById(`link-${idTela}`);
    if (linkAtivo) linkAtivo.classList.add('active');

    atualizarVisualizacaoMaster();
function fecharLogin() {
    document.getElementById('tela-login').style.display = 'none';
}

// ======================================================
// LOGIN E SEGURANÇA
// ======================================================
function abrirLogin() { document.getElementById('tela-login').style.display = 'flex'; }
function fecharLogin() { document.getElementById('tela-login').style.display = 'none'; }

function autenticarGestor() {
    const user = document.getElementById('login-usuario').value.trim();
    const pass = document.getElementById('login-senha').value.trim();
@@ -133,142 +80,302 @@ function autenticarGestor() {
        ativarModoGestor();
        fecharLogin();
        alert("✅ Login realizado com sucesso!");
        registrarLog("admin", "Efetuou login no sistema");
    } else {
        alert("❌ Usuário ou senha incorretos!");
    }
}

function ativarModoGestor() {
    document.getElementById('menu-admin').style.display = 'block';
    document.getElementById('dashboard-gestor').style.display = 'grid';
    document.getElementById('btn-login-admin').style.display = 'none';
    document.getElementById('btn-sair-admin').style.display = 'block';
    const menuAdmin = document.getElementById('menu-admin');
    const dashGestor = document.getElementById('dashboard-gestor');
    const btnLogin = document.getElementById('btn-login-admin');
    const btnSair = document.getElementById('btn-sair-admin');

    if (menuAdmin) menuAdmin.style.display = 'block';
    if (dashGestor) dashGestor.style.display = 'grid';
    if (btnLogin) btnLogin.style.display = 'none';
    if (btnSair) btnSair.style.display = 'block';

    renderizarDashboard();
    renderizarLogs();
}

function sairAdmin() {
    registrarLog("admin", "Encerrou a sessão");
    sessionStorage.removeItem('gestorLogado');
    alert("👋 Sessão encerrada");
    location.reload();
}

// ======================================================
// REGISTRO DE PONTO
// NAVEGAÇÃO
// ======================================================
function baterPonto(tipo) {
    const identificador = document.getElementById('identificador-ponto').value.trim();
    if (!identificador) return alert("Por favor, digite seu PIN ou CPF");

    const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');
    const funcionario = funcionarios.find(f => f.cpf === identificador || f.pin === identificador);
function mostrarTela(id) {
    const logado = sessionStorage.getItem('gestorLogado') === 'true';

    if (!funcionario) return alert("❌ Colaborador não cadastrado!");
    if (!logado && id !== 'secao-ponto') {
        alert("🔒 Acesso restrito!");
        return;
    }

    const pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');
    document.querySelectorAll('.modulo-tela').forEach(secao => {
        secao.style.display = 'none';
    });

    const secaoAlvo = document.getElementById(id);
    if (secaoAlvo) secaoAlvo.style.display = 'block';

    document.querySelectorAll('.sidebar nav ul li a').forEach(link => {
        link.classList.remove('active');
    });

    const linkAtivo = document.querySelector(`.sidebar nav ul li a[onclick*="${id}"]`);
    if (linkAtivo) linkAtivo.classList.add('active');

    if (id === 'secao-ajustes') atualizarTabelaAjustes();
    if (id === 'secao-banco') gerarRelatorioMensalConsolidado();
}

// ======================================================
// REGISTRO DE PONTO
// ======================================================

    const ultimoRegistro = pontos
        .filter(p => p.cpf === funcionario.cpf)
        .sort((a, b) => new Date(a.horario) - new Date(b.horario))
        .slice(-1)[0];
async function baterPonto(tipo) {
    const entrada = document.getElementById('identificador-ponto').value.trim();
    const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');

    let funcionario = null;

    if (ultimoRegistro && ultimoRegistro.tipo === tipo) {
        alert(`⚠️ Operação Bloqueada! Seu último registro já foi uma ${tipo}.`);
    if (entrada.length === 4) {
        funcionario = funcionarios.find(f => f.pin === entrada);
    } else if (entrada.length === 11) {
        funcionario = funcionarios.find(f => f.cpf === entrada);
    } else {
        alert("Digite PIN (4 dígitos) ou CPF (11 números)");
        return;
    }

    const nomeNormalizado = funcionario.nome || funcionario.Nome || "Funcionário Sem Nome";
    const unidadeNormalizada = funcionario.unidade || funcionario.Unidade || "Não Definida";
    if (!funcionario) {
        alert("❌ Funcionário não encontrado");
        return;
    }

    let pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');
    let agora = new Date();

    // Ajuste de fuso horário Cuiabá (-1h em relação ao horário do sistema)
    if (unidadeNormalizada === "Cuiabá") {
    if (funcionario.unidade === "Cuiabá") {
        agora.setHours(agora.getHours() - 1);
    }

    const novoRegistro = {
        colaborador: funcionario.nome || funcionario.Nome,
        cpf: funcionario.cpf,
        nome: nomeNormalizado,
        unidade: unidadeNormalizada,
        unidade: funcionario.unidade || funcionario.Unidade,
        horario: agora.toISOString(),
        tipo: tipo
    };

    pontos.push(novoRegistro);
    localStorage.setItem('meusPontos', JSON.stringify(pontos));
    document.getElementById('identificador-ponto').value = "";

    alert(`✅ Ponto de ${tipo} batido com sucesso!\n${nomeNormalizado}`);
    atualizarVisualizacaoMaster();
    await sincronizarComFirebase();

    if (typeof window.sincronizarSilencioso === "function") window.sincronizarSilencioso();
    document.getElementById('identificador-ponto').value = "";
    alert(`✅ ${tipo} registrado para ${funcionario.nome || funcionario.Nome}`);
}

// ======================================================
// CADASTRO DE FUNCIONÁRIOS
// GERENCIAMENTO DE FUNCIONÁRIOS
// ======================================================
window.salvarFuncionario = function () {

async function salvarFuncionario() {
    const nome = document.getElementById('cad-nome').value.trim();
    const cpf = document.getElementById('cad-cpf').value.replace(/\D/g, '');
    const pin = document.getElementById('cad-pin').value.replace(/\D/g, '');
    const unidade = document.getElementById('cad-unidade').value;
    const jornada = document.getElementById('cad-jornada').value;
    const cpf = document.getElementById('cad-cpf').value.trim();
    const pin = document.getElementById('cad-pin').value.trim();

    if (!nome || cpf.length !== 11 || pin.length !== 4) {
        return alert("Preencha todos os dados corretamente! CPF deve ter 11 dígitos e PIN 4 dígitos.");
    if (!nome || !cpf || !pin) {
        alert("Preencha todos os campos");
        return;
    }

    const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');
    if (cpf.length !== 11) {
        alert("CPF deve conter 11 números");
        return;
    }

    if (pin.length !== 4) {
        alert("PIN deve conter 4 números");
        return;
    }

    let funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');

    if (funcionarios.some(f => f.cpf === cpf)) {
        return alert("⚠️ CPF já cadastrado!");
        alert("⚠️ CPF já cadastrado");
        return;
    }

    if (funcionarios.some(f => f.pin === pin)) {
        return alert("⚠️ PIN já está em uso por outro colaborador!");
        alert("⚠️ PIN já está em uso");
        return;
    }

    funcionarios.push({ nome, cpf, pin, unidade, jornada });
    funcionarios.push({
        nome,
        cpf,
        pin,
        unidade: document.getElementById('cad-unidade').value,
        jornada: document.getElementById('cad-jornada').value
    });

    localStorage.setItem('funcionarios', JSON.stringify(funcionarios));

    alert("✅ Colaborador cadastrado!");
    registrarLog("admin", `Cadastrou o funcionário: ${nome} (CPF: ${cpf})`);
    carregarSeletores();
    atualizarVisualizacaoMaster();
    await sincronizarComFirebase();

    document.getElementById('cad-nome').value = "";
    document.getElementById('cad-cpf').value = "";
    document.getElementById('cad-pin').value = "";

    alert("✅ Funcionário cadastrado");
}

async function removerFunc(i) {
    if (!confirm("Deseja excluir este funcionário?")) return;

    let funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');
    funcionarios.splice(i, 1);
    localStorage.setItem('funcionarios', JSON.stringify(funcionarios));

    carregarSeletores();
    atualizarVisualizacaoMaster();
    await sincronizarComFirebase();
}

    if (typeof window.sincronizarSilencioso === "function") window.sincronizarSilencioso();
};
async function excluirFuncionario(cpf) {
    if (!confirm("Deseja remover este funcionário?")) return;

window.excluirFuncionario = function (cpf) {
    if (!confirm("Deseja deletar este colaborador?")) return;
    let funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');
    const func = funcionarios.find(f => f.cpf === cpf);
    funcionarios = funcionarios.filter(f => f.cpf !== cpf);
    localStorage.setItem('funcionarios', JSON.stringify(funcionarios));

    registrarLog("admin", `Excluiu o funcionário: ${func ? func.nome : cpf}`);
    carregarSeletores();
    atualizarVisualizacaoMaster();
    await sincronizarComFirebase();
}

    if (typeof window.sincronizarSilencioso === "function") window.sincronizarSilencioso();
};
// ======================================================
// AJUSTES E MODAL DE EDIÇÃO DE PONTO
// ======================================================

function atualizarTabelaAjustes() {
    const lista = document.getElementById("listaAjustesGeral");
    if (!lista) return;

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
                <td>${p.colaborador || p.nome || 'Não Identificado'}</td>
                <td>${p.unidade || '---'}</td>
                <td>${new Date(p.horario).toLocaleString('pt-BR')}</td>
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

    document.getElementById('modal-nome').innerText = ponto.colaborador || ponto.nome;

    const data = new Date(ponto.horario);
    data.setMinutes(data.getMinutes() - data.getTimezoneOffset());

    document.getElementById('edit-horario').value = data.toISOString().slice(0, 16);
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

    pontos[indexEdicaoGlobal].horario = new Date(novaData).toISOString();
    pontos[indexEdicaoGlobal].tipo = document.getElementById('edit-tipo').value;

    localStorage.setItem("meusPontos", JSON.stringify(pontos));

    fecharModal();
    atualizarVisualizacaoMaster();
    await sincronizarComFirebase();
}

async function excluirPonto(idx) {
    if (!confirm("Deseja apagar este registro?")) return;

    let pontos = JSON.parse(localStorage.getItem("meusPontos") || '[]');
    pontos.splice(idx, 1);
    localStorage.setItem("meusPontos", JSON.stringify(pontos));

    atualizarVisualizacaoMaster();
    await sincronizarComFirebase();
}

// ======================================================
// DASHBOARD
// ======================================================

function renderizarDashboard() {
    const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');
    const pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');

    const cardTotal = document.getElementById('card-total-func');
    const cardHoje = document.getElementById('card-registros-hoje');

    if (cardTotal) cardTotal.innerText = funcionarios.length;
    if (cardHoje) {
        cardHoje.innerText = pontos.filter(p =>
            new Date(p.horario).toLocaleDateString() === new Date().toLocaleDateString()
        ).length;
    }
}

// ======================================================
// COMPONENTES DOS FILTROS E CARREGADORES
// CONTROLE MASTER E RENDERIZADORES AUXILIARES
// ======================================================

function carregarSeletores() {
    const seletorExtrato = document.getElementById('filtro-funcionario-extrato');
    if (!seletorExtrato) return;

    const valorAtual = seletorExtrato.value;
    const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');

    seletorExtrato.innerHTML = '<option value="">Escolha um Colaborador para o Calendário...</option>' +
        funcionarios.map(f => `<option value="${f.cpf}">${f.nome || f.Nome} [${f.unidade || f.Unidade}]</option>`).join('');

@@ -277,24 +384,22 @@ function carregarSeletores() {
    }
}

// ======================================================
// CONTROLE MASTER DE PROCESSAMENTO E RENDERIZAÇÃO
// ======================================================
window.atualizarVisualizacaoMaster = function () {
    renderizarTabelaPontoSimples();
    renderizarFuncionariosCadastro();
    renderizarHistoricoOcorrencias();
    atualizarTabelaAjustes();
    gerarRelatorioMensalConsolidado();
    renderizarDashboard();
    renderizarLogs();
    if (typeof renderizarHistoricoOcorrencias === "function") renderizarHistoricoOcorrencias();
    if (typeof renderizarLogs === "function") renderizarLogs();
};

function renderizarTabelaPontoSimples() {
    const table = document.getElementById('tabelaPontos');
    if (!table) return;
    const pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');

    table.innerHTML = pontos.slice(-5).reverse().map(p => `
    table.innerHTML = [...pontos].reverse().slice(0, 5).map(p => `
        <tr>
            <td>${p.nome || p.colaborador || "Não Identificado"}</td>
            <td>${p.unidade || "Sede"}</td>
@@ -308,23 +413,43 @@ function renderizarFuncionariosCadastro() {
    const table = document.getElementById('listaFuncionarios');
    if (!table) return;
    const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');
    table.innerHTML = funcionarios.map(f => `

    table.innerHTML = funcionarios.map((f, i) => `
        <tr>
            <td>${f.cpf}</td>
            <td><strong>${f.nome || f.Nome}</strong></td>
            <td>${f.unidade || f.Unidade}</td>
            <td>Jornada: ${f.jornada || f.Jornada}h</td>
            <td><button onclick="excluirFuncionario('${f.cpf}')" class="btn-cancelar">❌ Remover</button></td>
            <td>Jornada: ${f.jornada || f.Jornada || "08:00"}h</td>
            <td>
                <button onclick="removerFunc(${i})" class="btn-cancelar">❌ Remover</button>
            </td>
        </tr>
    `).join('');
}

// ======================================================
// PROCESSAMENTO DAS HORAS EXTRAS / NEGATIVAS E CALENDÁRIO VISUAL
// Regras: fim de semana sem ponto e sem ocorrência = neutro (DSR),
// dia com ocorrência "Curso" = jornada cumprida (sem saldo negativo),
// dia de semana sem ponto e sem ocorrência = falta (saldo negativo).
// UTILITÁRIOS DE HORA
// ======================================================

function converterHoraParaMinutos(horaStr) {
    if (!horaStr) return 480;
    if (typeof horaStr === 'number') return horaStr * 60;
    const partes = horaStr.toString().split(':');
    return (parseInt(partes[0], 10) * 60) + (parseInt(partes[1] || 0, 10));
}

function converterMinutosParaHoraString(minutos) {
    const sinal = minutos < 0 ? "-" : "";
    const abs = Math.abs(minutos);
    const h = String(Math.floor(abs / 60)).padStart(2, '0');
    const m = String(abs % 60).padStart(2, '0');
    return `${sinal}${h}:${m}`;
}

// ======================================================
// BANCO DE HORAS E CALENDÁRIO VISUAL CONSOLIDADO
// ======================================================

function gerarRelatorioMensalConsolidado() {
    const listaBancoHoras = document.getElementById('listaBancoHoras');
    const gradeCalendario = document.getElementById('grade-calendario-ponto');
@@ -333,9 +458,12 @@ function gerarRelatorioMensalConsolidado() {
    const busca = document.getElementById('busca-extrato')?.value.toLowerCase() || '';
    const unidadeFiltro = document.getElementById('filtro-unidade-extrato')?.value || '';
    const funcionarioAlvoCpf = document.getElementById('filtro-funcionario-extrato')?.value || '';
    const filtroMes = document.getElementById('filtro-mes-extrato').value;
    const filtroMes = document.getElementById('filtro-mes-extrato')?.value;

    if (!filtroMes) return;
    if (!filtroMes) {
        listaBancoHoras.innerHTML = '<tr><td colspan="8">Selecione o mês para visualizar.</td></tr>';
        return;
    }

    const [ano, mes] = filtroMes.split('-').map(Number);
    const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');
@@ -365,20 +493,18 @@ function gerarRelatorioMensalConsolidado() {

        for (let dia = 1; dia <= totalDiasNoMes; dia++) {
            const dataAtualStr = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

            const objetoData = new Date(ano, mes - 1, dia);
            const diaDaSemana = objetoData.getDay();
            const ehFimDeSemana = (diaDaSemana === 0 || diaDaSemana === 6);
            const ehFimDeSemana = (objetoData.getDay() === 0 || objetoData.getDay() === 6);

            const pontosDoDia = pontos.filter(p => {
                const pData = new Date(p.horario);
                const pDataStr = `${pData.getFullYear()}-${String(pData.getMonth() + 1).padStart(2, '0')}-${String(pData.getDate()).padStart(2, '0')}`;
                return p.cpf === funcionario.cpf && pDataStr === dataAtualStr;
            }).sort((a, b) => new Date(a.horario) - new Date(b.horario));

            const ocorrenciaDoDia = ocorrencias.find(o => {
                return o.funcionarioCpf === funcionario.cpf && dataAtualStr >= o.dataInicio && dataAtualStr <= o.dataFim;
            });
            const ocorrenciaDoDia = ocorrencias.find(o =>
                o.funcionarioCpf === funcionario.cpf && dataAtualStr >= o.dataInicio && dataAtualStr <= o.dataFim
            );

            if (funcionario.cpf === funcionarioAlvoCpf) {
                registrosAgrupadosPorDia[dataAtualStr] = { pontosDia: pontosDoDia, ocorrencia: ocorrenciaDoDia };
@@ -408,15 +534,14 @@ function gerarRelatorioMensalConsolidado() {
            let saldoDoDia = 0;

            if (ocorrenciaDoDia && ocorrenciaDoDia.tipo === "Curso") {
                saldoDoDia = 0; // Curso: jornada cumprida, saldo neutro
                saldoDoDia = 0;
                if (trabalhadoMinutos === 0) trabalhadoMinutos = jornadaMinutos;
            } else if (trabalhadoMinutos > 0) {
                const jornadaConsiderada = ehFimDeSemana ? 0 : jornadaMinutos;
                saldoDoDia = trabalhadoMinutos - jornadaConsiderada;
            } else if (ocorrenciaDoDia) {
                saldoDoDia = (ocorrenciaDoDia.tipo === "Falta Injustificada") ? -jornadaMinutos : 0;
            } else {
                // Sem ponto e sem ocorrência: fim de semana é neutro (DSR), dia útil é falta
                saldoDoDia = ehFimDeSemana ? 0 : -jornadaMinutos;
            }

@@ -453,15 +578,23 @@ function gerarRelatorioMensalConsolidado() {
    // RENDERIZADOR DO CALENDÁRIO VISUAL
    if (gradeCalendario) {
        if (!funcionarioAlvoCpf) {
            gradeCalendario.innerHTML = `<div style="grid-column: span 7; padding: 20px; color: #7f8c8d;">Selecione um funcionário específico acima para visualizar o mapa do calendário.</div>`;
            document.getElementById('resumo-horas-trabalhadas').innerText = "00:00";
            document.getElementById('resumo-horas-extras').innerText = "00:00";
            document.getElementById('resumo-horas-negativas').innerText = "00:00";
            document.getElementById('resumo-saldo-final').innerText = "00:00";
            gradeCalendario.innerHTML = `<div style="grid-column: span 7; padding: 20px; color: #7f8c8d; text-align: center;">Selecione um funcionário específico acima para visualizar o mapa do calendário.</div>`;
            const elTrab = document.getElementById('resumo-horas-trabalhadas');
            const elExt = document.getElementById('resumo-horas-extras');
            const elNeg = document.getElementById('resumo-horas-negativas');
            const elSaldo = document.getElementById('resumo-saldo-final');

            if (elTrab) elTrab.innerText = "00:00";
            if (elExt) elExt.innerText = "00:00";
            if (elNeg) elNeg.innerText = "00:00";
            if (elSaldo) {
                elSaldo.innerText = "00:00";
                elSaldo.style.color = "#333";
            }
        } else {
            let htmlCalendario = "";
            const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
            diasSemana.forEach(ds => htmlCalendario += `<div style="font-weight:bold; padding: 5px; background:#eee; border-radius:3px;">${ds}</div>`);
            diasSemana.forEach(ds => htmlCalendario += `<div style="font-weight:bold; padding: 5px; background:#eee; border-radius:3px; text-align:center;">${ds}</div>`);

            const primeiroDiaSemanaIndex = new Date(ano, mes - 1, 1).getDay();
            for (let i = 0; i < primeiroDiaSemanaIndex; i++) {
@@ -471,7 +604,6 @@ function gerarRelatorioMensalConsolidado() {
            for (let d = 1; d <= totalDiasNoMes; d++) {
                const dStr = `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dadosDia = registrosAgrupadosPorDia[dStr];

                const objetoData = new Date(ano, mes - 1, d);
                const ehFimDeSemana = (objetoData.getDay() === 0 || objetoData.getDay() === 6);

@@ -505,534 +637,27 @@ function gerarRelatorioMensalConsolidado() {
            }
            gradeCalendario.innerHTML = htmlCalendario;

            document.getElementById('resumo-horas-trabalhadas').innerText = converterMinutosParaHoraString(minutosTotaisTrabalhados);
            const elTrab = document.getElementById('resumo-horas-trabalhadas');
            const elExt = document.getElementById('resumo-horas-extras');
            const elNeg = document.getElementById('resumo-horas-negativas');
            const elSaldo = document.getElementById('resumo-saldo-final');

            if (elTrab) elTrab.innerText = converterMinutosParaHoraString(minutosTotaisTrabalhados);
            if (minutosSaldoAcumulado >= 0) {
                document.getElementById('resumo-horas-extras').innerText = converterMinutosParaHoraString(minutosSaldoAcumulado);
                document.getElementById('resumo-horas-negativas').innerText = "00:00";
                document.getElementById('resumo-saldo-final').innerText = `+${converterMinutosParaHoraString(minutosSaldoAcumulado)}`;
                document.getElementById('resumo-saldo-final').style.color = "green";
                if (elExt) elExt.innerText = converterMinutosParaHoraString(minutosSaldoAcumulado);
                if (elNeg) elNeg.innerText = "00:00";
                if (elSaldo) {
                    elSaldo.innerText = `+${converterMinutosParaHoraString(minutosSaldoAcumulado)}`;
                    elSaldo.style.color = "green";
                }
            } else {
                document.getElementById('resumo-horas-extras').innerText = "00:00";
                document.getElementById('resumo-horas-negativas').innerText = converterMinutosParaHoraString(Math.abs(minutosSaldoAcumulado));
                document.getElementById('resumo-saldo-final').innerText = `-${converterMinutosParaHoraString(Math.abs(minutosSaldoAcumulado))}`;
                document.getElementById('resumo-saldo-final').style.color = "red";
                if (elExt) elExt.innerText = "00:00";
                if (elNeg) elNeg.innerText = converterMinutosParaHoraString(Math.abs(minutosSaldoAcumulado));
                if (elSaldo) {
                    elSaldo.innerText = converterMinutosParaHoraString(minutosSaldoAcumulado);
                    elSaldo.style.color = "red";
                }
            }
        }
    }
}

// ======================================================
// MODAL DE TRATAMENTO DIRETO (Entrada/Saída + Justificativas)
// ======================================================
function dataStrDoPonto(p) {
    const d = new Date(p.horario);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatarDatetimeLocal(isoString) {
    const d = new Date(isoString);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}

// Constrói a estrutura interna do modal via JS. Isso garante que o modal
// sempre funcione, mesmo que o index.html usado esteja desatualizado.
function injetarEstruturaModalSeNecessario() {
    const modal = document.getElementById('modal-edicao');
    if (!modal) return;

    if (!document.getElementById('lista-pontos-dia')) {
        modal.innerHTML = `
            <div class="modal-conteudo" style="background:#fff; padding:25px; border-radius:12px; max-width:520px; width:90%; box-shadow:0 25px 50px rgba(0,0,0,0.25); font-family:'Inter', sans-serif; max-height:90vh; overflow-y:auto;">
                <h2 id="modal-nome" style="margin-top:0; color:#2c3e50; font-size:18px; border-bottom:2px solid #ecf0f1; padding-bottom:10px;">Tratar Ponto / Justificativa</h2>

                <div id="campos-ponto-existente" style="margin-top:15px;">
                    <label style="display:block; font-weight:bold; color:#34495e; margin-bottom:8px; font-size:12px; text-transform:uppercase;">Registros de Entrada / Saída:</label>
                    <div id="lista-pontos-dia" style="max-height:180px; overflow-y:auto; margin-bottom:10px; padding-right:5px;"></div>
                    <button type="button" onclick="adicionarLinhaPontoModal()" style="background-color:#3498db; color:#fff; border:none; padding:10px 12px; border-radius:8px; cursor:pointer; font-weight:700; width:100%; margin-bottom:15px;">➕ Adicionar Registro Faltante</button>
                </div>

                <div id="campos-justificativa-falta" style="margin-top:10px; border-top:1px dashed #ccc; padding-top:15px;">
                    <label style="display:block; font-weight:bold; color:#34495e; margin-bottom:5px; font-size:12px; text-transform:uppercase;">Justificativa (se houver ausência):</label>
                    <select id="edit-ocorrencia-tipo" style="width:100%; padding:10px; border:1px solid #dcdde1; border-radius:8px; margin-bottom:12px;">
                        <option value="Falta Injustificada">Nenhuma (manter os registros acima)</option>
                        <option value="Curso">Curso (Jovem Aprendiz - dia fixo)</option>
                        <option value="Falta Justificada">Falta Justificada</option>
                        <option value="Atestado Médico">Atestado Médico</option>
                        <option value="Folga">Folga</option>
                        <option value="Suspensão">Suspensão</option>
                        <option value="Férias">Férias</option>
                    </select>

                    <label style="display:block; font-weight:bold; color:#34495e; margin-bottom:5px; font-size:12px; text-transform:uppercase;">Observação / Detalhes:</label>
                    <textarea id="edit-observacao" rows="2" placeholder="Ex: Atestado anexo, dia de curso do SENAI, etc." style="width:100%; padding:10px; border:1px solid #dcdde1; border-radius:8px; resize:vertical; box-sizing:border-box;"></textarea>
                </div>

                <div style="display:flex; gap:10px; margin-top:20px; justify-content:flex-end;">
                    <button type="button" onclick="fecharModal()" style="background:#f1f2f6; color:#34495e; border:none; padding:12px 20px; border-radius:8px; cursor:pointer; font-weight:700;">Fechar</button>
                    <button type="button" onclick="salvarEdicaoModal()" style="background:#27ae60; color:#fff; border:none; padding:12px 20px; border-radius:8px; cursor:pointer; font-weight:700;">Salvar Alterações</button>
                </div>
            </div>
        `;
    }
}

function renderizarLinhasPontosModal(pontosDoDia) {
    const container = document.getElementById('lista-pontos-dia');
    if (!container) return;

    if (pontosDoDia.length === 0) {
        container.innerHTML = `<p style="color:#7f8c8d; text-align:center; margin:10px 0; font-size:13px;">Nenhum ponto batido neste dia. Use o botão abaixo para adicionar.</p>`;
        return;
    }

    container.innerHTML = pontosDoDia.map(p => `
        <div class="linha-ponto-modal" data-idx="${p._idx}" style="display:flex; gap:8px; margin-bottom:8px; align-items:center; background:#f8f9fa; padding:8px; border-radius:8px; border:1px solid #e2e8f0;">
            <input type="datetime-local" class="ponto-horario-input" value="${formatarDatetimeLocal(p.horario)}" style="flex:2; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; margin-bottom:0;">
            <select class="ponto-tipo-input" style="flex:1; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; font-weight:700; margin-bottom:0;">
                <option value="Entrada" ${p.tipo === 'Entrada' ? 'selected' : ''}>Entrada</option>
                <option value="Saída" ${p.tipo === 'Saída' ? 'selected' : ''}>Saída</option>
            </select>
            <button type="button" onclick="excluirLinhaPontoModal(${p._idx})" style="background:#fc8181; color:#fff; border:none; padding:8px 10px; border-radius:6px; cursor:pointer; flex:0 0 auto;" title="Excluir esta batida">🗑️</button>
        </div>
    `).join('');
}

window.abrirTratamentoDireto = function (cpf, dataStr) {
    injetarEstruturaModalSeNecessario();

    const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');
    const funcionario = funcionarios.find(f => f.cpf === cpf);
    if (!funcionario) return;

    cpfModalAtual = cpf;
    dataModalAtual = dataStr;

    const nomeAtual = funcionario.nome || funcionario.Nome || "Colaborador";
    document.getElementById('modal-nome').innerText = `Colaborador: ${nomeAtual} | Dia: ${dataStr.split('-').reverse().join('/')}`;

    const ocorrencias = JSON.parse(localStorage.getItem('ocorrencias') || '[]');
    const ocorrenciaDoDia = ocorrencias.find(o => o.funcionarioCpf === cpf && o.dataInicio === dataStr);

    document.getElementById('edit-ocorrencia-tipo').value = ocorrenciaDoDia ? ocorrenciaDoDia.tipo : "Falta Injustificada";
    document.getElementById('edit-observacao').value = ocorrenciaDoDia ? (ocorrenciaDoDia.observacao || "") : "";

    const pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');
    const pontosDoDia = pontos
        .map((p, idx) => ({ ...p, _idx: idx }))
        .filter(p => p.cpf === cpf && dataStrDoPonto(p) === dataStr)
        .sort((a, b) => new Date(a.horario) - new Date(b.horario));

    renderizarLinhasPontosModal(pontosDoDia);
    document.getElementById('modal-edicao').style.display = "flex";
};

// Adiciona um registro novo pro dia em tratamento (ex: esqueceu de bater a saída)
window.adicionarLinhaPontoModal = function () {
    if (!cpfModalAtual || !dataModalAtual) return;

    const pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');
    const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');
    const funcionario = funcionarios.find(f => f.cpf === cpfModalAtual);

    const pontosDoDia = pontos.filter(p => p.cpf === cpfModalAtual && dataStrDoPonto(p) === dataModalAtual);
    const jaTemEntrada = pontosDoDia.some(p => p.tipo === 'Entrada');
    const jaTemSaida = pontosDoDia.some(p => p.tipo === 'Saída');

    let tipoSugerido = 'Entrada';
    if (jaTemEntrada && !jaTemSaida) tipoSugerido = 'Saída';
    else if (jaTemEntrada && jaTemSaida) tipoSugerido = pontosDoDia.length % 2 === 0 ? 'Entrada' : 'Saída';

    const [ano, mes, dia] = dataModalAtual.split('-').map(Number);
    const dataLocalFixa = new Date(ano, mes - 1, dia, 8, 0, 0);

    const novoRegistro = {
        cpf: cpfModalAtual,
        nome: funcionario ? (funcionario.nome || funcionario.Nome || "") : "",
        unidade: funcionario ? (funcionario.unidade || funcionario.Unidade || "") : "",
        horario: dataLocalFixa.toISOString(),
        tipo: tipoSugerido
    };

    pontos.push(novoRegistro);
    localStorage.setItem('meusPontos', JSON.stringify(pontos));

    abrirTratamentoDireto(cpfModalAtual, dataModalAtual);
};

// Exclui apenas UM registro específico do dia (não afeta os demais)
window.excluirLinhaPontoModal = function (idx) {
    if (!confirm("Remover este registro de ponto?")) return;

    const pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');
    const removido = pontos[idx];
    pontos.splice(idx, 1);
    localStorage.setItem('meusPontos', JSON.stringify(pontos));

    const nomeRemovido = removido?.nome || removido?.colaborador || removido?.cpf || "desconhecido";
    registrarLog("admin", `Excluiu registro de ponto (${removido?.tipo}) de ${nomeRemovido}`);

    abrirTratamentoDireto(cpfModalAtual, dataModalAtual);
    atualizarVisualizacaoMaster();

    if (typeof window.sincronizarSilencioso === "function") window.sincronizarSilencioso();
};

window.salvarEdicaoModal = function () {
    const observacao = document.getElementById('edit-observacao').value.trim();
    const tipoOcorrencia = document.getElementById('edit-ocorrencia-tipo').value;

    const pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');
    const linhas = document.querySelectorAll('#lista-pontos-dia .linha-ponto-modal');

    let algumInvalido = false;

    linhas.forEach(linha => {
        const idx = Number(linha.dataset.idx);
        const novaDataHora = linha.querySelector('.ponto-horario-input').value;
        const novoTipo = linha.querySelector('.ponto-tipo-input').value;

        if (!novaDataHora) {
            algumInvalido = true;
            return;
        }

        const [dataParte, horaParte] = novaDataHora.split('T');
        const [ano, mes, dia] = dataParte.split('-').map(Number);
        const [hora, minuto] = horaParte.split(':').map(Number);
        const novaData = new Date(ano, mes - 1, dia, hora, minuto, 0);

        if (isNaN(novaData.getTime())) {
            algumInvalido = true;
            return;
        }

        pontos[idx].horario = novaData.toISOString();
        pontos[idx].tipo = novoTipo;
    });

    if (algumInvalido) {
        return alert("Preencha data e hora válidas em todos os registros antes de salvar!");
    }

    localStorage.setItem('meusPontos', JSON.stringify(pontos));

    // Upsert da ocorrência do dia: remove a antiga (se houver) e adiciona a nova,
    // evitando acumular ocorrências duplicadas a cada vez que o modal é salvo.
    const ocorrencias = JSON.parse(localStorage.getItem('ocorrencias') || '[]');
    const ocorrenciasFiltradas = ocorrencias.filter(o => !(o.funcionarioCpf === cpfModalAtual && o.dataInicio === dataModalAtual));

    if (tipoOcorrencia && tipoOcorrencia !== "Falta Injustificada") {
        ocorrenciasFiltradas.push({
            funcionarioCpf: cpfModalAtual,
            tipo: tipoOcorrencia,
            dataInicio: dataModalAtual,
            dataFim: dataModalAtual,
            observacao: observacao || "Justificado pelo gestor."
        });
    }
    localStorage.setItem('ocorrencias', JSON.stringify(ocorrenciasFiltradas));

    registrarLog("admin", `Tratou o dia ${dataModalAtual.split('-').reverse().join('/')} de ${cpfModalAtual}. Obs: ${observacao || 'sem obs.'}`);

    fecharModal();
    atualizarVisualizacaoMaster();

    if (typeof window.sincronizarSilencioso === "function") window.sincronizarSilencioso();
};

window.fecharModal = function () {
    document.getElementById('modal-edicao').style.display = "none";
};

// ======================================================
// HISTÓRICO DE OCORRÊNCIAS
// ======================================================
function renderizarHistoricoOcorrencias() {
    const table = document.getElementById('listaOcorrenciasGeral');
    if (!table) return;

    const ocorrencias = JSON.parse(localStorage.getItem('ocorrencias') || '[]');
    const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');

    table.innerHTML = ocorrencias.map((o, idx) => {
        const func = funcionarios.find(f => f.cpf === o.funcionarioCpf);
        const nomeFunc = func ? (func.nome || func.Nome) : "Desconhecido";
        return `
            <tr>
                <td><strong>${nomeFunc}</strong></td>
                <td>${o.tipo}</td>
                <td>${o.dataInicio.split('-').reverse().join('/')}</td>
                <td>${o.dataFim.split('-').reverse().join('/')}</td>
                <td><em>${o.observacao || ""}</em></td>
                <td><button onclick="removerOcorrencia(${idx})" class="btn-cancelar">❌ Deletar</button></td>
            </tr>
        `;
    }).join('');
}

window.removerOcorrencia = function (index) {
    if (!confirm("Remover esta ocorrência do histórico?")) return;
    const ocorrencias = JSON.parse(localStorage.getItem('ocorrencias') || '[]');
    const removida = ocorrencias[index];
    ocorrencias.splice(index, 1);
    localStorage.setItem('ocorrencias', JSON.stringify(ocorrencias));

    registrarLog("admin", `Excluiu ocorrência (${removida.tipo}) do funcionário CPF: ${removida.funcionarioCpf}`);
    atualizarVisualizacaoMaster();

    if (typeof window.sincronizarSilencioso === "function") window.sincronizarSilencioso();
};

// ======================================================
// ATUALIZAÇÃO DOS CARDS DO DASHBOARD
// ======================================================
function renderizarDashboard() {
    const totalFunc = document.getElementById('card-total-func');
    if (!totalFunc) return;

    const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');
    const pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');
    const ocorrencias = JSON.parse(localStorage.getItem('ocorrencias') || '[]');

    totalFunc.innerText = funcionarios.length;

    const hojeStr = new Date().toLocaleDateString('en-CA');
    const batidasHoje = pontos.filter(p => p.horario.startsWith(hojeStr)).length;
    document.getElementById('card-registros-hoje').innerText = batidasHoje;

    const afastadosHoje = ocorrencias.filter(o => hojeStr >= o.dataInicio && hojeStr <= o.dataFim).length;
    document.getElementById('card-atestados-hoje').innerText = afastadosHoje;

    let alertasCriticos = 0;
    funcionarios.forEach(f => {
        const pDia = pontos.filter(p => p.cpf === f.cpf && p.horario.startsWith(hojeStr));
        if (pDia.length % 2 !== 0) alertasCriticos++;
    });
    document.getElementById('card-alertas-criticos').innerText = alertasCriticos;
}

// ======================================================
// AUXILIARES CONVERSORES DE TEMPO
// ======================================================
function converterHoraParaMinutos(horaStr) {
    if (!horaStr) return 480; // Default 8 horas
    const [h, m] = horaStr.split(':').map(Number);
    return (h * 60) + m;
}

function converterMinutosParaHoraString(minutosTotais) {
    const sinal = minutosTotais < 0 ? "-" : "";
    const minsAbsolutos = Math.abs(minutosTotais);
    const horas = Math.floor(minsAbsolutos / 60);
    const minutos = minsAbsolutos % 60;
    return `${sinal}${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

// ======================================================
// EXPORTADOR EM CSV COMPATÍVEL COM EXCEL
// ======================================================
window.exportarRelatorioExcel = function() {
    const filtroFuncCpf = document.getElementById('filtro-funcionario-extrato')?.value;
    const filtroMes = document.getElementById('filtro-mes-extrato')?.value;

    if (!filtroFuncCpf) {
        return alert("Por favor, selecione um funcionário específico no filtro antes de exportar!");
    }
    if (!filtroMes) {
        return alert("Por favor, selecione o mês antes de exportar!");
    }

    const [ano, mes] = filtroMes.split('-').map(Number);
    const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');
    const funcionario = funcionarios.find(f => f.cpf === filtroFuncCpf);
    
    if (!funcionario) return alert("Funcionário não encontrado.");

    const nomeAtual = funcionario.nome || funcionario.Nome || "";
    const unidadeAtual = funcionario.unidade || funcionario.Unidade || "";
    const jornadaMinutos = converterHoraParaMinutos(funcionario.jornada || funcionario.Jornada || "08:00");

    const pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');
    const ocorrencias = JSON.parse(localStorage.getItem('ocorrencias') || '[]');

    const totalDiasNoMes = new Date(ano, mes, 0).getDate();
    
    const mesesNomes = ["JANERO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    const nomeMesCorrente = mesesNomes[mes - 1];

    const janelaImpressao = window.open('', '_blank');
    
    let conteudoTabelaHTML = "";

    for (let dia = 1; dia <= totalDiasNoMes; dia++) {
        const dataAtualStr = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const dataFormatadaExibir = `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;
        
        const objetoData = new Date(ano, mes - 1, dia);
        const ehFimDeSemana = (objetoData.getDay() === 0 || objetoData.getDay() === 6);

        const pontosDoDia = pontos.filter(p => {
            const pData = new Date(p.horario);
            const pDataStr = `${pData.getFullYear()}-${String(pData.getMonth()+1).padStart(2,'0')}-${String(pData.getDate()).padStart(2,'0')}`;
            return p.cpf === filtroFuncCpf && pDataStr === dataAtualStr;
        }).sort((a,b) => new Date(a.horario) - new Date(b.horario));

        const ocorrenciaDoDia = ocorrencias.find(o => o.funcionarioCpf === filtroFuncCpf && dataAtualStr >= o.dataInicio && dataAtualStr <= o.dataFim);

        let entradaStr = "--:--";
        let saidaStr = "--:--";
        let trabalhadoMinutos = 0;

        const entradaPonto = pontosDoDia.find(p => p.tipo === "Entrada");
        const saidaPonto = pontosDoDia.find(p => p.tipo === "Saída");

        if(entradaPonto) entradaStr = new Date(entradaPonto.horario).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        if(saidaPonto)  saidaStr = new Date(saidaPonto.horario).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});

        if (entradaPonto && saidaPonto) {
            const ent = new Date(entradaPonto.horario);
            const sai = new Date(saidaPonto.horario);
            trabalhadoMinutos = Math.floor((sai - ent) / 60000);
            if (trabalhadoMinutos < 0) trabalhadoMinutos = 0;
        }

        let horasTrabalhadasFormatada = "00:00:00";
        if (ocorrenciaDoDia && ocorrenciaDoDia.tipo === "Curso") {
            horasTrabalhadasFormatada = "CURSO";
        } else if (trabalhadoMinutos > 0) {
            const hrs = Math.floor(trabalhadoMinutos / 60);
            const mins = trabalhadoMinutos % 60;
            horasTrabalhadasFormatada = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
        } else if (ocorrenciaDoDia) {
            horasTrabalhadasFormatada = ocorrenciaDoDia.tipo.toUpperCase();
        } else if (ehFimDeSemana) {
            horasTrabalhadasFormatada = "FOLGA";
        }

        // Conforme a imagem, finais de semana sem registros não aparecem na lista
        if (ehFimDeSemana && trabalhadoMinutos === 0) {
            continue; 
        }

        // Gera exatamente a linha estruturada da tabela
        conteudoTabelaHTML += `
            <tr>
                <td style="width: 40%; text-align: left; padding-left: 15px;">${nomeAtual}</td>
                <td style="width: 12%;">${unidadeAtual}</td>
                <td style="width: 16%;">${dataFormatadaExibir}</td>
                <td style="width: 10%;">${entradaStr}</td>
                <td style="width: 10%;">${saidaStr}</td>
                <td style="width: 12%; font-weight: bold;">${horasTrabalhadasFormatada}</td>
            </tr>
        `;
    }

    janelaImpressao.document.write(`
        <html>
        <head>
            <title>Folha de ponto Mês de ${nomeMesCorrente}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    color: #333;
                    padding: 30px;
                    margin: 0;
                }
                .container-cabecalho {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    position: relative;
                    margin-bottom: 25px;
                    width: 100%;
                    max-width: 900px;
                    margin-left: auto;
                    margin-right: auto;
                }
                .titulo-folha {
                    font-size: 26px;
                    color: #777777;
                    font-weight: normal;
                    text-align: center;
                }
                .logo-empresa {
                    position: absolute;
                    right: 0;
                    height: 45px;
                    display: flex;
                    gap: 5px;
                    align-items: center;
                }
                /* Estilização exata da tabela da imagem */
                .tabela-ponto {
                    width: 100%;
                    max-width: 900px;
                    margin: 0 auto;
                    border-collapse: collapse;
                }
                .tabela-ponto td {
                    border: 1px solid #000000;
                    padding: 8px 5px;
                    text-align: center;
                    font-size: 14px;
                    height: 24px;
                }
                .area-assinatura-bloco {
                    margin-top: 120px;
                    text-align: center;
                    width: 100%;
                }
                .linha-assinatura {
                    width: 60%;
                    margin: 0 auto;
                    border-bottom: 1px solid #000000;
                    margin-bottom: 8px;
                }
                .texto-assinatura {
                    font-family: Arial, sans-serif;
                    font-weight: bold;
                    font-size: 14px;
                    color: #000;
                }
                @media print {
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            
            <!-- CABEÇALHO IGUAL À IMAGEM -->
            <div class="container-cabecalho">
                <div class="titulo-folha">Folha de ponto Mês de ${nomeMesCorrente}</div>
                <div class="logo-empresa">
                    <!-- Espaço reservado para manter a mesma estrutura visual do logo SGI/DOLP -->
                    <span style="font-weight: bold; color: #d9381e; font-size: 20px;">SGI</span>
                    <span style="color: #2b4c7e; font-size: 20px;">DOLP</span>
                </div>
            </div>
            
            <!-- TABELA BORDADA DA IMAGEM -->
            <table class="tabela-ponto">
                <tbody>
                    ${conteudoTabelaHTML}
                </tbody>
            </table>

            <!-- BLOCO DE ASSINATURA CENTRALIZADO NO RODAPÉ -->
            <div class="area-assinatura-bloco">
                <div class="linha-assinatura"></div>
                <div class="texto-assinatura">Assinatura</div>
            </div>

            <script>
                window.onload = function() {
                    window.print();
                }
            <\/script>
        </body>
        </html>
    `);

    janelaImpressao.document.close();
};
