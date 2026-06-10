/** charts.js — fábricas de gráfico usando Chart.js (carregado via CDN). */
const _chartInstances = {};

function _resetChart(canvasId) {
  if (_chartInstances[canvasId]) {
    _chartInstances[canvasId].destroy();
    delete _chartInstances[canvasId];
  }
}

const CORES_GRAFICO = ['#34d399', '#f472b6', '#fbbf24', '#60a5fa', '#a78bfa', '#fb923c'];

/** Linha comparativa: este mês (sólido verde, ponto na ponta) × mês passado (tracejado cinza). */
function criarLinhaComparativa(canvasId, labels, atual, anterior, diaAtual) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;
  _resetChart(canvasId);

  // Mostra eixo X só em marcos (1, 15, 25, último dia)
  const ultimo = labels.length;
  const marcos = new Set(['1', '15', '25', String(ultimo)]);

  _chartInstances[canvasId] = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Mês passado', data: anterior,
          borderColor: '#52525b', borderWidth: 2, borderDash: [5, 4],
          pointRadius: 0, tension: 0.35, fill: false, order: 2,
        },
        {
          label: 'Este mês', data: atual,
          borderColor: '#10b981', borderWidth: 2.5,
          backgroundColor: 'rgba(16, 185, 129, 0.10)',
          tension: 0.35, fill: true, order: 1, spanGaps: false,
          // Ponto verde só no último dia preenchido
          pointRadius: (ctx) => (ctx.dataIndex === (diaAtual - 1) ? 5 : 0),
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#04130d', pointBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${_fmtBRL(c.parsed.y)}` } },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#52525b', autoSkip: false,
            callback: function (val) {
              const lbl = this.getLabelForValue(val);
              return marcos.has(lbl) ? lbl : '';
            },
          },
        },
        y: {
          position: 'left', beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: {
            color: '#52525b', maxTicksLimit: 5,
            callback: (v) => 'R$ ' + (v >= 1000 ? (v / 1000) + 'k' : v),
          },
        },
      },
    },
  });
}

function _fmtBRL(v) {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Donut. labels: string[], valores: number[]. */
function criarDonut(canvasId, labels, valores, cores = CORES_GRAFICO) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;
  _resetChart(canvasId);
  _chartInstances[canvasId] = new Chart(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: valores, backgroundColor: cores, borderWidth: 0 }] },
    options: {
      responsive: true, cutout: '68%',
      plugins: { legend: { position: 'bottom', labels: { color: '#a1a1aa', padding: 16 } } },
    },
  });
}
