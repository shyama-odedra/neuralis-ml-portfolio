// logistic_regression.js

(function () {
  const hoursRange = document.getElementById('hoursRange');
  const attRange = document.getElementById('attRange');
  const hoursVal = document.getElementById('hoursVal');
  const attVal = document.getElementById('attVal');
  const classifyBtn = document.getElementById('classifyBtn');
  const loadingWrap = document.getElementById('loadingWrap');
  const errorBanner = document.getElementById('errorBanner');
  const resultsPanel = document.getElementById('resultsPanel');
  const classChip = document.getElementById('classChip');
  const classText = document.getElementById('classText');

  hoursRange.addEventListener('input', () => hoursVal.textContent = hoursRange.value);
  attRange.addEventListener('input', () => attVal.textContent = attRange.value);

  document.querySelectorAll('.info-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.info-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.info-tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  let chart = null;

  function renderChart(data, userPassed) {
    const ctx = document.getElementById('clsChart').getContext('2d');
    const passPts = data.scatter_pass.map(p => ({ x: p[0], y: p[1] }));
    const failPts = data.scatter_fail.map(p => ({ x: p[0], y: p[1] }));
    const boundaryPts = data.boundary.map(p => ({ x: p[0], y: p[1] }));
    const userPt = { x: data.input_point[0], y: data.input_point[1] };

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          { label: 'Passed', data: passPts, backgroundColor: 'rgba(120,214,168,0.65)', pointRadius: 4 },
          { label: 'Failed', data: failPts, backgroundColor: 'rgba(255,154,118,0.65)', pointRadius: 4 },
          {
            label: 'Decision boundary', data: boundaryPts, type: 'line',
            borderColor: '#f0709b', borderWidth: 3, borderDash: [6, 4], pointRadius: 0, fill: false,
          },
          {
            label: 'Your student', data: [userPt],
            backgroundColor: userPassed ? '#2c2740' : '#2c2740',
            pointStyle: 'rectRot', pointRadius: 10, pointHoverRadius: 12, borderColor: '#fff', borderWidth: 2,
          },
        ],
      },
      options: {
        animation: { duration: 900, easing: 'easeOutQuart' },
        plugins: { legend: { display: false } },
        scales: {
          x: { title: { display: true, text: 'Hours Studied' }, min: 0, max: 12 },
          y: { title: { display: true, text: 'Attendance (%)' }, min: 0, max: 100 },
        },
      },
    });
  }

  classifyBtn.addEventListener('click', async () => {
    errorBanner.classList.remove('show');
    loadingWrap.classList.add('show');
    resultsPanel.classList.remove('show');
    classifyBtn.disabled = true;

    const payload = {
      hours: parseFloat(hoursRange.value),
      attendance: parseFloat(attRange.value),
    };

    try {
      const data = await postJSON('/api/logistic-regression', payload);
      const isPass = data.prediction === 'Pass';

      classChip.className = 'class-chip ' + (isPass ? 'pass' : 'fail');
      classText.textContent = isPass ? '✅ Predicted: Pass' : '❌ Predicted: Fail';

      document.getElementById('mProb').textContent = (data.probability * 100).toFixed(1) + '%';
      document.getElementById('mAcc').textContent = (data.accuracy * 100).toFixed(1) + '%';

      document.getElementById('explanationBox').innerHTML =
        `With <strong>${payload.hours} hour(s)</strong> of daily study and <strong>${payload.attendance}%</strong> ` +
        `attendance, the model predicts a <strong>${(data.probability * 100).toFixed(1)}%</strong> probability ` +
        `of passing, so the student is classified as <strong>${data.prediction}</strong>. On the training data, ` +
        `this model is correct <strong>${(data.accuracy * 100).toFixed(1)}%</strong> of the time.`;

      renderChart(data, isPass);
      resultsPanel.classList.add('show');
    } catch (err) {
      errorBanner.textContent = err.message;
      errorBanner.classList.add('show');
    } finally {
      loadingWrap.classList.remove('show');
      classifyBtn.disabled = false;
    }
  });
})();
