/*
 * Lightweight offline fallback for Chart.js.
 *
 * The project normally uses Chart.js from the CDN. If that CDN is blocked
 * (for example inside an embedded VS Code browser), this fallback provides
 * the small subset of the Chart API used by this project: scatter charts,
 * line datasets, and destroy(). It keeps the ML result pages functional
 * without requiring another install.
 */
(function (window) {
  if (window.Chart) return;

  function Chart(ctx, config) {
    this.ctx = ctx;
    this.canvas = ctx.canvas;
    this.config = config || {};
    this.draw();
  }

  Chart.prototype.destroy = function () {
    if (this.canvas && this.canvas.__neuralisChart === this) {
      this.canvas.__neuralisChart = null;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  };

  Chart.prototype.draw = function () {
    var canvas = this.canvas;
    var ctx = this.ctx;
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var width = Math.max(320, Math.round(rect.width || canvas.clientWidth || 700));
    var height = Math.max(220, Math.round(rect.height || canvas.clientHeight || 270));

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    var datasets = (this.config.data && this.config.data.datasets) || [];
    var points = [];
    datasets.forEach(function (ds) {
      (ds.data || []).forEach(function (p) {
        if (p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y))) {
          points.push({ x: Number(p.x), y: Number(p.y), ds: ds });
        }
      });
    });
    if (!points.length) return;

    var options = (this.config.options && this.config.options.scales) || {};
    var xValues = points.map(function (p) { return p.x; });
    var yValues = points.map(function (p) { return p.y; });
    var xmin = options.x && Number.isFinite(options.x.min) ? Number(options.x.min) : Math.min.apply(null, xValues);
    var xmax = options.x && Number.isFinite(options.x.max) ? Number(options.x.max) : Math.max.apply(null, xValues);
    var ymin = options.y && Number.isFinite(options.y.min) ? Number(options.y.min) : Math.min.apply(null, yValues);
    var ymax = options.y && Number.isFinite(options.y.max) ? Number(options.y.max) : Math.max.apply(null, yValues);
    if (xmin === xmax) { xmin -= 1; xmax += 1; }
    if (ymin === ymax) { ymin -= 1; ymax += 1; }
    var xp = (xmax - xmin) * 0.05 || 1;
    var yp = (ymax - ymin) * 0.05 || 1;
    if (!(options.x && Number.isFinite(options.x.min))) { xmin -= xp; xmax += xp; }
    if (!(options.y && Number.isFinite(options.y.min))) { ymin -= yp; ymax += yp; }

    var left = 62, right = 18, top = 18, bottom = 48;
    var plotW = width - left - right;
    var plotH = height - top - bottom;
    var toX = function (v) { return left + ((v - xmin) / (xmax - xmin)) * plotW; };
    var toY = function (v) { return top + plotH - ((v - ymin) / (ymax - ymin)) * plotH; };

    ctx.font = '12px Inter, Arial, sans-serif';
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#e7e2f3';
    ctx.fillStyle = '#746b86';

    // Grid + ticks.
    for (var i = 0; i <= 5; i++) {
      var tx = left + (i / 5) * plotW;
      var ty = top + (i / 5) * plotH;
      ctx.beginPath(); ctx.moveTo(tx, top); ctx.lineTo(tx, top + plotH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(left, ty); ctx.lineTo(left + plotW, ty); ctx.stroke();
      var xv = xmin + (i / 5) * (xmax - xmin);
      var yv = ymax - (i / 5) * (ymax - ymin);
      ctx.fillText(formatNumber(xv), tx - 12, top + plotH + 22);
      ctx.fillText(formatNumber(yv), 4, ty + 4);
    }

    ctx.strokeStyle = '#bfb7cf';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, top + plotH); ctx.lineTo(left + plotW, top + plotH); ctx.stroke();

    // Axis titles.
    var xTitle = options.x && options.x.title && options.x.title.text;
    var yTitle = options.y && options.y.title && options.y.title.text;
    if (xTitle) {
      ctx.textAlign = 'center'; ctx.fillStyle = '#5d536f'; ctx.fillText(xTitle, left + plotW / 2, height - 8);
    }
    if (yTitle) {
      ctx.save(); ctx.translate(14, top + plotH / 2); ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center'; ctx.fillText(yTitle, 0, 0); ctx.restore();
    }
    ctx.textAlign = 'start';

    datasets.forEach(function (ds) {
      var data = (ds.data || []).filter(function (p) { return p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y)); });
      if (!data.length) return;
      var isLine = ds.type === 'line' || (data.length > 1 && ds.pointRadius === 0 && ds.borderColor);

      if (isLine) {
        ctx.save();
        ctx.strokeStyle = ds.borderColor || '#8f7bea';
        ctx.lineWidth = ds.borderWidth || 2;
        if (ds.borderDash) ctx.setLineDash(ds.borderDash);
        ctx.beginPath();
        data.forEach(function (p, idx) {
          var x = toX(Number(p.x)), y = toY(Number(p.y));
          if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke(); ctx.restore();
      }

      data.forEach(function (p) {
        var x = toX(Number(p.x)), y = toY(Number(p.y));
        var r = Number(ds.pointRadius) || 5;
        ctx.save();
        ctx.fillStyle = solidColor(ds.backgroundColor || ds.borderColor || '#9b6fd6');
        ctx.strokeStyle = ds.borderColor || 'rgba(255,255,255,.9)';
        ctx.lineWidth = ds.borderWidth || 1;
        drawPoint(ctx, x, y, r, ds.pointStyle);
        ctx.fill();
        if (ds.borderColor || ds.borderWidth) ctx.stroke();
        ctx.restore();
      });
    });

    canvas.__neuralisChart = this;
  };

  function drawPoint(ctx, x, y, r, style) {
    if (style === 'rectRot') {
      ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.rect(-r, -r, 2 * r, 2 * r); ctx.rotate(-Math.PI / 4); ctx.translate(-x, -y); return;
    }
    if (style === 'star') {
      ctx.beginPath();
      for (var i = 0; i < 10; i++) {
        var a = -Math.PI / 2 + i * Math.PI / 5;
        var rr = i % 2 === 0 ? r : r * 0.45;
        var px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); return;
    }
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  }

  function solidColor(c) {
    if (typeof c !== 'string') return '#9b6fd6';
    if (c.indexOf('rgba(') === 0) return c.replace(/,\s*[\d.]+\)$/, ')');
    return c;
  }
  function formatNumber(v) {
    var a = Math.abs(v);
    if (a >= 1000000) return (v / 1000000).toFixed(1) + 'M';
    if (a >= 1000) return (v / 1000).toFixed(1) + 'k';
    if (Math.abs(v - Math.round(v)) < 0.001) return String(Math.round(v));
    return v.toFixed(1);
  }

  window.Chart = Chart;
})(window);
