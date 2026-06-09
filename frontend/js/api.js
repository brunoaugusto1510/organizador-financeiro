/**
 * api.js
 * Centraliza a comunicacao com a API REST usando fetch nativo.
 */

const API_BASE_URL = '/api';

const TIPO_UI_PARA_API = {
  entrada: 'income',
  saida: 'expense',
  pendente: 'pending',
};

const TIPO_API_PARA_UI = {
  income: 'entrada',
  expense: 'saida',
  pending: 'pendente',
};

function dataParaInput(data) {
  if (!data) return '';
  return String(data).split('T')[0];
}

function normalizarTransacaoApi(transacao) {
  if (!transacao) return transacao;

  return {
    id: transacao._id || transacao.id,
    descricao: transacao.title || '',
    tipo: TIPO_API_PARA_UI[transacao.type] || transacao.type,
    valor: transacao.amount || 0,
    data: dataParaInput(transacao.date),
    categoria: transacao.category || '',
    observacao: transacao.description || '',
  };
}

function normalizarListaTransacoes(dados) {
  const lista = Array.isArray(dados) ? dados : (dados?.results || []);
  return lista.map(normalizarTransacaoApi);
}

function montarPayloadTransacao(dados) {
  return {
    title: dados.descricao,
    type: TIPO_UI_PARA_API[dados.tipo] || dados.tipo,
    amount: dados.valor,
    category: dados.categoria,
    date: dados.data,
    description: dados.observacao,
  };
}

/**
 * Retorna os cabecalhos padrao, injetando o token JWT se existir.
 */
function getHeaders() {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

/**
 * Wrapper generico para requisicoes fetch.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers
    }
  };

  try {
    const resposta = await fetch(url, config);
    const contentType = resposta.headers.get('content-type');
    let dados = null;

    if (contentType && contentType.includes('application/json')) {
      dados = await resposta.json();
    }

    if (!resposta.ok) {
      throw new Error((dados && dados.message) ? dados.message : `Erro HTTP: ${resposta.status}`);
    }

    return dados;
  } catch (erro) {
    console.error(`[API Error] ${options.method || 'GET'} ${url}:`, erro.message);
    throw erro;
  }
}

// ============================================================
// SERVICOS DE AUTENTICACAO
// ============================================================
const AuthAPI = {
  login: (email, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),

  register: (name, email, password) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password })
  })
};

// ============================================================
// SERVICOS DE TRANSACOES
// ============================================================
const TransacoesAPI = {
  listar: async () => normalizarListaTransacoes(await request('/transactions')),

  criar: async (dados) => normalizarTransacaoApi(await request('/transactions', {
    method: 'POST',
    body: JSON.stringify(montarPayloadTransacao(dados))
  })),

  atualizar: async (id, dados) => normalizarTransacaoApi(await request(`/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(montarPayloadTransacao(dados))
  })),

  excluir: (id) => request(`/transactions/${id}`, {
    method: 'DELETE'
  }),

  resumo: () => request('/transactions/dashboard')
};

// ============================================================
// SERVICOS DE CATEGORIAS
// ============================================================
const CategoriasAPI = {
  listar: () => request('/categories'),
};

// ============================================================
// SERVICOS DE INVESTIMENTOS
// NOTA: o backend tambem expoe PUT /investments/:id (editar), mas a UI
// atual so cria/exclui; o metodo editar fica deferido para um proximo passo.
// ============================================================
const InvestimentosAPI = {
  listar: () => request('/investments'),

  criar: (dados) => request('/investments', {
    method: 'POST',
    body: JSON.stringify(dados),
  }),

  excluir: (id) => request(`/investments/${id}`, {
    method: 'DELETE',
  }),
};
