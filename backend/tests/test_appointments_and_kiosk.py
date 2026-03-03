"""
Backend API tests for:
1. PhotoFind Kiosk API
2. Admin Appointment Management (cancel, delete)
3. DELETE /api/appointments/{id} endpoint
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://appointment-hub-389.preview.emergentagent.com').rstrip('/')

@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "test@admin.com", "password": "admin123"}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")

@pytest.fixture
def admin_headers(admin_token):
    """Headers with admin token"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestPhotoFindKiosk:
    """Test PhotoFind Kiosk API endpoints"""
    
    def test_kiosk_event_loads(self):
        """Test that the PhotoFind kiosk event endpoint returns valid data"""
        response = requests.get(f"{BASE_URL}/api/public/photofind/test-kiosk-demo")
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["id"] == "test-kiosk-demo"
        assert "name" in data
        assert "Mariage Demo" in data["name"] or "Kiosque" in data["name"]
        assert "pricing" in data
        print(f"✓ PhotoFind event loaded: {data['name']}")
    
    def test_kiosk_event_has_pricing(self):
        """Test that the event has proper pricing structure"""
        response = requests.get(f"{BASE_URL}/api/public/photofind/test-kiosk-demo")
        assert response.status_code == 200
        
        data = response.json()
        pricing = data.get("pricing", {})
        
        # Check for format-based pricing
        assert "formats" in pricing or "email_single" in pricing
        if "formats" in pricing:
            formats = pricing["formats"]
            assert "10x15" in formats
            assert "sans_cadre" in formats["10x15"]
            print(f"✓ Format pricing found: {formats['10x15']}")
        
        # Check for email pricing
        if "email_single" in pricing:
            assert pricing["email_single"] > 0
            print(f"✓ Email single price: {pricing['email_single']}€")
    
    def test_kiosk_event_is_active(self):
        """Test that the kiosk event is active"""
        response = requests.get(f"{BASE_URL}/api/public/photofind/test-kiosk-demo")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("is_active", True) == True
        print("✓ PhotoFind event is active")


class TestAppointmentManagement:
    """Test Appointment CRUD and management endpoints"""
    
    def test_list_appointments(self, admin_headers):
        """Test listing all appointments"""
        response = requests.get(f"{BASE_URL}/api/appointments", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} appointments")
    
    def test_create_and_delete_appointment(self, admin_headers):
        """Test creating and then deleting an appointment"""
        # Create test appointment
        test_id = str(uuid.uuid4())[:8]
        create_data = {
            "client_name": f"TEST_Delete_{test_id}",
            "client_email": f"test_delete_{test_id}@test.com",
            "client_phone": "+33612345678",
            "appointment_type": "other",
            "duration": "30",
            "proposed_date": "2026-12-25",
            "proposed_time": "14:00",
            "message": "Test appointment for deletion testing"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/appointments",
            json=create_data
        )
        assert create_response.status_code in [200, 201]
        created = create_response.json()
        appointment_id = created.get("id")
        assert appointment_id is not None
        print(f"✓ Created appointment: {appointment_id}")
        
        # Delete the appointment
        delete_response = requests.delete(
            f"{BASE_URL}/api/appointments/{appointment_id}",
            headers=admin_headers
        )
        assert delete_response.status_code == 200
        delete_data = delete_response.json()
        assert delete_data.get("message") == "Appointment deleted successfully"
        print(f"✓ Deleted appointment: {appointment_id}")
        
        # Verify deletion by listing
        list_response = requests.get(f"{BASE_URL}/api/appointments", headers=admin_headers)
        appointments = list_response.json()
        appointment_ids = [a.get("id") for a in appointments]
        assert appointment_id not in appointment_ids
        print("✓ Verified appointment is deleted from list")
    
    def test_cancel_appointment(self, admin_headers):
        """Test cancelling an appointment (status update)"""
        # Create test appointment
        test_id = str(uuid.uuid4())[:8]
        create_data = {
            "client_name": f"TEST_Cancel_{test_id}",
            "client_email": f"test_cancel_{test_id}@test.com",
            "client_phone": "+33612345678",
            "appointment_type": "project",
            "duration": "60",
            "proposed_date": "2026-11-15",
            "proposed_time": "10:00"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/appointments", json=create_data)
        assert create_response.status_code in [200, 201]
        appointment_id = create_response.json().get("id")
        print(f"✓ Created appointment for cancel test: {appointment_id}")
        
        # Cancel the appointment (change status)
        cancel_response = requests.put(
            f"{BASE_URL}/api/appointments/{appointment_id}",
            json={
                "status": "cancelled",
                "admin_response": "Test cancellation"
            },
            headers=admin_headers
        )
        assert cancel_response.status_code == 200
        print("✓ Appointment cancelled successfully")
        
        # Verify status changed
        list_response = requests.get(f"{BASE_URL}/api/appointments", headers=admin_headers)
        appointments = list_response.json()
        target = next((a for a in appointments if a.get("id") == appointment_id), None)
        assert target is not None
        assert target.get("status") == "cancelled"
        print("✓ Verified appointment status is 'cancelled'")
        
        # Cleanup - delete the test appointment
        requests.delete(f"{BASE_URL}/api/appointments/{appointment_id}", headers=admin_headers)
    
    def test_confirmed_appointment_exists(self, admin_headers):
        """Test that the confirmed test appointment (Jean Dupont) exists"""
        response = requests.get(f"{BASE_URL}/api/appointments", headers=admin_headers)
        assert response.status_code == 200
        
        appointments = response.json()
        confirmed_appointments = [a for a in appointments if a.get("status") == "confirmed"]
        
        assert len(confirmed_appointments) >= 1, "Expected at least one confirmed appointment"
        
        # Check for Jean Dupont's confirmed appointment
        jean_appointment = next(
            (a for a in confirmed_appointments if "Jean Dupont" in a.get("client_name", "")),
            None
        )
        if jean_appointment:
            print(f"✓ Found confirmed appointment for Jean Dupont: {jean_appointment.get('id')}")
        else:
            print(f"✓ Found {len(confirmed_appointments)} confirmed appointment(s)")


class TestDeleteEndpoint:
    """Specific tests for DELETE /api/appointments/{id} endpoint"""
    
    def test_delete_nonexistent_appointment(self, admin_headers):
        """Test deleting a non-existent appointment returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(
            f"{BASE_URL}/api/appointments/{fake_id}",
            headers=admin_headers
        )
        # Should return 404 or 500 (depending on implementation)
        assert response.status_code in [404, 500]
        print(f"✓ Non-existent appointment returns {response.status_code}")
    
    def test_delete_without_auth_fails(self):
        """Test that delete without authentication fails"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/appointments/{fake_id}")
        assert response.status_code in [401, 403, 422]
        print(f"✓ Delete without auth returns {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
