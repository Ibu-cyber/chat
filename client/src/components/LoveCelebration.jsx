import { useState, useEffect, useRef } from "react";

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function Heart({ style }) {
  return (
    <span className="love-heart" style={style}>
      ❤️
    </span>
  );
}

function generateHearts(count) {
  const hearts = [];
  const colors = ["#e91e63", "#f06292", "#ff4081", "#ff80ab", "#c2185b", "#f48fb1", "#ff1493"];
  for (let i = 0; i < count; i++) {
    const left = randomBetween(5, 95);
    const delay = randomBetween(0, 1.5);
    const duration = randomBetween(1.5, 3.5);
    const size = randomBetween(16, 40);
    const drift = randomBetween(-60, 60);
    const color = colors[Math.floor(Math.random() * colors.length)];
    hearts.push(
      <Heart
        key={i}
        style={{
          left: `${left}%`,
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
          fontSize: `${size}px`,
          "--drift": `${drift}px`,
          color,
        }}
      />
    );
  }
  return hearts;
}

function LoveCelebration({ message, onComplete }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 3500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className="love-celebration">
      <div className="love-celebration-content">
        <div className="love-celebration-title">💕 Love you too! 💕</div>
      </div>
      <div className="love-hearts-rain">
        {generateHearts(30)}
      </div>
    </div>
  );
}

export default LoveCelebration;
