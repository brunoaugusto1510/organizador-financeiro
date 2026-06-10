/* dropdown.js — enhancement progressivo de <select> em dropdown custom temático.
   Mantém o <select> nativo como fonte da verdade; sincroniza a UI no evento change. */

let _dropdownAberto = null;

function _onDocClickDropdown(e) {
  if (_dropdownAberto && !_dropdownAberto.contains(e.target)) _fecharDropdown();
}

function _abrirDropdown(wrapper, lista, controle) {
  _fecharDropdown();
  wrapper.classList.add('select-custom--aberto');
  lista.hidden = false;
  controle.setAttribute('aria-expanded', 'true');
  _dropdownAberto = wrapper;
  setTimeout(() => document.addEventListener('click', _onDocClickDropdown, true), 0);
}

function _fecharDropdown() {
  if (!_dropdownAberto) return;
  const lista = _dropdownAberto.querySelector('.select-custom__lista');
  const controle = _dropdownAberto.querySelector('.select-custom__controle');
  _dropdownAberto.classList.remove('select-custom--aberto');
  if (lista) lista.hidden = true;
  if (controle) controle.setAttribute('aria-expanded', 'false');
  _dropdownAberto = null;
  document.removeEventListener('click', _onDocClickDropdown, true);
}

function _moverSelecao(select, delta) {
  const n = select.options.length;
  if (!n) return;
  const i = Math.max(0, Math.min(n - 1, select.selectedIndex + delta));
  if (i !== select.selectedIndex) {
    select.selectedIndex = i;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function _onControleKeydown(e, wrapper, select, controle, lista) {
  const aberto = wrapper.classList.contains('select-custom--aberto');
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      if (aberto) _moverSelecao(select, 1); else _abrirDropdown(wrapper, lista, controle);
      break;
    case 'ArrowUp':
      e.preventDefault();
      if (aberto) _moverSelecao(select, -1);
      break;
    case 'Enter':
    case ' ':
      e.preventDefault();
      if (aberto) { _fecharDropdown(); controle.focus(); }
      else _abrirDropdown(wrapper, lista, controle);
      break;
    case 'Escape':
      if (aberto) { _fecharDropdown(); controle.focus(); }
      break;
    default:
      break;
  }
}

function _refreshDropdown(select, controle, lista) {
  const sel = select.options[select.selectedIndex];
  controle.innerHTML = '';
  const rotulo = document.createElement('span');
  rotulo.className = 'select-custom__rotulo';
  rotulo.textContent = sel ? sel.text : '';
  const chev = document.createElement('span');
  chev.className = 'select-custom__chevron';
  chev.setAttribute('aria-hidden', 'true');
  chev.textContent = '▾';
  controle.appendChild(rotulo);
  controle.appendChild(chev);

  lista.innerHTML = '';
  Array.from(select.options).forEach((opt) => {
    const li = document.createElement('li');
    li.className = 'select-custom__opcao' + (opt.selected ? ' select-custom__opcao--selecionada' : '');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', opt.selected ? 'true' : 'false');
    li.textContent = opt.text;
    li.addEventListener('click', (e) => {
      e.stopPropagation();
      if (select.value !== opt.value) {
        select.value = opt.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      _fecharDropdown();
      controle.focus();
    });
    lista.appendChild(li);
  });
}

/** Enhancer idempotente: cria a UI custom na 1ª vez e re-sincroniza nas seguintes. */
function melhorarSelect(select) {
  if (!select) return;
  let wrapper;
  let controle;
  let lista;

  if (!select.dataset.enhanced) {
    wrapper = document.createElement('div');
    wrapper.className = 'select-custom';
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    select.classList.add('select-custom__nativo');

    controle = document.createElement('button');
    controle.type = 'button';
    controle.className = 'tx-select select-custom__controle';
    controle.setAttribute('aria-haspopup', 'listbox');
    controle.setAttribute('aria-expanded', 'false');

    lista = document.createElement('ul');
    lista.className = 'select-custom__lista';
    lista.setAttribute('role', 'listbox');
    lista.hidden = true;

    wrapper.appendChild(controle);
    wrapper.appendChild(lista);

    controle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (wrapper.classList.contains('select-custom--aberto')) _fecharDropdown();
      else _abrirDropdown(wrapper, lista, controle);
    });
    controle.addEventListener('keydown', (e) => _onControleKeydown(e, wrapper, select, controle, lista));
    select.addEventListener('change', () => _refreshDropdown(select, controle, lista));

    select.dataset.enhanced = '1';
  } else {
    wrapper = select.closest('.select-custom');
    controle = wrapper.querySelector('.select-custom__controle');
    lista = wrapper.querySelector('.select-custom__lista');
  }

  _refreshDropdown(select, controle, lista);
}

/** Aplica o enhancer aos selects de filtro estáticos das Transações. */
function inicializarDropdowns() {
  ['filtro-periodo', 'filtro-tipo', 'filtro-ordenacao'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) melhorarSelect(el);
  });
}
