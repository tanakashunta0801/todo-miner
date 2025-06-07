import React, { useState, useEffect } from 'react';

const MiningAnimation = ({ isActive, coins, onAnimationComplete }) => {
  const [particles, setParticles] = useState([]);
  const [showCoins, setShowCoins] = useState(false);

  useEffect(() => {
    if (isActive) {
      // Create particle effect
      const newParticles = Array.from({ length: 5 }, (_, i) => ({
        id: i,
        x: Math.random() * 200,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        delay: Math.random() * 0.5
      }));
      setParticles(newParticles);
      setShowCoins(true);

      // Clean up after animation
      const timer = setTimeout(() => {
        setParticles([]);
        setShowCoins(false);
        onAnimationComplete && onAnimationComplete();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isActive, onAnimationComplete]);

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Particle effects */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute animate-bounce"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            animationDelay: `${particle.delay}s`,
            animationDuration: '1s'
          }}
        >
          <div 
            className="bg-yellow-400 rounded-full opacity-75"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`
            }}
          />
        </div>
      ))}
      
      {/* Coin display */}
      {showCoins && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="text-2xl font-bold text-yellow-400 animate-pulse">
            +{coins} 💰
          </div>
        </div>
      )}
    </div>
  );
};

export default MiningAnimation;