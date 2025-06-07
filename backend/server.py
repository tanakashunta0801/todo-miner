from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Todo Mining Game API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"  
    HIGH = "high"

class TodoCategory(str, Enum):
    WORK = "work"
    PERSONAL = "personal"
    HEALTH = "health"
    LEARNING = "learning"
    OTHER = "other"

# Todo Models
class TodoCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: Priority = Priority.MEDIUM
    category: TodoCategory = TodoCategory.OTHER

class Todo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = ""
    priority: Priority
    category: TodoCategory
    completed: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class TodoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[Priority] = None
    category: Optional[TodoCategory] = None
    completed: Optional[bool] = None

# Game Models
class GameStats(BaseModel):
    user_id: str = Field(default="default_user")  # For now, single user
    level: int = 1
    coins: int = 0
    mining_power: int = 1
    auto_miners: int = 0
    auto_mining_rate: float = 0.0  # coins per second
    total_todos_completed: int = 0
    current_streak: int = 0
    best_streak: int = 0
    last_activity: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Upgrade(BaseModel):
    id: str
    name: str
    description: str
    cost: int
    effect: str
    max_level: int
    current_level: int = 0

class GameStatsUpdate(BaseModel):
    coins: Optional[int] = None
    mining_power: Optional[int] = None
    auto_miners: Optional[int] = None

# Game Logic Functions
def calculate_coin_reward(priority: Priority) -> int:
    """Calculate coins earned for completing a todo based on priority"""
    rewards = {
        Priority.LOW: 10,
        Priority.MEDIUM: 25,
        Priority.HIGH: 50
    }
    return rewards[priority]

def calculate_exp_reward(priority: Priority) -> int:
    """Calculate experience points for completing a todo"""
    exp_rewards = {
        Priority.LOW: 5,
        Priority.MEDIUM: 15,
        Priority.HIGH: 30
    }
    return exp_rewards[priority]

def calculate_level_from_exp(total_exp: int) -> int:
    """Calculate level based on total experience (simple formula)"""
    return max(1, int((total_exp / 100) + 1))

# Available Upgrades Configuration
AVAILABLE_UPGRADES = [
    {
        "id": "mining_power",
        "name": "Better Pickaxe", 
        "description": "Increases coins per todo completion",
        "base_cost": 100,
        "effect": "mining_power",
        "max_level": 10
    },
    {
        "id": "auto_miner_1",
        "name": "Basic Auto Miner",
        "description": "Automatically generates 1 coin per minute",
        "base_cost": 500,
        "effect": "auto_mining",
        "max_level": 5
    },
    {
        "id": "efficiency",
        "name": "Mining Efficiency",
        "description": "Increases auto mining rate by 50%",
        "base_cost": 1000,
        "effect": "efficiency",
        "max_level": 5
    }
]

# API Endpoints

# Todo Endpoints
@api_router.get("/todos", response_model=List[Todo])
async def get_todos():
    """Get all todos"""
    todos = await db.todos.find().to_list(1000)
    return [Todo(**todo) for todo in todos]

@api_router.post("/todos", response_model=Todo)
async def create_todo(todo_data: TodoCreate):
    """Create a new todo"""
    todo = Todo(**todo_data.dict())
    await db.todos.insert_one(todo.dict())
    return todo

@api_router.put("/todos/{todo_id}", response_model=Todo)
async def update_todo(todo_id: str, update_data: TodoUpdate):
    """Update a todo"""
    # Get existing todo
    existing_todo = await db.todos.find_one({"id": todo_id})
    if not existing_todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    
    # Check if todo is being completed
    was_completed = existing_todo.get("completed", False)
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    
    # If todo is being marked as completed and wasn't before
    if update_dict.get("completed") and not was_completed:
        update_dict["completed_at"] = datetime.now(timezone.utc)
        
        # Award game rewards
        priority = Priority(existing_todo["priority"])
        await award_completion_rewards(priority)
    
    # Update the todo
    await db.todos.update_one({"id": todo_id}, {"$set": update_dict})
    
    # Return updated todo
    updated_todo = await db.todos.find_one({"id": todo_id})
    return Todo(**updated_todo)

@api_router.delete("/todos/{todo_id}")
async def delete_todo(todo_id: str):
    """Delete a todo"""
    result = await db.todos.delete_one({"id": todo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Todo not found")
    return {"message": "Todo deleted successfully"}

# Game Endpoints
@api_router.get("/game/stats", response_model=GameStats)
async def get_game_stats():
    """Get current game statistics"""
    stats = await db.game_stats.find_one({"user_id": "default_user"})
    if not stats:
        # Create default stats if they don't exist
        default_stats = GameStats()
        await db.game_stats.insert_one(default_stats.dict())
        return default_stats
    return GameStats(**stats)

@api_router.post("/game/stats", response_model=GameStats)
async def update_game_stats(stats_update: GameStatsUpdate):
    """Update game statistics"""
    # Get current stats
    current_stats = await db.game_stats.find_one({"user_id": "default_user"})
    if not current_stats:
        current_stats = GameStats().dict()
    
    # Update fields
    update_dict = {k: v for k, v in stats_update.dict().items() if v is not None}
    update_dict["last_activity"] = datetime.now(timezone.utc)
    
    await db.game_stats.update_one(
        {"user_id": "default_user"}, 
        {"$set": update_dict}, 
        upsert=True
    )
    
    # Return updated stats
    updated_stats = await db.game_stats.find_one({"user_id": "default_user"})
    return GameStats(**updated_stats)

@api_router.get("/game/upgrades")
async def get_available_upgrades():
    """Get available upgrades with current levels"""
    stats = await get_game_stats()
    
    upgrades = []
    for upgrade_config in AVAILABLE_UPGRADES:
        # Calculate current level based on effect type
        current_level = 0
        if upgrade_config["effect"] == "mining_power":
            current_level = max(0, stats.mining_power - 1)  # Base mining power is 1
        elif upgrade_config["effect"] == "auto_mining":
            current_level = stats.auto_miners
        elif upgrade_config["effect"] == "efficiency":
            current_level = 0  # For now, efficiency is not tracked separately
        
        # Calculate cost with exponential scaling
        cost = upgrade_config["base_cost"] * (2 ** current_level)
        
        upgrade = Upgrade(
            id=upgrade_config["id"],
            name=upgrade_config["name"],
            description=upgrade_config["description"], 
            cost=cost,
            effect=upgrade_config["effect"],
            max_level=upgrade_config["max_level"],
            current_level=current_level
        )
        upgrades.append(upgrade)
    
    return upgrades

@api_router.post("/game/upgrade/{upgrade_id}")
async def purchase_upgrade(upgrade_id: str):
    """Purchase an upgrade"""
    # Find upgrade config
    upgrade_config = next((u for u in AVAILABLE_UPGRADES if u["id"] == upgrade_id), None)
    if not upgrade_config:
        raise HTTPException(status_code=404, detail="Upgrade not found")
    
    # Get current stats
    stats = await get_game_stats()
    
    # Calculate current level based on effect type
    current_level = 0
    if upgrade_config["effect"] == "mining_power":
        current_level = max(0, stats.mining_power - 1)  # Base mining power is 1
    elif upgrade_config["effect"] == "auto_mining":
        current_level = stats.auto_miners
    elif upgrade_config["effect"] == "efficiency":
        current_level = 0  # For now, efficiency is not tracked separately
    
    # Check if already at max level
    if current_level >= upgrade_config["max_level"]:
        raise HTTPException(status_code=400, detail="Upgrade already at max level")
    
    # Calculate cost
    cost = upgrade_config["base_cost"] * (2 ** current_level)
    
    # Check if user has enough coins
    if stats.coins < cost:
        raise HTTPException(status_code=400, detail="Not enough coins")
    
    # Prepare update dictionary
    update_dict = {
        "coins": stats.coins - cost,
        "last_activity": datetime.now(timezone.utc)
    }
    
    # Apply upgrade effect
    if upgrade_config["effect"] == "mining_power":
        update_dict["mining_power"] = stats.mining_power + 1
    elif upgrade_config["effect"] == "auto_mining":
        update_dict["auto_miners"] = stats.auto_miners + 1
        update_dict["auto_mining_rate"] = (stats.auto_miners + 1) * 1.0  # 1 coin per minute per auto miner
    elif upgrade_config["effect"] == "efficiency":
        # For efficiency upgrade, we could increase auto_mining_rate multiplier
        # For now, just increase auto_mining_rate by 50%
        current_rate = stats.auto_mining_rate
        update_dict["auto_mining_rate"] = current_rate * 1.5
    
    # Update the database
    result = await db.game_stats.update_one(
        {"user_id": "default_user"}, 
        {"$set": update_dict},
        upsert=True
    )
    
    # Verify the update was successful
    if result.modified_count == 0 and result.upserted_id is None:
        raise HTTPException(status_code=500, detail="Failed to update game stats")
    
    return {
        "message": f"Upgrade {upgrade_config['name']} purchased successfully",
        "cost": cost,
        "new_level": current_level + 1
    }

# Helper function to award completion rewards
async def award_completion_rewards(priority: Priority):
    """Award coins and experience for completing a todo"""
    stats = await get_game_stats()
    
    # Calculate rewards
    coin_reward = calculate_coin_reward(priority) * stats.mining_power
    exp_reward = calculate_exp_reward(priority)
    
    # Calculate new totals
    new_coins = stats.coins + coin_reward
    new_total_completed = stats.total_todos_completed + 1
    new_level = calculate_level_from_exp(new_total_completed * 10)  # Simple level calculation
    
    # Update streak (simplified - just increment for now)
    new_streak = stats.current_streak + 1
    new_best_streak = max(stats.best_streak, new_streak)
    
    # Update database
    await db.game_stats.update_one(
        {"user_id": "default_user"},
        {"$set": {
            "coins": new_coins,
            "total_todos_completed": new_total_completed,
            "level": new_level,
            "current_streak": new_streak,
            "best_streak": new_best_streak,
            "last_activity": datetime.now(timezone.utc)
        }},
        upsert=True
    )

# Auto-mining endpoint (to be called periodically from frontend)
@api_router.post("/game/auto-mine")
async def process_auto_mining():
    """Process auto mining rewards"""
    stats = await get_game_stats()
    
    if stats.auto_miners > 0:
        # Calculate time since last activity (simplified to 1 minute for now)
        coins_earned = stats.auto_miners * 1  # 1 coin per auto miner per call
        
        await db.game_stats.update_one(
            {"user_id": "default_user"},
            {"$set": {
                "coins": stats.coins + coins_earned,
                "last_activity": datetime.now(timezone.utc)
            }}
        )
        
        return {"coins_earned": coins_earned, "new_total": stats.coins + coins_earned}
    
    return {"coins_earned": 0, "new_total": stats.coins}

# Basic API endpoints
@api_router.get("/")
async def root():
    return {"message": "Todo Mining Game API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc)}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
