import pandas as pd
import os

SRC = os.path.join(os.path.dirname(__file__), 'schoolsandtheircoordinates2020.xlsx')
OUT_TXT = os.path.join(os.path.dirname(__file__), 'schools_list.txt')
OUT_JSON = os.path.join(os.path.dirname(__file__), 'schools_list.json')

if not os.path.exists(SRC):
    raise SystemExit('Source XLSX not found: ' + SRC)

# Try to read sheet 'Sheet1' or the first sheet
try:
    df = pd.read_excel(SRC, sheet_name='Sheet1', header=0, skiprows=[1])
except Exception:
    df = pd.read_excel(SRC, sheet_name=0, header=0)

# Normalize column names
cols = {c.lower().strip(): c for c in df.columns}
name_col = None
for key in ['name', 'school name', 'schoolname']:
    if key in cols:
        name_col = cols[key]
        break
if not name_col:
    # fallback to first text-like column
    for c in df.columns:
        if df[c].dtype == object:
            name_col = c
            break

names = []
if name_col:
    for v in df[name_col].fillna(''):
        s = str(v).strip()
        if s:
            names.append(s)

# Deduplicate and sort
unique = sorted(set(names), key=lambda s: s.lower())

with open(OUT_TXT, 'w', encoding='utf-8') as f:
    for n in unique:
        f.write(n + '\n')

import json
with open(OUT_JSON, 'w', encoding='utf-8') as f:
    json.dump(unique, f, ensure_ascii=False, indent=2)

print('Wrote', len(unique), 'schools to', OUT_TXT)
