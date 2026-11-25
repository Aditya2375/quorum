"""Open-market insider purchases from the SEC Insider Transactions Data Sets (Form 4, code P)."""
import zipfile, glob, io, os
import pandas as pd

OUT = []
for z in sorted(glob.glob('../data/*_form345.zip')):
    zf = zipfile.ZipFile(z)
    rd = lambda n, cols: pd.read_csv(zf.open(n), sep='\t', usecols=cols, dtype=str, low_memory=False)
    sub = rd('SUBMISSION.tsv', ['ACCESSION_NUMBER', 'FILING_DATE', 'DOCUMENT_TYPE', 'ISSUERCIK', 'ISSUERNAME', 'ISSUERTRADINGSYMBOL'])
    sub = sub[sub.DOCUMENT_TYPE == '4']
    tr = rd('NONDERIV_TRANS.tsv', ['ACCESSION_NUMBER', 'SECURITY_TITLE', 'TRANS_DATE', 'TRANS_CODE', 'TRANS_SHARES', 'TRANS_PRICEPERSHARE', 'TRANS_ACQUIRED_DISP_CD'])
    tr = tr[(tr.TRANS_CODE == 'P') & (tr.TRANS_ACQUIRED_DISP_CD == 'A')]
    tr = tr[tr.SECURITY_TITLE.str.contains('common', case=False, na=False)]
    tr['sh'] = pd.to_numeric(tr.TRANS_SHARES, errors='coerce'); tr['px'] = pd.to_numeric(tr.TRANS_PRICEPERSHARE, errors='coerce')
    tr = tr[(tr.sh > 0) & (tr.px >= 1)]
    ow = rd('REPORTINGOWNER.tsv', ['ACCESSION_NUMBER', 'RPTOWNERCIK', 'RPTOWNERNAME', 'RPTOWNER_RELATIONSHIP', 'RPTOWNER_TITLE'])
    ow = ow[ow.RPTOWNER_RELATIONSHIP.fillna('').str.contains('Director|Officer')]
    # a joint Form 4 lists several related owners for the SAME trades: count each trade once,
    # credited to the first qualifying owner, so one decision is never counted as several insiders
    ow = ow.sort_values(['ACCESSION_NUMBER', 'RPTOWNERCIK']).drop_duplicates('ACCESSION_NUMBER')
    m = tr.merge(sub, on='ACCESSION_NUMBER').merge(ow, on='ACCESSION_NUMBER')
    m['value'] = m.sh * m.px
    m = m[(m.value <= 2.5e8) & (m.px <= 5000)]   # drop filing typos (a $4 trillion "purchase")
    OUT.append(m[['ACCESSION_NUMBER', 'FILING_DATE', 'TRANS_DATE', 'ISSUERCIK', 'ISSUERNAME', 'ISSUERTRADINGSYMBOL', 'RPTOWNERCIK', 'RPTOWNERNAME', 'RPTOWNER_TITLE', 'sh', 'px', 'value']])
    print(z, len(m), flush=True)
df = pd.concat(OUT)
df['filed'] = pd.to_datetime(df.FILING_DATE, format='%d-%b-%Y')
df = df.drop_duplicates(['ACCESSION_NUMBER', 'RPTOWNERCIK', 'TRANS_DATE', 'sh', 'px'])
df.to_csv('../data/purchases.csv', index=False)
print(len(df), df.filed.min(), df.filed.max(), df.ISSUERCIK.nunique())
