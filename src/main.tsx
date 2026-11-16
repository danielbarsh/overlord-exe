import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// the hosted page may not carry index.html's <html lang dir>, so set them here
document.documentElement.lang = 'he';
document.documentElement.dir = 'rtl';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
