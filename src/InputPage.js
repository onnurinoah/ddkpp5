import React, { useState } from 'react';
import { db } from './firebase';

const InputPage = () => {
  const [emoji, setEmoji] = useState('');

  const sendEmoji = (e) => {
    e.preventDefault();
    if (!emoji || emoji.length > 2) return;

    db.ref('inputs').push({
      emoji: emoji,
      timestamp: Date.now()
    });

    setEmoji('');
    alert('🎉 이모지 전송 완료! 메인 화면을 확인하세요.');
  };

  return (
    <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#f0f0f0', height: '100vh' }}>
      <h1>QR코드 이벤트</h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '30px' }}>하나의 이모지를 입력해 주세요.</p>
      <form onSubmit={sendEmoji}>
        <input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          placeholder="여기에 이모지 입력 (예: 💎)"
          maxLength="2"
          style={{ fontSize: '3rem', padding: '10px', width: '80%', maxWidth: '300px', border: '2px solid #333' }}
        />
        <button
          type="submit"
          style={{ display: 'block', margin: '30px auto', padding: '15px 40px', fontSize: '1.5rem', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px' }}
        >
          보물상자로 보내기!
        </button>
      </form>
    </div>
  );
};

export default InputPage;
