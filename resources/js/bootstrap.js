import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Your main React component

console.log("bootstrap.js: Script started.");

const rootElement = document.getElementById('cloudview-root');

if (rootElement) {
    console.log("bootstrap.js: Found 'cloudview-root' element.");
    try {
        const root = ReactDOM.createRoot(rootElement);
        console.log("bootstrap.js: ReactDOM.createRoot successful.");
        root.render(
            <React.StrictMode>
                <App />
            </React.StrictMode>
        );
        console.log("bootstrap.js: React app rendered.");
    } catch (e) {
        console.error("bootstrap.js: Error during React rendering:", e);
    }
} else {
    console.error("bootstrap.js: Could not find the root element with ID 'cloudview-root'.");
}