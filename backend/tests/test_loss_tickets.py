"""
Loss Tickets API Tests
Tests for loss/theft/damage ticket management endpoints
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "test@admin.com"
ADMIN_PASSWORD = "admin123"


class TestLossTicketsAuth:
    """Test authentication for loss tickets endpoints"""
    
    def test_loss_tickets_requires_auth(self):
        """Test that loss-tickets endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/loss-tickets")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestLossTicketsCRUD:
    """Test loss tickets CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture
    def test_equipment(self, headers):
        """Create test equipment for ticket tests"""
        payload = {
            "name": f"TEST_TicketEq_{uuid.uuid4().hex[:8]}",
            "brand": "Test Brand",
            "model": "Test Model",
            "condition": "bon"
        }
        response = requests.post(f"{BASE_URL}/api/equipment", json=payload, headers=headers)
        assert response.status_code == 200
        eq_id = response.json()["id"]
        yield {"id": eq_id, "name": payload["name"]}
        # Cleanup
        requests.delete(f"{BASE_URL}/api/equipment/{eq_id}", headers=headers)
    
    def test_get_loss_tickets(self, headers):
        """Test GET /api/loss-tickets - list all tickets"""
        response = requests.get(f"{BASE_URL}/api/loss-tickets", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Tickets should be a list"
        print(f"Found {len(data)} loss tickets")
        
        # Check ticket structure if any exist
        if len(data) > 0:
            ticket = data[0]
            assert "id" in ticket, "Ticket should have id"
            assert "equipment_id" in ticket, "Ticket should have equipment_id"
            assert "equipment_name" in ticket, "Ticket should have equipment_name"
            assert "issue_type" in ticket, "Ticket should have issue_type"
            assert "status" in ticket, "Ticket should have status"
    
    def test_create_loss_ticket(self, headers, test_equipment):
        """Test POST /api/loss-tickets - create new ticket"""
        payload = {
            "equipment_id": test_equipment["id"],
            "equipment_name": test_equipment["name"],
            "issue_type": "lost",
            "deployment_id": None,
            "deployment_name": "Test Deployment",
            "notes": "Test ticket for automated testing"
        }
        
        response = requests.post(f"{BASE_URL}/api/loss-tickets", json=payload, headers=headers)
        assert response.status_code == 200, f"Failed to create ticket: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should have ticket id"
        assert "message" in data, "Response should have message"
        
        ticket_id = data["id"]
        print(f"Created loss ticket: {ticket_id}")
        
        # Verify by GET
        get_response = requests.get(f"{BASE_URL}/api/loss-tickets/{ticket_id}", headers=headers)
        assert get_response.status_code == 200, f"Failed to get ticket: {get_response.text}"
        
        ticket_data = get_response.json()
        assert ticket_data["equipment_name"] == test_equipment["name"], "Equipment name should match"
        assert ticket_data["issue_type"] == "lost", "Issue type should match"
        assert ticket_data["status"] == "pending", "New ticket should be pending"
        
        # Cleanup - delete the test ticket
        del_response = requests.delete(f"{BASE_URL}/api/loss-tickets/{ticket_id}", headers=headers)
        assert del_response.status_code == 200, f"Failed to delete ticket: {del_response.text}"
    
    def test_update_loss_ticket(self, headers, test_equipment):
        """Test PUT /api/loss-tickets/{id} - update ticket status"""
        # First create a ticket
        create_payload = {
            "equipment_id": test_equipment["id"],
            "equipment_name": test_equipment["name"],
            "issue_type": "damaged",
            "notes": "Test update ticket"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/loss-tickets", json=create_payload, headers=headers)
        assert create_response.status_code == 200
        ticket_id = create_response.json()["id"]
        
        # Update ticket
        update_payload = {
            "status": "ordering",
            "response_message": "Commande passée chez le fournisseur",
            "estimated_date": "2026-05-01"
        }
        
        update_response = requests.put(f"{BASE_URL}/api/loss-tickets/{ticket_id}", json=update_payload, headers=headers)
        assert update_response.status_code == 200, f"Failed to update ticket: {update_response.text}"
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/loss-tickets/{ticket_id}", headers=headers)
        assert get_response.status_code == 200
        
        ticket_data = get_response.json()
        assert ticket_data["status"] == "ordering", "Status should be updated to ordering"
        assert len(ticket_data.get("messages", [])) > 0, "Should have message history"
        
        last_message = ticket_data["messages"][-1]
        assert last_message["status"] == "ordering", "Message status should match"
        assert last_message["message"] == "Commande passée chez le fournisseur", "Message content should match"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/loss-tickets/{ticket_id}", headers=headers)
    
    def test_delete_loss_ticket(self, headers, test_equipment):
        """Test DELETE /api/loss-tickets/{id} - delete ticket"""
        # Create ticket
        create_payload = {
            "equipment_id": test_equipment["id"],
            "equipment_name": test_equipment["name"],
            "issue_type": "stolen",
            "notes": "Test delete ticket"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/loss-tickets", json=create_payload, headers=headers)
        assert create_response.status_code == 200
        ticket_id = create_response.json()["id"]
        
        # Delete ticket
        del_response = requests.delete(f"{BASE_URL}/api/loss-tickets/{ticket_id}", headers=headers)
        assert del_response.status_code == 200, f"Failed to delete: {del_response.text}"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/loss-tickets/{ticket_id}", headers=headers)
        assert get_response.status_code == 404, "Deleted ticket should return 404"
    
    def test_ticket_status_filter(self, headers):
        """Test GET /api/loss-tickets with status filter"""
        response = requests.get(f"{BASE_URL}/api/loss-tickets", headers=headers, params={"status": "pending"})
        assert response.status_code == 200, f"Status filter failed: {response.text}"
        
        data = response.json()
        # All returned tickets should have pending status
        for ticket in data:
            assert ticket["status"] == "pending", f"Expected pending status, got {ticket['status']}"


class TestDeploymentDelete:
    """Test deployment deletion (bug fix verification)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture
    def test_equipment(self, headers):
        """Create test equipment for deployment tests"""
        payload = {
            "name": f"TEST_DelDep_{uuid.uuid4().hex[:8]}",
            "brand": "Test",
            "model": "Model",
            "condition": "bon"
        }
        response = requests.post(f"{BASE_URL}/api/equipment", json=payload, headers=headers)
        assert response.status_code == 200
        eq_id = response.json()["id"]
        yield eq_id
        # Cleanup
        requests.delete(f"{BASE_URL}/api/equipment/{eq_id}", headers=headers)
    
    def test_delete_deployment_success(self, headers, test_equipment):
        """Test DELETE /api/deployments/{id} - verify bug fix works"""
        # Create deployment
        deployment_name = f"TEST_Delete_{uuid.uuid4().hex[:8]}"
        payload = {
            "name": deployment_name,
            "location": "Test Location",
            "start_date": "2026-04-20",
            "end_date": "2026-04-21",
            "equipment_ids": [test_equipment]
        }
        
        create_response = requests.post(f"{BASE_URL}/api/deployments", json=payload, headers=headers)
        assert create_response.status_code == 200, f"Failed to create deployment: {create_response.text}"
        deployment_id = create_response.json()["id"]
        
        # Delete deployment - THIS WAS THE BUG
        del_response = requests.delete(f"{BASE_URL}/api/deployments/{deployment_id}", headers=headers)
        assert del_response.status_code == 200, f"DELETE deployment failed (BUG): {del_response.text}"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/deployments/{deployment_id}", headers=headers)
        assert get_response.status_code == 404, "Deleted deployment should return 404"
        
        print(f"Deployment delete bug fix verified - deployment {deployment_id} deleted successfully")


class TestReturnWithLossTicket:
    """Test return validation that creates loss tickets"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture
    def test_equipment(self, headers):
        """Create test equipment"""
        payload = {
            "name": f"TEST_Return_{uuid.uuid4().hex[:8]}",
            "brand": "Test",
            "model": "Model",
            "condition": "bon"
        }
        response = requests.post(f"{BASE_URL}/api/equipment", json=payload, headers=headers)
        assert response.status_code == 200
        eq_id = response.json()["id"]
        yield {"id": eq_id, "name": payload["name"]}
        # Cleanup
        requests.delete(f"{BASE_URL}/api/equipment/{eq_id}", headers=headers)
    
    def test_return_with_lost_item(self, headers, test_equipment):
        """Test return validation with lost item creates reminder"""
        # Create deployment
        deployment_name = f"TEST_ReturnLost_{uuid.uuid4().hex[:8]}"
        payload = {
            "name": deployment_name,
            "location": "Test Location",
            "start_date": "2026-04-20",
            "equipment_ids": [test_equipment["id"]]
        }
        
        create_response = requests.post(f"{BASE_URL}/api/deployments", json=payload, headers=headers)
        assert create_response.status_code == 200
        deployment_id = create_response.json()["id"]
        
        # Validate return with lost status
        return_payload = [
            {
                "equipment_id": test_equipment["id"],
                "status": "lost",
                "notes": "Lost during test"
            }
        ]
        
        return_response = requests.post(
            f"{BASE_URL}/api/deployments/{deployment_id}/return",
            json=return_payload,
            headers=headers
        )
        assert return_response.status_code == 200, f"Return validation failed: {return_response.text}"
        
        data = return_response.json()
        assert data.get("issues", 0) > 0, "Should have issues reported"
        
        # Verify equipment condition changed
        eq_response = requests.get(f"{BASE_URL}/api/equipment/{test_equipment['id']}", headers=headers)
        eq_data = eq_response.json()
        assert eq_data["condition"] == "hors_service", "Lost equipment should be marked hors_service"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/deployments/{deployment_id}", headers=headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
