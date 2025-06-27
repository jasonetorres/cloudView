import React, { useState, useEffect } from 'react';

// Main App component for the database GUI
const App = () => {
  // State for database connection form fields
  const [dbConfig, setDbConfig] = useState({
    db_connection: 'pgsql', // Default to pgsql as per your cloud setup
    db_host: '',
    db_port: '',
    db_database: '',
    db_username: '',
    db_password: '',
  });
  // State to track if a custom connection has been attempted/set
  const [isCustomConnected, setIsCustomConnected] = useState(false);
  // State for the currently active database connection details (useful for display or re-use)
  const [activeDbDetails, setActiveDbDetails] = useState(null); // null means default app DB

  // State for the fetched list of available database tables
  const [tableList, setTableList] = useState([]);
  // State to hold data for the currently selected table
  const [selectedTableData, setSelectedTableData] = useState([]);
  // State for the currently selected table name
  const [selectedTable, setSelectedTable] = useState('');

  // State to manage loading status for tables list
  const [isLoadingTables, setIsLoadingTables] = useState(false); // Initially false, as user needs to connect
  // State to manage loading status for selected table data
  const [isLoadingTableData, setIsLoadingTableData] = useState(false);
  // State to manage any errors during data fetching or connection attempts
  const [error, setError] = useState(null);

  // Base URL for your Laravel API endpoints
  const API_BASE_URL = '/api/cloudview';

  // Handler for input field changes in the database configuration form
  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setDbConfig(prevConfig => ({
      ...prevConfig,
      [name]: value,
    }));
  };

  /**
   * Constructs the common fetch options (headers and body) for API requests.
   * Includes dynamic database connection details if available.
   * @param {string} method - HTTP method (e.g., 'GET', 'POST').
   * @param {object} dataToSend - Data to be sent in the request body (for POST) or query string (for GET).
   * @returns {object} Fetch options.
   */
  const getFetchOptions = (method = 'GET', dataToSend = null) => {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]') ? document.querySelector('meta[name="csrf-token"]').content : '', // Include CSRF token if your API routes use web middleware or csrf protection
        },
    };

    if (dataToSend) {
        if (method === 'GET') {
            // For GET, data needs to be part of the URL's query string
            // This function returns only options, so the caller appends the query string
        } else {
            // For POST/PUT/DELETE, data goes in the request body
            options.body = JSON.stringify(dataToSend);
        }
    }
    return options;
  };


  /**
   * Fetches the list of all database tables from the Laravel backend.
   * Can be triggered by the "Connect" button or on initial load.
   * @param {object} configToUse - The database config to use for this fetch (null for default app DB).
   */
  const fetchTableList = async (configToUse = null) => {
    setIsLoadingTables(true);
    setError(null);
    setTableList([]); // Clear previous table list
    setSelectedTableData([]); // Clear previous table data
    setSelectedTable(''); // Clear selected table

    try {
      // Determine the actual data to send, prioritizing configToUse
      const dataToSend = configToUse || (isCustomConnected && activeDbDetails ? activeDbDetails : null);

      let url = `${API_BASE_URL}/tables`;
      let options = {};

      if (dataToSend) {
          // For initial connection or subsequent fetches with specific credentials, send as POST body
          options = getFetchOptions('POST', dataToSend);
      } else {
          // For initial load using app's default DB (no sensitive data to send), use GET
          options = getFetchOptions('GET');
      }

      // Perform the fetch request
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`HTTP error! Status: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }
      const data = await response.json();
      setTableList(data);

      if (data.length > 0) {
        setSelectedTable(data[0]);
        // Store the successfully used configuration
        setActiveDbDetails(configToUse || (isCustomConnected ? activeDbDetails : null)); // If configToUse was provided, use it. Else, keep existing activeDbDetails if custom connected.
        setIsCustomConnected(!!configToUse); // Mark as custom connected if config was explicitly provided
      } else {
        setError("No tables found for the provided connection. Check connection details or database content.");
        setActiveDbDetails(null); // No tables, effectively not connected to a usable DB
        setIsCustomConnected(false);
      }
    } catch (err) {
      console.error("Failed to fetch table list:", err);
      let userMessage = "Failed to connect or load table list. Please check your database connection details (host, port, username, password, database name, and driver). Ensure the database server is accessible from your Laravel application's environment.";
      if (err.message.includes('500') || err.message.includes('Internal Server Error')) {
          userMessage += " A server-side error occurred. Check your Laravel logs (storage/logs/laravel.log) for details.";
      } else if (err.message.includes('404')) {
          userMessage += " The API endpoint was not found. Ensure your Laravel routes are correctly defined.";
      } else if (err.message.includes('405')) {
          userMessage = "HTTP 405 (Method Not Allowed). This means the server received a POST request but the route is only configured for GET. Ensure your Laravel routes/api.php accepts POST for /api/cloudview/tables.";
      }
      setError(userMessage);
      setActiveDbDetails(null); // Connection failed
      setIsCustomConnected(false);
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
      // Always send the activeDbDetails as POST body to ensure context
      const options = getFetchOptions('POST', activeDbDetails);
      const response = await fetch(`${API_BASE_URL}/table/${tableName}`, options); // No query string for POST body

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`HTTP error! Status: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }
      const data = await response.json();
      setSelectedTableData(data);
    } catch (err) {
      console.error(`Failed to fetch data for table ${tableName}:`, err);
      setError(`Failed to load data for table "${tableName}". Check network tab or server logs.`);
    } finally {
      setIsLoadingTableData(false);
    }
  };

  /**
   * Handles CSV export by initiating a download from the Laravel backend.
   */
  const handleExportCsv = () => {
    if (selectedTable && activeDbDetails) {
      // For CSV export (which is a download), it's generally a GET request.
      // Send credentials as URL query parameters (which is common for GET downloads).
      const params = new URLSearchParams(activeDbDetails).toString();
      window.location.href = `${API_BASE_URL}/table/${selectedTable}/export/csv?${params}`;
    } else {
      setError("Please select a table to export and ensure a database is connected.");
    }
  };

  // Effect to fetch initial table list using the default application connection on mount
  // This will be called on first load to show the internal app DB, if any.
  useEffect(() => {
      // Fetch using null to indicate no custom config, so it uses default
      fetchTableList(null);
  }, []);

  // Effect to fetch data whenever the selectedTable changes
  useEffect(() => {
    if (selectedTable) {
        fetchTableData(selectedTable);
    }
  }, [selectedTable, activeDbDetails]); // Re-fetch if activeDbDetails changes too

  // Function to handle the "Connect" button click
  const handleConnect = () => {
    // Validate required fields before attempting connection
    if (!dbConfig.db_connection || !dbConfig.db_host || !dbConfig.db_port || !dbConfig.db_database || !dbConfig.db_username || !dbConfig.db_password) {
      setError("All database connection fields are required (Driver, Host, Port, Database, Username, Password).");
      return;
    }
    // Attempt to fetch table list with the new custom configuration
    fetchTableList(dbConfig);
  };


  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans antialiased">
      <div className="max-w-6xl mx-auto bg-white shadow-lg rounded-xl p-6 sm:p-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6 text-center text-blue-800">
          Laravel CloudView Database GUI
        </h1>

        <p className="text-center text-gray-600 mb-8">
          View your Laravel application's database or connect to an external one.
        </p>

        {/* Database Connection Form */}
        <div className="bg-blue-50 p-6 rounded-lg shadow-inner mb-8">
          <h2 className="text-2xl font-bold text-blue-700 mb-4 text-center">Connect to Database</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="db_connection" className="block text-sm font-medium text-gray-700">Driver</label>
              <select
                id="db_connection"
                name="db_connection"
                value={dbConfig.db_connection}
                onChange={handleConfigChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="mysql">MySQL</option>
                <option value="pgsql">PostgreSQL</option>
                <option value="sqlite">SQLite (File Path)</option>
                <option value="sqlsrv">SQL Server</option>
              </select>
            </div>
            <div>
              <label htmlFor="db_host" className="block text-sm font-medium text-gray-700">Host</label>
              <input
                type="text"
                id="db_host"
                name="db_host"
                value={dbConfig.db_host}
                onChange={handleConfigChange}
                placeholder="e.g., your-db-host.cloud.com"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="db_port" className="block text-sm font-medium text-gray-700">Port</label>
              <input
                type="text"
                id="db_port"
                name="db_port"
                value={dbConfig.db_port}
                onChange={handleConfigChange}
                placeholder="e.g., 5432 (PGSQL), 3306 (MySQL)"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="db_database" className="block text-sm font-medium text-gray-700">Database Name</label>
              <input
                type="text"
                id="db_database"
                name="db_database"
                value={dbConfig.db_database}
                onChange={handleConfigChange}
                placeholder="e.g., main"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="db_username" className="block text-sm font-medium text-gray-700">Username</label>
              <input
                type="text"
                id="db_username"
                name="db_username"
                value={dbConfig.db_username}
                onChange={handleConfigChange}
                placeholder="e.g., laravel"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="db_password" className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password" // Use type="password" for security
                id="db_password"
                name="db_password"
                value={dbConfig.db_password}
                onChange={handleConfigChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          <div className="flex justify-center mt-6">
            <button
              onClick={handleConnect}
              disabled={isLoadingTables || isLoadingTableData}
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect to Database
            </button>
          </div>
        </div>

        {/* Display Current Connection Status */}
        {activeDbDetails ? (
            <p className="text-center text-sm text-gray-500 mb-4">
                Currently connected to: <span className="font-semibold text-gray-800">{activeDbDetails.db_username}@{activeDbDetails.db_host}:{activeDbDetails.db_port}/{activeDbDetails.db_database} ({activeDbDetails.db_connection})</span>
            </p>
        ) : (
            <p className="text-center text-sm text-gray-500 mb-4">
                Not connected to a custom database. Viewing application's default DB.
            </p>
        )}


        {/* Loading Indicator */}
        {(isLoadingTables || isLoadingTableData) && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
            <p className="mt-4 text-lg text-blue-600">
              {isLoadingTables ? "Connecting and loading tables..." : "Loading table data..."}
            </p>
          </div>
        )}

        {/* Error Message Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-6 text-center">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{error}</span>
          </div>
        )}

        {/* Main Table View and Export Controls */}
        {!isLoadingTables && !error && (
          <div className="pt-4"> {/* Added padding top to separate from connection form */}
            {tableList.length > 0 && (
                <div className="mb-8 flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                    <label htmlFor="table-select" className="text-lg font-medium text-gray-700">
                        Select Table:
                    </label>
                    <select
                        id="table-select"
                        value={selectedTable}
                        onChange={(e) => setSelectedTable(e.target.value)}
                        className="mt-1 block w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base appearance-none bg-white pr-8 transition-colors duration-200 hover:border-blue-400"
                        disabled={isLoadingTables || tableList.length === 0}
                    >
                        {tableList.map((tableName) => (
                            <option key={tableName} value={tableName}>
                                {tableName}
                            </option>
                        ))}
                    </select>

                    {/* Export to CSV Button */}
                    <button
                        onClick={handleExportCsv}
                        className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!selectedTable || isLoadingTableData}
                    >
                        Export to CSV
                    </button>
                </div>
            )}

            {/* Display Table Data */}
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
              // Messages for no data or no table selected
              tableList.length > 0 && selectedTable === '' ? (
                 <div className="text-center py-12 text-gray-500 text-lg">
                   Please select a table from the dropdown above to view its data.
                 </div>
              ) : (
                !isLoadingTables && !isLoadingTableData && tableList.length === 0 && (
                    <div className="text-center py-12 text-gray-500 text-lg">
                       No tables available. Connect to a database using the form above or check your application's default database.
                    </div>
                )
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
