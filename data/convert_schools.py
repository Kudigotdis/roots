import pandas as pd
import json
import os

SRC = os.path.join('SORT-FILES', 'schoolsandtheircoordinates2020.xlsx')
OUT = os.path.join('tov-native', 'src', 'data', 'schools.json')

df = pd.read_excel(SRC, sheet_name='Sheet1', header=0, skiprows=[1])

rows = []
for _, r in df.iterrows():
    def clean(v):
        if pd.isna(v):
            return None
        s = str(v).strip()
        return s if s else None
    rows.append({
        'schoolNumber': clean(r['Schoolnumber']),
        'name': clean(r['Name']),
        'province': clean(r['Province']),
        'schoolLevel': clean(r['SchoolLevel']),
        'district': clean(r['District']),
    })

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(rows, f, ensure_ascii=False, indent=2)

print('rows:', len(rows))
