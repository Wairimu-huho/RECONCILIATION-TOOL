import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, XCircle, RotateCcw, Download, Loader2 } from 'lucide-react';
import * as Papa from 'papaparse';

const ReconciliationTool = () => {
  const [internalData, setInternalData] = useState(null);
  const [providerData, setProviderData] = useState(null);
  const [internalFileName, setInternalFileName] = useState('');
  const [providerFileName, setProviderFileName] = useState('');
  const [results, setResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

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

  const FileUploadCard = ({ type, file, fileName, onFileChange, icon: Icon }) => (
    <div className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 hover:border-blue-400 hover:shadow-lg hover:-translate-y-1 ${fileName ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-white'}`}>
      <input
        type="file"
        accept=".csv"
        onChange={(e) => onFileChange(e.target.files[0], type)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <Icon className={`mx-auto mb-4 ${fileName ? 'text-green-500' : 'text-gray-400'}`} size={48} />
      <div className="text-lg font-medium text-gray-700 mb-2">
        {fileName || `${type === 'internal' ? 'Internal System Export' : 'Provider Statement'}`}
      </div>
      <div className="text-sm text-gray-500">
        {fileName ? `File loaded: ${fileName}` : 'Drop your CSV file here or click to browse'}
      </div>
    </div>
  );

  const SummaryCard = ({ title, count, color, icon: Icon, subtitle }) => (
    <div className={`bg-white rounded-2xl p-6 shadow-lg border-l-4 ${color} hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
      <div className="flex items-center justify-between mb-4">
        <Icon className={`${color.replace('border-l-', 'text-').replace('-400', '-500')}`} size={32} />
        <div className={`text-3xl font-bold ${color.replace('border-l-', 'text-').replace('-400', '-500')}`}>
          {count}
        </div>
      </div>
      <div className="text-lg font-semibold text-gray-700 mb-1">{title}</div>
      <div className="text-sm text-gray-500">{subtitle}</div>
    </div>
  );

  const TransactionTable = ({ data, type }) => {
    if (!data || data.length === 0) {
      return (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">
          No transactions in this category
        </div>
      );
    }

    const columns = [...new Set(data.flatMap(row => Object.keys(row)))];

    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {columns.map(column => (
                  <th key={column} className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {formatColumnName(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((row, index) => (
                <tr 
                  key={index} 
                  className={`hover:bg-gray-50 transition-colors ${
                    type === 'mismatched' 
                      ? row.amount_mismatch && row.status_mismatch 
                        ? 'bg-red-50 border-l-4 border-red-400'
                        : row.amount_mismatch 
                          ? 'bg-yellow-50 border-l-4 border-yellow-400'
                          : row.status_mismatch 
                            ? 'bg-orange-50 border-l-4 border-orange-400'
                            : ''
                      : ''
                  }`}
                >
                  {columns.map(column => (
                    <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCellValue(row[column], column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const CategorySection = ({ title, data, type, filename, icon: Icon }) => {
    if (!data || data.length === 0) return null;

    return (
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6 p-6 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-3">
            <Icon size={24} />
            <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
          </div>
          <button
            onClick={() => exportCategory(type, data, filename)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
        <TransactionTable data={data} type={type} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="bg-white rounded-3xl shadow-xl p-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <RotateCcw size={40} />
              Transaction Reconciliation Tool
            </h1>
            <p className="text-xl opacity-90">Compare internal transactions with payment processor statements</p>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
          <div className="grid md:grid-cols-2 gap-8 mb-8">
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
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="text-center">
            <button
              onClick={handleReconciliation}
              disabled={!internalData || !providerData || isProcessing}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold rounded-2xl disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed hover:from-green-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 shadow-lg flex items-center gap-3 mx-auto"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Processing...
                </>
              ) : (
                <>
                  <RotateCcw size={20} />
                  Start Reconciliation
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {results && (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SummaryCard
                title="✅ Matched"
                count={results.matched.length}
                color="border-l-green-400"
                icon={CheckCircle}
                subtitle="Perfect matches found"
              />
              <SummaryCard
                title="🔄 Mismatched"
                count={results.mismatched.length}
                color="border-l-purple-400"
                icon={RotateCcw}
                subtitle="Amount or status differences"
              />
              <SummaryCard
                title="⚠️ Internal Only"
                count={results.internalOnly.length}
                color="border-l-yellow-400"
                icon={AlertTriangle}
                subtitle="Missing from provider"
              />
              <SummaryCard
                title="❌ Provider Only"
                count={results.providerOnly.length}
                color="border-l-red-400"
                icon={XCircle}
                subtitle="Missing from internal"
              />
            </div>

            {/* Category Tables */}
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <CategorySection
                title="✅ Matched Transactions"
                data={results.matched}
                type="matched"
                filename="matched_transactions.csv"
                icon={CheckCircle}
              />

              <CategorySection
                title="🔄 Mismatched Transactions"
                data={results.mismatched}
                type="mismatched"
                filename="mismatched_transactions.csv"
                icon={RotateCcw}
              />

              <CategorySection
                title="⚠️ Internal Only Transactions"
                data={results.internalOnly}
                type="internal-only"
                filename="internal_only_transactions.csv"
                icon={AlertTriangle}
              />

              <CategorySection
                title="❌ Provider Only Transactions"
                data={results.providerOnly}
                type="provider-only"
                filename="provider_only_transactions.csv"
                icon={XCircle}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReconciliationTool;