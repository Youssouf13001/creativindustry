"""
Test Admin Content and Portfolio Management APIs
Tests for:
- Admin registration and login
- Site content GET/PUT
- Portfolio CRUD operations
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_ADMIN_EMAIL = f"test_admin_{uuid.uuid4().hex[:8]}@creativindustry.com"
TEST_ADMIN_PASSWORD = "password123"
TEST_ADMIN_NAME = "Test Admin"


class TestAdminAuth:
    """Admin authentication tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Register and get admin token"""
        # Register new admin
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD,
            "name": TEST_ADMIN_NAME
        })
        
        if register_response.status_code == 200:
            return register_response.json().get("token")
        elif register_response.status_code == 400:
            # Email already exists, try login
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_ADMIN_EMAIL,
                "password": TEST_ADMIN_PASSWORD
            })
            if login_response.status_code == 200:
                return login_response.json().get("token")
        
        pytest.skip("Could not authenticate admin")
    
    def test_admin_registration(self):
        """Test admin registration endpoint"""
        unique_email = f"test_reg_{uuid.uuid4().hex[:8]}@creativindustry.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Test Registration"
        })
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "admin" in data, "Admin data not in response"
        assert data["admin"]["email"] == unique_email
        print(f"✓ Admin registration successful for {unique_email}")
    
    def test_admin_login(self, admin_token):
        """Test admin login endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "admin" in data
        print(f"✓ Admin login successful")
    
    def test_admin_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Invalid credentials correctly rejected")
    
    def test_admin_me_endpoint(self, admin_token):
        """Test /auth/me endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        
        assert response.status_code == 200, f"Auth/me failed: {response.text}"
        data = response.json()
        assert "email" in data
        assert "name" in data
        print(f"✓ Admin profile retrieved: {data['email']}")


class TestSiteContent:
    """Site content management tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token for content tests"""
        unique_email = f"content_admin_{uuid.uuid4().hex[:8]}@creativindustry.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Content Admin"
        })
        
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get admin token")
    
    def test_get_site_content(self):
        """Test GET /api/content - public endpoint"""
        response = requests.get(f"{BASE_URL}/api/content")
        
        assert response.status_code == 200, f"Get content failed: {response.text}"
        data = response.json()
        
        # Verify expected fields exist
        expected_fields = [
            "hero_title", "hero_subtitle", "hero_image",
            "wedding_title", "wedding_description", "wedding_image",
            "podcast_title", "podcast_description", "podcast_image",
            "tv_title", "tv_description", "tv_image",
            "cta_title", "cta_subtitle"
        ]
        
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Site content retrieved with all expected fields")
        print(f"  Hero title: {data.get('hero_title', 'N/A')[:50]}...")
    
    def test_update_site_content(self, admin_token):
        """Test PUT /api/content - admin only"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get current content first
        get_response = requests.get(f"{BASE_URL}/api/content")
        original_content = get_response.json()
        
        # Update hero title
        new_title = f"Test Hero Title {uuid.uuid4().hex[:6]}"
        update_response = requests.put(f"{BASE_URL}/api/content", 
            json={"hero_title": new_title},
            headers=headers
        )
        
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated_data = update_response.json()
        assert updated_data.get("hero_title") == new_title, "Title not updated"
        
        # Verify persistence with GET
        verify_response = requests.get(f"{BASE_URL}/api/content")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data.get("hero_title") == new_title, "Update not persisted"
        
        print(f"✓ Site content updated and persisted: hero_title = {new_title}")
        
        # Restore original title
        requests.put(f"{BASE_URL}/api/content", 
            json={"hero_title": original_content.get("hero_title", "Créons vos moments d'exception")},
            headers=headers
        )
    
    def test_update_content_unauthorized(self):
        """Test PUT /api/content without auth"""
        response = requests.put(f"{BASE_URL}/api/content", 
            json={"hero_title": "Unauthorized Update"}
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Unauthorized content update correctly rejected")
    
    def test_update_multiple_content_fields(self, admin_token):
        """Test updating multiple content fields at once"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        update_data = {
            "wedding_title": "Test Wedding Title",
            "wedding_description": "Test wedding description for testing",
            "podcast_title": "Test Podcast Title"
        }
        
        response = requests.put(f"{BASE_URL}/api/content", 
            json=update_data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Multi-field update failed: {response.text}"
        data = response.json()
        
        assert data.get("wedding_title") == update_data["wedding_title"]
        assert data.get("wedding_description") == update_data["wedding_description"]
        assert data.get("podcast_title") == update_data["podcast_title"]
        
        print(f"✓ Multiple content fields updated successfully")


class TestPortfolioAdmin:
    """Portfolio admin management tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token for portfolio tests"""
        unique_email = f"portfolio_admin_{uuid.uuid4().hex[:8]}@creativindustry.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Portfolio Admin"
        })
        
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get admin token")
    
    def test_get_admin_portfolio(self, admin_token):
        """Test GET /api/admin/portfolio"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/portfolio", headers=headers)
        
        assert response.status_code == 200, f"Get portfolio failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Portfolio should be a list"
        
        print(f"✓ Admin portfolio retrieved: {len(data)} items")
    
    def test_create_portfolio_item(self, admin_token):
        """Test POST /api/admin/portfolio"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        new_item = {
            "title": f"Test Portfolio Item {uuid.uuid4().hex[:6]}",
            "description": "Test description for portfolio item",
            "media_type": "photo",
            "media_url": "https://images.unsplash.com/photo-1519741497674-611481863552?w=800",
            "category": "wedding",
            "is_featured": False
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/portfolio", 
            json=new_item,
            headers=headers
        )
        
        assert response.status_code == 200, f"Create portfolio failed: {response.text}"
        data = response.json()
        
        assert data.get("title") == new_item["title"]
        assert data.get("media_type") == new_item["media_type"]
        assert data.get("category") == new_item["category"]
        assert "id" in data, "ID not returned"
        
        print(f"✓ Portfolio item created: {data['title']}")
        
        # Return item ID for cleanup
        return data["id"]
    
    def test_create_video_portfolio_item(self, admin_token):
        """Test creating a video portfolio item"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        new_item = {
            "title": f"Test Video Item {uuid.uuid4().hex[:6]}",
            "description": "Test video description",
            "media_type": "video",
            "media_url": "https://www.youtube.com/embed/dQw4w9WgXcQ",
            "thumbnail_url": "https://images.unsplash.com/photo-1519741497674-611481863552?w=400",
            "category": "wedding",
            "is_featured": True
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/portfolio", 
            json=new_item,
            headers=headers
        )
        
        assert response.status_code == 200, f"Create video portfolio failed: {response.text}"
        data = response.json()
        
        assert data.get("media_type") == "video"
        assert data.get("is_featured") == True
        
        print(f"✓ Video portfolio item created: {data['title']}")
    
    def test_update_portfolio_item(self, admin_token):
        """Test PUT /api/admin/portfolio/{item_id}"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create an item
        create_response = requests.post(f"{BASE_URL}/api/admin/portfolio", 
            json={
                "title": "Item to Update",
                "media_type": "photo",
                "media_url": "https://example.com/photo.jpg",
                "category": "podcast"
            },
            headers=headers
        )
        
        assert create_response.status_code == 200
        item_id = create_response.json()["id"]
        
        # Update the item
        update_data = {
            "title": "Updated Title",
            "is_featured": True
        }
        
        update_response = requests.put(f"{BASE_URL}/api/admin/portfolio/{item_id}", 
            json=update_data,
            headers=headers
        )
        
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated_item = update_response.json()
        
        assert updated_item.get("title") == "Updated Title"
        assert updated_item.get("is_featured") == True
        
        print(f"✓ Portfolio item updated: {updated_item['title']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/portfolio/{item_id}", headers=headers)
    
    def test_delete_portfolio_item(self, admin_token):
        """Test DELETE /api/admin/portfolio/{item_id}"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create an item
        create_response = requests.post(f"{BASE_URL}/api/admin/portfolio", 
            json={
                "title": "Item to Delete",
                "media_type": "photo",
                "media_url": "https://example.com/delete.jpg",
                "category": "tv_set"
            },
            headers=headers
        )
        
        assert create_response.status_code == 200
        item_id = create_response.json()["id"]
        
        # Delete the item
        delete_response = requests.delete(f"{BASE_URL}/api/admin/portfolio/{item_id}", headers=headers)
        
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify deletion - item should not appear in admin portfolio
        get_response = requests.get(f"{BASE_URL}/api/admin/portfolio", headers=headers)
        items = get_response.json()
        item_ids = [item["id"] for item in items]
        
        assert item_id not in item_ids, "Item still exists after deletion"
        
        print(f"✓ Portfolio item deleted successfully")
    
    def test_portfolio_unauthorized(self):
        """Test portfolio endpoints without auth"""
        # GET admin portfolio
        response = requests.get(f"{BASE_URL}/api/admin/portfolio")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        # POST portfolio
        response = requests.post(f"{BASE_URL}/api/admin/portfolio", json={
            "title": "Unauthorized",
            "media_type": "photo",
            "media_url": "https://example.com/test.jpg",
            "category": "wedding"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        print(f"✓ Unauthorized portfolio access correctly rejected")


class TestPublicPortfolio:
    """Public portfolio endpoint tests"""
    
    def test_get_public_portfolio(self):
        """Test GET /api/portfolio - public endpoint"""
        response = requests.get(f"{BASE_URL}/api/portfolio")
        
        assert response.status_code == 200, f"Get public portfolio failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Portfolio should be a list"
        
        print(f"✓ Public portfolio retrieved: {len(data)} items")
    
    def test_filter_portfolio_by_category(self):
        """Test portfolio filtering by category"""
        response = requests.get(f"{BASE_URL}/api/portfolio?category=wedding")
        
        assert response.status_code == 200
        data = response.json()
        
        # All items should be wedding category
        for item in data:
            assert item.get("category") == "wedding", f"Item {item.get('id')} has wrong category"
        
        print(f"✓ Portfolio filtered by category: {len(data)} wedding items")
    
    def test_filter_portfolio_by_media_type(self):
        """Test portfolio filtering by media type"""
        response = requests.get(f"{BASE_URL}/api/portfolio?media_type=photo")
        
        assert response.status_code == 200
        data = response.json()
        
        # All items should be photos
        for item in data:
            assert item.get("media_type") == "photo", f"Item {item.get('id')} is not a photo"
        
        print(f"✓ Portfolio filtered by media type: {len(data)} photos")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
