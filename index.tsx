import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 開発環境でのみテスト用コードを読み込む
if (import.meta.env.DEV) {
  import('./test-supabase');
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);