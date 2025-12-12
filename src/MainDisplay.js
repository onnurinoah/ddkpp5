import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js'; // Pixi 엔진 불러오기
import { db } from './firebase';

const MainDisplay = () => {
  const canvasRef = useRef(null); // Pixi가 그려질 컨테이너
  const incomingQueue = useRef([]); // 🚀 데이터 버퍼링 큐

  useEffect(() => {
    // 1. Pixi Application 생성 (검은 배경, 화면 꽉 참)
    const app = new PIXI.Application({
      background: '#111111',
      resizeTo: window, // 창 크기에 맞춰 자동 리사이징
      antialias: true,
    });

    // React ref에 Canvas 연결
    if (canvasRef.current) {
      canvasRef.current.appendChild(app.view);
    }

    // 2. 상자(Chest) 텍스트 추가 (화면 중앙 하단)
    const chestStyle = new PIXI.TextStyle({
      fontSize: 80,
    });
    const chest = new PIXI.Text('🎁', chestStyle);
    chest.anchor.set(0.5);
    chest.x = app.screen.width / 2;
    chest.y = app.screen.height - 100;
    app.stage.addChild(chest);

    // 하트 더미 컨테이너
    const heartContainer = new PIXI.Container();
    app.stage.addChild(heartContainer);

    // 3. 이모지 스프라이트 관리 배열
    const emojis = [];

    // 4. Firebase 리스너 (이전과 동일한 최적화 로직)
    const startTime = Date.now();
    const inputRef = db.ref('inputs')
      .orderByChild('timestamp')
      .startAt(startTime);

    inputRef.on('child_added', (snapshot) => {
      const data = snapshot.val();
      if (data && data.emoji) {
        // 바로 그리지 않고 큐에 넣음 (과부하 방지)
        incomingQueue.current.push(data.emoji);
      }
    });

    // 5. Pixi Ticker (애니메이션 루프 - 초당 60회 실행)
    app.ticker.add((delta) => {
      // A. 큐에서 데이터 꺼내서 생성 (속도 조절: 한 프레임당 최대 2개까지만 생성)
      //    데이터가 1000개 쌓여도 한 번에 다 그리지 않고 나눠서 그림 -> 렉 방지
      let spawnCount = 0;
      while (incomingQueue.current.length > 0 && spawnCount < 2) {
        const emojiChar = incomingQueue.current.shift();
        createEmoji(emojiChar);
        spawnCount++;
      }

      // 큐가 너무 많이 쌓였으면 오래된 것 버리기 (메모리 보호)
      if (incomingQueue.current.length > 200) {
        incomingQueue.current = incomingQueue.current.slice(-100);
      }

      // B. 기존 이모지들 이동 및 회전
      for (let i = emojis.length - 1; i >= 0; i--) {
        const item = emojis[i];
        
        // 아래로 떨어지기
        item.y += item.speed * delta;
        item.rotation += 0.01 * delta;

        // 상자 근처에 도달하면
        if (item.y > app.screen.height - 150) {
           // 하트 생성 로직 (선택 사항)
           // createHeart(); 
           
           // 이모지 제거
           app.stage.removeChild(item);
           emojis.splice(i, 1);
        }
      }
      
      // 상자 위치 반응형 유지
      chest.x = app.screen.width / 2;
      chest.y = app.screen.height - 100;
    });

    // 이모지 생성 함수 (Pixi Text 사용)
    function createEmoji(char) {
      const style = new PIXI.TextStyle({ fontSize: 50 });
      const text = new PIXI.Text(char, style);
      
      text.x = Math.random() * app.screen.width;
      text.y = -50; // 화면 위에서 시작
      text.anchor.set(0.5);
      
      // 커스텀 속성 추가
      text.speed = 2 + Math.random() * 3; // 떨어지는 속도
      
      emojis.push(text);
      app.stage.addChild(text);
    }

    // Cleanup (컴포넌트 사라질 때)
    return () => {
      inputRef.off();
      app.destroy(true, { children: true });
    };
  }, []);

  return (
    <div 
      ref={canvasRef} 
      style={{ 
        width: '100vw', 
        height: '100vh', 
        overflow: 'hidden',
        backgroundColor: '#111' 
      }} 
    />
  );
};

export default MainDisplay;