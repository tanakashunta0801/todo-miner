import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import MiningAnimation from './components/MiningAnimation';
import PixelMiningGame from './components/PixelMiningGame';
import AchievementNotification, { checkAchievements } from './components/Achievements';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const priorityColors = {
  high: 'border-red-500 bg-red-50',
  medium: 'border-yellow-500 bg-yellow-50', 
  low: 'border-green-500 bg-green-50'
};

const priorityRewards = {
  high: 50,
  medium: 25,
  low: 10
};

function App() {
  // State management
  const [todos, setTodos] = useState([]);
  const [gameStats, setGameStats] = useState(null);
  const [upgrades, setUpgrades] = useState([]);
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'other'
  });
  const [showGame, setShowGame] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [notification, setNotification] = useState('');
  const [miningAnimation, setMiningAnimation] = useState({ active: false, coins: 0 });
  const [currentAchievement, setCurrentAchievement] = useState(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);

  // Fetch data
  const fetchTodos = async () => {
    try {
      const response = await axios.get(`${API}/todos`);
      setTodos(response.data);
    } catch (error) {
      console.error('Error fetching todos:', error);
    }
  };

  const fetchGameStats = async () => {
    try {
      const response = await axios.get(`${API}/game/stats`);
      setGameStats(response.data);
    } catch (error) {
      console.error('Error fetching game stats:', error);
    }
  };

  const fetchUpgrades = async () => {
    try {
      const response = await axios.get(`${API}/game/upgrades`);
      setUpgrades(response.data);
    } catch (error) {
      console.error('Error fetching upgrades:', error);
    }
  };

  // Check for achievements when stats change
  useEffect(() => {
    if (gameStats) {
      const newAchievements = checkAchievements(gameStats, unlockedAchievements);
      if (newAchievements.length > 0) {
        const achievement = newAchievements[0];
        setCurrentAchievement(achievement);
        setUnlockedAchievements(prev => [...prev, achievement.id]);
        setTimeout(() => setCurrentAchievement(null), 5000);
      }
    }
  }, [gameStats, unlockedAchievements]);
  useEffect(() => {
    const autoMiningInterval = setInterval(async () => {
      if (gameStats && gameStats.auto_miners > 0) {
        try {
          await axios.post(`${API}/game/auto-mine`);
          fetchGameStats(); // Refresh stats
        } catch (error) {
          console.error('Auto mining error:', error);
        }
      }
    }, 60000); // Every minute

    return () => clearInterval(autoMiningInterval);
  }, [gameStats]);

  // Initial data load
  useEffect(() => {
    fetchTodos();
    fetchGameStats();
    fetchUpgrades();
  }, []);

  // Show notification
  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  // Todo operations
  const addTodo = async (e) => {
    e.preventDefault();
    if (!newTodo.title.trim()) return;

    try {
      await axios.post(`${API}/todos`, newTodo);
      setNewTodo({ title: '', description: '', priority: 'medium', category: 'other' });
      setShowAddForm(false);
      fetchTodos();
      showNotification('✅ タスクを追加しました！');
    } catch (error) {
      console.error('Error adding todo:', error);
    }
  };

  const completeTodo = async (todoId) => {
    try {
      const todo = todos.find(t => t.id === todoId);
      await axios.put(`${API}/todos/${todoId}`, { completed: true });
      
      // Calculate reward with mining power
      const baseReward = priorityRewards[todo.priority];
      const actualReward = baseReward * (gameStats ? gameStats.mining_power : 1);
      
      // Trigger mining animation
      setMiningAnimation({ active: true, coins: actualReward });
      
      fetchTodos();
      fetchGameStats();
      showNotification(`⛏️ +${actualReward} コイン獲得！`);
    } catch (error) {
      console.error('Error completing todo:', error);
    }
  };

  const deleteTodo = async (todoId) => {
    try {
      await axios.delete(`${API}/todos/${todoId}`);
      fetchTodos();
      showNotification('🗑️ タスクを削除しました');
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  // Upgrade purchase
  const purchaseUpgrade = async (upgradeId) => {
    try {
      await axios.post(`${API}/game/upgrade/${upgradeId}`);
      fetchGameStats();
      fetchUpgrades();
      showNotification('🎉 アップグレード購入完了！');
    } catch (error) {
      showNotification('❌ コインが足りません');
    }
  };

  if (!gameStats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      <div className="container mx-auto p-4 max-w-md">
        {/* Header with Game Stats */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-yellow-400">⛏️ Todo Miner</h1>
            <button 
              onClick={() => setShowGame(!showGame)}
              className="text-sm bg-gray-700 px-2 py-1 rounded hover:bg-gray-600"
            >
              {showGame ? '🔼' : '🔽'}
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="bg-yellow-600 rounded p-2 text-center">
              <div className="font-bold">💰 {gameStats.coins}</div>
              <div className="text-xs">コイン</div>
            </div>
            <div className="bg-blue-600 rounded p-2 text-center">
              <div className="font-bold">⚡ Lv.{gameStats.level}</div>
              <div className="text-xs">レベル</div>
            </div>
            <div className="bg-purple-600 rounded p-2 text-center">
              <div className="font-bold">🔥 {gameStats.current_streak}</div>
              <div className="text-xs">連続</div>
            </div>
          </div>
        </div>

        {/* Todo List */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">📝 タスク</h2>
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
            >
              {showAddForm ? '❌' : '➕'}
            </button>
          </div>

          {/* Add Todo Form */}
          {showAddForm && (
            <form onSubmit={addTodo} className="mb-4 space-y-2">
              <input
                type="text"
                placeholder="タスクタイトル"
                value={newTodo.title}
                onChange={(e) => setNewTodo({...newTodo, title: e.target.value})}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white"
                required
              />
              <div className="flex gap-2">
                <select
                  value={newTodo.priority}
                  onChange={(e) => setNewTodo({...newTodo, priority: e.target.value})}
                  className="flex-1 p-2 rounded bg-gray-700 border border-gray-600 text-white"
                >
                  <option value="low">🟢 簡単 (+{priorityRewards.low * gameStats.mining_power})</option>
                  <option value="medium">🟡 普通 (+{priorityRewards.medium * gameStats.mining_power})</option>
                  <option value="high">🔴 重要 (+{priorityRewards.high * gameStats.mining_power})</option>
                </select>
                <button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
                >
                  追加
                </button>
              </div>
            </form>
          )}

          {/* Active Todos */}
          <div className="space-y-2">
            {activeTodos.length === 0 ? (
              <div className="text-gray-400 text-center py-4">
                タスクがありません。新しいタスクを追加してコインを稼ぎましょう！
              </div>
            ) : (
              activeTodos.map(todo => (
                <div key={todo.id} className={`border-l-4 ${priorityColors[todo.priority]} rounded p-3 bg-gray-700`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-white">{todo.title}</h3>
                      {todo.description && (
                        <p className="text-sm text-gray-300 mt-1">{todo.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs bg-gray-600 px-2 py-1 rounded">
                          {todo.priority === 'high' ? '🔴 重要' : 
                           todo.priority === 'medium' ? '🟡 普通' : '🟢 簡単'}
                        </span>
                        <span className="text-xs text-yellow-400">
                          💰 +{priorityRewards[todo.priority] * gameStats.mining_power}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => completeTodo(todo.id)}
                        className="bg-green-600 hover:bg-green-700 p-2 rounded text-sm"
                        title="完了"
                      >
                        ✅
                      </button>
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        className="bg-red-600 hover:bg-red-700 p-2 rounded text-sm"
                        title="削除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Completed Todos (collapsible) */}
          {completedTodos.length > 0 && (
            <details className="mt-4">
              <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                ✅ 完了済み ({completedTodos.length})
              </summary>
              <div className="mt-2 space-y-1">
                {completedTodos.slice(0, 5).map(todo => (
                  <div key={todo.id} className="text-sm text-gray-400 bg-gray-700 p-2 rounded">
                    ✅ {todo.title}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        {/* Mining Game Section */}
        {showGame && (
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h2 className="text-lg font-semibold mb-3">⛏️ 鉱山ゲーム</h2>
            
            {/* Mining Display */}
            <div className="bg-gradient-to-b from-orange-900 to-yellow-900 rounded-lg p-4 mb-4 text-center relative">
              <div className="text-6xl mb-2">⛏️</div>
              <div className="text-sm text-yellow-200">
                採掘力: {gameStats.mining_power}x
              </div>
              {gameStats.auto_miners > 0 && (
                <div className="text-xs text-green-300 mt-1">
                  🤖 自動採掘: {gameStats.auto_miners} 台稼働中
                </div>
              )}
              
              {/* Mining Animation Overlay */}
              <MiningAnimation 
                isActive={miningAnimation.active}
                coins={miningAnimation.coins}
                onAnimationComplete={() => setMiningAnimation({ active: false, coins: 0 })}
              />
            </div>

            {/* Upgrades */}
            <div className="space-y-2">
              <h3 className="font-medium text-yellow-400">🛠️ アップグレード</h3>
              {upgrades.map(upgrade => {
                const canAfford = gameStats.coins >= upgrade.cost;
                const isMaxLevel = upgrade.current_level >= upgrade.max_level;
                
                return (
                  <div key={upgrade.id} className="bg-gray-700 rounded p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{upgrade.name}</h4>
                        <p className="text-sm text-gray-300">{upgrade.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-gray-600 px-2 py-1 rounded">
                            Lv.{upgrade.current_level}/{upgrade.max_level}
                          </span>
                          {!isMaxLevel && (
                            <span className="text-yellow-400 text-sm">💰 {upgrade.cost}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => purchaseUpgrade(upgrade.id)}
                        disabled={!canAfford || isMaxLevel}
                        className={`px-3 py-2 rounded text-sm ${
                          isMaxLevel 
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                            : canAfford 
                              ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {isMaxLevel ? 'MAX' : '購入'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stats */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-700 rounded p-2">
                <div className="text-gray-300">総完了数</div>
                <div className="font-bold">{gameStats.total_todos_completed}</div>
              </div>
              <div className="bg-gray-700 rounded p-2">
                <div className="text-gray-300">最高連続</div>
                <div className="font-bold">{gameStats.best_streak}</div>
              </div>
            </div>
          </div>
        )}

        {/* Achievement Notification */}
        <AchievementNotification 
          achievement={currentAchievement}
          onClose={() => setCurrentAchievement(null)}
        />

        {/* Notification */}
        {notification && (
          <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse">
            {notification}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;