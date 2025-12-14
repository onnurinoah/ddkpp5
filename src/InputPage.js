// src/InputPage.js
import React, { useState } from 'react';
import { db } from './firebase'; // Firebase 설정 파일 경로를 확인해주세요.
import firebase from 'firebase/compat/app';
import './InputPage.css';

// -----------------------------------------------------------
// 이모지 유효성 검사 함수
// -----------------------------------------------------------
const isOnlyEmojis = (text) => {
  if (!text) return true;
  
  // 유니코드 Emojis, ZWJ, 이모지 변형 선택자, 일부 기본 기호와 숫자를 허용하는 정규식
  // 일반적인 한글/영어/긴 텍스트를 막는 데 초점을 맞춥니다.
  // 'u' 플래그는 유니코드 속성 이스케이프 (\p{...}) 사용을 가능하게 합니다.
  const emojiRegex = /^(?:[\p{Emoji}\s\u200d\ufe0f\ufe0e*#0-9A-Za-z!?\-.+&()@]+)$/u;
  
  // NOTE: 순수하게 그림 이모지만을 원한다면 정규식을 더 엄격하게 조정해야 할 수 있습니다.
  return emojiRegex.test(text.trim());
};
// -----------------------------------------------------------


const InputPage = () => {
  const [emoji, setEmoji] = useState('');
  const [status, setStatus] = useState('default');
  const [toastMessage, setToastMessage] = useState(null); // 토스트 메시지 상태

  // 토스트 메시지를 띄우는 함수
  const showToast = (message, duration = 1500) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, duration);
  };

  const sendEmoji = () => {
    if (!emoji.trim()) return;
    
    // ⭐ 이모지 유효성 검사
    if (!isOnlyEmojis(emoji)) {
      showToast("❌ 이모지만 발송 가능합니다.");
      return; // 전송 중단
    }
    
    setStatus('loading');

    db.ref('inputs').push({
      emoji: emoji.trim(),
      timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
      setStatus('success');
      setEmoji('');
      // 성공 시 잠시 후 상태 리셋
      setTimeout(() => setStatus('default'), 1500); 
    }).catch((err) => {
      console.error(err);
      showToast('⚠️ 전송 실패');
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
            
            // 모바일 키보드 최적화 속성
            inputMode="text" 
            title="이모지만 입력 가능합니다."
          />
        </div>
        
        <button 
          className={`send-btn-styled ${status === 'success' ? 'success' : ''}`}
          onClick={sendEmoji}
          disabled={status !== 'default' || !emoji.trim()} // 입력값이 없으면 버튼 비활성화
        >
          {status === 'loading' ? "보내는 중... 🔄" : 
           status === 'success' ? "🎉 전송 성공!" : 
           "상자로 던지기! 🚀"}
        </button>

      </div>
      
      {/* ⭐ [추가] 토스트 메시지 UI 렌더링 */}
      {toastMessage && (
        <div className="toast-message-styled">
          {toastMessage}
        </div>
      )}

      <div className="page-footer">실시간 인터랙티브 이벤트</div>
    </div>
  );
};

export default InputPage;