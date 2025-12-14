// src/InputPage.js
import React, { useState } from 'react';
import { db } from './firebase';
import firebase from 'firebase/compat/app';
import './InputPage.css';

const InputPage = () => {
  const [emoji, setEmoji] = useState('');
  const [status, setStatus] = useState('default');
  
  // 🚨 [수정 1] 시뮬레이션 관련 State 모두 제거
  // const [simulationStatus, setSimulationStatus] = useState('default');
  // const [currentCount, setCurrentCount] = useState(0);
  // const [totalLimit, setTotalLimit] = useState(1000); 

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

  // 🚨 [수정 2] runSimulation 함수 제거
  // const runSimulation = () => { ... };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') sendEmoji();
  };
  
  // 🚨 [수정 3] 렌더링 부분: 시뮬레이션 진행률 관련 계산 제거
  // const progressPercentage = totalLimit > 0 ? Math.round(100 * (currentCount / totalLimit)) : 0;

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

        {/* 🚨 [수정 3] 시뮬레이션 버튼 UI 제거 */}
        {/*
        <button
          style={{ marginTop: '15px', padding: '10px 20px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          onClick={runSimulation}
          disabled={simulationStatus !== 'default'}
        >
          {simulationStatus === 'running' ? `시뮬레이션 중... (${progressPercentage}%)` :
           simulationStatus === 'finished' ? '✅ 1000개 발송 완료!' :
           '🧪 1분 1000개 시뮬레이션 시작'}
        </button>
        */}

      </div>
      <div className="page-footer">실시간 인터랙티브 이벤트</div>
    </div>
  );
};

export default InputPage;