import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// ブラウザのDOMにReactコンポーネントをマウント（取り付け）する標準的なファイル
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

