// src/App.js 파일 수정

import React from 'react';
// import MainDisplay from './MainDisplay.js'; // 🚨 임시 주석 처리 (원인 격리)
import InputPage from './InputPage.js';

function App() {
  const queryParams = new URLSearchParams(window.location.search);
  const mode = queryParams.get('mode');

  return (
    <div className="App">
      {/* 🚨 <MainDisplay /> 대신 단순 텍스트를 임시로 렌더링 */}
      {mode === 'input' ? <InputPage /> : <h1>MainDisplay 로직 실행 전 테스트 성공!</h1>}
    </div>
  );
}

export default App;