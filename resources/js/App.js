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
const [isLoadingTables, setIsLoadingTables] = useState(false);

// State to manage loading status for selected table data
const [isLoadingTableData, setIsLoadingTableData] = useState(false);

// State to manage any errors during data fetching or connection attempts
const [error, setError] = useState(null);

// State to track if user has attempted any connection
const [hasAttemptedConnection, setHasAttemptedConnection] = useState(false);

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
* @param {boolean} showErrors - Whether to show errors to the user (false for silent operations).
*/
const fetchTableList = async (configToUse = null, showErrors = true) => {
setIsLoadingTables(true);
if (showErrors) {
setError(null);
}
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
} else if (showErrors) {
setError("No tables found for the provided connection. Check connection details or database content.");
setActiveDbDetails(null); // No tables, effectively not connected to a usable DB
setIsCustomConnected(false);
}
} catch (err) {
console.error("Failed to fetch table list:", err);
if (showErrors) {
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
}
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
if (hasAttemptedConnection) {
setError(`Failed to load data for table "${tableName}". Check network tab or server logs.`);
}
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

// Effect to silently try fetching initial table list using the default application connection on mount
// This will be called on first load to show the internal app DB if available, without showing errors
useEffect(() => {
// Fetch using null to indicate no custom config, so it uses default, but don't show errors
fetchTableList(null, false);
}, []);

// Effect to fetch data whenever the selectedTable changes
useEffect(() => {
if (selectedTable) {
fetchTableData(selectedTable);
}
}, [selectedTable, activeDbDetails]); // Re-fetch if activeDbDetails changes too

// Function to handle the "Connect" button click
const handleConnect = () => {
setHasAttemptedConnection(true);
// Validate required fields before attempting connection
if (!dbConfig.db_connection || !dbConfig.db_host || !dbConfig.db_port || !dbConfig.db_database || !dbConfig.db_username || !dbConfig.db_password) {
setError("All database connection fields are required (Driver, Host, Port, Database, Username, Password).");
return;
}
// Attempt to fetch table list with the new custom configuration
fetchTableList(dbConfig, true);
};

return (
<div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4 font-sans antialiased">
<div className="max-w-7xl mx-auto">
{/* Header Section */}
<div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl p-8 mb-8 border border-gray-200/50">
<div className="text-center">
<h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 bg-clip-text text-transparent mb-4">
Laravel CloudView
</h1>
<p className="text-xl text-gray-600 font-medium">Database Management Interface</p>
<p className="text-gray-500 mt-2">
Connect to your Laravel application's database or manage external databases
</p>
</div>
</div>

{/* Database Connection Form */}
<div className="bg-white/90 backdrop-blur-sm shadow-2xl rounded-2xl p-8 mb-8 border border-gray-200/50">
<div className="flex items-center justify-center mb-6">
<div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg">
<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 1.79 4 4 4h8c0-2.21-1.79-4-4-4H4V7z" />
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7c0-2.21 1.79-4 4-4h8c2.21 0 4 1.79 4 4v10c0 2.21-1.79 4-4 4" />
</svg>
</div>
<h2 className="text-2xl font-bold text-gray-800 ml-4">Database Connection</h2>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
<div className="space-y-2">
<label htmlFor="db_connection" className="block text-sm font-semibold text-gray-700">
Database Driver
</label>
<select
id="db_connection"
name="db_connection"
value={dbConfig.db_connection}
onChange={handleConfigChange}
className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm hover:shadow-md"
>
<option value="mysql">MySQL</option>
<option value="pgsql">PostgreSQL</option>
<option value="sqlite">SQLite (File Path)</option>
<option value="sqlsrv">SQL Server</option>
</select>
</div>

<div className="space-y-2">
<label htmlFor="db_host" className="block text-sm font-semibold text-gray-700">
Host Address
</label>
<input
type="text"
id="db_host"
name="db_host"
value={dbConfig.db_host}
onChange={handleConfigChange}
placeholder="your-database-host.com"
className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm hover:shadow-md"
/>
</div>

<div className="space-y-2">
<label htmlFor="db_port" className="block text-sm font-semibold text-gray-700">
Port Number
</label>
<input
type="text"
id="db_port"
name="db_port"
value={dbConfig.db_port}
onChange={handleConfigChange}
placeholder="5432, 3306, etc."
className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm hover:shadow-md"
/>
</div>

<div className="space-y-2">
<label htmlFor="db_database" className="block text-sm font-semibold text-gray-700">
Database Name
</label>
<input
type="text"
id="db_database"
name="db_database"
value={dbConfig.db_database}
onChange={handleConfigChange}
placeholder="main, production, etc."
className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm hover:shadow-md"
/>
</div>

<div className="space-y-2">
<label htmlFor="db_username" className="block text-sm font-semibold text-gray-700">
Username
</label>
<input
type="text"
id="db_username"
name="db_username"
value={dbConfig.db_username}
onChange={handleConfigChange}
placeholder="database username"
className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm hover:shadow-md"
/>
</div>

<div className="space-y-2">
<label htmlFor="db_password" className="block text-sm font-semibold text-gray-700">
Password
</label>
<input
type="password"
id="db_password"
name="db_password"
value={dbConfig.db_password}
onChange={handleConfigChange}
placeholder="••••••••"
className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm hover:shadow-md"
/>
</div>
</div>

<div className="flex justify-center">
<button
onClick={handleConnect}
disabled={isLoadingTables || isLoadingTableData}
className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 transition-all duration-300 ease-in-out transform hover:scale-105 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
>
<span className="flex items-center">
<svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
</svg>
Connect to Database
</span>
</button>
</div>
</div>

{/* Connection Status - Only show when actively connected */}
{activeDbDetails && hasAttemptedConnection && (
<div className="bg-white/70 backdrop-blur-sm shadow-lg rounded-xl p-6 mb-8 border border-gray-200/50">
<div className="flex items-center justify-center text-emerald-700 bg-emerald-50/80 rounded-lg p-4">
<svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>
<span className="font-medium">
Connected to: <span className="font-bold">{activeDbDetails.db_username}@{activeDbDetails.db_host}:{activeDbDetails.db_port}/{activeDbDetails.db_database}</span>
<span className="ml-2 px-2 py-1 bg-emerald-100 text-xs rounded-full">{activeDbDetails.db_connection.toUpperCase()}</span>
</span>
</div>
</div>
)}

{/* Loading Indicator */}
{(isLoadingTables || isLoadingTableData) && (
<div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl p-12 mb-8 border border-gray-200/50">
<div className="flex flex-col items-center justify-center">
<div className="relative">
<div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
<div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0"></div>
</div>
<p className="mt-6 text-lg font-medium text-gray-700">
{isLoadingTables ? "Establishing connection and loading tables..." : "Loading table data..."}
</p>
</div>
</div>
)}

{/* Error Message Display - Only show when user has attempted connection */}
{error && hasAttemptedConnection && (
<div className="bg-red-50/90 backdrop-blur-sm border-l-4 border-red-500 shadow-lg rounded-xl p-6 mb-8">
<div className="flex items-start">
<svg className="w-6 h-6 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>
<div>
<p className="font-semibold text-red-800">Connection Error</p>
<p className="text-red-700 mt-1">{error}</p>
</div>
</div>
</div>
)}

{/* Main Data View */}
{!isLoadingTables && (
<div className="space-y-8">
{tableList.length > 0 && (
<div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-8 border border-gray-200/50">
<div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-8">
<div className="flex items-center space-x-4">
<div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg">
<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
</svg>
</div>
<div>
<label htmlFor="table-select" className="block text-lg font-semibold text-gray-700">
Select Table
</label>
<p className="text-sm text-gray-500">Choose a table to view its data</p>
</div>
</div>

<div className="flex items-center space-x-4">
<select
id="table-select"
value={selectedTable}
onChange={(e) => setSelectedTable(e.target.value)}
className="px-6 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-base bg-white/80 backdrop-blur-sm hover:shadow-md transition-all duration-200 min-w-[200px]"
disabled={isLoadingTables || tableList.length === 0}
>
{tableList.map((tableName) => (
<option key={tableName} value={tableName}>
{tableName}
</option>
))}
</select>

<button
onClick={handleExportCsv}
className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:ring-offset-2 transition-all duration-300 ease-in-out transform hover:scale-105 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
disabled={!selectedTable || isLoadingTableData}
>
<span className="flex items-center">
<svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
</svg>
Export CSV
</span>
</button>
</div>
</div>

{/* Table Data Display */}
{selectedTable && selectedTableData.length > 0 ? (
<div className="bg-white/50 backdrop-blur-sm rounded-xl shadow-inner border border-gray-200/50 overflow-hidden">
<div className="overflow-x-auto">
<table className="min-w-full divide-y divide-gray-200/50">
<thead className="bg-gradient-to-r from-gray-50 to-gray-100/80 backdrop-blur-sm">
<tr>
{Object.keys(selectedTableData[0] || {}).map((key) => (
<th
key={key}
scope="col"
className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider border-r border-gray-200/30 last:border-r-0"
>
{key.replace(/_/g, ' ')}
</th>
))}
</tr>
</thead>
<tbody className="bg-white/30 backdrop-blur-sm divide-y divide-gray-200/30">
{selectedTableData.map((row, rowIndex) => (
<tr key={rowIndex} className="hover:bg-white/60 transition-all duration-200 hover:shadow-sm">
{Object.values(row).map((value, colIndex) => (
<td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 border-r border-gray-200/20 last:border-r-0">
<span className="font-medium">{String(value)}</span>
</td>
))}
</tr>
))}
</tbody>
</table>
</div>
</div>
) : (
<div className="text-center py-16 text-gray-500">
<svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
</svg>
<p className="text-lg font-medium">No data to display</p>
<p className="text-sm">Select a table from the dropdown above to view its contents</p>
</div>
)}
</div>
)}

{!isLoadingTables && !isLoadingTableData && tableList.length === 0 && hasAttemptedConnection && (
<div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl p-16 text-center border border-gray-200/50">
<svg className="w-20 h-20 mx-auto mb-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 7v10c0 2.21 1.79 4 4 4h8c0-2.21-1.79-4-4-4H4V7z" />
</svg>
<h3 className="text-xl font-semibold text-gray-700 mb-2">No Tables Found</h3>
<p className="text-gray-500">
No tables were found in the connected database. Please check your connection details.
</p>
</div>
)}
</div>
)}
</div>
</div>
);
};

export default App;