import requests
import unittest
import sys
import time
from datetime import datetime

# Backend URL from frontend .env
BACKEND_URL = "https://612c1284-e644-40dd-9c93-90936abc785f.preview.emergentagent.com"
API_URL = f"{BACKEND_URL}/api"

class TodoMiningGameAPITester(unittest.TestCase):
    def setUp(self):
        self.todo_ids = []
        
    def tearDown(self):
        # Clean up any todos created during tests
        for todo_id in self.todo_ids:
            try:
                requests.delete(f"{API_URL}/todos/{todo_id}")
            except:
                pass
    
    def test_01_health_check(self):
        """Test the health check endpoint"""
        print("\n🔍 Testing health check endpoint...")
        response = requests.get(f"{API_URL}/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        print("✅ Health check endpoint working")
    
    def test_02_root_endpoint(self):
        """Test the root endpoint"""
        print("\n🔍 Testing root endpoint...")
        response = requests.get(f"{API_URL}/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["message"], "Todo Mining Game API")
        print("✅ Root endpoint working")
    
    def test_03_create_todo(self):
        """Test creating a todo"""
        print("\n🔍 Testing todo creation...")
        todo_data = {
            "title": "Test Todo",
            "description": "This is a test todo",
            "priority": "high",
            "category": "work"
        }
        response = requests.post(f"{API_URL}/todos", json=todo_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["title"], "Test Todo")
        self.assertEqual(data["priority"], "high")
        self.assertEqual(data["category"], "work")
        self.assertFalse(data["completed"])
        
        # Save todo ID for cleanup
        self.todo_ids.append(data["id"])
        print(f"✅ Todo created successfully with ID: {data['id']}")
        return data["id"]
    
    def test_04_get_todos(self):
        """Test getting all todos"""
        print("\n🔍 Testing get all todos...")
        # Create a todo first
        todo_id = self.test_03_create_todo()
        
        # Get all todos
        response = requests.get(f"{API_URL}/todos")
        self.assertEqual(response.status_code, 200)
        todos = response.json()
        self.assertIsInstance(todos, list)
        
        # Check if our created todo is in the list
        found = False
        for todo in todos:
            if todo["id"] == todo_id:
                found = True
                break
        
        self.assertTrue(found, "Created todo not found in todos list")
        print("✅ Get todos endpoint working")
    
    def test_05_complete_todo(self):
        """Test completing a todo"""
        print("\n🔍 Testing todo completion...")
        # Create a todo first
        todo_id = self.test_03_create_todo()
        
        # Get initial game stats
        initial_stats_response = requests.get(f"{API_URL}/game/stats")
        initial_stats = initial_stats_response.json()
        initial_coins = initial_stats["coins"]
        
        # Complete the todo
        response = requests.put(f"{API_URL}/todos/{todo_id}", json={"completed": True})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["completed"])
        self.assertIsNotNone(data["completed_at"])
        
        # Check if coins were awarded (high priority = 50 coins * mining_power)
        time.sleep(1)  # Give the server a moment to update game stats
        stats_response = requests.get(f"{API_URL}/game/stats")
        stats = stats_response.json()
        
        expected_reward = 50 * initial_stats["mining_power"]
        self.assertEqual(stats["coins"], initial_coins + expected_reward, 
                         f"Expected {initial_coins + expected_reward} coins, got {stats['coins']}")
        
        print(f"✅ Todo completed successfully, earned {expected_reward} coins")
    
    def test_06_delete_todo(self):
        """Test deleting a todo"""
        print("\n🔍 Testing todo deletion...")
        # Create a todo first
        todo_id = self.test_03_create_todo()
        
        # Delete the todo
        response = requests.delete(f"{API_URL}/todos/{todo_id}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["message"], "Todo deleted successfully")
        
        # Verify it's gone
        response = requests.get(f"{API_URL}/todos")
        todos = response.json()
        found = False
        for todo in todos:
            if todo["id"] == todo_id:
                found = True
                break
        
        self.assertFalse(found, "Todo still exists after deletion")
        
        # Remove from cleanup list since we already deleted it
        self.todo_ids.remove(todo_id)
        print("✅ Todo deleted successfully")
    
    def test_07_game_stats(self):
        """Test getting game stats"""
        print("\n🔍 Testing game stats endpoint...")
        response = requests.get(f"{API_URL}/game/stats")
        self.assertEqual(response.status_code, 200)
        stats = response.json()
        
        # Check required fields
        required_fields = ["level", "coins", "mining_power", "auto_miners", 
                          "total_todos_completed", "current_streak", "best_streak"]
        for field in required_fields:
            self.assertIn(field, stats)
            
        print("✅ Game stats endpoint working")
    
    def test_08_get_upgrades(self):
        """Test getting available upgrades"""
        print("\n🔍 Testing upgrades endpoint...")
        response = requests.get(f"{API_URL}/game/upgrades")
        self.assertEqual(response.status_code, 200)
        upgrades = response.json()
        
        self.assertIsInstance(upgrades, list)
        self.assertTrue(len(upgrades) > 0, "No upgrades returned")
        
        # Check upgrade structure
        for upgrade in upgrades:
            self.assertIn("id", upgrade)
            self.assertIn("name", upgrade)
            self.assertIn("cost", upgrade)
            self.assertIn("current_level", upgrade)
            self.assertIn("max_level", upgrade)
        
        print(f"✅ Found {len(upgrades)} upgrades")
    
    def test_09_purchase_upgrade(self):
        """Test purchasing an upgrade"""
        print("\n🔍 Testing upgrade purchase...")
        # Get current stats
        stats_response = requests.get(f"{API_URL}/game/stats")
        stats = stats_response.json()
        
        # Get upgrades
        upgrades_response = requests.get(f"{API_URL}/game/upgrades")
        upgrades = upgrades_response.json()
        
        # Find the cheapest upgrade
        cheapest_upgrade = None
        for upgrade in upgrades:
            if cheapest_upgrade is None or upgrade["cost"] < cheapest_upgrade["cost"]:
                cheapest_upgrade = upgrade
        
        if cheapest_upgrade is None:
            self.fail("No upgrades available")
        
        print(f"Cheapest upgrade: {cheapest_upgrade['name']} costs {cheapest_upgrade['cost']} coins")
        
        # Check if we have enough coins
        if stats["coins"] < cheapest_upgrade["cost"]:
            # Complete todos to earn coins
            coins_needed = cheapest_upgrade["cost"] - stats["coins"]
            todos_needed = (coins_needed // (50 * stats["mining_power"])) + 1
            
            print(f"Need {coins_needed} more coins. Creating and completing {todos_needed} high-priority todos...")
            
            for i in range(todos_needed):
                # Create a todo
                todo_data = {
                    "title": f"Earn coins {i+1}",
                    "description": "Todo to earn coins for upgrade test",
                    "priority": "high",
                    "category": "work"
                }
                create_response = requests.post(f"{API_URL}/todos", json=todo_data)
                todo_id = create_response.json()["id"]
                self.todo_ids.append(todo_id)
                
                # Complete it
                requests.put(f"{API_URL}/todos/{todo_id}", json={"completed": True})
                print(f"Completed todo {i+1}/{todos_needed}")
            
            # Get updated stats
            stats_response = requests.get(f"{API_URL}/game/stats")
            stats = stats_response.json()
            
            # Get updated upgrades (costs might have changed if we bought some)
            upgrades_response = requests.get(f"{API_URL}/game/upgrades")
            upgrades = upgrades_response.json()
            
            # Find the cheapest upgrade again
            cheapest_upgrade = None
            for upgrade in upgrades:
                if cheapest_upgrade is None or upgrade["cost"] < cheapest_upgrade["cost"]:
                    cheapest_upgrade = upgrade
        
        # Now we should have enough coins to buy the upgrade
        print(f"Current coins: {stats['coins']}, attempting to purchase {cheapest_upgrade['name']} for {cheapest_upgrade['cost']} coins")
        
        # Purchase the upgrade
        response = requests.post(f"{API_URL}/game/upgrade/{cheapest_upgrade['id']}")
        self.assertEqual(response.status_code, 200)
        
        # Verify coins were deducted
        updated_stats_response = requests.get(f"{API_URL}/game/stats")
        updated_stats = updated_stats_response.json()
        
        self.assertEqual(updated_stats["coins"], stats["coins"] - cheapest_upgrade["cost"], 
                         "Coins not deducted correctly after upgrade purchase")
        
        print(f"✅ Successfully purchased {cheapest_upgrade['name']} upgrade")
    
    def test_10_auto_mining(self):
        """Test auto mining functionality"""
        print("\n🔍 Testing auto mining...")
        # Get current stats
        stats_response = requests.get(f"{API_URL}/game/stats")
        stats = stats_response.json()
        
        # Trigger auto mining
        response = requests.post(f"{API_URL}/game/auto-mine")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # If we have auto miners, we should get coins
        if stats["auto_miners"] > 0:
            self.assertTrue(data["coins_earned"] > 0, "No coins earned from auto mining despite having auto miners")
            print(f"✅ Auto mining earned {data['coins_earned']} coins from {stats['auto_miners']} auto miners")
        else:
            self.assertEqual(data["coins_earned"], 0, "Coins earned from auto mining despite having no auto miners")
            print("✅ Auto mining correctly returned 0 coins (no auto miners)")
    
    def test_11_edge_complete_twice(self):
        """Test completing the same todo twice (edge case)"""
        print("\n🔍 Testing completing same todo twice (edge case)...")
        # Create a todo
        todo_data = {
            "title": "Double Complete Test",
            "description": "Testing double completion",
            "priority": "medium",
            "category": "work"
        }
        create_response = requests.post(f"{API_URL}/todos", json=todo_data)
        todo_id = create_response.json()["id"]
        self.todo_ids.append(todo_id)
        
        # Get initial game stats
        initial_stats_response = requests.get(f"{API_URL}/game/stats")
        initial_stats = initial_stats_response.json()
        initial_coins = initial_stats["coins"]
        
        # Complete it once
        first_response = requests.put(f"{API_URL}/todos/{todo_id}", json={"completed": True})
        self.assertEqual(first_response.status_code, 200)
        
        # Wait a moment for stats to update
        time.sleep(1)
        
        # Get stats after first completion
        mid_stats_response = requests.get(f"{API_URL}/game/stats")
        mid_stats = mid_stats_response.json()
        
        # Expected reward for medium priority
        expected_reward = 25 * initial_stats["mining_power"]
        self.assertEqual(mid_stats["coins"], initial_coins + expected_reward, 
                         "Coins not awarded correctly after first completion")
        
        # Try to complete it again
        second_response = requests.put(f"{API_URL}/todos/{todo_id}", json={"completed": True})
        self.assertEqual(second_response.status_code, 200)
        
        # Wait a moment for stats to update
        time.sleep(1)
        
        # Get stats after second completion
        final_stats_response = requests.get(f"{API_URL}/game/stats")
        final_stats = final_stats_response.json()
        
        # Coins should not increase again
        self.assertEqual(final_stats["coins"], mid_stats["coins"], 
                         "Coins increased after completing the same todo twice")
        
        print("✅ Double completion handled correctly - no extra coins awarded")
    
    def test_12_edge_insufficient_coins(self):
        """Test purchasing upgrade without enough coins (edge case)"""
        print("\n🔍 Testing upgrade purchase without enough coins (edge case)...")
        # Get current stats
        stats_response = requests.get(f"{API_URL}/game/stats")
        stats = stats_response.json()
        
        # Get upgrades
        upgrades_response = requests.get(f"{API_URL}/game/upgrades")
        upgrades = upgrades_response.json()
        
        # Find an upgrade we can't afford
        expensive_upgrade = None
        for upgrade in upgrades:
            if upgrade["cost"] > stats["coins"]:
                expensive_upgrade = upgrade
                break
        
        if expensive_upgrade is None:
            # If we can afford all upgrades, create a test case by spending coins
            # Complete a todo to ensure we have some coins
            todo_data = {
                "title": "Earn some coins",
                "description": "Need coins for test",
                "priority": "high",
                "category": "work"
            }
            create_response = requests.post(f"{API_URL}/todos", json=todo_data)
            todo_id = create_response.json()["id"]
            self.todo_ids.append(todo_id)
            
            requests.put(f"{API_URL}/todos/{todo_id}", json={"completed": True})
            
            # Get updated stats and upgrades
            stats_response = requests.get(f"{API_URL}/game/stats")
            stats = stats_response.json()
            
            upgrades_response = requests.get(f"{API_URL}/game/upgrades")
            upgrades = upgrades_response.json()
            
            # Find the most expensive upgrade
            expensive_upgrade = upgrades[0]
            for upgrade in upgrades:
                if upgrade["cost"] > expensive_upgrade["cost"]:
                    expensive_upgrade = upgrade
            
            # Spend coins until we can't afford it
            while stats["coins"] >= expensive_upgrade["cost"]:
                # Create and complete a todo that costs coins
                todo_data = {
                    "title": "Spend coins",
                    "description": "Spending coins for test",
                    "priority": "low",
                    "category": "other"
                }
                create_response = requests.post(f"{API_URL}/todos", json=todo_data)
                todo_id = create_response.json()["id"]
                self.todo_ids.append(todo_id)
                
                # Update game stats to spend coins
                update_response = requests.post(f"{API_URL}/game/stats", 
                                              json={"coins": max(0, stats["coins"] - expensive_upgrade["cost"] + 10)})
                
                # Get updated stats
                stats_response = requests.get(f"{API_URL}/game/stats")
                stats = stats_response.json()
        
        # Now try to purchase the upgrade we can't afford
        print(f"Attempting to purchase {expensive_upgrade['name']} costing {expensive_upgrade['cost']} coins with only {stats['coins']} coins")
        
        response = requests.post(f"{API_URL}/game/upgrade/{expensive_upgrade['id']}")
        self.assertEqual(response.status_code, 400, "Expected 400 error when trying to purchase upgrade without enough coins")
        
        # Verify coins were not deducted
        updated_stats_response = requests.get(f"{API_URL}/game/stats")
        updated_stats = updated_stats_response.json()
        
        self.assertEqual(updated_stats["coins"], stats["coins"], 
                         "Coins changed despite failed upgrade purchase")
        
        print("✅ Insufficient coins handled correctly - purchase rejected with 400 status")

def run_tests():
    # Create a test suite
    test_suite = unittest.TestSuite()
    
    # Add tests in order
    test_suite.addTest(TodoMiningGameAPITester('test_01_health_check'))
    test_suite.addTest(TodoMiningGameAPITester('test_02_root_endpoint'))
    test_suite.addTest(TodoMiningGameAPITester('test_03_create_todo'))
    test_suite.addTest(TodoMiningGameAPITester('test_04_get_todos'))
    test_suite.addTest(TodoMiningGameAPITester('test_05_complete_todo'))
    test_suite.addTest(TodoMiningGameAPITester('test_06_delete_todo'))
    test_suite.addTest(TodoMiningGameAPITester('test_07_game_stats'))
    test_suite.addTest(TodoMiningGameAPITester('test_08_get_upgrades'))
    test_suite.addTest(TodoMiningGameAPITester('test_09_purchase_upgrade'))
    test_suite.addTest(TodoMiningGameAPITester('test_10_auto_mining'))
    test_suite.addTest(TodoMiningGameAPITester('test_11_edge_complete_twice'))
    test_suite.addTest(TodoMiningGameAPITester('test_12_edge_insufficient_coins'))
    
    # Run the tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    return result.wasSuccessful()

if __name__ == "__main__":
    print("🧪 Starting Todo Mining Game API Tests")
    print(f"🔗 Testing API at: {API_URL}")
    print("=" * 70)
    
    success = run_tests()
    
    print("=" * 70)
    if success:
        print("✅ All API tests passed successfully!")
        sys.exit(0)
    else:
        print("❌ Some API tests failed!")
        sys.exit(1)
