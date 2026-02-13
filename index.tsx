
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global Error Handling for better debugging in GitHub Pages / Iframes
window.onerror = function(message, source, lineno, colno, error) {
    const display = document.getElementById('error-display');
    if (display) {
        display.style.display = 'block';
        display.innerHTML = `<strong>Error:</strong> ${message} <br/> <em>Check console for details.</em>`;
    }
    return false;
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
