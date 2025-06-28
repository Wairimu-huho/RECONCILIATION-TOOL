import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, XCircle, RotateCcw, Download, Loader2, Eye, EyeOff, ChevronDown, ChevronRight, Database } from 'lucide-react';
import * as Papa from 'papaparse';

const ReconciliationTool = () => {
  const [internalData, setInternalData] = useState(null);
  const [providerData, setProviderData] = useState(null);
  const [internalFileName, setInternalFileName] = useState('');
  const [providerFileName, setProviderFileName] = useState('');
  const [results, setResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [visibleColumns, setVisibleColumns] = useState({});
  const [expandedRows, setExpandedRows] = useState(new Set());

 
  const sampleProviderData = [
    { transaction_reference: 'TXN001', amount: 150.00, status: 'completed', date: '2024-01-15', customer: 'John Doe', description: 'Payment for services' },
    { transaction_reference: 'TXN002', amount: 75.49, status: 'pending', date: '2024-01-16', customer: 'Jane Smith', description: 'Subscription payment' },
    { transaction_reference: 'TXN003', amount: 200.00, status: 'completed', date: '2024-01-17', customer: 'Bob Johnson', description: 'Product purchase' },
    { transaction_reference: 'TXN006', amount: 125.00, status: 'completed', date: '2024-01-20', customer: 'David Lee', description: 'Monthly subscription' },
    { transaction_reference: 'TXN007', amount: 89.99, status: 'completed', date: '2024-01-21', customer: 'Emma Davis', description: 'Software license' }
  ];

  const loadSampleData = (type) => {
    const sampleData = type === 'internal' ? sampleInternalData : sampleProviderData;
    const fileName = type === 'internal' ? 'sample_internal.csv' : 'sample_provider.csv';
    
    if (type === 'internal') {
      setInternalData(sampleData);
      setInternalFileName(fileName);
    } else {
      setProviderData(sampleData);
      setProviderFileName(fileName);
    }
    setError('');
  };

  const toggleColumn = (column) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const toggleRowExpansion = (rowIndex) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  };

   // Sample data for demo
   const sampleInternalData = [
    { transaction_reference: 'TXN001', amount: 150.00, status: 'completed', date: '2024-01-15', customer: 'John Doe', description: 'Payment for services' },
    { transaction_reference: 'TXN002', amount: 75.50, status: 'pending', date: '2024-01-16', customer: 'Jane Smith', description: 'Subscription payment' },
    { transaction_reference: 'TXN003', amount: 200.00, status: 'completed', date: '2024-01-17', customer: 'Bob Johnson', description: 'Product purchase' },
    { transaction_reference: 'TXN004', amount: 45.25, status: 'failed', date: '2024-01-18', customer: 'Alice Brown', description: 'Service fee' },
    { transaction_reference: 'TXN005', amount: 300.00, status: 'completed', date: '2024-01-19', customer: 'Charlie Wilson', description: 'Consultation fee' }
  ];

  const handleFileUpload = useCallback((file, type) => {
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`Error parsing ${type} file: ${results.errors[0].message}`);
          return;
        }

        if (type === 'internal') {
          setInternalData(results.data);
          setInternalFileName(file.name);
        } else {
          setProviderData(results.data);
          setProviderFileName(file.name);
        }
        setError('');
      },
      error: (error) => {
        setError(`Error parsing ${type} file: ${error.message}`);
      }
    });
  }, []);

  const compareAmounts = (internal, provider) => {
    if (internal == null || provider == null) return false;
    const internalNum = parseFloat(internal);
    const providerNum = parseFloat(provider);
    if (isNaN(internalNum) || isNaN(providerNum)) return false;
    return Math.abs(internalNum - providerNum) < 0.01;
  };

  const compareStatuses = (internal, provider) => {
    if (internal == null || provider == null) return false;
    const normalizeStatus = (status) => status.toString().toLowerCase().trim();
    return normalizeStatus(internal) === normalizeStatus(provider);
  };

  const reconcileTransactions = useCallback((internal, provider) => {
    const results = {
      matched: [],
      mismatched: [],
      internalOnly: [],
      providerOnly: []
    };

    const internalMap = new Map();
    const providerMap = new Map();

    // Process internal transactions
    internal.forEach(transaction => {
      const ref = transaction.transaction_reference || transaction.reference || transaction.id;
      if (ref) {
        internalMap.set(ref.toString(), transaction);
      }
    });

    // Process provider transactions
    provider.forEach(transaction => {
      const ref = transaction.transaction_reference || transaction.reference || transaction.id;
      if (ref) {
        providerMap.set(ref.toString(), transaction);
      }
    });

    // Compare transactions
    internalMap.forEach((internalTx, ref) => {
      const providerTx = providerMap.get(ref);

      if (providerTx) {
        const amountMatch = compareAmounts(internalTx.amount, providerTx.amount);
        const statusMatch = compareStatuses(internalTx.status, providerTx.status);

        if (amountMatch && statusMatch) {
          results.matched.push({
            ...internalTx,
            provider_amount: providerTx.amount,
            provider_status: providerTx.status
          });
        } else {
          results.mismatched.push({
            ...internalTx,
            provider_amount: providerTx.amount,
            provider_status: providerTx.status,
            amount_mismatch: !amountMatch,
            status_mismatch: !statusMatch
          });
        }
        providerMap.delete(ref);
      } else {
        results.internalOnly.push(internalTx);
      }
    });

    // Remaining provider transactions
    providerMap.forEach(providerTx => {
      results.providerOnly.push(providerTx);
    });

    return results;
  }, []);

  const handleReconciliation = async () => {
    if (!internalData || !providerData) return;

    setIsProcessing(true);

    // Simulate processing time for better UX
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const reconciliationResults = reconcileTransactions(internalData, providerData);
      setResults(reconciliationResults);
    } catch (err) {
      setError(`Error during reconciliation: ${err.message}`);
    }

    setIsProcessing(false);
  };

  const exportCategory = (category, data, filename) => {
    if (!data || data.length === 0) return;

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const formatColumnName = (column) => {
    return column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatCellValue = (value, column) => {
    if (value === null || value === undefined) return '';
    if (column.includes('amount') && !isNaN(value)) {
      return parseFloat(value).toFixed(2);
    }
    return value.toString();
  };

  const FileUploadCard = ({ type, fileName, onFileChange, icon: Icon }) => (
    <div className={`group relative border-2 border-dashed rounded-3xl p-8 text-center transition-all duration-500 ease-out transform hover:scale-[1.02] hover:shadow-2xl ${
      fileName 
        ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg shadow-emerald-100' 
        : 'border-slate-300 bg-gradient-to-br from-white to-slate-50 hover:border-indigo-400 hover:shadow-indigo-100'
    }`}>
      <input
        type="file"
        accept=".csv"
        onChange={(e) => onFileChange(e.target.files[0], type)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <div className={`mx-auto mb-6 p-4 rounded-2xl transition-all duration-300 ${
        fileName 
          ? 'bg-emerald-100 text-emerald-600' 
          : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
      }`}>
        <Icon size={32} />
      </div>
      <div className={`text-xl font-bold mb-3 ${fileName ? 'text-emerald-800' : 'text-slate-700'}`}>
        {fileName || `${type === 'internal' ? 'Internal System Export' : 'Provider Statement'}`}
      </div>
      <div className={`text-sm font-medium mb-6 ${fileName ? 'text-emerald-600' : 'text-slate-500'}`}>
        {fileName ? `✓ ${fileName}` : 'Drop your CSV file here or click to browse'}
      </div>
      
      {/* Sample Data Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          loadSampleData(type);
        }}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
          fileName 
            ? 'bg-emerald-200 text-emerald-700 hover:bg-emerald-300' 
            : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
        }`}
      >
        <Database size={16} />
        Load Sample Data
      </button>
    </div>
  );

  const SummaryCard = ({ title, count, icon: Icon, gradientFrom, gradientTo, shadowColor, iconBg }) => (
    <div className={`bg-white rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 ease-out transform hover:scale-105 hover:-translate-y-2 border border-slate-100`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${iconBg}`}>
          <Icon size={28} className="text-white" />
        </div>
        <div className={`text-4xl font-black bg-gradient-to-r ${gradientFrom} ${gradientTo} bg-clip-text text-transparent`}>
          {count}
        </div>
      </div>
      <div className="text-lg font-bold text-slate-800 mb-2">{title}</div>
      <div className="text-sm text-slate-500 font-medium">transactions found</div>
    </div>
  );

  const TransactionTable = ({ data, type }) => {
    if (!data || data.length === 0) {
      return (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-12 text-center">
          <div className="text-slate-400 text-lg font-medium">No transactions in this category</div>
        </div>
      );
    }

    const allColumns = [...new Set(data.flatMap(row => Object.keys(row)))];
    const visibleCols = allColumns.filter(col => !visibleColumns[col]);

    return (
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        {/* Column Toggle Controls */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 border-b border-slate-200">
          <div className="flex items-center gap-4 mb-3">
            <h4 className="text-sm font-semibold text-slate-700">Toggle Columns:</h4>
            <div className="flex flex-wrap gap-2">
              {allColumns.map(column => (
                <button
                  key={column}
                  onClick={() => toggleColumn(column)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                    visibleColumns[column]
                      ? 'bg-slate-300 text-slate-600'
                      : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                  }`}
                >
                  {visibleColumns[column] ? <EyeOff size={12} /> : <Eye size={12} />}
                  {formatColumnName(column)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-800 to-slate-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider w-12">
                  Details
                </th>
                {visibleCols.map(column => (
                  <th key={column} className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    {formatColumnName(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row, index) => (
                <React.Fragment key={index}>
                  <tr 
                    className={`hover:bg-slate-50 transition-colors duration-200 cursor-pointer ${
                      type === 'mismatched' 
                        ? row.amount_mismatch && row.status_mismatch 
                          ? 'bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-400'
                          : row.amount_mismatch 
                            ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-400'
                            : row.status_mismatch 
                              ? 'bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-400'
                              : ''
                        : ''
                    }`}
                    onClick={() => toggleRowExpansion(index)}
                  >
                    <td className="px-4 py-4">
                      <button className="p-1 rounded-lg hover:bg-slate-200 transition-colors">
                        {expandedRows.has(index) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </td>
                    {visibleCols.map(column => (
                      <td key={column} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {formatCellValue(row[column], column)}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Expanded Row Details */}
                  {expandedRows.has(index) && (
                    <tr className="bg-slate-50">
                      <td colSpan={visibleCols.length + 1} className="px-6 py-6">
                        <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
                          <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                            Transaction Details
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {allColumns.map(column => (
                              <div key={column} className="bg-slate-50 rounded-lg p-3">
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                  {formatColumnName(column)}
                                </div>
                                <div className="text-sm font-medium text-slate-900">
                                  {formatCellValue(row[column], column)}
                                </div>
                              </div>
                            ))}
                          </div>
                          {type === 'mismatched' && (
                            <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                              <h5 className="font-semibold text-amber-800 mb-2">Mismatch Details:</h5>
                              <div className="space-y-2 text-sm">
                                {row.amount_mismatch && (
                                  <div className="flex items-center gap-2 text-amber-700">
                                    <AlertTriangle size={14} />
                                    Amount mismatch: Internal: {formatCellValue(row.amount, 'amount')} vs Provider: {formatCellValue(row.provider_amount, 'provider_amount')}
                                  </div>
                                )}
                                {row.status_mismatch && (
                                  <div className="flex items-center gap-2 text-amber-700">
                                    <AlertTriangle size={14} />
                                    Status mismatch: Internal: {formatCellValue(row.status, 'status')} vs Provider: {formatCellValue(row.provider_status, 'provider_status')}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const CategorySection = ({ title, data, type, filename, icon: Icon, iconColor }) => {
    if (!data || data.length === 0) return null;

    return (
      <div className="mb-16">
        <div className="flex justify-between items-center mb-8 p-6 bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${iconColor}`}>
              <Icon size={24} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">{title}</h3>
          </div>
          <button
            onClick={() => exportCategory(type, data, filename)}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
        <TransactionTable data={data} type={type} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-3xl shadow-2xl p-12 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-blue-600/20 backdrop-blur-sm"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <RotateCcw size={48} />
                </div>
                <h1 className="text-5xl font-black">Transaction Reconciliation</h1>
              </div>
              <p className="text-xl opacity-90 font-medium">Compare internal transactions with payment processor statements</p>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-3xl shadow-2xl p-12 mb-12 border border-slate-200">
          <div className="grid md:grid-cols-2 gap-12 mb-12">
            <FileUploadCard
              type="internal"
              fileName={internalFileName}
              onFileChange={handleFileUpload}
              icon={FileText}
            />
            <FileUploadCard
              type="provider"
              fileName={providerFileName}
              onFileChange={handleFileUpload}
              icon={Upload}
            />
          </div>

          {error && (
            <div className="mb-8 p-6 bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-400 rounded-xl">
              <div className="text-red-800 font-semibold">{error}</div>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={handleReconciliation}
              disabled={!internalData || !providerData || isProcessing}
              className="px-12 py-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500 text-white font-bold text-lg rounded-2xl disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed hover:from-emerald-600 hover:via-teal-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 shadow-xl hover:shadow-2xl flex items-center gap-4 mx-auto"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  Processing Reconciliation...
                </>
              ) : (
                <>
                  <RotateCcw size={24} />
                  Start Reconciliation
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {results && (
          <div className="space-y-12">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <SummaryCard
                title="Perfect Matches"
                count={results.matched.length}
                icon={CheckCircle}
                gradientFrom="from-emerald-500"
                gradientTo="to-teal-500"
                iconBg="bg-gradient-to-r from-emerald-500 to-teal-500"
              />
              <SummaryCard
                title="Mismatched"
                count={results.mismatched.length}
                icon={RotateCcw}
                gradientFrom="from-purple-500"
                gradientTo="to-indigo-500"
                iconBg="bg-gradient-to-r from-purple-500 to-indigo-500"
              />
              <SummaryCard
                title="Internal Only"
                count={results.internalOnly.length}
                icon={AlertTriangle}
                gradientFrom="from-amber-500"
                gradientTo="to-orange-500"
                iconBg="bg-gradient-to-r from-amber-500 to-orange-500"
              />
              <SummaryCard
                title="Provider Only"
                count={results.providerOnly.length}
                icon={XCircle}
                gradientFrom="from-red-500"
                gradientTo="to-rose-500"
                iconBg="bg-gradient-to-r from-red-500 to-rose-500"
              />
            </div>

            {/* Category Tables */}
            <div className="bg-white rounded-3xl shadow-2xl p-12 border border-slate-200">
              <CategorySection
                title="Perfect Matches"
                data={results.matched}
                type="matched"
                filename="matched_transactions.csv"
                icon={CheckCircle}
                iconColor="bg-gradient-to-r from-emerald-500 to-teal-500"
              />

              <CategorySection
                title="Mismatched Transactions"
                data={results.mismatched}
                type="mismatched"
                filename="mismatched_transactions.csv"
                icon={RotateCcw}
                iconColor="bg-gradient-to-r from-purple-500 to-indigo-500"
              />

              <CategorySection
                title="Internal Only Transactions"
                data={results.internalOnly}
                type="internal-only"
                filename="internal_only_transactions.csv"
                icon={AlertTriangle}
                iconColor="bg-gradient-to-r from-amber-500 to-orange-500"
              />

              <CategorySection
                title="Provider Only Transactions"
                data={results.providerOnly}
                type="provider-only"
                filename="provider_only_transactions.csv"
                icon={XCircle}
                iconColor="bg-gradient-to-r from-red-500 to-rose-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReconciliationTool;
