"""
Test Guestbook Video Montage APIs
Tests for:
- GET /api/client/guestbooks - Get client guestbooks list
- GET /api/client/guestbook/{id}/montages - Get montages for a guestbook
- POST /api/client/guestbook/{id}/generate-montage - Generate video montage
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CLIENT_EMAIL = "test@client.com"
CLIENT_PASSWORD = "password123"
TEST_GUESTBOOK_ID = "test_guestbook_001"


@pytest.fixture(scope="module")
def client_token():
    """Get client authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/client/login",
        json={"email": CLIENT_EMAIL, "password": CLIENT_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Client login failed: {response.status_code} - {response.text}")
    return response.json().get("token")


@pytest.fixture(scope="module")
def auth_headers(client_token):
    """Get authorization headers"""
    return {
        "Authorization": f"Bearer {client_token}",
        "Content-Type": "application/json"
    }


class TestClientLogin:
    """Test client authentication"""
    
    def test_client_login_success(self):
        """Test successful client login"""
        response = requests.post(
            f"{BASE_URL}/api/client/login",
            json={"email": CLIENT_EMAIL, "password": CLIENT_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "client" in data
        assert data["client"]["email"] == CLIENT_EMAIL
        print(f"✓ Client login successful: {data['client']['name']}")
    
    def test_client_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/client/login",
            json={"email": "invalid@test.com", "password": "wrongpass"}
        )
        assert response.status_code in [401, 400, 404]
        print("✓ Invalid credentials rejected correctly")


class TestClientGuestbooks:
    """Test /api/client/guestbooks endpoint"""
    
    def test_get_client_guestbooks(self, auth_headers):
        """Test GET /api/client/guestbooks - list client's guestbooks"""
        response = requests.get(
            f"{BASE_URL}/api/client/guestbooks",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} guestbook(s)")
        
        # Check for test guestbook
        test_gb = next((gb for gb in data if gb["id"] == TEST_GUESTBOOK_ID), None)
        assert test_gb is not None, "Test guestbook not found"
        assert test_gb["name"] == "Mariage Test"
        assert "message_count" in test_gb
        assert "approved_count" in test_gb
        print(f"✓ Found test guestbook: {test_gb['name']} with {test_gb['message_count']} messages")
    
    def test_get_client_guestbooks_unauthorized(self):
        """Test GET /api/client/guestbooks without auth"""
        response = requests.get(f"{BASE_URL}/api/client/guestbooks")
        assert response.status_code in [401, 403]
        print("✓ Unauthorized access rejected correctly")


class TestGuestbookDetail:
    """Test /api/client/guestbooks/{id} endpoint"""
    
    def test_get_guestbook_detail(self, auth_headers):
        """Test GET /api/client/guestbooks/{id} - get guestbook with messages"""
        response = requests.get(
            f"{BASE_URL}/api/client/guestbooks/{TEST_GUESTBOOK_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "id" in data
        assert "name" in data
        assert "messages" in data
        assert data["id"] == TEST_GUESTBOOK_ID
        assert data["name"] == "Mariage Test"
        assert isinstance(data["messages"], list)
        print(f"✓ Got guestbook detail with {len(data['messages'])} messages")
        
        # Check message structure if any
        if data["messages"]:
            msg = data["messages"][0]
            assert "id" in msg
            assert "message_type" in msg
            assert "is_approved" in msg
            print(f"✓ Message structure validated")
    
    def test_get_guestbook_not_found(self, auth_headers):
        """Test GET /api/client/guestbooks/{id} - non-existent guestbook"""
        response = requests.get(
            f"{BASE_URL}/api/client/guestbooks/non_existent_id",
            headers=auth_headers
        )
        assert response.status_code == 404
        print("✓ Non-existent guestbook returns 404")


class TestGuestbookMontages:
    """Test /api/client/guestbook/{id}/montages endpoint"""
    
    def test_get_montages_list(self, auth_headers):
        """Test GET /api/client/guestbook/{id}/montages - list montages"""
        response = requests.get(
            f"{BASE_URL}/api/client/guestbook/{TEST_GUESTBOOK_ID}/montages",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "montages" in data
        assert isinstance(data["montages"], list)
        print(f"✓ Got {len(data['montages'])} existing montage(s)")
        
        # If montages exist, validate structure
        if data["montages"]:
            montage = data["montages"][0]
            assert "id" in montage
            assert "guestbook_id" in montage
            assert "video_count" in montage
            assert "file_path" in montage
            print(f"✓ Montage structure validated")
    
    def test_get_montages_unauthorized(self):
        """Test GET /api/client/guestbook/{id}/montages without auth"""
        response = requests.get(
            f"{BASE_URL}/api/client/guestbook/{TEST_GUESTBOOK_ID}/montages"
        )
        assert response.status_code in [401, 403]
        print("✓ Unauthorized access rejected correctly")
    
    def test_get_montages_not_found(self, auth_headers):
        """Test GET /api/client/guestbook/{id}/montages - non-existent guestbook"""
        response = requests.get(
            f"{BASE_URL}/api/client/guestbook/non_existent_id/montages",
            headers=auth_headers
        )
        assert response.status_code == 404
        print("✓ Non-existent guestbook returns 404")


class TestGenerateMontage:
    """Test POST /api/client/guestbook/{id}/generate-montage endpoint"""
    
    def test_generate_montage_no_files(self, auth_headers):
        """Test POST generate-montage when no video files exist (expected error)"""
        response = requests.post(
            f"{BASE_URL}/api/client/guestbook/{TEST_GUESTBOOK_ID}/generate-montage",
            headers=auth_headers,
            json={}
        )
        # Expected: 400 error because video files don't physically exist
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        # Expected error: "Aucun fichier vidéo trouvé" or similar
        assert "vidéo" in data["detail"].lower() or "fichier" in data["detail"].lower()
        print(f"✓ Expected error returned: {data['detail']}")
    
    def test_generate_montage_unauthorized(self):
        """Test POST generate-montage without auth"""
        response = requests.post(
            f"{BASE_URL}/api/client/guestbook/{TEST_GUESTBOOK_ID}/generate-montage",
            json={}
        )
        assert response.status_code in [401, 403]
        print("✓ Unauthorized access rejected correctly")
    
    def test_generate_montage_not_found(self, auth_headers):
        """Test POST generate-montage - non-existent guestbook"""
        response = requests.post(
            f"{BASE_URL}/api/client/guestbook/non_existent_id/generate-montage",
            headers=auth_headers,
            json={}
        )
        assert response.status_code == 404
        print("✓ Non-existent guestbook returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
