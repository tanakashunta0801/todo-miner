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
    const shaftIndex = Math.floor(Math.random() * 3); // Choose random shaft
    const shafts = [
      { x: 28, entranceY: 64, targetY: 100 + Math.random() * 40 },
      { x: 68, entranceY: 72, targetY: 120 + Math.random() * 30 },
      { x: 108, entranceY: 76, targetY: 140 + Math.random() * 20 }
    ];
    
    const selectedShaft = shafts[shaftIndex];
    
    const newMiner = {
      id: minerId,
      x: 100, // Start at mine entrance
      y: 50,  // Surface level
      targetX: selectedShaft.x,
      targetY: selectedShaft.targetY,
      shaftX: selectedShaft.x,
      shaftEntranceY: selectedShaft.entranceY,
      phase: 'moving_to_shaft', // moving_to_shaft -> entering_shaft -> mining -> returning_to_shaft -> exiting
      startTime: Date.now(),
      miningDuration: 8000 + Math.random() * 4000, // 8-12 seconds
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
          case 'moving_to_shaft':
            // Move to shaft entrance (1.5 seconds)
            if (elapsed > 1500) {
              return { ...miner, phase: 'entering_shaft', startTime: currentTime };
            }
            break;
            
          case 'entering_shaft':
            // Move down the shaft (1 second)
            if (elapsed > 1000) {
              return { ...miner, phase: 'mining', startTime: currentTime };
            }
            break;
            
          case 'mining':
            // Mine for specified duration
            if (elapsed > miner.miningDuration) {
              return { ...miner, phase: 'returning_to_shaft', startTime: currentTime };
            }
            break;
            
          case 'returning_to_shaft':
            // Return to shaft entrance (1 second)
            if (elapsed > 1000) {
              return { ...miner, phase: 'exiting', startTime: currentTime };
            }
            break;
            
          case 'exiting':
            // Exit to surface (1.5 seconds)
            if (elapsed > 1500) {
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
        const shaftIndex = Math.floor(Math.random() * Math.min(3, gameStats.auto_miners));
        const shafts = [28, 68, 108];
        
        const newCart = {
          id: cartId,
          x: shafts[shaftIndex],
          y: 140 + Math.random() * 20,
          targetX: 100, // Exit at mine entrance
          targetY: 50,
          phase: 'emerging',
          startTime: Date.now(),
          ore: Math.floor(Math.random() * 3) + 1, // 1-3 ore pieces
        };
        
        setCarts(prev => [...prev, newCart]);
      }, Math.max(2000, 8000 / gameStats.auto_miners)); // More auto-miners = more frequent carts
    }
  }, [gameStats]);

  // Handle cart animations
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = Date.now();
      
      setCarts(prev => prev.map(cart => {
        const elapsed = currentTime - cart.startTime;
        
        if (cart.phase === 'emerging' && elapsed > 4000) {
          // Cart reached surface and exited, remove it
          return null;
        }
        return cart;
      }).filter(Boolean));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Clear completion animation after some time
  useEffect(() => {
    if (completionAnimation) {
      const timer = setTimeout(() => {
        setCompletionAnimation(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [completionAnimation]);

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
      case 'moving_to_shaft':
        const moveProgress = Math.min(elapsed / 1500, 1);
        return {
          x: 100 + (miner.shaftX - 100) * moveProgress,
          y: 50,
        };
        
      case 'entering_shaft':
        const enterProgress = Math.min(elapsed / 1000, 1);
        return {
          x: miner.shaftX,
          y: miner.shaftEntranceY + (miner.targetY - miner.shaftEntranceY) * enterProgress,
        };
        
      case 'mining':
        // Stay at mining position with slight wobble
        const wobble = Math.sin(elapsed / 300) * 1;
        return {
          x: miner.targetX + wobble,
          y: miner.targetY,
        };
        
      case 'returning_to_shaft':
        const returnProgress = Math.min(elapsed / 1000, 1);
        return {
          x: miner.targetX,
          y: miner.targetY + (miner.shaftEntranceY - miner.targetY) * returnProgress,
        };
        
      case 'exiting':
        const exitProgress = Math.min(elapsed / 1500, 1);
        return {
          x: miner.shaftX + (100 - miner.shaftX) * exitProgress,
          y: miner.shaftEntranceY + (50 - miner.shaftEntranceY) * exitProgress,
        };
        
      default:
        return { x: miner.x, y: miner.y };
    }
  };

  // Calculate cart position
  const getCartPosition = (cart) => {
    const elapsed = Date.now() - cart.startTime;
    const progress = Math.min(elapsed / 4000, 1);
    
    // Create a curved path - first move up to surface level, then move horizontally
    const yProgress = Math.min(progress * 2, 1); // Y movement happens in first half
    const xProgress = Math.max(0, (progress - 0.5) * 2); // X movement happens in second half
    
    return {
      x: cart.x + (cart.targetX - cart.x) * xProgress,
      y: cart.y + (cart.targetY - cart.y) * yProgress,
    };
  };

  return (
    <div className="relative w-full h-64 bg-gradient-to-b from-blue-200 via-green-300 to-amber-700 rounded-lg overflow-hidden border-4 border-gray-700 pixel-art">
      {/* Sky and Surface */}
      <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-blue-300 to-green-200"></div>
      
      {/* Surface Grass */}
      <div className="absolute top-10 left-0 w-full h-4 bg-green-400 border-b-2 border-green-500">
        {/* Grass tufts */}
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute w-1 h-2 bg-green-600" style={{ left: `${i * 20}px`, top: '-2px' }}></div>
        ))}
      </div>
      
      {/* Mine Entrance Structure */}
      <div className="absolute top-8 left-16 w-20 h-16 bg-gray-600 border-2 border-gray-700 rounded-t-lg">
        <div className="absolute top-2 left-2 w-16 h-12 bg-black rounded-t-lg border border-gray-500"></div>
        <div className="absolute top-1 left-1 w-2 h-2 bg-yellow-200 rounded"></div> {/* Light */}
      </div>
      
      {/* Mine Sign */}
      <div className="absolute top-6 left-38 w-12 h-6 bg-amber-800 border border-amber-900 rounded text-xs text-center leading-6 text-white font-bold">
        MINE
      </div>
      
      {/* Railway Tracks */}
      <div className="absolute top-22 left-16 w-24 h-1 bg-gray-500 border-t border-gray-600"></div>
      <div className="absolute top-23 left-16 w-24">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="absolute w-1 h-2 bg-amber-800" style={{ left: `${i * 3}px` }}></div>
        ))}
      </div>
      
      {/* Underground Layers with distinct textures */}
      <div className="absolute top-24 left-0 w-full h-8 bg-gradient-to-r from-amber-600 to-amber-700 border-y border-amber-800">
        {/* Dirt layer with rocks */}
        {[...Array(15)].map((_, i) => (
          <div key={i} className="absolute w-1 h-1 bg-amber-800 rounded" style={{ 
            left: `${Math.random() * 400}px`, 
            top: `${Math.random() * 32}px` 
          }}></div>
        ))}
      </div>
      
      <div className="absolute top-32 left-0 w-full h-12 bg-gradient-to-r from-yellow-700 to-orange-600 border-y border-orange-700">
        {/* Clay layer */}
      </div>
      
      <div className="absolute top-44 left-0 w-full h-20 bg-gradient-to-r from-gray-600 to-gray-700 border-y border-gray-800">
        {/* Rock layer */}
      </div>
      
      {/* Mine Shafts with support beams */}
      <div className="absolute top-24 left-26 w-4 h-40 bg-gray-900 border-x border-gray-600">
        <div className="absolute top-4 left-0 w-4 h-1 bg-amber-800"></div>
        <div className="absolute top-12 left-0 w-4 h-1 bg-amber-800"></div>
        <div className="absolute top-20 left-0 w-4 h-1 bg-amber-800"></div>
      </div>
      
      <div className="absolute top-32 left-66 w-4 h-32 bg-gray-900 border-x border-gray-600">
        <div className="absolute top-4 left-0 w-4 h-1 bg-amber-800"></div>
        <div className="absolute top-12 left-0 w-4 h-1 bg-amber-800"></div>
      </div>
      
      <div className="absolute top-36 left-106 w-4 h-28 bg-gray-900 border-x border-gray-600">
        <div className="absolute top-4 left-0 w-4 h-1 bg-amber-800"></div>
        <div className="absolute top-12 left-0 w-4 h-1 bg-amber-800"></div>
      </div>
      
      {/* Ore Deposits with sparkles */}
      <div className="absolute top-36 left-40 w-3 h-3 bg-yellow-400 rounded border border-yellow-600">
        <div className="absolute -top-1 -left-1 w-1 h-1 bg-yellow-200 animate-pulse"></div>
      </div>
      <div className="absolute top-48 left-80 w-2 h-2 bg-blue-400 rounded border border-blue-600">
        <div className="absolute -top-1 -right-1 w-1 h-1 bg-blue-200 animate-pulse"></div>
      </div>
      <div className="absolute top-52 left-120 w-4 h-4 bg-purple-400 rounded border border-purple-600">
        <div className="absolute top-0 right-0 w-1 h-1 bg-purple-200 animate-pulse"></div>
      </div>
      <div className="absolute top-44 left-160 w-2 h-2 bg-red-400 rounded border border-red-600">
        <div className="absolute -bottom-1 -left-1 w-1 h-1 bg-red-200 animate-pulse"></div>
      </div>
      
      {/* Active Miners */}
      {activeMiners.map(miner => {
        const position = getMinerPosition(miner);
        return (
          <div
            key={miner.id}
            className="absolute w-3 h-4 transition-all duration-100"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
            }}
          >
            <div className="w-full h-full bg-orange-500 border border-orange-700 rounded-sm relative">
              {/* Hard hat */}
              <div className="absolute -top-1 left-0 w-3 h-1 bg-yellow-400 rounded-t"></div>
              {/* Mining effect when mining */}
              {miner.phase === 'mining' && (
                <>
                  <div className="absolute -top-1 -right-1 w-1 h-1 bg-yellow-400 rounded animate-ping"></div>
                  <div className="absolute -bottom-1 -left-1 w-1 h-1 bg-gray-400 animate-bounce"></div>
                </>
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
            className="absolute w-6 h-3 transition-all duration-100"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
            }}
          >
            <div className="w-full h-full bg-gray-600 border border-gray-800 rounded-sm relative">
              {/* Cart wheels */}
              <div className="absolute -bottom-1 left-0 w-1 h-1 bg-black rounded-full"></div>
              <div className="absolute -bottom-1 right-0 w-1 h-1 bg-black rounded-full"></div>
              {/* Ore in cart */}
              {[...Array(cart.ore)].map((_, i) => (
                <div
                  key={i}
                  className={`absolute w-1 h-1 rounded ${
                    i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-blue-400' : 'bg-purple-400'
                  }`}
                  style={{
                    left: `${1 + i * 1.5}px`,
                    top: '0px',
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
          className="absolute w-3 h-3 bg-blue-500 border border-blue-700 rounded-sm"
          style={{
            left: `${28 + (i % 3) * 40}px`,
            top: `${140 + Math.floor(i / 3) * 15}px`,
          }}
        >
          <div className="absolute -top-1 left-1 w-1 h-1 bg-red-400 rounded animate-pulse"></div>
          <div className="absolute top-0 right-0 w-1 h-1 bg-yellow-400 rounded animate-ping" 
               style={{ animationDelay: `${i * 0.5}s` }}></div>
        </div>
      ))}
      
      {/* Completion Animation */}
      {completionAnimation && (
        <div
          className="absolute w-8 h-8 pointer-events-none animate-bounce"
          style={{
            left: `${completionAnimation.x - 16}px`,
            top: `${completionAnimation.y - 16}px`,
          }}
        >
          <div className="text-yellow-400 text-xl font-bold drop-shadow-lg">
            💰
          </div>
        </div>
      )}
      
      {/* Info Panel */}
      <div className="absolute bottom-1 right-1 bg-black bg-opacity-80 text-white text-xs p-1 rounded border border-gray-600">
        <div className="flex flex-col space-y-0.5">
          <div>⛏️ {activeMiners.length}</div>
          <div>🤖 {gameStats?.auto_miners || 0}</div>
          <div>🚂 {carts.length}</div>
        </div>
      </div>
    </div>
  );
};

export default PixelMiningGame;