import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js'; 
import { db } from './firebase';

// 🚨 파일 경로를 확인하세요. (예: src 폴더 안에 assets 폴더)
import backgroundImage from './assets/IMG_4840.JPG'; 

const MainDisplay = () => {
  const canvasContainerRef = useRef(null); 
  const incomingQueue = useRef([]);
  const appRef = useRef(null);
  const textureCacheRef = useRef({}); 
  
  // 🚨 이모지 입력 페이지의 QR 코드 이미지 경로 (이 변수는 사용되지 않지만 정의는 남겨둡니다)
  const QR_IMAGE_PATH = '/assets/input_qr.png';
  
  // 🚨 이모지 발사 위치와 착지 영역 설정을 위한 변수
  const START_Y_RATIO = 0.85; // 이모지가 시작되는 y축 비율 (화면 하단)
  const FINAL_Y_RANGE = 180;  // 최종 착지 영역의 y축 범위 (더 넓게)
  const FINAL_X_RANGE = 700;  // 최종 착지 영역의 x축 범위 (화면을 넓게 사용)
  const LANDING_Y_START = 0.65; // 착지 영역이 시작되는 y축 비율 (화면 중앙 하단)
  
  // 🚨 [새로운 설정] 속도와 처리량 관련 상수
  const FLIGHT_DURATION_FRAMES = 120; // 비행 시간: 60 -> 120 프레임 (약 2초)로 두 배 느리게
  const MAX_EMOJIS_PER_TICK = 10;   // 틱당 처리 이모지 수: 4 -> 10으로 증가 (실시간 처리량 개선)
  const GRAVITY = 0.3;              // 중력 감소 (0.5 -> 0.3)로 더 부드럽게 상승/하강
  
  useEffect(() => {
    
    // --- 1. PixiJS v7 초기화 (동기) ---
    const WIDTH = 1280;
    const HEIGHT = 720;

    const app = new PIXI.Application({
      width: WIDTH,
      height: HEIGHT,
      background: '#000000', 
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    
    appRef.current = app;

    // DOM에 캔버스 추가 (v7은 app.view 사용)
    if (canvasContainerRef.current) {
      canvasContainerRef.current.appendChild(app.view);
    }

    // --- 배경 이미지 설정 ---
    const backgroundTexture = PIXI.Texture.from(backgroundImage);
    const background = new PIXI.Sprite(backgroundTexture);
    background.width = WIDTH;
    background.height = HEIGHT;
    app.stage.addChild(background);

    // 쌓이는 레이어
    const pileLayer = new PIXI.Container();
    pileLayer.sortableChildren = true; 
    app.stage.addChild(pileLayer);

    const activeEmojis = [];
    const MAX_EMOJIS = 1500;
    const BASE_SCALE = 0.35; 

    // --- 텍스처 캐싱 함수 ---
    const getCachedTexture = (char) => {
      if (textureCacheRef.current[char]) return textureCacheRef.current[char];
      
      const style = new PIXI.TextStyle({ 
        fontSize: 100, 
        fontFamily: '"Noto Color Emoji", "Apple Color Emoji", sans-serif',
        padding: 10
      });
      const text = new PIXI.Text(char, style);
      
      const texture = app.renderer.generateTexture(text, { resolution: 2, scaleMode: PIXI.SCALE_MODES.LINEAR });
      textureCacheRef.current[char] = texture;
      text.destroy(); 
      return texture;
    };

    const heartTexture = getCachedTexture('❤️');

    // --- 2. 이모지 생성 함수 ---
    const createEmojiSprite = (emojiChar) => {
      const texture = getCachedTexture(emojiChar);
      const sprite = new PIXI.Sprite(texture);
      
      sprite.anchor.set(0.5);
      
      // 시작 위치
      sprite.x = WIDTH / 2 + (Math.random()-0.5) * 80; 
      sprite.y = HEIGHT * START_Y_RATIO; 

      sprite.scale.set(0); 
      sprite.targetScale = BASE_SCALE * (0.9 + Math.random() * 0.3); 

      // 물리 및 상태 속성
      sprite.state = 'flying'; 
      sprite.rotationSpeed = (Math.random() - 0.5) * 0.2;
      
      // 도착 위치
      sprite.finalX = (WIDTH / 2) + (Math.random() - 0.5) * FINAL_X_RANGE; 
      sprite.finalY = (HEIGHT * LANDING_Y_START) + (Math.random() * FINAL_Y_RANGE); 
      sprite.zIndex = Math.floor(sprite.finalY); 

      // 🚨 [속도 변경] 비행 시간을 새로운 상수로 설정
      const duration = FLIGHT_DURATION_FRAMES; 
      sprite.vx = (sprite.finalX - sprite.x) / duration;
      
      // 🚨 [속도 변경] 중력을 새로운 상수로 설정
      sprite.gravity = GRAVITY;
      
      // V0y 계산
      sprite.vy = (sprite.finalY - sprite.y - 0.5 * sprite.gravity * duration * duration) / duration;

      pileLayer.addChild(sprite);
      activeEmojis.push(sprite);
    };

    // --- 3. Firebase 리스너 ---
    const startTime = Date.now();
    const inputRef = db.ref('inputs').orderByChild('timestamp').startAt(startTime);
    
    const onChildAdded = (snapshot) => {
      const data = snapshot.val();
      if (data?.emoji) {
        incomingQueue.current.push(data.emoji);
      }
    };
    inputRef.on('child_added', onChildAdded);

    // --- 4. 애니메이션 루프 (Ticker) ---
    app.ticker.add((delta) => {
        
      // 🚨 [실시간 처리량 증가] 틱당 처리하는 이모지 수를 증가
      let count = 0;
      while (incomingQueue.current.length > 0 && count < MAX_EMOJIS_PER_TICK) {
        createEmojiSprite(incomingQueue.current.shift());
        count++;
      }

      let needsSort = false;
      const tickerDelta = app.ticker.deltaTime; 

      // 이모지 업데이트
      for (let i = activeEmojis.length - 1; i >= 0; i--) {
        const sprite = activeEmojis[i];

        // ✨ [효과 1] 스폰 팝업 애니메이션
        if (sprite.scale.x < sprite.targetScale) {
            sprite.scale.set(sprite.scale.x + (sprite.targetScale - sprite.scale.x) * 0.1 * tickerDelta);
        }

        if (sprite.state === 'flying') {
          sprite.vy += sprite.gravity * tickerDelta;
          sprite.x += sprite.vx * tickerDelta;
          sprite.y += sprite.vy * tickerDelta;
          sprite.rotation += sprite.rotationSpeed * tickerDelta;

          // 착지 조건 감지
          if (sprite.y >= sprite.finalY && sprite.vy > 0) {
            sprite.y = sprite.finalY;
            sprite.x = sprite.finalX;
            sprite.rotation = (Math.random() - 0.5) * 0.3; 
            
            // ✨ [효과 2] 착지 젤리 효과 시작 (Squash)
            sprite.state = 'landing_squash';
            sprite.scale.x = sprite.targetScale * 1.4; 
            sprite.scale.y = sprite.targetScale * 0.6;
            sprite.squashVelocity = 0; 

            sprite.texture = heartTexture;
            needsSort = true;
          }
        } else if (sprite.state === 'landing_squash') {
           // ✨ [효과 2] 젤리 탄성 복원 애니메이션
           const stiffness = 0.2; 
           const damping = 0.7;   
           const targetX = sprite.targetScale;
           
           const forceX = (targetX - sprite.scale.x) * stiffness;
           sprite.squashVelocity += forceX;
           sprite.squashVelocity *= damping; 
           sprite.scale.x += sprite.squashVelocity * tickerDelta;
           
           sprite.scale.y = targetX * (targetX / sprite.scale.x);

           if (Math.abs(sprite.scale.x - targetX) < 0.01 && Math.abs(sprite.squashVelocity) < 0.01) {
               sprite.scale.set(targetX); 
               sprite.state = 'landed';
           }
        }
      }

      if (needsSort) pileLayer.sortChildren();

      // 메모리 관리: 오래된 것 제거
      if (activeEmojis.length > MAX_EMOJIS) {
          const diff = activeEmojis.length - MAX_EMOJIS;
          for(let i = 0; i < diff; i++) {
              const oldest = activeEmojis[i];
              pileLayer.removeChild(oldest);
              oldest.destroy();
          }
          activeEmojis.splice(0, diff);
      }
    });

    // 반응형 처리
    const handleResize = () => {
      if (canvasContainerRef.current && app.view) {
        const parent = canvasContainerRef.current;
        const scale = Math.min(parent.clientWidth / WIDTH, parent.clientHeight / HEIGHT);
        app.view.style.width = `${WIDTH * scale}px`;
        app.view.style.height = `${HEIGHT * scale}px`;
        app.view.style.marginLeft = `${(parent.clientWidth - WIDTH * scale) / 2}px`;
        app.view.style.marginTop = `${(parent.clientHeight - HEIGHT * scale) / 2}px`;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // 클린업
    return () => {
        inputRef.off('child_added', onChildAdded);
        window.removeEventListener('resize', handleResize);
        Object.values(textureCacheRef.current).forEach(t => t.destroy(true));
        app.destroy(true, { children: true });
    };
  }, []);

  return (
    <div 
      ref={canvasContainerRef} 
      style={{ 
        width: '100vw', 
        height: '100vh', 
        background: '#000',
        overflow: 'hidden',
        position: 'relative'
      }}
    />
  );
};

export default MainDisplay;