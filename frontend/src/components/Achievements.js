import React from 'react';

const AchievementNotification = ({ achievement, onClose }) => {
  if (!achievement) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-lg shadow-lg border border-purple-400 animate-pulse">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">🏆</div>
          <div>
            <div className="font-bold text-lg">Achievement Unlocked!</div>
            <div className="text-sm">{achievement.name}</div>
          </div>
          <button 
            onClick={onClose}
            className="ml-4 text-white hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

// Achievement definitions
export const ACHIEVEMENTS = {
  FIRST_TASK: {
    id: 'first_task',
    name: '初心者採掘師',
    description: '最初のタスクを完了する',
    icon: '⛏️',
    condition: (stats) => stats.total_todos_completed >= 1
  },
  TASK_MASTER: {
    id: 'task_master', 
    name: 'タスクマスター',
    description: '10個のタスクを完了する',
    icon: '👑',
    condition: (stats) => stats.total_todos_completed >= 10
  },
  STREAK_CHAMPION: {
    id: 'streak_champion',
    name: '連続チャンピオン',
    description: '5回連続でタスクを完了する',
    icon: '🔥',
    condition: (stats) => stats.current_streak >= 5
  },
  COIN_COLLECTOR: {
    id: 'coin_collector',
    name: 'コインコレクター',
    description: '1000コインを集める',
    icon: '💰',
    condition: (stats) => stats.coins >= 1000
  },
  AUTOMATION_MASTER: {
    id: 'automation_master',
    name: '自動化マスター',
    description: '最初の自動採掘機を購入する',
    icon: '🤖',
    condition: (stats) => stats.auto_miners >= 1
  }
};

export const checkAchievements = (stats, unlockedAchievements = []) => {
  const newAchievements = [];
  
  Object.values(ACHIEVEMENTS).forEach(achievement => {
    if (!unlockedAchievements.includes(achievement.id) && achievement.condition(stats)) {
      newAchievements.push(achievement);
    }
  });
  
  return newAchievements;
};

export default AchievementNotification;