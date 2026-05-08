const SENHA_MESTRE = "admin123";
let indexEdicaoGlobal = null;

// --- INICIALIZAÇÃO COM SINCRONIZAÇÃO AUTOMÁTICA ---
// Esta parte garante que qualquer computador baixe os dados do Google ao abrir o site
window.onload = async function() {
    console.log("Iniciando sistema e sincronizando com a nuvem...");
    
    // Tenta buscar os funcionários e registros salvos no Firebase
    if (typeof window.recuperarDadosNuvem === "function") {
        await window.recuperarDadosNuvem(); 
    }

    // Após baixar, atualiza o que aparece na tela
    exibirPontos();
    atualizarListaFuncionarios();
    
    if(sessionStorage.getItem('gestorLogado') === 'true') ativarModoGestor();
    mostrarTela('secao-ponto');
};

// --- FUNÇÃO PARA GARANTIR QUE OS DADOS CHEGUEM NA NUVEM ---
// Toda vez que algo mudar, essa função avisa o Firebase
function sincronizarComFirebase() {
    if (typeof window.sincronizarManual === "function") {
        window.sincronizarManual();
    }
}

// --- NAVEGAÇÃO E SEGURANÇA ---
function abrirLogin() { document.getElementById('tela-login').style.display = 'flex'; }
function fecharLogin() { document.getElementById('tela-login').style.display = 'none'; }

function autenticarGestor() {
    const user = document.getElementById('login-usuario').value;
    const pass = document.getElementById('login-senha').value;
    if(user === "admin" && pass === SENHA_MESTRE) {
        sessionStorage.setItem('gestorLogado', 'true');
        ativarModoGestor();
        fecharLogin();
    } else { alert("Senha incorreta!"); }
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
    location.reload();
}

function mostrarTela(id) {
    const logado = sessionStorage.getItem('gestorLogado') === 'true';
    if (!logado && id !== 'secao-ponto') { alert("Acesso restrito!"); return; }
    
    document.querySelectorAll('.modulo-tela').forEach(t => t.style.display = 'none');
    document.getElementById(id).style.display = 'block';

    document.querySelectorAll('.sidebar nav ul li a').forEach(link => link.classList.remove('active'));
    const linkAtivo = document.querySelector(`.sidebar nav ul li a[onclick*="${id}"]`);
    if (linkAtivo) linkAtivo.classList.add('active');

    if(id === 'secao-ajustes') atualizarTabelaAjustes();
    if(id === 'secao-banco') calcularBancoHoras();
}

// --- LOGICA DE PONTO HÍBRIDA (PIN 4 DÍGITOS OU CPF 11 DÍGITOS) ---
function baterPonto(tipo) {
    const entrada = document.getElementById('identificador-ponto').value.trim();
    const funcs = JSON.parse(localStorage.getItem('funcionarios') || '[]');
    let func = null;

    // Lógica de Identificação Inteligente
    if (entrada.length === 4) {
        func = funcs.find(f => f.pin === entrada);
    } else if (entrada.length === 11) {
        func = funcs.find(f => f.cpf === entrada);
    } else {
        return alert("Digite o PIN (4 números) ou o CPF (11 números)!");
    }

    if (!func) return alert("Colaborador não encontrado!");

    let pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');
    let agora = new Date();
    
    // Fuso Cuiabá
    if(func.unidade === "Cuiabá") agora.setHours(agora.getHours() - 1);

    pontos.push({ 
        colaborador: func.nome, 
        cpf: func.cpf, 
        unidade: func.unidade, 
        horario: agora.toISOString(), 
        tipo: tipo 
    });
    
    localStorage.setItem('meusPontos', JSON.stringify(pontos));
    
    exibirPontos();
    renderizarDashboard();
    sincronizarComFirebase(); 
    
    document.getElementById('identificador-ponto').value = "";
    alert(`Ponto de ${tipo} registrado: ${func.nome}`);
}

function exibirPontos() {
    const pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');
    const html = [...pontos].reverse().slice(0, 5).map(p => `<tr><td>${p.colaborador}</td><td>${p.unidade || '---'}</td><td>${new Date(p.horario).toLocaleString()}</td><td>${p.tipo}</td></tr>`).join('');
    document.getElementById('tabelaPontos').innerHTML = html;
}

// --- AJUSTES E MODAL ---
function atualizarTabelaAjustes() {
    const lista = document.getElementById("listaAjustesGeral");
    const pontos = JSON.parse(localStorage.getItem("meusPontos") || "[]");
    lista.innerHTML = "";
    pontos.forEach((p, idx) => {
        lista.innerHTML = `<tr>
            <td style="text-align:center"><button onclick="abrirModal(${idx})">✏️</button></td>
            <td>${p.colaborador}</td>
            <td>${p.unidade || '---'}</td>
            <td>${new Date(p.horario).toLocaleString()}</td>
            <td>${p.tipo}</td>
            <td style="text-align:center"><button onclick="excluirPonto(${idx})">🗑️</button></td>
        </tr>` + lista.innerHTML;
    });
}

function abrirModal(idx) {
    const pontos = JSON.parse(localStorage.getItem("meusPontos") || "[]");
    indexEdicaoGlobal = idx;
    document.getElementById('modal-nome').innerText = pontos[idx].colaborador;
    
    const data = new Date(pontos[idx].horario);
    data.setMinutes(data.getMinutes() - data.getTimezoneOffset());
    document.getElementById('edit-horario').value = data.toISOString().slice(0, 16);
    
    document.getElementById('modal-edicao').style.display = 'flex';
}

function fecharModal() { document.getElementById('modal-edicao').style.display = 'none'; }

function salvarEdicaoModal() {
    let pontos = JSON.parse(localStorage.getItem("meusPontos") || "[]");
    const novaData = document.getElementById('edit-horario').value;
    
    if(!novaData) return alert("Selecione uma data!");

    pontos[indexEdicaoGlobal].horario = new Date(novaData).toISOString();
    pontos[indexEdicaoGlobal].tipo = document.getElementById('edit-tipo').value;
    
    localStorage.setItem("meusPontos", JSON.stringify(pontos));
    fecharModal();
    atualizarTabelaAjustes();
    sincronizarComFirebase(); 
}

function excluirPonto(idx) {
    if(!confirm("Deseja apagar este registro?")) return;
    let pontos = JSON.parse(localStorage.getItem("meusPontos") || "[]");
    pontos.splice(idx, 1);
    localStorage.setItem("meusPontos", JSON.stringify(pontos));
    atualizarTabelaAjustes();
    renderizarDashboard();
    sincronizarComFirebase();
}

// --- EXPORTAR EXCEL ---
function exportarRelatorioExcel() {
    const pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');
    let csv = "Colaborador;Unidade;Data;Hora;Tipo\n";
    pontos.forEach(p => {
        const d = new Date(p.horario);
        csv += `${p.colaborador};${p.unidade || '---'};${d.toLocaleDateString()};${d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})};${p.tipo}\n`;
    });
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `SmartPonto_Relatorio.csv`;
    link.click();
}

// --- SINCRONIZAÇÃO NUVEM ---
function sincronizarComFirebase() {
    if (typeof window.sincronizarManual === "function") {
        window.sincronizarManual();
    }
}

// --- DASHBOARD E CADASTRO ---
function renderizarDashboard() {
    const funcs = JSON.parse(localStorage.getItem('funcionarios') || '[]');
    const pontos = JSON.parse(localStorage.getItem('meusPontos') || '[]');
    document.getElementById('card-total-func').innerText = funcs.length;
    document.getElementById('card-registros-hoje').innerText = pontos.filter(p => new Date(p.horario).toLocaleDateString() === new Date().toLocaleDateString()).length;
}

function calcularBancoHoras() {
    const lista = document.getElementById("listaBancoHoras");
    const funcs = JSON.parse(localStorage.getItem("funcionarios") || "[]");
    const pontos = JSON.parse(localStorage.getItem("meusPontos") || "[]");
    lista.innerHTML = "";

    funcs.forEach(f => {
        const pF = pontos.filter(p => p.cpf === f.cpf);
        for (let i = 0; i < pF.length; i++) {
            if (pF[i].tipo === "Entrada" && pF[i+1]?.tipo === "Saída") {
                const ent = new Date(pF[i].horario);
                const sai = new Date(pF[i+1].horario);
                const trab = Math.floor((sai - ent) / 60000);
                lista.innerHTML += `<tr><td>${f.nome}</td><td>${f.unidade}</td><td>${ent.toLocaleDateString()}</td><td>${ent.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td><td>${sai.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td><td>${fmt(trab)}</td><td>--</td></tr>`;
                i++;
            }
        }
    });
}

function fmt(m) {
    const s = m < 0 ? "-" : ""; const a = Math.abs(m);
    return s + String(Math.floor(a/60)).padStart(2,'0') + ":" + String(a%60).padStart(2,'0');
}

function salvarFuncionario() {
    const n = document.getElementById('cad-nome').value;
    const c = document.getElementById('cad-cpf').value;
    const p = document.getElementById('cad-pin').value;

    if(!n || !c || !p) return alert("Preencha Nome, CPF e PIN!");
    
    let l = JSON.parse(localStorage.getItem('funcionarios') || '[]');
    
    // Evitar PIN duplicado
    if(l.some(f => f.pin === p)) return alert("Este PIN já está em uso!");

    l.push({ 
        nome: n, 
        cpf: c, 
        pin: p, 
        unidade: document.getElementById('cad-unidade').value, 
        jornada: document.getElementById('cad-jornada').value 
    });
    
    localStorage.setItem('funcionarios', JSON.stringify(l));
    atualizarListaFuncionarios(); 
    renderizarDashboard(); 
    sincronizarComFirebase();
    
    document.getElementById('cad-nome').value = "";
    document.getElementById('cad-cpf').value = "";
    document.getElementById('cad-pin').value = "";
}

function atualizarListaFuncionarios() {
    const l = JSON.parse(localStorage.getItem('funcionarios') || '[]');
    document.getElementById('listaFuncionarios').innerHTML = l.map((f, i) => `<tr><td>${f.cpf}</td><td>${f.nome}</td><td>${f.unidade}</td><td>${f.jornada}</td><td><button onclick="removerFunc(${i})">X</button></td></tr>`).join('');
}

function removerFunc(i) {
    if(!confirm("Deseja excluir este funcionário?")) return;
    let l = JSON.parse(localStorage.getItem('funcionarios') || '[]');
    l.splice(i, 1);
    localStorage.setItem('funcionarios', JSON.stringify(l));
    atualizarListaFuncionarios();
    renderizarDashboard();
    sincronizarComFirebase();
}
