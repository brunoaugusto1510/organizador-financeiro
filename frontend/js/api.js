/**
 * api.js
 * Centraliza a comunicação com a API REST usando fetch nativo.
 */

const API_BASE_URL = '/api'; // Ajustado para caminhos relativos (funciona localmente e em deploy)

/**
 * Retorna os cabeçalhos padrão, injetando o token JWT se existir.
 */
function getHeaders() {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

/**
 * Wrapper genérico para requisições fetch.
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
    throw erro; // Repassa o erro para ser tratado pela UI (modo demo)
  }
}

// ============================================================
// SERVIÇOS DE AUTENTICAÇÃO
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
// SERVIÇOS DE TRANSAÇÕES
// ============================================================
const TransacoesAPI = {
  listar: () => request('/transactions'),
  
  obter: (id) => request(`/transactions/${id}`),
  
  criar: (dados) => request('/transactions', {
    method: 'POST',
    body: JSON.stringify(dados)
  }),
  
  atualizar: (id, dados) => request(`/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dados)
  }),
  
  excluir: (id) => request(`/transactions/${id}`, {
    method: 'DELETE'
  }),
  
  resumo: () => request('/resumo')
};
