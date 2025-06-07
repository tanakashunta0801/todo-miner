import React, { useState, useEffect, useCallback } from 'react';

const PixelMiningGame = ({ gameStats, isActive, onMiningComplete }) => {
  const [activeMiners, setActiveMiners] = useState([]);
  const [carts, setCarts] = useState([]);
  const [completionAnimation, setCompletionAnimation] = useState(null);

  // Generate miner ID
  const generateMinerId = useCallback(() => {
    return `miner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Add new miner when todo is completed
  const addNewMiner = useCallback(() => {
    const minerId = generateMinerId();
    const newMiner = {
      id: minerId,
      x: 100, // Start at mine entrance
      y: 50,  // Surface level
      targetX: 150 + Math.random() * 200, // Random mining spot
      targetY: 120 + Math.random() * 80,   // Underground level
      phase: 'entering', // entering -> mining -> returning -> exiting
      startTime: Date.now(),
      miningDuration: 10000, // 10 seconds
    };
    
    setActiveMiners(prev => [...prev, newMiner]);
  }, [generateMinerId]);

  // Handle miner animation phases
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = Date.now();
      
      setActiveMiners(prev => prev.map(miner => {
        const elapsed = currentTime - miner.startTime;
        
        switch (miner.phase) {
          case 'entering':
            // Move to mining spot (2 seconds)
            if (elapsed > 2000) {
              return { ...miner, phase: 'mining', startTime: currentTime };
            }
            break;
            
          case 'mining':
            // Mine for specified duration
            if (elapsed > miner.miningDuration) {
              return { ...miner, phase: 'returning', startTime: currentTime };
            }
            break;
            
          case 'returning':
            // Return to surface (2 seconds)
            if (elapsed > 2000) {
              // Trigger coin animation and remove miner
              setCompletionAnimation({
                id: miner.id,
                x: 100,
                y: 50,
                timestamp: currentTime
              });
              onMiningComplete && onMiningComplete();
              return null; // Will be filtered out
            }
            break;
            
          default:
            return miner;
        }
        return miner;
      }).filter(Boolean)); // Remove null miners
    }, 100);

    return () => clearInterval(interval);
  }, [onMiningComplete]);

  // Auto-miner cart system
  useEffect(() => {
    if (gameStats && gameStats.auto_miners > 0) {
      const cartInterval = setInterval(() => {
        const cartId = `cart_${Date.now()}`;
        const newCart = {
          id: cartId,
          x: 150 + Math.random() * 200, // Start from random mine position
          y: 120 + Math.random() * 80,
          targetX: 100, // Exit at mine entrance
          targetY: 50,
          phase: 'emerging',
          startTime: Date.now(),
          ore: Math.floor(Math.random() * 3) + 1, // 1-3 ore pieces
        };
        
        setCarts(prev => [...prev, newCart]);
      }, 5000 / gameStats.auto_miners); // More auto-miners = more frequent carts
    }
  }, [gameStats]);

  // Handle cart animations
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = Date.now();
      
      setCarts(prev => prev.map(cart => {
        const elapsed = currentTime - cart.startTime;
        
        if (cart.phase === 'emerging' && elapsed > 3000) {
          // Cart reached surface, remove it
          return null;
        }
        return cart;
      }).filter(Boolean));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Trigger new miner when isActive prop changes
  useEffect(() => {
    if (isActive) {
      addNewMiner();
    }
  }, [isActive, addNewMiner]);

  // Calculate miner position based on phase and time
  const getMinerPosition = (miner) => {
    const elapsed = Date.now() - miner.startTime;
    
    switch (miner.phase) {
      case 'entering':
        const enterProgress = Math.min(elapsed / 2000, 1);
        return {
          x: 100 + (miner.targetX - 100) * enterProgress,
          y: 50 + (miner.targetY - 50) * enterProgress,
        };
        
      case 'mining':
        // Stay at mining position with slight wobble
        const wobble = Math.sin(elapsed / 200) * 2;
        return {
          x: miner.targetX + wobble,
          y: miner.targetY,
        };
        
      case 'returning':
        const returnProgress = Math.min(elapsed / 2000, 1);
        return {
          x: miner.targetX + (100 - miner.targetX) * returnProgress,
          y: miner.targetY + (50 - miner.targetY) * returnProgress,
        };
        
      default:
        return { x: miner.x, y: miner.y };
    }
  };

  // Calculate cart position
  const getCartPosition = (cart) => {
    const elapsed = Date.now() - cart.startTime;
    const progress = Math.min(elapsed / 3000, 1);
    
    return {
      x: cart.x + (cart.targetX - cart.x) * progress,
      y: cart.y + (cart.targetY - cart.y) * progress,
    };
  };

  return (
    <div className="relative w-full h-64 bg-gradient-to-b from-blue-400 via-green-400 to-orange-600 rounded-lg overflow-hidden border-4 border-gray-600">
      {/* Sky and Surface */}
      <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-blue-300 to-green-300"></div>
      
      {/* Mine Entrance */}
      <div className="absolute top-12 left-20 w-16 h-12 bg-gray-800 rounded-t-full border-2 border-gray-700">
        <div className="absolute top-2 left-2 w-12 h-8 bg-black rounded-t-full"></div>
      </div>
      
      {/* Mine Support Beams */}
      <div className="absolute top-16 left-0 w-full">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="absolute bg-amber-800 w-1 h-32" style={{ left: `${20 + i * 60}px` }}></div>
        ))}
      </div>
      
      {/* Underground Layers */}
      <div className="absolute top-16 left-0 w-full h-12 bg-amber-900 opacity-80"></div>
      <div className="absolute top-28 left-0 w-full h-16 bg-yellow-800 opacity-80"></div>
      <div className="absolute top-44 left-0 w-full h-20 bg-orange-800 opacity-80"></div>
      
      {/* Mine Shafts */}
      <div className="absolute top-24 left-24 w-8 h-40 bg-gray-900 border-x-2 border-gray-700"></div>
      <div className="absolute top-32 left-60 w-8 h-32 bg-gray-900 border-x-2 border-gray-700"></div>
      <div className="absolute top-36 left-96 w-8 h-28 bg-gray-900 border-x-2 border-gray-700"></div>
      
      {/* Ore Deposits */}
      <div className="absolute top-32 left-40 w-4 h-4 bg-yellow-400 rounded"></div>
      <div className="absolute top-48 left-80 w-3 h-3 bg-blue-400 rounded"></div>
      <div className="absolute top-52 left-120 w-5 h-5 bg-purple-400 rounded"></div>
      <div className="absolute top-44 left-160 w-3 h-3 bg-red-400 rounded"></div>
      
      {/* Railway Tracks */}
      <div className="absolute top-14 left-20 w-80 h-1 bg-gray-600"></div>
      <div className="absolute top-15 left-20 w-80 h-px bg-gray-400"></div>
      
      {/* Active Miners */}
      {activeMiners.map(miner => {
        const position = getMinerPosition(miner);
        return (
          <div
            key={miner.id}
            className="absolute w-4 h-4 transition-all duration-100"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
            }}
          >
            <div className="w-full h-full bg-orange-600 rounded-sm border border-orange-800">
              {miner.phase === 'mining' && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded animate-pulse"></div>
              )}
            </div>
          </div>
        );
      })}
      
      {/* Auto-miner Carts */}
      {carts.map(cart => {
        const position = getCartPosition(cart);
        return (
          <div
            key={cart.id}
            className="absolute w-6 h-4 transition-all duration-100"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
            }}
          >
            <div className="w-full h-full bg-gray-700 rounded border border-gray-800 relative">
              {/* Ore in cart */}
              {[...Array(cart.ore)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-yellow-400 rounded"
                  style={{
                    left: `${1 + i * 1.5}px`,
                    top: '1px',
                  }}
                ></div>
              ))}
            </div>
          </div>
        );
      })}
      
      {/* Static Auto-miners (Underground) */}
      {gameStats && [...Array(gameStats.auto_miners)].map((_, i) => (
        <div
          key={`auto_${i}`}
          className="absolute w-3 h-3 bg-blue-600 rounded border border-blue-800"
          style={{
            left: `${140 + i * 40}px`,
            top: `${130 + (i % 3) * 20}px`,
          }}
        >
          <div className="absolute -top-1 -right-1 w-1 h-1 bg-red-400 rounded animate-pulse"></div>
        </div>
      ))}
      
      {/* Completion Animation */}
      {completionAnimation && (
        <div
          className="absolute w-8 h-8 pointer-events-none"
          style={{
            left: `${completionAnimation.x - 16}px`,
            top: `${completionAnimation.y - 16}px`,
          }}
        >
          <div className="text-yellow-400 text-xl font-bold animate-bounce">
            💰
          </div>
        </div>
      )}
      
      {/* Info Panel */}
      <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded">
        <div>Active Miners: {activeMiners.length}</div>
        <div>Auto-miners: {gameStats?.auto_miners || 0}</div>
        <div>Active Carts: {carts.length}</div>
      </div>
    </div>
  );
};

export default PixelMiningGame;