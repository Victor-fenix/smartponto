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

// ======================================================
// ATUALIZAÇÃO AUTOMÁTICA ENTRE DISPOSITIVOS
// ======================================================

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
// REGISTRO DE PONTO
// ======================================================

async function baterPonto(tipo) {
    const entrada = document.getElementById('identificador-ponto').value.trim();
    const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');

    let funcionario = null;

    if (entrada.length === 4) {
        funcionario = funcionarios.find(f => f.pin === entrada);
    } else if (entrada.length === 11) {
        funcionario = funcionarios.find(f => f.cpf === entrada);
    } else {
        alert("Digite PIN (4 dígitos) ou CPF (11 números)");
        return;
    }

    if (!funcionario) {
        alert("❌ Funcionário não encontrado");
        return;
    }

    let pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');
    let agora = new Date();

    if (funcionario.unidade === "Cuiabá") {
        agora.setHours(agora.getHours() - 1);
    }

    const novoRegistro = {
        colaborador: funcionario.nome || funcionario.Nome,
        cpf: funcionario.cpf,
        unidade: funcionario.unidade || funcionario.Unidade,
        horario: agora.toISOString(),
        tipo: tipo
    };

    pontos.push(novoRegistro);
    localStorage.setItem('meusPontos', JSON.stringify(pontos));

    atualizarVisualizacaoMaster();
    await sincronizarComFirebase();

    document.getElementById('identificador-ponto').value = "";
    alert(`✅ ${tipo} registrado para ${funcionario.nome || funcionario.Nome}`);
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

async function excluirFuncionario(cpf) {
    if (!confirm("Deseja remover este funcionário?")) return;

    let funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');
    funcionarios = funcionarios.filter(f => f.cpf !== cpf);
    localStorage.setItem('funcionarios', JSON.stringify(funcionarios));

    carregarSeletores();
    atualizarVisualizacaoMaster();
    await sincronizarComFirebase();
}

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

    // RENDERIZADOR DO CALENDÁRIO VISUAL
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
