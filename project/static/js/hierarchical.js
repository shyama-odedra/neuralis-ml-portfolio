// hierarchical.js

(function () {
  const kRange = document.getElementById('kRange');
  const kVal = document.getElementById('kVal');
  const methodSelect = document.getElementById('methodSelect');
  const runBtn = document.getElementById('runBtn');
  const loadingWrap = document.getElementById('loadingWrap');
  const errorBanner = document.getElementById('errorBanner');
  const resultsPanel = document.getElementById('resultsPanel');
  const legendRow = document.getElementById('legendRow');

  const CLUSTER_COLORS = ['#9b6fd6', '#4fb8d6', '#f0709b', '#f7b955'];
  const SPECIES_COLORS = { 0: '#c98ae0', 1: '#5fbf7a', 2: '#ff9a76' };
  const SPECIES_NAMES = { 0: 'setosa', 1: 'versicolor', 2: 'virginica' };

  kRange.addEventListener('input', () => kVal.textContent = kRange.value);

  document.querySelectorAll('.info-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.info-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.info-tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  let lastData = null;
  let currentView = 'cluster';
  let chart = null;

  document.getElementById('btnViewCluster').addEventListener('click', () => setView('cluster'));
  document.getElementById('btnViewSpecies').addEventListener('click', () => setView('species'));

  function setView(view) {
    currentView = view;
    document.getElementById('btnViewCluster').classList.toggle('active', view === 'cluster');
    document.getElementById('btnViewSpecies').classList.toggle('active', view === 'species');
    if (lastData) renderScatter(lastData);
  }

  /**
   * Build an SVG dendrogram from R's hclust output:
   *   merge  -> (n-1) x 2 matrix; negative = leaf id, positive = earlier merge step
   *   heights -> height of each merge step, same order as merge rows
   *   order  -> leaf drawing order (permutation of 1..n)
   */
  function renderDendrogram(data) {
    const svg = document.getElementById('dendroSvg');
    const width = svg.clientWidth || 640;
    const height = 280;
    const marginLeft = 40, marginRight = 20, marginTop = 20, marginBottom = 30;
    const plotW = width - marginLeft - marginRight;
    const plotH = height - marginTop - marginBottom;

    const n = data.order.length;
    const leafX = {};
    data.order.forEach((leafId, i) => {
      leafX[leafId] = marginLeft + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    });

    const maxHeight = Math.max(...data.heights);
    const yFor = (h) => marginTop + plotH - (h / maxHeight) * plotH;

    const nodeX = {}, nodeY = {};
    let svgParts = [];

    data.merge.forEach((row, i) => {
      const [a, b] = row;
      const xa = a < 0 ? leafX[-a] : nodeX[a];
      const xb = b < 0 ? leafX[-b] : nodeX[b];
      const ya = a < 0 ? (marginTop + plotH) : nodeY[a];
      const yb = b < 0 ? (marginTop + plotH) : nodeY[b];
      const stepId = i + 1;
      const y = yFor(data.heights[i]);
      const x = (xa + xb) / 2;
      nodeX[stepId] = x;
      nodeY[stepId] = y;

      svgParts.push(`<line x1="${xa}" y1="${ya}" x2="${xa}" y2="${y}" stroke="#c9bffc" stroke-width="2"/>`);
      svgParts.push(`<line x1="${xb}" y1="${yb}" x2="${xb}" y2="${y}" stroke="#c9bffc" stroke-width="2"/>`);
      svgParts.push(`<line x1="${xa}" y1="${y}" x2="${xb}" y2="${y}" stroke="#9b6fd6" stroke-width="2"/>`);
    });

    // Leaf tick marks, colored by current view
    data.order.forEach((leafId) => {
      const p = data.points[leafId - 1]; // [petal_length, petal_width, cluster, species]
      const color = currentView === 'species' ? SPECIES_COLORS[p[3]] : CLUSTER_COLORS[p[2] % CLUSTER_COLORS.length];
      const x = leafX[leafId];
      svgParts.push(`<circle cx="${x}" cy="${marginTop + plotH}" r="4" fill="${color}"/>`);
    });

    svgParts.push(`<line x1="${marginLeft}" y1="${marginTop}" x2="${marginLeft}" y2="${marginTop + plotH}" stroke="#e2ddf5" stroke-width="1"/>`);

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.innerHTML = svgParts.join('');
  }

  function renderScatter(data) {
    const ctx = document.getElementById('hcChart').getContext('2d');
    let datasets;

    if (currentView === 'cluster') {
      const byGroup = {};
      data.points.forEach(p => {
        const g = p[2];
        (byGroup[g] = byGroup[g] || []).push({ x: p[0], y: p[1] });
      });
      datasets = Object.keys(byGroup).sort((a, b) => a - b).map(g => ({
        label: 'Cluster ' + (parseInt(g, 10) + 1),
        data: byGroup[g],
        backgroundColor: CLUSTER_COLORS[g % CLUSTER_COLORS.length] + 'cc',
        pointRadius: 5,
      }));
      legendRow.innerHTML = Object.keys(byGroup).sort((a, b) => a - b).map(g =>
        `<span><span class="legend-dot" style="background:${CLUSTER_COLORS[g % CLUSTER_COLORS.length]}"></span>Cluster ${parseInt(g, 10) + 1}</span>`
      ).join('');
    } else {
      const byGroup = {};
      data.points.forEach(p => {
        const g = p[3];
        (byGroup[g] = byGroup[g] || []).push({ x: p[0], y: p[1] });
      });
      datasets = Object.keys(byGroup).sort((a, b) => a - b).map(g => ({
        label: SPECIES_NAMES[g],
        data: byGroup[g],
        backgroundColor: SPECIES_COLORS[g] + 'cc',
        pointRadius: 5,
      }));
      legendRow.innerHTML = Object.keys(byGroup).sort((a, b) => a - b).map(g =>
        `<span><span class="legend-dot" style="background:${SPECIES_COLORS[g]}"></span>${SPECIES_NAMES[g]}</span>`
      ).join('');
    }

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: 'scatter',
      data: { datasets },
      options: {
        animation: { duration: 700, easing: 'easeOutQuart' },
        plugins: { legend: { display: false } },
        scales: {
          x: { title: { display: true, text: 'Petal Length (cm)' } },
          y: { title: { display: true, text: 'Petal Width (cm)' } },
        },
      },
    });
  }

  runBtn.addEventListener('click', async () => {
    errorBanner.classList.remove('show');
    loadingWrap.classList.add('show');
    resultsPanel.classList.remove('show');
    runBtn.disabled = true;

    const payload = {
      k: parseInt(kRange.value, 10),
      method: methodSelect.value,
    };

    try {
      const data = await postJSON('/api/hierarchical', payload);
      lastData = data;
      currentView = 'cluster';
      document.getElementById('btnViewCluster').classList.add('active');
      document.getElementById('btnViewSpecies').classList.remove('active');

      document.getElementById('mK').textContent = data.k;
      document.getElementById('mPurity').textContent = (data.purity * 100).toFixed(1) + '%';

      document.getElementById('explanationBox').innerHTML =
        `Cutting the tree into <strong>${data.k} clusters</strong> using <strong>${data.method}</strong> linkage ` +
        `groups the flowers with <strong>${(data.purity * 100).toFixed(1)}%</strong> purity against the true species ` +
        `— meaning the clusters the algorithm found on its own, with no labels, line up closely with real Iris species.`;

      renderDendrogram(data);
      renderScatter(data);
      resultsPanel.classList.add('show');
    } catch (err) {
      errorBanner.textContent = err.message;
      errorBanner.classList.add('show');
    } finally {
      loadingWrap.classList.remove('show');
      runBtn.disabled = false;
    }
  });
})();
