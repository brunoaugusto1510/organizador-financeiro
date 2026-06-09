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

// Dados de demonstração usados enquanto o backend não está pronto
const DEMO = {
  resumo: {
    saldo:     1250.00,
    entradas:  3500.00,
    saidas:    1800.00,
    pendentes:  450.00,
  },
  transacoes: [
    { id: 1, descricao: 'Salário',        tipo: 'entrada',  valor: 3500.00, data: '2025-06-01', categoria: 'salario'      },
    { id: 2, descricao: 'Aluguel',        tipo: 'saida',    valor: 1200.00, data: '2025-06-02', categoria: 'moradia'      },
    { id: 3, descricao: 'Supermercado',   tipo: 'saida',    valor:  320.50, data: '2025-06-03', categoria: 'alimentacao'  },
    { id: 4, descricao: 'Freelance',      tipo: 'entrada',  valor:  800.00, data: '2025-06-05', categoria: 'renda_extra'  },
    { id: 5, descricao: 'Conta de luz',   tipo: 'pendente', valor:  180.00, data: '2025-06-10', categoria: 'utilidades'   },
    { id: 6, descricao: 'Plano de Saúde', tipo: 'saida',    valor:  280.00, data: '2025-06-04', categoria: 'saude'        },
    { id: 7, descricao: 'Curso Online',   tipo: 'saida',    valor:   99.90, data: '2025-06-06', categoria: 'educacao'     },
  ],
};

// Estado global da listagem de transações
let todasTransacoes = [];
let estadoFiltros = { tipo: 'todos', busca: '', dataInicio: '', dataFim: '' };

// ============================================================
// INICIALIZAÇÃO
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
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
  inicializarLogout();
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
    console.warn('API indisponível — usando dados de demonstração:', erro.message);
    renderizarResumo(DEMO.resumo);
  } finally {
    mostrarSpinner(false);
  }
}

const ROTULOS_CATEGORIA = {
  salario: 'Salário', renda_extra: 'Renda Extra', moradia: 'Moradia',
  alimentacao: 'Alimentação', transporte: 'Transporte', saude: 'Saúde',
  educacao: 'Educação', lazer: 'Lazer', utilidades: 'Utilidades', outros: 'Outros',
};

const EMOJI_CATEGORIA = {
  salario: '💰', renda_extra: '💵', moradia: '🏠', alimentacao: '🍽️',
  transporte: '🚗', saude: '🏥', educacao: '📚', lazer: '🎮',
  utilidades: '💡', outros: '📦',
};

function renderizarResumo({ saldo, entradas, saidas, pendentes }) {
  const txt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const transacoes = todasTransacoes.length ? todasTransacoes : DEMO.transacoes;
  const nome = (localStorage.getItem('user_name') || 'Você').split(' ')[0];
  const gasto = saidas ?? 0;
  const mes = new Date().toLocaleDateString('pt-BR', { month: 'long' });

  // Comparativo com mês anterior (estimativa enquanto API não fornece histórico)
  const gastoAnterior = gasto * 1.18 || 0;
  const difPct = gastoAnterior ? ((gasto - gastoAnterior) / gastoAnterior) * 100 : 0;
  const diferenca = Math.abs(gastoAnterior - gasto);
  const abaixo = gasto <= gastoAnterior;

  // Categoria principal (maior soma de saídas)
  const porCategoria = {};
  transacoes
    .filter(t => t.tipo === 'saida' || t.tipo === 'pendente')
    .forEach(t => { porCategoria[t.categoria] = (porCategoria[t.categoria] || 0) + t.valor; });
  const topCat = Object.entries(porCategoria).sort((a, b) => b[1] - a[1])[0];
  const categoriaPrincipal = topCat ? (ROTULOS_CATEGORIA[topCat[0]] || topCat[0]) : '—';
  const categoriaEmoji = topCat ? (EMOJI_CATEGORIA[topCat[0]] || '📦') : '';

  // --- Card insight ---
  txt('insight-mensagem',
    `${nome}, seu gasto quase não mudou, mas as parcelas ainda pesam ${formatarBRL(pendentes ?? 0)} este mês.`);
  txt('kpi-gasto-rotulo', `Gasto em ${mes}`);
  txt('kpi-gasto', formatarBRL(gasto));
  txt('kpi-comparativo', `${difPct <= 0 ? '↘' : '↗'} ${Math.abs(difPct).toFixed(0)}%`);
  txt('kpi-categoria', `${categoriaEmoji} ${categoriaPrincipal}`.trim());
  txt('insight-data', formatarDataExtenso(new Date()));

  const elComp = document.getElementById('kpi-comparativo');
  if (elComp) elComp.classList.toggle('kpi__valor--positivo', difPct <= 0);

  // --- Card gráfico ---
  txt('chart-destaque', formatarBRL(diferenca));
  txt('chart-variacao', `${difPct <= 0 ? '▾' : '▴'} ${Math.abs(difPct).toFixed(1)}%`);
  txt('chart-anterior', `vs ${formatarBRL(gastoAnterior)} mês anterior`);

  const elBadge = document.getElementById('chart-variacao');
  if (elBadge) elBadge.classList.toggle('badge-variacao--alta', difPct > 0);

  const elDestaqueEm = document.querySelector('.painel__destaque em');
  if (elDestaqueEm) elDestaqueEm.textContent = abaixo ? 'abaixo' : 'acima';

  const serie = construirSerieGastos(transacoes, gasto, gastoAnterior);
  criarLinhaComparativa('grafico-linha-gastos', serie.labels, serie.atual, serie.anterior, serie.diaAtual);
}

// Constrói séries diárias cumulativas (este mês × mês passado) para o gráfico de linha
function construirSerieGastos(transacoes, totalAtual, totalAnterior) {
  const hoje = new Date();
  const dias = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate(); // dias no mês
  const diaAtual = Math.min(hoje.getDate(), dias);
  const labels = Array.from({ length: dias }, (_, i) => String(i + 1));

  // Acumula saídas por dia do mês a partir das transações
  const porDia = new Array(dias).fill(0);
  transacoes
    .filter(t => t.tipo === 'saida' || t.tipo === 'pendente')
    .forEach(t => {
      const dia = new Date(t.data).getDate();
      if (dia >= 1 && dia <= dias) porDia[dia - 1] += t.valor;
    });

  // "Este mês": cumulativo só até hoje (resto null = linha curta com ponto na ponta)
  let acc = 0;
  const temDados = porDia.some(v => v > 0);
  const atual = labels.map((_, i) => {
    if (i + 1 > diaAtual) return null;
    acc += temDados ? porDia[i] : totalAtual / diaAtual;
    return Math.round(acc);
  });

  // "Mês passado": curva cheia que termina no total anterior (sobe em degraus)
  const escala = totalAtual ? totalAnterior / totalAtual : 1.18;
  const totAnt = Math.round((temDados ? acc : totalAtual) * escala);
  const anterior = labels.map((_, i) => Math.round(totAnt * Math.pow((i + 1) / dias, 0.7)));

  return { labels, atual, anterior, diaAtual };
}

// Formata data como "09 de jun. de 2026"
function formatarDataExtenso(data) {
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// --- Transações recentes ---
async function carregarTransacoesRecentes() {
  try {
    const dados = await TransacoesAPI.listar();
    // A API pode retornar { results: [...] } (paginado) ou direto um array
    const lista = Array.isArray(dados) ? dados : (dados.results ?? []);
    // Para transações recentes, consideramos as primeiras 5
    renderizarTransacoesRecentes(lista.slice(0, 5));

  } catch (erro) {
    console.warn('Transações indisponíveis — usando dados de demonstração:', erro.message);
    renderizarTransacoesRecentes(DEMO.transacoes);
  }
}

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
      case 'investimentos': renderizarPaginaInvestimentos(); break;
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
    document.getElementById('transacao-valor').value       = transacao.valor ?? '';
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

  // --- Submit ---
  document.getElementById('form-transacao')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validarFormTransacao()) return;
    await salvarTransacao();
  });
}

/** Ativa o botão de tipo e atualiza o campo hidden */
function selecionarTipo(tipo) {
  document.querySelectorAll('.tipo-btn').forEach(btn => {
    btn.classList.toggle('ativo', btn.dataset.tipo === tipo);
  });
  document.getElementById('transacao-tipo').value = tipo;

  // Mostra parcelas somente para saídas
  const grupoParcelas = document.getElementById('grupo-parcelas');
  if (grupoParcelas) grupoParcelas.hidden = tipo !== 'saida';
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
  const payload = {
    tipo:       document.getElementById('transacao-tipo').value,
    descricao:  document.getElementById('transacao-descricao').value.trim(),
    valor:      parseFloat(document.getElementById('transacao-valor').value),
    data:       document.getElementById('transacao-data').value,
    categoria:  document.getElementById('transacao-categoria').value,
    parcelas:   parseInt(document.getElementById('transacao-parcelas')?.value ?? '1', 10),
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
    console.warn('API indisponível — modo demonstração:', erro.message);
    // Salva localmente nos dados demo
    if (id) {
       const idx = DEMO.transacoes.findIndex(t => String(t.id) === String(id));
       if(idx > -1) DEMO.transacoes[idx] = { id, ...payload };
    } else {
       DEMO.transacoes.unshift({ id: Date.now(), ...payload });
    }
    atualizarResumoDemo(payload);
    mostrarToast('Transação salva! (modo demonstração)', 'sucesso');
    fecharModal();
    renderizarTransacoesRecentes(DEMO.transacoes.slice(0, 5));
    renderizarResumo(DEMO.resumo);
    
    // Atualiza listagens em memória também
    todasTransacoes = [...DEMO.transacoes];
    aplicarFiltros();
    renderizarContasPagar();
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar transação';
    mostrarSpinner(false);
  }
}

/** Atualiza o resumo demo ao salvar sem backend */
function atualizarResumoDemo({ tipo, valor }) {
  if (tipo === 'entrada')  DEMO.resumo.entradas  += valor;
  if (tipo === 'saida')    DEMO.resumo.saidas    += valor;
  if (tipo === 'pendente') DEMO.resumo.pendentes += valor;
  DEMO.resumo.saldo = DEMO.resumo.entradas - DEMO.resumo.saidas;
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
  // Botão "Nova Transação" da seção de listagem
  document.getElementById('btn-nova-transacao-lista')?.addEventListener('click', () => abrirModal());

  // Filtros rápidos por tipo
  document.querySelectorAll('[data-filtro-tipo]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filtro-tipo]').forEach(b => b.classList.remove('ativo'));
      btn.classList.add('ativo');
      estadoFiltros.tipo = btn.dataset.filtroTipo;
      aplicarFiltros();
    });
  });

  // Busca por texto (debounce de 300ms)
  let debounce;
  document.getElementById('filtro-busca')?.addEventListener('input', (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      estadoFiltros.busca = e.target.value.trim().toLowerCase();
      aplicarFiltros();
    }, 300);
  });

  // Filtros por data
  document.getElementById('filtro-data-inicio')?.addEventListener('change', (e) => {
    estadoFiltros.dataInicio = e.target.value;
    aplicarFiltros();
  });
  document.getElementById('filtro-data-fim')?.addEventListener('change', (e) => {
    estadoFiltros.dataFim = e.target.value;
    aplicarFiltros();
  });

  // Limpar todos os filtros
  document.getElementById('btn-limpar-filtros')?.addEventListener('click', () => {
    estadoFiltros = { tipo: 'todos', busca: '', dataInicio: '', dataFim: '' };

    document.getElementById('filtro-busca').value = '';
    document.getElementById('filtro-data-inicio').value = '';
    document.getElementById('filtro-data-fim').value = '';

    document.querySelectorAll('[data-filtro-tipo]').forEach(b => b.classList.remove('ativo'));
    document.getElementById('filtro-todos')?.classList.add('ativo');

    aplicarFiltros();
  });
}

/** Busca todas as transações da API (com fallback demo) */
async function carregarTodasTransacoes() {
  try {
    const dados = await TransacoesAPI.listar();
    todasTransacoes = Array.isArray(dados) ? dados : (dados.results ?? []);

  } catch (erro) {
    console.warn('Transações: usando dados de demonstração.', erro.message);
    todasTransacoes = [...DEMO.transacoes];
  }

  aplicarFiltros();
  renderizarContasPagar();
}

/** Filtra a lista em memória e atualiza a tabela */
function aplicarFiltros() {
  let resultado = [...todasTransacoes];

  // Filtro por tipo
  if (estadoFiltros.tipo !== 'todos') {
    resultado = resultado.filter(t => t.tipo === estadoFiltros.tipo);
  }

  // Filtro por busca (descrição ou categoria)
  if (estadoFiltros.busca) {
    resultado = resultado.filter(t =>
      t.descricao?.toLowerCase().includes(estadoFiltros.busca) ||
      t.categoria?.toLowerCase().includes(estadoFiltros.busca)
    );
  }

  // Filtro por data de início
  if (estadoFiltros.dataInicio) {
    resultado = resultado.filter(t => t.data >= estadoFiltros.dataInicio);
  }

  // Filtro por data fim
  if (estadoFiltros.dataFim) {
    resultado = resultado.filter(t => t.data <= estadoFiltros.dataFim);
  }

  // Ordena por data mais recente
  resultado.sort((a, b) => b.data.localeCompare(a.data));

  renderizarTabelaTransacoes(resultado);
}

/** Renderiza a tabela completa de transações */
function renderizarTabelaTransacoes(lista) {
  const container  = document.getElementById('container-transacoes-lista');
  const contagem   = document.getElementById('resultado-contagem');
  if (!container) return;

  // Atualiza contagem
  if (contagem) {
    contagem.innerHTML = lista.length > 0
      ? `Exibindo <strong>${lista.length}</strong> transaç${lista.length === 1 ? 'ão' : 'ões'}`
      : '';
  }

  if (!lista.length) { container.innerHTML = criarEstadoVazio('Nenhuma transação encontrada.'); return; }
  container.innerHTML = lista.map(t => `
    <div class="transacao-card" data-id="${t.id}">
      ${avatarMerchant(t.descricao)}
      <div class="transacao-card__info">
        <span class="transacao-card__desc">${t.descricao}</span>
        <span class="transacao-card__meta">${labelCategoria(t.categoria)} • ${formatarData(t.data)}</span>
      </div>
      <span class="transacao-card__valor valor--${t.tipo}">${formatarBRL(t.valor)}</span>
      <div class="acoes-tabela">
        <button class="btn-acao btn-acao--editar" onclick="editarTransacao('${t.id}')" aria-label="Editar">✏️</button>
        <button class="btn-acao btn-acao--excluir" onclick="excluirTransacao('${t.id}')" aria-label="Excluir">🗑️</button>
      </div>
    </div>`).join('');
}

// ============================================================
// TELA CATEGORIAS
// ============================================================
function renderizarPaginaCategorias() {
  const fonte = todasTransacoes.length ? todasTransacoes : DEMO.transacoes;
  renderizarBarraCategorias('barra-categorias-pagina', fonte);
  const dados = agregarPorCategoria(fonte);
  criarDonut('grafico-donut-categorias', dados.map(d => labelCategoria(d.categoria)), dados.map(d => d.total));
  const lista = document.getElementById('lista-categorias');
  if (lista) lista.innerHTML = dados.map(d => `
    <div class="investimento-row"><span>${labelCategoria(d.categoria)}</span><strong>${formatarBRL(d.total)}</strong></div>`).join('') || criarEstadoVazio('Sem gastos no período.');
}

/** Abre o modal preenchido para edição */
function editarTransacao(id) {
  const transacao = todasTransacoes.find(t => String(t.id) === String(id));
  if (transacao) abrirModal(transacao);
}

/** Exclui a transação (API ou demo) */
async function excluirTransacao(id) {
  const transacao = todasTransacoes.find(t => String(t.id) === String(id));
  if (!transacao) return;

  const confirmar = window.confirm(`Excluir "${transacao.descricao}"?\n\nEssa ação não pode ser desfeita.`);
  if (!confirmar) return;

  mostrarSpinner(true);

  try {
    await TransacoesAPI.excluir(id);

    mostrarToast('Transação excluída.', 'sucesso');

  } catch (erro) {
    console.warn('API indisponível — excluindo localmente.', erro.message);
    mostrarToast('Transação removida! (modo demonstração)', 'sucesso');
  } finally {
    // Remove da lista em memória e re-renderiza
    todasTransacoes = todasTransacoes.filter(t => String(t.id) !== String(id));
    DEMO.transacoes = DEMO.transacoes.filter(t => String(t.id) !== String(id));
    aplicarFiltros();
    renderizarTransacoesRecentes(todasTransacoes.slice(0, 5));
    renderizarContasPagar();
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

  // Filtra as pendentes
  const pendentes = todasTransacoes.filter(t => t.tipo === 'pendente');
  
  // Ordena por data (da mais próxima para a mais distante)
  pendentes.sort((a, b) => a.data.localeCompare(b.data));

  // Calcula total
  const total = pendentes.reduce((acc, curr) => acc + curr.valor, 0);
  totalPendenteEl.textContent = formatarBRL(total);

  if (!pendentes.length) {
    container.innerHTML = criarEstadoVazio('Oba! Nenhuma conta pendente no momento.');
    return;
  }

  const linhas = pendentes.map(t => `
    <tr data-id="${t.id}">
      <td>${formatarData(t.data)}</td>
      <td><span class="descricao-cell">${t.descricao}</span></td>
      <td><span class="badge-categoria">${labelCategoria(t.categoria)}</span></td>
      <td class="valor-cell valor--pendente">${formatarBRL(t.valor)}</td>
      <td>
        <div class="acoes-tabela">
          <button class="btn-acao" style="color: var(--cor-sucesso); border-color: var(--cor-sucesso);"
                  onclick="pagarConta('${t.id}')"
                  aria-label="Marcar como pago"
                  title="Pagar">✔️</button>
          <button class="btn-acao btn-acao--editar"
                  onclick="editarTransacao('${t.id}')"
                  aria-label="Editar conta"
                  title="Editar">✏️</button>
          <button class="btn-acao btn-acao--excluir"
                  onclick="excluirTransacao('${t.id}')"
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

  const confirmar = window.confirm(`Deseja marcar "${transacao.descricao}" como pago?`);
  if (!confirmar) return;

  mostrarSpinner(true);

  // Atualiza payload para tipo 'saida' e usa a data de hoje para o pagamento real
  const payloadAtualizado = {
    ...transacao,
    tipo: 'saida',
    data: new Date().toISOString().split('T')[0]
  };

  try {
    await TransacoesAPI.atualizar(id, payloadAtualizado);
    mostrarToast('Conta marcada como paga!', 'sucesso');
  } catch (erro) {
    console.warn('API indisponível — atualizando localmente (demo).', erro.message);
    // Demo fallback: substitui no mock
    const idxDemo = DEMO.transacoes.findIndex(t => String(t.id) === String(id));
    if (idxDemo > -1) DEMO.transacoes[idxDemo] = payloadAtualizado;
    mostrarToast('Conta paga! (modo demonstração)', 'sucesso');
  } finally {
    // Atualiza listagem global
    const idxReal = todasTransacoes.findIndex(t => String(t.id) === String(id));
    if (idxReal > -1) todasTransacoes[idxReal] = payloadAtualizado;
    
    carregarDashboard();
    aplicarFiltros();
    renderizarContasPagar();
    mostrarSpinner(false);
  }
}

// Mapa de categorias para labels amigáveis
const LABELS_CATEGORIA = {
  salario:      'Salário',
  renda_extra:  'Renda Extra',
  investimento: 'Investimento',
  moradia:      'Moradia',
  alimentacao:  'Alimentação',
  transporte:   'Transporte',
  saude:        'Saúde',
  educacao:     'Educação',
  lazer:        'Lazer',
  vestuario:    'Vestuário',
  utilidades:   'Utilidades',
  outros:       'Outros',
};

function labelCategoria(cat) {
  return LABELS_CATEGORIA[cat] ?? cat ?? '—';
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

/** Agrega transações de saída por categoria → [{categoria, total}] desc. */
function agregarPorCategoria(transacoes) {
  const mapa = {};
  transacoes.filter(t => t.tipo === 'saida').forEach(t => {
    const c = t.categoria || 'outros';
    mapa[c] = (mapa[c] || 0) + t.valor;
  });
  return Object.entries(mapa).map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total);
}

/** Renderiza a barra multicolor de categorias num container. */
function renderizarBarraCategorias(containerId, transacoes) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const dados = agregarPorCategoria(transacoes);
  const total = dados.reduce((s, d) => s + d.total, 0) || 1;
  const cores = ['#f472b6','#a78bfa','#fbbf24','#60a5fa','#34d399','#fb923c'];
  const segs = dados.map((d, i) => `<div class="barra-categorias__seg" style="width:${(d.total/total*100).toFixed(1)}%;background:${cores[i%cores.length]}"></div>`).join('');
  const legenda = dados.map((d, i) => `<span class="barra-categorias__item"><span class="barra-categorias__dot" style="background:${cores[i%cores.length]}"></span>${labelCategoria(d.categoria)} — ${formatarBRL(d.total)}</span>`).join('');
  el.innerHTML = `<div class="barra-categorias__trilha">${segs}</div><div class="barra-categorias__legenda">${legenda}</div>`;
}

// ============================================================
// TELA MOCK — Investimentos
// ============================================================
async function renderizarPaginaInvestimentos() {
  const el = document.getElementById('card-investimentos');
  if (!el) return;
  const dados = await InvestimentosAPI.listar();
  const total = dados.reduce((s, d) => s + d.valor, 0);
  el.innerHTML = `
    <div class="card-saldo-total">
      <p class="card__titulo">Total investido • ${dados.length} ativos</p>
      <p class="card-saldo-total__valor">${formatarBRL(total)}</p>
    </div>
    <div class="grid-graficos">
      <section class="secao secao--grafico"><canvas id="grafico-donut-invest" height="240" role="img" aria-label="Distribuição dos investimentos"></canvas></section>
      <section class="secao">${dados.map(d => `
        <div class="investimento-row">
          <span>${d.classe}</span>
          <span>${formatarBRL(d.valor)}
            <span class="${d.variacaoPct >= 0 ? 'variacao--alta' : 'variacao--baixa'}">
              ${d.variacaoPct >= 0 ? '↑' : '↓'} ${Math.abs(d.variacaoPct)}%
            </span>
          </span>
        </div>`).join('')}</section>
    </div>`;
  criarDonut('grafico-donut-invest', dados.map(d => d.classe), dados.map(d => d.valor));
}

