import sys, io
from PyPDF2 import PdfReader

src = r"C:\Users\Administrator\Desktop\tonghuihuang(4).pdf"
out = r"C:\Users\Administrator\Desktop\deepseek-harness-workday\github-profile\_resume.txt"

r = PdfReader(src)
parts = []
for i, page in enumerate(r.pages, 1):
    parts.append(f"\n===== PAGE {i} =====\n")
    parts.append(page.extract_text() or "")

text = "".join(parts)
with io.open(out, "w", encoding="utf-8") as f:
    f.write(text)
print(f"pages={len(r.pages)} chars={len(text)} -> {out}")
