# 🎮⛏️ Todo Mining Game

生産性向上とゲーミフィケーションを組み合わせた革新的なToDoアプリケーション！  
タスクを完了してコインを稼ぎ、採掘力をアップグレードして更なる報酬を獲得しよう。

## 📖 概要

Todo Mining Gameは、日常のタスク管理にRPGゲームの要素を取り入れたWebアプリケーションです。タスクを完了することでコインを獲得し、そのコインで採掘力を向上させるアップグレードを購入できます。デスクトップ上に常駐させて、作業中のモチベーション向上に活用できます。

## ✨ 主な機能

### 📝 Todo管理
- **タスクの作成・完了・削除**
- **優先度設定** (低/普通/重要)
- **カテゴリ分類** (仕事/個人/健康/学習/その他)
- **完了済みタスクの履歴表示**

### ⛏️ 採掘ゲーム要素
- **タスク完了でコイン獲得**
  - 簡単タスク: 10コイン × 採掘力
  - 普通タスク: 25コイン × 採掘力  
  - 重要タスク: 50コイン × 採掘力
- **レベルシステムと連続記録**
- **リアルタイム統計表示**

### 🛠️ アップグレードシステム
- **Better Pickaxe**: 採掘力向上 (タスク完了時の報酬倍率アップ)
- **Basic Auto Miner**: 自動コイン生成 (1分毎に1コイン)
- **Mining Efficiency**: 自動採掘効率向上

### 🏆 ゲーミフィケーション
- **アチーブメントシステム**
- **視覚的なアニメーション効果**
- **プログレス追跡**
- **通知システム**

## 🚀 技術スタック

### Backend
- **FastAPI** - 高性能なPython Webフレームワーク
- **MongoDB** - NoSQLデータベース (Motor async driver)
- **Pydantic** - データバリデーション
- **Python 3.11**

### Frontend  
- **React 19** - UIライブラリ
- **Tailwind CSS** - ユーティリティファーストCSS
- **Axios** - HTTP クライアント
- **React Router** - ルーティング

### Infrastructure
- **Docker** - コンテナ化
- **Supervisor** - プロセス管理
- **Nginx** - リバースプロキシ

## 🔧 セットアップ・起動方法

### 必要な環境
- Docker & Docker Compose
- Node.js 18+ & Yarn
- Python 3.11+
- MongoDB

### 1. プロジェクトクローン
```bash
git clone <repository-url>
cd todo-mining-game
```

### 2. 環境変数設定
```bash
# Backend環境変数 (/app/backend/.env)
MONGO_URL="mongodb://localhost:27017"
DB_NAME="todo_mining_game"

# Frontend環境変数 (/app/frontend/.env)
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=443
```

### 3. 依存関係インストール

#### Backend
```bash
cd backend
pip install -r requirements.txt
```

#### Frontend
```bash
cd frontend
yarn install
```

### 4. サービス起動

#### Supervisorを使用した起動 (推奨)
```bash
# 全サービス起動
sudo supervisorctl start all

# 個別サービス起動
sudo supervisorctl start backend
sudo supervisorctl start frontend

# サービス状態確認
sudo supervisorctl status
```

#### 手動起動 (開発用)
```bash
# Backend (別ターミナル)
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend (別ターミナル)  
cd frontend
yarn start
```

### 5. アクセス
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs

## 📱 使用方法

### 基本的な使い方
1. **タスク追加**: 右上の「➕」ボタンでタスクを作成
2. **優先度選択**: 難易度に応じて優先度を設定（報酬が変わります）
3. **タスク完了**: 「✅」ボタンでタスクを完了してコインを獲得
4. **アップグレード**: 貯めたコインでピッケルや自動採掘機を購入
5. **効率向上**: 採掘力が上がることで、同じタスクでもより多くのコインを獲得

### コイン獲得システム
- **基本報酬** = タスク優先度 × 現在の採掘力
- **低優先度**: 10 × 採掘力
- **中優先度**: 25 × 採掘力  
- **高優先度**: 50 × 採掘力

### アップグレード戦略
1. **Better Pickaxe**: 最初に購入すべき最重要アップグレード
2. **Auto Miner**: 長期的な受動収入のために購入
3. **Efficiency**: Auto Minerの効果を最大化

## 🛠️ API仕様

### Todo関連
- `GET /api/todos` - Todo一覧取得
- `POST /api/todos` - Todo作成
- `PUT /api/todos/{id}` - Todo更新（完了処理含む）
- `DELETE /api/todos/{id}` - Todo削除

### ゲーム関連
- `GET /api/game/stats` - ゲーム統計取得
- `GET /api/game/upgrades` - アップグレード一覧
- `POST /api/game/upgrade/{upgrade_id}` - アップグレード購入
- `POST /api/game/auto-mine` - 自動採掘処理

### システム
- `GET /api/health` - ヘルスチェック
- `GET /api/` - API情報

## 🎯 ゲームバランス

### レベル進行
- **レベル計算**: `floor(完了タスク数 / 10) + 1`
- **連続記録**: 連続してタスクを完了した回数
- **最高連続記録**: これまでの最高連続完了記録

### アップグレードコスト
- **指数的コストスケーリング**: `基本コスト × 2^現在レベル`
- **Better Pickaxe**: 100, 200, 400, 800, 1600...
- **Auto Miner**: 500, 1000, 2000, 4000, 8000...
- **Efficiency**: 1000, 2000, 4000, 8000, 16000...

## 🔧 開発情報

### プロジェクト構造
```
/app/
├── backend/                 # FastAPI バックエンド
│   ├── server.py           # メインAPIサーバー
│   ├── requirements.txt    # Python依存関係
│   └── .env               # 環境変数
├── frontend/               # React フロントエンド
│   ├── src/
│   │   ├── App.js         # メインコンポーネント
│   │   ├── App.css        # スタイル
│   │   └── components/    # 再利用可能コンポーネント
│   ├── package.json       # Node.js依存関係
│   └── .env              # 環境変数
├── tests/                 # テストファイル
└── README.md             # このファイル
```

### データモデル
```python
# Todo
{
  "id": "uuid",
  "title": "string", 
  "description": "string",
  "priority": "low|medium|high",
  "category": "work|personal|health|learning|other",
  "completed": boolean,
  "created_at": "datetime",
  "completed_at": "datetime?"
}

# GameStats  
{
  "user_id": "string",
  "level": int,
  "coins": int,
  "mining_power": int,
  "auto_miners": int,
  "auto_mining_rate": float,
  "total_todos_completed": int,
  "current_streak": int,
  "best_streak": int,
  "last_activity": "datetime"
}
```

### 開発コマンド
```bash
# ログ確認
tail -f /var/log/supervisor/backend.err.log
tail -f /var/log/supervisor/frontend.out.log

# サービス再起動
sudo supervisorctl restart backend
sudo supervisorctl restart frontend  
sudo supervisorctl restart all

# データベース確認 (MongoDB)
mongo
use todo_mining_game
db.todos.find()
db.game_stats.find()
```

## 🐛 トラブルシューティング

### よくある問題

**サービスが起動しない**
```bash
# サービス状態確認
sudo supervisorctl status

# ログでエラー確認
tail -n 50 /var/log/supervisor/*.log
```

**フロントエンドがAPIに接続できない**
- `frontend/.env`の`REACT_APP_BACKEND_URL`を確認
- CORSエラーがないかブラウザコンソールを確認

**MongoDBに接続できない**
- `backend/.env`の`MONGO_URL`を確認  
- MongoDBサービスが起動しているか確認

## 🤝 コントリビューション

1. Forkしてブランチを作成
2. 機能実装・バグ修正
3. テスト追加・実行
4. Pull Request作成

## 📄 ライセンス

MIT License

## 👥 作成者

開発: AI Assistant  
企画: ユーザー要求に基づく

---

**🎮 Happy Mining! 効率的なタスク管理で、ゲームも現実も攻略しよう！**
