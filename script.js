// ======================================================
// CONFIGURAÇÕES GERAIS E SEGURANÇA
// ======================================================
const SENHA_MESTRE = "SmartPonto@2026";
let cpfModalAtual = null;
let dataModalAtual = null;

// ======================================================
// INICIALIZAÇÃO DO SISTEMA
// ======================================================
document.addEventListener("DOMContentLoaded", async () => {

    configurarMesAtual();

    // Restaura os dados da nuvem antes de renderizar
    try {
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
    renderizarDashboard();
    renderizarLogs();

    document.getElementById('cad-cpf')?.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
    });
    document.getElementById('cad-pin')?.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
    });

    if (sessionStorage.getItem('gestorLogado') === 'true') {
        ativarModoGestor();
    }
});

function configurarMesAtual() {
    const inputMes = document.getElementById('filtro-mes-extrato');
    if (inputMes && !inputMes.value) {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        inputMes.value = `${ano}-${mes}`;
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
        }
    } catch (erro) {
        console.error("Erro na atualização automática:", erro);
    }
}, 10000);

// ======================================================
// SISTEMA DE AUDITORIA AUTOMÁTICA (LOGS)
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
}

// ======================================================
// LOGIN E SEGURANÇA
// ======================================================
function abrirLogin() { document.getElementById('tela-login').style.display = 'flex'; }
function fecharLogin() { document.getElementById('tela-login').style.display = 'none'; }

function autenticarGestor() {
    const user = document.getElementById('login-usuario').value.trim();
    const pass = document.getElementById('login-senha').value.trim();

    if (user === "admin" && pass === SENHA_MESTRE) {
        sessionStorage.setItem('gestorLogado', 'true');
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
// ======================================================
function baterPonto(tipo) {
    const identificador = document.getElementById('identificador-ponto').value.trim();
    if (!identificador) return alert("Por favor, digite seu PIN ou CPF");

    const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');
    const funcionario = funcionarios.find(f => f.cpf === identificador || f.pin === identificador);

    if (!funcionario) return alert("❌ Colaborador não cadastrado!");

    const pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');

    const ultimoRegistro = pontos
        .filter(p => p.cpf === funcionario.cpf)
        .sort((a, b) => new Date(a.horario) - new Date(b.horario))
        .slice(-1)[0];

    if (ultimoRegistro && ultimoRegistro.tipo === tipo) {
        alert(`⚠️ Operação Bloqueada! Seu último registro já foi uma ${tipo}.`);
        return;
    }

    const nomeNormalizado = funcionario.nome || funcionario.Nome || "Funcionário Sem Nome";
    const unidadeNormalizada = funcionario.unidade || funcionario.Unidade || "Não Definida";

    let agora = new Date();

    // Ajuste de fuso horário Cuiabá (-1h em relação ao horário do sistema)
    if (unidadeNormalizada === "Cuiabá") {
        agora.setHours(agora.getHours() - 1);
    }

    const novoRegistro = {
        cpf: funcionario.cpf,
        nome: nomeNormalizado,
        unidade: unidadeNormalizada,
        horario: agora.toISOString(),
        tipo: tipo
    };

    pontos.push(novoRegistro);
    localStorage.setItem('meusPontos', JSON.stringify(pontos));
    document.getElementById('identificador-ponto').value = "";

    alert(`✅ Ponto de ${tipo} batido com sucesso!\n${nomeNormalizado}`);
    atualizarVisualizacaoMaster();

    if (typeof window.sincronizarSilencioso === "function") window.sincronizarSilencioso();
}

// ======================================================
// CADASTRO DE FUNCIONÁRIOS
// ======================================================
window.salvarFuncionario = function () {
    const nome = document.getElementById('cad-nome').value.trim();
    const cpf = document.getElementById('cad-cpf').value.replace(/\D/g, '');
    const pin = document.getElementById('cad-pin').value.replace(/\D/g, '');
    const unidade = document.getElementById('cad-unidade').value;
    const jornada = document.getElementById('cad-jornada').value;

    if (!nome || cpf.length !== 11 || pin.length !== 4) {
        return alert("Preencha todos os dados corretamente! CPF deve ter 11 dígitos e PIN 4 dígitos.");
    }

    const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');

    if (funcionarios.some(f => f.cpf === cpf)) {
        return alert("⚠️ CPF já cadastrado!");
    }
    if (funcionarios.some(f => f.pin === pin)) {
        return alert("⚠️ PIN já está em uso por outro colaborador!");
    }

    funcionarios.push({ nome, cpf, pin, unidade, jornada });
    localStorage.setItem('funcionarios', JSON.stringify(funcionarios));

    alert("✅ Colaborador cadastrado!");
    registrarLog("admin", `Cadastrou o funcionário: ${nome} (CPF: ${cpf})`);

    document.getElementById('cad-nome').value = "";
    document.getElementById('cad-cpf').value = "";
    document.getElementById('cad-pin').value = "";

    carregarSeletores();
    atualizarVisualizacaoMaster();

    if (typeof window.sincronizarSilencioso === "function") window.sincronizarSilencioso();
};

window.excluirFuncionario = function (cpf) {
    if (!confirm("Deseja deletar este colaborador?")) return;
    let funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');
    const func = funcionarios.find(f => f.cpf === cpf);
    funcionarios = funcionarios.filter(f => f.cpf !== cpf);
    localStorage.setItem('funcionarios', JSON.stringify(funcionarios));

    registrarLog("admin", `Excluiu o funcionário: ${func ? func.nome : cpf}`);
    carregarSeletores();
    atualizarVisualizacaoMaster();

    if (typeof window.sincronizarSilencioso === "function") window.sincronizarSilencioso();
};

// ======================================================
// COMPONENTES DOS FILTROS E CARREGADORES
// ======================================================
function carregarSeletores() {
    const seletorExtrato = document.getElementById('filtro-funcionario-extrato');
    if (!seletorExtrato) return;

    const valorAtual = seletorExtrato.value;
    const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');
    seletorExtrato.innerHTML = '<option value="">Escolha um Colaborador para o Calendário...</option>' +
        funcionarios.map(f => `<option value="${f.cpf}">${f.nome || f.Nome} [${f.unidade || f.Unidade}]</option>`).join('');

    if (valorAtual && funcionarios.some(f => f.cpf === valorAtual)) {
        seletorExtrato.value = valorAtual;
    }
}

// ======================================================
// CONTROLE MASTER DE PROCESSAMENTO E RENDERIZAÇÃO
// ======================================================
window.atualizarVisualizacaoMaster = function () {
    renderizarTabelaPontoSimples();
    renderizarFuncionariosCadastro();
    renderizarHistoricoOcorrencias();
    gerarRelatorioMensalConsolidado();
    renderizarDashboard();
    renderizarLogs();
};

function renderizarTabelaPontoSimples() {
    const table = document.getElementById('tabelaPontos');
    if (!table) return;
    const pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');

    table.innerHTML = pontos.slice(-5).reverse().map(p => `
        <tr>
            <td>${p.nome || p.colaborador || "Não Identificado"}</td>
            <td>${p.unidade || "Sede"}</td>
            <td>${new Date(p.horario).toLocaleTimeString('pt-BR')}</td>
            <td><span class="badge ${p.tipo === 'Entrada' ? 'badge-verde' : 'badge-vermelha'}">${p.tipo}</span></td>
        </tr>
    `).join('');
}

function renderizarFuncionariosCadastro() {
    const table = document.getElementById('listaFuncionarios');
    if (!table) return;
    const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');
    table.innerHTML = funcionarios.map(f => `
        <tr>
            <td>${f.cpf}</td>
            <td><strong>${f.nome || f.Nome}</strong></td>
            <td>${f.unidade || f.Unidade}</td>
            <td>Jornada: ${f.jornada || f.Jornada}h</td>
            <td><button onclick="excluirFuncionario('${f.cpf}')" class="btn-cancelar">❌ Remover</button></td>
        </tr>
    `).join('');
}

// ======================================================
// PROCESSAMENTO DAS HORAS EXTRAS / NEGATIVAS E CALENDÁRIO VISUAL
// Regras: fim de semana sem ponto e sem ocorrência = neutro (DSR),
// dia com ocorrência "Curso" = jornada cumprida (sem saldo negativo),
// dia de semana sem ponto e sem ocorrência = falta (saldo negativo).
// ======================================================
function gerarRelatorioMensalConsolidado() {
    const listaBancoHoras = document.getElementById('listaBancoHoras');
    const gradeCalendario = document.getElementById('grade-calendario-ponto');
    if (!listaBancoHoras) return;

    const busca = document.getElementById('busca-extrato')?.value.toLowerCase() || '';
    const unidadeFiltro = document.getElementById('filtro-unidade-extrato')?.value || '';
    const funcionarioAlvoCpf = document.getElementById('filtro-funcionario-extrato')?.value || '';
    const filtroMes = document.getElementById('filtro-mes-extrato').value;

    if (!filtroMes) return;

    const [ano, mes] = filtroMes.split('-').map(Number);
    const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');
    const pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');
    const ocorrencias = JSON.parse(localStorage.getItem('ocorrencias') || '[]');

    let htmlTabela = "";
    let minutosTotaisTrabalhados = 0;
    let minutosSaldoAcumulado = 0;

    const totalDiasNoMes = new Date(ano, mes, 0).getDate();
    const registrosAgrupadosPorDia = {};

    for (let d = 1; d <= totalDiasNoMes; d++) {
        const dataString = `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        registrosAgrupadosPorDia[dataString] = { pontosDia: [], ocorrencia: null };
    }

    funcionarios.forEach(funcionario => {
        const nomeAtual = funcionario.nome || funcionario.Nome || "";
        const unidadeAtual = funcionario.unidade || funcionario.Unidade || "";

        if (busca && !nomeAtual.toLowerCase().includes(busca)) return;
        if (unidadeFiltro && unidadeAtual !== unidadeFiltro) return;

        const jornadaMinutos = converterHoraParaMinutos(funcionario.jornada || funcionario.Jornada || "08:00");

        for (let dia = 1; dia <= totalDiasNoMes; dia++) {
            const dataAtualStr = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

            const objetoData = new Date(ano, mes - 1, dia);
            const diaDaSemana = objetoData.getDay();
            const ehFimDeSemana = (diaDaSemana === 0 || diaDaSemana === 6);

            const pontosDoDia = pontos.filter(p => {
                const pData = new Date(p.horario);
                const pDataStr = `${pData.getFullYear()}-${String(pData.getMonth() + 1).padStart(2, '0')}-${String(pData.getDate()).padStart(2, '0')}`;
                return p.cpf === funcionario.cpf && pDataStr === dataAtualStr;
            }).sort((a, b) => new Date(a.horario) - new Date(b.horario));

            const ocorrenciaDoDia = ocorrencias.find(o => {
                return o.funcionarioCpf === funcionario.cpf && dataAtualStr >= o.dataInicio && dataAtualStr <= o.dataFim;
            });

            if (funcionario.cpf === funcionarioAlvoCpf) {
                registrosAgrupadosPorDia[dataAtualStr] = { pontosDia: pontosDoDia, ocorrencia: ocorrenciaDoDia };
            }

            let entradaStr = "--:--";
            let saidaStr = "--:--";
            let trabalhadoMinutos = 0;

            const entradaPonto = pontosDoDia.find(p => p.tipo === "Entrada");
            const saidaPonto = pontosDoDia.find(p => p.tipo === "Saída");

            if (entradaPonto) entradaStr = new Date(entradaPonto.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            if (saidaPonto) saidaStr = new Date(saidaPonto.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            if (entradaPonto && saidaPonto) {
                const ent = new Date(entradaPonto.horario);
                const sai = new Date(saidaPonto.horario);
                const minutos = Math.floor((sai - ent) / 60000);
                trabalhadoMinutos = minutos > 0 ? minutos : 0;

                if (funcionario.cpf === funcionarioAlvoCpf) {
                    minutosTotaisTrabalhados += trabalhadoMinutos;
                }
            }

            let saldoDoDia = 0;

            if (ocorrenciaDoDia && ocorrenciaDoDia.tipo === "Curso") {
                saldoDoDia = 0; // Curso: jornada cumprida, saldo neutro
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

            if (funcionario.cpf === funcionarioAlvoCpf) {
                minutosSaldoAcumulado += saldoDoDia;
            }

            if (!funcionarioAlvoCpf || funcionario.cpf === funcionarioAlvoCpf) {
                const dataFormatadaExibir = `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;
                const clSaldo = saldoDoDia > 0 ? "color: green;" : (saldoDoDia < 0 ? "color: red;" : "color: #7f8c8d;");
                const exibicaoTrabalhado = (ocorrenciaDoDia && ocorrenciaDoDia.tipo === "Curso") ? "CURSO" : converterMinutosParaHoraString(trabalhadoMinutos);
                const sinalSaldo = saldoDoDia > 0 ? "+" : "";

                htmlTabela += `
                    <tr style="${ehFimDeSemana && trabalhadoMinutos === 0 ? 'background-color:#fcfcfc; opacity:0.85;' : ''}">
                        <td>${dataFormatadaExibir} ${ehFimDeSemana ? '<span style="font-size:10px; color:#aaa;">(FDS)</span>' : ''}</td>
                        <td>${nomeAtual}</td>
                        <td>${unidadeAtual}</td>
                        <td>${entradaStr}</td>
                        <td>${saidaStr}</td>
                        <td><strong>${exibicaoTrabalhado}</strong></td>
                        <td style="${clSaldo}"><strong>${sinalSaldo}${converterMinutosParaHoraString(saldoDoDia)}</strong></td>
                        <td>
                            <button onclick="abrirTratamentoDireto('${funcionario.cpf}', '${dataAtualStr}')" class="btn-nuvem">✏️ Tratar</button>
                        </td>
                    </tr>
                `;
            }
        }
    });

    listaBancoHoras.innerHTML = htmlTabela || '<tr><td colspan="8">Nenhum dado encontrado para os filtros selecionados.</td></tr>';

    // RENDERIZADOR DO CALENDÁRIO VISUAL
    if (gradeCalendario) {
        if (!funcionarioAlvoCpf) {
            gradeCalendario.innerHTML = `<div style="grid-column: span 7; padding: 20px; color: #7f8c8d;">Selecione um funcionário específico acima para visualizar o mapa do calendário.</div>`;
            document.getElementById('resumo-horas-trabalhadas').innerText = "00:00";
            document.getElementById('resumo-horas-extras').innerText = "00:00";
            document.getElementById('resumo-horas-negativas').innerText = "00:00";
            document.getElementById('resumo-saldo-final').innerText = "00:00";
        } else {
            let htmlCalendario = "";
            const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
            diasSemana.forEach(ds => htmlCalendario += `<div style="font-weight:bold; padding: 5px; background:#eee; border-radius:3px;">${ds}</div>`);

            const primeiroDiaSemanaIndex = new Date(ano, mes - 1, 1).getDay();
            for (let i = 0; i < primeiroDiaSemanaIndex; i++) {
                htmlCalendario += `<div></div>`;
            }

            for (let d = 1; d <= totalDiasNoMes; d++) {
                const dStr = `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dadosDia = registrosAgrupadosPorDia[dStr];

                const objetoData = new Date(ano, mes - 1, d);
                const ehFimDeSemana = (objetoData.getDay() === 0 || objetoData.getDay() === 6);

                let corFundo = "#e74c3c";
                let corTexto = "#fff";
                let legendaTooltip = "Falta ou Sem Marcação";

                if (ehFimDeSemana && dadosDia.pontosDia.length === 0 && !dadosDia.ocorrencia) {
                    corFundo = "#f1f2f6";
                    corTexto = "#a4b0be";
                    legendaTooltip = "Final de Semana / DSR";
                } else if (dadosDia.pontosDia.length >= 2) {
                    corFundo = "#2ecc71";
                    legendaTooltip = "Ponto Registrado";
                } else if (dadosDia.ocorrencia) {
                    if (dadosDia.ocorrencia.tipo === "Curso") corFundo = "#9b59b6";
                    else if (dadosDia.ocorrencia.tipo === "Atestado Médico") corFundo = "#f1c40f";
                    else if (dadosDia.ocorrencia.tipo === "Folga" || dadosDia.ocorrencia.tipo === "Férias") corFundo = "#3498db";
                    else corFundo = "#95a5a6";
                    legendaTooltip = dadosDia.ocorrencia.tipo;
                }

                htmlCalendario += `
                    <div onclick="abrirTratamentoDireto('${funcionarioAlvoCpf}', '${dStr}')"
                         title="${legendaTooltip}"
                         style="background: ${corFundo}; color: ${corTexto}; padding: 10px 5px; border-radius: 4px; font-weight: bold; cursor: pointer; transition: 0.2s; text-align:center; margin:2px;"
                         onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                        ${d}
                    </div>
                `;
            }
            gradeCalendario.innerHTML = htmlCalendario;

            document.getElementById('resumo-horas-trabalhadas').innerText = converterMinutosParaHoraString(minutosTotaisTrabalhados);
            if (minutosSaldoAcumulado >= 0) {
                document.getElementById('resumo-horas-extras').innerText = converterMinutosParaHoraString(minutosSaldoAcumulado);
                document.getElementById('resumo-horas-negativas').innerText = "00:00";
                document.getElementById('resumo-saldo-final').innerText = `+${converterMinutosParaHoraString(minutosSaldoAcumulado)}`;
                document.getElementById('resumo-saldo-final').style.color = "green";
            } else {
                document.getElementById('resumo-horas-extras').innerText = "00:00";
                document.getElementById('resumo-horas-negativas').innerText = converterMinutosParaHoraString(Math.abs(minutosSaldoAcumulado));
                document.getElementById('resumo-saldo-final').innerText = `-${converterMinutosParaHoraString(Math.abs(minutosSaldoAcumulado))}`;
                document.getElementById('resumo-saldo-final').style.color = "red";
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
