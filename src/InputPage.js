// src/InputPage.js
import React, { useState } from 'react';
import { db } from './firebase';
import firebase from 'firebase/compat/app';
import './InputPage.css';

const InputPage = () => {
  const [emoji, setEmoji] = useState('');
  const [status, setStatus] = useState('default');
  
  // 🚨 [수정 1] 시뮬레이션 상태 및 진행률 State 추가
  const [simulationStatus, setSimulationStatus] = useState('default');
  const [currentCount, setCurrentCount] = useState(0);
  const [totalLimit, setTotalLimit] = useState(1000); // 총 개수를 상태로 저장

  const sendEmoji = () => {
    // ... 기존 sendEmoji 함수 내용 유지
    if (!emoji.trim()) return;
    setStatus('loading');

    db.ref('inputs').push({
      emoji: emoji.trim(),
      timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
      setStatus('success');
      setEmoji('');
      setTimeout(() => setStatus('default'), 1500);
    }).catch((err) => {
      console.error(err);
      alert('전송 실패');
      setStatus('default');
    });
  };

  // 🚨 [수정 2] runSimulation 함수: State 업데이트 로직 추가
  const runSimulation = () => {
    // 이미 진행 중이면 실행하지 않음
    if (simulationStatus !== 'default') return;

    setSimulationStatus('running');
    setCurrentCount(0); // 시작 시 카운트 초기화

    const totalEmojis = 1000;
    const durationSeconds = 60;
    const intervalMs = (durationSeconds / totalEmojis) * 1000;
    const testEmojis = ['❤️', '🔥', '🎉', '🌟', '👍', '🙏', '✨'];
    let count = 0; // 지역 변수 count는 내부 로직에만 사용

    setTotalLimit(totalEmojis); // 총 개수 State 업데이트
    console.log(`[시뮬레이션 시작] 1분 동안 총 ${totalEmojis}개의 이모지를 약 ${intervalMs.toFixed(2)}ms 간격으로 발송합니다.`);

    const intervalId = setInterval(() => {
        if (count >= totalEmojis) {
            clearInterval(intervalId);
            setSimulationStatus('finished');
            console.log('--- 시뮬레이션 완료: 1000개 발송 완료 ---');
            setTimeout(() => setSimulationStatus('default'), 5000);
            return;
        }

        const randomEmoji = testEmojis[Math.floor(Math.random() * testEmojis.length)];

        db.ref('inputs').push({
            emoji: randomEmoji,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        })
        .then(() => {
            count++;
            setCurrentCount(count); // 🚨 State 업데이트: 렌더링을 위해 필요
            if (count % 100 === 0) {
                 console.log(`[진행] ${count}개 발송 완료...`);
            }
        })
        .catch(error => {
            console.error("Firebase 푸시 오류:", error);
            clearInterval(intervalId);
            setSimulationStatus('default');
        });

    }, intervalMs);
  };
  // 🚨 [수정 2] runSimulation 함수 끝

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') sendEmoji();
  };
  
  // 🚨 [수정 3] 렌더링 부분: State를 사용하여 진행률 표시
  const progressPercentage = totalLimit > 0 ? Math.round(100 * (currentCount / totalLimit)) : 0;

  return (
    <div className="input-page-wrapper">
      <div className="input-container-box">
        <h1>상자 채우기</h1>
        <p>당신의 추억 이모지를 골라<br/>상자로 던져주세요!</p>
        
        <div className="input-group-styled">
          <input 
            type="text" 
            className="emoji-input-styled"
            placeholder="✨" 
            maxLength="5"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            onKeyPress={handleKeyPress}
            enterKeyHint="send"
          />
        </div>
        
        <button 
          className={`send-btn-styled ${status === 'success' ? 'success' : ''}`}
          onClick={sendEmoji}
          disabled={status !== 'default'}
        >
          {status === 'loading' ? "보내는 중... 🔄" : 
           status === 'success' ? "🎉 전송 성공!" : 
           "상자로 던지기! 🚀"}
        </button>

        {/* 🚨 [수정 3] State를 사용하여 진행률 표시 */}
        <button
          style={{ marginTop: '15px', padding: '10px 20px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          onClick={runSimulation}
          disabled={simulationStatus !== 'default'}
        >
          {simulationStatus === 'running' ? `시뮬레이션 중... (${progressPercentage}%)` :
           simulationStatus === 'finished' ? '✅ 1000개 발송 완료!' :
           '🧪 1분 1000개 시뮬레이션 시작'}
        </button>

      </div>
      <div className="page-footer">실시간 인터랙티브 이벤트</div>
    </div>
  );
};

export default InputPage;
