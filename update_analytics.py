import re

with open('frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add states and handlers
states = """
  const [insights, setInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const fetchInsights = async () => {
    setLoadingInsights(true);
    try {
      const items = documents.flatMap(d => d.line_items || []).filter(i => i.description && i.total_price);
      if (items.length === 0) throw new Error('No items to analyze');
      const res = await fetch(`${BACKEND_URL}/analytics/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      if (!res.ok) throw new Error('Failed to fetch insights');
      const data = await res.json();
      setInsights(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch insights');
    } finally {
      setLoadingInsights(false);
    }
  };

  const categoryData = React.useMemo(() => {
    const acc: Record<string, number> = {};
    documents.forEach(doc => {
      const cat = doc.category || 'Uncategorized';
      if (doc.total_amount) {
        acc[cat] = (acc[cat] || 0) + doc.total_amount;
      }
    });
    return Object.entries(acc).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [documents]);
  const PIE_COLORS = ['#4facfe', '#00f2fe', '#a855f7', '#ec4899', '#f59e0b', '#10b981'];

"""
content = content.replace("  const [extractProgress, setExtractProgress] = useState({ current: 0, total: 0 });", "  const [extractProgress, setExtractProgress] = useState({ current: 0, total: 0 });\n" + states)

# 2. Update Analytics section
analytics_ui = """
          <section className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-dark-card border border-dark-border rounded-2xl glass-panel p-6">
                <div className="flex items-center gap-2 mb-6 border-b border-dark-border pb-4">
                  <BarChart3 className="w-5 h-5 text-brand-primary" />
                  <h2 className="text-lg font-bold">Spend by Vendor</h2>
                </div>
                <div className="h-80 w-full">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="name" stroke="#888" tick={{fill: '#888'}} />
                        <YAxis stroke="#888" tick={{fill: '#888'}} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#1e1e24', borderColor: '#333', borderRadius: '12px' }} itemStyle={{ color: '#00f2fe' }} />
                        <Bar dataKey="total" fill="#4facfe" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">Not enough data.</div>
                  )}
                </div>
              </div>

              <div className="bg-dark-card border border-dark-border rounded-2xl glass-panel p-6">
                <div className="flex items-center gap-2 mb-6 border-b border-dark-border pb-4">
                  <PieChart className="w-5 h-5 text-brand-secondary" />
                  <h2 className="text-lg font-bold">Spend by Category</h2>
                </div>
                <div className="h-80 w-full">
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ backgroundColor: '#1e1e24', borderColor: '#333', borderRadius: '12px' }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">Not enough data.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-dark-card border border-brand-primary/30 rounded-2xl glass-panel p-6">
              <div className="flex items-center justify-between mb-6 border-b border-dark-border pb-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-brand-primary animate-pulse" />
                  <h2 className="text-lg font-bold">AI Cost Savings Analyst</h2>
                </div>
                <button
                  onClick={fetchInsights}
                  disabled={loadingInsights}
                  className="bg-brand-primary/20 hover:bg-brand-primary/30 text-brand-primary font-bold text-sm px-4 py-2 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {loadingInsights ? <Sparkles className="w-4 h-4 animate-spin-slow" /> : <Lightbulb className="w-4 h-4" />}
                  {loadingInsights ? 'Analyzing Web...' : 'Analyze Spending'}
                </button>
              </div>

              {insights ? (
                <div className="space-y-6">
                  <p className="text-gray-300 italic">"{insights.summary}"</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {insights.insights?.map((insight: any, i: number) => (
                      <div key={i} className="bg-dark-bg border border-dark-border rounded-xl p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-gray-100">{insight.original_item}</h3>
                          <span className="text-brand-danger font-semibold text-sm">₹{insight.original_price}</span>
                        </div>
                        <p className="text-sm text-brand-secondary mb-4">{insight.advice}</p>
                        
                        {insight.alternatives?.length > 0 && (
                          <div className="space-y-2 border-t border-dark-border pt-3">
                            <span className="text-xs font-bold text-gray-400 uppercase">Cheaper Alternatives Found:</span>
                            {insight.alternatives.map((alt: any, j: number) => (
                              <div key={j} className="flex justify-between items-center text-sm bg-dark-card/50 p-2 rounded-lg border border-dark-border/50">
                                <span className="font-medium text-gray-300">{alt.store_name}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-brand-success font-bold text-sm">₹{alt.price}</span>
                                  {alt.link && (
                                    <a href={alt.link} target="_blank" rel="noreferrer" className="text-brand-primary hover:text-blue-400 transition-colors p-1" title="View Deal">
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  <Brain className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Click Analyze Spending to trigger a real-time web search for cheaper alternatives to your purchased items.</p>
                </div>
              )}
            </div>
          </section>
"""
content = re.sub(
    r'<section className="bg-dark-card border border-dark-border rounded-2xl glass-panel p-6 animate-fadeIn">.*?</section>',
    analytics_ui,
    content,
    flags=re.DOTALL
)

with open('frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("done analytics updates")
