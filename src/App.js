// src/App.js

import React, { useState, useEffect } from 'react';
import MainDisplay from './MainDisplay'; // 메인 화면 (Pixi.js)
import InputPage from './InputPage';   // 입력 페이지 (새 디자인)
import './App.css'; // 기본 App CSS가 있다면 유지

const App = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // URL 변경 시 상태 업데이트
  useEffect(() => {
    // 1. 초기 로드 시 경로 설정
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    // 2. 브라우저의 '뒤로가기/앞으로가기' 이벤트 감지 (팝스테이트)
    window.addEventListener('popstate', handleLocationChange);
    
    // 3. 페이지가 로드되자마자 현재 경로 설정
    handleLocationChange();

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  let ComponentToRender;

  // 경로에 따라 렌더링할 컴포넌트 결정
  if (currentPath === '/' || currentPath === '/display') {
    // 💡 메인 화면 주소: / 또는 /display
    ComponentToRender = MainDisplay;
  } else if (currentPath === '/input' || currentPath === '/send') {
    // 💡 입력 페이지 주소: /input 또는 /send
    ComponentToRender = InputPage;
  } else {
    // 💡 기타 경로일 경우 (404 대신, 메인 화면으로 리디렉션 처리)
    ComponentToRender = MainDisplay;
  }

  return (
    <div className="App">
      <ComponentToRender />
    </div>
  );
};

export default App;