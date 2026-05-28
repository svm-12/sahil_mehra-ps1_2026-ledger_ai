import re

with open('frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
imports = """import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
"""
content = content.replace("import { BarChart,", imports + "import { BarChart,")

# 2. Add lucide icons Search, Repeat, Target
content = content.replace("  ExternalLink\n}", "  ExternalLink,\n  Search,\n  Repeat,\n  Target\n}")

# 3. Add states
states = """
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [budgetGoals, setBudgetGoals] = useState<any[]>([]);
  const [budgetCategory, setBudgetCategory] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
"""
content = content.replace("  const [loadingInsights, setLoadingInsights] = useState(false);", "  const [loadingInsights, setLoadingInsights] = useState(false);\n" + states)

# 4. fetchDocuments
fetch_docs = """
  const fetchDocuments = async (autoSelectFirst = false, search = '') => {
    try {
      setLoading(true);
      setError(null);
      const url = search ? `${BACKEND_URL}/documents?search=${encodeURIComponent(search)}` : `${BACKEND_URL}/documents`;
      const res = await fetch(url);
"""
content = re.sub(
    r'  const fetchDocuments = async \(autoSelectFirst = false\) => \{\s*try \{\s*setLoading\(true\);\s*setError\(null\);\s*const res = await fetch\(`\$\{BACKEND_URL\}/documents`\);',
    fetch_docs.strip('\n'),
    content,
    flags=re.DOTALL
)

# 5. Debounce search effect and Budget fetch
effects = """
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    fetchDocuments(false, debouncedSearch);
  }, [debouncedSearch]);

  const fetchBudgets = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/budget_goals`);
      if (res.ok) {
        const data = await res.json();
        setBudgetGoals(data);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const handleSetBudget = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/budget_goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: budgetCategory, amount: parseFloat(budgetAmount) })
      });
      if (res.ok) {
        setBudgetCategory('');
        setBudgetAmount('');
        fetchBudgets();
      }
    } catch (err) {}
  };
"""
content = content.replace("  useEffect(() => {\n    fetchDocuments(true);\n  }, []);", effects + "\n  useEffect(() => {\n    fetchDocuments(true);\n  }, []);")

# 6. Export PDF
export_pdf = """
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Invoice Auditor Report', 14, 22);
    
    const tableData = documents.map(d => [
      d.id,
      d.vendor_name || 'Unknown',
      d.category || 'N/A',
      d.total_amount || 0,
      d.status || 'Pending Review',
      d.is_subscription ? 'Yes' : 'No'
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['ID', 'Vendor', 'Category', 'Amount', 'Status', 'Subscription']],
      body: tableData,
    });
    
    doc.save('invoice_report.pdf');
  };
"""
content = content.replace("  const handleExportCSV = () => {", export_pdf + "\n  const handleExportCSV = () => {")
content = content.replace('onClick={handleExportCSV}', 'onClick={handleExportPDF}')
content = content.replace('Export CSV', 'Export PDF')

# 7. Search Bar UI
search_ui = """
                <div className="relative w-full max-w-sm mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search invoices (vendor, category, etc...)"
                    className="w-full bg-dark-bg border border-dark-border text-gray-100 rounded-lg pl-10 pr-4 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
"""
content = content.replace('<div className="flex-1 overflow-y-auto">', '<div className="flex-1 overflow-y-auto">\n' + search_ui)

# 8. Subscription badge
sub_badge = """
                      {doc.is_subscription ? (
                        <div className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 mt-2">
                          <Repeat className="w-3 h-3" /> Subscription
                        </div>
                      ) : null}
"""
content = content.replace('</div>\n                      {doc.status', sub_badge + '</div>\n                      {doc.status')

# 9. Budget UI
budget_ui = """
              {/* Budget Goals Section */}
              <div className="bg-dark-card border border-dark-border rounded-xl p-6 mt-8">
                <div className="flex items-center gap-3 mb-6">
                  <Target className="w-5 h-5 text-brand-primary" />
                  <h2 className="text-lg font-bold">Budget Goals</h2>
                </div>
                
                <div className="flex gap-4 mb-8">
                  <input
                    type="text"
                    placeholder="Category (e.g. Groceries)"
                    value={budgetCategory}
                    onChange={(e) => setBudgetCategory(e.target.value)}
                    className="flex-1 bg-dark-bg border border-dark-border text-gray-100 rounded-lg px-4 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                  />
                  <input
                    type="number"
                    placeholder="Amount limit"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    className="w-32 bg-dark-bg border border-dark-border text-gray-100 rounded-lg px-4 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                  />
                  <button
                    onClick={handleSetBudget}
                    className="bg-brand-primary hover:bg-brand-primary/90 text-brand-secondary font-bold text-sm px-6 py-2 rounded-lg transition-colors"
                  >
                    Set Goal
                  </button>
                </div>

                <div className="space-y-4">
                  {budgetGoals.map((goal, idx) => {
                    const spend = documents.filter(d => d.category?.toLowerCase() === goal.category.toLowerCase()).reduce((sum, d) => sum + (d.total_amount || 0), 0);
                    const percentage = Math.min((spend / goal.amount) * 100, 100);
                    const isOver = spend > goal.amount;
                    return (
                      <div key={idx} className="bg-dark-bg p-4 rounded-xl border border-dark-border">
                        <div className="flex justify-between items-end mb-2">
                          <div>
                            <div className="font-bold text-gray-100">{goal.category}</div>
                            <div className="text-xs text-gray-400 mt-1">{isOver ? 'Over budget!' : `${(100 - percentage).toFixed(1)}% remaining`}</div>
                          </div>
                          <div className="text-right">
                            <span className={`font-bold ${isOver ? 'text-brand-danger' : 'text-gray-100'}`}>₹{spend.toFixed(2)}</span>
                            <span className="text-gray-500 text-sm"> / ₹{goal.amount.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${isOver ? 'bg-brand-danger' : percentage > 80 ? 'bg-brand-warning' : 'bg-brand-primary'} transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {budgetGoals.length === 0 && (
                    <div className="text-center text-gray-500 text-sm py-4">No budget goals set yet.</div>
                  )}
                </div>
              </div>
"""
content = content.replace("              {/* Insights Display */}", budget_ui + "\n              {/* Insights Display */}")

with open('frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated App.tsx")
