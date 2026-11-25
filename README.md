# Quorum

Do insider cluster buys beat the market? An event study of SEC Form 4 filings, 2018 to 2023.

Live: https://aditya2375.github.io/quorum/

**Result:** in this data, no. Over 1,863 priced cluster buys, the average stock beat the S&P 500 by 0.8 points after 63 trading days (95% interval -0.7 to +2.3) and trailed it by 1.8 points after 126 days (-4.1 to +0.7). The median trailed by 6.0 points and 40% beat the market. A single-insider control group looks the same.

## How it works

1. `train/extract.py` reads the SEC Insider Transactions Data Sets (24 quarterly zips, not committed, download from sec.gov) and keeps open-market purchases (code P) of common stock by directors and officers. A joint filing with several related owners counts as one insider. Trades over $250 million are dropped as typos.
2. `train/events.py` marks a cluster: three or more different insiders buying within 30 days, $50,000 or more in total, signalled on the filing date of the completing buy, with 90 quiet days before the next signal at that company. Single-insider events are the control.
3. `train/prices.py` downloads daily adjusted closes from Yahoo Finance for every event ticker plus SPY and IWM.
4. `train/study.py` enters at the first close after the filing date, exits 21, 63 or 126 trading days later, subtracts SPY over the same dates, and bootstraps 95% intervals. It writes `docs/data/study.json (copied from data/study.json)`.
5. `docs/` is a static page, no build step, no third-party requests.

## Limits, stated up front

- Yahoo has no prices for 39% of the cluster signals (delisted, acquired, renamed). That probably flatters the result.
- 2020 carries a lot. Without it the 63-day average is -0.7 points.
- Some of the largest "clusters" are directors buying in their own company's IPO or offering. These are not separated out.
- No trading costs, no liquidity limits. Signals overlap in time, so the intervals are too tight.
- One definition of a cluster, one period. It does not show insider buying is useless.

Not investment advice.

## Run it

```
python train/extract.py && python train/events.py && python train/prices.py && python train/study.py
python -m http.server -d docs
```

## Licence

MIT. Fonts: Instrument Serif and IBM Plex Mono, SIL Open Font License (files in `docs/fonts`).
