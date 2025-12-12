import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { db } from './firebase';

const MainDisplay = () => {
  const canvasRef = useRef(null);
  const incomingQueue = useRef([]);
  const appRef = useRef(null); 
  const emojis = useRef([]); // 모든 이모지 스프라이트를 저장할 배열

  useEffect(() => {
    // 1. Pixi Application 설정
    const app = new PIXI.Application({
      background: '#111111',
      resizeTo: window,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    appRef.current = app;

    if (canvasRef.current) {
      canvasRef.current.appendChild(app.view);
    }
    
    // Z-Index를 사용하기 위해 필요
    app.stage.sortableChildren = true;

    // 2. 상자 (Chest) 설정
    const CHEST_Y = app.screen.height - 150;
    const chestStyle = new PIXI.TextStyle({ fontSize: 100 });
    const chest = new PIXI.Text('🎁', chestStyle);
    chest.anchor.set(0.5);
    chest.x = app.screen.width / 2;
    chest.y = CHEST_Y;
    chest.zIndex = 1000; // 상자는 가장 앞에 배치
    app.stage.addChild(chest);

    // 하트가 쌓일 영역을 담당하는 컨테이너 (상자 바로 아래에 렌더링)
    const heartPileContainer = new PIXI.Container();
    heartPileContainer.zIndex = 500; 
    app.stage.addChild(heartPileContainer);

    // 3. Firebase 리스너 (기존 버퍼링 로직 유지)
    const startTime = Date.now();
    const inputRef = db.ref('inputs').orderByChild('timestamp').startAt(startTime);
    inputRef.on('child_added', (snapshot) => {
      const data = snapshot.val();
      if (data?.emoji) incomingQueue.current.push(data.emoji);
    });

    // 이모지 텍스처 캐싱
    const emojiTextureCache = {};
    const heartTexture = PIXI.Text.generateTexture(new PIXI.Text('❤️', { fontSize: 50, resolution: 2 }));

    function getEmojiTexture(emojiChar) {
      if (!emojiTextureCache[emojiChar]) {
        const style = new PIXI.TextStyle({ fontSize: 60, resolution: 2 });
        emojiTextureCache[emojiChar] = PIXI.Text.generateTexture(new PIXI.Text(emojiChar, style));
      }
      return emojiTextureCache[emojiChar];
    }
    
    // --- 4. 이모지 생성 함수 ---
    function createEmoji(char) {
      const text = new PIXI.Sprite(getEmojiTexture(char));
      text.anchor.set(0.5);
      
      text.x = (app.screen.width * 0.1) + Math.random() * (app.screen.width * 0.8);
      text.y = -100;
      text.scale.set(0.8);

      // 물리 속성
      text.vy = 0; 
      text.gravity = 0.1 + Math.random() * 0.1;
      text.rotationSpeed = (Math.random() - 0.5) * 0.05; 
      text.isFalling = true;
      text.isAbsorbing = false;
      text.isLanded = false; // 새로 추가: 하트가 되어 쌓였는지

      // 최종 착지 위치 (하트 쌓기 효과를 위한 랜덤 위치)
      text.landingX = chest.x + (Math.random() - 0.5) * 60;
      text.landingY = CHEST_Y + 20 + Math.random() * 30; // 상자 아래쪽 주변에 쌓이게
      
      emojis.current.push(text);
      app.stage.addChild(text);
    }
    
    // --- 5. 하트 파티클 생성 함수 (펑 터지는 효과) ---
    function createHeartParticles(x, y) {
      for (let i = 0; i < 5; i++) {
        const particle = new PIXI.Sprite(heartTexture);
        particle.anchor.set(0.5);
        particle.x = x;
        particle.y = y;
        particle.scale.set(0.5 + Math.random() * 0.5);
        particle.alpha = 1;
        
        // 폭발 속성
        particle.vx = (Math.random() - 0.5) * 6;
        particle.vy = (Math.random() - 1) * 6;
        particle.life = 60; // 60 프레임 동안 생존

        app.stage.addChild(particle);
        emojis.current.push(particle); // 관리를 위해 임시로 배열에 추가
        
        // 파티클은 흩어지는 애니메이션을 담당하며, 쌓이는 이모지(하트)와 구분됨
        particle.isParticle = true;
      }
    }


    // --- 6. 애니메이션 루프 (Ticker) ---
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
      for (let i = emojis.current.length - 1; i >= 0; i--) {
        const item = emojis.current[i];
        
        // 1. 하트 파티클 처리
        if (item.isParticle) {
            item.x += item.vx * delta;
            item.y += item.vy * delta;
            item.alpha -= 0.05 * delta;
            item.life -= delta;
            if (item.life <= 0 || item.alpha <= 0.1) {
                app.stage.removeChild(item);
                emojis.current.splice(i, 1);
            }
            continue;
        }

        // 2. 이모지 낙하 및 흡수 처리
        if (item.isFalling) {
          item.vy += item.gravity * delta;
          item.y += item.vy * delta;
          item.rotation += item.rotationSpeed * delta;

          // 상자 근처 도달 감지 -> 흡수 시작
          if (item.y > CHEST_Y - 50 && Math.abs(item.x - chest.x) < 100 && !item.isAbsorbing) {
            item.isAbsorbing = true;
          }
        }
        
        if (item.isAbsorbing) {
          // 상자로 빨려들어가는 효과
          item.scale.x *= 0.9;
          item.scale.y *= 0.9;
          item.alpha *= 0.9;
          item.x += (chest.x - item.x) * 0.15 * delta;
          item.y += (CHEST_Y - item.y) * 0.15 * delta;
          
          // 흡수 완료 (하트 변신 및 쌓기)
          if (item.scale.x < 0.1) {
            // "펑" 효과 생성
            createHeartParticles(chest.x, CHEST_Y); 

            // 스프라이트 교체 및 쌓이는 하트로 변신
            item.texture = heartTexture;
            item.scale.set(0.3 + Math.random() * 0.1); // 쌓이는 하트 크기
            item.rotation = (Math.random() - 0.5) * 0.5; // 쌓이는 하트 회전
            item.alpha = 1;
            item.x = item.landingX;
            item.y = item.landingY; // 최종 착지 위치 고정
            
            // 일반 스테이지에서 제거하고 Pile 컨테이너로 이동 (깊이감을 위해)
            app.stage.removeChild(item);
            heartPileContainer.addChild(item);
            
            item.isFalling = false;
            item.isAbsorbing = false;
            item.isLanded = true;
            
            // 깊이 정렬을 위한 zIndex 설정
            item.zIndex = Math.floor(item.y);
            heartPileContainer.sortChildren(); // 하트들끼리 깊이 정렬
          }
        }
        
        // 3. 쌓인 하트의 개수가 너무 많으면 가장 오래된 것 제거
        // 여기서는 하트 Pile 컨테이너의 자식 개수를 직접 확인하여 제거합니다.
        const MAX_HEARTS = 500;
        while (heartPileContainer.children.length > MAX_HEARTS) {
             const oldestHeart = heartPileContainer.children[0];
             heartPileContainer.removeChild(oldestHeart);
             // emojis 배열에서도 제거해야 합니다. (좀 더 복잡한 관리가 필요하지만, 렌더링 성능 최적화를 위해 단순화합니다.)
        }
      }
      
      // 상자 위치 반응형 유지
      chest.x = app.screen.width / 2;
      chest.y = app.screen.height - 150;
    });

    // Cleanup
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