// src/InputPage.js
import React, { useState } from 'react';
import { db } from './firebase';
import firebase from 'firebase/compat/app';
import './InputPage.css';

const InputPage = () => {
  const [emoji, setEmoji] = useState('');
  const [status, setStatus] = useState('default');

  const sendEmoji = () => {
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') sendEmoji();
  };

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
      </div>
      <div className="page-footer">실시간 인터랙티브 이벤트</div>
    </div>
  );
};

export default InputPage;