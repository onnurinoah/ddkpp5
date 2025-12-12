import React, { useEffect, useState, useRef } from 'react';
import { db } from './firebase';
import './MainDisplay.css';

const MainDisplay = () => {
  const [items, setItems] = useState([]);
  const [hearts, setHearts] = useState([]);
  
  // 🚀 버퍼링을 위한 참조 변수 (화면 렌더링 없이 데이터만 쌓아두는 창고)
  const incomingQueue = useRef([]); 

  useEffect(() => {
    // 1. 초기화 시점 시간 기록
    const startTime = Date.now();

    // 2. Firebase 리스너 연결
    const inputRef = db.ref('inputs')
      .orderByChild('timestamp')
      .startAt(startTime);

    const handleNewData = (snapshot) => {
      const data = snapshot.val();
      if (data && data.emoji) {
        // ⚡ 바로 setItems 하지 않고, 일단 큐(창고)에 쌓기만 함 (부하 0)
        incomingQueue.current.push(data.emoji);
      }
    };

    inputRef.on('child_added', handleNewData);

    // 3. ⏱️ 렌더링 루프 (0.5초마다 창고에서 하나씩 꺼내서 그림)
    // 1000명이 동시에 보내도, 내 화면엔 0.5초에 1개씩만 부드럽게 나옴.
    const renderInterval = setInterval(() => {
      if (incomingQueue.current.length > 0) {
        // 큐에서 하나 꺼냄 (Shift)
        const emojiToRender = incomingQueue.current.shift();
        
        // 만약 큐에 데이터가 너무 많이 쌓였으면(100개 이상) 오래된 건 버려서 메모리 보호
        if (incomingQueue.current.length > 100) {
            incomingQueue.current = incomingQueue.current.slice(-50);
        }

        spawnItem(emojiToRender);
      }
    }, 500); // 0.5초 간격 (조절 가능)

    return () => {
      inputRef.off();
      clearInterval(renderInterval);
    };
  }, []);

  const spawnItem = (emoji) => {
    const id = Date.now() + Math.random();
    const newItem = { id, emoji, left: Math.random() * 80 + 10 }; // 화면 10%~90% 사이에 랜덤 위치

    setItems((prev) => [...prev, newItem]);

    // 4초 뒤 삭제
    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      addHeart();
    }, 4000);
  };

  const addHeart = () => {
    const id = Date.now() + Math.random();
    // 하트 개수 최대 20개로 제한 (DOM 보호)
    setHearts((prev) => [...prev.slice(-20), id]);
  };

  return (
    <div className="game-container">
      {items.map((item) => (
        <div
          key={item.id}
          className="falling-emoji"
          style={{ 
            left: `${item.left}%`, 
            animationDuration: '4s' 
          }}
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