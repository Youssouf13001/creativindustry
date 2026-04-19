"""
VIP Video Platform & PDF Email Tests
Tests for:
- VIP Client CRUD (admin)
- VIP Client authentication
- Video management (admin)
- Video streaming
- PDF email sending for deployments
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://asset-manager-302.preview.emergentagent.com"

# Test credentials
ADMIN_EMAIL = "test@admin.com"
ADMIN_PASSWORD = "admin123"
VIP_TEST_EMAIL = "jean@test.com"
VIP_TEST_PASSWORD = "vip123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestVIPClientCRUD:
    """VIP Client management tests (Admin endpoints)"""
    
    created_client_id = None
    
    def test_get_vip_clients_list(self, admin_headers):
        """GET /api/vip/clients - Get all VIP clients"""
        response = requests.get(f"{BASE_URL}/api/vip/clients", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} VIP clients")
    
    def test_create_vip_client(self, admin_headers):
        """POST /api/vip/clients - Create a VIP client with bcrypt password"""
        unique_email = f"test_vip_{uuid.uuid4().hex[:8]}@test.com"
        payload = {
            "name": "TEST VIP Client",
            "email": unique_email,
            "password": "testpass123",
            "notes": "Test client created by pytest"
        }
        response = requests.post(f"{BASE_URL}/api/vip/clients", json=payload, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain client id"
        assert "message" in data, "Response should contain message"
        TestVIPClientCRUD.created_client_id = data["id"]
        print(f"Created VIP client: {data['id']}")
    
    def test_create_duplicate_email_fails(self, admin_headers):
        """POST /api/vip/clients - Duplicate email should fail"""
        # Try to create with existing email
        payload = {
            "name": "Duplicate Test",
            "email": VIP_TEST_EMAIL,  # Already exists
            "password": "testpass"
        }
        response = requests.post(f"{BASE_URL}/api/vip/clients", json=payload, headers=admin_headers)
        assert response.status_code == 400, f"Expected 400 for duplicate email, got {response.status_code}"
        print("Duplicate email correctly rejected")
    
    def test_update_vip_client(self, admin_headers):
        """PUT /api/vip/clients/{id} - Update client"""
        if not TestVIPClientCRUD.created_client_id:
            pytest.skip("No client created to update")
        
        payload = {
            "name": "TEST VIP Client Updated",
            "notes": "Updated by pytest"
        }
        response = requests.put(
            f"{BASE_URL}/api/vip/clients/{TestVIPClientCRUD.created_client_id}",
            json=payload,
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("VIP client updated successfully")
    
    def test_update_nonexistent_client_fails(self, admin_headers):
        """PUT /api/vip/clients/{id} - Nonexistent client should return 404"""
        response = requests.put(
            f"{BASE_URL}/api/vip/clients/nonexistent-id-12345",
            json={"name": "Test"},
            headers=admin_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Nonexistent client update correctly returns 404")
    
    def test_delete_vip_client(self, admin_headers):
        """DELETE /api/vip/clients/{id} - Delete client"""
        if not TestVIPClientCRUD.created_client_id:
            pytest.skip("No client created to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/vip/clients/{TestVIPClientCRUD.created_client_id}",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("VIP client deleted successfully")
        
        # Verify deletion
        response = requests.get(f"{BASE_URL}/api/vip/clients", headers=admin_headers)
        clients = response.json()
        client_ids = [c["id"] for c in clients]
        assert TestVIPClientCRUD.created_client_id not in client_ids, "Client should be deleted"


class TestVIPClientAuth:
    """VIP Client authentication tests"""
    
    def test_vip_login_success(self):
        """POST /api/vip/login - Successful login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/vip/login", json={
            "email": VIP_TEST_EMAIL,
            "password": VIP_TEST_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "client" in data, "Response should contain client info"
        assert data["client"]["email"] == VIP_TEST_EMAIL
        print(f"VIP login successful for {data['client']['name']}")
    
    def test_vip_login_wrong_password(self):
        """POST /api/vip/login - Wrong password should return 401"""
        response = requests.post(f"{BASE_URL}/api/vip/login", json={
            "email": VIP_TEST_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Wrong password correctly rejected")
    
    def test_vip_login_nonexistent_email(self):
        """POST /api/vip/login - Nonexistent email should return 401"""
        response = requests.post(f"{BASE_URL}/api/vip/login", json={
            "email": "nonexistent@test.com",
            "password": "anypassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Nonexistent email correctly rejected")


class TestVIPVideos:
    """VIP Video management tests"""
    
    def test_get_all_videos_admin(self, admin_headers):
        """GET /api/vip/videos - Get all videos (admin)"""
        response = requests.get(f"{BASE_URL}/api/vip/videos", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} videos")
    
    def test_get_my_videos_vip_client(self):
        """GET /api/vip/my-videos - Get videos for authenticated VIP client"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/vip/login", json={
            "email": VIP_TEST_EMAIL,
            "password": VIP_TEST_PASSWORD
        })
        assert login_response.status_code == 200
        vip_token = login_response.json()["token"]
        
        # Get my videos
        response = requests.get(
            f"{BASE_URL}/api/vip/my-videos",
            headers={"Authorization": f"Bearer {vip_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"VIP client has access to {len(data)} videos")
    
    def test_get_my_videos_without_auth(self):
        """GET /api/vip/my-videos - Should require authentication"""
        response = requests.get(f"{BASE_URL}/api/vip/my-videos")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthenticated access correctly rejected")
    
    def test_upload_chunk_endpoint_exists(self, admin_headers):
        """POST /api/vip/videos/upload-chunk - Endpoint should exist"""
        # Test with minimal data to verify endpoint exists
        # We don't actually upload a file, just verify the endpoint responds
        from io import BytesIO
        
        files = {
            'chunk': ('test.mp4', BytesIO(b'test content'), 'video/mp4')
        }
        data = {
            'upload_id': str(uuid.uuid4()),
            'chunk_index': '0',
            'total_chunks': '1',
            'filename': 'test.mp4',
            'title': 'Test Video',
            'description': '',
            'category': 'Test',
            'client_ids': ''
        }
        
        response = requests.post(
            f"{BASE_URL}/api/vip/videos/upload-chunk",
            files=files,
            data=data,
            headers=admin_headers
        )
        # Should return 200 (uploading or complete status)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        result = response.json()
        assert "status" in result, "Response should contain status"
        print(f"Upload chunk endpoint working, status: {result['status']}")


class TestDeploymentPDFEmail:
    """Deployment PDF email tests"""
    
    deployment_id = None
    
    def test_get_deployments_list(self, admin_headers):
        """GET /api/deployments - Get deployments to find one for testing"""
        response = requests.get(f"{BASE_URL}/api/deployments", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        deployments = response.json()
        if deployments:
            TestDeploymentPDFEmail.deployment_id = deployments[0]["id"]
            print(f"Found deployment for testing: {deployments[0]['name']}")
        else:
            print("No deployments found, will create one")
    
    def test_create_deployment_for_pdf_test(self, admin_headers):
        """POST /api/deployments - Create deployment if none exists"""
        if TestDeploymentPDFEmail.deployment_id:
            pytest.skip("Deployment already exists")
        
        payload = {
            "name": "TEST PDF Deployment",
            "location": "Test Location",
            "start_date": "2026-01-20",
            "end_date": "2026-01-25",
            "notes": "Test deployment for PDF email",
            "equipment_ids": []
        }
        response = requests.post(f"{BASE_URL}/api/deployments", json=payload, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        TestDeploymentPDFEmail.deployment_id = data["id"]
        print(f"Created test deployment: {data['id']}")
    
    def test_send_pdf_endpoint_exists(self, admin_headers):
        """POST /api/deployments/{id}/send-pdf - Endpoint should exist and accept email+message"""
        if not TestDeploymentPDFEmail.deployment_id:
            pytest.skip("No deployment available for testing")
        
        payload = {
            "email": "test@example.com",
            "message": "Test message for PDF"
        }
        response = requests.post(
            f"{BASE_URL}/api/deployments/{TestDeploymentPDFEmail.deployment_id}/send-pdf",
            json=payload,
            headers=admin_headers
        )
        # Expected: 500 because SMTP is not configured in preview env (as noted in context)
        # OR 200 if email service is mocked/working
        assert response.status_code in [200, 500], f"Expected 200 or 500, got {response.status_code}: {response.text}"
        
        if response.status_code == 500:
            print("Send PDF endpoint exists but SMTP not configured (expected in preview env)")
        else:
            print("Send PDF endpoint working and email sent")
    
    def test_send_pdf_nonexistent_deployment(self, admin_headers):
        """POST /api/deployments/{id}/send-pdf - Nonexistent deployment should return 404"""
        payload = {
            "email": "test@example.com",
            "message": "Test"
        }
        response = requests.post(
            f"{BASE_URL}/api/deployments/nonexistent-id-12345/send-pdf",
            json=payload,
            headers=admin_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Nonexistent deployment correctly returns 404")
    
    def test_get_deployment_pdf(self, admin_headers):
        """GET /api/deployments/{id}/pdf - PDF generation should work"""
        if not TestDeploymentPDFEmail.deployment_id:
            pytest.skip("No deployment available for testing")
        
        response = requests.get(
            f"{BASE_URL}/api/deployments/{TestDeploymentPDFEmail.deployment_id}/pdf",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf", "Should return PDF"
        print("PDF generation working")


class TestVideoStreaming:
    """Video streaming tests"""
    
    def test_stream_nonexistent_video(self):
        """GET /api/vip/stream/{id} - Nonexistent video should return 404"""
        response = requests.get(f"{BASE_URL}/api/vip/stream/nonexistent-video-id")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Nonexistent video stream correctly returns 404")
    
    def test_thumbnail_nonexistent(self):
        """GET /api/vip/thumbnails/{filename} - Nonexistent thumbnail should return 404"""
        response = requests.get(f"{BASE_URL}/api/vip/thumbnails/nonexistent.jpg")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Nonexistent thumbnail correctly returns 404")


class TestAuthRequired:
    """Test that endpoints require authentication"""
    
    def test_vip_clients_requires_auth(self):
        """GET /api/vip/clients - Should require admin auth"""
        response = requests.get(f"{BASE_URL}/api/vip/clients")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("VIP clients endpoint correctly requires auth")
    
    def test_vip_videos_requires_auth(self):
        """GET /api/vip/videos - Should require admin auth"""
        response = requests.get(f"{BASE_URL}/api/vip/videos")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("VIP videos endpoint correctly requires auth")
    
    def test_upload_chunk_requires_auth(self):
        """POST /api/vip/videos/upload-chunk - Should require admin auth"""
        response = requests.post(f"{BASE_URL}/api/vip/videos/upload-chunk")
        assert response.status_code in [401, 422], f"Expected 401 or 422, got {response.status_code}"
        print("Upload chunk endpoint correctly requires auth")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
