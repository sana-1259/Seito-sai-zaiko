import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// HTMLファイルのID="root"の要素に、Appコンポーネントを挿入して描画します。
// これが、App.jsxのコードをウェブサイトとして表示するための「結び目」です。
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

