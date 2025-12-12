// src/App.js 파일 최종 복구 버전

import React from 'react';
import MainDisplay from './MainDisplay.js'; // 🚨 주석 해제하여 컴포넌트 불러오기
import InputPage from './InputPage.js';

function App() {
  // URL 쿼리 파라미터를 읽어와 모드를 결정
  const queryParams = new URLSearchParams(window.location.search);
  const mode = queryParams.get('mode');

  return (
    <div className="App">
      {/* 🚨 임시 텍스트를 제거하고 MainDisplay 컴포넌트 호출로 복구 */}
      {mode === 'input' ? <InputPage /> : <MainDisplay />}
    </div>
  );
}

export default App;