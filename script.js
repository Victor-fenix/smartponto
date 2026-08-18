const SENHA_MESTRE = "admin123";
let indexEdicaoGlobal = null;
let cpfTratamentoGlobal = null;
let dataTratamentoGlobal = null;

// ======================================================
// HORÁRIO LOCAL (SEM CONVERSÃO DE FUSO)
// ======================================================
// Sempre grava o horário exatamente como o relógio do computador
// que registrou o ponto mostrava, sem converter para UTC e sem
// aplicar nenhum ajuste manual de fuso (ex.: Cuiabá x Goiás).
// Isso garante que, ao consultar o ponto de qualquer unidade,
// o horário exibido seja sempre o horário "real" de quem bateu o ponto.
function formatarHorarioLocal(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    const hora = String(data.getHours()).padStart(2, '0');
    const min = String(data.getMinutes()).padStart(2, '0');
    const seg = String(data.getSeconds()).padStart(2, '0');
    return `${ano}-${mes}-${dia}T${hora}:${min}:${seg}`;
}

// ======================================================
// GEOFENCE — LOCALIZAÇÃO OFICIAL DE CADA UNIDADE
// ======================================================
// Coordenadas do endereço cadastrado de cada unidade e o raio (em metros)
// tolerado para considerar que o ponto foi batido "no local de trabalho".
// Se precisar ajustar endereço ou raio de alguma unidade, é só mudar aqui.
const LOCAIS_UNIDADES = {
    "Sede": { lat: -16.7960607, lng: -49.2600375, raioMetros: 300 },
    "Cuiabá": { lat: -15.6509541, lng: -55.9954212, raioMetros: 300 },
    "Palmas": { lat: -10.2248487, lng: -48.3141014, raioMetros: 300 }
};

// Distância em metros entre dois pontos (fórmula de Haversine)
function calcularDistanciaMetros(lat1, lng1, lat2, lng2) {
    const R = 6371000; // raio da Terra em metros
    const toRad = (v) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// ======================================================
// INICIALIZAÇÃO DO SISTEMA
// ======================================================

window.addEventListener('load', async () => {
    console.log("🔄 Iniciando SmartPonto...");

    try {
        if (typeof window.recuperarDadosNuvem === "function") {
            await window.recuperarDadosNuvem();
        }

        carregarFuncionarios();
        atualizarVisualizacaoMaster();
        checarSessaoGestor();
        mostrarTela('secao-ponto');

        console.log("✅ Sistema iniciado com sucesso");
    } catch (erro) {
        console.error("Erro ao iniciar sistema:", erro);
    }
});

function checarSessaoGestor() {
    if (sessionStorage.getItem('gestorLogado') === 'true') {
        ativarModoGestor();
    }
}

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

            carregarFuncionarios();
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
    const tela = document.getElementById('tela-login');
    if (tela) tela.style.display = 'flex';
}

function fecharLogin() {
    const tela = document.getElementById('tela-login');
    if (tela) tela.style.display = 'none';
}

function autenticarGestor() {
    const user = document.getElementById('login-usuario')?.value.trim();
    const pass = document.getElementById('login-senha')?.value.trim();

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

    carregarFuncionarios();
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

    if (id === 'secao-cadastro') carregarFuncionarios();
    if (id === 'secao-ajustes') atualizarTabelaAjustes();
    if (id === 'secao-banco') gerarRelatorioMensalConsolidado();

    // Estas telas ainda não têm as funções de carregamento implementadas
    // no restante do sistema (histórico de ocorrências / logs de auditoria).
    if (id === 'secao-ocorrencias' && typeof carregarHistoricoOcorrencias === "function") {
        carregarHistoricoOcorrencias();
    }
}

// ======================================================
// REGISTRO DE PONTO (COM GPS, SEM CONVERSÃO DE FUSO)
// ======================================================

function baterPonto(tipo) {
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

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (posicao) => {
                const lat = posicao.coords.latitude;
                const lng = posicao.coords.longitude;
                const linkMapa = `https://www.google.com/maps?q=${lat},${lng}`;

                let distanciaMetros = null;
                let foraDoRaio = false;

                const localOficial = LOCAIS_UNIDADES[funcionario.unidade];
                if (localOficial) {
                    distanciaMetros = Math.round(
                        calcularDistanciaMetros(lat, lng, localOficial.lat, localOficial.lng)
                    );
                    foraDoRaio = distanciaMetros > localOficial.raioMetros;
                }

                registrarPontoComLocal(funcionario, tipo, linkMapa, distanciaMetros, foraDoRaio);
            },
            (erro) => {
                console.warn("GPS indisponível ou permissão negada:", erro.message);
                registrarPontoComLocal(funcionario, tipo, "Sem localização (GPS negado)", null, false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        registrarPontoComLocal(funcionario, tipo, "GPS indisponível", null, false);
    }
}

async function registrarPontoComLocal(funcionario, tipo, localizacao, distanciaMetros, foraDoRaio) {
    let pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');

    // Usa o horário exato do relógio do computador de quem está batendo o
    // ponto, sem nenhuma conversão de fuso — assim cada unidade (Goiás,
    // Cuiabá, Palmas etc.) sempre registra e exibe o horário real dela.
    const novoRegistro = {
        colaborador: funcionario.nome,
        cpf: funcionario.cpf,
        unidade: funcionario.unidade,
        horario: formatarHorarioLocal(new Date()),
        tipo: tipo,
        localizacao: localizacao,
        distanciaMetros: distanciaMetros,
        foraDoRaio: foraDoRaio
    };

    pontos.push(novoRegistro);
    localStorage.setItem('meusPontos', JSON.stringify(pontos));

    atualizarVisualizacaoMaster();

    try {
        await sincronizarComFirebase();
        console.log("✅ Ponto sincronizado com o Firebase com sucesso!");
    } catch (erro) {
        console.error("⚠️ Erro ao enviar ponto para o Banco de Dados Firebase:", erro);
    }

    const input = document.getElementById('identificador-ponto');
    if (input) input.value = "";

    if (foraDoRaio) {
        alert(`⚠️ ${tipo} registrado para ${funcionario.nome}, mas FORA do raio da unidade (${distanciaMetros}m de distância). Isso ficará sinalizado para o gestor.`);
    } else {
        alert(`✅ ${tipo} registrado com sucesso para ${funcionario.nome}`);
    }
}

// ======================================================
// GERENCIAMENTO DE FUNCIONÁRIOS
// ======================================================

async function salvarFuncionario() {
    const nome = document.getElementById('cad-nome')?.value.trim();
    const cpf = document.getElementById('cad-cpf')?.value.trim();
    const pin = document.getElementById('cad-pin')?.value.trim();

    if (!nome || !cpf || !pin) {
        alert("⚠️ Preencha todos os campos");
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
        unidade: document.getElementById('cad-unidade')?.value,
        jornada: document.getElementById('cad-jornada')?.value
    });

    localStorage.setItem('funcionarios', JSON.stringify(funcionarios));

    carregarFuncionarios();
    atualizarVisualizacaoMaster();
    await sincronizarComFirebase();

    document.getElementById('cad-nome').value = "";
    document.getElementById('cad-cpf').value = "";
    document.getElementById('cad-pin').value = "";

    alert("✅ Funcionário cadastrado");
}

async function removerFuncionario(index) {
    if (!confirm("Deseja excluir este funcionário?")) return;

    let funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');
    funcionarios.splice(index, 1);
    localStorage.setItem('funcionarios', JSON.stringify(funcionarios));

    carregarFuncionarios();
    atualizarVisualizacaoMaster();
    await sincronizarComFirebase();
}

function carregarFuncionarios() {
    const lista = document.getElementById('listaFuncionarios');
    const seletorExtrato = document.getElementById('filtro-funcionario-extrato');
    const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');

    if (lista) {
        if (funcionarios.length === 0) {
            lista.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum funcionário cadastrado.</td></tr>';
        } else {
            lista.innerHTML = funcionarios.map((f, i) => `
                <tr>
                    <td>${f.cpf}</td>
                    <td><strong>${f.nome}</strong></td>
                    <td>${f.unidade}</td>
                    <td>${f.jornada || "08:00"}h</td>
                    <td>
                        <button onclick="removerFuncionario(${i})" class="btn-cancelar">❌ Remover</button>
                    </td>
                </tr>
            `).join('');
        }
    }

    if (seletorExtrato) {
        const valorAtual = seletorExtrato.value;
        seletorExtrato.innerHTML = '<option value="">Selecione um Funcionário...</option>' +
            funcionarios.map(f => `<option value="${f.cpf}">${f.nome} [${f.unidade}]</option>`).join('');

        if (valorAtual && funcionarios.some(f => f.cpf === valorAtual)) {
            seletorExtrato.value = valorAtual;
        }
    }

    const cardTotal = document.getElementById('card-total-func');
    if (cardTotal) cardTotal.innerText = funcionarios.length;
}

// ======================================================
// AJUSTES, CALENDÁRIO E MODAL DE EDIÇÃO / JUSTIFICATIVA
// (usa o modal #modal-ajuste-ponto definido no HTML)
// ======================================================

function abrirTratamentoDireto(cpf, dataStr) {
    cpfTratamentoGlobal = cpf;
    dataTratamentoGlobal = dataStr;
    indexEdicaoGlobal = null;

    const funcionarios = JSON.parse(localStorage.getItem('funcionarios') || '[]');
    const pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');
    const ocorrencias = JSON.parse(localStorage.getItem('ocorrencias') || '[]');

    const func = funcionarios.find(f => f.cpf === cpf);
    const nomeFunc = func ? func.nome : 'Colaborador';

    const [ano, mes, dia] = dataStr.split('-');
    const dataFormatada = `${dia}/${mes}/${ano}`;

    const elTitulo = document.getElementById('modal-titulo');
    const elNome = document.getElementById('modal-nome');
    if (elTitulo) elTitulo.innerText = "✏️ Tratar Ponto / Lançar Horários";
    if (elNome) elNome.innerText = `${nomeFunc} — Dia ${dataFormatada}`;

    const pontosDoDia = pontos.filter(p => {
        if (p.cpf !== cpf) return false;
        const pData = new Date(p.horario);
        const pDataStr = `${pData.getFullYear()}-${String(pData.getMonth() + 1).padStart(2, '0')}-${String(pData.getDate()).padStart(2, '0')}`;
        return pDataStr === dataStr;
    });

    const pontoEntrada = pontosDoDia.find(p => p.tipo === "Entrada");
    const pontoSaida = pontosDoDia.find(p => p.tipo === "Saída" || p.tipo === "Saída para Curso");

    const inputEntrada = document.getElementById('edit-hora-entrada');
    const inputSaida = document.getElementById('edit-hora-saida');

    if (inputEntrada) {
        inputEntrada.value = pontoEntrada
            ? `${String(new Date(pontoEntrada.horario).getHours()).padStart(2, '0')}:${String(new Date(pontoEntrada.horario).getMinutes()).padStart(2, '0')}`
            : "";
    }

    if (inputSaida) {
        inputSaida.value = pontoSaida
            ? `${String(new Date(pontoSaida.horario).getHours()).padStart(2, '0')}:${String(new Date(pontoSaida.horario).getMinutes()).padStart(2, '0')}`
            : "";
    }

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

    const modal = document.getElementById('modal-ajuste-ponto');
    if (modal) modal.style.display = 'flex';
}

function abrirModal(idx) {
    const pontos = JSON.parse(localStorage.getItem("meusPontos") || "[]");
    indexEdicaoGlobal = idx;
    cpfTratamentoGlobal = null;
    dataTratamentoGlobal = null;

    const ponto = pontos[idx];
    if (!ponto) return;

    const elTitulo = document.getElementById('modal-titulo');
    const elNome = document.getElementById('modal-nome');
    if (elTitulo) elTitulo.innerText = "✏️ Editar Registro";
    if (elNome) elNome.innerText = ponto.colaborador || '';

    const data = new Date(ponto.horario);

    const inputEntrada = document.getElementById('edit-hora-entrada');
    if (inputEntrada) {
        inputEntrada.value = `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
    }
    const inputSaida = document.getElementById('edit-hora-saida');
    if (inputSaida) inputSaida.value = "";

    const modal = document.getElementById('modal-ajuste-ponto');
    if (modal) modal.style.display = 'flex';
}

function fecharModal() {
    const modal = document.getElementById('modal-ajuste-ponto');
    if (modal) modal.style.display = 'none';
    cpfTratamentoGlobal = null;
    dataTratamentoGlobal = null;
    indexEdicaoGlobal = null;
}

// Apaga todos os registros de ponto (entrada/saída) do dia/funcionário
// que está aberto no modal, sem fechar o modal — assim dá pra lançar um
// horário novo na sequência e clicar em "Salvar Alterações".
async function excluirPontoDoDia() {
    if (!cpfTratamentoGlobal || !dataTratamentoGlobal) {
        alert("⚠️ Abra o dia pelo calendário (aba Extrato & Calendário) para poder excluir o ponto.");
        return;
    }

    const [ano, mes, dia] = dataTratamentoGlobal.split('-');
    if (!confirm(`Deseja realmente apagar o(s) registro(s) de ponto do dia ${dia}/${mes}/${ano}? Essa ação não pode ser desfeita.`)) {
        return;
    }

    let pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');

    pontos = pontos.filter(p => {
        if (p.cpf !== cpfTratamentoGlobal) return true;
        const pData = new Date(p.horario);
        const pDataStr = `${pData.getFullYear()}-${String(pData.getMonth() + 1).padStart(2, '0')}-${String(pData.getDate()).padStart(2, '0')}`;
        return pDataStr !== dataTratamentoGlobal;
    });

    localStorage.setItem('meusPontos', JSON.stringify(pontos));

    // Também remove qualquer ocorrência/justificativa lançada nesse dia
    let ocorrencias = JSON.parse(localStorage.getItem('ocorrencias') || '[]');
    ocorrencias = ocorrencias.filter(o =>
        !(o.funcionarioCpf === cpfTratamentoGlobal && dataTratamentoGlobal >= o.dataInicio && dataTratamentoGlobal <= o.dataFim)
    );
    localStorage.setItem('ocorrencias', JSON.stringify(ocorrencias));

    // Limpa os campos do modal para já permitir lançar um ponto novo
    const inputEntrada = document.getElementById('edit-hora-entrada');
    const inputSaida = document.getElementById('edit-hora-saida');
    const selectOcorrencia = document.getElementById('edit-ocorrencia-tipo');
    const inputObs = document.getElementById('edit-observacao');
    if (inputEntrada) inputEntrada.value = '';
    if (inputSaida) inputSaida.value = '';
    if (selectOcorrencia) selectOcorrencia.value = 'Nenhuma';
    if (inputObs) inputObs.value = '';

    atualizarVisualizacaoMaster();
    await sincronizarComFirebase();

    alert("🗑️ Ponto do dia apagado. Agora você pode lançar um novo horário e clicar em Salvar Alterações.");
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
        const nomeFunc = func ? func.nome : 'Colaborador';
        const unidadeFunc = func ? func.unidade : 'Sede';

        pontos = pontos.filter(p => {
            if (p.cpf !== cpfTratamentoGlobal) return true;
            const pData = new Date(p.horario);
            const pDataStr = `${pData.getFullYear()}-${String(pData.getMonth() + 1).padStart(2, '0')}-${String(pData.getDate()).padStart(2, '0')}`;
            return pDataStr !== dataTratamentoGlobal;
        });

        if (horaEntrada) {
            pontos.push({
                colaborador: nomeFunc,
                cpf: cpfTratamentoGlobal,
                unidade: unidadeFunc,
                horario: `${dataTratamentoGlobal}T${horaEntrada}:00`,
                tipo: "Entrada"
            });
        }

        if (horaSaida) {
            const tipoSaida = (tipoOcorrencia === "Saída para Curso") ? "Saída para Curso" : "Saída";
            pontos.push({
                colaborador: nomeFunc,
                cpf: cpfTratamentoGlobal,
                unidade: unidadeFunc,
                horario: `${dataTratamentoGlobal}T${horaSaida}:00`,
                tipo: tipoSaida
            });
        }

        localStorage.setItem('meusPontos', JSON.stringify(pontos));

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
        let pontos = JSON.parse(localStorage.getItem("meusPontos") || "[]");
        if (horaEntrada && pontos[indexEdicaoGlobal]) {
            const ponto = pontos[indexEdicaoGlobal];
            const dataOrigem = ponto.horario.split('T')[0];
            ponto.horario = `${dataOrigem}T${horaEntrada}:00`;
            localStorage.setItem("meusPontos", JSON.stringify(pontos));
        }
    }

    fecharModal();
    atualizarVisualizacaoMaster();
    await sincronizarComFirebase();
    alert("✅ Ponto e justificativas salvos com sucesso!");
}

async function excluirPonto(idx) {
    if (!confirm("Deseja apagar este registro?")) return;

    let pontos = JSON.parse(localStorage.getItem("meusPontos") || '[]');
    pontos.splice(idx, 1);
    localStorage.setItem("meusPontos", JSON.stringify(pontos));

    atualizarVisualizacaoMaster();
    await sincronizarComFirebase();
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
                <td>${p.colaborador || 'Não Identificado'}</td>
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
    const hojeStr = new Date().toLocaleDateString();

    const pontosHoje = pontos.filter(p => new Date(p.horario).toLocaleDateString() === hojeStr);

    const cardTotal = document.getElementById('card-total-func');
    const cardHoje = document.getElementById('card-registros-hoje');
    const cardAlertas = document.getElementById('card-alertas-criticos');

    if (cardTotal) cardTotal.innerText = funcionarios.length;
    if (cardHoje) cardHoje.innerText = pontosHoje.length;
    if (cardAlertas) {
        const alertasHoje = pontosHoje.filter(p => p.foraDoRaio === true).length;
        cardAlertas.innerText = alertasHoje;
    }
}

// ======================================================
// CONTROLE MASTER E RENDERIZADORES AUXILIARES
// ======================================================

window.atualizarVisualizacaoMaster = function () {
    carregarTabelaPontosHoje();
    atualizarTabelaAjustes();
    gerarRelatorioMensalConsolidado();
    renderizarDashboard();
    if (typeof renderizarHistoricoOcorrencias === "function") renderizarHistoricoOcorrencias();
    if (typeof renderizarLogs === "function") renderizarLogs();
};

function carregarTabelaPontosHoje() {
    const tabela = document.getElementById('tabelaPontos');
    if (!tabela) return;

    const pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');
    const hojeStr = new Date().toLocaleDateString();

    const pontosHoje = pontos.filter(p => new Date(p.horario).toLocaleDateString() === hojeStr);

    if (pontosHoje.length === 0) {
        tabela.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum ponto registrado hoje.</td></tr>';
        return;
    }

    // Nesta tela pública (visível a qualquer funcionário) NÃO exibimos a
    // localização real capturada por GPS — isso fica disponível só para o
    // gestor, na tela "Extrato & Calendário".
    tabela.innerHTML = [...pontosHoje].reverse().map(p => `
        <tr>
            <td>${p.colaborador || "Não Identificado"}</td>
            <td>${p.unidade || "Sede"}</td>
            <td>${new Date(p.horario).toLocaleTimeString('pt-BR')}</td>
            <td><span class="badge ${p.tipo === 'Entrada' ? 'badge-verde' : 'badge-vermelha'}">${p.tipo}</span></td>
            <td><span style="color:#94a3b8;">✅ Registrado</span></td>
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
    let filtroMes = document.getElementById('filtro-mes-extrato')?.value;

    if (!filtroMes) {
        const elMes = document.getElementById('filtro-mes-extrato');
        filtroMes = new Date().toISOString().slice(0, 7);
        if (elMes) elMes.value = filtroMes;
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
        const nomeAtual = funcionario.nome || "";
        const unidadeAtual = funcionario.unidade || "";

        if (busca && !nomeAtual.toLowerCase().includes(busca)) return;
        if (unidadeFiltro && unidadeAtual !== unidadeFiltro) return;

        const jornadaMinutos = converterHoraParaMinutos(funcionario.jornada || "08:00");

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
            const saidaPonto = pontosDoDia.find(p => p.tipo === "Saída" || p.tipo === "Saída para Curso");

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

                // Localização (GPS) — visível apenas aqui, na tela do gestor.
                // Não é exibida na tela pública de "Bater Ponto".
                const linksLocal = [];
                if (entradaPonto && entradaPonto.localizacao && entradaPonto.localizacao.startsWith('http')) {
                    const alertaEntrada = entradaPonto.foraDoRaio
                        ? `<br><span style="color:#e74c3c; font-weight:bold; font-size:11px;">⚠️ Fora do local (${entradaPonto.distanciaMetros}m)</span>`
                        : '';
                    linksLocal.push(`<a href="${entradaPonto.localizacao}" target="_blank" title="Local da Entrada" style="color:#0284c7; text-decoration:none; font-size:12px;">📍 Entrada</a>${alertaEntrada}`);
                }
                if (saidaPonto && saidaPonto.localizacao && saidaPonto.localizacao.startsWith('http')
                    && (!entradaPonto || saidaPonto.localizacao !== entradaPonto.localizacao)) {
                    const alertaSaida = saidaPonto.foraDoRaio
                        ? `<br><span style="color:#e74c3c; font-weight:bold; font-size:11px;">⚠️ Fora do local (${saidaPonto.distanciaMetros}m)</span>`
                        : '';
                    linksLocal.push(`<a href="${saidaPonto.localizacao}" target="_blank" title="Local da Saída" style="color:#0284c7; text-decoration:none; font-size:12px;">📍 Saída</a>${alertaSaida}`);
                }
                const localizacaoHtml = linksLocal.length > 0
                    ? linksLocal.join('<br>')
                    : '<span style="color:#ccc; font-size:12px;">—</span>';

                htmlTabela += `
                    <tr style="${ehFimDeSemana && trabalhadoMinutos === 0 ? 'background-color:#fcfcfc; opacity:0.85;' : ''}">
                        <td>${dataFormatadaExibir} ${ehFimDeSemana ? '<span style="font-size:10px; color:#aaa;">(FDS)</span>' : ''}</td>
                        <td>${nomeAtual}</td>
                        <td>${unidadeAtual}</td>
                        <td>${entradaStr}</td>
                        <td>${saidaStr}</td>
                        <td><strong>${exibicaoTrabalhado}</strong></td>
                        <td style="${clSaldo}"><strong>${sinalSaldo}${converterMinutosParaHoraString(saldoDoDia)}</strong></td>
                        <td>${localizacaoHtml}</td>
                        <td>
                            <button onclick="abrirTratamentoDireto('${funcionario.cpf}', '${dataAtualStr}')" class="btn-nuvem">✏️ Tratar</button>
                        </td>
                    </tr>
                `;
            }
        }
    });

    listaBancoHoras.innerHTML = htmlTabela || '<tr><td colspan="9">Nenhum dado encontrado para os filtros selecionados.</td></tr>';

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

window.exportarRelatorioExcel = function () {
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

    const nomeAtual = funcionario.nome || "";
    const unidadeAtual = funcionario.unidade || "";

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
            const pDataStr = `${pData.getFullYear()}-${String(pData.getMonth() + 1).padStart(2, '0')}-${String(pData.getDate()).padStart(2, '0')}`;
            return p.cpf === filtroFuncCpf && pDataStr === dataAtualStr;
        }).sort((a, b) => new Date(a.horario) - new Date(b.horario));

        const ocorrenciaDoDia = ocorrencias.find(o => o.funcionarioCpf === filtroFuncCpf && dataAtualStr >= o.dataInicio && dataAtualStr <= o.dataFim);

        let entradaStr = "--:--";
        let saidaStr = "--:--";
        let trabalhadoMinutos = 0;

        const entradaPonto = pontosDoDia.find(p => p.tipo === "Entrada");
        const saidaPonto = pontosDoDia.find(p => p.tipo === "Saída" || p.tipo === "Saída para Curso");

        if (entradaPonto) entradaStr = new Date(entradaPonto.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        if (saidaPonto) saidaStr = new Date(saidaPonto.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

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

        if (ehFimDeSemana && trabalhadoMinutos === 0) {
            continue;
        }

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
                body { font-family: Arial, sans-serif; color: #333; padding: 30px; margin: 0; }
                .container-cabecalho { display: flex; justify-content: center; align-items: center; position: relative; margin-bottom: 25px; width: 100%; max-width: 900px; margin-left: auto; margin-right: auto; }
                .titulo-folha { font-size: 24px; color: #555555; font-weight: bold; text-align: center; }
                .logo-empresa { position: absolute; right: 0; height: 45px; display: flex; align-items: center; font-size: 20px; font-weight: bold; }
                .tabela-ponto { width: 100%; max-width: 900px; margin: 0 auto; border-collapse: collapse; }
                .tabela-ponto td { border: 1px solid #000000; padding: 8px 5px; text-align: center; font-size: 14px; height: 24px; }
                .area-assinatura-bloco { margin-top: 100px; text-align: center; width: 100%; }
                .linha-assinatura { width: 60%; margin: 0 auto; border-bottom: 1px solid #000000; margin-bottom: 8px; }
                .texto-assinatura { font-family: Arial, sans-serif; font-weight: bold; font-size: 14px; color: #000; }
                @media print { body { padding: 0; } }
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
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `);

    janelaImpressao.document.close();
};

