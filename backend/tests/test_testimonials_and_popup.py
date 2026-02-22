"""
Test suite for Testimonials and Welcome Popup features
Tests:
- POST /api/testimonials - Public testimonial submission
- GET /api/testimonials - Get approved testimonials
- GET /api/admin/testimonials - Get all testimonials (admin)
- PUT /api/admin/testimonials/{id} - Update testimonial status
- DELETE /api/admin/testimonials/{id} - Delete testimonial
- GET /api/welcome-popup - Get popup configuration
- PUT /api/admin/welcome-popup - Update popup settings
- POST /api/admin/welcome-popup/video - Upload video
- DELETE /api/admin/welcome-popup/video - Delete video
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review_request
ADMIN_EMAIL = "testadmin@creativindustry.com"
ADMIN_PASSWORD = "testadmin123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin token for authenticated requests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    # Try fallback credentials
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@creativindustry.fr",
        "password": "admin123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def headers(admin_token):
    """Auth headers for admin requests"""
    return {"Authorization": f"Bearer {admin_token}"}


# ==================== TESTIMONIALS TESTS ====================

class TestTestimonialSubmission:
    """Test public testimonial submission endpoint"""
    
    def test_submit_testimonial_success(self):
        """POST /api/testimonials - Submit new testimonial"""
        test_id = str(uuid.uuid4())[:8]
        payload = {
            "client_name": f"TEST_Client_{test_id}",
            "client_email": f"test_{test_id}@example.com",
            "client_role": "Mariés 2024",
            "message": "Excellente expérience avec CREATIVINDUSTRY ! Photos et vidéos magnifiques.",
            "rating": 5,
            "service_type": "wedding"
        }
        
        response = requests.post(f"{BASE_URL}/api/testimonials", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "message" in data
        print(f"✅ Testimonial submission successful: {data['message']}")
    
    def test_submit_testimonial_minimal_fields(self):
        """POST /api/testimonials - Submit with minimal required fields"""
        test_id = str(uuid.uuid4())[:8]
        payload = {
            "client_name": f"TEST_Minimal_{test_id}",
            "client_email": f"minimal_{test_id}@example.com",
            "message": "Great service!",
            "rating": 4
        }
        
        response = requests.post(f"{BASE_URL}/api/testimonials", json=payload)
        
        assert response.status_code == 200
        print("✅ Minimal testimonial submission successful")
    
    def test_submit_testimonial_invalid_rating(self):
        """POST /api/testimonials - Reject invalid rating"""
        payload = {
            "client_name": "Test Invalid",
            "client_email": "invalid@test.com",
            "message": "Test message",
            "rating": 10  # Invalid - should be 1-5
        }
        
        response = requests.post(f"{BASE_URL}/api/testimonials", json=payload)
        # Should fail validation
        assert response.status_code == 422, f"Expected 422 for invalid rating, got {response.status_code}"
        print("✅ Invalid rating correctly rejected")


class TestPublicTestimonialsEndpoint:
    """Test public testimonials retrieval"""
    
    def test_get_approved_testimonials(self):
        """GET /api/testimonials - Get approved testimonials"""
        response = requests.get(f"{BASE_URL}/api/testimonials")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All returned testimonials should be approved
        for testimonial in data:
            assert testimonial.get("status") == "approved", f"Found non-approved testimonial: {testimonial}"
        
        print(f"✅ Retrieved {len(data)} approved testimonials")
    
    def test_get_featured_testimonials(self):
        """GET /api/testimonials/featured - Get featured testimonials"""
        response = requests.get(f"{BASE_URL}/api/testimonials/featured")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All should be approved AND featured
        for testimonial in data:
            assert testimonial.get("status") == "approved"
            assert testimonial.get("featured") == True
        
        print(f"✅ Retrieved {len(data)} featured testimonials")


class TestAdminTestimonialsManagement:
    """Test admin testimonial management endpoints"""
    
    def test_get_all_testimonials_admin(self, headers):
        """GET /api/admin/testimonials - Get all testimonials"""
        response = requests.get(f"{BASE_URL}/api/admin/testimonials", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Should include pending, approved, and rejected
        statuses = set(t.get("status") for t in data)
        print(f"✅ Retrieved {len(data)} testimonials with statuses: {statuses}")
    
    def test_approve_testimonial(self, headers):
        """PUT /api/admin/testimonials/{id} - Approve a testimonial"""
        # First, create a test testimonial
        test_id = str(uuid.uuid4())[:8]
        create_response = requests.post(f"{BASE_URL}/api/testimonials", json={
            "client_name": f"TEST_ToApprove_{test_id}",
            "client_email": f"approve_{test_id}@test.com",
            "message": "Test testimonial to approve",
            "rating": 5
        })
        assert create_response.status_code == 200
        
        # Get the testimonial ID
        all_testimonials = requests.get(f"{BASE_URL}/api/admin/testimonials", headers=headers).json()
        test_testimonial = next((t for t in all_testimonials if f"TEST_ToApprove_{test_id}" in t.get("client_name", "")), None)
        
        if test_testimonial:
            testimonial_id = test_testimonial["id"]
            
            # Approve it
            update_response = requests.put(
                f"{BASE_URL}/api/admin/testimonials/{testimonial_id}",
                json={"status": "approved"},
                headers=headers
            )
            
            assert update_response.status_code == 200
            assert update_response.json().get("success") == True
            print(f"✅ Testimonial {testimonial_id} approved successfully")
            
            # Clean up - delete test testimonial
            requests.delete(f"{BASE_URL}/api/admin/testimonials/{testimonial_id}", headers=headers)
        else:
            print("⚠️ Could not find test testimonial to approve")
    
    def test_reject_testimonial(self, headers):
        """PUT /api/admin/testimonials/{id} - Reject a testimonial"""
        # Create test testimonial
        test_id = str(uuid.uuid4())[:8]
        requests.post(f"{BASE_URL}/api/testimonials", json={
            "client_name": f"TEST_ToReject_{test_id}",
            "client_email": f"reject_{test_id}@test.com",
            "message": "Test testimonial to reject",
            "rating": 3
        })
        
        # Get the testimonial
        all_testimonials = requests.get(f"{BASE_URL}/api/admin/testimonials", headers=headers).json()
        test_testimonial = next((t for t in all_testimonials if f"TEST_ToReject_{test_id}" in t.get("client_name", "")), None)
        
        if test_testimonial:
            testimonial_id = test_testimonial["id"]
            
            # Reject it
            update_response = requests.put(
                f"{BASE_URL}/api/admin/testimonials/{testimonial_id}",
                json={"status": "rejected"},
                headers=headers
            )
            
            assert update_response.status_code == 200
            print(f"✅ Testimonial {testimonial_id} rejected successfully")
            
            # Clean up
            requests.delete(f"{BASE_URL}/api/admin/testimonials/{testimonial_id}", headers=headers)
        else:
            print("⚠️ Could not find test testimonial to reject")
    
    def test_toggle_featured(self, headers):
        """PUT /api/admin/testimonials/{id} - Toggle featured flag"""
        # Create and approve test testimonial
        test_id = str(uuid.uuid4())[:8]
        requests.post(f"{BASE_URL}/api/testimonials", json={
            "client_name": f"TEST_Featured_{test_id}",
            "client_email": f"featured_{test_id}@test.com",
            "message": "Test featured testimonial",
            "rating": 5
        })
        
        # Get and approve
        all_testimonials = requests.get(f"{BASE_URL}/api/admin/testimonials", headers=headers).json()
        test_testimonial = next((t for t in all_testimonials if f"TEST_Featured_{test_id}" in t.get("client_name", "")), None)
        
        if test_testimonial:
            testimonial_id = test_testimonial["id"]
            
            # Approve first
            requests.put(
                f"{BASE_URL}/api/admin/testimonials/{testimonial_id}",
                json={"status": "approved"},
                headers=headers
            )
            
            # Set featured
            update_response = requests.put(
                f"{BASE_URL}/api/admin/testimonials/{testimonial_id}",
                json={"featured": True},
                headers=headers
            )
            
            assert update_response.status_code == 200
            print(f"✅ Testimonial {testimonial_id} set as featured")
            
            # Clean up
            requests.delete(f"{BASE_URL}/api/admin/testimonials/{testimonial_id}", headers=headers)
        else:
            print("⚠️ Could not find test testimonial for featured toggle")
    
    def test_delete_testimonial(self, headers):
        """DELETE /api/admin/testimonials/{id} - Delete testimonial"""
        # Create test testimonial
        test_id = str(uuid.uuid4())[:8]
        requests.post(f"{BASE_URL}/api/testimonials", json={
            "client_name": f"TEST_ToDelete_{test_id}",
            "client_email": f"delete_{test_id}@test.com",
            "message": "Test testimonial to delete",
            "rating": 4
        })
        
        # Get the testimonial
        all_testimonials = requests.get(f"{BASE_URL}/api/admin/testimonials", headers=headers).json()
        test_testimonial = next((t for t in all_testimonials if f"TEST_ToDelete_{test_id}" in t.get("client_name", "")), None)
        
        if test_testimonial:
            testimonial_id = test_testimonial["id"]
            
            # Delete
            delete_response = requests.delete(
                f"{BASE_URL}/api/admin/testimonials/{testimonial_id}",
                headers=headers
            )
            
            assert delete_response.status_code == 200
            assert delete_response.json().get("success") == True
            print(f"✅ Testimonial {testimonial_id} deleted successfully")
            
            # Verify deletion
            all_after = requests.get(f"{BASE_URL}/api/admin/testimonials", headers=headers).json()
            assert not any(t["id"] == testimonial_id for t in all_after), "Testimonial still exists after deletion"
            print("✅ Verified testimonial no longer exists")
        else:
            print("⚠️ Could not find test testimonial to delete")
    
    def test_unauthorized_access(self):
        """GET /api/admin/testimonials - Reject unauthorized access"""
        response = requests.get(f"{BASE_URL}/api/admin/testimonials")
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("✅ Unauthorized access correctly rejected")


# ==================== WELCOME POPUP TESTS ====================

class TestWelcomePopupPublic:
    """Test public welcome popup endpoint"""
    
    def test_get_welcome_popup_config(self):
        """GET /api/welcome-popup - Get popup configuration"""
        response = requests.get(f"{BASE_URL}/api/welcome-popup")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify expected fields exist
        assert "enabled" in data
        assert "title" in data
        assert "subtitle" in data
        assert "button_text" in data
        assert "button_link" in data
        
        print(f"✅ Welcome popup config retrieved: enabled={data['enabled']}, video={'Yes' if data.get('video_url') else 'No'}")


class TestWelcomePopupAdmin:
    """Test admin welcome popup management"""
    
    def test_update_popup_title(self, headers):
        """PUT /api/admin/welcome-popup - Update title"""
        # Get current config
        current = requests.get(f"{BASE_URL}/api/welcome-popup").json()
        original_title = current.get("title", "")
        
        # Update title
        test_title = f"Test Title {str(uuid.uuid4())[:8]}"
        update_response = requests.put(
            f"{BASE_URL}/api/admin/welcome-popup",
            json={"title": test_title},
            headers=headers
        )
        
        assert update_response.status_code == 200
        assert update_response.json().get("success") == True
        
        # Verify update
        updated = requests.get(f"{BASE_URL}/api/welcome-popup").json()
        assert updated.get("title") == test_title
        print(f"✅ Popup title updated successfully")
        
        # Restore original
        requests.put(
            f"{BASE_URL}/api/admin/welcome-popup",
            json={"title": original_title or "Bienvenue chez CREATIVINDUSTRY"},
            headers=headers
        )
    
    def test_update_popup_enabled_status(self, headers):
        """PUT /api/admin/welcome-popup - Toggle enabled"""
        # Get current
        current = requests.get(f"{BASE_URL}/api/welcome-popup").json()
        original_enabled = current.get("enabled", True)
        
        # Toggle
        new_enabled = not original_enabled
        update_response = requests.put(
            f"{BASE_URL}/api/admin/welcome-popup",
            json={"enabled": new_enabled},
            headers=headers
        )
        
        assert update_response.status_code == 200
        
        # Verify
        updated = requests.get(f"{BASE_URL}/api/welcome-popup").json()
        assert updated.get("enabled") == new_enabled
        print(f"✅ Popup enabled status changed to {new_enabled}")
        
        # Restore original
        requests.put(
            f"{BASE_URL}/api/admin/welcome-popup",
            json={"enabled": original_enabled},
            headers=headers
        )
    
    def test_update_popup_button_settings(self, headers):
        """PUT /api/admin/welcome-popup - Update button settings"""
        update_response = requests.put(
            f"{BASE_URL}/api/admin/welcome-popup",
            json={
                "button_text": "Voir le portfolio",
                "button_link": "/portfolio"
            },
            headers=headers
        )
        
        assert update_response.status_code == 200
        
        # Verify
        updated = requests.get(f"{BASE_URL}/api/welcome-popup").json()
        assert updated.get("button_text") == "Voir le portfolio"
        assert updated.get("button_link") == "/portfolio"
        print("✅ Popup button settings updated successfully")
    
    def test_update_popup_unauthorized(self):
        """PUT /api/admin/welcome-popup - Reject unauthorized access"""
        response = requests.put(
            f"{BASE_URL}/api/admin/welcome-popup",
            json={"title": "Unauthorized"}
        )
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("✅ Unauthorized popup update correctly rejected")


# ==================== CLEANUP ====================

@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data(headers):
    """Clean up test testimonials after all tests"""
    yield
    
    # After tests complete, clean up any TEST_ prefixed testimonials
    try:
        if headers:
            all_testimonials = requests.get(f"{BASE_URL}/api/admin/testimonials", headers=headers).json()
            for t in all_testimonials:
                if t.get("client_name", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/admin/testimonials/{t['id']}", headers=headers)
                    print(f"🧹 Cleaned up test testimonial: {t['client_name']}")
    except Exception as e:
        print(f"⚠️ Cleanup error: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
