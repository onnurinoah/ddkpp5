import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { db } from './firebase';

const MainDisplay = () => {
  const canvasRef = useRef(null);
  const incomingQueue = useRef([]);
  const appRef = useRef(null);
  // 텍스처 캐시를 ref로 관리하여 재생성 방지
  const textureCacheRef = useRef({}); 

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
      // v7에서는 view가 자동 생성되지만, v8 대비용 옵션 (v7에서도 문제 없음)
      hello: true, 
    });
    appRef.current = app;

    if (canvasRef.current) {
      canvasRef.current.appendChild(app.view);
    }

    // 배경 그라데이션
    const background = new PIXI.Graphics();
    background.beginRadialFill([0x512b58, 0x2c1055, 0x000000], [0, 0.4, 1], WIDTH / 2, HEIGHT, HEIGHT * 0.8); // 그라데이션 반경 약간 키움
    background.drawRect(0, 0, WIDTH, HEIGHT);
    background.endFill();
    app.stage.addChild(background);

    // 레이어 설정
    const pileLayer = new PIXI.Container();
    pileLayer.sortableChildren = true; // zIndex 사용 활성화
    app.stage.addChild(pileLayer);

    // 상자 (Text 대신 Sprite 추천하지만 Text도 무방)
    const chestStyle = new PIXI.TextStyle({ fontSize: 120 });
    const chest = new PIXI.Text('🎁', chestStyle);
    chest.anchor.set(0.5);
    chest.x = WIDTH / 2;
    chest.y = HEIGHT * 0.75;
    chest.zIndex = 99999; // 상자는 항상 맨 위에 보이게
    pileLayer.addChild(chest); // 상자도 pileLayer에 넣어서 같이 정렬되거나, 별도 레이어로 분리

    const activeEmojis = [];
    const MAX_EMOJIS = 1500;

    // 텍스처 캐싱 함수
    const getCachedTexture = (char) => {
      if (textureCacheRef.current[char]) return textureCacheRef.current[char];
      
      const style = new PIXI.TextStyle({ 
        fontSize: 80, 
        fontFamily: '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif', // 폰트 호환성 추가
        padding: 10 // 텍스트 짤림 방지
      });
      const text = new PIXI.Text(char, style);
      
      // resolution을 높여서 텍스처가 깨지지 않게 함
      const texture = app.renderer.generateTexture(text, { resolution: 2, scaleMode: PIXI.SCALE_MODES.LINEAR });
      textureCacheRef.current[char] = texture;
      
      // 메모리 누수 방지용: 텍스트 객체는 바로 파괴 (텍스처만 남김)
      text.destroy(); 
      
      return texture;
    };

    const heartTexture = getCachedTexture('❤️');

    // --- 2. 이모지 생성 함수 ---
    const createEmojiSprite = (emojiChar) => {
      const texture = getCachedTexture(emojiChar);
      const sprite = new PIXI.Sprite(texture);
      
      sprite.anchor.set(0.5);
      // [수정] 상자 위치에서 튀어나오도록 조정
      sprite.x = WIDTH / 2; 
      sprite.y = HEIGHT * 0.70; // 상자 약간 위쪽
      sprite.scale.set(0.1); // 작게 시작해서 커지는 연출 추가 가능

      // 물리 속성
      sprite.isFlying = true;
      sprite.rotationSpeed = (Math.random() - 0.5) * 0.3;
      
      const range = 250; // 퍼지는 범위 약간 확대
      sprite.finalX = (WIDTH / 2) + (Math.random() - 0.5) * range;
      // 상자 주변 아래쪽에 쌓이도록 y 좌표 조정
      sprite.finalY = (HEIGHT * 0.75) + (Math.random() * 100);
      
      // 발사 속도
      sprite.vx = (sprite.finalX - sprite.x) * 0.05 + (Math.random() - 0.5) * 2;
      sprite.vy = -15 - Math.random() * 15; // 위로 솟구치는 힘
      sprite.gravity = 0.8;
      sprite.alpha = 1;

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

    // --- 4. 애니메이션 루프 ---
    app.ticker.add((delta) => {
      // 1. 큐 처리
      let count = 0;
      // 한 번에 너무 많이 생성하면 렉 걸리므로 제한 (5 -> 3~4 정도로 조절 가능)
      while (incomingQueue.current.length > 0 && count < 5) {
        createEmojiSprite(incomingQueue.current.shift());
        count++;
      }

      const now = performance.now();
      let needsSort = false; // [최적화] 정렬이 필요한지 체크하는 플래그

      // 2. 이모지 업데이트 (역순 순회 권장: 삭제 시 인덱스 문제 방지)
      for (let i = activeEmojis.length - 1; i >= 0; i--) {
        const sprite = activeEmojis[i];

        if (sprite.isFlying) {
          sprite.vy += sprite.gravity * delta;
          sprite.x += sprite.vx * delta;
          sprite.y += sprite.vy * delta;
          sprite.rotation += sprite.rotationSpeed * delta;
          
          // 팝업 효과 (작았다가 커짐)
          if (sprite.scale.x < 0.4) {
            sprite.scale.set(sprite.scale.x + 0.02 * delta);
          }

          // 착지 조건
          if (sprite.vy > 0 && sprite.y >= sprite.finalY) {
            sprite.isFlying = false;
            sprite.y = sprite.finalY;
            sprite.x = sprite.finalX;
            sprite.vx = 0;
            sprite.vy = 0;
            sprite.rotation = (Math.random() - 0.5) * 0.4;
            
            // [옵션] 하트로 변신 (원하는 경우 유지, 아니면 주석 처리)
            sprite.texture = heartTexture;
            sprite.scale.set(0.35);
            
            // Y축 기준 zIndex 설정 (아래에 있는게 더 앞에 보이도록)
            sprite.zIndex = Math.floor(sprite.y);
            needsSort = true; // 착지한 놈이 있을 때만 정렬 예약
          }
        }
      }

      // [최적화] 루프 밖에서 한 번만 정렬
      if (needsSort) {
        pileLayer.sortChildren();
      }

      // 3. 오래된 이모지 제거 (페이드 아웃 효과 추가)
      if (activeEmojis.length > MAX_EMOJIS) {
        const diff = activeEmojis.length - MAX_EMOJIS;
        for(let i = 0; i < diff; i++) {
            const oldest = activeEmojis[i];
            // 바로 삭제하지 않고 투명도를 낮추다가 삭제하는 로직 추가 가능
            // 여기서는 단순 삭제
            pileLayer.removeChild(oldest);
            oldest.destroy();
        }
        activeEmojis.splice(0, diff); // 배열에서 제거
      }
    });

    const handleResize = () => {
      const parent = canvasRef.current?.parentElement;
      if (parent && app.view) {
        const scale = Math.min(parent.clientWidth / WIDTH, parent.clientHeight / HEIGHT);
        app.view.style.width = `${WIDTH * scale}px`;
        app.view.style.height = `${HEIGHT * scale}px`;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      inputRef.off('child_added', onChildAdded);
      window.removeEventListener('resize', handleResize);
      app.destroy(true, { children: true });
      
      // 텍스처 캐시 정리
      Object.values(textureCacheRef.current).forEach(t => t.destroy(true));
    };
  }, []);

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', // 오타 수정 align-items -> alignItems
      background: '#000',
      overflow: 'hidden' 
    }}>
      <div ref={canvasRef} />
    </div>
  );
};

export default MainDisplay;