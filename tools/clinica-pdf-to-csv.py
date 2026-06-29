#!/usr/bin/env python3
"""Convert a Clinica "Completed Treatments and Sessions" PDF export into a CSV the
RIAAYA importer can read. Reconstructs RTL Arabic (per-cell word order + per-word
glyph reversal), cleans dates, and maps columns. Usage:
    python3 clinica-pdf-to-csv.py "ClinicaSAHAB 6MONTH.pdf" out.csv
"""
import sys, re, csv, unicodedata
import pdfplumber

AR = re.compile(r'[؀-ۿ]')

def clean(word):
    t = unicodedata.normalize("NFKC", word)
    if AR.search(t): t = t[::-1]
    # standardize Persian/Farsi presentation glyphs to Arabic for clean matching
    return t.translate(str.maketrans({"ی":"ي","ک":"ك","ھ":"ه","ﻩ":"ه","ﻪ":"ه"}))

def cell_text(words, bbox):
    if not bbox: return ""
    x0, top, x1, bottom = bbox
    ws = [w for w in words if w['x0'] >= x0-1 and w['x1'] <= x1+1 and w['top'] >= top-2 and w['bottom'] <= bottom+2]
    if not ws: return ""
    ar = any(AR.search(w['text']) for w in ws)
    ws.sort(key=lambda w: (round(w['top']/3), -w['x0'] if ar else w['x0']))
    s = " ".join(clean(w['text']) for w in ws)
    return re.sub(r'\s+', ' ', s.replace("هللا", "الله")).strip()

def strip_year(s):
    s = re.sub(r'\s*\b(19|20)\d{2}\b\s*$', '', s)
    s = re.sub(r'^\s*\b(19|20)\d{2}\b\s*', '', s)
    return re.sub(r'\s*\+\s*$', '', s).strip()

def main(src, dst):
    rows_out = []
    with pdfplumber.open(src) as pdf:
        for page in pdf.pages:
            words = page.extract_words()
            for tbl in page.find_tables():
                trows = tbl.rows
                if not trows: continue
                for r in trows:
                    c = r.cells
                    if not c or len(c) < 8: continue
                    date = re.sub(r'\s+', '', (page.crop(c[0]).extract_text() or '')) if c[0] else ''
                    if not re.match(r'^\d{4}-\d{2}-\d{2}$', date or ''):
                        continue  # skip header / malformed rows
                    treat = strip_year(cell_text(words, c[1]))
                    price = (page.crop(c[4]).extract_text() or '').strip() if c[4] else ''
                    patient = cell_text(words, c[5])
                    doctor = cell_text(words, c[6])
                    asst = cell_text(words, c[7])
                    if not (patient or treat):
                        continue
                    rows_out.append([date, patient, treat, price, doctor, asst])
    with open(dst, 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.writer(f)
        w.writerow(["التاريخ", "المريض", "الخدمة", "السعر", "الطبيب", "الأخصائي"])
        w.writerows(rows_out)
    print(f"wrote {len(rows_out)} rows -> {dst}")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "clinica-out.csv")
