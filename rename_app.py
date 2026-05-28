with open('frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("Invoice Auditor Report", "LedgerAI Report")
content = content.replace("<span>Invoice Auditor</span>", "<span>LedgerAI</span>")
content = content.replace("Invoice Auditor | Enterprise Edition", "LedgerAI | Enterprise Edition")

with open('frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('README.md', 'r', encoding='utf-8') as f:
    readme = f.read()

readme = readme.replace("Invoice Auditor", "LedgerAI")

with open('README.md', 'w', encoding='utf-8') as f:
    f.write(readme)

print("Renamed to LedgerAI")
