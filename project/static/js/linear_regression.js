// linear_regression.js

(function () {
  const areaRange = document.getElementById('areaRange');
  const bedroomsRange = document.getElementById('bedroomsRange');
  const ageRange = document.getElementById('ageRange');
  const areaVal = document.getElementById('areaVal');
  const bedroomsVal = document.getElementById('bedroomsVal');
  const ageVal = document.getElementById('ageVal');
  const predictBtn = document.getElementById('predictBtn');
  const loadingWrap = document.getElementById('loadingWrap');
  const errorBanner = document.getElementById('errorBanner');
  const resultsPanel = document.getElementById('resultsPanel');

  const fmtINR = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

  areaRange.addEventListener('input', () => areaVal.textContent = areaRange.value);
  bedroomsRange.addEventListener('input', () => bedroomsVal.textContent = bedroomsRange.value);
  ageRange.addEventListener('input', () => ageVal.textContent = ageRange.value);

  // Info tabs
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
    const ctx = document.getElementById('regChart').getContext('2d');
    const scatterPts = data.scatter.map(p => ({ x: p[0], y: p[1] }));
    const linePts = data.line.map(p => ({ x: p[0], y: p[1] }));
    const predPt = { x: data.input_point[0], y: data.input_point[1] };

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Training houses',
            data: scatterPts,
            backgroundColor: 'rgba(201,191,252,0.7)',
            pointRadius: 4,
          },
          {
            label: 'Regression line',
            data: linePts,
            type: 'line',
            borderColor: '#8f7bea',
            borderWidth: 3,
            pointRadius: 0,
            fill: false,
            tension: 0,
          },
          {
            label: 'Your prediction',
            data: [predPt],
            backgroundColor: '#ff6f91',
            borderColor: '#fff',
            borderWidth: 2,
            pointRadius: 9,
            pointHoverRadius: 11,
          },
        ],
      },
      options: {
        animation: { duration: 900, easing: 'easeOutQuart' },
        plugins: { legend: { display: false } },
        scales: {
          x: { title: { display: true, text: 'Area (sq. ft.)' } },
          y: { title: { display: true, text: 'Price (₹)' }, ticks: { callback: (v) => '₹' + (v / 100000).toFixed(1) + 'L' } },
        },
      },
    });
  }

  predictBtn.addEventListener('click', async () => {
    errorBanner.classList.remove('show');
    loadingWrap.classList.add('show');
    resultsPanel.classList.remove('show');
    predictBtn.disabled = true;

    const payload = {
      area: parseFloat(areaRange.value),
      bedrooms: parseFloat(bedroomsRange.value),
      age: parseFloat(ageRange.value),
    };

    try {
      const data = await postJSON('/api/linear-regression', payload);

      document.getElementById('mPrice').textContent = fmtINR(data.prediction);
      document.getElementById('mR2').textContent = (data.r_squared * 100).toFixed(1) + '%';
      document.getElementById('mRmse').textContent = fmtINR(data.rmse);

      document.getElementById('explanationBox').innerHTML =
        `Based on the model, a <strong>${payload.area} sq. ft.</strong> house with ` +
        `<strong>${payload.bedrooms} bedroom(s)</strong> and <strong>${payload.age} year(s)</strong> ` +
        `of age is predicted to be worth <strong>${fmtINR(data.prediction)}</strong>. The model explains ` +
        `about <strong>${(data.r_squared * 100).toFixed(1)}%</strong> of the price variation in the training data.`;

      renderChart(data);
      resultsPanel.classList.add('show');
    } catch (err) {
      errorBanner.textContent = err.message;
      errorBanner.classList.add('show');
    } finally {
      loadingWrap.classList.remove('show');
      predictBtn.disabled = false;
    }
  });
})();
