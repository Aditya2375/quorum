import pandas as pd, numpy as np
d = pd.read_csv('../data/purchases.csv', parse_dates=['filed'])
d['sym'] = d.ISSUERTRADINGSYMBOL.str.upper().str.strip()
d = d[d.sym.str.fullmatch(r'[A-Z]{1,5}', na=False)].sort_values('filed')
ev = []
for cik, g in d.groupby('ISSUERCIK'):
    g = g.reset_index(drop=True); last_ev = None
    for i in range(len(g)):
        t = g.filed[i]
        w = g[(g.filed <= t) & (g.filed > t - pd.Timedelta(days=30))]
        n = w.RPTOWNERCIK.nunique(); val = w.value.sum()
        if last_ev is not None and (t - last_ev).days < 90: continue
        if n >= 3 and val >= 50000:
            ev.append(dict(kind='cluster', cik=cik, sym=g.sym[i], name=g.ISSUERNAME[i], date=t, insiders=n, value=val)); last_ev = t
        elif n == 1 and val >= 50000 and (g.RPTOWNERCIK[i] == w.RPTOWNERCIK.iloc[-1]):
            ev.append(dict(kind='solo', cik=cik, sym=g.sym[i], name=g.ISSUERNAME[i], date=t, insiders=1, value=val)); last_ev = t
e = pd.DataFrame(ev)
e.to_csv('../data/events.csv', index=False)
print(e.kind.value_counts(), e.sym.nunique(), e.groupby([e.date.dt.year, 'kind']).size().unstack())
