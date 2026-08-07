const SENHA_MESTRE = "admin123";
let indexEdicaoGlobal = null;
let cpfTratamentoGlobal = null;
let dataTratamentoGlobal = null;

// ======================================================
// INICIALIZAÇÃO DO SISTEMA
// ======================================================

window.addEventListener('load', async () => {
    console.log("🔄 Iniciando SmartPonto...");

    try {
        if (typeof window.recuperarDadosNuvem === "function") {
            await window.recuperarDadosNuvem();
        }

        carregarSeletores();
        atualizarVisualizacaoMaster();

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

setInterval(async () => {
    try {
        if (typeof window.recuperarDadosNuvem === "function") {
            await window.recuperarDadosNuvem();
            atualizarVisualizacaoMaster();
            console.log("☁️ Sistema sincronizado automaticamente");
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
    const menuAdmin = document.getElementById('menu-admin');
    const dashGestor = document.getElementById('dashboard-gestor');
    const btnLogin = document.getElementById('btn-login-admin');
    const btnSair = document.getElementById('btn-sair-admin');

    if (menuAdmin) menuAdmin.style.display = 'block';
    if (dashGestor) dashGestor.style.display = 'grid';
    if (btnLogin) btnLogin.style.display = 'none';
    if (btnSair) btnSair.style.display = 'block';

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
// REGISTRO DE PONTO (CORRIGIDO E INTEGRADO COM O BANCO)
// ======================================================
async function baterPonto(tipo) {
    const input = document.getElementById('identificador-ponto');
    const entrada = input ? input.value.trim() : '';
    const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');

    let funcionario = null;

    if (entrada.length === 4) {
        funcionario = funcionarios.find(f => f.pin === entrada);
    } else if (entrada.length === 11) {
        funcionario = funcionarios.find(f => f.cpf === entrada);
    } else {
        alert("Digite o PIN (4 dígitos) ou CPF (11 números)");
        return;
    }

    if (!funcionario) {
        alert("❌ Funcionário não encontrado");
        return;
    }

    let pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');
    let agora = new Date();

    // Ajuste do fuso horário para a unidade de Cuiabá (-1 hora)
    if (funcionario.unidade === "Cuiabá" || funcionario.Unidade === "Cuiabá") {
        agora.setHours(agora.getHours() - 1);
    }

    const novoRegistro = {
        colaborador: funcionario.nome || funcionario.Nome,
        cpf: funcionario.cpf,
        unidade: funcionario.unidade || funcionario.Unidade,
        horario: agora.toISOString(),
        tipo: tipo
    };

    // 1. Salva no navegador local (localStorage)
    pontos.push(novoRegistro);
    localStorage.setItem('meusPontos', JSON.stringify(pontos));

    // 2. Atualiza a tela imediatamente
    if (typeof atualizarVisualizacaoMaster === 'function') {
        atualizarVisualizacaoMaster();
    }

    // 3. ENVIO BLINDADO PARA O BANCO DE DADOS (FIREBASE)
    try {
        if (typeof sincronizarComFirebase === 'function') {
            await sincronizarComFirebase();
            console.log("✅ Ponto sincronizado com o Firebase com sucesso!");
        } else if (typeof window.sincronizarComFirebase === 'function') {
            await window.sincronizarComFirebase();
            console.log("✅ Ponto sincronizado com o Firebase com sucesso!");
        }
    } catch (erro) {
        console.error("⚠️ Erro ao enviar ponto para o Banco de Dados Firebase:", erro);
    }

    // 4. Limpa o campo de entrada e confirma ao usuário
    if (input) input.value = "";
    alert(`✅ ${tipo} registrado com sucesso para ${funcionario.nome || funcionario.Nome}`);
}

// ======================================================
// GERENCIAMENTO DE FUNCIONÁRIOS
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

    if (funcionarios.some(f => f.cpf === cpf)) {
        alert("⚠️ CPF já cadastrado");
        return;
    }

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

// ======================================================
// // ======================================================
// AJUSTES, CALENDÁRIO E MODAL DE EDIÇÃO / JUSTIFICATIVA
// ======================================================

function abrirTratamentoDireto(cpf, dataStr) {
    cpfTratamentoGlobal = cpf;
    dataTratamentoGlobal = dataStr;
    indexEdicaoGlobal = null;

    const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');
    const pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');
    const ocorrencias = JSON.parse(localStorage.getItem('ocorrencias') || '[]');

    const func = funcionarios.find(f => f.cpf === cpf);
    const nomeFunc = func ? (func.nome || func.Nome) : 'Colaborador';

    const [ano, mes, dia] = dataStr.split('-');
    const dataFormatada = `${dia}/${mes}/${ano}`;

    // Atualiza cabeçalho do Modal
    const elTitulo = document.getElementById('modal-titulo');
    const elNome = document.getElementById('modal-nome');
    if (elTitulo) elTitulo.innerText = "✏️ Tratar Ponto / Lançar Horários";
    if (elNome) elNome.innerText = `${nomeFunc} — Dia ${dataFormatada}`;

    // Filtra todos os pontos registrados neste dia especificamente
    const pontosDoDia = pontos.filter(p => {
        if (p.cpf !== cpf) return false;
        const pData = new Date(p.horario);
        const pDataStr = `${pData.getFullYear()}-${String(pData.getMonth() + 1).padStart(2, '0')}-${String(pData.getDate()).padStart(2, '0')}`;
        return pDataStr === dataStr;
    });

    // Procura registro de Entrada e Saída pré-existentes
    const pontoEntrada = pontosDoDia.find(p => p.tipo === "Entrada");
    const pontoSaida = pontosDoDia.find(p => p.tipo === "Saída" || p.tipo === "Saída para Curso");

    const inputEntrada = document.getElementById('edit-hora-entrada');
    const inputSaida = document.getElementById('edit-hora-saida');

    // Preenche com o horário existente ou deixa em branco para preenchimento manual
    if (inputEntrada) {
        if (pontoEntrada) {
            const d = new Date(pontoEntrada.horario);
            inputEntrada.value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        } else {
            inputEntrada.value = ""; 
        }
    }

    if (inputSaida) {
        if (pontoSaida) {
            const d = new Date(pontoSaida.horario);
            inputSaida.value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        } else {
            inputSaida.value = ""; 
        }
    }

    // Carrega ocorrência/justificativa se houver
    const ocorrenciaDoDia = ocorrencias.find(o =>
        o.funcionarioCpf === cpf && dataStr >= o.dataInicio && dataStr <= o.dataFim
    );

    const selectTipoOcorrencia = document.getElementById('edit-ocorrencia-tipo');
    const inputObs = document.getElementById('edit-observacao');

    if (selectTipoOcorrencia) {
        selectTipoOcorrencia.value = ocorrenciaDoDia ? ocorrenciaDoDia.tipo : "Nenhuma";
    }
    if (inputObs) {
        inputObs.value = ocorrenciaDoDia ? (ocorrenciaDoDia.observacao || '') : '';
    }

    // Exibe o Modal
    const modal = document.getElementById('modal-edicao');
    if (modal) modal.style.display = 'flex';
}

function abrirModal(idx) {
    // Edição individual a partir da tabela de ajustes gerais
    const pontos = JSON.parse(localStorage.getItem("meusPontos") || "[]");
    indexEdicaoGlobal = idx;
    cpfTratamentoGlobal = null;
    dataTratamentoGlobal = null;

    const ponto = pontos[idx];
    document.getElementById('modal-nome').innerText = ponto.colaborador || ponto.nome;

    const data = new Date(ponto.horario);
    data.setMinutes(data.getMinutes() - data.getTimezoneOffset());

    const inputEntrada = document.getElementById('edit-hora-entrada');
    if (inputEntrada) {
        inputEntrada.value = `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
    }

    document.getElementById('modal-edicao').style.display = 'flex';
}

function fecharModal() {
    document.getElementById('modal-edicao').style.display = 'none';
    cpfTratamentoGlobal = null;
    dataTratamentoGlobal = null;
    indexEdicaoGlobal = null;
}

async function salvarEdicaoModal() {
    const obs = document.getElementById('edit-observacao')?.value.trim() || '';
    const tipoOcorrencia = document.getElementById('edit-ocorrencia-tipo')?.value || 'Nenhuma';
    const horaEntrada = document.getElementById('edit-hora-entrada')?.value;
    const horaSaida = document.getElementById('edit-hora-saida')?.value;

    if (cpfTratamentoGlobal && dataTratamentoGlobal) {
        let pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');
        let ocorrencias = JSON.parse(localStorage.getItem('ocorrencias') || '[]');
        const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');

        const func = funcionarios.find(f => f.cpf === cpfTratamentoGlobal);
        const nomeFunc = func ? (func.nome || func.Nome) : 'Colaborador';
        const unidadeFunc = func ? (func.unidade || func.Unidade) : 'Sede';

        // 1. Limpa os registros de ponto do dia selecionado para recriá-los sem duplicidade
        pontos = pontos.filter(p => {
            if (p.cpf !== cpfTratamentoGlobal) return true;
            const pData = new Date(p.horario);
            const pDataStr = `${pData.getFullYear()}-${String(pData.getMonth() + 1).padStart(2, '0')}-${String(pData.getDate()).padStart(2, '0')}`;
            return pDataStr !== dataTratamentoGlobal;
        });

        // 2. Se informou Horário de Entrada, adiciona o ponto
        if (horaEntrada) {
            const isoEntrada = `${dataTratamentoGlobal}T${horaEntrada}:00`;
            pontos.push({
                colaborador: nomeFunc,
                cpf: cpfTratamentoGlobal,
                unidade: unidadeFunc,
                horario: new Date(isoEntrada).toISOString(),
                tipo: "Entrada"
            });
        }

        // 3. Se informou Horário de Saída, adiciona o ponto (Trata também caso seja Saída para Curso)
        if (horaSaida) {
            const isoSaida = `${dataTratamentoGlobal}T${horaSaida}:00`;
            const tipoSaida = (tipoOcorrencia === "Saída para Curso") ? "Saída para Curso" : "Saída";
            pontos.push({
                colaborador: nomeFunc,
                cpf: cpfTratamentoGlobal,
                unidade: unidadeFunc,
                horario: new Date(isoSaida).toISOString(),
                tipo: tipoSaida
            });
        }

        localStorage.setItem('meusPontos', JSON.stringify(pontos));

        // 4. Salva ou atualiza a justificativa/ocorrência no sistema
        ocorrencias = ocorrencias.filter(o =>
            !(o.funcionarioCpf === cpfTratamentoGlobal && dataTratamentoGlobal >= o.dataInicio && dataTratamentoGlobal <= o.dataFim)
        );

        if (tipoOcorrencia && tipoOcorrencia !== "Nenhuma") {
            ocorrencias.push({
                funcionarioCpf: cpfTratamentoGlobal,
                tipo: tipoOcorrencia,
                dataInicio: dataTratamentoGlobal,
                dataFim: dataTratamentoGlobal,
                observacao: obs
            });
        }

        localStorage.setItem('ocorrencias', JSON.stringify(ocorrencias));

    } else if (indexEdicaoGlobal !== null) {
        // Ajuste direto na tabela individual
        let pontos = JSON.parse(localStorage.getItem("meusPontos") || "[]");
        if (horaEntrada) {
            const ponto = pontos[indexEdicaoGlobal];
            const dataOrigem = new Date(ponto.horario).toISOString().split('T')[0];
            ponto.horario = new Date(`${dataOrigem}T${horaEntrada}:00`).toISOString();
            localStorage.setItem("meusPontos", JSON.stringify(pontos));
        }
    }

    fecharModal();
    if (typeof atualizarVisualizacaoMaster === "function") atualizarVisualizacaoMaster();
    if (typeof sincronizarComFirebase === "function") await sincronizarComFirebase();
    alert("✅ Ponto e justificativas salvos com sucesso!");
}

async function excluirPonto(idx) {
    if (!confirm("Deseja apagar este registro?")) return;

    let pontos = JSON.parse(localStorage.getItem("meusPontos") || '[]');
    pontos.splice(idx, 1);
    localStorage.setItem("meusPontos", JSON.stringify(pontos));

    atualizarVisualizacaoMaster();
    if (typeof sincronizarComFirebase === "function") await sincronizarComFirebase();
}

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
// CONTROLE MASTER E RENDERIZADORES AUXILIARES
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

window.atualizarVisualizacaoMaster = function () {
    renderizarTabelaPontoSimples();
    renderizarFuncionariosCadastro();
    atualizarTabelaAjustes();
    gerarRelatorioMensalConsolidado();
    renderizarDashboard();
    if (typeof renderizarHistoricoOcorrencias === "function") renderizarHistoricoOcorrencias();
    if (typeof renderizarLogs === "function") renderizarLogs();
};

function renderizarTabelaPontoSimples() {
    const table = document.getElementById('tabelaPontos');
    if (!table) return;
    const pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');

    table.innerHTML = [...pontos].reverse().slice(0, 5).map(p => `
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

    table.innerHTML = funcionarios.map((f, i) => `
        <tr>
            <td>${f.cpf}</td>
            <td><strong>${f.nome || f.Nome}</strong></td>
            <td>${f.unidade || f.Unidade}</td>
            <td>Jornada: ${f.jornada || f.Jornada || "08:00"}h</td>
            <td>
                <button onclick="removerFunc(${i})" class="btn-cancelar">❌ Remover</button>
            </td>
        </tr>
    `).join('');
}

// ======================================================
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
    if (!listaBancoHoras) return;

    const busca = document.getElementById('busca-extrato')?.value.toLowerCase() || '';
    const unidadeFiltro = document.getElementById('filtro-unidade-extrato')?.value || '';
    const funcionarioAlvoCpf = document.getElementById('filtro-funcionario-extrato')?.value || '';
    const filtroMes = document.getElementById('filtro-mes-extrato')?.value;

    if (!filtroMes) {
        listaBancoHoras.innerHTML = '<tr><td colspan="8">Selecione o mês para visualizar.</td></tr>';
        return;
    }

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
            const ehFimDeSemana = (objetoData.getDay() === 0 || objetoData.getDay() === 6);

            const pontosDoDia = pontos.filter(p => {
                const pData = new Date(p.horario);
                const pDataStr = `${pData.getFullYear()}-${String(pData.getMonth() + 1).padStart(2, '0')}-${String(pData.getDate()).padStart(2, '0')}`;
                return p.cpf === funcionario.cpf && pDataStr === dataAtualStr;
            }).sort((a, b) => new Date(a.horario) - new Date(b.horario));

            const ocorrenciaDoDia = ocorrencias.find(o =>
                o.funcionarioCpf === funcionario.cpf && dataAtualStr >= o.dataInicio && dataAtualStr <= o.dataFim
            );

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
                saldoDoDia = 0;
                if (trabalhadoMinutos === 0) trabalhadoMinutos = jornadaMinutos;
            } else if (trabalhadoMinutos > 0) {
                const jornadaConsiderada = ehFimDeSemana ? 0 : jornadaMinutos;
                saldoDoDia = trabalhadoMinutos - jornadaConsiderada;
            } else if (ocorrenciaDoDia) {
                saldoDoDia = (ocorrenciaDoDia.tipo === "Falta Injustificada") ? -jornadaMinutos : 0;
            } else {
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

    if (gradeCalendario) {
        if (!funcionarioAlvoCpf) {
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
            diasSemana.forEach(ds => htmlCalendario += `<div style="font-weight:bold; padding: 5px; background:#eee; border-radius:3px; text-align:center;">${ds}</div>`);

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
                    else if (dadosDia.ocorrencia.tipo === "Atestado Médico" || dadosDia.ocorrencia.tipo === "Atestado") corFundo = "#f1c40f";
                    else if (dadosDia.ocorrencia.tipo === "Folga" || dadosDia.ocorrencia.tipo === "Férias" || dadosDia.ocorrencia.tipo === "Falta Justificada") corFundo = "#3498db";
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

            const elTrab = document.getElementById('resumo-horas-trabalhadas');
            const elExt = document.getElementById('resumo-horas-extras');
            const elNeg = document.getElementById('resumo-horas-negativas');
            const elSaldo = document.getElementById('resumo-saldo-final');

            if (elTrab) elTrab.innerText = converterMinutosParaHoraString(minutosTotaisTrabalhados);
            if (minutosSaldoAcumulado >= 0) {
                if (elExt) elExt.innerText = converterMinutosParaHoraString(minutosSaldoAcumulado);
                if (elNeg) elNeg.innerText = "00:00";
                if (elSaldo) {
                    elSaldo.innerText = `+${converterMinutosParaHoraString(minutosSaldoAcumulado)}`;
                    elSaldo.style.color = "green";
                }
            } else {
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
// RELATÓRIO / MONITORIA CONTROLE DE HORÁRIO (SMARTPONTO)
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

    const pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');
    const ocorrencias = JSON.parse(localStorage.getItem('ocorrencias') || '[]');

    const totalDiasNoMes = new Date(ano, mes, 0).getDate();
    
    const mesesNomes = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
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
        const saidaPonto = pontosDoDia.find(p => p.tipo === "Saída" || p.tipo === "Saída para Curso");

        if (entradaPonto) entradaStr = new Date(entradaPonto.horario).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        if (saidaPonto)  saidaStr = new Date(saidaPonto.horario).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});

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

        // Finais de semana sem registros não aparecem na impressão
        if (ehFimDeSemana && trabalhadoMinutos === 0) {
            continue; 
        }

        // Gera a linha da tabela
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
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <title>Monitoria Controle de Horário - ${nomeMesCorrente}</title>
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
                    font-size: 24px;
                    color: #555555;
                    font-weight: bold;
                    text-align: center;
                }
                .logo-empresa {
                    position: absolute;
                    right: 0;
                    height: 45px;
                    display: flex;
                    align-items: center;
                    font-size: 20px;
                    font-weight: bold;
                }
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
                    margin-top: 100px;
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
            <div class="container-cabecalho">
                <div class="titulo-folha">Monitoria Controle de Horário - Mês de ${nomeMesCorrente}</div>
                <div class="logo-empresa">
                    <span style="color: #2563eb;">Smart</span><span style="color: #1e293b;">Ponto</span>
                </div>
            </div>
            
            <table class="tabela-ponto">
                <tbody>
                    ${conteudoTabelaHTML}
                </tbody>
            </table>

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

// ======================================================
// SINCRONIZAÇÃO AUTOMÁTICA EM TEMPO REAL ENTRE MÁQUINAS
// ======================================================
setInterval(async () => {
    try {
        if (typeof window.recuperarDadosNuvem === "function") {
            await window.recuperarDadosNuvem();

            if (typeof exibirPontos === "function") exibirPontos();
            if (typeof atualizarListaFuncionarios === "function") atualizarListaFuncionarios();
            if (typeof renderizarDashboard === "function") renderizarDashboard();

            const secaoAjustes = document.getElementById('secao-ajustes');
            if (secaoAjustes && secaoAjustes.style.display !== 'none') {
                if (typeof atualizarTabelaAjustes === "function") atualizarTabelaAjustes();
            }

            const secaoBanco = document.getElementById('secao-banco');
            if (secaoBanco && secaoBanco.style.display !== 'none') {
                if (typeof calcularBancoHoras === "function") calcularBancoHoras();
            }
        }
    } catch (erro) {
        console.error("Erro na atualização automática:", erro);
    }
}, 5000); // Roda a cada 5 segundos
