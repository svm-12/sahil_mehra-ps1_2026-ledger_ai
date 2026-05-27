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
  UploadCloud
} from 'lucide-react';

interface Document {
  id: number;
  raw_text: string;
  vendor_name: string | null;
  total_amount: number | null;
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
  const [rawText, setRawText] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  
  // Image Upload States
  const [inputMode, setInputMode] = useState<'text' | 'image'>('text');
  const [imageBase64, setImageBase64] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');
  
  // API Status & Sandbox States
  const [apiKeyConfigured, setApiKeyConfigured] = useState<boolean | null>(null);
  const [sandboxMode, setSandboxMode] = useState<boolean>(false);

  // Audit Form States
  const [vendorName, setVendorName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  const [confidenceRationale, setConfidenceRationale] = useState('');

  // Status/Alert States
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
    setTotalAmount(doc.total_amount !== null ? String(doc.total_amount) : '');
    setInvoiceDate(doc.invoice_date || '');
    setConfidenceScore(doc.confidence_score || 0);
    setConfidenceRationale(doc.confidence_rationale || '');
    setError(null);
    setSuccessMsg(null);
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
    const initialize = async () => {
      await fetchDocuments(true);
      await checkApiStatus();
    };
    initialize();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setImageBase64(base64String);
      setImagePreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMode === 'text' && !rawText.trim()) return;
    if (inputMode === 'image' && !imageBase64) return;

    try {
      setExtracting(true);
      setError(null);
      setSuccessMsg(null);
      
      const payload: any = { sandbox: sandboxMode };
      if (inputMode === 'text') payload.raw_text = rawText;
      if (inputMode === 'image') payload.image_base64 = imageBase64;

      const res = await fetch(`${BACKEND_URL}/documents/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Structured extraction failed.');
      }

      const newDoc = await res.json();
      
      setRawText('');
      setImageBase64('');
      setImagePreview('');
      setShowNewForm(false);
      
      await fetchDocuments(false);
      handleSelectDoc(newDoc);
      
      if (sandboxMode) {
        setSuccessMsg('Sandbox Mock successfully executed. Heuristic regex rules scanned structured data!');
      } else {
        setSuccessMsg('AI successfully extracted structured data with high-fidelity Gemini schema!');
      }
    } catch (err: any) {
      setError(err.message || 'AI structured extraction failed.');
    } finally {
      setExtracting(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedDoc) return;

    try {
      setError(null);
      setSuccessMsg(null);

      const payload = {
        vendor_name: vendorName.trim() || null,
        total_amount: totalAmount.trim() !== '' ? parseFloat(totalAmount) : null,
        invoice_date: invoiceDate.trim() || null,
        confidence_score: confidenceScore,
        confidence_rationale: confidenceRationale
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
      setSuccessMsg(`Document #${updatedDoc.id} audited, approved, and locked successfully!`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit approved document.');
    }
  };

  const totalCount = documents.length;
  const pendingCount = documents.filter(d => d.status === 'Pending Review').length;
  const auditedCount = documents.filter(d => d.status === 'Audited').length;

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-brand-success bg-brand-success/10 border-brand-success/30';
    if (score >= 70) return 'text-brand-warning bg-brand-warning/10 border-brand-warning/30';
    return 'text-brand-danger bg-brand-danger/10 border-brand-danger/30';
  };

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
              onClick={() => setShowNewForm(!showNewForm)}
              className="bg-brand-primary hover:bg-blue-600 active:scale-95 transition-all text-white font-medium text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-brand-primary/20 border border-brand-primary/40"
            >
              <Plus className="w-4 h-4" />
              <span>Extract New Text</span>
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
                    {sandboxMode ? 'Simulating Sandbox Parsing...' : 'Gemini AI Structured Parsing...'}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">
                    {sandboxMode 
                      ? 'Executing heuristic regex scanning to parse fields locally'
                      : 'Invoking response_schema to isolate structured invoice fields'
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

            {apiKeyConfigured === false && (
              <div className="bg-brand-warning/10 border border-brand-warning/30 text-brand-warning rounded-xl p-3.5 text-xs font-semibold mb-4 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  No Gemini API Key found in `backend/.env`. Sandbox Demo Mode has been **automatically activated**.
                </div>
              </div>
            )}
            
            <form onSubmit={handleExtract} className="flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-2 bg-dark-bg p-1 rounded-xl w-fit border border-dark-border">
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
                  onClick={() => setInputMode('image')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    inputMode === 'image' ? 'bg-dark-card text-brand-secondary shadow' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  Image Scan
                </button>
              </div>

              {inputMode === 'text' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                    Raw Invoice / Receipt Messy Text
                  </label>
                  <textarea
                    required
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Paste unstructured raw receipt or invoice text here..."
                    className="w-full h-40 bg-dark-bg border border-dark-border rounded-xl p-4 text-sm font-mono focus:outline-none focus:border-brand-primary transition-all resize-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                    Upload Receipt Image
                  </label>
                  <div className="relative border-2 border-dashed border-dark-border hover:border-brand-secondary/50 rounded-xl bg-dark-bg transition-all text-center overflow-hidden">
                    {imagePreview ? (
                      <div className="relative w-full h-48 flex items-center justify-center bg-black/40">
                        <img src={imagePreview} alt="Preview" className="max-h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => {
                            setImageBase64('');
                            setImagePreview('');
                          }}
                          className="absolute top-2 right-2 bg-dark-card/80 p-1.5 rounded text-gray-300 hover:text-white"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-40 cursor-pointer text-gray-400 hover:text-brand-secondary transition-all">
                        <UploadCloud className="w-8 h-8 mb-2" />
                        <span className="text-sm font-semibold">Click to browse or take a photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
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
                  <span>{sandboxMode ? 'Simulate Extraction' : 'Parse with Gemini'}</span>
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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

            <div className="divide-y divide-dark-border max-h-[600px] overflow-y-auto">
              {loading && documents.length === 0 ? (
                <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
                  <p className="text-xs">Loading database records...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  <p className="text-sm font-semibold">No documents found</p>
                  <p className="text-xs text-gray-600 mt-1">Paste raw text to begin AI extraction.</p>
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
                        <span className="font-bold text-sm text-gray-100">
                          {doc.total_amount !== null ? `$${doc.total_amount.toFixed(2)}` : '—'}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                <div className="bg-dark-card border border-dark-border rounded-2xl glass-panel p-5 flex flex-col relative overflow-hidden">
                  <div className="flex items-center justify-between pb-3 border-b border-dark-border mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-brand-primary" />
                      <span>Raw Messy Receipt Text</span>
                    </span>
                  </div>
                  <div className="flex-1 bg-dark-bg/60 border border-dark-border rounded-xl p-4 text-xs font-mono leading-relaxed overflow-auto max-h-[460px] text-gray-300 whitespace-pre-wrap">
                    {selectedDoc.raw_text}
                  </div>
                </div>

                <div className="bg-dark-card border border-dark-border rounded-2xl glass-panel p-5 flex flex-col justify-between relative">
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

                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
                          Vendor / Merchant Name
                        </label>
                        <input
                          type="text"
                          value={vendorName}
                          onChange={(e) => setVendorName(e.target.value)}
                          className="w-full bg-dark-bg/60 border border-dark-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-primary transition-all font-semibold"
                        />
                      </div>

                      <div>
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

                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
                          Total Amount ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={totalAmount}
                          onChange={(e) => setTotalAmount(e.target.value)}
                          className="w-full bg-dark-bg/60 border border-dark-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-primary transition-all font-mono font-bold text-gray-100"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-dark-border flex items-center justify-end gap-3">
                    {selectedDoc.status === 'Pending Review' ? (
                      <button
                        onClick={handleApprove}
                        className="w-full bg-brand-success hover:bg-emerald-600 active:scale-95 transition-all text-white font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-brand-success/30 shadow-lg shadow-brand-success/20"
                      >
                        <Save className="w-4 h-4" />
                        <span>Approve & Save</span>
                      </button>
                    ) : (
                      <div className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-semibold text-brand-success text-center">
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
      </main>

      <footer className="border-t border-dark-border py-6 px-6 mt-12 bg-dark-bg/80 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p>Invoice Auditor | Sahil Mehra</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
