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

    // 상자
    const chestStyle = new PIXI.TextStyle({ fontSize: 130 });
    const chest = new PIXI.Text('🎁', chestStyle);
    chest.anchor.set(0.5);
    chest.x = WIDTH / 2;
    chest.y = HEIGHT * 0.72;
    chest.zIndex = 99999; 
    pileLayer.addChild(chest);

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
      sprite.x = WIDTH / 2 + (Math.random()-0.5) * 40; 
      sprite.y = HEIGHT * 0.68; 

      sprite.scale.set(0); 
      sprite.targetScale = BASE_SCALE * (0.9 + Math.random() * 0.3); 

      // 물리 및 상태 속성
      sprite.state = 'flying'; 
      sprite.rotationSpeed = (Math.random() - 0.5) * 0.2;
      
      const range = 280; 
      sprite.finalX = (WIDTH / 2) + (Math.random() - 0.5) * range;
      sprite.finalY = (HEIGHT * 0.78) + (Math.random() * 80); 
      sprite.zIndex = Math.floor(sprite.finalY); 

      // 발사 속도 계산
      const duration = 60; 
      sprite.vx = (sprite.finalX - sprite.x) / duration;
      sprite.gravity = 0.5;
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
        
      let count = 0;
      while (incomingQueue.current.length > 0 && count < 4) {
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