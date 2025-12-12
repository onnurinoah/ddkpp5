import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import './MainDisplay.css';

const MainDisplay = () => {
  const [items, setItems] = useState([]);
  const [hearts, setHearts] = useState([]);

  useEffect(() => {
    const startTime = Date.now();
    const inputRef = db.ref('inputs');

    inputRef.on('child_added', (snapshot) => {
      const data = snapshot.val();
      if (data && data.timestamp > startTime - 1000) {
        spawnItem(data.emoji);
      }
    });

    return () => inputRef.off();
  }, []);

  const spawnItem = (emoji) => {
    const id = Date.now() + Math.random();
    const newItem = { id, emoji, left: Math.random() * 20 + 40 };

    setItems((prev) => [...prev, newItem]);

    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      addHeart();
    }, 5000);
  };

  const addHeart = () => {
    const id = Date.now() + Math.random();
    setHearts((prev) => [...prev.slice(-150), id]);
  };

  return (
    <div className="game-container">
      {items.map((item) => (
        <div
          key={item.id}
          className="falling-emoji"
          style={{ left: `${item.left}%`, animationDuration: `${4 + Math.random() * 2}s` }}
        >
          {item.emoji}
        </div>
      ))}

      <div className="chest-wrapper">
        <div className="chest-placeholder">🎁</div>

        <div className="heart-pile">
          {hearts.map((h) => (
            <div key={h} className="stacked-heart">❤️</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MainDisplay;
