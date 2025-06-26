import React, { useState, useEffect } from 'react';

// Main App component for the database GUI
const App = () => {
  // State to hold the list of available database tables
  const [tableList, setTableList] = useState([]);
  // State to hold data for the currently selected table
  const [selectedTableData, setSelectedTableData] = useState([]);
  // State for the currently selected table name
  const [selectedTable, setSelectedTable] = useState('');
  // State to manage loading status for tables list
  const [isLoadingTables, setIsLoadingTables] = useState(true);
  // State to manage loading status for selected table data
  const [isLoadingTableData, setIsLoadingTableData] = useState(false);
  // State to manage any errors during data fetching
  const [error, setError] = useState(null);

  // Base URL for your Laravel API endpoints
  // In a real application, this might be dynamic or configured.
  const API_BASE_URL = '/api/cloudview'; // Updated to match your routes/api.php

  /**
   * Fetches the list of all database tables from the Laravel backend.
   */
  const fetchTableList = async () => {
    setIsLoadingTables(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/tables`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setTableList(data); // Assuming 'data' is an array of table names (e.g., ['users', 'products'])
      if (data.length > 0) {
        setSelectedTable(data[0]); // Automatically select the first table
      }
    } catch (err) {
      console.error("Failed to fetch table list:", err);
      setError("Failed to load table list. Please ensure the backend is running and accessible.");
    } finally {
      setIsLoadingTables(false);
    }
  };

  /**
   * Fetches data for a specific table from the Laravel backend.
   * @param {string} tableName - The name of the table to fetch data for.
   */
  const fetchTableData = async (tableName) => {
    if (!tableName) {
      setSelectedTableData([]);
      return;
    }

    setIsLoadingTableData(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/table/${tableName}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSelectedTableData(data); // Assuming 'data' is an array of objects (table rows)
    } catch (err) {
      console.error(`Failed to fetch data for table ${tableName}:`, err);
      setError(`Failed to load data for table "${tableName}". Check console for details.`);
    } finally {
      setIsLoadingTableData(false);
    }
  };

  /**
   * Handles CSV export by initiating a download from the Laravel backend.
   */
  const handleExportCsv = () => {
    if (selectedTable) {
      // Directly navigate to the URL to trigger file download
      window.location.href = `${API_BASE_URL}/table/${selectedTable}/export/csv`;
    } else {
      setError("Please select a table to export.");
    }
  };

  // Effect to fetch the initial table list when the component mounts
  useEffect(() => {
    fetchTableList();
  }, []); // Empty dependency array means this runs once on mount

  // Effect to fetch data whenever the selectedTable changes
  useEffect(() => {
    fetchTableData(selectedTable);
  }, [selectedTable]);

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans antialiased">
      <div className="max-w-6xl mx-auto bg-white shadow-lg rounded-xl p-6 sm:p-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6 text-center">
          Database GUI for Laravel CloudView
        </h1>

        <p className="text-center text-gray-600 mb-8">
          Select a table to view its contents and export data.
        </p>

        {(isLoadingTables || isLoadingTableData) && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
            <p className="ml-4 text-lg text-blue-600">Loading data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-6">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{error}</span>
          </div>
        )}

        {!isLoadingTables && !error && (
          <div className="mb-8 flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <label htmlFor="table-select" className="text-lg font-medium text-gray-700">
              Select Table:
            </label>
            <select
              id="table-select"
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="mt-1 block w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
              disabled={isLoadingTables || tableList.length === 0}
            >
              {tableList.length === 0 ? (
                <option value="">No tables found</option>
              ) : (
                tableList.map((tableName) => (
                  <option key={tableName} value={tableName}>
                    {tableName}
                  </option>
                ))
              )}
            </select>

            <button
              onClick={handleExportCsv}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedTable || isLoadingTableData}
            >
              Export to CSV
            </button>
          </div>
        )}

        {!isLoadingTables && !isLoadingTableData && !error && (
          <>
            {selectedTable && selectedTableData.length > 0 ? (
              <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {/* Dynamically render table headers based on the first row's keys */}
                      {Object.keys(selectedTableData[0] || {}).map((key) => (
                        <th
                          key={key}
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {key.replace(/_/g, ' ')} {/* Basic formatting for header names */}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedTableData.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50 transition-colors duration-200">
                        {Object.values(row).map((value, colIndex) => (
                          <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {String(value)} {/* Ensure value is a string for display */}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              selectedTable ? (
                <div className="text-center py-12 text-gray-500 text-lg">
                  No data found for table "{selectedTable}".
                </div>
              ) : (
                tableList.length > 0 && ( // Only show if tables exist but none selected yet
                  <div className="text-center py-12 text-gray-500 text-lg">
                    Please select a table from the dropdown above.
                  </div>
                )
              )
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default App;
