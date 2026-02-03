"""
Newsletter Unsubscribe/Resubscribe API Tests
Tests for:
- GET /api/newsletter/unsubscribe/{client_id} - Unsubscribe a client
- POST /api/newsletter/resubscribe/{client_id} - Resubscribe a client
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test client ID provided in the review request
TEST_CLIENT_ID = "d578a845-ed8f-45d6-937a-c1c993d618a5"
TEST_CLIENT_EMAIL = "demo_client@test.com"
INVALID_CLIENT_ID = "00000000-0000-0000-0000-000000000000"


class TestNewsletterUnsubscribe:
    """Tests for newsletter unsubscribe endpoint"""
    
    def test_unsubscribe_valid_client(self):
        """Test unsubscribing a valid client - should return success or already_unsubscribed"""
        response = requests.get(f"{BASE_URL}/api/newsletter/unsubscribe/{TEST_CLIENT_ID}")
        
        # Should return 200 OK
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should have message field
        assert "message" in data, "Response should contain 'message' field"
        # Should have already_unsubscribed field
        assert "already_unsubscribed" in data, "Response should contain 'already_unsubscribed' field"
        
        # If not already unsubscribed, should return email
        if not data.get("already_unsubscribed"):
            assert "email" in data, "Response should contain 'email' field when unsubscribing"
            print(f"✓ Client unsubscribed successfully: {data.get('email')}")
        else:
            print(f"✓ Client was already unsubscribed")
    
    def test_unsubscribe_already_unsubscribed(self):
        """Test unsubscribing a client who is already unsubscribed"""
        # First call to ensure unsubscribed
        requests.get(f"{BASE_URL}/api/newsletter/unsubscribe/{TEST_CLIENT_ID}")
        
        # Second call should return already_unsubscribed: true
        response = requests.get(f"{BASE_URL}/api/newsletter/unsubscribe/{TEST_CLIENT_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("already_unsubscribed") == True, "Should indicate already unsubscribed"
        print(f"✓ Correctly returns already_unsubscribed: true")
    
    def test_unsubscribe_invalid_client_id(self):
        """Test unsubscribing with an invalid client ID - should return 404"""
        response = requests.get(f"{BASE_URL}/api/newsletter/unsubscribe/{INVALID_CLIENT_ID}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Response should contain error detail"
        print(f"✓ Correctly returns 404 for invalid client ID")


class TestNewsletterResubscribe:
    """Tests for newsletter resubscribe endpoint"""
    
    def test_resubscribe_valid_client(self):
        """Test resubscribing a valid client"""
        # First ensure client is unsubscribed
        requests.get(f"{BASE_URL}/api/newsletter/unsubscribe/{TEST_CLIENT_ID}")
        
        # Now resubscribe
        response = requests.post(f"{BASE_URL}/api/newsletter/resubscribe/{TEST_CLIENT_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message' field"
        assert "email" in data, "Response should contain 'email' field"
        print(f"✓ Client resubscribed successfully: {data.get('email')}")
    
    def test_resubscribe_invalid_client_id(self):
        """Test resubscribing with an invalid client ID - should return 404"""
        response = requests.post(f"{BASE_URL}/api/newsletter/resubscribe/{INVALID_CLIENT_ID}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Response should contain error detail"
        print(f"✓ Correctly returns 404 for invalid client ID")


class TestNewsletterFullFlow:
    """Test complete unsubscribe/resubscribe flow"""
    
    def test_full_unsubscribe_resubscribe_flow(self):
        """Test the complete flow: unsubscribe -> verify -> resubscribe -> verify"""
        
        # Step 1: Resubscribe first to ensure clean state
        response = requests.post(f"{BASE_URL}/api/newsletter/resubscribe/{TEST_CLIENT_ID}")
        assert response.status_code == 200, f"Resubscribe failed: {response.text}"
        print("✓ Step 1: Client resubscribed (clean state)")
        
        # Step 2: Unsubscribe
        response = requests.get(f"{BASE_URL}/api/newsletter/unsubscribe/{TEST_CLIENT_ID}")
        assert response.status_code == 200, f"Unsubscribe failed: {response.text}"
        data = response.json()
        assert data.get("already_unsubscribed") == False, "Should not be already unsubscribed"
        print("✓ Step 2: Client unsubscribed successfully")
        
        # Step 3: Try to unsubscribe again - should return already_unsubscribed
        response = requests.get(f"{BASE_URL}/api/newsletter/unsubscribe/{TEST_CLIENT_ID}")
        assert response.status_code == 200, f"Second unsubscribe failed: {response.text}"
        data = response.json()
        assert data.get("already_unsubscribed") == True, "Should indicate already unsubscribed"
        print("✓ Step 3: Correctly returns already_unsubscribed on second call")
        
        # Step 4: Resubscribe
        response = requests.post(f"{BASE_URL}/api/newsletter/resubscribe/{TEST_CLIENT_ID}")
        assert response.status_code == 200, f"Resubscribe failed: {response.text}"
        print("✓ Step 4: Client resubscribed successfully")
        
        # Step 5: Unsubscribe again - should work (not already_unsubscribed)
        response = requests.get(f"{BASE_URL}/api/newsletter/unsubscribe/{TEST_CLIENT_ID}")
        assert response.status_code == 200, f"Final unsubscribe failed: {response.text}"
        data = response.json()
        assert data.get("already_unsubscribed") == False, "Should not be already unsubscribed after resubscribe"
        print("✓ Step 5: Unsubscribe works correctly after resubscribe")
        
        print("\n✓ Full flow test completed successfully!")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
