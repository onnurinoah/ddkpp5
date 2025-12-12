import React, { useEffect, useRef } from 'react';
// PixiJS v8 에서는 'pixi.js'에서 직접 가져옵니다.
import { Application, Graphics, Container, Text, TextStyle, Sprite } from 'pixi.js';
import { db } from './firebase';

const MainDisplay = () => {
  const canvasContainerRef = useRef(null); // 캔버스를 담을 div
  const incomingQueue = useRef([]);
  const appRef = useRef(null);
  const textureCacheRef = useRef({}); // 텍스처 재사용을 위한 캐시

  useEffect(() => {
    // 비동기 초기화를 위한 함수 선언
    const initPixi = async () => {
      const WIDTH = 1280;
      const HEIGHT = 720;

      // --- 1. PixiJS v8 초기화 (비동기) ---
      const app = new Application();
      // v8은 init()을 await로 호출해야 합니다.
      await app.init({
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: '#000000', // background -> backgroundColor로 변경됨
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      
      appRef.current = app;

      // DOM에 캔버스 추가 (v8은 app.view 대신 app.canvas 사용)
      if (canvasContainerRef.current) {
        canvasContainerRef.current.appendChild(app.canvas);
      }

      // --- 배경 및 레이어 설정 ---
      const background = new Graphics();
      // v8 그라데이션 문법 (약간 다를 수 있으나 v7 호환성 유지 시도)
      background.rect(0, 0, WIDTH, HEIGHT);
      background.fill({
         texture: app.renderer.generateTexture(new Graphics().circle(WIDTH/2, HEIGHT*0.8, HEIGHT).fill({
             colors: [0x512b58, 0x2c1055, 0x000000], stops: [0, 0.4, 1], type: 'radial'
         }))
      });
      app.stage.addChild(background);

      // 쌓이는 레이어
      const pileLayer = new Container();
      pileLayer.sortableChildren = true; 
      app.stage.addChild(pileLayer);

      // 상자
      const chestStyle = new TextStyle({ fontSize: 130 }); // 크기 약간 키움
      const chest = new Text({ text: '🎁', style: chestStyle });
      chest.anchor.set(0.5);
      chest.x = WIDTH / 2;
      chest.y = HEIGHT * 0.72; // 위치 조정
      chest.zIndex = 99999; 
      pileLayer.addChild(chest);

      const activeEmojis = [];
      const MAX_EMOJIS = 1500;
      // 기본 스케일 정의
      const BASE_SCALE = 0.35; 

      // --- 텍스처 캐싱 함수 (v8 호환) ---
      const getCachedTexture = (char) => {
        if (textureCacheRef.current[char]) return textureCacheRef.current[char];
        
        const style = new TextStyle({ 
          fontSize: 100, // 고해상도를 위해 폰트 크기 키움
          fontFamily: '"Noto Color Emoji", "Apple Color Emoji", sans-serif',
          padding: 10
        });
        const text = new Text({ text: char, style });
        
        // v8 텍스처 생성 방식
        const texture = app.renderer.generateTexture({ target: text, resolution: 2 });
        textureCacheRef.current[char] = texture;
        text.destroy();
        return texture;
      };

      // 하트 텍스처 미리 준비
      const heartTexture = getCachedTexture('❤️');

      // --- 2. ✨ 이모지 생성 함수 (효과 업그레이드) ---
      const createEmojiSprite = (emojiChar) => {
        const texture = getCachedTexture(emojiChar);
        const sprite = new Sprite(texture);
        
        sprite.anchor.set(0.5);
        sprite.x = WIDTH / 2 + (Math.random()-0.5) * 40; // 상자 입구에서 약간 랜덤하게 발사
        sprite.y = HEIGHT * 0.68; 

        // ✨ [효과 1] 스폰 팝업: 0에서 시작해서 커짐
        sprite.scale.set(0); 
        sprite.targetScale = BASE_SCALE * (0.9 + Math.random() * 0.3); // 최종 크기도 약간 랜덤

        // 물리 및 상태 속성
        sprite.state = 'flying'; // 'flying' | 'landing_squash' | 'landed'
        sprite.rotationSpeed = (Math.random() - 0.5) * 0.2;
        
        const range = 280; 
        sprite.finalX = (WIDTH / 2) + (Math.random() - 0.5) * range;
        // 상자 앞쪽으로 쌓이도록 원근감 표현
        sprite.finalY = (HEIGHT * 0.78) + (Math.random() * 80); 
        sprite.zIndex = Math.floor(sprite.finalY); // 미리 zIndex 설정

        // 발사 속도 계산
        const duration = 60; // 대략 60프레임 동안 비행
        sprite.vx = (sprite.finalX - sprite.x) / duration;
        // 목표 지점에 도달하기 위한 초기 Y 속도 및 중력 계산 (간이 물리식)
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
      app.ticker.add((ticker) => {
        const delta = ticker.deltaTime; // v8 방식

        // 큐 처리 (한번에 최대 4개)
        let count = 0;
        while (incomingQueue.current.length > 0 && count < 4) {
          createEmojiSprite(incomingQueue.current.shift());
          count++;
        }

        let needsSort = false;

        // 이모지 업데이트 (역순 반복)
        for (let i = activeEmojis.length - 1; i >= 0; i--) {
          const sprite = activeEmojis[i];

          // ✨ [효과 1] 스폰 팝업 애니메이션
          if (sprite.scale.x < sprite.targetScale) {
              // 부드럽게 커지는 선형 보간
              sprite.scale.set(sprite.scale.x + (sprite.targetScale - sprite.scale.x) * 0.1 * delta);
          }

          // 상태별 로직
          if (sprite.state === 'flying') {
            sprite.vy += sprite.gravity * delta;
            sprite.x += sprite.vx * delta;
            sprite.y += sprite.vy * delta;
            sprite.rotation += sprite.rotationSpeed * delta;

            // 착지 조건 감지
            if (sprite.y >= sprite.finalY && sprite.vy > 0) {
              sprite.y = sprite.finalY;
              sprite.x = sprite.finalX;
              sprite.rotation = (Math.random() - 0.5) * 0.3; // 랜덤한 착지 각도
              
              // ✨ [효과 2] 착지 젤리 효과 시작 (Squash)
              sprite.state = 'landing_squash';
              // 납작해짐 (X는 넓어지고 Y는 줄어듦)
              sprite.scale.x = sprite.targetScale * 1.4; 
              sprite.scale.y = sprite.targetScale * 0.6;
              sprite.squashVelocity = 0; // 젤리 복원 속도

              // 하트로 변신 (옵션)
              sprite.texture = heartTexture;
              
              needsSort = true;
            }
          } else if (sprite.state === 'landing_squash') {
             // ✨ [효과 2] 젤리 탄성 복원 애니메이션 (스프링 물리)
             const stiffness = 0.2; // 탄성
             const damping = 0.7;   // 감쇠 (마찰)
             const targetX = sprite.targetScale;
             
             // 현재 스케일과 목표 스케일의 차이에 비례하는 힘 적용
             const forceX = (targetX - sprite.scale.x) * stiffness;
             sprite.squashVelocity += forceX;
             sprite.squashVelocity *= damping; // 속도 감쇠
             sprite.scale.x += sprite.squashVelocity * delta;
             
             // Y 스케일은 부피 유지를 위해 X의 역수로 설정 (간이 방식)
             // X가 커지면 Y가 작아지고, X가 작아지면 Y가 커짐
             sprite.scale.y = targetX * (targetX / sprite.scale.x);

             // 거의 원래 크기로 돌아왔고 속도가 줄었으면 착지 완료 처리
             if (Math.abs(sprite.scale.x - targetX) < 0.01 && Math.abs(sprite.squashVelocity) < 0.01) {
                 sprite.scale.set(targetX); // 최종 크기 고정
                 sprite.state = 'landed';
             }
          }
          // 'landed' 상태는 아무것도 안함 (가만히 있음)
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
        if (canvasContainerRef.current && app.canvas) {
          const parent = canvasContainerRef.current;
          const scale = Math.min(parent.clientWidth / WIDTH, parent.clientHeight / HEIGHT);
          app.canvas.style.width = `${WIDTH * scale}px`;
          app.canvas.style.height = `${HEIGHT * scale}px`;
          // 화면 중앙 정렬을 위한 마진 설정
          app.canvas.style.marginLeft = `${(parent.clientWidth - WIDTH * scale) / 2}px`;
          app.canvas.style.marginTop = `${(parent.clientHeight - HEIGHT * scale) / 2}px`;
        }
      };
      window.addEventListener('resize', handleResize);
      handleResize();

      // 클린업 함수 저장
      appRef.current.cleanup = () => {
          inputRef.off('child_added', onChildAdded);
          window.removeEventListener('resize', handleResize);
          // 텍스처 캐시 정리
          Object.values(textureCacheRef.current).forEach(t => t.destroy(true));
          app.destroy(true, { children: true });
      };
    };

    initPixi(); // 초기화 실행

    return () => {
        // 컴포넌트 언마운트 시 클린업 실행
        if (appRef.current && appRef.current.cleanup) {
            appRef.current.cleanup();
        }
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
        position: 'relative' // 캔버스 위치를 잡기 위해
      }}
    />
  );
};

export default MainDisplay;