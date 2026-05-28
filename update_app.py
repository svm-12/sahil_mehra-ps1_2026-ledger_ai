import re

with open('frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update inputMode
content = content.replace("const [inputMode, setInputMode] = useState<'text' | 'file'>('file');", "const [inputMode, setInputMode] = useState<'text' | 'file' | 'manual'>('file');")

# 2. Delete button in feed
delete_btn = """
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <button
                              onClick={(e) => handleDeleteFeedItem(doc.id, e)}
                              className="text-gray-500 hover:text-brand-danger transition-colors p-1 rounded-md hover:bg-brand-danger/10"
                              title="Delete Invoice"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
"""
content = content.replace('<div className="flex flex-col items-end gap-1.5 shrink-0">', delete_btn, 1)

# 3. Add handleDeleteFeedItem
handler = """
  const handleDeleteFeedItem = async (docId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${BACKEND_URL}/documents/${docId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete document.');
      setDocuments(prev => prev.filter(d => d.id !== docId));
      if (selectedDoc?.id === docId) setSelectedDoc(null);
      setSuccessMsg(`Document deleted successfully!`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete document.');
    }
  };

  const handleExportCSV = () => {
"""
content = content.replace("  const handleExportCSV = () => {", handler)

# 4. Add Category to Vendor UI
vendor_ui = """
                          <div className="col-span-1">
                            <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
                              Vendor / Merchant
                            </label>
                            <input
                              type="text"
                              value={vendorName}
                              onChange={(e) => setVendorName(e.target.value)}
                              className="w-full bg-dark-bg/60 border border-dark-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-primary transition-all font-semibold"
                            />
                          </div>
                          <div className="col-span-1">
                            <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
                              Category
                            </label>
                            <input
                              type="text"
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                              className="w-full bg-dark-bg/60 border border-dark-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-primary transition-all font-semibold"
                            />
                          </div>
"""
content = re.sub(
    r'<div className="col-span-2">\s*<label className="block text-\[11px\] font-bold text-gray-400 mb-1.5 uppercase tracking-wide">\s*Vendor / Merchant\s*</label>.*?</div>',
    vendor_ui,
    content,
    flags=re.DOTALL
)

# 5. Modify Modal for Manual Entry
modal_btn = """
                <button
                  type="button"
                  onClick={() => setInputMode('manual')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    inputMode === 'manual' ? 'bg-dark-card text-brand-success shadow' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Manual Entry
                </button>
              </div>
"""
content = content.replace('</div>\n\n              {inputMode === \'text\' ? (', modal_btn + '\n\n              {inputMode === \'text\' ? (')

manual_ui = """
              ) : inputMode === 'manual' ? (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Vendor Name</label>
                      <input type="text" value={vendorName} onChange={e => setVendorName(e.target.value)} className="w-full bg-dark-bg border border-dark-border rounded-xl p-2.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Category</label>
                      <input type="text" value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-dark-bg border border-dark-border rounded-xl p-2.5 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Total Amount (₹)</label>
                    <input type="number" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className="w-full bg-dark-bg border border-dark-border rounded-xl p-2.5 text-sm" />
                  </div>
                </div>
              ) : (
"""
content = content.replace(') : (\n                <div>\n                  <label className="flex flex-col items-center justify-center', manual_ui + '                <div>\n                  <label className="flex flex-col items-center justify-center')

# 6. Manual Entry Submit Logic
submit_logic = """
      if (inputMode === 'manual') {
        const payload = {
          raw_text: "Manual Entry",
          vendor_name: vendorName.trim() || null,
          category: category.trim() || null,
          total_amount: totalAmount.trim() !== '' ? parseFloat(totalAmount) : null,
          status: 'Audited'
        };
        const res = await fetch(`${BACKEND_URL}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to create manual entry');
        fetchDocuments();
        setShowNewForm(false);
        setSuccessMsg('Manual entry added successfully!');
        return;
      }
"""
content = content.replace("    try {\n      if (inputMode === 'text' && !rawText.trim()) return;", "    try {\n" + submit_logic + "\n      if (inputMode === 'text' && !rawText.trim()) return;")

submit_btn = """<span>{inputMode === 'file' ? `Process ${selectedFiles.length || ''} File(s)` : inputMode === 'manual' ? 'Save Entry' : 'Parse with Gemini'}</span>"""
content = re.sub(r'<span>\{inputMode === \'file\'.*?</span>', submit_btn, content)

with open('frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("done basic updates")
