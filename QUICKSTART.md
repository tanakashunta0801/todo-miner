# 🚀 Quick Start Guide

## 最速起動手順 (5分で開始)

### 1. 即座に起動
```bash
# 全サービスを起動
sudo supervisorctl start all

# 起動確認
sudo supervisorctl status
```

**期待される出力:**
```
backend    RUNNING   pid 1234, uptime 0:00:05
frontend   RUNNING   pid 5678, uptime 0:00:03  
```

### 2. アクセス確認
- **アプリ**: http://localhost:3000
- **API**: http://localhost:8001/api/health

### 3. 初回セットアップ確認

#### API動作テスト
```bash
curl http://localhost:8001/api/health
# 期待: {"status":"healthy","timestamp":"..."}
```

#### 初期ゲーム状態確認
```bash
curl http://localhost:8001/api/game/stats  
# 期待: {"level":1,"coins":0,"mining_power":1,...}
```

## トラブル時の対処

### サービスが起動しない場合
```bash
# ログで原因確認
tail -n 20 /var/log/supervisor/backend.err.log
tail -n 20 /var/log/supervisor/frontend.err.log

# 強制再起動
sudo supervisorctl restart all
```

### 依存関係エラーの場合
```bash
# Backend依存関係再インストール
cd /app/backend && pip install -r requirements.txt

# Frontend依存関係再インストール  
cd /app/frontend && yarn install

# サービス再起動
sudo supervisorctl restart all
```

## 🎮 ゲーム開始手順

1. **ブラウザで** http://localhost:3000 **を開く**
2. **「➕」ボタンでタスク追加**
3. **タスクタイトル入力、優先度選択**
4. **「✅」ボタンでタスク完了してコイン獲得**  
5. **100コイン貯まったら「Better Pickaxe」購入**
6. **採掘力向上を実感！**

## 開発用コマンド集

```bash
# 全サービス状態確認
sudo supervisorctl status

# 個別サービス操作
sudo supervisorctl start backend
sudo supervisorctl stop frontend  
sudo supervisorctl restart all

# リアルタイムログ監視
tail -f /var/log/supervisor/backend.out.log
tail -f /var/log/supervisor/frontend.err.log

# API直接テスト
curl -X POST http://localhost:8001/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"テストタスク","priority":"high"}'
```

---
**⏰ 5分で遊べる準備完了！**