import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { db } from './firebase';

const MainDisplay = () => {
  const canvasRef = useRef(null);
  const incomingQueue = useRef([]);
  const appRef = useRef(null); // 앱 인스턴스 저장

  useEffect(() => {
    // 1. Pixi Application 설정 (고해상도 지원)
    const app = new PIXI.Application({
      background: '#111111',
      resizeTo: window,
      antialias: true,
      resolution: window.devicePixelRatio || 1, // 선명하게
      autoDensity: true,
    });
    appRef.current = app;

    if (canvasRef.current) {
      canvasRef.current.appendChild(app.view);
    }

    // 2. 상자 (Chest) 설정
    const chestStyle = new PIXI.TextStyle({ fontSize: 100 });
    const chest = new PIXI.Text('🎁', chestStyle);
    chest.anchor.set(0.5);
    chest.x = app.screen.width / 2;
    chest.y = app.screen.height - 120;
    chest.zIndex = 10; // 항상 위에 보이게
    app.stage.addChild(chest);
    app.stage.sortableChildren = true;

    const emojis = [];

    // 3. Firebase 리스너 (버퍼링 유지)
    const startTime = Date.now();
    const inputRef = db.ref('inputs').orderByChild('timestamp').startAt(startTime);
    inputRef.on('child_added', (snapshot) => {
      const data = snapshot.val();
      if (data?.emoji) incomingQueue.current.push(data.emoji);
    });

    // 4. 애니메이션 루프 (Ticker)
    app.ticker.add((delta) => {
      // A. 스폰 (속도 조절)
      let spawnCount = 0;
      while (incomingQueue.current.length > 0 && spawnCount < 3) {
        createEmoji(incomingQueue.current.shift());
        spawnCount++;
      }
      if (incomingQueue.current.length > 300) {
        incomingQueue.current = incomingQueue.current.slice(-150);
      }

      // B. 업데이트 및 물리기반 애니메이션
      for (let i = emojis.length - 1; i >= 0; i--) {
        const item = emojis[i];
        
        if (item.isAbsorbing) {
          // 상자로 빨려들어가는 효과
          item.scale.x *= 0.85;
          item.scale.y *= 0.85;
          item.alpha *= 0.8;
          // 상자 중심을 향해 이동
          item.x += (chest.x - item.x) * 0.2;
          item.y += (chest.y - item.y) * 0.2;

          if (item.scale.x < 0.05) {
            app.stage.removeChild(item);
            emojis.splice(i, 1);
            // 여기서 하트 효과 등을 추가할 수 있습니다.
          }
        } else {
          // 일반 낙하 물리
          item.vy += item.gravity * delta; // 중력 가속도
          item.y += item.vy * delta;
          item.rotation += item.rotationSpeed * delta;

          // 상자 근처 도달 감지 (흡수 시작)
          if (item.y > chest.y - 80 && Math.abs(item.x - chest.x) < 100) {
            item.isAbsorbing = true;
          }
          // 화면 밖으로 나가면 제거
          else if (item.y > app.screen.height + 100) {
            app.stage.removeChild(item);
            emojis.splice(i, 1);
          }
        }
      }
      
      // 반응형 위치 재조정
      chest.x = app.screen.width / 2;
      chest.y = app.screen.height - 120;
    });

    function createEmoji(char) {
      const style = new PIXI.TextStyle({ fontSize: 60, resolution: 2 });
      const text = new PIXI.Text(char, style);
      text.anchor.set(0.5);
      // 랜덤 시작 위치 (화면 상단 너비의 80% 범위)
      text.x = (app.screen.width * 0.1) + Math.random() * (app.screen.width * 0.8);
      text.y = -100; 
      
      // 물리 속성 부여
      text.vy = 2 + Math.random() * 3; // 초기 속도
      text.gravity = 0.1 + Math.random() * 0.1; // 중력
      text.rotationSpeed = (Math.random() - 0.5) * 0.1; // 회전 속도
      text.isAbsorbing = false;
      
      emojis.push(text);
      app.stage.addChild(text);
    }

    return () => {
      inputRef.off();
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
      }
    };
  }, []);

  return <div ref={canvasRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#111' }} />;
};

export default MainDisplay;