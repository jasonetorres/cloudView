import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const App = () => {
  const [mode, setMode] = useState('manual');
  const [showPassword, setShowPassword] = useState(false);
  const [showModal, setShowModal] = useState(null); // 'manual', 'ide', 'env'

  const [dbConfig, setDbConfig] = useState({
    db_connection: 'pgsql',
    db_host: '',
    db_port: '',
    db_database: '',
    db_username: '',
    db_password: '',
  });

  const [envConfig, setEnvConfig] = useState({
    db_connection: 'pgsql',
    db_host: 'localhost',
    db_port: '5432',
    db_database: 'env_database',
    db_username: 'env_user',
    db_password: 'env_pass',
  });

  const [tableList, setTableList] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedTableData, setSelectedTableData] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/cloudview';

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setDbConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleModeSwitch = (selectedMode) => {
    setShowModal(selectedMode);
    setMode(selectedMode);
    setTableList([]);
    setSelectedTable('');
    setSelectedTableData([]);
    setError(null);

    if (selectedMode === 'env') {
      setDbConfig(envConfig);
    } else if (selectedMode === 'manual') {
      setDbConfig({
        db_connection: 'pgsql',
        db_host: '',
        db_port: '',
        db_database: '',
        db_username: '',
        db_password: '',
      });
    } else if (selectedMode === 'ide') {
      setDbConfig({
        db_connection: 'mysql',
        db_host: '127.0.0.1',
        db_port: '3306',
        db_database: 'my_local_db',
        db_username: 'root',
        db_password: '',
      });
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);

    if (mode === 'manual') {
      const hasEmpty = Object.values(dbConfig).some((v) => !v.trim());
      if (hasEmpty) {
        setError("Please fill out all database fields.");
        setIsLoading(false);
        return;
      }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbConfig),
      });
      if (!res.ok) throw new Error('Connection failed');
      const tables = await res.json();
      setTableList(tables);
      if (tables.length > 0) {
        setSelectedTable(tables[0]);
        toast.success(`${tables.length} tables loaded.`);
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTableData = async (tableName) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/table/${tableName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbConfig),
      });
      if (!res.ok) throw new Error('Failed to fetch table data');
      const data = await res.json();
      setSelectedTableData(data);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const exportCSV = () => {
    if (!selectedTableData.length) return;
    const csv = [Object.keys(selectedTableData[0]).join(',')];
    selectedTableData.forEach(row => {
      csv.push(Object.values(row).join(','));
    });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedTable}.csv`;
    link.click();
  };

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(selectedTableData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, selectedTable);
    XLSX.writeFile(workbook, `${selectedTable}.xlsx`);
  };

  const exportJSON = () => {
    const json = JSON.stringify(selectedTableData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedTable}.json`;
    link.click();
  };

  const exportPDF = async () => {
    const input = document.getElementById('table-section');
    const canvas = await html2canvas(input);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF();
    pdf.addImage(imgData, 'PNG', 10, 10);
    pdf.save(`${selectedTable}.pdf`);
  };

  useEffect(() => {
    if (selectedTable) fetchTableData(selectedTable);
  }, [selectedTable]);

  const renderModal = () => {
    if (!showModal) return null;

    const messages = {
      manual: 'Enter full DB config manually. All fields are required. Supports pgsql and mysql.',
      ide: 'Uses a local development MySQL config: 127.0.0.1:3306 with root access.',
      env: 'Loads DB credentials from your server’s .env file. Ensure it’s configured correctly.',
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded shadow-lg max-w-md w-full">
          <h2 className="text-xl font-semibold mb-2 capitalize">{showModal} mode</h2>
          <p className="mb-4 text-gray-700">{messages[showModal]}</p>
          <button
            onClick={() => setShowModal(null)}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Got it
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 font-sans">
      <Toaster position="top-right" />

      {renderModal()}

      <h1 className="text-3xl font-bold mb-6">Laravel CloudView</h1>

      <div className="flex gap-4 mb-4">
        <button
          className={`px-4 py-2 rounded ${mode === 'manual' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => handleModeSwitch('manual')}
        >
          Manual Entry
        </button>
        <button
          className={`px-4 py-2 rounded ${mode === 'ide' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => handleModeSwitch('ide')}
        >
          Use IDE Config
        </button>
        <button
          className={`px-4 py-2 rounded ${mode === 'env' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => handleModeSwitch('env')}
        >
          Use .env
        </button>
      </div>

      {mode !== 'manual' && (
        <p className="text-sm text-gray-600 mb-2">
          {mode === 'env'
            ? 'Using .env configuration from server'
            : 'Using predefined IDE configuration'}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        {Object.entries(dbConfig).map(([key, val]) => (
          <div key={key} className="relative">
            <input
              name={key}
              type={key === 'db_password' && showPassword ? 'text' : key === 'db_password' ? 'password' : 'text'}
              placeholder={key.replace('db_', '').toUpperCase()}
              value={val}
              onChange={handleConfigChange}
              className={`w-full p-2 border border-gray-300 rounded ${mode !== 'manual' ? 'bg-gray-100 text-gray-500' : ''}`}
              disabled={mode !== 'manual'}
            />
            {key === 'db_password' && mode === 'manual' && (
              <button
                type="button"
                className="absolute right-2 top-2 text-sm text-gray-600"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            )}
          </div>
        ))}
      </div>

      <button onClick={handleConnect} className="bg-green-600 text-white px-4 py-2 rounded mb-2">
        Connect
      </button>

      {tableList.length > 0 && (
        <p className="text-green-600 mb-2">Successfully connected. {tableList.length} tables found.</p>
      )}

      {error && (
        <div className="text-red-600 text-sm mb-2">
          {error}
          {mode === 'env' && (
            <div>
              <button
                className="underline ml-2"
                onClick={() => handleModeSwitch('manual')}
              >
                Switch to manual entry?
              </button>
            </div>
          )}
        </div>
      )}

      {isLoading && <p>Loading...</p>}

      {tableList.length > 0 && (
        <div className="mb-4">
          <label>Select Table:</label>
          <select
            className="ml-2 border border-gray-300 p-2 rounded"
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
          >
            {tableList.map((tbl) => (
              <option key={tbl} value={tbl}>{tbl}</option>
            ))}
          </select>
        </div>
      )}

      {selectedTableData.length > 0 && (
        <>
          <div className="mb-4 flex gap-2">
            <button onClick={exportCSV} className="bg-blue-500 text-white px-3 py-1 rounded">Export CSV</button>
            <button onClick={exportExcel} className="bg-green-500 text-white px-3 py-1 rounded">Export Excel</button>
            <button onClick={exportJSON} className="bg-yellow-500 text-white px-3 py-1 rounded">Export JSON</button>
            <button onClick={exportPDF} className="bg-red-500 text-white px-3 py-1 rounded">Export PDF</button>
          </div>

          <div className="overflow-x-auto" id="table-section">
            <table className="min-w-full table-auto border">
              <thead>
                <tr>
                  {Object.keys(selectedTableData[0]).map((key) => (
                    <th key={key} className="border px-4 py-2 text-left">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedTableData.map((row, i) => (
                  <tr key={i} className="border-t">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-4 py-2 border-r">{String(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
