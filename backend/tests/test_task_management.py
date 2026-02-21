"""
Task Management API Tests
Tests for team user management and task management endpoints.
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@creativindustry.fr"
ADMIN_PASSWORD = "admin123"

# Test team user credentials
TEST_TEAM_USER_PREFIX = "TEST_TASK_"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/admin/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.fail(f"Admin authentication failed: {response.text}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin authentication"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestTeamUserManagement:
    """Team user CRUD tests"""
    
    def test_create_team_user_with_role_admin(self, api_client, admin_headers):
        """Test creating a team user with admin role"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "name": f"{TEST_TEAM_USER_PREFIX}Admin_{unique_id}",
            "email": f"test_admin_{unique_id}@test.com",
            "password": "testpass123",
            "role": "admin"
        }
        response = api_client.post(f"{BASE_URL}/api/admin/team-users", json=payload, headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data["user"]["email"] == payload["email"]
        assert data["user"]["role"] == "admin"
        assert data["user"]["is_active"] == True
        print(f"✓ Created admin team user: {payload['email']}")
        
        # Store user ID for cleanup
        return data["user"]["id"]
    
    def test_create_team_user_with_role_editor(self, api_client, admin_headers):
        """Test creating a team user with editor role"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "name": f"{TEST_TEAM_USER_PREFIX}Editor_{unique_id}",
            "email": f"test_editor_{unique_id}@test.com",
            "password": "testpass123",
            "role": "editor"
        }
        response = api_client.post(f"{BASE_URL}/api/admin/team-users", json=payload, headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data["user"]["role"] == "editor"
        print(f"✓ Created editor team user: {payload['email']}")
        
        return data["user"]["id"]
    
    def test_create_team_user_with_role_reader(self, api_client, admin_headers):
        """Test creating a team user with reader role"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "name": f"{TEST_TEAM_USER_PREFIX}Reader_{unique_id}",
            "email": f"test_reader_{unique_id}@test.com",
            "password": "testpass123",
            "role": "reader"
        }
        response = api_client.post(f"{BASE_URL}/api/admin/team-users", json=payload, headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data["user"]["role"] == "reader"
        print(f"✓ Created reader team user: {payload['email']}")
        
        return data["user"]["id"]
    
    def test_get_team_users_list(self, api_client, admin_headers):
        """Test getting list of team users"""
        response = api_client.get(f"{BASE_URL}/api/admin/team-users", headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} team users")
    
    def test_create_team_user_duplicate_email_fails(self, api_client, admin_headers):
        """Test that creating team user with duplicate email fails"""
        # First, get existing team user email
        response = api_client.get(f"{BASE_URL}/api/admin/team-users", headers=admin_headers)
        if response.status_code == 200 and len(response.json()) > 0:
            existing_email = response.json()[0]["email"]
            
            payload = {
                "name": "Duplicate Test",
                "email": existing_email,
                "password": "testpass123",
                "role": "reader"
            }
            response = api_client.post(f"{BASE_URL}/api/admin/team-users", json=payload, headers=admin_headers)
            
            assert response.status_code == 400, f"Expected 400 for duplicate email, got {response.status_code}"
            print(f"✓ Duplicate email correctly rejected")


class TestTaskManagement:
    """Task CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup_test_data(self, api_client, admin_headers):
        """Setup: Create a test team user for task assignment"""
        self.api_client = api_client
        self.admin_headers = admin_headers
        
        # Create a test team user for assignments
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "name": f"{TEST_TEAM_USER_PREFIX}TaskAssign_{unique_id}",
            "email": f"test_taskassign_{unique_id}@test.com",
            "password": "testpass123",
            "role": "editor"
        }
        response = api_client.post(f"{BASE_URL}/api/admin/team-users", json=payload, headers=admin_headers)
        if response.status_code == 200:
            self.test_team_user_id = response.json()["user"]["id"]
        else:
            self.test_team_user_id = None
        
        yield
        
        # Cleanup: Delete test team user
        if hasattr(self, 'test_team_user_id') and self.test_team_user_id:
            api_client.delete(f"{BASE_URL}/api/admin/team-users/{self.test_team_user_id}", headers=admin_headers)
    
    def test_create_task_basic(self, api_client, admin_headers):
        """Test creating a basic task with title, description, due date, priority"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"{TEST_TEAM_USER_PREFIX}Task_{unique_id}",
            "description": "Test task description",
            "due_date": "2026-02-15",
            "priority": "high",
            "assigned_to": [],
            "reminders": [{"days_before": 1, "enabled": True}],
            "client_visible": False
        }
        response = api_client.post(f"{BASE_URL}/api/tasks", json=payload, headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data["task"]["title"] == payload["title"]
        assert data["task"]["priority"] == "high"
        assert data["task"]["status"] == "pending"
        print(f"✓ Created task: {payload['title']}")
        
        # Cleanup
        task_id = data["task"]["id"]
        api_client.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=admin_headers)
        
        return task_id
    
    def test_create_task_with_assignment(self, api_client, admin_headers):
        """Test creating task with team member assignment"""
        # First get existing team users
        team_response = api_client.get(f"{BASE_URL}/api/admin/team-users", headers=admin_headers)
        team_users = team_response.json() if team_response.status_code == 200 else []
        
        assigned_to = [team_users[0]["id"]] if team_users else []
        
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"{TEST_TEAM_USER_PREFIX}AssignedTask_{unique_id}",
            "description": "Task assigned to team member",
            "due_date": "2026-02-20",
            "priority": "medium",
            "assigned_to": assigned_to,
            "reminders": [],
            "client_visible": False
        }
        response = api_client.post(f"{BASE_URL}/api/tasks", json=payload, headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        
        if assigned_to:
            assert data["task"]["assigned_to"] == assigned_to
            assert len(data["task"]["assigned_names"]) > 0
            print(f"✓ Task assigned to: {data['task']['assigned_names']}")
        
        # Cleanup
        task_id = data["task"]["id"]
        api_client.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=admin_headers)
    
    def test_create_task_with_client_link(self, api_client, admin_headers):
        """Test creating task linked to a client"""
        # Get existing clients
        clients_response = api_client.get(f"{BASE_URL}/api/admin/clients", headers=admin_headers)
        clients = clients_response.json() if clients_response.status_code == 200 else []
        
        client_id = clients[0]["id"] if clients else None
        
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"{TEST_TEAM_USER_PREFIX}ClientTask_{unique_id}",
            "description": "Task linked to client",
            "due_date": "2026-02-25",
            "priority": "low",
            "assigned_to": [],
            "client_id": client_id,
            "reminders": [],
            "client_visible": False
        }
        response = api_client.post(f"{BASE_URL}/api/tasks", json=payload, headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        
        if client_id:
            assert data["task"]["client_id"] == client_id
            assert data["task"]["client_name"] is not None
            print(f"✓ Task linked to client: {data['task']['client_name']}")
        
        # Cleanup
        task_id = data["task"]["id"]
        api_client.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=admin_headers)
    
    def test_create_task_with_email_reminders(self, api_client, admin_headers):
        """Test creating task with email reminder configuration"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"{TEST_TEAM_USER_PREFIX}ReminderTask_{unique_id}",
            "description": "Task with reminders",
            "due_date": "2026-03-01",
            "priority": "high",
            "assigned_to": [],
            "reminders": [
                {"days_before": 1, "enabled": True},
                {"days_before": 0, "enabled": True},
                {"days_before": -1, "enabled": True}
            ],
            "client_visible": False
        }
        response = api_client.post(f"{BASE_URL}/api/tasks", json=payload, headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert len(data["task"]["reminders"]) == 3
        print(f"✓ Task created with {len(data['task']['reminders'])} reminders configured")
        
        # Cleanup
        task_id = data["task"]["id"]
        api_client.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=admin_headers)
    
    def test_create_task_with_client_visibility(self, api_client, admin_headers):
        """Test creating task that is visible to client with status label"""
        # Get existing clients
        clients_response = api_client.get(f"{BASE_URL}/api/admin/clients", headers=admin_headers)
        clients = clients_response.json() if clients_response.status_code == 200 else []
        
        client_id = clients[0]["id"] if clients else None
        
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"{TEST_TEAM_USER_PREFIX}VisibleTask_{unique_id}",
            "description": "Task visible to client",
            "due_date": "2026-03-05",
            "priority": "medium",
            "assigned_to": [],
            "client_id": client_id,
            "reminders": [],
            "client_visible": True,
            "client_status_label": "Montage en cours de finalisation"
        }
        response = api_client.post(f"{BASE_URL}/api/tasks", json=payload, headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data["task"]["client_visible"] == True
        assert data["task"]["client_status_label"] == "Montage en cours de finalisation"
        print(f"✓ Task visible to client with label: {data['task']['client_status_label']}")
        
        # Cleanup
        task_id = data["task"]["id"]
        api_client.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=admin_headers)
    
    def test_get_tasks_list(self, api_client, admin_headers):
        """Test getting list of tasks"""
        response = api_client.get(f"{BASE_URL}/api/tasks", headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} tasks")
    
    def test_get_single_task(self, api_client, admin_headers):
        """Test getting a single task by ID"""
        # First create a task
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"{TEST_TEAM_USER_PREFIX}SingleTask_{unique_id}",
            "description": "Test single task",
            "due_date": "2026-02-28",
            "priority": "medium",
            "assigned_to": [],
            "reminders": [],
            "client_visible": False
        }
        create_response = api_client.post(f"{BASE_URL}/api/tasks", json=payload, headers=admin_headers)
        task_id = create_response.json()["task"]["id"]
        
        # Get the task
        response = api_client.get(f"{BASE_URL}/api/tasks/{task_id}", headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["id"] == task_id
        assert data["title"] == payload["title"]
        print(f"✓ Got task by ID: {task_id}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=admin_headers)
    
    def test_update_task(self, api_client, admin_headers):
        """Test updating a task"""
        # First create a task
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"{TEST_TEAM_USER_PREFIX}UpdateTask_{unique_id}",
            "description": "Original description",
            "due_date": "2026-02-28",
            "priority": "low",
            "assigned_to": [],
            "reminders": [],
            "client_visible": False
        }
        create_response = api_client.post(f"{BASE_URL}/api/tasks", json=payload, headers=admin_headers)
        task_id = create_response.json()["task"]["id"]
        
        # Update the task
        update_payload = {
            "title": f"{TEST_TEAM_USER_PREFIX}UpdatedTask_{unique_id}",
            "description": "Updated description",
            "priority": "high",
            "status": "in_progress"
        }
        response = api_client.put(f"{BASE_URL}/api/tasks/{task_id}", json=update_payload, headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data["task"]["priority"] == "high"
        assert data["task"]["status"] == "in_progress"
        print(f"✓ Updated task: {task_id}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=admin_headers)
    
    def test_toggle_task_status(self, api_client, admin_headers):
        """Test toggling task status between pending and completed"""
        # First create a task
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"{TEST_TEAM_USER_PREFIX}ToggleTask_{unique_id}",
            "description": "Test toggle",
            "due_date": "2026-02-28",
            "priority": "medium",
            "assigned_to": [],
            "reminders": [],
            "client_visible": False
        }
        create_response = api_client.post(f"{BASE_URL}/api/tasks", json=payload, headers=admin_headers)
        task_id = create_response.json()["task"]["id"]
        
        # Toggle to completed
        response = api_client.post(f"{BASE_URL}/api/tasks/{task_id}/toggle-status", json={}, headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data["status"] == "completed"
        print(f"✓ Toggled task to completed")
        
        # Toggle back to pending
        response = api_client.post(f"{BASE_URL}/api/tasks/{task_id}/toggle-status", json={}, headers=admin_headers)
        assert response.status_code == 200
        assert response.json()["status"] == "pending"
        print(f"✓ Toggled task back to pending")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=admin_headers)
    
    def test_delete_task(self, api_client, admin_headers):
        """Test deleting a task"""
        # First create a task
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"{TEST_TEAM_USER_PREFIX}DeleteTask_{unique_id}",
            "description": "Test delete",
            "due_date": "2026-02-28",
            "priority": "medium",
            "assigned_to": [],
            "reminders": [],
            "client_visible": False
        }
        create_response = api_client.post(f"{BASE_URL}/api/tasks", json=payload, headers=admin_headers)
        task_id = create_response.json()["task"]["id"]
        
        # Delete the task
        response = api_client.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Deleted task: {task_id}")
        
        # Verify deletion
        get_response = api_client.get(f"{BASE_URL}/api/tasks/{task_id}", headers=admin_headers)
        assert get_response.status_code == 404


class TestTaskStats:
    """Task statistics tests"""
    
    def test_get_task_stats(self, api_client, admin_headers):
        """Test getting task statistics"""
        response = api_client.get(f"{BASE_URL}/api/tasks/stats/overview", headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify all required stat fields
        required_fields = ["total", "pending", "in_progress", "completed", "overdue", "due_today", "high_priority"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
            assert isinstance(data[field], int), f"Field {field} should be int"
        
        print(f"✓ Task stats - Total: {data['total']}, Pending: {data['pending']}, Completed: {data['completed']}, Overdue: {data['overdue']}")


class TestTeamUserLogin:
    """Team user login tests"""
    
    def test_team_user_login(self, api_client, admin_headers):
        """Test team user login flow"""
        # Create a test team user
        unique_id = str(uuid.uuid4())[:8]
        user_email = f"test_login_{unique_id}@test.com"
        user_password = "testpass123"
        
        payload = {
            "name": f"{TEST_TEAM_USER_PREFIX}Login_{unique_id}",
            "email": user_email,
            "password": user_password,
            "role": "editor"
        }
        create_response = api_client.post(f"{BASE_URL}/api/admin/team-users", json=payload, headers=admin_headers)
        assert create_response.status_code == 200
        user_id = create_response.json()["user"]["id"]
        
        # Login as team user
        login_response = api_client.post(f"{BASE_URL}/api/team/login", json={
            "email": user_email,
            "password": user_password
        })
        
        assert login_response.status_code == 200, f"Expected 200, got {login_response.status_code}: {login_response.text}"
        data = login_response.json()
        assert "token" in data
        assert data["user"]["email"] == user_email
        assert data["user"]["role"] == "editor"
        print(f"✓ Team user login successful: {user_email}")
        
        # Test /team/me endpoint
        team_token = data["token"]
        me_response = api_client.get(f"{BASE_URL}/api/team/me", headers={"Authorization": f"Bearer {team_token}"})
        assert me_response.status_code == 200
        print(f"✓ Team user /me endpoint works")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/admin/team-users/{user_id}", headers=admin_headers)
    
    def test_team_user_login_invalid_credentials(self, api_client):
        """Test team user login with invalid credentials"""
        login_response = api_client.post(f"{BASE_URL}/api/team/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        
        assert login_response.status_code == 401
        print(f"✓ Invalid login correctly rejected")


class TestClientProjectStatus:
    """Client project status endpoint tests"""
    
    def test_client_project_status_requires_auth(self, api_client):
        """Test that client project status requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/client/project-status")
        assert response.status_code == 401 or response.status_code == 403
        print(f"✓ Client project status requires authentication")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_team_users(self, api_client, admin_headers):
        """Cleanup test team users created during tests"""
        response = api_client.get(f"{BASE_URL}/api/admin/team-users", headers=admin_headers)
        if response.status_code == 200:
            for user in response.json():
                if user["name"].startswith(TEST_TEAM_USER_PREFIX):
                    delete_response = api_client.delete(f"{BASE_URL}/api/admin/team-users/{user['id']}", headers=admin_headers)
                    if delete_response.status_code == 200:
                        print(f"✓ Cleaned up test user: {user['email']}")
    
    def test_cleanup_test_tasks(self, api_client, admin_headers):
        """Cleanup test tasks created during tests"""
        response = api_client.get(f"{BASE_URL}/api/tasks", headers=admin_headers)
        if response.status_code == 200:
            for task in response.json():
                if task["title"].startswith(TEST_TEAM_USER_PREFIX):
                    delete_response = api_client.delete(f"{BASE_URL}/api/tasks/{task['id']}", headers=admin_headers)
                    if delete_response.status_code == 200:
                        print(f"✓ Cleaned up test task: {task['title']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
