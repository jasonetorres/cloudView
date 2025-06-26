// resources/js/bootstrap.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Your main React component

// Ensure the DOM element exists before trying to mount
if (document.getElementById('cloudview-root')) {
    const root = ReactDOM.createRoot(document.getElementById('cloudview-root'));
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}
