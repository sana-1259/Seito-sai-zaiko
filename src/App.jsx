import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  setDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  Plus, 
  Trash2, 
  School,
  X,
  Lock,
  Check,
  Edit3,
  Share2
} from 'lucide-react';

// --- Firebase Configuration (Preview Environment Use) ---
const firebaseConfig = {
  apiKey: "AIzaSyBubnXDneanD4ZJo2zgHONe5fhdlXkQjq4",
  authDomain: "seito-sai-zaiko.firebaseapp.com",
  projectId: "seito-sai-zaiko",
  storageBucket: "seito-sai-zaiko.firebasestorage.app",
  messagingSenderId: "309227012246",
  appId: "1:309227012246:web:35b59a9e1cb924631082b7",
  measurementId: "G-NMBV8MYP90"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Constants ---
const COLLECTION_PATH = 'inventory';
const DOC_ID = 'festival_data';
const ADMIN_PASSWORD = "7777"; // 管理者ログインパスワード

// Initial Data
const INITIAL_DATA = {
  eventTitle: '大手前高校　青桐祭　2026',
  subTitle: 'リアルタイム在庫状況ボード',
  sections: [
    {
      id: 'sec_1',
      title: 'クラス企画',
      headers: ['クラス(場所)', '企画名', '品目名', '在庫有無'],
      rows: [
        { id: 'r1', col1: '2-8 (G)', col2: '飛鳥亭', col3: 'やきとり2本セット', status: 'available' },
        { id: 'r2', col1: '3-9 (G)', col2: 'God dog !', col3: 'ホットドッグ', status: 'soldout' },
        { id: 'r3', col1: '', col2: '', col3: 'チキンサンド', status: 'soldout' },
        { id: 'r4', col1: '3-2 (504)', col2: '喫茶「アメリカンダイナー」', col3: '各メニューの詳細は自治会、または各団体にお尋ねください。', status: 'soldout', isNote: true },
      ]
    },
    {
      id: 'sec_2',
      title: '委員会・クラブ',
      headers: ['企画者(場所)', '企画名', '品目名', '在庫有無'],
      rows: [
        { id: 'r5', col1: '図書委員会', col2: '図書関連品販売', col3: 'しおり', status: 'warning' },
        { id: 'r6', col1: '', col2: '', col3: 'ブックカバー', status: 'soldout' },
        { id: 'r7', col1: '茶道部', col2: 'お茶会', col3: 'お茶とお菓子', status: 'time_schedule', timeLabel: '9:30 ~', statusDetail: 'soldout' },
      ]
    }
  ]
};

// Status Options
const STATUS_OPTIONS = [
  { value: 'available', label: '在庫あり', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'soldout', label: '売り切れ', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'warning', label: '残りわずか', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'none', label: '表示なし', color: 'bg-white text-gray-800 border-gray-200' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // 隠しコマンド用ステート
  const [tapCount, setTapCount] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [copyMsg, setCopyMsg] = useState("");
  
  // --- Authentication ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          // トークンがない場合は匿名ログインにフォールバック
          await signInAnonymously(auth); 
        }
      } catch (e) {
        console.error("Auth Error:", e);
        // カスタムトークン失敗時は匿名ログインを試みる
        await signInAnonymously(auth); 
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- Data Sync ---
  useEffect(() => {
    // ユーザー認証が終わっていない場合は処理しない
    if (!user) return;

    // 環境に応じた Firestore ドキュメントパスを決定
    let docRef;
    if (typeof __app_id !== 'undefined') {
      // チャットプレビュー環境用 (公開データパス)
      docRef = doc(db, 'artifacts', appId, 'public', 'data', COLLECTION_PATH, DOC_ID);
    } else {
      // 外部公開環境用 (標準パス)
      docRef = doc(db, COLLECTION_PATH, DOC_ID);
    }

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const fetchedData = snapshot.data();
        // データの互換性チェック
        if (!fetchedData.eventTitle) {
          setData({ ...fetchedData, eventTitle: INITIAL_DATA.eventTitle, subTitle: INITIAL_DATA.subTitle });
        } else {
          setData(fetchedData);
        }
      } else {
        // データが存在しない場合は初期データをセット
        setData(INITIAL_DATA);
      }
      setLoading(false);
    }, (error) => {
      console.error("Data Fetch Error:", error);
      setLoading(false);
    });
    // クリーンアップ関数を返す
    return () => unsubscribe();
  }, [user]);

  // --- Hidden Command Logic ---
  const handleHeaderTap = (e) => {
    if (isAdmin || e.target.tagName === 'INPUT' || e.target.closest('button')) return;
    
    const newCount = tapCount + 1;
    setTapCount(newCount);

    if (newCount >= 5) {
      setShowLoginModal(true);
      setTapCount(0);
    }

    setTimeout(() => {
      setTapCount(0);
    }, 3000);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowLoginModal(false);
      setPasswordInput("");
      setLoginError("");
    } else {
      setLoginError("パスワードが違います");
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    // 確認ダイアログの代わりにカスタムモーダルを使うべきですが、今回はブラウザのconfirmで代用します
    if (!confirm("編集モードを終了しますか？")) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShare = () => {
    // URLをクリップボードにコピー
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopyMsg("リンクをコピーしました！");
      setTimeout(() => setCopyMsg(""), 3000);
    }).catch(err => {
      console.error('Copy failed:', err);
      setCopyMsg("コピーに失敗しました");
      setTimeout(() => setCopyMsg(""), 3000);
    });
  };

  // --- Update Handlers ---
  const saveData = async (newData) => {
    if (!user) return; // 認証されていなければ保存しない
    try {
      let docRef;
      if (typeof __app_id !== 'undefined') {
        docRef = doc(db, 'artifacts', appId, 'public', 'data', COLLECTION_PATH, DOC_ID);
      } else {
        docRef = doc(db, COLLECTION_PATH, DOC_ID);
      }
      await setDoc(docRef, newData);
    } catch (e) {
      console.error("Save Error:", e);
      // カスタムモーダルを使う代わりにログに出力
      console.log("保存に失敗しました。権限設定などを確認してください。");
    }
  };

  // Generic update helpers
  const updateAppTitle = (field, value) => {
    if (!data) return;
    const newData = { ...data, [field]: value };
    setData(newData);
    saveData(newData);
  };
  const updateRow = (sIdx, rIdx, field, val) => {
    if (!data) return;
    const newData = { ...data };
    newData.sections[sIdx].rows[rIdx][field] = val;
    setData(newData);
    saveData(newData);
  };
  const addRow = (sIdx) => {
    if (!data) return;
    const newData = { ...data };
    newData.sections[sIdx].rows.push({ id: Date.now().toString(), col1: '', col2: '', col3: '新規品目', status: 'available' });
    setData(newData);
    saveData(newData);
  };
  const deleteRow = (sIdx, rIdx) => {
    if (!confirm("削除しますか？")) return;
    const newData = { ...data };
    newData.sections[sIdx].rows.splice(rIdx, 1);
    setData(newData);
    saveData(newData);
  };
  const addSection = () => {
    if (!data) return;
    const newData = { ...data };
    newData.sections.push({ id: Date.now().toString(), title: '新規セクション', headers: ['場所', '企画名', '品目名', '在庫有無'], rows: [] });
    setData(newData);
    saveData(newData);
  };
  const deleteSection = (idx) => {
    if (!confirm("セクションごと削除しますか？")) return;
    if (!data) return;
    const newData = { ...data };
    newData.sections.splice(idx, 1);
    setData(newData);
    saveData(newData);
  };
  const updateHeader = (sIdx, hIdx, val) => {
    if (!data) return;
    const newData = { ...data };
    newData.sections[sIdx].headers[hIdx] = val;
    setData(newData);
    saveData(newData);
  };
  const updateSectionTitle = (sIdx, val) => {
    if (!data) return;
    const newData = { ...data };
    newData.sections[sIdx].title = val;
    setData(newData);
    saveData(newData);
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-white">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-white pb-20 font-sans text-gray-900 selection:bg-blue-100 relative">
      
      {/* Header */}
      <header 
        onClick={handleHeaderTap}
        className="bg-gray-900 text-white p-4 sticky top-0 z-40 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center select-none min-h-[80px]"
      >
        <div className={`active:scale-95 transition-transform cursor-pointer p-2 -ml-2 rounded hover:bg-gray-800 w-full md:w-auto ${isAdmin ? 'cursor-default active:scale-100 hover:bg-transparent' : ''}`}>
          <div className="flex items-center gap-2">
            <School className="w-6 h-6 flex-shrink-0" />
            {isAdmin ? (
              <div className="flex flex-col w-full gap-2">
                 <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-gray-400" />
                    <input 
                      type="text"
                      value={data?.eventTitle || ''}
                      onChange={(e) => updateAppTitle('eventTitle', e.target.value)}
                      className="bg-gray-800 border border-gray-600 text-white text-lg md:text-xl font-bold px-2 py-1 rounded focus:border-blue-500 focus:outline-none w-full md:min-w-[300px]"
                      placeholder="イベントタイトル"
                    />
                 </div>
                 <input 
                    type="text"
                    value={data?.subTitle || ''}
                    onChange={(e) => updateAppTitle('subTitle', e.target.value)}
                    className="bg-gray-800 border border-gray-600 text-gray-300 text-xs px-2 py-1 rounded focus:border-blue-500 focus:outline-none w-full"
                    placeholder="サブタイトル"
                  />
              </div>
            ) : (
              <h1 className="text-lg md:text-xl font-bold">{data?.eventTitle || 'タイトル未設定'}</h1>
            )}
          </div>
          {!isAdmin && (
            <p className="text-[10px] text-gray-400 mt-1 ml-8">{data?.subTitle || 'リアルタイム在庫状況ボード'}</p>
          )}
        </div>
        
        <div className="mt-2 md:mt-0 self-end md:self-center flex items-center gap-2">
          {/* Share Button (Always visible) */}
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 bg-gray-700 px-3 py-1.5 rounded hover:bg-gray-600 text-xs font-bold shadow transition-colors"
          >
            {copyMsg ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
            {copyMsg || "共有"}
          </button>

          {isAdmin && (
             <button 
              onClick={handleLogout}
              className="flex items-center gap-2 bg-green-600 px-3 py-1.5 rounded hover:bg-green-500 text-xs font-bold shadow transition-colors whitespace-nowrap"
            >
              <Check className="w-4 h-4" /> 編集終了
            </button>
          )}
        </div>
      </header>

      {/* Modals & Floating Buttons */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            <div className="text-center mb-6">
              <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"><Lock className="w-6 h-6 text-gray-600" /></div>
              <h2 className="text-xl font-bold text-gray-800">管理者ログイン</h2>
              <p className="text-sm text-gray-500">編集用パスワードを入力してください</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input type="password" placeholder="Password" className="w-full border-2 border-gray-200 rounded-lg p-3 text-center text-lg focus:border-blue-500 focus:outline-none transition-colors" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} autoFocus />
                {loginError && <p className="text-red-500 text-sm mt-2 text-center font-bold">{loginError}</p>}
              </div>
              <button type="submit" className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-black transition-colors shadow-lg active:scale-95">ログインして編集</button>
            </form>
          </div>
        </div>
      )}

      {isAdmin && (
        <button onClick={handleLogout} className="fixed bottom-6 right-6 bg-green-600 text-white p-4 rounded-full shadow-2xl z-50 hover:bg-green-500 hover:scale-110 transition-all flex items-center gap-2 font-bold animate-in slide-in-from-bottom-10">
          <Check className="w-6 h-6" /> <span className="hidden md:inline">編集完了</span>
        </button>
      )}

      {/* Main Content */}
      <main className="container mx-auto p-2 max-w-4xl mt-6">
        {isAdmin && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between shadow-sm animate-pulse">
            <span className="font-bold flex items-center gap-2"><span className="w-2 h-2 bg-red-600 rounded-full animate-ping"></span>現在、編集モードです</span>
            <span className="text-xs text-red-500">変更は自動保存されます</span>
          </div>
        )}

        {data && data.sections.map((section, sIndex) => (
          <div key={section.id} className="mb-12">
            <div className="mb-3 flex items-center gap-2">
              {isAdmin ? (
                <input type="text" value={section.title} onChange={(e) => updateSectionTitle(sIndex, e.target.value)} className="text-lg font-bold border-b-2 border-blue-500 focus:outline-none w-full bg-blue-50 px-2 py-1" />
              ) : (
                <h2 className="text-xl font-bold border-l-8 border-gray-900 pl-3 py-1">{section.title}</h2>
              )}
              {isAdmin && <button onClick={() => deleteSection(sIndex)} className="text-red-500 bg-white border border-red-100 p-2 rounded shadow-sm hover:bg-red-50"><Trash2 className="w-5 h-5" /></button>}
            </div>

            <div className="overflow-x-auto shadow-lg border-2 border-gray-900 rounded-sm bg-white">
              <table className="w-full border-collapse text-sm md:text-base min-w-[600px]">
                <thead>
                  <tr className="bg-gray-100 text-gray-800">
                    {section.headers.map((header, hIndex) => (
                      <th key={hIndex} className="border-b-2 border-gray-900 border-r border-gray-400 p-3 text-center font-bold w-[20%] last:border-r-0">
                        {isAdmin ? (
                          <input value={header} onChange={(e) => updateHeader(sIndex, hIndex, e.target.value)} className="w-full text-center font-bold bg-white border border-blue-300 rounded px-1" />
                        ) : header}
                      </th>
                    ))}
                    {isAdmin && <th className="p-2 bg-gray-200 w-12 text-xs">削除</th>}
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row, rIndex) => (
                    <tr key={row.id} className="hover:bg-gray-50 border-b border-gray-900 last:border-b-0">
                      <td className="border-r border-gray-900 p-2 text-center align-middle">
                        {isAdmin ? <textarea value={row.col1} onChange={(e) => updateRow(sIndex, rIndex, 'col1', e.target.value)} className="w-full text-center resize-none bg-gray-50 border focus:border-blue-500 rounded p-1 h-full" rows={2} /> : <span className="whitespace-pre-line font-bold text-gray-700">{row.col1}</span>}
                      </td>
                      <td className="border-r border-gray-900 p-2 text-center align-middle">
                        {isAdmin ? <textarea value={row.col2} onChange={(e) => updateRow(sIndex, rIndex, 'col2', e.target.value)} className="w-full text-center resize-none bg-gray-50 border focus:border-blue-500 rounded p-1" rows={2} /> : <span className="whitespace-pre-line font-medium">{row.col2}</span>}
                      </td>
                      <td className="border-r border-gray-900 p-2 text-center align-middle bg-white">
                         {isAdmin ? <textarea value={row.col3} onChange={(e) => updateRow(sIndex, rIndex, 'col3', e.target.value)} className={`w-full text-center resize-none bg-gray-50 border focus:border-blue-500 rounded p-1 ${row.isNote ? 'text-xs' : ''}`} rows={2} /> : <span className={`whitespace-pre-line block ${row.isNote ? 'text-xs text-gray-600' : 'text-gray-900'}`}>{row.col3}</span>}
                      </td>
                      <td className="p-2 text-center align-middle bg-white">
                        {isAdmin ? (
                          <div className="flex flex-col gap-2">
                            <select value={row.status} onChange={(e) => updateRow(sIndex, rIndex, 'status', e.target.value)} className="w-full p-2 border rounded bg-white font-bold">
                              {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                              <option value="time_schedule">時間指定</option>
                            </select>
                            {row.status === 'time_schedule' && (
                              <div className="flex gap-1">
                                <input placeholder="9:30~" value={row.timeLabel || ''} onChange={(e) => updateRow(sIndex, rIndex, 'timeLabel', e.target.value)} className="w-1/2 text-xs border p-1 rounded" />
                                <select value={row.statusDetail || 'soldout'} onChange={(e) => updateRow(sIndex, rIndex, 'statusDetail', e.target.value)} className="w-1/2 text-xs border p-1 rounded">
                                  <option value="available">あり</option>
                                  <option value="soldout">売切</option>
                                </select>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-full flex justify-center">
                            {row.status === 'time_schedule' ? (
                              <div className="flex items-center justify-between gap-2 w-full max-w-[160px] border-b border-dashed border-gray-300 pb-1">
                                <span className="font-bold text-xs text-gray-600">{row.timeLabel}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${row.statusDetail === 'available' ? STATUS_OPTIONS.find(o => o.value === 'available').color : STATUS_OPTIONS.find(o => o.value === 'soldout').color}`}>{row.statusDetail === 'available' ? '販売中' : '売り切れ'}</span>
                              </div>
                            ) : (
                              row.status !== 'none' && <span className={`block px-3 py-1 rounded-full text-sm font-bold border shadow-sm ${STATUS_OPTIONS.find(o => o.value === row.status)?.color || 'bg-gray-100'}`}>{STATUS_OPTIONS.find(o => o.value === row.status)?.label}</span>
                            )}
                          </div>
                        )}
                      </td>
                      {isAdmin && <td className="p-2 text-center bg-gray-50 border-l border-gray-200"><button onClick={() => deleteRow(sIndex, rIndex)} className="text-red-500 p-2 hover:bg-red-100 rounded-full"><Trash2 className="w-4 h-4" /></button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
              {isAdmin && <div className="bg-gray-50 p-3 text-center border-t-2 border-gray-900"><button onClick={() => addRow(sIndex)} className="flex items-center justify-center gap-2 w-full py-2 bg-white border-2 border-dashed border-blue-400 text-blue-600 rounded hover:bg-blue-50 font-bold"><Plus className="w-4 h-4" /> 行を追加</button></div>}
            </div>
          </div>
        ))}

        {isAdmin && (
          <div className="mt-8 mb-12 border-4 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
             <button onClick={addSection} className="bg-gray-900 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-black flex items-center gap-2 mx-auto"><Plus className="w-5 h-5" /> 新しいテーブルを追加</button>
          </div>
        )}
      </main>
      <footer className="bg-gray-100 text-gray-400 py-8 text-center text-xs border-t mt-auto"><p>&copy; 2026 {data?.eventTitle || 'School Festival Executive Committee'}.</p></footer>
    </div>
  );
}

