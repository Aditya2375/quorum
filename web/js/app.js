(async () => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const D = await (await fetch('data/study.json')).json();
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent, text) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text != null) n.textContent = text; if (parent) parent.appendChild(n); return n; };
  const pp = (x, d = 1) => (x >= 0 ? '+' : '\u2212') + Math.abs(x * 100).toFixed(d);
  const usd = (v) => v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : '$' + Math.round(v / 1e3) + 'k';
  const num = (n) => n.toLocaleString('en-US');
  const C = D.summary.cluster, S = D.summary.solo, cov = D.coverage.cluster;
  const c63 = C['63'], c126 = C['126'];

  // headline
  const crosses = c63.ci[0] < 0 && c63.ci[1] > 0 && c126.ci[0] < 0 && c126.ci[1] > 0;
  $('headline').innerHTML = 'Do insider cluster buys beat the market? <em>' + (crosses ? 'Not in this data.' : 'In this data, yes.') + '</em>';
  $('lede').textContent = `Between 2018 and 2023, three or more insiders at the same company bought shares within a month on ${num(cov.events)} occasions. I could price ${num(cov.priced)} of them. Six months after the signal the average one ${c126.mean < 0 ? 'trailed' : 'beat'} the S&P 500 by ${Math.abs(c126.mean * 100).toFixed(1)} points, and the typical one (the median) ${c126.median < 0 ? 'trailed' : 'beat'} it by ${Math.abs(c126.median * 100).toFixed(1)}. Only ${Math.round(c126.hit * 100)} in 100 came out ahead.`;
  const figs = [
    ['Priced events', num(cov.priced), `of ${num(cov.events)} signals`],
    ['Average at 63 days', pp(c63.mean) + ' pts', `vs S&P 500. 95% interval ${pp(c63.ci[0])} to ${pp(c63.ci[1])}`],
    ['Average at 126 days', pp(c126.mean) + ' pts', `vs S&P 500. 95% interval ${pp(c126.ci[0])} to ${pp(c126.ci[1])}`],
    ['Median at 126 days', pp(c126.median) + ' pts', `${Math.round(c126.hit * 100)}% of events beat the market`],
  ];
  $('figs').innerHTML = figs.map(([t, v, s]) => `<div><dt>${t}</dt><dd>${v}<small>${s}</small></dd></div>`).join('');

  // line chart
  const svg = $('path'), W = 900, Ht = 380, m = { l: 62, r: 20, t: 18, b: 40 };
  const days = D.path.cluster.mean.length - 1;
  let series = 'cluster';
  const draw = () => {
    svg.textContent = '';
    const keys = series === 'both' ? ['cluster', 'solo'] : [series];
    let lo = 0, hi = 0;
    for (const k of keys) { lo = Math.min(lo, ...D.path[k].lo); hi = Math.max(hi, ...D.path[k].hi); }
    const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
    const x = (d) => m.l + (d / days) * (W - m.l - m.r), y = (v) => m.t + (1 - (v - lo) / (hi - lo)) * (Ht - m.t - m.b);
    const step = (hi - lo) > 0.12 ? 0.04 : 0.02;
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { el('line', { class: Math.abs(v) < 1e-9 ? 'zero' : 'ax', x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) }, svg); el('text', { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end' }, svg, (Math.abs(v) < 1e-9 ? '0' : pp(v, 0)) + '%'); }
    for (const d of [0, 21, 42, 63, 84, 105, 126]) { el('text', { x: x(d), y: Ht - 16, 'text-anchor': 'middle' }, svg, d === 0 ? 'entry' : d + 'd'); }
    for (const d of [21, 63, 126]) el('line', { class: 'ax', x1: x(d), x2: x(d), y1: m.t, y2: Ht - m.b }, svg);
    for (const k of keys) {
      const P = D.path[k], band = P.hi.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('') + P.lo.map((v, i) => `L${x(days - i).toFixed(1)},${y(P.lo[days - i]).toFixed(1)}`).join('') + 'Z';
      el('path', { class: k === 'cluster' ? 'bc' : 'bs', d: band }, svg);
      el('path', { class: k === 'cluster' ? 'lc' : 'ls', d: P.mean.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('') }, svg);
      const e = P.mean[days]; el('text', { x: x(days) - 6, y: y(e) + (k === 'cluster' ? -10 : 18), 'text-anchor': 'end', class: 'lab' }, svg, (k === 'cluster' ? 'Cluster ' : 'Single ') + pp(e) + ' pts');
    }
    const dot = el('circle', { r: 0, fill: '#1b1a17', cx: 0, cy: 0 }, svg), rd = el('text', { x: m.l + 8, y: m.t + 12, class: 'lab' }, svg, '');
    svg.onpointermove = (ev) => { const r = svg.getBoundingClientRect(), px = ((ev.clientX - r.left) / r.width) * W, d = Math.max(0, Math.min(days, Math.round(((px - m.l) / (W - m.l - m.r)) * days))); const k = keys[0]; dot.setAttribute('r', 4); dot.setAttribute('cx', x(d)); dot.setAttribute('cy', y(D.path[k].mean[d])); rd.textContent = `day ${d}: ${keys.map((q) => q + ' ' + pp(D.path[q].mean[d]) + ' pts').join(', ')}`; };
    svg.onpointerleave = () => { dot.setAttribute('r', 0); rd.textContent = ''; };
    $('pathcap').textContent = `Average excess return after entry. By day ${days}, cluster buys are at ${pp(D.path.cluster.mean[days])} points and the interval ${D.path.cluster.lo[days] < 0 && D.path.cluster.hi[days] > 0 ? 'includes' : 'excludes'} zero.`;
  };
  draw();
  document.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => { series = b.dataset.s; document.querySelectorAll('.seg button').forEach((x) => x.setAttribute('aria-pressed', x === b)); draw(); }));

  // horizon table
  const rows = [['Cluster buys', C], ['Single insider', S]];
  $('hz').innerHTML += '<thead><tr><th>Group</th><th>Days held</th><th class="num">Events</th><th class="num">Average vs S&amp;P</th><th class="num">95% interval</th><th class="num">Median</th><th class="num">Beat S&amp;P</th><th class="num">Average vs small caps</th></tr></thead><tbody>' +
    rows.flatMap(([n, g]) => D.horizons.map((h) => { const s = g[h]; return `<tr><td>${n}</td><td>${h}</td><td class="num">${num(s.n)}</td><td class="num ${s.mean >= 0 ? 'pos' : 'neg'}">${pp(s.mean)}</td><td class="num">${pp(s.ci[0])} to ${pp(s.ci[1])}</td><td class="num">${pp(s.median)}</td><td class="num">${Math.round(s.hit * 100)}%</td><td class="num">${pp(s.vs_iwm)}</td></tr>`; })).join('') + '</tbody>';

  // bar charts
  const bars = (id, obj) => {
    const s = $(id), items = Object.entries(obj), W2 = 440, H2 = 260, mm = { l: 46, r: 8, t: 14, b: 54 };
    let lo = 0, hi = 0; for (const [, v] of items) { lo = Math.min(lo, v.ci[0]); hi = Math.max(hi, v.ci[1]); }
    const pad = (hi - lo) * .1; lo -= pad; hi += pad;
    const y = (v) => mm.t + (1 - (v - lo) / (hi - lo)) * (H2 - mm.t - mm.b), bw = (W2 - mm.l - mm.r) / items.length;
    const step = (hi - lo) > 0.2 ? 0.05 : 0.02;
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { el('line', { class: Math.abs(v) < 1e-9 ? 'zero' : 'ax', x1: mm.l, x2: W2 - mm.r, y1: y(v), y2: y(v) }, s); el('text', { x: mm.l - 6, y: y(v) + 4, 'text-anchor': 'end' }, s, (Math.abs(v) < 1e-9 ? '0' : pp(v, 0)) + '%'); }
    items.forEach(([k, v], i) => {
      const cx = mm.l + bw * (i + .5), w = Math.min(46, bw * .5), y0 = y(0), y1 = y(v.mean);
      el('rect', { class: v.mean >= 0 ? 'bar' : 'barneg', x: cx - w / 2, y: Math.min(y0, y1), width: w, height: Math.max(1, Math.abs(y1 - y0)) }, s);
      el('line', { class: 'wh', x1: cx, x2: cx, y1: y(v.ci[0]), y2: y(v.ci[1]) }, s); el('line', { class: 'wh', x1: cx - 6, x2: cx + 6, y1: y(v.ci[0]), y2: y(v.ci[0]) }, s); el('line', { class: 'wh', x1: cx - 6, x2: cx + 6, y1: y(v.ci[1]), y2: y(v.ci[1]) }, s);
      const t = el('text', { x: cx, y: H2 - 30, 'text-anchor': 'middle' }, s, k.length > 16 ? k.slice(0, k.lastIndexOf(' ', 14)) : k);
      if (k.length > 16) el('text', { x: cx, y: H2 - 18, 'text-anchor': 'middle' }, s, k.slice(k.lastIndexOf(' ', 14) + 1));
      el('text', { x: cx, y: H2 - 4, 'text-anchor': 'middle' }, s, 'n=' + num(v.n));
    });
  };
  bars('by_year', D.by_year.cluster); bars('by_size', D.by_size); bars('by_insiders', D.by_insiders);
  bars('by_momentum', { 'down 20% or more': D.by_momentum['fell more than 20% in prior 3 months'], 'not': D.by_momentum.other });

  // histogram
  const hs = $('hist'), H = D.hist, W3 = 900, H3 = 260, hm = { l: 50, r: 16, t: 14, b: 34 }, mx = Math.max(...H.counts);
  const hx = (v) => hm.l + ((v + 1) / 2.5) * (W3 - hm.l - hm.r), hy = (c) => H3 - hm.b - (c / mx) * (H3 - hm.t - hm.b);
  for (const v of [-1, -.5, 0, .5, 1, 1.5]) { el('line', { class: v === 0 ? 'zero' : 'ax', x1: hx(v), x2: hx(v), y1: hm.t, y2: H3 - hm.b }, hs); el('text', { x: hx(v), y: H3 - 12, 'text-anchor': 'middle' }, hs, (v > 0 ? '+' : v < 0 ? '\u2212' : '') + Math.abs(v * 100) + '%'); }
  H.counts.forEach((c, i) => el('rect', { class: H.edges[i] < 0 ? 'hneg' : 'hbar', x: hx(H.edges[i]) + .5, y: hy(c), width: hx(H.edges[i + 1]) - hx(H.edges[i]) - 1, height: H3 - hm.b - hy(c) }, hs));
  el('text', { x: hm.l + 6, y: hm.t + 10 }, hs, 'Ends are clipped at \u2212100% and +150%.');

  // ledger
  const T = D.table.slice(); let key = 'value', dir = -1, filt = '';
  const body = document.querySelector('#tbl tbody');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const render = () => {
    const f = filt.trim().toLowerCase();
    const R = T.filter((r) => !f || r.sym.toLowerCase().includes(f) || r.name.toLowerCase().includes(f)).sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * dir);
    body.innerHTML = R.map((r) => `<tr><td>${esc(r.sym)}</td><td>${esc(r.name)}</td><td>${esc(r.date)}</td><td class="num">${r.insiders}</td><td class="num">${usd(r.value)}</td><td class="num ${r.x63 >= 0 ? 'pos' : 'neg'}">${pp(r.x63)}</td></tr>`).join('') || '<tr><td colspan="6">No match.</td></tr>';
  };
  document.querySelectorAll('#tbl th button').forEach((b) => b.addEventListener('click', () => { if (key === b.dataset.k) dir = -dir; else { key = b.dataset.k; dir = key === 'sym' || key === 'name' ? 1 : -1; } render(); }));
  $('q').addEventListener('input', (e) => { filt = e.target.value; render(); });
  render();

  // limits
  const miss = 1 - cov.priced / cov.events, x20 = D.ex2020.cluster;
  const yr = D.by_year.cluster;
  $('limitlist').innerHTML = [
    `<b>Missing companies.</b> Yahoo has no price history for ${Math.round(miss * 100)}% of the cluster signals (${num(cov.events - cov.priced)} events). Many are companies that were later delisted, acquired or renamed. Those skew toward failures, so the true result is probably worse than the one shown here, not better.`,
    `<b>One year carries a lot.</b> Cluster buys in 2020 averaged ${pp(yr['2020'].mean)} points over 63 days, because insiders bought the March crash and the market bounced. Without 2020 the 63-day average is ${pp(x20.mean)} points (95%: ${pp(x20.ci[0])} to ${pp(x20.ci[1])}).`,
    `<b>Average against median.</b> A few large winners pull the average above the median. The typical cluster buy did worse than the average one.`,
    `<b>Offerings look like conviction.</b> Several of the biggest "cluster buys" are directors taking part in the company's own IPO or share sale, which Form 4 files as a purchase. I could not tell these apart from open-market buying without reading each filing, so they are left in.`,
    `<b>Not a strategy.</b> No trading costs, no bid-ask spread, no limits on how much you could buy. Many of these are small, thinly traded stocks.`,
    `<b>Overlap.</b> Signals bunch up in time, so they are not independent draws. The intervals above are too tight by an unknown amount.`,
    `<b>What this cannot say.</b> It tests one definition of a cluster over six years. It does not show insider buying is useless, only that this simple rule did not beat the market in the data I could price.`,
  ].map((t) => `<li>${t}</li>`).join('');
})().catch((e) => { document.getElementById('lede').textContent = 'The data failed to load: ' + e.message; });
