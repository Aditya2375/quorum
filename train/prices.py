import pandas as pd, json, os, time, urllib.request, concurrent.futures as cf
e = pd.read_csv('../data/events.csv', parse_dates=['date'])
solo = e[e.kind == 'solo'].sample(3500, random_state=7)
e = pd.concat([e[e.kind == 'cluster'], solo]); e.to_csv('../data/events_used.csv', index=False)
syms = sorted(set(e.sym) | {'SPY', 'IWM'})
os.makedirs('../data/px', exist_ok=True)
P1, P2 = 1512086400, 1735603200  # 2017-12-01, 2024-12-31
def get(s):
    f = f'../data/px/{s}.json'
    if os.path.exists(f): return s, 'cached'
    url = f'https://query1.finance.yahoo.com/v8/finance/chart/{s}?period1={P1}&period2={P2}&interval=1d&events=div,splits'
    for k in range(2):
        try:
            r = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=25))
            res = r['chart']['result'][0]
            ts = res['timestamp']; q = res['indicators']['quote'][0]; adj = res['indicators']['adjclose'][0]['adjclose']
            json.dump({'t': ts, 'o': q['open'], 'c': q['close'], 'a': adj, 'v': q['volume']}, open(f, 'w'))
            return s, 'ok'
        except urllib.error.HTTPError as ex:
            if ex.code == 404: open(f + '.miss', 'w').write('1'); return s, 'miss'
            time.sleep(2)
        except Exception: time.sleep(2)
    return s, 'fail'
n = 0
with cf.ThreadPoolExecutor(4) as ex:
    for s, st in ex.map(get, syms):
        n += 1
        if n % 200 == 0: print(n, len(syms), flush=True)
print('done', flush=True)
