// ===== DADOS FICTÍCIOS (ficam só na memória) =====
function somaDias(iso, n) { var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv'); }
var hoje = new Date().toLocaleDateString('sv');
var precos = { 'Standard': 280, 'Superior': 380, 'Suíte': 550 };
var produtos = [
  { nome: 'Coca-Cola', preco: 8, icone: '🥤' }, { nome: 'Água mineral', preco: 5, icone: '💧' },
  { nome: 'Suco de laranja', preco: 9, icone: '🍊' }, { nome: 'Água com gás', preco: 6, icone: '🫧' },
  { nome: 'Refrigerante de limão', preco: 8, icone: '🍋' }
];
var hospedes = [
  { nome: 'Carlos Eduardo Silva', cpf: '11122233344', cat: 'Superior' },
  { nome: 'Fernanda Rocha', cpf: '22233344455', cat: 'Standard' },
  { nome: 'Roberto Alves', cpf: '33344455566', cat: 'Suíte' },
  { nome: 'Maria Souza', cpf: '44455566677', cat: 'Standard' },
  { nome: 'João Pereira', cpf: '55566677788', cat: 'Superior' },
  { nome: 'Ana Paula Lima', cpf: '66677788899', cat: 'Standard' }
];
var quartos = [];
['Standard', 'Superior', 'Suíte'].forEach(function (cat, i) {
  for (var k = 1; k <= 4; k++) quartos.push({ n: (i + 1) * 100 + k, cat: cat, st: 'disponivel', hospede: null, cpf: '', sai: '', conta: [], pago: false });
});
function quartoNum(n) { return quartos.filter(function (q) { return q.n == n; })[0]; }
function ocupar(n, nome, cpf, dias) {
  var q = quartoNum(n); q.st = 'ocupado'; q.hospede = nome; q.cpf = cpf; q.sai = somaDias(hoje, dias); q.pago = false;
  q.conta = [{ data: hoje, desc: 'Diária ' + q.cat, vu: precos[q.cat], qtd: dias }];
}
ocupar(101, 'Maria Souza', '44455566677', 2);
ocupar(201, 'João Pereira', '55566677788', 3);
quartoNum(201).conta.push({ data: hoje, desc: 'Coca-Cola', vu: 8, qtd: 2 });
quartoNum(103).st = 'sujo';
quartoNum(304).st = 'sujo'; // em manutenção
var reservas = [
  { cod: 'RSV-1001', nome: 'Ana Paula Lima', cpf: '66677788899', q: 102, cat: 'Standard', ent: hoje, sai: somaDias(hoje, 2), pax: 2, valor: 560, ativa: true, feito: false },
  { cod: 'RSV-1002', nome: 'Roberto Alves', cpf: '33344455566', q: 301, cat: 'Suíte', ent: somaDias(hoje, 5), sai: somaDias(hoje, 8), pax: 2, valor: 1650, ativa: true, feito: false }
];
var proxCodigo = 1003, historico = [];

// ===== FUNÇÕES AUXILIARES =====
function $(id) { return document.getElementById(id); }
function dinheiro(v) { return 'R$ ' + v.toFixed(2).replace('.', ','); }
function fmtCpf(c) { return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'); }
function soNumeros(t) { return t.replace(/\D/g, ''); }
function fmtData(iso) { return iso.split('-').reverse().join('/'); }
function resumido(nome) { var p = nome.split(' '); return p[0] + ' ' + p[p.length - 1].charAt(0) + '.'; }
var tempoToast;
function mensagem(texto, tipo) { // feedback imediato (Heurística 1)
  var t = $('toast'); t.textContent = (tipo === 'erro' ? '⚠ ' : '✔ ') + texto; t.className = 'mostra ' + (tipo || 'ok');
  clearTimeout(tempoToast); tempoToast = setTimeout(function () { t.className = ''; }, 3500);
}
function mostrarErros(id, lista) { var e = $(id); e.hidden = !lista.length; e.innerHTML = lista.join('<br>'); }

// Reservas ativas (não canceladas e sem check-in feito)
function reservaHoje(q) {
  return reservas.filter(function (r) { return r.ativa && !r.feito && r.q === q.n && r.ent === hoje; })[0];
}
function statusDe(q) { return (q.st === 'disponivel' && reservaHoje(q)) ? 'reservado' : q.st; }
function temConflito(q, ent, sai) { // evita overbooking
  if (q.st === 'ocupado' && ent < q.sai) return true;
  if (q.st === 'sujo' && ent === hoje) return true;
  return reservas.some(function (r) { return r.ativa && !r.feito && r.q === q.n && ent < r.sai && r.ent < sai; });
}
function quartoLivre(cat, ent, sai) {
  return quartos.filter(function (q) { return q.cat === cat && !temConflito(q, ent, sai); })[0];
}
function totalConta(q) { return q.conta.reduce(function (s, i) { return s + i.vu * i.qtd; }, 0); }

// ===== NAVEGAÇÃO =====
var titulos = { dashboard: 'Dashboard', mapa: 'Mapa de quartos', checkin: 'Check-in', checkout: 'Check-out', reservas: 'Reservas', cancelamento: 'Cancelamento de reservas', consumo: 'Lançamento de consumo' };
var telaAtual = 'dashboard';
function irPara(nome) {
  telaAtual = nome;
  document.querySelectorAll('.tela').forEach(function (t) { t.classList.toggle('ativa', t.id === nome); });
  document.querySelectorAll('.menu button[data-tela]').forEach(function (b) { b.classList.toggle('ativo', b.dataset.tela === nome); });
  $('titulo').textContent = titulos[nome];
  atualizarTudo();
}
document.querySelectorAll('.menu button[data-tela]').forEach(function (b) { b.onclick = function () { irPara(b.dataset.tela); }; });
$('dataHoje').textContent = '📆 ' + new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

// ===== MAPA E DASHBOARD (compartilham os mesmos dados) =====
var icones = { disponivel: '✅', ocupado: '🛏️', sujo: '🧹', reservado: '📌' };
function atualizarTudo() {
  var cont = { disponivel: 0, ocupado: 0, sujo: 0, reservado: 0 };
  $('grid').innerHTML = quartos.map(function (q) {
    var st = statusDe(q); cont[st]++;
    var nomes = { disponivel: 'Disponível', ocupado: 'Ocupado', sujo: 'Sujo / manutenção', reservado: 'Reservado hoje' };
    var dica = st === 'ocupado' ? ' data-h="' + resumido(q.hospede) + '"' : '';
    return '<div class="quarto ' + st + '"' + dica + '><b>' + q.n + '</b><small>' + q.cat + '</small><small>' + icones[st] + ' ' + nomes[st] + '</small></div>';
  }).join('');
  $('indicadores').innerHTML =
    '<div class="ind disponivel"><b>' + cont.disponivel + '</b>' + icones.disponivel + ' Disponíveis</div><div class="ind ocupado"><b>' + cont.ocupado + '</b>' + icones.ocupado + ' Ocupados</div>' +
    '<div class="ind sujo"><b>' + cont.sujo + '</b>' + icones.sujo + ' Sujos / manutenção</div><div class="ind reservado"><b>' + cont.reservado + '</b>' + icones.reservado + ' Reservados hoje</div>' +
    '<div class="ind"><b>' + reservas.filter(function (r) { return r.ativa && !r.feito; }).length + '</b>Reservas ativas</div>';
  if (telaAtual === 'checkin') ciMostrarQuartos();
  if (telaAtual === 'reservas') rAtualizar();
  if (telaAtual === 'cancelamento') cListar();
  if (telaAtual === 'consumo') cMostrarHistorico();
}

// ===== AUTOCOMPLETE GENÉRICO =====
function autocompletar(campo, lista, buscar, escolher) {
  var inp = $(campo), box = $(lista);
  inp.addEventListener('input', function () {
    var itens = buscar(inp.value.trim().toLowerCase()); box.innerHTML = '';
    itens.forEach(function (it) {
      var li = document.createElement('li'); li.textContent = it.texto;
      li.onclick = function () { box.innerHTML = ''; box.hidden = true; escolher(it); };
      box.appendChild(li);
    });
    box.hidden = !itens.length;
  });
  inp.addEventListener('keydown', function (e) { // Enter escolhe a 1ª sugestão
    if (e.key === 'Enter' && !box.hidden && box.firstChild) { e.preventDefault(); e._tratado = true; box.firstChild.click(); }
  });
}
function fecharSugestoes() { var abriu = false; document.querySelectorAll('.sug').forEach(function (s) { if (!s.hidden) abriu = true; s.hidden = true; }); return abriu; }

// ===== A. CHECK-IN =====
var ciHosp = null, ciQuarto = null;
autocompletar('ciBusca', 'ciSug', function (t) {
  if (!t) return [];
  var num = soNumeros(t) || '#';
  return hospedes.filter(function (h) { return h.nome.toLowerCase().indexOf(t) >= 0 || h.cpf.indexOf(num) >= 0; })
    .map(function (h) { return { texto: h.nome + ' — CPF ' + fmtCpf(h.cpf), h: h }; });
}, function (it) {
  ciHosp = it.h; ciQuarto = null; $('ciBusca').value = it.h.nome;
  $('ciHospede').innerHTML = '<b>' + it.h.nome + '</b><br>CPF: ' + fmtCpf(it.h.cpf) + '<br>Categoria contratada: <b>' + it.h.cat + '</b>';
  ciMostrarQuartos();
});
function ciMostrarQuartos() {
  var box = $('ciQuartos'); $('ciConfirmar').disabled = !(ciHosp && ciQuarto);
  if (!ciHosp) { box.textContent = 'Selecione um hóspede para ver os quartos.'; return; }
  box.innerHTML = '';
  quartos.filter(function (q) { return q.cat === ciHosp.cat; }).forEach(function (q) {
    var st = statusDe(q), r = reservaHoje(q), b = document.createElement('button');
    var livre = st === 'disponivel' || (st === 'reservado' && r.cpf === ciHosp.cpf); // reservado só para o próprio hóspede
    var motivo = { ocupado: 'Ocupado', sujo: 'Sujo / manutenção', reservado: 'Reservado para outro hóspede', disponivel: 'Disponível', }[st];
    b.textContent = 'Quarto ' + q.n + ' — ' + (livre ? 'Disponível' : motivo + ' (indisponível)');
    b.disabled = !livre; b.className = ciQuarto === q ? 'sel' : '';
    b.onclick = function () { ciQuarto = q; ciMostrarQuartos(); };
    box.appendChild(b);
  });
}
$('ciConfirmar').onclick = function () {
  if (!ciHosp || !ciQuarto) return mensagem('Selecione o hóspede e um quarto disponível.', 'erro');
  var r = reservaHoje(ciQuarto); if (r) r.feito = true;
  ocupar(ciQuarto.n, ciHosp.nome, ciHosp.cpf, 2);
  mensagem('Check-in realizado: ' + ciHosp.nome + ' no quarto ' + ciQuarto.n + '.');
  ciLimpar(); atualizarTudo();
};
function ciLimpar() { ciHosp = null; ciQuarto = null; $('ciBusca').value = ''; $('ciHospede').textContent = 'Nenhum hóspede selecionado.'; ciMostrarQuartos(); }
$('ciLimpar').onclick = ciLimpar;

// ===== B. CHECK-OUT =====
var coQuarto = null;
autocompletar('coBusca', 'coSug', function (t) {
  if (!t) return [];
  return quartos.filter(function (q) { return q.st === 'ocupado' && (String(q.n).indexOf(t) >= 0 || q.hospede.toLowerCase().indexOf(t) >= 0); })
    .map(function (q) { return { texto: 'Quarto ' + q.n + ' — ' + q.hospede, q: q }; });
}, function (it) { coQuarto = it.q; coQuarto.pago = false; coMostrar(); });
function coMostrar() {
  var q = coQuarto; $('coCorpo').hidden = !q; if (!q) return;
  $('coInfo').innerHTML = '<b>' + q.hospede + '</b> — Quarto ' + q.n + ' (' + q.cat + ') — saída prevista: ' + fmtData(q.sai);
  $('coTabela').innerHTML = q.conta.map(function (i) {
    return '<tr><td>' + fmtData(i.data) + '</td><td>' + i.desc + '</td><td class="n">' + dinheiro(i.vu) + '</td><td class="n">' + i.qtd + '</td><td class="n">' + dinheiro(i.vu * i.qtd) + '</td></tr>';
  }).join('');
  $('coTotal').textContent = dinheiro(totalConta(q));
  coControlarBotoes();
}
function coControlarBotoes() { // a regra do pagamento é controlada aqui, pelo JavaScript
  $('coLiberar').disabled = !(coQuarto && coQuarto.pago);
  $('coPagar').disabled = !!(coQuarto && coQuarto.pago);
  $('coDica').textContent = coQuarto && coQuarto.pago ? 'Pagamento confirmado. Agora é possível liberar o quarto.' : 'Confirme o pagamento para liberar o quarto.';
  $('coLiberar').classList.toggle('padrao', !!(coQuarto && coQuarto.pago));
  $('coPagar').classList.toggle('padrao', !(coQuarto && coQuarto.pago));
}
$('coPagar').onclick = function () {
  if (!coQuarto) return;
  if (!confirm('Confirmar o recebimento de ' + dinheiro(totalConta(coQuarto)) + '?')) return;
  coQuarto.pago = true; coControlarBotoes(); mensagem('Pagamento confirmado.');
};
$('coLiberar').onclick = function () {
  if (!coQuarto || !coQuarto.pago) return mensagem('Confirme o pagamento antes de liberar o quarto.', 'erro');
  var n = coQuarto.n; coQuarto.st = 'sujo'; coQuarto.hospede = null; coQuarto.conta = []; coQuarto.pago = false; // quarto vai para limpeza
  coQuarto = null; $('coBusca').value = ''; coMostrar(); atualizarTudo();
  mensagem('Quarto ' + n + ' liberado e enviado para limpeza.');
};

// ===== C. RESERVAS =====
Object.keys(precos).forEach(function (c) { $('rCat').innerHTML += '<option>' + c + '</option>'; });
$('rEnt').min = hoje; $('rEnt').value = hoje; $('rSai').value = somaDias(hoje, 1); $('rSai').min = somaDias(hoje, 1);
function rAtualizar() {
  var ent = $('rEnt').value, sai = $('rSai').value;
  if (ent) $('rSai').min = somaDias(ent, 1); // prevenção: não deixa escolher saída antes da entrada
  var ok = ent && sai && sai > ent;
  var dias = ok ? Math.round((new Date(sai) - new Date(ent)) / 86400000) : 0;
  $('rValor').value = dinheiro(dias * precos[$('rCat').value]);
  $('rContadores').innerHTML = Object.keys(precos).map(function (c) {
    var livres = quartos.filter(function (q) { return q.cat === c && (ok ? !temConflito(q, ent, sai) : q.st === 'disponivel'); }).length;
    return '<div><span>' + c + ' (' + dinheiro(precos[c]) + '/diária)</span><b>' + livres + ' disponível(is)</b></div>';
  }).join('');
}
['rEnt', 'rSai', 'rCat'].forEach(function (id) { $(id).onchange = rAtualizar; });
$('rConfirmar').onclick = function () {
  var erros = [], nome = $('rNome').value.trim(), cpf = soNumeros($('rCpf').value), ent = $('rEnt').value, sai = $('rSai').value, pax = parseInt($('rPax').value, 10), cat = $('rCat').value;
  ['rNome', 'rCpf', 'rEnt', 'rSai', 'rPax'].forEach(function (id) { $(id).classList.remove('invalido'); });
  if (nome.length < 3) { erros.push('Informe o nome completo do hóspede.'); $('rNome').classList.add('invalido'); }
  if (cpf.length !== 11) { erros.push('O CPF deve ter 11 números.'); $('rCpf').classList.add('invalido'); }
  if (!ent || ent < hoje) { erros.push('A data de entrada não pode ser anterior a hoje (' + fmtData(hoje) + ').'); $('rEnt').classList.add('invalido'); }
  if (!sai || sai <= ent) { erros.push('A data de saída deve ser depois da data de entrada.'); $('rSai').classList.add('invalido'); }
  if (!(pax >= 1 && pax <= 4)) { erros.push('A quantidade de hóspedes deve ser de 1 a 4.'); $('rPax').classList.add('invalido'); }
  var q = erros.length ? null : quartoLivre(cat, ent, sai);
  if (!erros.length && !q) erros.push('Não há quarto ' + cat + ' livre nesse período. Escolha outras datas ou outra categoria.');
  mostrarErros('rErro', erros);
  if (erros.length) return mensagem('Corrija os campos destacados.', 'erro');
  var dias = Math.round((new Date(sai) - new Date(ent)) / 86400000), cod = 'RSV-' + (proxCodigo++);
  reservas.push({ cod: cod, nome: nome, cpf: cpf, q: q.n, cat: cat, ent: ent, sai: sai, pax: pax, valor: dias * precos[cat], ativa: true, feito: false });
  mensagem('Reserva ' + cod + ' confirmada — quarto ' + q.n + '.');
  $('rNome').value = ''; $('rCpf').value = ''; $('rPax').value = 1; atualizarTudo(); $('rNome').focus();
};
$('rLimpar').onclick = function () { $('rNome').value = ''; $('rCpf').value = ''; $('rEnt').value = hoje; $('rSai').value = somaDias(hoje, 1); mostrarErros('rErro', []); rAtualizar(); };

// ===== D. CANCELAMENTO (modal em duas etapas) =====
var cSel = null, tempoCancel;
function cListar() {
  var t = $('cBusca').value.trim().toLowerCase(), num = soNumeros(t) || '#';
  var achadas = reservas.filter(function (r) { return r.ativa && !r.feito && (!t || r.nome.toLowerCase().indexOf(t) >= 0 || r.cod.toLowerCase().indexOf(t) >= 0 || r.cpf.indexOf(num) >= 0); });
  $('cLista').innerHTML = achadas.length ? achadas.map(function (r) {
    return '<tr><td>' + r.cod + '</td><td>' + r.nome + '</td><td>' + r.q + ' (' + r.cat + ')</td><td>' + fmtData(r.ent) + ' a ' + fmtData(r.sai) + '</td><td><button class="btn sec" onclick="cEscolher(\'' + r.cod + '\')">Ver detalhes</button></td></tr>';
  }).join('') : '<tr><td colspan="5">Nenhuma reserva ativa encontrada. Tente outro nome, CPF ou código.</td></tr>';
  if (cSel && !cSel.ativa) { cSel = null; $('cDetalhe').hidden = true; }
}
$('cBusca').oninput = cListar;
function cEscolher(cod) {
  cSel = reservas.filter(function (r) { return r.cod === cod; })[0];
  $('cDetalhe').hidden = false;
  $('cDetalhe').innerHTML = '<h3>Reserva ' + cSel.cod + '</h3>' + resumoReserva(cSel) + '<div class="acoes"><button class="btn perigoBtn padrao" id="cSolicitar">🚫 Cancelar esta reserva…</button></div>';
  $('cSolicitar').onclick = abrirCancelamento;
}
function resumoReserva(r) {
  return '<div class="info">Hóspede: <b>' + r.nome + '</b> (CPF ' + fmtCpf(r.cpf) + ')<br>Quarto: ' + r.q + ' (' + r.cat + ')<br>Período: ' + fmtData(r.ent) + ' a ' + fmtData(r.sai) + ' — ' + r.pax + ' hóspede(s)<br>Valor: <b>' + dinheiro(r.valor) + '</b></div>';
}
function abrirCancelamento() {
  $('mResumo').innerHTML = '<b>' + cSel.cod + '</b>' + resumoReserva(cSel); $('mJust').value = ''; $('mObs').value = '';
  $('modalCancel').classList.add('aberto'); atualizarJustificativa(); $('mJust').focus();
}
function atualizarJustificativa() { // botão só libera 2 s depois de haver justificativa
  var b = $('mConfirmar'), j = $('mJust').value, ok = j && (j !== 'Outro' || $('mObs').value.trim().length >= 5);
  clearTimeout(tempoCancel); b.disabled = true;
  if (!ok) { b.textContent = j === 'Outro' ? 'Descreva o motivo (mín. 5 letras)' : 'Informe a justificativa'; return; }
  b.textContent = 'Aguarde 2 segundos…';
  tempoCancel = setTimeout(function () { b.disabled = false; b.textContent = 'Confirmar cancelamento'; }, 2000);
}
$('mJust').onchange = atualizarJustificativa; $('mObs').oninput = atualizarJustificativa;
function fecharCancelamento() { clearTimeout(tempoCancel); $('modalCancel').classList.remove('aberto'); }
$('mVoltar').onclick = fecharCancelamento;
$('mConfirmar').onclick = function () {
  if ($('mConfirmar').disabled || !cSel) return;
  cSel.ativa = false; cSel.motivo = $('mJust').value; var cod = cSel.cod; cSel = null;
  fecharCancelamento(); $('cDetalhe').hidden = true; atualizarTudo(); mensagem('Reserva ' + cod + ' cancelada. Disponibilidade atualizada.');
};

// ===== E. CONSUMO =====
var cProd = null;
autocompletar('cProduto', 'cSug', function (t) {
  if (!t) return [];
  return produtos.filter(function (p) { return p.nome.toLowerCase().indexOf(t) >= 0; }).map(function (p) { return { texto: p.icone + ' ' + p.nome + ' — ' + dinheiro(p.preco), p: p }; });
}, function (it) { cProd = it.p; $('cProduto').value = it.p.nome; $('cPreco').value = dinheiro(it.p.preco); cTotal(); $('cQtd').focus(); $('cQtd').select(); });
$('cProduto').addEventListener('input', function () { cProd = null; $('cPreco').value = ''; $('cTotal').value = ''; });
function cTotal() { var q = parseInt($('cQtd').value, 10) || 0; $('cTotal').value = cProd ? dinheiro(cProd.preco * q) : ''; }
$('cQtd').oninput = cTotal;
$('cQuarto').oninput = function () { var q = quartoNum($('cQuarto').value); $('cHospede').textContent = q ? (q.st === 'ocupado' ? '👤 ' + q.hospede : 'Quarto sem hóspede.') : ''; };
function registrarConsumo() {
  var q = quartoNum($('cQuarto').value), qtd = parseInt($('cQtd').value, 10), erros = [];
  if (!q || q.st !== 'ocupado') erros.push('Informe o número de um quarto ocupado (ex.: 101).');
  if (!cProd) erros.push('Escolha uma bebida na lista de sugestões.');
  if (!(qtd >= 1)) erros.push('A quantidade deve ser 1 ou mais.');
  mostrarErros('cErro', erros);
  if (erros.length) { $(!q || q.st !== 'ocupado' ? 'cQuarto' : 'cProduto').focus(); return; }
  q.conta.push({ data: hoje, desc: cProd.nome, vu: cProd.preco, qtd: qtd });
  historico.unshift({ hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), n: q.n, item: cProd.nome, qtd: qtd, total: cProd.preco * qtd });
  mensagem(qtd + 'x ' + cProd.nome + ' lançado(a) no quarto ' + q.n + '.');
  cProd = null; ['cProduto', 'cPreco', 'cTotal'].forEach(function (id) { $(id).value = ''; }); $('cQtd').value = 1;
  cMostrarHistorico(); $('cProduto').focus(); // foco volta ao produto para lançar em sequência
}
$('cRegistrar').onclick = registrarConsumo;
function cMostrarHistorico() {
  $('cHist').innerHTML = historico.length ? historico.map(function (h) { return '<tr><td>' + h.hora + '</td><td>' + h.n + '</td><td>' + h.item + '</td><td class="n">' + h.qtd + '</td><td class="n">' + dinheiro(h.total) + '</td></tr>'; }).join('') : '<tr><td colspan="5">Nenhum lançamento ainda.</td></tr>';
}

// ===== AJUDA E ATALHOS DE TECLADO =====
$('btnAjuda').onclick = function () { $('modalAjuda').classList.add('aberto'); $('fecharAjuda').focus(); };
$('fecharAjuda').onclick = function () { $('modalAjuda').classList.remove('aberto'); };
document.addEventListener('keydown', function (e) {
  if (e._tratado) return; // Enter já usado pelo autocomplete
  if (e.key === 'F2') { e.preventDefault(); irPara('reservas'); $('rNome').focus(); }
  else if (e.key === 'F3') { e.preventDefault(); irPara('consumo'); $('cQuarto').focus(); }
  else if (e.altKey && e.key.toLowerCase() === 'l') { e.preventDefault(); if (telaAtual === 'consumo') registrarConsumo(); }
  else if (e.key === 'Escape') {
    var aberto = document.querySelector('.modal.aberto');
    if (aberto) { if (aberto.id === 'modalCancel') fecharCancelamento(); else aberto.classList.remove('aberto'); } // 1º fecha o modal
    else if (fecharSugestoes()) { /* 2º fecha sugestões */ }
    else { if (document.activeElement) document.activeElement.blur(); if (telaAtual !== 'dashboard') irPara('dashboard'); }
  }
  else if (e.key === 'Enter' && e.target.tagName === 'INPUT' && !document.querySelector('.modal.aberto')) {
    var b = document.querySelector('.tela.ativa .padrao'); // ação padrão da tela
    if (b && !b.disabled) { e.preventDefault(); b.click(); }
  }
});

irPara('dashboard');

// =====================================================================
// VERSÃO MOBILE (Parte B) — roda dentro de uma função para não misturar
// com o desktop. Usa os MESMOS dados e regras do desktop (quartos, reservas,
// hospedes, produtos, ocupar, statusDe, temConflito...), definidos acima.
// =====================================================================
(function () {
var raiz = document.getElementById('app-mobile');
function $(id) { return document.getElementById('mb-' + id); } // ids do mobile começam com "mb-"
function mostrarErros(id, lista) { var e = $(id); e.hidden = !lista.length; e.innerHTML = lista.join('<br>'); }
// lista de botões grandes para tocar (reconhecimento em vez de digitação)
function lista(id, itens, aoEscolher, vazio) {
  var box = $(id); box.innerHTML = '';
  if (!itens.length) { box.innerHTML = '<p class="dica">' + (vazio || 'Nada encontrado. Tente outro termo.') + '</p>'; return; }
  itens.forEach(function (it) {
    var b = document.createElement('button'); b.type = 'button'; b.innerHTML = it.html;
    b.disabled = !!it.off; b.className = it.sel ? 'sel' : ''; b.onclick = function () { aoEscolher(it); };
    box.appendChild(b);
  });
}
function stepper(menos, mais, campo, min, max, aoMudar) {
  $(menos).onclick = function () { $(campo).value = Math.max(min, +$(campo).value - 1); aoMudar(); };
  $(mais).onclick = function () { $(campo).value = Math.min(max, +$(campo).value + 1); aoMudar(); };
}

// ===== NAVEGAÇÃO (4 abas inferiores: Quartos, Estadias, Reservas, Consumo) =====
var titulos = { quartos: 'Quartos', estadias: 'Estadias', reservas: 'Reservas', novaReserva: 'Nova reserva', consumo: 'Consumo' };
var abaDe = { novaReserva: 'reservas' };
var nomes = { disponivel: 'Disponível', ocupado: 'Ocupado', sujo: 'Manutenção', reservado: 'Reservado hoje' };
var icones = { disponivel: '✅', ocupado: '🛏️', sujo: '🧹', reservado: '📌' };
var telaAtual = 'quartos', sub = 'checkin';
function irPara(nome) {
  telaAtual = nome;
  raiz.querySelectorAll('.mtela').forEach(function (t) { t.classList.toggle('ativa', t.id === 'mb-' + nome); });
  raiz.querySelectorAll('.abas button').forEach(function (b) { b.classList.toggle('ativo', b.dataset.tela === (abaDe[nome] || nome)); });
  $('titulo').textContent = titulos[nome]; $('voltar').hidden = nome === 'quartos';
  window.scrollTo(0, 0); atualizarTudo();
}
raiz.querySelectorAll('.abas button').forEach(function (b) { b.onclick = function () { irPara(b.dataset.tela); }; });
$('voltar').onclick = function () { irPara(telaAtual === 'novaReserva' ? 'reservas' : 'quartos'); };
function subTela(n) {
  sub = n; $('checkin').hidden = n !== 'checkin'; $('checkout').hidden = n !== 'checkout';
  raiz.querySelectorAll('.seg button').forEach(function (b) { b.classList.toggle('ativo', b.dataset.sub === n); });
  atualizarTudo();
}
raiz.querySelectorAll('.seg button').forEach(function (b) { b.onclick = function () { subTela(b.dataset.sub); }; });
// "Próximo" do teclado virtual: Enter vai ao campo seguinte da tela
raiz.addEventListener('keydown', function (e) {
  e._tratado = true; // os atalhos de teclado do desktop não valem dentro da versão mobile
  if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
  var c = [].slice.call(raiz.querySelectorAll('.mtela.ativa input[enterkeyhint]')).filter(function (i) { return i.offsetParent; }), i = c.indexOf(e.target);
  if (i < 0) return; e.preventDefault(); if (i < c.length - 1) c[i + 1].focus(); else e.target.blur();
}, true);

// ===== QUARTOS (mapa) =====
function atualizarTudo() {
  var cont = { disponivel: 0, ocupado: 0, sujo: 0, reservado: 0 };
  $('grid').innerHTML = quartos.map(function (q) {
    var st = statusDe(q); cont[st]++;
    return '<button class="quarto ' + st + '" data-n="' + q.n + '"><b>' + q.n + '</b><small>' + q.cat + '</small><small>' + icones[st] + ' ' + nomes[st] + '</small></button>';
  }).join('');
  $('indicadores').innerHTML = ['disponivel', 'ocupado', 'sujo', 'reservado'].map(function (s) {
    return '<div class="ind ' + s + '"><b>' + cont[s] + '</b>' + icones[s] + ' ' + nomes[s] + '</div>';
  }).join('');
  if (telaAtual === 'estadias') { if (sub === 'checkin') ciRender(); else coRender(); }
  if (telaAtual === 'reservas') cListar();
  if (telaAtual === 'novaReserva') rAtualizar();
  if (telaAtual === 'consumo') cRender();
}
$('grid').onclick = function (e) { // no toque não existe hover: o toque mostra o hóspede
  var b = e.target.closest('.quarto'); if (!b) return;
  var q = quartoNum(b.dataset.n), st = statusDe(q);
  mensagem('Quarto ' + q.n + ' — ' + (st === 'ocupado' ? 'hóspede: ' + resumido(q.hospede) : nomes[st]));
};

// ===== A. CHECK-IN =====
var ciHosp = null, ciQuarto = null;
function ciRender() {
  var t = $('ciBusca').value.trim().toLowerCase(), num = soNumeros(t) || '#';
  lista('ciLista', hospedes.filter(function (h) { return !t || h.nome.toLowerCase().indexOf(t) >= 0 || h.cpf.indexOf(num) >= 0; })
    .map(function (h) { return { html: '<b>' + h.nome + '</b><small>CPF ' + fmtCpf(h.cpf) + ' · ' + h.cat + '</small>', sel: ciHosp === h, h: h }; }),
    function (it) { ciHosp = it.h; ciQuarto = null; ciRender(); }, 'Nenhum hóspede encontrado. Confira o nome ou o CPF.');
  $('ciPasso2').hidden = !ciHosp;
  if (ciHosp) {
    lista('ciQuartos', quartos.filter(function (q) { return q.cat === ciHosp.cat; }).map(function (q) {
      var st = statusDe(q), r = reservaHoje(q), livre = st === 'disponivel' || (st === 'reservado' && r.cpf === ciHosp.cpf);
      var motivo = { ocupado: 'Ocupado', sujo: 'Manutenção', reservado: 'Reservado para outro hóspede' }[st];
      return { html: '<b>Quarto ' + q.n + '</b><small>' + (livre ? 'Disponível' : motivo + ' (indisponível)') + '</small>', off: !livre, sel: ciQuarto === q, q: q };
    }), function (it) { ciQuarto = it.q; ciRender(); });
  }
  $('ciConfirmar').disabled = !(ciHosp && ciQuarto); $('ciDica').hidden = !$('ciConfirmar').disabled;
}
$('ciBusca').oninput = ciRender;
$('ciConfirmar').onclick = function () {
  if (!ciHosp || !ciQuarto) return mensagem('Selecione o hóspede e um quarto disponível.', 'erro');
  var r = reservaHoje(ciQuarto); if (r) r.feito = true;
  ocupar(ciQuarto.n, ciHosp.nome, ciHosp.cpf, 2);
  mensagem('Check-in realizado: ' + ciHosp.nome + ' no quarto ' + ciQuarto.n + '.');
  ciLimpar();
};
function ciLimpar() { ciHosp = null; ciQuarto = null; $('ciBusca').value = ''; atualizarTudo(); }
$('ciLimpar').onclick = ciLimpar;

// ===== B. CHECK-OUT =====
var coQuarto = null;
function coRender() {
  var t = $('coBusca').value.trim().toLowerCase(), q = coQuarto;
  $('coBuscaBox').hidden = !!q; $('coCorpo').hidden = !q;
  if (!q) {
    lista('coLista', quartos.filter(function (x) { return x.st === 'ocupado' && (!t || String(x.n).indexOf(t) >= 0 || x.hospede.toLowerCase().indexOf(t) >= 0); })
      .map(function (x) { return { html: '<b>Quarto ' + x.n + '</b><small>' + x.hospede + ' · saída ' + fmtData(x.sai) + '</small>', q: x }; }),
      function (it) { coQuarto = it.q; coQuarto.pago = false; coRender(); }, 'Nenhum quarto ocupado encontrado.');
    return;
  }
  $('coInfo').innerHTML = '<b>' + q.hospede + '</b><br>Quarto ' + q.n + ' (' + q.cat + ') — saída prevista: ' + fmtData(q.sai);
  $('coItens').innerHTML = q.conta.map(function (i) {
    return '<div class="item"><span>' + i.desc + '<small>' + fmtData(i.data) + ' · ' + i.qtd + ' × ' + dinheiro(i.vu) + '</small></span><b>' + dinheiro(i.vu * i.qtd) + '</b></div>';
  }).join('');
  $('coTotal').textContent = dinheiro(totalConta(q));
  $('coPagar').disabled = q.pago; $('coLiberar').disabled = !q.pago; // a regra do pagamento é controlada aqui
  $('coDica').textContent = q.pago ? 'Pagamento confirmado. Agora é possível liberar o quarto.' : 'Confirme o pagamento para liberar o quarto.';
}
$('coBusca').oninput = coRender;
$('coVoltar').onclick = function () { coQuarto = null; $('coBusca').value = ''; coRender(); };
$('coPagar').onclick = function () {
  if (!coQuarto) return;
  if (!coQuarto.confirmando) { coQuarto.confirmando = true; $('coPagar').textContent = '✔ Toque de novo para confirmar ' + dinheiro(totalConta(coQuarto)); setTimeout(function () { if (coQuarto) coQuarto.confirmando = false; $('coPagar').textContent = '💳 Marcar como pago'; }, 4000); return; } coQuarto.confirmando = false; $('coPagar').textContent = '💳 Marcar como pago';
  coQuarto.pago = true; coRender(); mensagem('Pagamento confirmado.');
};
$('coLiberar').onclick = function () {
  if (!coQuarto || !coQuarto.pago) return mensagem('Confirme o pagamento antes de liberar o quarto.', 'erro');
  var n = coQuarto.n; coQuarto.st = 'sujo'; coQuarto.hospede = null; coQuarto.conta = []; coQuarto.pago = false; // vai para limpeza
  coQuarto = null; $('coBusca').value = ''; atualizarTudo();
  mensagem('Quarto ' + n + ' liberado e enviado para limpeza.');
};

// ===== C. RESERVAS (botão flutuante + fluxo em 2 telas) =====
Object.keys(precos).forEach(function (c) { $('rCat').innerHTML += '<option>' + c + '</option>'; });
$('rEnt').min = hoje; $('rEnt').value = hoje; $('rSai').value = somaDias(hoje, 1); $('rSai').min = somaDias(hoje, 1);
function rAtualizar() {
  var ent = $('rEnt').value, sai = $('rSai').value;
  if (ent) $('rSai').min = somaDias(ent, 1); // prevenção: saída nunca antes da entrada
  var ok = ent && sai && sai > ent;
  var dias = ok ? Math.round((new Date(sai) - new Date(ent)) / 86400000) : 0;
  $('rValor').value = dinheiro(dias * precos[$('rCat').value]);
  $('rContadores').innerHTML = Object.keys(precos).map(function (c) {
    var livres = quartos.filter(function (q) { return q.cat === c && (ok ? !temConflito(q, ent, sai) : q.st === 'disponivel'); }).length;
    return '<div><span>' + c + ' (' + dinheiro(precos[c]) + '/diária)</span><b>' + livres + ' disponível(is)</b></div>';
  }).join('');
}
['rEnt', 'rSai', 'rCat'].forEach(function (id) { $(id).onchange = rAtualizar; });
stepper('rMenos', 'rMais', 'rPax', 1, 4, function () { });
function rPasso(n) { $('rp1').hidden = n !== 1; $('rp2').hidden = n !== 2; window.scrollTo(0, 0); }
function rDatasOk() {
  var erros = [], ent = $('rEnt').value, sai = $('rSai').value, cat = $('rCat').value;
  ['rEnt', 'rSai'].forEach(function (id) { $(id).classList.remove('invalido'); });
  if (!ent || ent < hoje) { erros.push('A data de entrada não pode ser anterior a hoje (' + fmtData(hoje) + ').'); $('rEnt').classList.add('invalido'); }
  if (!sai || sai <= ent) { erros.push('A data de saída deve ser depois da data de entrada.'); $('rSai').classList.add('invalido'); }
  if (!erros.length && !quartoLivre(cat, ent, sai)) erros.push('Não há quarto ' + cat + ' livre nesse período. Escolha outras datas ou outra categoria.');
  mostrarErros('rErro1', erros); return !erros.length;
}
$('fab').onclick = function () { irPara('novaReserva'); rPasso(1); };
$('rProximo').onclick = function () {
  if (!rDatasOk()) return mensagem('Corrija os campos destacados.', 'erro');
  $('rResumo').innerHTML = '<b>' + $('rCat').value + '</b> · ' + fmtData($('rEnt').value) + ' a ' + fmtData($('rSai').value) + ' · ' + $('rValor').value; rPasso(2);
};
$('rVoltarPasso').onclick = function () { rPasso(1); };
$('rConfirmar').onclick = function () {
  var erros = [], nome = $('rNome').value.trim(), cpf = soNumeros($('rCpf').value), pax = parseInt($('rPax').value, 10);
  ['rNome', 'rCpf'].forEach(function (id) { $(id).classList.remove('invalido'); });
  if (nome.length < 3) { erros.push('Informe o nome completo do hóspede.'); $('rNome').classList.add('invalido'); }
  if (cpf.length !== 11) { erros.push('O CPF deve ter 11 números.'); $('rCpf').classList.add('invalido'); }
  mostrarErros('rErro', erros);
  if (erros.length) return mensagem('Corrija os campos destacados.', 'erro');
  if (!rDatasOk()) { rPasso(1); return mensagem('Revise as datas e a categoria.', 'erro'); }
  var ent = $('rEnt').value, sai = $('rSai').value, cat = $('rCat').value, q = quartoLivre(cat, ent, sai);
  var dias = Math.round((new Date(sai) - new Date(ent)) / 86400000), cod = 'RSV-' + (proxCodigo++);
  reservas.push({ cod: cod, nome: nome, cpf: cpf, q: q.n, cat: cat, ent: ent, sai: sai, pax: pax, valor: dias * precos[cat], ativa: true, feito: false });
  $('rNome').value = ''; $('rCpf').value = ''; $('rPax').value = 1; $('rEnt').value = hoje; $('rSai').value = somaDias(hoje, 1);
  irPara('reservas'); mensagem('Reserva ' + cod + ' salva — quarto ' + q.n + '.');
};

// ===== D. CANCELAMENTO (3 passos: cancelar → justificativa → segurar 2 s) =====
var cSel = null, seguraT, seguraOk = false, pressionado = false;
function cListar() {
  var t = $('cBusca').value.trim().toLowerCase(), num = soNumeros(t) || '#';
  var achadas = reservas.filter(function (r) { return r.ativa && !r.feito && (!t || r.nome.toLowerCase().indexOf(t) >= 0 || r.cod.toLowerCase().indexOf(t) >= 0 || r.cpf.indexOf(num) >= 0); });
  $('cLista').innerHTML = achadas.length ? achadas.map(function (r) {
    return '<div class="rcard"><b>' + r.cod + ' — ' + r.nome + '</b><small>Quarto ' + r.q + ' (' + r.cat + ') · ' + fmtData(r.ent) + ' a ' + fmtData(r.sai) + '</small><button class="btn sec" data-cod="' + r.cod + '"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 8l8 8M16 8l-8 8"/></svg> Cancelar reserva</button></div>';
  }).join('') : '<p class="dica">Nenhuma reserva ativa encontrada. Tente outro nome, CPF ou código.</p>';
}
$('cBusca').oninput = cListar;
$('cLista').onclick = function (e) {
  var bt = e.target.closest('[data-cod]'); if (!bt) return; var cod = bt.dataset.cod;
  cSel = reservas.filter(function (r) { return r.cod === cod; })[0]; abrirCancelamento();
};
function resumoReserva(r) {
  return '<div class="info">Hóspede: <b>' + r.nome + '</b> (CPF ' + fmtCpf(r.cpf) + ')<br>Quarto: ' + r.q + ' (' + r.cat + ')<br>Período: ' + fmtData(r.ent) + ' a ' + fmtData(r.sai) + ' — ' + r.pax + ' hóspede(s)<br>Valor: <b>' + dinheiro(r.valor) + '</b></div>';
}
function abrirCancelamento() {
  $('mResumo').innerHTML = '<b>' + cSel.cod + '</b>' + resumoReserva(cSel); $('mJust').value = ''; $('mObs').value = '';
  $('modalCancel').classList.add('aberto'); atualizarJustificativa();
}
function atualizarJustificativa() {
  var b = $('mConfirmar'), j = $('mJust').value, ok = j && (j !== 'Outro' || $('mObs').value.trim().length >= 5);
  b.disabled = !ok; // explica por que está desabilitado
  b.textContent = ok ? 'Segure para cancelar (2 s)' : (j === 'Outro' ? 'Descreva o motivo (mín. 5 letras)' : 'Informe a justificativa');
}
$('mJust').onchange = atualizarJustificativa; $('mObs').oninput = atualizarJustificativa;
function fecharCancelamento() { clearTimeout(seguraT); pressionado = false; $('mConfirmar').classList.remove('segurando'); $('modalCancel').classList.remove('aberto'); }
$('mVoltar').onclick = fecharCancelamento; $('mX').onclick = fecharCancelamento;
$('modalCancel').onclick = function (e) { if (e.target === this) fecharCancelamento(); };
function segurar(on) { // soltar antes de 2 s não cancela nada
  var b = $('mConfirmar'); clearTimeout(seguraT); b.classList.remove('segurando');
  if (on && !b.disabled) { pressionado = true; seguraOk = false; b.classList.add('segurando'); seguraT = setTimeout(function () { seguraOk = true; concluirCancelamento(); }, 2000); }
  else if (!on) { if (pressionado && !seguraOk) mensagem('Segure o botão por 2 segundos para cancelar. Soltar antes não cancela nada.', 'erro'); pressionado = false; }
}
var bC = $('mConfirmar');
bC.onpointerdown = function (e) { e.preventDefault(); segurar(true); };
bC.onpointerup = bC.onpointerleave = bC.onpointercancel = function () { segurar(false); };
bC.oncontextmenu = function (e) { e.preventDefault(); };
function concluirCancelamento() {
  if (!cSel) return;
  cSel.ativa = false; cSel.motivo = $('mJust').value; var cod = cSel.cod; cSel = null;
  fecharCancelamento(); atualizarTudo(); mensagem('Reserva ' + cod + ' cancelada. Disponibilidade atualizada.');
}

// ===== E. CONSUMO =====
var cProd = null, ultimo = null;
function cRender() {
  var q = quartoNum($('cQuarto').value), t = $('cProduto').value.trim().toLowerCase();
  $('cHospede').textContent = $('cQuarto').value ? (q ? (q.st === 'ocupado' ? '👤 ' + q.hospede : 'Quarto sem hóspede.') : 'Quarto não encontrado.') : '';
  lista('cProdutos', produtos.filter(function (p) { return !t || p.nome.toLowerCase().indexOf(t) >= 0; }).map(function (p) {
    return { html: '<span class="foto">' + p.icone + '</span><b>' + p.nome + '</b><small>' + dinheiro(p.preco) + '</small>', sel: cProd === p, p: p };
  }), function (it) { cProd = it.p; cRender(); }, 'Nenhuma bebida encontrada. Tente "co", "ág" ou "su".');
  $('cTotal').textContent = dinheiro(cProd ? cProd.preco * (+$('cQtd').value || 0) : 0);
  cMostrarHistorico();
}
$('cQuarto').oninput = cRender; $('cProduto').oninput = cRender;
stepper('cMenos', 'cMais', 'cQtd', 1, 20, cRender);
$('cRegistrar').onclick = function () {
  var q = quartoNum($('cQuarto').value), qtd = parseInt($('cQtd').value, 10), erros = [];
  if (!q || q.st !== 'ocupado') erros.push('Informe o número de um quarto ocupado (ex.: 101).');
  if (!cProd) erros.push('Toque em uma bebida da lista.');
  mostrarErros('cErro', erros);
  if (erros.length) return mensagem('Revise os dados do lançamento.', 'erro');
  q.conta.push({ data: hoje, desc: cProd.nome, vu: cProd.preco, qtd: qtd });
  historico.unshift({ hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), n: q.n, item: cProd.nome, qtd: qtd, total: cProd.preco * qtd });
  ultimo = { q: q, reg: q.conta[q.conta.length - 1], h: historico[0] };
  $('desfazerTxt').textContent = qtd + 'x ' + cProd.nome + ' no quarto ' + q.n; $('desfazer').hidden = false;
  mensagem(qtd + 'x ' + cProd.nome + ' lançado(a) no quarto ' + q.n + '.');
  cProd = null; $('cProduto').value = ''; $('cQtd').value = 1; cRender(); // quarto permanece para lançar em sequência
};
$('btnDesfazer').onclick = function () {
  if (!ultimo) return;
  var i = ultimo.q.conta.indexOf(ultimo.reg); if (i >= 0) ultimo.q.conta.splice(i, 1);
  var j = historico.indexOf(ultimo.h); if (j >= 0) historico.splice(j, 1);
  ultimo = null; $('desfazer').hidden = true; cRender(); mensagem('Lançamento desfeito.');
};
function cMostrarHistorico() {
  $('cHist').innerHTML = historico.length ? historico.slice(0, 5).map(function (h) {
    return '<div class="item"><span>' + h.qtd + 'x ' + h.item + '<small>' + h.hora + ' · Quarto ' + h.n + '</small></span><b>' + dinheiro(h.total) + '</b></div>';
  }).join('') : '<p class="dica">Nenhum lançamento ainda.</p>';
}

irPara('quartos');
// ao redimensionar a janela entre desktop e mobile, as duas versões se atualizam com os mesmos dados
window.matchMedia('(max-width:768px)').addEventListener('change', function () { window.atualizarTudo(); atualizarTudo(); });
})();
