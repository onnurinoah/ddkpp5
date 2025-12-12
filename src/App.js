import React from 'react';
import MainDisplay from './MainDisplay.js';
import InputPage from './InputPage.js';

function App() {
  // URL 쿼리 파라미터를 읽어와 모드를 결정
  const queryParams = new URLSearchParams(window.location.search);
  const mode = queryParams.get('mode');

  return (
    <div className="App">
      {/* 주소에 ?mode=input이 있으면 입력 페이지, 없으면 메인 전광판 페이지 표시 
      */}
      {mode === 'input' ? <InputPage /> : <MainDisplay />}
    </div>
  );
}

export default App;