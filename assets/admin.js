(() => {
  'use strict';

  const CONFIG = window.GE_CONFIG;
  const SESSION_KEY = 'ge_admin_session';
  const state = { token: sessionStorage.getItem(SESSION_KEY) || '', page: 1, pages: 1, total: 0, loading: false, timer: null };

  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  const loginForm = document.getElementById('login-form');
  const passcodeInput = document.getElementById('admin-passcode');
  const loginBtn = document.getElementById('login-btn');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');
  const refreshBtn = document.getElementById('refresh-btn');
  const searchInput = document.getElementById('search-input');
  const paymentFilter = document.getElementById('payment-filter');
  const healthFilter = document.getElementById('health-filter');
  const tableBody = document.getElementById('participants-body');
  const mobileList = document.getElementById('mobile-list');
  const emptyState = document.getElementById('empty-state');
  const paginationInfo = document.getElementById('pagination-info');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const dialog = document.getElementById('participant-dialog');
  const detailName = document.getElementById('detail-name');
  const detailBody = document.getElementById('detail-body');

  function valueOrDash(value) {
    const text = String(value ?? '').trim();
    return text || '—';
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(date);
  }

  function phoneLink(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    const full = digits.startsWith('55') ? digits : '55' + digits;
    return 'https://wa.me/' + full;
  }

  async function api(action, payload) {
    const response = await fetch(CONFIG.adminFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': CONFIG.supabasePublishableKey
      },
      body: JSON.stringify(Object.assign({ action: action, token: state.token }, payload || {}))
    });

    let data = {};
    try { data = await response.json(); } catch (_) {}

    if (response.status === 401 && action !== 'login') {
      logout(false);
      throw new Error('Sua sessão expirou. Entre novamente.');
    }
    if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a operação.');
    return data;
  }

  function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    logoutBtn.hidden = false;
  }

  function showLogin(message) {
    dashboardView.hidden = true;
    loginView.hidden = false;
    logoutBtn.hidden = true;
    loginError.textContent = message || '';
    if (message) passcodeInput.focus();
  }

  function logout(showMessage = true) {
    state.token = '';
    sessionStorage.removeItem(SESSION_KEY);
    tableBody.replaceChildren();
    mobileList.replaceChildren();
    showLogin(showMessage ? 'Sessão encerrada.' : '');
  }

  async function login(event) {
    event.preventDefault();
    loginError.textContent = '';
    loginBtn.disabled = true;
    loginBtn.textContent = 'Entrando…';

    try {
      const data = await api('login', { passcode: passcodeInput.value });
      state.token = data.token;
      sessionStorage.setItem(SESSION_KEY, state.token);
      passcodeInput.value = '';
      showDashboard();
      await refreshAll();
    } catch (error) {
      loginError.textContent = error.message;
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Entrar';
    }
  }

  function setMetric(id, value) {
    document.getElementById(id).textContent = String(value ?? 0);
  }

  function renderShirts(shirts) {
    const wrap = document.getElementById('shirts');
    wrap.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = 'Camisas:';
    wrap.appendChild(title);

    const order = ['PP', 'P', 'M', 'G', 'GG', 'EXG'];
    const keys = Object.keys(shirts || {}).sort((a, b) => {
      const ai = order.indexOf(a), bi = order.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    if (!keys.length) {
      const chip = document.createElement('span');
      chip.className = 'size-chip';
      chip.textContent = 'Sem inscrições';
      wrap.appendChild(chip);
      return;
    }

    keys.forEach((size) => {
      const chip = document.createElement('span');
      chip.className = 'size-chip';
      chip.textContent = size + ': ' + shirts[size];
      wrap.appendChild(chip);
    });
  }

  async function loadSummary() {
    const data = await api('summary');
    setMetric('metric-total', data.total);
    setMetric('metric-minors', data.menores);
    setMetric('metric-health', data.alertas_saude);
    setMetric('metric-pix', (data.pagamentos || {}).Pix || 0);
    renderShirts(data.camisas || {});
  }

  function healthLabel(item) {
    return item.possui_alergia === 'Sim' || item.usa_medicamento === 'Sim' ? 'Atenção' : 'Sem alerta';
  }

  function createBadge(text, type) {
    const span = document.createElement('span');
    span.className = 'badge ' + type;
    span.textContent = text;
    return span;
  }

  function createViewButton(id) {
    const button = document.createElement('button');
    button.className = 'view-btn';
    button.type = 'button';
    button.textContent = 'Ver ficha';
    button.addEventListener('click', () => openDetail(id));
    return button;
  }

  function renderDesktop(items) {
    tableBody.replaceChildren();
    items.forEach((item) => {
      const tr = document.createElement('tr');

      const participant = document.createElement('td');
      participant.className = 'participant';
      const name = document.createElement('strong');
      name.textContent = valueOrDash(item.nome_completo);
      const church = document.createElement('small');
      church.textContent = valueOrDash(item.igreja);
      participant.append(name, church);

      const age = document.createElement('td');
      age.textContent = valueOrDash(item.idade);
      const shirt = document.createElement('td');
      shirt.textContent = valueOrDash(item.tamanho_camisa);
      const payment = document.createElement('td');
      payment.appendChild(createBadge(valueOrDash(item.forma_pagamento).replace(' presencial', ''), 'badge-neutral'));
      const health = document.createElement('td');
      const hasAlert = healthLabel(item) === 'Atenção';
      health.appendChild(createBadge(healthLabel(item), hasAlert ? 'badge-warn' : 'badge-ok'));
      const date = document.createElement('td');
      date.textContent = formatDate(item.created_at);
      const action = document.createElement('td');
      action.appendChild(createViewButton(item.id));

      tr.append(participant, age, shirt, payment, health, date, action);
      tableBody.appendChild(tr);
    });
  }

  function renderMobile(items) {
    mobileList.replaceChildren();
    items.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'mobile-card';

      const row = document.createElement('div');
      row.className = 'mobile-row';
      const participant = document.createElement('div');
      participant.className = 'participant';
      const name = document.createElement('strong');
      name.textContent = valueOrDash(item.nome_completo);
      const church = document.createElement('small');
      church.textContent = valueOrDash(item.igreja);
      participant.append(name, church);
      const age = document.createElement('strong');
      age.textContent = valueOrDash(item.idade) + ' anos';
      row.append(participant, age);

      const meta = document.createElement('div');
      meta.className = 'mobile-meta';
      meta.appendChild(createBadge('Camisa ' + valueOrDash(item.tamanho_camisa), 'badge-neutral'));
      meta.appendChild(createBadge(valueOrDash(item.forma_pagamento).replace(' presencial', ''), 'badge-neutral'));
      const hasAlert = healthLabel(item) === 'Atenção';
      meta.appendChild(createBadge(healthLabel(item), hasAlert ? 'badge-warn' : 'badge-ok'));

      card.append(row, meta, createViewButton(item.id));
      mobileList.appendChild(card);
    });
  }

  async function loadParticipants() {
    if (state.loading) return;
    state.loading = true;
    prevBtn.disabled = true;
    nextBtn.disabled = true;

    try {
      const data = await api('list', {
        page: state.page,
        page_size: 20,
        search: searchInput.value.trim(),
        payment: paymentFilter.value,
        health: healthFilter.value
      });

      state.pages = data.pages || 1;
      state.total = data.total || 0;
      const items = data.items || [];
      renderDesktop(items);
      renderMobile(items);
      emptyState.hidden = items.length !== 0;
      emptyState.textContent = 'Nenhum participante encontrado com esses filtros.';
      paginationInfo.textContent = state.total + ' participante' + (state.total === 1 ? '' : 's') + ' • página ' + state.page + ' de ' + state.pages;
      prevBtn.disabled = state.page <= 1;
      nextBtn.disabled = state.page >= state.pages;
    } catch (error) {
      emptyState.hidden = false;
      emptyState.textContent = error.message;
    } finally {
      state.loading = false;
    }
  }

  function detailItem(label, value, wide) {
    const div = document.createElement('div');
    div.className = 'detail-item' + (wide ? ' wide' : '');
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    const valueEl = document.createElement('strong');
    valueEl.textContent = valueOrDash(value);
    div.append(labelEl, valueEl);
    return div;
  }

  function detailPhone(label, value) {
    const div = document.createElement('div');
    div.className = 'detail-item';
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    const link = document.createElement('a');
    const href = phoneLink(value);
    link.textContent = valueOrDash(value);
    if (href) {
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    div.append(labelEl, link);
    return div;
  }

  function section(title, items) {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'detail-section';
    const h3 = document.createElement('h3');
    h3.textContent = title;
    const grid = document.createElement('div');
    grid.className = 'detail-grid';
    items.forEach((item) => grid.appendChild(item));
    sectionEl.append(h3, grid);
    return sectionEl;
  }

  function renderDetail(item) {
    detailBody.replaceChildren();
    detailBody.appendChild(section('Participante', [
      detailItem('Nome', item.nome_completo, true),
      detailItem('Idade', item.idade),
      detailItem('Camisa', item.tamanho_camisa),
      detailItem('Igreja', item.igreja, true),
      detailPhone('Telefone / WhatsApp', item.telefone_participante),
      detailItem('Inscrição', formatDate(item.created_at))
    ]));
    detailBody.appendChild(section('Saúde e cuidados', [
      detailItem('Alergia / restrição', item.possui_alergia),
      detailItem('Medicamento contínuo', item.usa_medicamento),
      detailItem('Detalhes da alergia', item.alergias_restricoes, true),
      detailItem('Medicamentos / orientações', item.medicamentos_orientacoes, true),
      detailItem('Outra condição importante', item.condicoes_saude, true)
    ]));
    detailBody.appendChild(section('Responsável e emergência', [
      detailItem('Responsável', item.nome_responsavel, true),
      detailItem('Parentesco', item.parentesco),
      detailPhone('Telefone do responsável', item.telefone_responsavel),
      detailPhone('Contato de emergência', item.contato_emergencia),
      detailItem('Autorização de menor', item.autorizacao_menor, true)
    ]));
    detailBody.appendChild(section('Pagamento e confirmação', [
      detailItem('Forma de pagamento', item.forma_pagamento),
      detailItem('Valor', item.valor_inscricao),
      detailItem('Consentimento', item.consentimento, true),
      detailItem('Envio do comprovante', item.envio_comprovante, true)
    ]));
  }

  async function openDetail(id) {
    detailName.textContent = 'Carregando…';
    detailBody.replaceChildren();
    const loading = document.createElement('div');
    loading.className = 'loading-line';
    loading.textContent = 'Carregando ficha…';
    detailBody.appendChild(loading);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');

    try {
      const data = await api('detail', { id: id });
      detailName.textContent = valueOrDash(data.item.nome_completo);
      renderDetail(data.item);
    } catch (error) {
      detailName.textContent = 'Erro';
      detailBody.textContent = error.message;
    }
  }

  async function refreshAll() {
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Atualizando…';
    try {
      await Promise.all([loadSummary(), loadParticipants()]);
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.textContent = 'Atualizar';
    }
  }

  loginForm.addEventListener('submit', login);
  logoutBtn.addEventListener('click', () => logout());
  refreshBtn.addEventListener('click', refreshAll);
  paymentFilter.addEventListener('change', () => { state.page = 1; loadParticipants(); });
  healthFilter.addEventListener('change', () => { state.page = 1; loadParticipants(); });
  searchInput.addEventListener('input', () => {
    clearTimeout(state.timer);
    state.timer = setTimeout(() => { state.page = 1; loadParticipants(); }, 280);
  });
  prevBtn.addEventListener('click', () => {
    if (state.page > 1) { state.page--; loadParticipants(); }
  });
  nextBtn.addEventListener('click', () => {
    if (state.page < state.pages) { state.page++; loadParticipants(); }
  });
  document.getElementById('close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  if (state.token) {
    showDashboard();
    refreshAll().catch(() => logout(false));
  } else {
    showLogin();
  }
})();
