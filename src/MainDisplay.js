// src/MainDisplay.js 파일 전체 내용

import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import './MainDisplay.css';

const MainDisplay = () => {
  const [items, setItems] = useState([]);
  const [hearts, setHearts] = useState([]);

  // spawnItem과 addHeart를 useCallback으로 감싸거나, useEffect 밖에서 정의하여
  // ESLint 경고를 회피하고 리스너 재등록을 방지합니다. (간결함을 위해 함수 선언 방식을 유지)
  
  // ----------------------------------------------------
  // ⚠️ 1분 1000개 이모지를 처리하기 위해 임시로 DOM 부하를 줄이는 함수
  // ----------------------------------------------------

  const addHeart = () => {
    const id = Date.now() + Math.random();
    // DOM 부하를 줄이기 위해 하트 개수를 1개만 유지합니다. (최대 10개까지 테스트 가능)
    setHearts((prev) => [...prev.slice(-1), id]); 
  };
  
  const spawnItem = (emoji) => {
    // 🚨 1000개 이벤트 중 50개(5%)만 화면에 표시하여 DOM 부하를 20배 줄입니다.
    if (Math.random() < 0.05) { 
        const id = Date.now() + Math.random();
        const newItem = { id, emoji, left: Math.random() * 20 + 40 };

        setItems((prev) => [...prev, newItem]);

        setTimeout(() => {
          setItems((prev) => prev.filter((item) => item.id !== id));
          addHeart();
        }, 5000); // 5초 후 사라짐
    }
  };
  
  // ----------------------------------------------------
  // ⚠️ Firebase 리스너 최적화: 과거 데이터로 인한 초기 과부하 방지
  // ----------------------------------------------------
  
  useEffect(() => {
    // 리스너가 등록되는 시점의 타임스탬프를 가져옵니다.
    const startTime = Date.now();
    
    // 1. timestamp 기준으로 정렬하고
    // 2. startAt() 쿼리를 사용하여 리스너 등록 시점 이후의 데이터만 가져옵니다.
    const inputRef = db.ref('inputs')
        .orderByChild('timestamp') 
        .startAt(startTime);       

    inputRef.on('child_added', (snapshot) => {
      const data = snapshot.val();
      // 쿼리 필터가 작동하므로, 여기서 추가적인 timestamp 확인은 제거했습니다.
      spawnItem(data.emoji);
    });

    // 컴포넌트 언마운트 시 리스너를 해제합니다.
    return () => inputRef.off();
    
    // spawnItem은 외부 함수이지만, 이 함수가 변경될 가능성이 없으므로 []를 유지합니다.
  }, []); 

  return (
    <div className="game-container">
      {items.map((item) => (
        <div
          key={item.id}
          className="falling-emoji"
          // 애니메이션 시간을 랜덤하게 설정
          style={{ left: `${item.left}%`, animationDuration: `${4 + Math.random() * 2}s` }}
        >
          {item.emoji}
        </div>
      ))}

      <div className="chest-wrapper">
        <div className="chest-placeholder">🎁</div>

        <div className="heart-pile">
          {hearts.map((h) => (
            <div key={h} className="stacked-heart">❤️</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MainDisplay;