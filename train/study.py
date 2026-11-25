import pandas as pd, numpy as np, json, os
rng = np.random.default_rng(11)
H = [21, 63, 126]; PATH = 126
def load(s):
    f = f'../data/px/{s}.json'
    if not os.path.exists(f): return None
    j = json.load(open(f)); df = pd.DataFrame({'t': pd.to_datetime(j['t'], unit='s').normalize(), 'a': j['a']}).dropna()
    return df.drop_duplicates('t').set_index('t').a
spy, iwm = load('SPY'), load('IWM')
e = pd.read_csv('../data/events_used.csv', parse_dates=['date'])
rows, paths = [], []
cover = {'cluster': [0, 0], 'solo': [0, 0]}
cache = {}
for r in e.itertuples():
    cover[r.kind][0] += 1
    if r.sym not in cache: cache[r.sym] = load(r.sym)
    p = cache[r.sym]
    if p is None or len(p) < 300: continue
    i = p.index.searchsorted(r.date, side='right')          # first trading day strictly after the filing date
    if i + PATH >= len(p) or i == 0: continue
    t0 = p.index[i]; j = spy.index.searchsorted(t0)
    if j + PATH >= len(spy) or spy.index[j] != t0: continue
    k = iwm.index.searchsorted(t0)
    cover[r.kind][1] += 1
    pr = p.values[i:i + PATH + 1] / p.values[i]; sr = spy.values[j:j + PATH + 1] / spy.values[j]; ir = iwm.values[k:k + PATH + 1] / iwm.values[k]
    prior = p.values[max(0, i - 63)] ; mom = p.values[i] / prior - 1
    rec = dict(kind=r.kind, sym=r.sym, name=r.name, date=str(r.date.date()), insiders=int(r.insiders), value=float(r.value), mom63=float(mom), px=float(p.values[i]))
    for h in H:
        rec[f'r{h}'] = float(pr[h] - 1); rec[f'x{h}'] = float((pr[h] - 1) - (sr[h] - 1)); rec[f'xi{h}'] = float((pr[h] - 1) - (ir[h] - 1))
    rows.append(rec); paths.append((r.kind, pr - sr))
R = pd.DataFrame(rows); R['year'] = pd.to_datetime(R.date).dt.year
def boot(x, n=4000):
    x = np.asarray(x); m = rng.choice(x, (n, len(x))).mean(1); return [float(np.percentile(m, 2.5)), float(np.percentile(m, 97.5))]
def stat(g, h):
    x = g[f'x{h}'].values
    return dict(n=int(len(x)), mean=float(x.mean()), median=float(np.median(x)), hit=float((x > 0).mean()), ci=boot(x), raw=float(g[f'r{h}'].mean()), vs_iwm=float(g[f'xi{h}'].mean()))
out = {'coverage': {k: {'events': v[0], 'priced': v[1]} for k, v in cover.items()}, 'horizons': H}
out['summary'] = {k: {str(h): stat(R[R.kind == k], h) for h in H} for k in ['cluster', 'solo']}
out['by_year'] = {k: {str(y): stat(R[(R.kind == k) & (R.year == y)], 63) for y in sorted(R.year.unique())} for k in ['cluster', 'solo']}
c = R[R.kind == 'cluster']
bins = [(0, 100e3, '$50k to $100k'), (100e3, 500e3, '$100k to $500k'), (500e3, 1e12, 'over $500k')]
out['by_size'] = {lab: stat(c[(c.value >= a) & (c.value < b)], 63) for a, b, lab in bins}
out['by_insiders'] = {lab: stat(c[(c.insiders >= a) & (c.insiders <= b)], 63) for a, b, lab in [(3, 3, '3 insiders'), (4, 5, '4 to 5'), (6, 99, '6 or more')]}
out['by_momentum'] = {'fell more than 20% in prior 3 months': stat(c[c.mom63 < -.2], 63), 'other': stat(c[c.mom63 >= -.2], 63)}
out['ex2020'] = {k: stat(R[(R.kind == k) & (R.year != 2020)], 63) for k in ['cluster', 'solo']}
# average excess path with bands
avg = {}
for k in ['cluster', 'solo']:
    A = np.array([p for kk, p in paths if kk == k]); m = A.mean(0)
    bs = np.array([A[rng.integers(0, len(A), len(A))].mean(0) for _ in range(500)])
    avg[k] = dict(mean=m.tolist(), lo=np.percentile(bs, 2.5, 0).tolist(), hi=np.percentile(bs, 97.5, 0).tolist())
out['path'] = avg
for k in avg:
    for q in avg[k]: avg[k][q] = [round(v, 5) for v in avg[k][q]]
# histogram of 63d excess for clusters
x = np.clip(c.x63.values, -1, 1.5); hist, edges = np.histogram(x, bins=40, range=(-1, 1.5)); out['hist'] = dict(counts=hist.tolist(), edges=edges.tolist())
tbl = c.sort_values('value', ascending=False).head(60)[['sym', 'name', 'date', 'insiders', 'value', 'x63']]
out['table'] = tbl.round(4).to_dict('records')
out['spy_63'] = float(((spy.shift(-63) / spy) - 1).mean())
json.dump(out, open('../data/study.json', 'w'), separators=(',', ':'))
R.to_csv('../data/results.csv', index=False)
print(json.dumps({k: out[k] for k in ['coverage', 'summary', 'ex2020', 'by_size', 'by_insiders', 'by_momentum']}, indent=1)[:6000])
print(json.dumps(out['by_year']['cluster'])[:1500])
