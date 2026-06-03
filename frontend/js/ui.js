/**
 * ui.js — Utilitários de Interface (compartilhados)
 * Organizador Financeiro
 *
 * Responsabilidades:
 *  - Spinner global de carregamento
 *  - Sistema de toasts (sucesso / erro / info)
 *  - Formatação de valores (moeda, data)
 *  - Geração de badges de tipo de transação
 *  - Renderização do estado vazio
 */

// ============================================================
// SPINNER GLOBAL
// ============================================================

/**
 * Exibe ou oculta o spinner de carregamento global.
 * @param {boolean} visivel
 */
function mostrarSpinner(visivel) {
  const spinner = document.getElementById('spinner');
  if (!spinner) return;
  spinner.classList.toggle('oculto', !visivel);
}

// ============================================================
// SISTEMA DE TOASTS
// ============================================================

/**
 * Exibe uma notificação toast na tela.
 * @param {string} mensagem  - Texto da notificação
 * @param {'sucesso'|'erro'|'info'} tipo - Estilo visual
 * @param {number} duracao   - Tempo em ms antes de sumir (padrão: 4000)
 */
function mostrarToast(mensagem, tipo = 'sucesso', duracao = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${tipo}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');

  // Ícone conforme o tipo
  const icones = {
    sucesso: '✓',
    erro:    '✕',
    info:    'ℹ',
  };
  toast.innerHTML = `<strong>${icones[tipo] ?? '•'}</strong> ${mensagem}`;

  container.appendChild(toast);

  // Remove suavemente após a duração definida
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    setTimeout(() => toast.remove(), 350);
  }, duracao);
}

// ============================================================
// FORMATADORES
// ============================================================

/**
 * Formata um número para moeda BRL (R$ 1.234,56).
 * @param {number} valor
 * @returns {string}
 */
function formatarBRL(valor) {
  return Number(valor ?? 0).toLocaleString('pt-BR', {
    style:    'currency',
    currency: 'BRL',
  });
}

/**
 * Formata uma string de data ISO (YYYY-MM-DD) para dd/mm/aaaa.
 * @param {string} dataISO
 * @returns {string}
 */
function formatarData(dataISO) {
  if (!dataISO) return '—';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

// ============================================================
// BADGE DE TIPO DE TRANSAÇÃO
// ============================================================

/**
 * Retorna o HTML de um badge colorido conforme o tipo.
 * @param {'entrada'|'saida'|'pendente'} tipo
 * @returns {string} HTML string
 */
function criarBadge(tipo) {
  const mapa = {
    entrada:  { classe: 'badge--entrada',  label: 'Entrada'  },
    saida:    { classe: 'badge--saida',    label: 'Saída'    },
    pendente: { classe: 'badge--pendente', label: 'Pendente' },
  };
  const { classe, label } = mapa[tipo] ?? { classe: 'badge--info', label: tipo };
  return `<span class="badge ${classe}">${label}</span>`;
}

// ============================================================
// ESTADO VAZIO
// ============================================================

/**
 * Retorna o HTML de um estado vazio para ser injetado no DOM.
 * @param {string} mensagem
 * @returns {string} HTML string
 */
function criarEstadoVazio(mensagem = 'Nenhum dado encontrado.') {
  return `
    <div class="estado-vazio" role="status">
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="1.5"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <p>${mensagem}</p>
    </div>
  `;
}
