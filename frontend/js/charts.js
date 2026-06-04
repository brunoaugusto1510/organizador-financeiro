/** charts.js — fábricas de gráfico usando Chart.js (carregado via CDN). */
const _chartInstances = {};

function _resetChart(canvasId) {
  if (_chartInstances[canvasId]) {
    _chartInstances[canvasId].destroy();
    delete _chartInstances[canvasId];
  }
}

const CORES_GRAFICO = ['#34d399', '#f472b6', '#fbbf24', '#60a5fa', '#a78bfa', '#fb923c'];

/** Donut. labels: string[], valores: number[]. */
function criarDonut(canvasId, labels, valores) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;
  _resetChart(canvasId);
  _chartInstances[canvasId] = new Chart(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: valores, backgroundColor: CORES_GRAFICO, borderWidth: 0 }] },
    options: {
      responsive: true, cutout: '68%',
      plugins: { legend: { position: 'bottom', labels: { color: '#a1a1aa', padding: 16 } } },
    },
  });
}
