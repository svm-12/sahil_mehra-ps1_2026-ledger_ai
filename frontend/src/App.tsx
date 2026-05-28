import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Plus, 
  Save, 
  RefreshCw, 
  Database, 
  FileCode,
  Layers,
  Sparkles,
  FileCheck2,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  Camera,
  UploadCloud,
  Download,
  BarChart3,
  Table as TableIcon,
  Trash2,
  Brain,
  Lightbulb,
  ExternalLink
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface LineItem {
  description: string;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
}

interface Document {
  id: number;
  raw_text: string;
  vendor_name: string | null;
  category: string | null;
  total_amount: number | null;
  subtotal_amount: number | null;
  tax_amount: number | null;
  tip_amount: number | null;
  misc_fees: number | null;
  discount_amount: number | null;
  extracted_total_amount: number | null;
  has_math_mismatch: number | null;
  line_items: LineItem[];
  invoice_date: string | null;
  confidence_score: number | null;
  confidence_rationale: string | null;
  status: string;
  created_at?: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState({ current: 0, total: 0 });

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


  
  const [showNewForm, setShowNewForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'analytics'>('feed');
  
  const [inputMode, setInputMode] = useState<'text' | 'file' | 'manual'>('file');
  const [rawText, setRawText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const [apiKeyConfigured, setApiKeyConfigured] = useState<boolean | null>(null);
  const [sandboxMode, setSandboxMode] = useState<boolean>(false);

  // Form States
  const [vendorName, setVendorName] = useState('');
  const [category, setCategory] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [subtotalAmount, setSubtotalAmount] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [tipAmount, setTipAmount] = useState('');
  const [miscFees, setMiscFees] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  const [confidenceRationale, setConfidenceRationale] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSelectDoc = (doc: Document) => {
    setSelectedDoc(doc);
    setVendorName(doc.vendor_name || '');
    setCategory(doc.category || '');
    setTotalAmount(doc.total_amount !== null ? String(doc.total_amount) : '');
    setSubtotalAmount(doc.subtotal_amount !== null ? String(doc.subtotal_amount) : '');
    setTaxAmount(doc.tax_amount !== null ? String(doc.tax_amount) : '');
    setTipAmount(doc.tip_amount !== null ? String(doc.tip_amount) : '');
    setMiscFees(doc.misc_fees !== null ? String(doc.misc_fees) : '');
    setDiscountAmount(doc.discount_amount !== null ? String(doc.discount_amount) : '');
    setInvoiceDate(doc.invoice_date || '');
    setConfidenceScore(doc.confidence_score || 0);
    setConfidenceRationale(doc.confidence_rationale || '');
    setLineItems(doc.line_items || []);
    setError(null);
    setSuccessMsg(null);
  };

  const handleDeleteLineItem = (indexToDelete: number) => {
    setLineItems(prev => prev.filter((_, idx) => idx !== indexToDelete));
  };

  const fetchDocuments = async (autoSelectFirst = false) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${BACKEND_URL}/documents`);
      if (!res.ok) throw new Error('Failed to load documents from backend.');
      const data = await res.json();
      setDocuments(data);
      
      if (data.length > 0) {
        if (autoSelectFirst) {
          handleSelectDoc(data[0]);
        } else if (selectedDoc) {
          const updated = data.find((d: Document) => d.id === selectedDoc.id);
          if (updated) handleSelectDoc(updated);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Connecting to backend failed.');
    } finally {
      setLoading(false);
    }
  };

  const checkApiStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/status`);
      if (res.ok) {
        const data = await res.json();
        setApiKeyConfigured(data.gemini_api_key_configured);
        if (!data.gemini_api_key_configured) {
          setSandboxMode(true);
        }
      }
    } catch (err) {
      console.warn('Failed to resolve backend API key status', err);
    }
  };

  useEffect(() => {
    fetchDocuments(true);
    checkApiStatus();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMode === 'text' && !rawText.trim()) return;
    if (inputMode === 'file' && selectedFiles.length === 0) return;

    try {
      setExtracting(true);
      setError(null);
      setSuccessMsg(null);

      if (inputMode === 'text') {
        const payload = { sandbox: sandboxMode, raw_text: rawText };
        const res = await fetch(`${BACKEND_URL}/documents/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Structured extraction failed.');
        const newDoc = await res.json();
        await fetchDocuments(false);
        handleSelectDoc(newDoc);
        setSuccessMsg('AI successfully extracted structured data!');
      } else {
        // Bulk Upload processing
        setExtractProgress({ current: 0, total: selectedFiles.length });
        let latestDoc = null;
        for (let i = 0; i < selectedFiles.length; i++) {
          setExtractProgress({ current: i + 1, total: selectedFiles.length });
          const file = selectedFiles[i];
          const base64 = await fileToBase64(file);
          
          const payload = { 
            sandbox: sandboxMode, 
            image_base64: base64,
            mime_type: file.type || "application/octet-stream"
          };
          
          const res = await fetch(`${BACKEND_URL}/documents/extract`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          if (res.ok) {
            latestDoc = await res.json();
          } else {
            const errData = await res.json().catch(() => ({}));
            const errMsg = errData.detail || `Server returned ${res.status}`;
            throw new Error(`Failed to extract ${file.name}: ${errMsg}`);
          }
        }
        await fetchDocuments(false);
        if (latestDoc) handleSelectDoc(latestDoc);
        setSuccessMsg(`Successfully processed ${selectedFiles.length} file(s)!`);
      }

      setRawText('');
      setSelectedFiles([]);
      setShowNewForm(false);
    } catch (err: any) {
      setError(err.message || 'AI structured extraction failed.');
    } finally {
      setExtracting(false);
      setExtractProgress({ current: 0, total: 0 });
    }
  };

  const handleApprove = async () => {
    if (!selectedDoc) return;

    try {
      setError(null);
      setSuccessMsg(null);

      const payload = {
        vendor_name: vendorName.trim() || null,
        category: category.trim() || null,
        total_amount: totalAmount.trim() !== '' ? parseFloat(totalAmount) : null,
        subtotal_amount: subtotalAmount.trim() !== '' ? parseFloat(subtotalAmount) : null,
        tax_amount: taxAmount.trim() !== '' ? parseFloat(taxAmount) : null,
        tip_amount: tipAmount.trim() !== '' ? parseFloat(tipAmount) : null,
        misc_fees: miscFees.trim() !== '' ? parseFloat(miscFees) : null,
        discount_amount: discountAmount.trim() !== '' ? parseFloat(discountAmount) : null,
        invoice_date: invoiceDate.trim() || null,
        confidence_score: confidenceScore,
        confidence_rationale: confidenceRationale,
        line_items: lineItems
      };

      const res = await fetch(`${BACKEND_URL}/documents/${selectedDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to update and approve document.');

      const updatedDoc = await res.json();
      setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
      setSelectedDoc(updatedDoc);
      setSuccessMsg(`Document #${updatedDoc.id} audited and approved successfully!`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit approved document.');
    }
  };

  const handleDeleteDocument = async () => {
    if (!selectedDoc) return;
    try {
      setError(null);
      const res = await fetch(`${BACKEND_URL}/documents/${selectedDoc.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete document.');
      setDocuments(prev => prev.filter(d => d.id !== selectedDoc.id));
      setSelectedDoc(null);
      setSuccessMsg(`Document deleted successfully!`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete document.');
    }
  };


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

    const headers = ['ID', 'Vendor Name', 'Date', 'Subtotal', 'Tax', 'Tip', 'Total', 'Status', 'Confidence', 'Rationale'];
    const rows = documents.map(d => [
      d.id,
      `"${d.vendor_name || ''}"`,
      d.invoice_date || '',
      d.subtotal_amount || '',
      d.tax_amount || '',
      d.tip_amount || '',
      d.total_amount || '',
      d.status,
      d.confidence_score || '',
      `"${d.confidence_rationale || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `invoice_audit_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-brand-success bg-brand-success/10 border-brand-success/30';
    if (score >= 70) return 'text-brand-warning bg-brand-warning/10 border-brand-warning/30';
    return 'text-brand-danger bg-brand-danger/10 border-brand-danger/30';
  };

  // Analytics Data Prep
  const totalCount = documents.length;
  const pendingCount = documents.filter(d => d.status === 'Pending Review').length;
  const auditedCount = documents.filter(d => d.status === 'Audited').length;

  const vendorSpend = documents.reduce((acc, doc) => {
    if (doc.vendor_name && doc.total_amount) {
      acc[doc.vendor_name] = (acc[doc.vendor_name] || 0) + doc.total_amount;
    }
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.keys(vendorSpend)
    .map(key => ({ name: key, total: vendorSpend[key] }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 flex flex-col antialiased">
      <header className="border-b border-dark-border glass-panel sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-brand-primary/10 p-2.5 rounded-xl border border-brand-primary/30 text-brand-primary">
              <Layers className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide flex items-center gap-2">
                <span>Invoice Auditor</span>
                <span className="text-xs bg-brand-primary/20 text-brand-primary font-medium px-2 py-0.5 rounded-full uppercase tracking-widest border border-brand-primary/30">
                  GenAI Workflow
                </span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-gray-400">Structured Data Extraction & Human Audit Trail</p>
                <span>•</span>
                {apiKeyConfigured === true ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-brand-success font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-success animate-ping" />
                    Gemini Live
                  </span>
                ) : apiKeyConfigured === false ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-brand-warning font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-warning animate-pulse" />
                    Sandbox Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                    Status Unknown
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="bg-dark-card hover:bg-dark-hover active:scale-95 transition-all text-gray-300 font-medium text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 border border-dark-border"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">Export CSV</span>
            </button>
            <button
              onClick={() => setShowNewForm(!showNewForm)}
              className="bg-brand-primary hover:bg-blue-600 active:scale-95 transition-all text-white font-medium text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-brand-primary/20 border border-brand-primary/40"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
            <button
              onClick={async () => {
                await fetchDocuments(false);
                await checkApiStatus();
              }}
              className="bg-dark-card hover:bg-dark-hover p-2.5 rounded-xl border border-dark-border text-gray-400 hover:text-gray-100 active:rotate-90 transition-all duration-300"
              title="Refresh database"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
        {error && (
          <div className="bg-brand-danger/10 border border-brand-danger/30 text-brand-danger rounded-xl p-4 flex items-start gap-3 animate-fadeIn">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm font-medium">{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="bg-brand-success/10 border border-brand-success/30 text-brand-success rounded-xl p-4 flex items-start gap-3 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm font-medium">{successMsg}</div>
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl p-5 flex items-center justify-between glass-panel">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Total Invoices</p>
              <h3 className="text-2xl font-bold">{loading ? '...' : totalCount}</h3>
            </div>
            <div className="bg-gray-700/20 p-3 rounded-xl border border-gray-700/40 text-gray-300">
              <Database className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-dark-card border border-dark-border rounded-2xl p-5 flex items-center justify-between glass-panel">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Pending Review</p>
              <h3 className="text-2xl font-bold text-brand-warning">{loading ? '...' : pendingCount}</h3>
            </div>
            <div className="bg-brand-warning/10 p-3 rounded-xl border border-brand-warning/30 text-brand-warning">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-dark-card border border-dark-border rounded-2xl p-5 flex items-center justify-between glass-panel">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Audited & Verified</p>
              <h3 className="text-2xl font-bold text-brand-success">{loading ? '...' : auditedCount}</h3>
            </div>
            <div className="bg-brand-success/10 p-3 rounded-xl border border-brand-success/30 text-brand-success">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
        </section>

        {showNewForm && (
          <section className="bg-dark-card border border-dark-border rounded-2xl p-6 glass-panel animate-fadeIn shadow-2xl relative overflow-hidden">
            {extracting && (
              <div className="absolute inset-0 bg-dark-bg/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-4">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin"></div>
                  <Sparkles className="w-6 h-6 text-brand-secondary absolute inset-0 m-auto animate-pulse" />
                </div>
                <div className="text-center">
                  <h4 className="text-md font-bold tracking-wide text-brand-primary animate-pulse-subtle">
                    {sandboxMode ? 'Simulating Sandbox Parsing...' : `Extracting ${extractProgress.current} of ${extractProgress.total}...`}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">
                    {sandboxMode 
                      ? 'Executing heuristic regex scanning'
                      : 'Invoking Gemini 2.5 Flash Multimodal Extraction'
                    }
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3 border-b border-dark-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-secondary animate-pulse" />
                <h2 className="text-md font-bold">Extract Structured Fields</h2>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold">
                  <span title="Sandbox mode parses the document text locally without calling Gemini.">
                    <HelpCircle className="w-3.5 h-3.5 cursor-help" />
                  </span>
                  <span>Sandbox Demo Mode:</span>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    if (apiKeyConfigured === false) {
                      setError("Cannot disable Sandbox mode. No Gemini API Key is configured.");
                      return;
                    }
                    setSandboxMode(!sandboxMode);
                    setError(null);
                  }}
                  className="text-brand-primary hover:text-blue-400 focus:outline-none transition-all"
                >
                  {sandboxMode ? (
                    <div className="flex items-center gap-1.5 text-xs text-brand-warning font-bold">
                      <span>ON (Simulated)</span>
                      <ToggleRight className="w-8 h-8 text-brand-warning" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <span>OFF (Live Gemini)</span>
                      <ToggleLeft className="w-8 h-8 text-gray-500" />
                    </div>
                  )}
                </button>
              </div>
            </div>
            
            <form onSubmit={handleExtract} className="flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-2 bg-dark-bg p-1 rounded-xl w-fit border border-dark-border">
                <button
                  type="button"
                  onClick={() => setInputMode('file')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    inputMode === 'file' ? 'bg-dark-card text-brand-secondary shadow' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  File Upload (Image/PDF)
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('text')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    inputMode === 'text' ? 'bg-dark-card text-brand-primary shadow' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Text Paste
                </button>
              
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


              {inputMode === 'text' ? (
                <div>
                  <textarea
                    required
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Paste unstructured raw receipt or invoice text here..."
                    className="w-full h-40 bg-dark-bg border border-dark-border rounded-xl p-4 text-sm font-mono focus:outline-none focus:border-brand-primary transition-all resize-none"
                  />
                </div>
              
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
                <div>
                  <label className="flex flex-col items-center justify-center h-40 cursor-pointer text-gray-400 hover:text-brand-secondary transition-all border-2 border-dashed border-dark-border rounded-xl bg-dark-bg">
                    <UploadCloud className="w-8 h-8 mb-2" />
                    <span className="text-sm font-semibold">Select files (Images or PDFs)</span>
                    <span className="text-xs opacity-70 mt-1">{selectedFiles.length} file(s) selected</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="bg-transparent hover:bg-gray-800 text-gray-400 hover:text-gray-200 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-brand-primary to-brand-secondary text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow-lg border border-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 animate-spin-slow" />
                  <span>{inputMode === 'file' ? `Process ${selectedFiles.length || ''} File(s)` : inputMode === 'manual' ? 'Save Entry' : 'Parse with Gemini'}</span>
                </button>
              </div>
            </form>
          </section>
        )}

        <div className="flex border-b border-dark-border gap-6">
          <button 
            className={`pb-3 font-semibold text-sm transition-all flex items-center gap-2 ${activeTab === 'feed' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-gray-500 hover:text-gray-300'}`}
            onClick={() => setActiveTab('feed')}
          >
            <TableIcon className="w-4 h-4" />
            Audit Feed
          </button>
          <button 
            className={`pb-3 font-semibold text-sm transition-all flex items-center gap-2 ${activeTab === 'analytics' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-gray-500 hover:text-gray-300'}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics Dashboard
          </button>
        </div>

        {activeTab === 'analytics' ? (
          
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

        ) : (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
            <div className="lg:col-span-4 bg-dark-card border border-dark-border rounded-2xl glass-panel overflow-hidden">
              <div className="px-5 py-4 border-b border-dark-border flex items-center justify-between bg-dark-card/50">
                <span className="text-sm font-bold tracking-wider uppercase text-gray-300 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-brand-primary" />
                  <span>Invoices Feed</span>
                </span>
                <span className="text-xs bg-dark-border px-2 py-0.5 rounded text-gray-400 font-semibold">
                  {documents.length} Records
                </span>
              </div>

              <div className="divide-y divide-dark-border max-h-[700px] overflow-y-auto custom-scrollbar">
                {loading && documents.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
                    <p className="text-xs">Loading database records...</p>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="p-10 text-center text-gray-500">
                    <p className="text-sm font-semibold">No documents found</p>
                    <p className="text-xs text-gray-600 mt-1">Upload files to begin extraction.</p>
                  </div>
                ) : (
                  documents.map((doc) => {
                    const isSelected = selectedDoc?.id === doc.id;
                    const isPending = doc.status === 'Pending Review';
                    return (
                      <button
                        key={doc.id}
                        onClick={() => handleSelectDoc(doc)}
                        className={`w-full text-left p-4 transition-all duration-200 flex items-center justify-between border-l-4 ${
                          isSelected 
                            ? 'bg-dark-hover/70 border-brand-primary' 
                            : 'hover:bg-dark-hover/40 border-transparent'
                        }`}
                      >
                        <div className="flex flex-col gap-1 pr-3 truncate">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-200">
                              {doc.vendor_name || 'Unidentified Vendor'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>INV-{String(doc.id).padStart(4, '0')}</span>
                            <span>•</span>
                            <span>{doc.invoice_date || 'No Date'}</span>
                          </div>
                        </div>

                        
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <button
                              onClick={(e) => handleDeleteFeedItem(doc.id, e)}
                              className="text-gray-500 hover:text-brand-danger transition-colors p-1 rounded-md hover:bg-brand-danger/10"
                              title="Delete Invoice"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                          <span className="font-bold text-sm text-gray-100">
                            {doc.total_amount !== null ? `₹${doc.total_amount.toFixed(2)}` : '—'}
                          </span>
                          
                          <span className={`text-[10px] px-2 py-0.5 font-bold rounded-full border flex items-center gap-1 ${
                            isPending 
                              ? 'text-brand-warning bg-brand-warning/10 border-brand-warning/20' 
                              : 'text-brand-success bg-brand-success/10 border-brand-success/20'
                          }`}>
                            {doc.status}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="lg:col-span-8">
              {selectedDoc ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
                  <div className="bg-dark-card border border-dark-border rounded-2xl glass-panel p-5 flex flex-col relative overflow-hidden">
                    <div className="flex items-center justify-between pb-3 border-b border-dark-border mb-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-brand-primary" />
                        <span>Source Content</span>
                      </span>
                    </div>
                    <div className="flex-1 bg-dark-bg/60 border border-dark-border rounded-xl p-4 text-xs font-mono leading-relaxed overflow-auto max-h-[700px] text-gray-300 whitespace-pre-wrap">
                      {selectedDoc.raw_text}
                    </div>
                  </div>

                  <div className="bg-dark-card border border-dark-border rounded-2xl glass-panel p-5 flex flex-col justify-between relative max-h-[800px] overflow-auto custom-scrollbar">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-dark-border mb-5">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-success" />
                          <span>Structured Audit Form</span>
                        </span>
                        <div className={`text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${getConfidenceColor(confidenceScore)}`}>
                          <Sparkles className="w-3 h-3" />
                          <span>AI: {confidenceScore}%</span>
                        </div>
                      </div>
                      
                      {selectedDoc.has_math_mismatch === 1 && (
                        <div className="mb-4 bg-brand-warning/10 border border-brand-warning/30 text-brand-warning rounded-xl p-3 flex items-start gap-3 animate-pulse-subtle">
                          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                          <div className="text-sm font-medium">
                            <strong>Math Mismatch Detected:</strong> The AI originally extracted a total of <strong>₹{(selectedDoc.extracted_total_amount || 0).toFixed(2)}</strong>, but the mathematically calculated sum of the line items + fees is <strong>₹{(selectedDoc.total_amount || 0).toFixed(2)}</strong>. The values below reflect the corrected math.
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                          
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

                          <div className="col-span-2">
                            <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
                              Invoice Date
                            </label>
                            <input
                              type="text"
                              value={invoiceDate}
                              onChange={(e) => setInvoiceDate(e.target.value)}
                              placeholder="YYYY-MM-DD"
                              className="w-full bg-dark-bg/60 border border-dark-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-primary transition-all"
                            />
                          </div>
                        </div>

                        <div className="mt-2">
                          <label className="block text-[11px] font-bold text-brand-primary mb-1.5 uppercase tracking-wide flex justify-between">
                            <span>Line Items</span>
                            <span className="text-gray-500">{(lineItems || []).length} items</span>
                          </label>
                          <div className="bg-dark-bg/40 border border-dark-border rounded-xl overflow-hidden text-xs">
                            <table className="w-full text-left">
                              <thead className="bg-dark-bg text-gray-400">
                                <tr>
                                  <th className="px-3 py-2 font-semibold">Desc</th>
                                  <th className="px-3 py-2 font-semibold w-16 text-right">Qty</th>
                                  <th className="px-3 py-2 font-semibold w-20 text-right">Unit</th>
                                  <th className="px-3 py-2 font-semibold w-20 text-right">Total</th>
                                  <th className="px-3 py-2 font-semibold w-10 text-center"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-dark-border/50">
                                {(lineItems || []).map((item, idx) => (
                                  <tr key={idx} className="hover:bg-dark-hover/30">
                                    <td className="px-3 py-2 truncate max-w-[120px]">{item.description}</td>
                                    <td className="px-3 py-2 text-right">{item.quantity || '-'}</td>
                                    <td className="px-3 py-2 text-right">₹{item.unit_price?.toFixed(2) || '-'}</td>
                                    <td className="px-3 py-2 text-right font-semibold">₹{item.total_price?.toFixed(2) || '-'}</td>
                                    <td className="px-3 py-2 text-center">
                                      <button 
                                        type="button" 
                                        onClick={() => handleDeleteLineItem(idx)}
                                        className="text-gray-500 hover:text-brand-danger transition-colors p-1"
                                        title="Delete Item"
                                      >
                                        ×
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {(!lineItems || lineItems.length === 0) && (
                                  <tr>
                                    <td colSpan={5} className="px-3 py-4 text-center text-gray-500">No line items extracted.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-2 p-4 bg-dark-bg/40 border border-dark-border rounded-xl">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
                              Subtotal (₹)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={subtotalAmount}
                              onChange={(e) => setSubtotalAmount(e.target.value)}
                              className="w-full bg-dark-bg/80 border border-dark-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
                              Tax (₹)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={taxAmount}
                              onChange={(e) => setTaxAmount(e.target.value)}
                              className="w-full bg-dark-bg/80 border border-dark-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
                              Tip (₹)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={tipAmount}
                              onChange={(e) => setTipAmount(e.target.value)}
                              className="w-full bg-dark-bg/80 border border-dark-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
                              Misc Fees (₹)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={miscFees}
                              onChange={(e) => setMiscFees(e.target.value)}
                              className="w-full bg-dark-bg/80 border border-dark-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-brand-warning mb-1.5 uppercase tracking-wide">
                              Discount (₹)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={discountAmount}
                              onChange={(e) => setDiscountAmount(e.target.value)}
                              className="w-full bg-dark-bg/80 border border-brand-warning/30 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-warning text-brand-warning font-semibold"
                            />
                          </div>
                          <div className="col-span-2 mt-2 pt-4 border-t border-dark-border">
                            <label className="block text-[11px] font-bold text-brand-secondary mb-1.5 uppercase tracking-wide">
                              Grand Total (₹)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={totalAmount}
                              onChange={(e) => setTotalAmount(e.target.value)}
                              className="w-full bg-dark-card border border-brand-secondary/40 text-brand-secondary font-bold rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-secondary"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-5 mt-5 border-t border-dark-border flex items-center justify-end gap-3 shrink-0">
                      <button
                        onClick={handleDeleteDocument}
                        className="bg-transparent hover:bg-brand-danger/10 text-gray-500 hover:text-brand-danger transition-colors font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-transparent hover:border-brand-danger/30"
                      >
                        Delete Invoice
                      </button>
                      {selectedDoc.status === 'Pending Review' ? (
                        <button
                          onClick={handleApprove}
                          className="flex-1 bg-brand-success hover:bg-emerald-600 active:scale-95 transition-all text-white font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-brand-success/30 shadow-lg shadow-brand-success/20"
                        >
                          <Save className="w-4 h-4" />
                          <span>Approve & Save</span>
                        </button>
                      ) : (
                        <div className="flex-1 bg-dark-bg border border-dark-border rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-semibold text-brand-success text-center">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>Human Audited & Locked</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-dark-card border border-dark-border rounded-2xl glass-panel p-16 text-center text-gray-500">
                  <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-300">No Document Selected</h3>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-dark-border py-6 px-6 mt-auto bg-dark-bg/80 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p>Invoice Auditor | Enterprise Edition</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
