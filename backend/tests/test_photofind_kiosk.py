"""
PhotoFind Kiosk Mode Backend Tests
Tests for the PhotoFind kiosk endpoints: public event info, kiosk purchase, and print logging
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test event ID for kiosk demo
TEST_EVENT_ID = "test-kiosk-demo"


class TestPhotoFindKioskPublic:
    """Tests for public PhotoFind kiosk endpoints"""
    
    def test_get_event_info(self):
        """Test GET /api/public/photofind/{eventId} - Returns event info with pricing"""
        response = requests.get(f"{BASE_URL}/api/public/photofind/{TEST_EVENT_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify required fields
        assert "id" in data, "Response should contain 'id'"
        assert "name" in data, "Response should contain 'name'"
        assert "is_active" in data, "Response should contain 'is_active'"
        assert "pricing" in data, "Response should contain 'pricing'"
        
        # Verify event ID matches
        assert data["id"] == TEST_EVENT_ID, f"Event ID should be {TEST_EVENT_ID}"
        
        # Verify event is active
        assert data["is_active"] == True, "Event should be active"
        
        # Verify pricing structure
        pricing = data["pricing"]
        assert "per_photo" in pricing or "single" in pricing, "Pricing should have per_photo or single"
        assert "pack_5" in pricing, "Pricing should have pack_5"
        assert "pack_10" in pricing, "Pricing should have pack_10"
        assert "all" in pricing, "Pricing should have all"
        
        print(f"PASS: Event '{data['name']}' loaded successfully with pricing")
    
    def test_get_nonexistent_event(self):
        """Test GET /api/public/photofind/{eventId} - Returns 404 for non-existent event"""
        response = requests.get(f"{BASE_URL}/api/public/photofind/nonexistent-event-12345")
        
        assert response.status_code == 404, f"Expected 404 for non-existent event, got {response.status_code}"
        print("PASS: Non-existent event returns 404")


class TestPhotoFindKioskPurchase:
    """Tests for kiosk purchase endpoint"""
    
    def test_create_kiosk_purchase_success(self):
        """Test POST /api/public/photofind/{eventId}/kiosk-purchase - Creates purchase successfully"""
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        
        payload = {
            "photo_ids": ["test-photo-1", "test-photo-2"],
            "email": test_email,
            "amount": 10.0,
            "payment_method": "kiosk"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public/photofind/{TEST_EVENT_ID}/kiosk-purchase",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "Response should indicate success"
        assert "purchase_id" in data, "Response should contain purchase_id"
        assert "download_url" in data, "Response should contain download_url"
        assert "message" in data, "Response should contain message"
        
        # Verify purchase ID is a valid UUID
        purchase_id = data["purchase_id"]
        try:
            uuid.UUID(purchase_id)
        except ValueError:
            pytest.fail(f"Purchase ID '{purchase_id}' is not a valid UUID")
        
        # Verify download URL contains the purchase ID
        assert purchase_id in data["download_url"], "Download URL should contain purchase ID"
        
        print(f"PASS: Kiosk purchase created successfully with ID: {purchase_id}")
    
    def test_create_kiosk_purchase_nonexistent_event(self):
        """Test POST /api/public/photofind/{eventId}/kiosk-purchase - Returns 404 for non-existent event"""
        payload = {
            "photo_ids": ["photo-1"],
            "email": "test@example.com",
            "amount": 5.0,
            "payment_method": "kiosk"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public/photofind/nonexistent-event-12345/kiosk-purchase",
            json=payload
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent event, got {response.status_code}"
        print("PASS: Purchase for non-existent event returns 404")
    
    def test_create_kiosk_purchase_validation(self):
        """Test POST /api/public/photofind/{eventId}/kiosk-purchase - Validates required fields"""
        # Missing required fields
        payload = {
            "email": "test@example.com"
            # Missing photo_ids and amount
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public/photofind/{TEST_EVENT_ID}/kiosk-purchase",
            json=payload
        )
        
        # Should return 422 for validation error
        assert response.status_code == 422, f"Expected 422 for validation error, got {response.status_code}"
        print("PASS: Validation error returns 422")


class TestPhotoFindKioskPrintLog:
    """Tests for kiosk print logging endpoint"""
    
    def test_log_print_success(self):
        """Test POST /api/public/photofind/{eventId}/log-print - Logs print job successfully"""
        payload = {
            "photo_ids": ["test-photo-1", "test-photo-2", "test-photo-3"],
            "count": 3
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public/photofind/{TEST_EVENT_ID}/log-print",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response
        assert data.get("success") == True, "Response should indicate success"
        assert data.get("logged") == 3, f"Expected logged count 3, got {data.get('logged')}"
        
        print(f"PASS: Print log created successfully with {data.get('logged')} photos")
    
    def test_log_print_validation(self):
        """Test POST /api/public/photofind/{eventId}/log-print - Validates required fields"""
        # Missing required fields
        payload = {}
        
        response = requests.post(
            f"{BASE_URL}/api/public/photofind/{TEST_EVENT_ID}/log-print",
            json=payload
        )
        
        # Should return 422 for validation error
        assert response.status_code == 422, f"Expected 422 for validation error, got {response.status_code}"
        print("PASS: Validation error returns 422")


class TestPhotoFindKioskPhotoServing:
    """Tests for photo serving endpoint"""
    
    def test_serve_nonexistent_photo(self):
        """Test GET /api/public/photofind/{eventId}/photo/{photoId} - Returns 404 for non-existent photo"""
        response = requests.get(
            f"{BASE_URL}/api/public/photofind/{TEST_EVENT_ID}/photo/nonexistent-photo-12345"
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent photo, got {response.status_code}"
        print("PASS: Non-existent photo returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
