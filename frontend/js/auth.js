/**
 * auth.js — Autenticação do usuário
 * Organizador Financeiro
 *
 * Responsabilidades:
 *  - Alternar entre as abas Login / Cadastro
 *  - Validar formulários no lado do cliente
 *  - Enviar credenciais via fetch() para a API
 *  - Salvar/remover token JWT no localStorage
 *  - Redirecionar para index.html após login bem-sucedido
 */

// ============================================================
// CONFIGURAÇÃO
// ============================================================
// As URLs e os métodos de requisição agora ficam em api.js

// ============================================================
// INICIALIZAÇÃO
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Guard: só executa em páginas que contêm o formulário de auth
  if (!document.getElementById('form-login')) return;

  // Se já estiver logado, vai direto ao dashboard
  if (obterToken()) {
    window.location.href = 'index.html';
    return;
  }

  inicializarAbas();
  inicializarFormLogin();
  inicializarFormCadastro();
});

// ============================================================
// ABAS: LOGIN / CADASTRO
// ============================================================
function inicializarAbas() {
  const tabLogin    = document.getElementById('tab-login');
  const tabCadastro = document.getElementById('tab-cadastro');
  const formLogin   = document.getElementById('form-login');
  const formCadastro = document.getElementById('form-cadastro');

  tabLogin.addEventListener('click', () => {
    ativarAba(tabLogin, tabCadastro, formLogin, formCadastro);
  });

  tabCadastro.addEventListener('click', () => {
    ativarAba(tabCadastro, tabLogin, formCadastro, formLogin);
  });
}

function ativarAba(tabAtiva, tabInativa, formAtivo, formInativo) {
  // Atualiza abas
  tabAtiva.classList.add('ativo');
  tabAtiva.setAttribute('aria-selected', 'true');
  tabInativa.classList.remove('ativo');
  tabInativa.setAttribute('aria-selected', 'false');

  // Troca formulários
  formAtivo.classList.add('ativo');
  formAtivo.hidden = false;
  formInativo.classList.remove('ativo');
  formInativo.hidden = true;

  // Limpa erros do formulário que estava visível
  limparErros(formInativo);
}

// ============================================================
// FORMULÁRIO DE LOGIN
// ============================================================
function inicializarFormLogin() {
  const form = document.getElementById('form-login');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validarLogin()) return;

    const email = document.getElementById('login-email').value.trim();
    const senha  = document.getElementById('login-senha').value;

    await realizarLogin(email, senha);
  });
}

function validarLogin() {
  let valido = true;

  const email = document.getElementById('login-email');
  const senha  = document.getElementById('login-senha');

  limparErros(document.getElementById('form-login'));

  if (!email.value.trim()) {
    mostrarErroCampo(email, 'login-email-erro', 'Informe seu e-mail.');
    valido = false;
  } else if (!emailValido(email.value)) {
    mostrarErroCampo(email, 'login-email-erro', 'E-mail inválido.');
    valido = false;
  }

  if (!senha.value) {
    mostrarErroCampo(senha, 'login-senha-erro', 'Informe sua senha.');
    valido = false;
  } else if (senha.value.length < 6) {
    mostrarErroCampo(senha, 'login-senha-erro', 'A senha deve ter pelo menos 6 caracteres.');
    valido = false;
  }

  return valido;
}

async function realizarLogin(email, senha) {
  const btn = document.getElementById('btn-login');
  setCarregandoBtn(btn, true, 'Entrando...');
  mostrarSpinner(true);

  try {
    const dados = await AuthAPI.login(email, senha);

    // Sucesso: salva o token e redireciona
    salvarToken(dados.access || dados.token);
    if (dados.refresh) localStorage.setItem('refresh_token', dados.refresh);
    if (dados.user?.name) localStorage.setItem('user_name', dados.user.name);

    mostrarToast('Login realizado com sucesso!', 'sucesso');

    setTimeout(() => {
      window.location.href = 'index.html';
    }, 800);

  } catch (erro) {
    console.error('Erro no login:', erro);
    mostrarToast(erro.message || 'Não foi possível conectar ao servidor. Tente novamente.', 'erro');
  } finally {
    setCarregandoBtn(btn, false, 'Entrar');
    mostrarSpinner(false);
  }
}

// ============================================================
// FORMULÁRIO DE CADASTRO
// ============================================================
function inicializarFormCadastro() {
  const form = document.getElementById('form-cadastro');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validarCadastro()) return;

    const nome   = document.getElementById('cadastro-nome').value.trim();
    const email  = document.getElementById('cadastro-email').value.trim();
    const senha  = document.getElementById('cadastro-senha').value;

    await realizarCadastro(nome, email, senha);
  });
}

function validarCadastro() {
  let valido = true;

  const nome            = document.getElementById('cadastro-nome');
  const email           = document.getElementById('cadastro-email');
  const senha           = document.getElementById('cadastro-senha');
  const senhaConfirma   = document.getElementById('cadastro-senha-confirma');

  limparErros(document.getElementById('form-cadastro'));

  if (!nome.value.trim() || nome.value.trim().length < 3) {
    mostrarErroCampo(nome, 'cadastro-nome-erro', 'Informe seu nome completo (mínimo 3 caracteres).');
    valido = false;
  }

  if (!email.value.trim()) {
    mostrarErroCampo(email, 'cadastro-email-erro', 'Informe seu e-mail.');
    valido = false;
  } else if (!emailValido(email.value)) {
    mostrarErroCampo(email, 'cadastro-email-erro', 'E-mail inválido.');
    valido = false;
  }

  if (!senha.value || senha.value.length < 6) {
    mostrarErroCampo(senha, 'cadastro-senha-erro', 'A senha deve ter pelo menos 6 caracteres.');
    valido = false;
  }

  if (senhaConfirma.value !== senha.value) {
    mostrarErroCampo(senhaConfirma, 'cadastro-senha-confirma-erro', 'As senhas não coincidem.');
    valido = false;
  }

  return valido;
}

async function realizarCadastro(nome, email, senha) {
  const btn = document.getElementById('btn-cadastro');
  setCarregandoBtn(btn, true, 'Criando conta...');
  mostrarSpinner(true);

  try {
    const dados = await AuthAPI.register(nome, email, senha);

    mostrarToast('Conta criada! Faça login para continuar.', 'sucesso');

    // Volta pra aba de login após cadastro
    setTimeout(() => {
      document.getElementById('tab-login').click();
      document.getElementById('login-email').value = email;
      document.getElementById('login-email').focus();
    }, 1000);

  } catch (erro) {
    console.error('Erro no cadastro:', erro);
    mostrarToast(erro.message || 'Não foi possível conectar ao servidor. Tente novamente.', 'erro');
  } finally {
    setCarregandoBtn(btn, false, 'Criar conta');
    mostrarSpinner(false);
  }
}

// ============================================================
// TOKEN: helpers de localStorage
// ============================================================
function salvarToken(token) {
  localStorage.setItem('access_token', token);
}

function obterToken() {
  return localStorage.getItem('access_token');
}

function removerToken() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_name');
}

// ============================================================
// VALIDAÇÃO AUXILIAR
// ============================================================
function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================================
// UI: feedback visual
// ============================================================

/** Mostra mensagem de erro abaixo de um campo */
function mostrarErroCampo(input, idMensagem, mensagem) {
  input.classList.add('erro');
  const elMensagem = document.getElementById(idMensagem);
  if (elMensagem) elMensagem.textContent = mensagem;
}

/** Remove todas as classes/mensagens de erro de um formulário */
function limparErros(form) {
  form.querySelectorAll('input.erro').forEach(el => el.classList.remove('erro'));
  form.querySelectorAll('.form-erro-msg').forEach(el => el.textContent = '');
}

/** Coloca o botão em estado de carregando (disabled + texto alternado) */
function setCarregandoBtn(btn, carregando, texto) {
  btn.disabled   = carregando;
  btn.textContent = texto;
}

/** Exibe/oculta o spinner global */
function mostrarSpinner(visivel) {
  const spinner = document.getElementById('spinner');
  if (!spinner) return;
  spinner.classList.toggle('oculto', !visivel);
}

/** Exibe um toast de sucesso ou erro */
function mostrarToast(mensagem, tipo = 'sucesso') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${tipo}`;
  toast.setAttribute('role', 'alert');
  toast.textContent = mensagem;

  container.appendChild(toast);

  // Remove automaticamente após 4 segundos
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 350);
  }, 4000);
}
