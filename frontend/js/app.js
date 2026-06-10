/**
 * app.js — Ponto de entrada principal
 * Organizador Financeiro
 *
 * Responsabilidades:
 *  - Inicializar a aplicação após o DOM carregar
 *  - Controlar a navegação entre seções (SPA simples)
 *  - Carregar e renderizar dados do dashboard via fetch()
 */

// ============================================================
// CONFIGURAÇÃO
// ============================================================
// As configurações de API e requests estão em api.js

// Estado global da listagem de transações
let todasTransacoes = [];

// Categorias carregadas do backend (preenchidas em loadCategorias)
let CATEGORIAS = [];
let MAPA_LABEL_CATEGORIA = {};
let MAPA_EMOJI_CATEGORIA = {};
let MAPA_GRUPO_CATEGORIA = {};

// Estilo dos grupos (única fonte de cor/ícone/ordem do grupo no front).
const GRUPOS = {
  alimentacao: { label: 'Alimentação',       icon: '🍽️', cor: '#a78bfa', ordem: 1 },
  transporte:  { label: 'Transporte',        icon: '🚗', cor: '#60a5fa', ordem: 2 },
  moradia:     { label: 'Moradia',           icon: '🏠', cor: '#fb923c', ordem: 3 },
  saude:       { label: 'Saúde e bem-estar', icon: '💊', cor: '#fb7185', ordem: 4 },
  compras:     { label: 'Compras',           icon: '🛍️', cor: '#f472b6', ordem: 5 },
  lazer:       { label: 'Lazer',             icon: '🎮', cor: '#fbbf24', ordem: 6 },
  educacao:    { label: 'Educação',          icon: '📚', cor: '#2dd4bf', ordem: 7 },
  financas:    { label: 'Finanças',          icon: '💰', cor: '#34d399', ordem: 8 },
  servicos:    { label: 'Serviços',          icon: '🧰', cor: '#94a3b8', ordem: 9 },
  outros:      { label: 'Outros',            icon: '📦', cor: '#b8a08a', ordem: 10 },
  renda:       { label: 'Renda',             icon: '💵', cor: '#10b981', ordem: 11 },
};

let estadoFiltros = {
  periodo: 'este-mes',      // 'este-mes' | 'mes-passado' | 'todos'
  tipo: 'todos',            // 'todos' | 'entrada' | 'saida' | 'pendente'
  ordenacao: 'data-desc',   // 'data-desc' | 'data-asc' | 'valor-desc' | 'valor-asc'
  categoria: 'todas',       // 'todas' | <slug>
  busca: '',
  mostrarOcultos: false,
  pagina: 1,
  porPagina: 10,
};

// ============================================================
// INICIALIZAÇÃO
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Redireciona para a tela de login caso não esteja autenticado
  if (!localStorage.getItem('access_token')) {
    window.location.href = window.location.protocol === 'file:' ? 'login.html' : '/login';
    return;
  }

  exibirNomeUsuario();
  inicializarNavegacao();
  inicializarMenuMobile();
  inicializarColapsoSidebar();
  inicializarModal();
  inicializarFormTransacao();
  inicializarSecaoTransacoes();
  inicializarDropdowns();
  inicializarLogout();
  await loadCategorias();
  carregarDashboard();
  carregarTodasTransacoes();
});

// ============================================================
// NOME DO USUÁRIO NO HEADER
// ============================================================
function exibirNomeUsuario() {
  const nome = localStorage.getItem('user_name') || 'Usuário';
  const iniciais = nome
    .split(' ')
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('');

  // Saudação no título da página
  const elNome = document.getElementById('nome-usuario');
  if (elNome) elNome.textContent = nome;

  // Rodapé da sidebar (avatar + nome)
  const elSidebarNome = document.getElementById('sidebar-nome');
  if (elSidebarNome) elSidebarNome.textContent = nome;
  const elSidebarAvatar = document.getElementById('sidebar-avatar');
  if (elSidebarAvatar) elSidebarAvatar.textContent = iniciais;
}

// ============================================================
// LOGOUT DO USUÁRIO
// ============================================================
function inicializarLogout() {
  const btnSair = document.getElementById('nav-sair');
  if (btnSair) {
    btnSair.addEventListener('click', () => {
      // Limpa os dados de autenticação do localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_name');
    });
  }
}

// ============================================================
// CARREGAMENTO DO DASHBOARD (resumo + transações recentes)
// ============================================================
async function carregarDashboard() {
  await carregarResumo();
}

// --- Resumo financeiro ---
async function carregarResumo() {
  mostrarSpinner(true);
  try {
    const dados = await TransacoesAPI.resumo();
    renderizarResumo(dados);
  } catch (erro) {
    console.error('Erro ao carregar dashboard:', erro.message);
    mostrarToast('Não foi possível carregar o resumo financeiro.', 'erro');
  } finally {
    mostrarSpinner(false);
  }
}

function renderizarResumo(dados) {
  const txt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const resumo = dados.resumo || {};
  const comparativo = dados.comparativo || {};
  const serie = dados.serieDiaria || {};
  const categorias = dados.categorias || [];

  const nome = (localStorage.getItem('user_name') || 'Você').split(' ')[0];
  const gasto = resumo.saidas ?? 0;
  const pendentes = resumo.pendentes ?? 0;
  const mes = new Date().toLocaleDateString('pt-BR', { month: 'long' });

  const difPct = comparativo.difPct ?? 0;
  const gastoAnterior = comparativo.gastoAnterior ?? 0;
  const diferenca = Math.abs(gastoAnterior - gasto);
  const abaixo = gasto <= gastoAnterior;

  // Categoria principal (maior gasto do mês)
  const topCat = categorias[0];
  const categoriaPrincipal = topCat ? labelCategoria(topCat.categoria) : '—';
  const categoriaEmoji = topCat ? emojiCategoria(topCat.categoria) : '';

  // Card insight
  txt('insight-mensagem',
    `${nome}, seu gasto do mês está em ${formatarBRL(gasto)}, com ${formatarBRL(pendentes)} ainda pendente.`);
  txt('kpi-gasto-rotulo', `Gasto em ${mes}`);
  txt('kpi-gasto', formatarBRL(gasto));
  txt('kpi-comparativo', `${difPct <= 0 ? '↘' : '↗'} ${Math.abs(difPct).toFixed(0)}%`);
  txt('kpi-categoria', `${categoriaEmoji} ${categoriaPrincipal}`.trim());
  txt('insight-data', formatarDataExtenso(new Date()));

  const elComp = document.getElementById('kpi-comparativo');
  if (elComp) elComp.classList.toggle('kpi__valor--positivo', difPct <= 0);

  // Card gráfico
  txt('chart-destaque', formatarBRL(diferenca));
  txt('chart-variacao', `${difPct <= 0 ? '▾' : '▴'} ${Math.abs(difPct).toFixed(1)}%`);
  txt('chart-anterior', `vs ${formatarBRL(gastoAnterior)} mês anterior`);

  const elBadge = document.getElementById('chart-variacao');
  if (elBadge) elBadge.classList.toggle('badge-variacao--alta', difPct > 0);

  const elDestaqueEm = document.querySelector('.painel__destaque em');
  if (elDestaqueEm) elDestaqueEm.textContent = abaixo ? 'abaixo' : 'acima';

  // Série real do backend
  const dias = Math.max((serie.atual || []).length, (serie.anterior || []).length) || 30;
  const labels = Array.from({ length: dias }, (_, i) => String(i + 1));
  criarLinhaComparativa('grafico-linha-gastos', labels, serie.atual || [], serie.anterior || [], serie.diaCorrente || dias);
}

// Formata data como "09 de jun. de 2026"
function formatarDataExtenso(data) {
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function labelCategoria(cat) {
  return MAPA_LABEL_CATEGORIA[cat] ?? cat ?? '—';
}

function emojiCategoria(cat) {
  return MAPA_EMOJI_CATEGORIA[cat] ?? '📦';
}

async function loadCategorias() {
  try {
    const resposta = await CategoriasAPI.listar();
    CATEGORIAS = Array.isArray(resposta) ? resposta : (resposta?.results ?? []);
  } catch (erro) {
    console.error('Erro ao carregar categorias:', erro.message);
    mostrarToast('Não foi possível carregar as categorias.', 'erro');
    CATEGORIAS = [];
  }

  MAPA_LABEL_CATEGORIA = {};
  MAPA_EMOJI_CATEGORIA = {};
  MAPA_GRUPO_CATEGORIA = {};
  CATEGORIAS.forEach((c) => {
    MAPA_LABEL_CATEGORIA[c.slug] = c.name;
    MAPA_EMOJI_CATEGORIA[c.slug] = c.icon || '📦';
    MAPA_GRUPO_CATEGORIA[c.slug] = c.group || 'outros';
  });

  const select = document.getElementById('transacao-categoria');
  if (select) {
    select.innerHTML = '<option value="">Selecione...</option>' +
      CATEGORIAS.map((c) => `<option value="${c.slug}">${c.name}</option>`).join('');
  }

  const filtroCat = document.getElementById('filtro-categoria');
  if (filtroCat) {
    filtroCat.innerHTML = '<option value="todas">Todas as categorias</option>' +
      CATEGORIAS.map((c) => `<option value="${c.slug}">${c.name}</option>`).join('');
  }

  if (select) melhorarSelect(select);
  if (filtroCat) melhorarSelect(filtroCat);
}

// --- Transações recentes ---
function renderizarTransacoesRecentes(lista) {
  const container = document.getElementById('lista-transacoes-recentes');
  if (!container) return;
  if (!lista.length) { container.innerHTML = criarEstadoVazio('Nenhuma transação registrada ainda.'); return; }
  container.innerHTML = lista.map(transacaoCard).join('');
}

// ============================================================
// NAVEGAÇÃO ENTRE SEÇÕES (SPA simples via hash)
// ============================================================
function inicializarNavegacao() {
  const linksNav = document.querySelectorAll('.nav__item a, .pill-nav__item');
  const secoes   = document.querySelectorAll('.pagina');

  function ativarSecao(hash) {
    const alvo = hash.replace('#', '') || 'dashboard';

    // Remove classe ativa de todas as seções e links
    secoes.forEach(s => s.classList.remove('pagina--ativa'));
    linksNav.forEach(l => {
      l.classList.remove('ativo');
      l.removeAttribute('aria-current');
    });

    // Ativa a seção e todos os links (sidebar + pílulas) do mesmo destino
    const secaoAtiva = document.getElementById(alvo);
    if (secaoAtiva) secaoAtiva.classList.add('pagina--ativa');

    document.querySelectorAll(`a[href="#${alvo}"]`).forEach(link => {
      if (link.classList.contains('nav__item') || link.matches('.nav__item a, .pill-nav__item')) {
        link.classList.add('ativo');
        link.setAttribute('aria-current', 'page');
      }
    });

    // Render lazy da tela alvo
    switch (alvo) {
      case 'categorias':    renderizarPaginaCategorias(); break;
      case 'parcelamentos': renderizarPaginaParcelamentos(); break;
    }
  }

  linksNav.forEach(link => {
    if (!link.href.includes('login.html')) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const hash = link.getAttribute('href');
        history.pushState(null, '', hash);
        ativarSecao(hash);
        fecharMenuMobile();
      });
    }
  });

  ativarSecao(window.location.hash || '#dashboard');

  window.addEventListener('popstate', () => {
    ativarSecao(window.location.hash || '#dashboard');
  });
}

// ============================================================
// MENU MOBILE
// ============================================================
function inicializarMenuMobile() {
  const btnMenu = document.getElementById('menu-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (!btnMenu || !sidebar || !overlay) return;

  btnMenu.addEventListener('click', () => {
    const aberta = sidebar.classList.toggle('aberta');
    overlay.classList.toggle('ativo', aberta);
    btnMenu.setAttribute('aria-expanded', String(aberta));
  });

  overlay.addEventListener('click', fecharMenuMobile);
}

function fecharMenuMobile() {
  document.getElementById('sidebar')?.classList.remove('aberta');
  document.getElementById('sidebar-overlay')?.classList.remove('ativo');
  document.getElementById('menu-btn')?.setAttribute('aria-expanded', 'false');
}

// ============================================================
// COLAPSO SIDEBAR (rail, desktop) — persiste em localStorage
// ============================================================
const CHAVE_SIDEBAR_COLAPSADA = 'sidebar-colapsada';

function inicializarColapsoSidebar() {
  const btn = document.getElementById('sidebar-colapsar');
  const sidebar = document.getElementById('sidebar');

  if (!btn || !sidebar) return;

  const colapsada = localStorage.getItem(CHAVE_SIDEBAR_COLAPSADA) === 'true';
  aplicarColapsoSidebar(sidebar, btn, colapsada);

  btn.addEventListener('click', () => {
    const novo = !sidebar.classList.contains('colapsada');
    aplicarColapsoSidebar(sidebar, btn, novo);
    localStorage.setItem(CHAVE_SIDEBAR_COLAPSADA, String(novo));
  });
}

function aplicarColapsoSidebar(sidebar, btn, colapsada) {
  sidebar.classList.toggle('colapsada', colapsada);
  const rotulo = colapsada ? 'Abrir barra lateral' : 'Recolher barra lateral';
  btn.setAttribute('aria-pressed', String(colapsada));
  btn.setAttribute('aria-label', rotulo);
  btn.setAttribute('data-tooltip', rotulo);
}

// ============================================================
// MODAL DE NOVA TRANSAÇÃO
// ============================================================
// ============================================================
// MODAL DE NOVA TRANSAÇÃO
// ============================================================
function inicializarModal() {
  const btnAbrir  = document.getElementById('btn-nova-transacao');
  const modal     = document.getElementById('modal-transacao');
  const btnFechar = document.getElementById('modal-fechar');
  const btnCancelar = document.getElementById('btn-cancelar-transacao');

  btnAbrir?.addEventListener('click', () => abrirModal());
  btnFechar?.addEventListener('click', fecharModal);
  btnCancelar?.addEventListener('click', fecharModal);

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) fecharModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharModal();
  });
}

/**
 * Abre o modal.
 * @param {Object|null} transacao - Se passado, preenche o form para edição.
 */
function abrirModal(transacao = null) {
  const modal  = document.getElementById('modal-transacao');
  const titulo = document.getElementById('modal-transacao-titulo');

  if (transacao) {
    // Modo edição: preenche campos
    titulo.textContent = 'Editar Transação';
    document.getElementById('transacao-id').value          = transacao.id ?? '';
    document.getElementById('transacao-descricao').value   = transacao.descricao ?? '';
    const totalParcelas = transacao.parcelas ?? 1;
    document.getElementById('transacao-valor').value = (transacao.valor ?? 0) * totalParcelas;
    const inpParc = document.getElementById('transacao-parcelas');
    if (inpParc) inpParc.value = totalParcelas;
    document.getElementById('transacao-data').value        = transacao.data ?? '';
    document.getElementById('transacao-categoria').value   = transacao.categoria ?? '';
    document.getElementById('transacao-observacao').value  = transacao.observacao ?? '';
    selecionarTipo(transacao.tipo ?? 'entrada');
  } else {
    // Modo criação: limpa o form
    titulo.textContent = 'Nova Transação';
    document.getElementById('form-transacao').reset();
    document.getElementById('transacao-id').value = '';
    // Define a data de hoje como padrão
    document.getElementById('transacao-data').value = new Date().toISOString().split('T')[0];
    selecionarTipo('entrada');
  }

  document.getElementById('transacao-categoria')?.dispatchEvent(new Event('change', { bubbles: true }));

  atualizarFeedbackParcelas();
  modal?.classList.remove('oculto');
  document.body.style.overflow = 'hidden';
  document.getElementById('transacao-descricao')?.focus();
}

function fecharModal() {
  const modal = document.getElementById('modal-transacao');
  modal?.classList.add('oculto');
  document.body.style.overflow = '';
  limparErrosForm();
}

// ============================================================
// HELPER: cabeçalhos removido (centralizado na api.js)
// ============================================================

// ============================================================
// FORMULÁRIO DE TRANSAÇÃO
// ============================================================
function inicializarFormTransacao() {
  // --- Seletor de tipo ---
  document.querySelectorAll('.tipo-btn').forEach(btn => {
    btn.addEventListener('click', () => selecionarTipo(btn.dataset.tipo));
  });

  // --- Feedback dinâmico de parcelas ---
  document.getElementById('transacao-valor')?.addEventListener('input', atualizarFeedbackParcelas);
  document.getElementById('transacao-parcelas')?.addEventListener('input', atualizarFeedbackParcelas);

  // --- Submit ---
  document.getElementById('form-transacao')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validarFormTransacao()) return;
    await salvarTransacao();
  });
}

/** Atualiza o feedback "Nx de R$ y" do formulário de parcelas. */
function atualizarFeedbackParcelas() {
  const total = parseFloat(document.getElementById('transacao-valor').value) || 0;
  const n = parseInt(document.getElementById('transacao-parcelas')?.value ?? '1', 10) || 1;
  const fb = document.getElementById('parcelas-feedback');
  if (!fb) return;
  fb.textContent = (n > 1 && total > 0) ? `${n}x de ${formatarBRL(total / n)}` : '';
}

/** Ativa o botão de tipo e atualiza o campo hidden */
function selecionarTipo(tipo) {
  document.querySelectorAll('.tipo-btn').forEach(btn => {
    btn.classList.toggle('ativo', btn.dataset.tipo === tipo);
  });
  document.getElementById('transacao-tipo').value = tipo;

  // Mostra parcelas para entrada e saída; oculta para pendente
  const grupoParcelas = document.getElementById('grupo-parcelas');
  if (grupoParcelas) grupoParcelas.hidden = (tipo === 'pendente');
}

/** Valida os campos obrigatórios */
function validarFormTransacao() {
  limparErrosForm();
  let valido = true;

  const descricao = document.getElementById('transacao-descricao');
  const valor     = document.getElementById('transacao-valor');
  const data      = document.getElementById('transacao-data');
  const categoria = document.getElementById('transacao-categoria');

  if (!descricao.value.trim()) {
    marcarErro(descricao, 'erro-descricao', 'Informe uma descrição.');
    valido = false;
  }
  if (!valor.value || Number(valor.value) <= 0) {
    marcarErro(valor, 'erro-valor', 'Informe um valor maior que zero.');
    valido = false;
  }
  if (!data.value) {
    marcarErro(data, 'erro-data', 'Informe a data.');
    valido = false;
  }
  if (!categoria.value) {
    marcarErro(categoria, 'erro-categoria', 'Selecione uma categoria.');
    valido = false;
  }

  return valido;
}

/** Envia a transação para a API (ou simula localmente) */
async function salvarTransacao() {
  const btn = document.getElementById('btn-salvar-transacao');
  btn.disabled = true;
  btn.textContent = 'Salvando...';
  mostrarSpinner(true);

  const id = document.getElementById('transacao-id').value;
  const totalDigitado = parseFloat(document.getElementById('transacao-valor').value);
  const nParcelas = parseInt(document.getElementById('transacao-parcelas')?.value ?? '1', 10) || 1;
  const tipoSel = document.getElementById('transacao-tipo').value;
  const valorParcela = (tipoSel !== 'pendente' && nParcelas > 1)
    ? Math.round((totalDigitado / nParcelas) * 100) / 100
    : totalDigitado;

  const payload = {
    tipo:       tipoSel,
    descricao:  document.getElementById('transacao-descricao').value.trim(),
    valor:      valorParcela,
    data:       document.getElementById('transacao-data').value,
    categoria:  document.getElementById('transacao-categoria').value,
    parcelas:   (tipoSel !== 'pendente') ? nParcelas : 1,
    observacao: document.getElementById('transacao-observacao').value.trim(),
  };

  try {
    if (id) {
      await TransacoesAPI.atualizar(id, payload);
    } else {
      await TransacoesAPI.criar(payload);
    }

    mostrarToast(id ? 'Transação atualizada!' : 'Transação salva!', 'sucesso');
    fecharModal();
    carregarDashboard();
    carregarTodasTransacoes();

  } catch (erro) {
    console.error('Erro ao salvar transação:', erro.message);
    mostrarToast('Não foi possível salvar a transação. Tente novamente.', 'erro');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar transação';
    mostrarSpinner(false);
  }
}

// --- Helpers de validação ---
function marcarErro(input, idErro, mensagem) {
  input.classList.add('erro');
  const el = document.getElementById(idErro);
  if (el) el.textContent = mensagem;
}

function limparErrosForm() {
  document.querySelectorAll('#form-transacao .erro')
    .forEach(el => el.classList.remove('erro'));
  document.querySelectorAll('#form-transacao .form-erro-msg')
    .forEach(el => el.textContent = '');
}

// ============================================================
// SEÇÃO DE TRANSAÇÕES — Listagem e Filtros
// ============================================================

/** Inicializa os listeners da seção de transações */
function inicializarSecaoTransacoes() {
  document.getElementById('btn-nova-transacao-lista')?.addEventListener('click', () => abrirModal());

  const ligaSelect = (id, prop) => {
    document.getElementById(id)?.addEventListener('change', (e) => {
      estadoFiltros[prop] = e.target.value;
      estadoFiltros.pagina = 1;
      aplicarFiltros();
    });
  };
  ligaSelect('filtro-periodo', 'periodo');
  ligaSelect('filtro-tipo', 'tipo');
  ligaSelect('filtro-ordenacao', 'ordenacao');
  ligaSelect('filtro-categoria', 'categoria');

  document.getElementById('filtro-mostrar-ocultos')?.addEventListener('change', (e) => {
    estadoFiltros.mostrarOcultos = e.target.checked;
    estadoFiltros.pagina = 1;
    aplicarFiltros();
  });

  let debounce;
  document.getElementById('filtro-busca')?.addEventListener('input', (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      estadoFiltros.busca = e.target.value.trim().toLowerCase();
      estadoFiltros.pagina = 1;
      aplicarFiltros();
    }, 300);
  });
}

/** Busca todas as transações da API */
async function carregarTodasTransacoes() {
  try {
    const dados = await TransacoesAPI.listar();
    todasTransacoes = Array.isArray(dados) ? dados : (dados.results ?? []);
  } catch (erro) {
    console.error('Erro ao carregar transações:', erro.message);
    mostrarToast('Não foi possível carregar as transações.', 'erro');
    todasTransacoes = [];
  }

  aplicarFiltros();
  renderizarContasPagar();
}

function chavePeriodo(periodo) {
  const hoje = new Date();
  if (periodo === 'este-mes') return chaveMes(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  if (periodo === 'mes-passado') return chaveMes(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1));
  return null; // 'todos'
}

function filtrarTransacoes() {
  let r = [...todasTransacoes];
  if (!estadoFiltros.mostrarOcultos) r = r.filter((t) => !t.oculto);
  const chave = chavePeriodo(estadoFiltros.periodo);
  if (chave) r = r.filter((t) => String(t.data).slice(0, 7) === chave);
  if (estadoFiltros.tipo !== 'todos') r = r.filter((t) => t.tipo === estadoFiltros.tipo);
  if (estadoFiltros.categoria !== 'todas') r = r.filter((t) => t.categoria === estadoFiltros.categoria);
  if (estadoFiltros.busca) {
    const q = estadoFiltros.busca;
    r = r.filter((t) =>
      (t.descricao || '').toLowerCase().includes(q) ||
      labelCategoria(t.categoria).toLowerCase().includes(q));
  }
  return r;
}

function ordenarTransacoes(lista) {
  const arr = [...lista];
  switch (estadoFiltros.ordenacao) {
    case 'data-asc':  return arr.sort((a, b) => String(a.data).localeCompare(String(b.data)));
    case 'valor-desc': return arr.sort((a, b) => b.valor - a.valor);
    case 'valor-asc':  return arr.sort((a, b) => a.valor - b.valor);
    case 'data-desc':
    default:           return arr.sort((a, b) => String(b.data).localeCompare(String(a.data)));
  }
}

function atualizarKpisTransacoes(filtradas) {
  const despesas = filtradas.filter((t) => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0);
  const receitas = filtradas.filter((t) => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0);
  const setKpi = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setKpi('kpi-tx-total', String(filtradas.length));
  setKpi('kpi-tx-despesas', formatarBRL(despesas));
  setKpi('kpi-tx-receitas', formatarBRL(receitas));
  setKpi('kpi-tx-saldo', formatarBRL(receitas - despesas));
}

function aplicarFiltros() {
  const filtradas = filtrarTransacoes();
  atualizarKpisTransacoes(filtradas);
  const ordenadas = ordenarTransacoes(filtradas);
  const total = ordenadas.length;
  const totalPaginas = Math.max(1, Math.ceil(total / estadoFiltros.porPagina));
  if (estadoFiltros.pagina > totalPaginas) estadoFiltros.pagina = totalPaginas;
  const ini = (estadoFiltros.pagina - 1) * estadoFiltros.porPagina;
  const paginaAtual = ordenadas.slice(ini, ini + estadoFiltros.porPagina);
  renderizarTabelaTransacoes(paginaAtual);
  renderizarPaginacao(total, ini);
}

/** Renderiza a tabela completa de transações */
function avatarCategoria(slug) {
  const grupo = MAPA_GRUPO_CATEGORIA[slug] || 'outros';
  const cor = GRUPOS[grupo]?.cor ?? '#b8a08a';
  return `<span class="tx-avatar" style="background:${cor}">${emojiCategoria(slug)}</span>`;
}

function pillCategoria(slug) {
  const grupo = MAPA_GRUPO_CATEGORIA[slug] || 'outros';
  const cor = GRUPOS[grupo]?.cor ?? '#b8a08a';
  return `<span class="badge-categoria" style="color:${cor};border-color:${cor}">${emojiCategoria(slug)} ${labelCategoria(slug)}</span>`;
}

function renderizarTabelaTransacoes(lista) {
  const tbody = document.getElementById('container-transacoes-lista');
  if (!tbody) return;
  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="5">${criarEstadoVazio('Nenhuma transação encontrada.')}</td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map((t) => {
    const sinal = t.tipo === 'entrada' ? '+' : '';
    return `
    <tr data-id="${t.id}">
      <td class="tx-col-desc">${avatarCategoria(t.categoria)}<span class="tx-desc">${t.descricao}</span></td>
      <td>${pillCategoria(t.categoria)}</td>
      <td class="tx-col-data">${formatarData(t.data)}</td>
      <td class="tx-col-valor valor--${t.tipo}">${sinal}${formatarBRL(t.valor)}</td>
      <td class="tx-col-acoes">
        <button class="tx-acoes-btn" onclick="abrirMenuAcoes(event, '${t.id}')" aria-label="Ações">⋮</button>
      </td>
    </tr>`;
  }).join('');
}

let _menuAcoesAberto = null;

function fecharMenuAcoes() {
  if (_menuAcoesAberto) { _menuAcoesAberto.remove(); _menuAcoesAberto = null; }
  document.removeEventListener('click', _onDocClickMenu, true);
}

function _onDocClickMenu(e) {
  if (_menuAcoesAberto && !_menuAcoesAberto.contains(e.target)) fecharMenuAcoes();
}

function abrirMenuAcoes(event, id) {
  event.stopPropagation();
  fecharMenuAcoes();
  const t = todasTransacoes.find((x) => String(x.id) === String(id));
  if (!t) return;
  const menu = document.createElement('div');
  menu.className = 'tx-acoes-menu';
  menu.innerHTML = `
    <button onclick="editarTransacao('${id}');fecharMenuAcoes()">✏️ Editar</button>
    <button onclick="alternarOcultaTransacao('${id}')">${t.oculto ? '👁️ Mostrar' : '🙈 Ocultar'}</button>
    <button class="tx-acoes-menu__excluir" onclick="excluirTransacao('${id}');fecharMenuAcoes()">🗑️ Excluir</button>`;
  document.body.appendChild(menu);
  const r = event.currentTarget.getBoundingClientRect();
  menu.style.top = `${window.scrollY + r.bottom + 4}px`;
  menu.style.left = `${window.scrollX + r.right - menu.offsetWidth}px`;
  _menuAcoesAberto = menu;
  setTimeout(() => document.addEventListener('click', _onDocClickMenu, true), 0);
}

async function alternarOcultaTransacao(id) {
  fecharMenuAcoes();
  const t = todasTransacoes.find((x) => String(x.id) === String(id));
  if (!t) return;
  try {
    const atualizada = await TransacoesAPI.atualizar(id, { ...t, oculto: !t.oculto });
    const idx = todasTransacoes.findIndex((x) => String(x.id) === String(id));
    if (idx !== -1) todasTransacoes[idx] = atualizada;
    aplicarFiltros();
    mostrarToast(atualizada.oculto ? 'Transação ocultada.' : 'Transação visível novamente.', 'sucesso');
  } catch (erro) {
    console.error('Erro ao ocultar transação:', erro.message);
    mostrarToast('Não foi possível atualizar a transação.', 'erro');
  }
}

function renderizarPaginacao(total, ini) {
  const cont = document.getElementById('paginacao-transacoes');
  if (!cont) return;
  if (!total) { cont.innerHTML = ''; return; }
  const pp = estadoFiltros.porPagina;
  const totalPaginas = Math.max(1, Math.ceil(total / pp));
  const pag = estadoFiltros.pagina;
  const de = ini + 1;
  const ate = Math.min(ini + pp, total);
  cont.innerHTML = `
    <label class="tx-paginacao__pp">Por página
      <select class="tx-select" onchange="mudarPorPagina(this.value)">
        ${[10, 25, 50].map((n) => `<option value="${n}" ${n === pp ? 'selected' : ''}>${n}</option>`).join('')}
      </select>
    </label>
    <div class="tx-paginacao__nav">
      <span>Mostrando ${de} a ${ate} de ${total}</span>
      <button class="tx-pag-btn" onclick="mudarPagina(${pag - 1})" ${pag <= 1 ? 'disabled' : ''} aria-label="Página anterior">‹</button>
      <span class="tx-pag-atual">${pag}</span>
      <button class="tx-pag-btn" onclick="mudarPagina(${pag + 1})" ${pag >= totalPaginas ? 'disabled' : ''} aria-label="Próxima página">›</button>
    </div>`;

  const ppSelect = cont.querySelector('select');
  if (ppSelect) melhorarSelect(ppSelect);
}

function mudarPagina(n) {
  estadoFiltros.pagina = Math.max(1, Number(n));
  aplicarFiltros();
}

function mudarPorPagina(n) {
  estadoFiltros.porPagina = Number(n);
  estadoFiltros.pagina = 1;
  aplicarFiltros();
}

// ============================================================
// TELA CATEGORIAS
// ============================================================
let mesCategorias = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
const GRUPOS_COLAPSADOS = new Set();

function chaveMes(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function rotuloMes(date) {
  const txt = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

function transacoesDoMes() {
  const chave = chaveMes(mesCategorias);
  return todasTransacoes.filter((t) => String(t.data).slice(0, 7) === chave);
}

/** Agrega transações por grupo → [{ group, total, subs:[{categoria,total}] }] desc. */
function agregarPorGrupo(transacoes) {
  const grupos = {};
  for (const t of transacoes) {
    const slug = t.categoria || 'outros';
    const grupo = MAPA_GRUPO_CATEGORIA[slug] || 'outros';
    if (!grupos[grupo]) grupos[grupo] = { group: grupo, total: 0, subs: {} };
    grupos[grupo].total += t.valor;
    grupos[grupo].subs[slug] = (grupos[grupo].subs[slug] || 0) + t.valor;
  }
  return Object.values(grupos)
    .map((g) => ({
      group: g.group,
      total: g.total,
      subs: Object.entries(g.subs)
        .map(([categoria, total]) => ({ categoria, total }))
        .sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total);
}

function mudarMesCategorias(delta) {
  mesCategorias = new Date(mesCategorias.getFullYear(), mesCategorias.getMonth() + delta, 1);
  renderizarPaginaCategorias();
}

function toggleGrupoCategoria(slug) {
  if (GRUPOS_COLAPSADOS.has(slug)) GRUPOS_COLAPSADOS.delete(slug);
  else GRUPOS_COLAPSADOS.add(slug);
  renderizarPaginaCategorias();
}

function renderizarPaginaCategorias() {
  const doMes = transacoesDoMes();
  const saidas = doMes.filter((t) => t.tipo === 'saida');
  const totalGasto = saidas.reduce((acc, t) => acc + t.valor, 0);

  // Header: total + donut-mini + navegador de mês
  const header = document.getElementById('categorias-header');
  if (header) {
    header.innerHTML = `
      <div class="cat-header__total">
        <strong>${formatarBRL(totalGasto)}</strong>
        <span>gasto em ${rotuloMes(mesCategorias)}</span>
      </div>
      <div class="cat-header__donut">
        <canvas id="grafico-donut-categorias" height="120" role="img" aria-label="Gráfico de gastos por categoria"></canvas>
      </div>
      <div class="cat-mes-nav">
        <button class="cat-mes-nav__btn" onclick="mudarMesCategorias(-1)" aria-label="Mês anterior">‹</button>
        <span class="cat-mes-nav__label">${rotuloMes(mesCategorias)}</span>
        <button class="cat-mes-nav__btn" onclick="mudarMesCategorias(1)" aria-label="Próximo mês">›</button>
      </div>`;
  }

  // Donut: grupos de despesa do mês
  const gruposSaida = agregarPorGrupo(saidas);
  criarDonut(
    'grafico-donut-categorias',
    gruposSaida.map((g) => GRUPOS[g.group]?.label ?? g.group),
    gruposSaida.map((g) => g.total),
    gruposSaida.map((g) => GRUPOS[g.group]?.cor ?? '#52525b'),
  );

  // Lista: grupos com atividade (saída + entrada), em acordeão
  const realizadas = doMes.filter((t) => t.tipo === 'saida' || t.tipo === 'entrada');
  const grupos = agregarPorGrupo(realizadas);
  const lista = document.getElementById('categorias-lista');
  if (!lista) return;
  if (!grupos.length) {
    lista.innerHTML = criarEstadoVazio('Sem transações neste mês.');
    return;
  }

  const maxGrupo = Math.max(...grupos.map((g) => g.total));
  lista.innerHTML = grupos.map((g) => {
    const meta = GRUPOS[g.group] ?? { label: g.group, icon: '📦', cor: '#b8a08a' };
    const colapsado = GRUPOS_COLAPSADOS.has(g.group);
    const pctGrupo = maxGrupo ? (g.total / maxGrupo * 100).toFixed(1) : 0;

    const subsHtml = g.subs.map((s) => {
      const pctSub = g.total ? (s.total / g.total * 100).toFixed(1) : 0;
      return `
        <div class="cat-sub">
          <span class="cat-sub__icone">${emojiCategoria(s.categoria)}</span>
          <span class="cat-sub__nome">${labelCategoria(s.categoria)}</span>
          <span class="cat-sub__valor">${formatarBRL(s.total)}</span>
          <div class="barra-progresso barra-progresso--fina">
            <div class="barra-progresso__preench" style="width:${pctSub}%;background:${meta.cor}"></div>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="cat-grupo ${colapsado ? 'cat-grupo--colapsado' : ''}">
        <button class="cat-grupo__cabecalho" onclick="toggleGrupoCategoria('${g.group}')" aria-expanded="${!colapsado}">
          <span class="cat-grupo__chevron">${colapsado ? '⌄' : '⌃'}</span>
          <span class="cat-grupo__icone" style="background:${meta.cor}">${meta.icon}</span>
          <span class="cat-grupo__badge" style="background:${meta.cor}">${g.subs.length}</span>
          <span class="cat-grupo__nome">${meta.label}</span>
          <span class="cat-grupo__valor">${formatarBRL(g.total)}</span>
          <div class="barra-progresso">
            <div class="barra-progresso__preench" style="width:${pctGrupo}%;background:${meta.cor}"></div>
          </div>
        </button>
        <div class="cat-grupo__subs">${subsHtml}</div>
      </div>`;
  }).join('');
}

// ============================================================
// TELA PARCELAMENTOS
// ============================================================
function renderizarPaginaParcelamentos() {
  const container = document.getElementById('lista-parcelamentos');
  if (!container) return;

  const planos = todasTransacoes.filter(pEhParcelado);
  if (!planos.length) {
    container.innerHTML = criarEstadoVazio('Nenhum parcelamento ativo. Crie uma transação com mais de 1 parcela.');
    return;
  }

  container.innerHTML = planos.map(t => {
    const total = t.parcelas;
    const pagas = t.parcelasPagas || 0;
    const valorTotal = t.valor * total;
    const restante = (total - pagas) * t.valor;
    const prox = pProximaEmAberto(t);
    const proxTxt = prox ? formatarData(prox.vencimento.toISOString().split('T')[0]) : 'Concluído';
    const pct = Math.round((pagas / total) * 100);
    const badge = t.tipo === 'entrada' ? 'Entrada' : 'Saída';
    return `
      <div class="card-saldo-total" data-id="${t.id}">
        <div class="parcelamento-cabecalho">
          <strong>${t.descricao}</strong>
          <span class="badge-categoria">${badge}</span>
        </div>
        <p class="parcelamento-meta">${total}x de ${formatarBRL(t.valor)} • total ${formatarBRL(valorTotal)}</p>
        <div class="barra-progresso"><div class="barra-progresso__preench" style="width:${pct}%"></div></div>
        <p class="parcelamento-meta">${pagas}/${total} pagas • restante ${formatarBRL(restante)} • próximo: ${proxTxt}</p>
        <button class="btn-acao btn-acao--excluir parcelamento-excluir" onclick="excluirTransacao('${t.id}')" aria-label="Excluir plano">🗑️ Excluir</button>
      </div>`;
  }).join('');
}

/** Abre o modal preenchido para edição */
function editarTransacao(id) {
  const transacao = todasTransacoes.find(t => String(t.id) === String(id));
  if (transacao) abrirModal(transacao);
}

/** Exclui a transação via API */
async function excluirTransacao(id) {
  const transacao = todasTransacoes.find(t => String(t.id) === String(id));
  if (!transacao) return;

  const confirmar = window.confirm(`Excluir "${transacao.descricao}"?\n\nEssa ação não pode ser desfeita.`);
  if (!confirmar) return;

  mostrarSpinner(true);
  try {
    await TransacoesAPI.excluir(id);
    todasTransacoes = todasTransacoes.filter(t => String(t.id) !== String(id));
    aplicarFiltros();
    renderizarTransacoesRecentes(todasTransacoes.slice(0, 5));
    renderizarContasPagar();
    renderizarPaginaParcelamentos();
    carregarDashboard();
    mostrarToast('Transação excluída.', 'sucesso');
  } catch (erro) {
    console.error('Erro ao excluir transação:', erro.message);
    mostrarToast('Não foi possível excluir a transação.', 'erro');
  } finally {
    mostrarSpinner(false);
  }
}

// ============================================================
// SEÇÃO DE CONTAS A PAGAR
// ============================================================
function renderizarContasPagar() {
  const container = document.getElementById('container-contas-lista');
  const totalPendenteEl = document.getElementById('total-contas-pendentes');
  if (!container || !totalPendenteEl) return;

  // Pendentes avulsos (tipo pendente, não parcelado)
  const avulsos = todasTransacoes
    .filter(t => t.tipo === 'pendente' && !pEhParcelado(t))
    .map(t => ({ id: t.id, descricao: t.descricao, categoria: t.categoria, data: t.data, valor: t.valor, parcela: null }));

  // Próxima parcela em aberto de cada plano de SAÍDA parcelado
  const parcelasAbertas = todasTransacoes
    .filter(t => t.tipo === 'saida' && pEhParcelado(t) && !pConcluido(t))
    .map(t => {
      const prox = pProximaEmAberto(t);
      return {
        id: t.id,
        descricao: t.descricao,
        categoria: t.categoria,
        data: prox.vencimento.toISOString().split('T')[0],
        valor: prox.valor,
        parcela: { indice: prox.indice, total: t.parcelas },
      };
    });

  const pendentes = [...avulsos, ...parcelasAbertas];

  // Ordena por data (da mais próxima para a mais distante)
  pendentes.sort((a, b) => a.data.localeCompare(b.data));

  // Calcula total
  const total = pendentes.reduce((acc, curr) => acc + curr.valor, 0);
  totalPendenteEl.textContent = formatarBRL(total);

  if (!pendentes.length) {
    container.innerHTML = criarEstadoVazio('Oba! Nenhuma conta pendente no momento.');
    return;
  }

  const linhas = pendentes.map(linha => `
    <tr data-id="${linha.id}">
      <td>${formatarData(linha.data)}</td>
      <td><span class="descricao-cell">${linha.descricao}${linha.parcela ? ` • Parcela ${linha.parcela.indice}/${linha.parcela.total}` : ''}</span></td>
      <td><span class="badge-categoria">${labelCategoria(linha.categoria)}</span></td>
      <td class="valor-cell valor--pendente">${formatarBRL(linha.valor)}</td>
      <td>
        <div class="acoes-tabela">
          <button class="btn-acao" style="color: var(--cor-sucesso); border-color: var(--cor-sucesso);"
                  onclick="pagarConta('${linha.id}')"
                  aria-label="Marcar como pago"
                  title="Pagar">✔️</button>
          <button class="btn-acao btn-acao--editar"
                  onclick="editarTransacao('${linha.id}')"
                  aria-label="Editar conta"
                  title="Editar">✏️</button>
          <button class="btn-acao btn-acao--excluir"
                  onclick="excluirTransacao('${linha.id}')"
                  aria-label="Excluir conta"
                  title="Excluir">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div class="tabela-wrapper">
      <table class="tabela" aria-label="Lista de contas a pagar">
        <thead>
          <tr>
            <th scope="col">Vencimento</th>
            <th scope="col">Descrição</th>
            <th scope="col">Categoria</th>
            <th scope="col">Valor</th>
            <th scope="col"><span class="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
  `;
}

async function pagarConta(id) {
  const transacao = todasTransacoes.find(t => String(t.id) === String(id));
  if (!transacao) return;

  const ehParcela = pEhParcelado(transacao);
  const msg = ehParcela
    ? `Marcar a próxima parcela de "${transacao.descricao}" como paga?`
    : `Deseja marcar "${transacao.descricao}" como pago?`;
  if (!window.confirm(msg)) return;

  mostrarSpinner(true);

  const payload = ehParcela
    ? { ...transacao, parcelasPagas: (transacao.parcelasPagas || 0) + 1 }
    : { ...transacao, tipo: 'saida', data: new Date().toISOString().split('T')[0] };

  try {
    await TransacoesAPI.atualizar(id, payload);
    await carregarTodasTransacoes();
    carregarDashboard();
    mostrarToast(ehParcela ? 'Parcela paga!' : 'Conta marcada como paga!', 'sucesso');
  } catch (erro) {
    console.error('Erro ao pagar:', erro.message);
    mostrarToast('Não foi possível registrar o pagamento.', 'erro');
  } finally {
    mostrarSpinner(false);
  }
}

// ============================================================
// HELPERS DE RENDER (cards do dashboard)
// ============================================================
/** Cor determinística a partir de um nome (para avatar). */
function corDeNome(nome) {
  const cores = ['#10b981','#f472b6','#fbbf24','#60a5fa','#a78bfa','#fb923c','#22d3ee'];
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = nome.charCodeAt(i) + ((h << 5) - h);
  return cores[Math.abs(h) % cores.length];
}

/** HTML de um avatar circular com a inicial. */
function avatarMerchant(nome) {
  const inicial = (nome || '?').trim().charAt(0).toUpperCase();
  return `<span class="avatar-merchant" style="background:${corDeNome(nome || '?')}">${inicial}</span>`;
}

/** Card de transação. */
function transacaoCard(t) {
  const sinal = t.tipo === 'entrada' ? '+' : t.tipo === 'saida' ? '−' : '';
  return `
    <div class="transacao-card">
      ${avatarMerchant(t.descricao)}
      <div class="transacao-card__info">
        <span class="transacao-card__desc">${t.descricao}</span>
        <span class="transacao-card__meta">${labelCategoria(t.categoria)} • ${formatarData(t.data)}</span>
      </div>
      <span class="transacao-card__valor valor--${t.tipo}">${sinal} ${formatarBRL(t.valor)}</span>
    </div>`;
}


