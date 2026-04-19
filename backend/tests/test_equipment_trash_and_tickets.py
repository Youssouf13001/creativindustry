"""
Test Equipment Trash (Soft Delete/Restore/Permanent Delete) and Enhanced Ticket Workflow
Tests for iteration 19 features:
- Equipment soft delete (moves to trash)
- Equipment trash listing
- Equipment restore from trash
- Equipment permanent delete
- Enhanced ticket statuses (ordering, delivering, insurance, replaced, reimbursed, obsolete)
- resolved_at timestamp for closure statuses
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEquipmentTrash:
    """Test equipment trash functionality (soft delete, restore, permanent delete)"""
    
    @pytest.fixture(autouse=True)
    def setup(self, auth_token):
        """Setup test data"""
        self.headers = {"Authorization": f"Bearer {auth_token}"}
        self.test_equipment_id = None
    
    def test_01_soft_delete_equipment(self, auth_token):
        """Test DELETE /api/equipment/{id} does soft delete (moves to trash)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First create a test equipment
        equipment_data = {
            "name": f"TEST_TrashEquipment_{uuid.uuid4().hex[:8]}",
            "brand": "TestBrand",
            "model": "TestModel",
            "serial_number": f"SN-{uuid.uuid4().hex[:8]}",
            "condition": "bon"
        }
        create_res = requests.post(f"{BASE_URL}/api/equipment", json=equipment_data, headers=headers)
        assert create_res.status_code == 200, f"Failed to create equipment: {create_res.text}"
        equipment_id = create_res.json()["id"]
        
        # Soft delete the equipment
        delete_res = requests.delete(f"{BASE_URL}/api/equipment/{equipment_id}", headers=headers)
        assert delete_res.status_code == 200, f"Soft delete failed: {delete_res.text}"
        assert "corbeille" in delete_res.json().get("message", "").lower(), "Response should mention corbeille (trash)"
        
        # Verify equipment is no longer in main inventory
        get_res = requests.get(f"{BASE_URL}/api/equipment/{equipment_id}", headers=headers)
        assert get_res.status_code == 404, "Equipment should not be found in main inventory after soft delete"
        
        # Verify equipment is in trash
        trash_res = requests.get(f"{BASE_URL}/api/equipment-trash", headers=headers)
        assert trash_res.status_code == 200
        trash_items = trash_res.json()
        found_in_trash = any(item["id"] == equipment_id for item in trash_items)
        assert found_in_trash, "Equipment should be in trash after soft delete"
        
        # Cleanup - permanently delete from trash
        requests.delete(f"{BASE_URL}/api/equipment-trash/{equipment_id}", headers=headers)
        print("PASS: Soft delete moves equipment to trash")
    
    def test_02_get_equipment_trash(self, auth_token):
        """Test GET /api/equipment-trash returns trashed items"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(f"{BASE_URL}/api/equipment-trash", headers=headers)
        assert response.status_code == 200, f"Failed to get trash: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # If there are items, verify structure
        if len(data) > 0:
            item = data[0]
            assert "id" in item, "Trash item should have id"
            assert "name" in item, "Trash item should have name"
            assert "deleted_at" in item, "Trash item should have deleted_at timestamp"
        
        print(f"PASS: GET /api/equipment-trash returns {len(data)} items")
    
    def test_03_restore_equipment_from_trash(self, auth_token):
        """Test POST /api/equipment-trash/{id}/restore restores item to inventory"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create and soft delete equipment
        equipment_data = {
            "name": f"TEST_RestoreEquipment_{uuid.uuid4().hex[:8]}",
            "brand": "RestoreBrand",
            "model": "RestoreModel",
            "condition": "bon"
        }
        create_res = requests.post(f"{BASE_URL}/api/equipment", json=equipment_data, headers=headers)
        assert create_res.status_code == 200
        equipment_id = create_res.json()["id"]
        
        # Soft delete
        delete_res = requests.delete(f"{BASE_URL}/api/equipment/{equipment_id}", headers=headers)
        assert delete_res.status_code == 200
        
        # Restore from trash
        restore_res = requests.post(f"{BASE_URL}/api/equipment-trash/{equipment_id}/restore", headers=headers)
        assert restore_res.status_code == 200, f"Restore failed: {restore_res.text}"
        assert "restauré" in restore_res.json().get("message", "").lower(), "Response should confirm restoration"
        
        # Verify equipment is back in main inventory
        get_res = requests.get(f"{BASE_URL}/api/equipment/{equipment_id}", headers=headers)
        assert get_res.status_code == 200, "Equipment should be back in inventory after restore"
        restored_item = get_res.json()
        assert restored_item["name"] == equipment_data["name"], "Restored equipment should have same name"
        
        # Verify equipment is no longer in trash
        trash_res = requests.get(f"{BASE_URL}/api/equipment-trash", headers=headers)
        trash_items = trash_res.json()
        found_in_trash = any(item["id"] == equipment_id for item in trash_items)
        assert not found_in_trash, "Equipment should not be in trash after restore"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/equipment/{equipment_id}", headers=headers)
        requests.delete(f"{BASE_URL}/api/equipment-trash/{equipment_id}", headers=headers)
        print("PASS: Equipment restored from trash to inventory")
    
    def test_04_permanent_delete_from_trash(self, auth_token):
        """Test DELETE /api/equipment-trash/{id} permanently deletes"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create and soft delete equipment
        equipment_data = {
            "name": f"TEST_PermDeleteEquipment_{uuid.uuid4().hex[:8]}",
            "brand": "PermDeleteBrand",
            "condition": "bon"
        }
        create_res = requests.post(f"{BASE_URL}/api/equipment", json=equipment_data, headers=headers)
        assert create_res.status_code == 200
        equipment_id = create_res.json()["id"]
        
        # Soft delete
        requests.delete(f"{BASE_URL}/api/equipment/{equipment_id}", headers=headers)
        
        # Permanently delete from trash
        perm_delete_res = requests.delete(f"{BASE_URL}/api/equipment-trash/{equipment_id}", headers=headers)
        assert perm_delete_res.status_code == 200, f"Permanent delete failed: {perm_delete_res.text}"
        assert "définitivement" in perm_delete_res.json().get("message", "").lower(), "Response should confirm permanent deletion"
        
        # Verify equipment is not in trash
        trash_res = requests.get(f"{BASE_URL}/api/equipment-trash", headers=headers)
        trash_items = trash_res.json()
        found_in_trash = any(item["id"] == equipment_id for item in trash_items)
        assert not found_in_trash, "Equipment should not be in trash after permanent delete"
        
        # Verify equipment is not in main inventory either
        get_res = requests.get(f"{BASE_URL}/api/equipment/{equipment_id}", headers=headers)
        assert get_res.status_code == 404, "Equipment should not exist anywhere after permanent delete"
        
        print("PASS: Equipment permanently deleted from trash")
    
    def test_05_restore_nonexistent_item(self, auth_token):
        """Test restore returns 404 for non-existent item"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        fake_id = str(uuid.uuid4())
        response = requests.post(f"{BASE_URL}/api/equipment-trash/{fake_id}/restore", headers=headers)
        assert response.status_code == 404, "Should return 404 for non-existent trash item"
        print("PASS: Restore returns 404 for non-existent item")


class TestEnhancedTicketWorkflow:
    """Test enhanced ticket workflow with new statuses"""
    
    def test_06_ticket_status_ordering(self, auth_token):
        """Test PUT /api/loss-tickets/{id} with status 'ordering'"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a test ticket
        ticket_data = {
            "equipment_id": str(uuid.uuid4()),
            "equipment_name": f"TEST_OrderingTicket_{uuid.uuid4().hex[:8]}",
            "issue_type": "lost",
            "notes": "Test ticket for ordering status"
        }
        create_res = requests.post(f"{BASE_URL}/api/loss-tickets", json=ticket_data, headers=headers)
        assert create_res.status_code == 200, f"Failed to create ticket: {create_res.text}"
        ticket_id = create_res.json()["id"]
        
        # Update to ordering status
        update_data = {
            "status": "ordering",
            "response_message": "Commande lancée chez le fournisseur",
            "estimated_date": "2026-02-15"
        }
        update_res = requests.put(f"{BASE_URL}/api/loss-tickets/{ticket_id}", json=update_data, headers=headers)
        assert update_res.status_code == 200, f"Failed to update ticket: {update_res.text}"
        
        # Verify status updated
        get_res = requests.get(f"{BASE_URL}/api/loss-tickets/{ticket_id}", headers=headers)
        assert get_res.status_code == 200
        ticket = get_res.json()
        assert ticket["status"] == "ordering", "Status should be 'ordering'"
        assert ticket.get("resolved_at") is None, "resolved_at should be None for ordering status"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/loss-tickets/{ticket_id}", headers=headers)
        print("PASS: Ticket status 'ordering' works correctly")
    
    def test_07_ticket_status_delivering(self, auth_token):
        """Test PUT /api/loss-tickets/{id} with status 'delivering'"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a test ticket
        ticket_data = {
            "equipment_id": str(uuid.uuid4()),
            "equipment_name": f"TEST_DeliveringTicket_{uuid.uuid4().hex[:8]}",
            "issue_type": "damaged",
            "notes": "Test ticket for delivering status"
        }
        create_res = requests.post(f"{BASE_URL}/api/loss-tickets", json=ticket_data, headers=headers)
        assert create_res.status_code == 200
        ticket_id = create_res.json()["id"]
        
        # Update to delivering status
        update_data = {
            "status": "delivering",
            "response_message": "En cours de livraison",
            "estimated_date": "2026-02-10"
        }
        update_res = requests.put(f"{BASE_URL}/api/loss-tickets/{ticket_id}", json=update_data, headers=headers)
        assert update_res.status_code == 200
        
        # Verify status
        get_res = requests.get(f"{BASE_URL}/api/loss-tickets/{ticket_id}", headers=headers)
        ticket = get_res.json()
        assert ticket["status"] == "delivering", "Status should be 'delivering'"
        assert ticket.get("resolved_at") is None, "resolved_at should be None for delivering status"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/loss-tickets/{ticket_id}", headers=headers)
        print("PASS: Ticket status 'delivering' works correctly")
    
    def test_08_ticket_status_insurance(self, auth_token):
        """Test PUT /api/loss-tickets/{id} with status 'insurance'"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a test ticket
        ticket_data = {
            "equipment_id": str(uuid.uuid4()),
            "equipment_name": f"TEST_InsuranceTicket_{uuid.uuid4().hex[:8]}",
            "issue_type": "stolen",
            "notes": "Test ticket for insurance status"
        }
        create_res = requests.post(f"{BASE_URL}/api/loss-tickets", json=ticket_data, headers=headers)
        assert create_res.status_code == 200
        ticket_id = create_res.json()["id"]
        
        # Update to insurance status
        update_data = {
            "status": "insurance",
            "response_message": "Dossier assurance en cours",
            "estimated_date": "2026-03-01"
        }
        update_res = requests.put(f"{BASE_URL}/api/loss-tickets/{ticket_id}", json=update_data, headers=headers)
        assert update_res.status_code == 200
        
        # Verify status
        get_res = requests.get(f"{BASE_URL}/api/loss-tickets/{ticket_id}", headers=headers)
        ticket = get_res.json()
        assert ticket["status"] == "insurance", "Status should be 'insurance'"
        assert ticket.get("resolved_at") is None, "resolved_at should be None for insurance status"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/loss-tickets/{ticket_id}", headers=headers)
        print("PASS: Ticket status 'insurance' works correctly")
    
    def test_09_ticket_status_replaced_sets_resolved_at(self, auth_token):
        """Test PUT /api/loss-tickets/{id} with status 'replaced' sets resolved_at"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a test ticket
        ticket_data = {
            "equipment_id": str(uuid.uuid4()),
            "equipment_name": f"TEST_ReplacedTicket_{uuid.uuid4().hex[:8]}",
            "issue_type": "lost",
            "notes": "Test ticket for replaced status"
        }
        create_res = requests.post(f"{BASE_URL}/api/loss-tickets", json=ticket_data, headers=headers)
        assert create_res.status_code == 200
        ticket_id = create_res.json()["id"]
        
        # Update to replaced status
        update_data = {
            "status": "replaced",
            "response_message": "Matériel remplacé et ajouté à l'inventaire"
        }
        update_res = requests.put(f"{BASE_URL}/api/loss-tickets/{ticket_id}", json=update_data, headers=headers)
        assert update_res.status_code == 200
        
        # Verify status and resolved_at
        get_res = requests.get(f"{BASE_URL}/api/loss-tickets/{ticket_id}", headers=headers)
        ticket = get_res.json()
        assert ticket["status"] == "replaced", "Status should be 'replaced'"
        assert ticket.get("resolved_at") is not None, "resolved_at should be set for 'replaced' status"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/loss-tickets/{ticket_id}", headers=headers)
        print("PASS: Ticket status 'replaced' sets resolved_at")
    
    def test_10_ticket_status_reimbursed_sets_resolved_at(self, auth_token):
        """Test PUT /api/loss-tickets/{id} with status 'reimbursed' sets resolved_at"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a test ticket
        ticket_data = {
            "equipment_id": str(uuid.uuid4()),
            "equipment_name": f"TEST_ReimbursedTicket_{uuid.uuid4().hex[:8]}",
            "issue_type": "stolen",
            "notes": "Test ticket for reimbursed status"
        }
        create_res = requests.post(f"{BASE_URL}/api/loss-tickets", json=ticket_data, headers=headers)
        assert create_res.status_code == 200
        ticket_id = create_res.json()["id"]
        
        # Update to reimbursed status
        update_data = {
            "status": "reimbursed",
            "response_message": "Remboursement reçu de l'assurance"
        }
        update_res = requests.put(f"{BASE_URL}/api/loss-tickets/{ticket_id}", json=update_data, headers=headers)
        assert update_res.status_code == 200
        
        # Verify status and resolved_at
        get_res = requests.get(f"{BASE_URL}/api/loss-tickets/{ticket_id}", headers=headers)
        ticket = get_res.json()
        assert ticket["status"] == "reimbursed", "Status should be 'reimbursed'"
        assert ticket.get("resolved_at") is not None, "resolved_at should be set for 'reimbursed' status"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/loss-tickets/{ticket_id}", headers=headers)
        print("PASS: Ticket status 'reimbursed' sets resolved_at")
    
    def test_11_ticket_status_obsolete_sets_resolved_at(self, auth_token):
        """Test PUT /api/loss-tickets/{id} with status 'obsolete' sets resolved_at"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a test ticket
        ticket_data = {
            "equipment_id": str(uuid.uuid4()),
            "equipment_name": f"TEST_ObsoleteTicket_{uuid.uuid4().hex[:8]}",
            "issue_type": "damaged",
            "notes": "Test ticket for obsolete status"
        }
        create_res = requests.post(f"{BASE_URL}/api/loss-tickets", json=ticket_data, headers=headers)
        assert create_res.status_code == 200
        ticket_id = create_res.json()["id"]
        
        # Update to obsolete status
        update_data = {
            "status": "obsolete",
            "response_message": "Matériel obsolète, pas de remplacement"
        }
        update_res = requests.put(f"{BASE_URL}/api/loss-tickets/{ticket_id}", json=update_data, headers=headers)
        assert update_res.status_code == 200
        
        # Verify status and resolved_at
        get_res = requests.get(f"{BASE_URL}/api/loss-tickets/{ticket_id}", headers=headers)
        ticket = get_res.json()
        assert ticket["status"] == "obsolete", "Status should be 'obsolete'"
        assert ticket.get("resolved_at") is not None, "resolved_at should be set for 'obsolete' status"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/loss-tickets/{ticket_id}", headers=headers)
        print("PASS: Ticket status 'obsolete' sets resolved_at")
    
    def test_12_ticket_message_history(self, auth_token):
        """Test that ticket updates add messages to history"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a test ticket
        ticket_data = {
            "equipment_id": str(uuid.uuid4()),
            "equipment_name": f"TEST_HistoryTicket_{uuid.uuid4().hex[:8]}",
            "issue_type": "lost",
            "notes": "Test ticket for message history"
        }
        create_res = requests.post(f"{BASE_URL}/api/loss-tickets", json=ticket_data, headers=headers)
        assert create_res.status_code == 200
        ticket_id = create_res.json()["id"]
        
        # Update multiple times
        updates = [
            {"status": "ordering", "response_message": "Commande lancée"},
            {"status": "delivering", "response_message": "En livraison"},
            {"status": "replaced", "response_message": "Matériel reçu et inventorié"}
        ]
        
        for update in updates:
            requests.put(f"{BASE_URL}/api/loss-tickets/{ticket_id}", json=update, headers=headers)
        
        # Verify message history
        get_res = requests.get(f"{BASE_URL}/api/loss-tickets/{ticket_id}", headers=headers)
        ticket = get_res.json()
        messages = ticket.get("messages", [])
        assert len(messages) >= 3, f"Should have at least 3 messages in history, got {len(messages)}"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/loss-tickets/{ticket_id}", headers=headers)
        print("PASS: Ticket message history works correctly")


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    login_data = {
        "email": "test@admin.com",
        "password": "admin123"
    }
    response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
