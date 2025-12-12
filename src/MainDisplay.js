import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { db } from './firebase';

const MainDisplay = () => {
  const canvasRef = useRef(null);
  const incomingQueue = useRef([]);
  const appRef = useRef(null);

  useEffect(() => {
    // --- 1. Pixi.js 초기화 ---
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

    if (canvasRef.current) {
      canvasRef.current.appendChild(app.view);
    }

    // 배경 그라데이션 효과 (Graphics 사용)
    const background = new PIXI.Graphics();
    background.beginRadialFill([0x512b58, 0x2c1055, 0x000000], [0, 0.4, 1], WIDTH / 2, HEIGHT, HEIGHT * 0.5);
    background.drawRect(0, 0, WIDTH, HEIGHT);
    background.endFill();
    app.stage.addChild(background);

    // 상자 레이어 및 하트 더미 레이어 분리
    const pileLayer = new PIXI.Container();
    pileLayer.sortableChildren = true;
    app.stage.addChild(pileLayer);

    // 상자 스프라이트 (상자는 고정 위치)
    const chestStyle = new PIXI.TextStyle({ fontSize: 120 });
    const chest = new PIXI.Text('🎁', chestStyle);
    chest.anchor.set(0.5);
    chest.x = WIDTH / 2;
    chest.y = HEIGHT * 0.75;
    chest.zIndex = 10;
    app.stage.addChild(chest);

    const activeEmojis = [];
    const MAX_EMOJIS = 1500;

    // 텍스트를 텍스처로 캐싱 (성능 최적화)
    const textureCache = {};
    const getCachedTexture = (char) => {
      if (textureCache[char]) return textureCache[char];
      const style = new PIXI.TextStyle({ 
        fontSize: 80, 
        fontFamily: 'Noto Color Emoji, sans-serif' 
      });
      const text = new PIXI.Text(char, style);
      const texture = app.renderer.generateTexture(text);
      textureCache[char] = texture;
      return texture;
    };

    // 하트 텍스처 미리 생성
    const heartTexture = getCachedTexture('❤️');

    // --- 2. 이모지 생성 함수 ---
    const createEmojiSprite = (emojiChar) => {
      const texture = getCachedTexture(emojiChar);
      const sprite = new PIXI.Sprite(texture);
      
      sprite.anchor.set(0.5);
      sprite.x = WIDTH / 2; // 상자 위치에서 발사되는 느낌
      sprite.y = HEIGHT;
      sprite.scale.set(0.4);

      // 물리 속성
      sprite.isFlying = true;
      sprite.rotationSpeed = (Math.random() - 0.5) * 0.2;
      
      // 최종 착지 목표 지점 (상자 주변으로 랜덤하게 쌓임)
      const range = 200;
      sprite.finalX = (WIDTH / 2) + (Math.random() - 0.5) * range;
      sprite.finalY = (HEIGHT * 0.65) + (Math.random() * 150);
      
      // 포물선 발사 속도 계산
      sprite.vx = (sprite.finalX - sprite.x) * 0.03 + (Math.random() - 0.5) * 4;
      sprite.vy = -20 - Math.random() * 10; // 위로 솟구치는 힘
      sprite.gravity = 0.8;
      sprite.alpha = 0;

      pileLayer.addChild(sprite);
      activeEmojis.push(sprite);
    };

    // --- 3. Firebase 리스너 ---
    const startTime = Date.now();
    const inputRef = db.ref('inputs').orderByChild('timestamp').startAt(startTime);
    
    inputRef.on('child_added', (snapshot) => {
      const data = snapshot.val();
      if (data?.emoji) {
        incomingQueue.current.push(data.emoji);
      }
    });

    // --- 4. 애니메이션 루프 (Ticker) ---
    app.ticker.add((delta) => {
      // 버퍼링 큐 처리 (한 프레임당 최대 5개씩 생성)
      let count = 0;
      while (incomingQueue.current.length > 0 && count < 5) {
        createEmojiSprite(incomingQueue.current.shift());
        count++;
      }

      const now = performance.now();

      for (let i = activeEmojis.length - 1; i >= 0; i--) {
        const sprite = activeEmojis[i];

        if (sprite.isFlying) {
          // 공중 동작
          sprite.vy += sprite.gravity * delta;
          sprite.x += sprite.vx * delta;
          sprite.y += sprite.vy * delta;
          sprite.rotation += sprite.rotationSpeed * delta;
          sprite.alpha = Math.min(1, sprite.alpha + 0.1 * delta);

          // 착지 조건 (목표 Y에 도달하거나 떨어지는 중일 때)
          if (sprite.vy > 0 && sprite.y >= sprite.finalY) {
            sprite.isFlying = false;
            sprite.y = sprite.finalY;
            sprite.x = sprite.finalX;
            sprite.vx = 0;
            sprite.vy = 0;
            sprite.rotation = (Math.random() - 0.5) * 0.4;
            
            // ❤️로 변신 및 크기 조절
            sprite.texture = heartTexture;
            sprite.scale.set(0.35);
            
            // 쌓이는 순서 정렬 (Y축 기준)
            sprite.zIndex = Math.floor(sprite.y);
            pileLayer.sortChildren();
          }
        }
      }

      // 최대 개수 제한 (메모리 관리)
      if (activeEmojis.length > MAX_EMOJIS) {
        const oldest = activeEmojis.shift();
        pileLayer.removeChild(oldest);
        oldest.destroy();
      }
    });

    // 반응형 대응
    const handleResize = () => {
      const parent = canvasRef.current.parentElement;
      if (parent) {
        const scale = Math.min(parent.clientWidth / WIDTH, parent.clientHeight / HEIGHT);
        app.view.style.width = `${WIDTH * scale}px`;
        app.view.style.height = `${HEIGHT * scale}px`;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      inputRef.off();
      window.removeEventListener('resize', handleResize);
      app.destroy(true, { children: true });
    };
  }, []);

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      align-items: 'center', 
      background: '#000',
      overflow: 'hidden' 
    }}>
      <div ref={canvasRef} style={{ position: 'relative' }} />
    </div>
  );
};

export default MainDisplay;