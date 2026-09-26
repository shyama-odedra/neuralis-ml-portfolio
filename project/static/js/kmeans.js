// kmeans.js

(function () {
  const incomeRange = document.getElementById('incomeRange');
  const spendRange = document.getElementById('spendRange');
  const kRange = document.getElementById('kRange');
  const incomeVal = document.getElementById('incomeVal');
  const spendVal = document.getElementById('spendVal');
  const kVal = document.getElementById('kVal');
  const clusterBtn = document.getElementById('clusterBtn');
  const loadingWrap = document.getElementById('loadingWrap');
  const errorBanner = document.getElementById('errorBanner');
  const resultsPanel = document.getElementById('resultsPanel');
  const clusterBadge = document.getElementById('clusterBadge');
  const legendRow = document.getElementById('legendRow');

  const PALETTE = ['#2fb595', '#4fb8d6', '#f0709b', '#f7b955', '#9c8af0', '#ff9a76', '#5fbf7a', '#b98af0'];

  incomeRange.addEventListener('input', () => incomeVal.textContent = incomeRange.value);
  spendRange.addEventListener('input', () => spendVal.textContent = spendRange.value);
  kRange.addEventListener('input', () => kVal.textContent = kRange.value);

  document.querySelectorAll('.info-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.info-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.info-tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  let chart = null;

  function renderChart(data) {
    const ctx = document.getElementById('kmChart').getContext('2d');
    const byCluster = {};
    data.points.forEach(p => {
      const c = p[2];
      if (!byCluster[c]) byCluster[c] = [];
      byCluster[c].push({ x: p[0], y: p[1] });
    });

    const datasets = Object.keys(byCluster).sort((a, b) => a - b).map(c => ({
      label: 'Cluster ' + (parseInt(c, 10) + 1),
      data: byCluster[c],
      backgroundColor: PALETTE[c % PALETTE.length] + 'aa',
      pointRadius: 4,
    }));

    datasets.push({
      label: 'Centroids',
      data: data.centers.map(c => ({ x: c[0], y: c[1] })),
      backgroundColor: '#2c2740',
      pointStyle: 'crossRot',
      pointRadius: 8,
      pointBorderWidth: 3,
      borderColor: '#2c2740',
    });

    datasets.push({
      label: 'Your customer',
      data: [{ x: data.input_point[0], y: data.input_point[1] }],
      backgroundColor: '#fff',
      borderColor: PALETTE[data.cluster % PALETTE.length],
      borderWidth: 3,
      pointStyle: 'star',
      pointRadius: 11,
    });

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: 'scatter',
      data: { datasets },
      options: {
        animation: { duration: 900, easing: 'easeOutQuart' },
        plugins: { legend: { display: false } },
        scales: {
          x: { title: { display: true, text: 'Annual Income (₹k)' } },
          y: { title: { display: true, text: 'Spending Score' } },
        },
      },
    });

    legendRow.innerHTML = Object.keys(byCluster).sort((a, b) => a - b).map(c =>
      `<span><span class="legend-dot" style="background:${PALETTE[c % PALETTE.length]}"></span>Cluster ${parseInt(c, 10) + 1}</span>`
    ).join('') + `<span><span class="legend-dot" style="background:#2c2740"></span>Centroids</span>`;
  }

  clusterBtn.addEventListener('click', async () => {
    errorBanner.classList.remove('show');
    loadingWrap.classList.add('show');
    resultsPanel.classList.remove('show');
    clusterBtn.disabled = true;

    const payload = {
      income: parseFloat(incomeRange.value),
      spending: parseFloat(spendRange.value),
      k: parseInt(kRange.value, 10),
    };

    try {
      const data = await postJSON('/api/kmeans', payload);
      const color = PALETTE[data.cluster % PALETTE.length];

      clusterBadge.style.background = color;
      clusterBadge.textContent = 'Cluster ' + (data.cluster + 1);
      document.getElementById('mCluster').textContent = 'Cluster ' + (data.cluster + 1);
      document.getElementById('mVar').textContent = (data.variance_explained * 100).toFixed(1) + '%';

      document.getElementById('explanationBox').innerHTML =
        `A customer with <strong>₹${payload.income}k</strong> annual income and a spending score of ` +
        `<strong>${payload.spending}</strong> is grouped into <strong>Cluster ${data.cluster + 1}</strong> ` +
        `(out of ${payload.k}), based on similarity to other customers in that segment. Together, these ` +
        `${payload.k} clusters explain <strong>${(data.variance_explained * 100).toFixed(1)}%</strong> of the ` +
        `spread in the customer data.`;

      renderChart(data);
      resultsPanel.classList.add('show');
    } catch (err) {
      errorBanner.textContent = err.message;
      errorBanner.classList.add('show');
    } finally {
      loadingWrap.classList.remove('show');
      clusterBtn.disabled = false;
    }
  });
})();
