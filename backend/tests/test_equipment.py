"""
Equipment Management API Tests
Tests for equipment inventory, deployments, and PDF generation
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "test@admin.com"
ADMIN_PASSWORD = "admin123"


class TestEquipmentAuth:
    """Test authentication for equipment endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        return data["token"]
    
    @pytest.fixture
    def headers(self, auth_token):
        """Headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_equipment_requires_auth(self):
        """Test that equipment endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/equipment")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_categories_requires_auth(self):
        """Test that categories endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/equipment/categories")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_stats_requires_auth(self):
        """Test that stats endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/equipment/stats")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_deployments_requires_auth(self):
        """Test that deployments endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/deployments")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestEquipmentCategories:
    """Test equipment categories CRUD"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_categories(self, headers):
        """Test GET /api/equipment/categories - should return default categories"""
        response = requests.get(f"{BASE_URL}/api/equipment/categories", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Categories should be a list"
        assert len(data) > 0, "Should have default categories"
        
        # Check category structure
        cat = data[0]
        assert "id" in cat, "Category should have id"
        assert "name" in cat, "Category should have name"
        assert "icon" in cat, "Category should have icon"
        assert "color" in cat, "Category should have color"
        
        print(f"Found {len(data)} categories")


class TestEquipmentStats:
    """Test equipment statistics endpoint"""
    
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
    
    def test_get_stats(self, headers):
        """Test GET /api/equipment/stats"""
        response = requests.get(f"{BASE_URL}/api/equipment/stats", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "total_equipment" in data, "Stats should have total_equipment"
        assert "available" in data, "Stats should have available count"
        assert "in_deployment" in data, "Stats should have in_deployment count"
        assert "by_condition" in data, "Stats should have by_condition breakdown"
        assert "active_deployments" in data, "Stats should have active_deployments"
        
        print(f"Stats: total={data['total_equipment']}, available={data['available']}, in_deployment={data['in_deployment']}")


class TestEquipmentCRUD:
    """Test equipment CRUD operations"""
    
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
    
    def test_get_equipment_list(self, headers):
        """Test GET /api/equipment - list all equipment"""
        response = requests.get(f"{BASE_URL}/api/equipment", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Equipment should be a list"
        print(f"Found {len(data)} equipment items")
    
    def test_create_equipment(self, headers):
        """Test POST /api/equipment - create new equipment"""
        test_name = f"TEST_Camera_{uuid.uuid4().hex[:8]}"
        payload = {
            "name": test_name,
            "brand": "Canon",
            "model": "EOS R5",
            "serial_number": f"SN-{uuid.uuid4().hex[:8]}",
            "condition": "bon",
            "purchase_price": 3500.00,
            "notes": "Test equipment for automated testing"
        }
        
        response = requests.post(f"{BASE_URL}/api/equipment", json=payload, headers=headers)
        assert response.status_code == 200, f"Failed to create: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should have equipment id"
        assert "message" in data, "Response should have message"
        
        equipment_id = data["id"]
        print(f"Created equipment: {equipment_id}")
        
        # Verify by GET
        get_response = requests.get(f"{BASE_URL}/api/equipment/{equipment_id}", headers=headers)
        assert get_response.status_code == 200, f"Failed to get created equipment: {get_response.text}"
        
        eq_data = get_response.json()
        assert eq_data["name"] == test_name, "Name should match"
        assert eq_data["brand"] == "Canon", "Brand should match"
        assert eq_data["is_available"] == True, "New equipment should be available"
        
        # Cleanup - delete the test equipment
        del_response = requests.delete(f"{BASE_URL}/api/equipment/{equipment_id}", headers=headers)
        assert del_response.status_code == 200, f"Failed to delete: {del_response.text}"
    
    def test_update_equipment(self, headers):
        """Test PUT /api/equipment/{id} - update equipment"""
        # First create
        test_name = f"TEST_Update_{uuid.uuid4().hex[:8]}"
        create_payload = {
            "name": test_name,
            "brand": "Sony",
            "model": "A7IV",
            "condition": "neuf"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/equipment", json=create_payload, headers=headers)
        assert create_response.status_code == 200
        equipment_id = create_response.json()["id"]
        
        # Update
        update_payload = {
            "name": test_name,
            "brand": "Sony",
            "model": "A7IV Updated",
            "condition": "bon",
            "notes": "Updated via test"
        }
        
        update_response = requests.put(f"{BASE_URL}/api/equipment/{equipment_id}", json=update_payload, headers=headers)
        assert update_response.status_code == 200, f"Failed to update: {update_response.text}"
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/equipment/{equipment_id}", headers=headers)
        assert get_response.status_code == 200
        
        eq_data = get_response.json()
        assert eq_data["model"] == "A7IV Updated", "Model should be updated"
        assert eq_data["condition"] == "bon", "Condition should be updated"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/equipment/{equipment_id}", headers=headers)
    
    def test_equipment_search_filter(self, headers):
        """Test GET /api/equipment with search and filters"""
        # Test search
        response = requests.get(f"{BASE_URL}/api/equipment", headers=headers, params={"search": "Canon"})
        assert response.status_code == 200, f"Search failed: {response.text}"
        
        # Test condition filter
        response = requests.get(f"{BASE_URL}/api/equipment", headers=headers, params={"condition": "bon"})
        assert response.status_code == 200, f"Condition filter failed: {response.text}"


class TestDeployments:
    """Test deployment CRUD operations"""
    
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
            "name": f"TEST_DeployEq_{uuid.uuid4().hex[:8]}",
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
    
    def test_get_deployments_list(self, headers):
        """Test GET /api/deployments - list all deployments"""
        response = requests.get(f"{BASE_URL}/api/deployments", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Deployments should be a list"
        print(f"Found {len(data)} deployments")
    
    def test_create_deployment(self, headers, test_equipment):
        """Test POST /api/deployments - create new deployment"""
        deployment_name = f"TEST_Deployment_{uuid.uuid4().hex[:8]}"
        payload = {
            "name": deployment_name,
            "location": "Test Location",
            "start_date": "2026-03-25",
            "end_date": "2026-03-26",
            "notes": "Test deployment",
            "equipment_ids": [test_equipment]
        }
        
        response = requests.post(f"{BASE_URL}/api/deployments", json=payload, headers=headers)
        assert response.status_code == 200, f"Failed to create deployment: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should have deployment id"
        deployment_id = data["id"]
        print(f"Created deployment: {deployment_id}")
        
        # Verify by GET
        get_response = requests.get(f"{BASE_URL}/api/deployments/{deployment_id}", headers=headers)
        assert get_response.status_code == 200, f"Failed to get deployment: {get_response.text}"
        
        dep_data = get_response.json()
        assert dep_data["name"] == deployment_name, "Name should match"
        assert dep_data["status"] == "planned", "New deployment should be planned"
        assert len(dep_data.get("items", [])) == 1, "Should have 1 equipment item"
        
        # Verify equipment is now unavailable
        eq_response = requests.get(f"{BASE_URL}/api/equipment/{test_equipment}", headers=headers)
        assert eq_response.status_code == 200
        eq_data = eq_response.json()
        assert eq_data["is_available"] == False, "Equipment should be unavailable after deployment"
        
        # Cleanup - delete deployment (this should release equipment)
        del_response = requests.delete(f"{BASE_URL}/api/deployments/{deployment_id}", headers=headers)
        assert del_response.status_code == 200, f"Failed to delete deployment: {del_response.text}"
        
        # Verify equipment is available again
        eq_response = requests.get(f"{BASE_URL}/api/equipment/{test_equipment}", headers=headers)
        eq_data = eq_response.json()
        assert eq_data["is_available"] == True, "Equipment should be available after deployment deletion"
    
    def test_deployment_start(self, headers, test_equipment):
        """Test POST /api/deployments/{id}/start - start deployment"""
        # Create deployment
        payload = {
            "name": f"TEST_Start_{uuid.uuid4().hex[:8]}",
            "location": "Test",
            "start_date": "2026-03-25",
            "equipment_ids": [test_equipment]
        }
        create_response = requests.post(f"{BASE_URL}/api/deployments", json=payload, headers=headers)
        assert create_response.status_code == 200
        deployment_id = create_response.json()["id"]
        
        # Start deployment
        start_response = requests.post(f"{BASE_URL}/api/deployments/{deployment_id}/start", headers=headers)
        assert start_response.status_code == 200, f"Failed to start: {start_response.text}"
        
        # Verify status changed
        get_response = requests.get(f"{BASE_URL}/api/deployments/{deployment_id}", headers=headers)
        dep_data = get_response.json()
        assert dep_data["status"] == "in_progress", "Status should be in_progress"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/deployments/{deployment_id}", headers=headers)


class TestDeploymentPDF:
    """Test PDF generation for deployments"""
    
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
    
    def test_generate_pdf(self, headers):
        """Test GET /api/deployments/{id}/pdf - generate PDF checklist"""
        # First create equipment and deployment
        eq_payload = {
            "name": f"TEST_PDF_Eq_{uuid.uuid4().hex[:8]}",
            "brand": "Canon",
            "model": "EOS R5",
            "serial_number": "PDF-TEST-001",
            "condition": "bon"
        }
        eq_response = requests.post(f"{BASE_URL}/api/equipment", json=eq_payload, headers=headers)
        assert eq_response.status_code == 200
        eq_id = eq_response.json()["id"]
        
        dep_payload = {
            "name": f"TEST_PDF_Deployment_{uuid.uuid4().hex[:8]}",
            "location": "Paris",
            "start_date": "2026-03-25",
            "end_date": "2026-03-26",
            "equipment_ids": [eq_id]
        }
        dep_response = requests.post(f"{BASE_URL}/api/deployments", json=dep_payload, headers=headers)
        assert dep_response.status_code == 200
        dep_id = dep_response.json()["id"]
        
        # Generate PDF
        pdf_response = requests.get(f"{BASE_URL}/api/deployments/{dep_id}/pdf", headers=headers)
        assert pdf_response.status_code == 200, f"PDF generation failed: {pdf_response.text}"
        
        # Check content type
        content_type = pdf_response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF content type, got: {content_type}"
        
        # Check content disposition
        content_disp = pdf_response.headers.get("content-disposition", "")
        assert "attachment" in content_disp, "Should be attachment"
        assert ".pdf" in content_disp, "Should have .pdf extension"
        
        # Check PDF content starts with PDF magic bytes
        assert pdf_response.content[:4] == b'%PDF', "Content should be valid PDF"
        
        print(f"PDF generated successfully, size: {len(pdf_response.content)} bytes")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/deployments/{dep_id}", headers=headers)
        requests.delete(f"{BASE_URL}/api/equipment/{eq_id}", headers=headers)
    
    def test_pdf_not_found(self, headers):
        """Test PDF generation for non-existent deployment"""
        response = requests.get(f"{BASE_URL}/api/deployments/non-existent-id/pdf", headers=headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestEquipmentReminders:
    """Test equipment reminders endpoint"""
    
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
    
    def test_get_reminders(self, headers):
        """Test GET /api/equipment/reminders"""
        response = requests.get(f"{BASE_URL}/api/equipment/reminders", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Reminders should be a list"
        print(f"Found {len(data)} reminders")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
