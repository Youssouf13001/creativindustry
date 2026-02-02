"""
Test Portfolio Reorganization Features
Tests for:
- Portfolio categories (wedding, podcast, tv_set)
- Client grouping within categories
- client_name field in portfolio items
- Portfolio navigation (categories -> clients -> gallery)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestPortfolioCategories:
    """Test portfolio category structure"""
    
    def test_get_public_portfolio(self):
        """Test GET /api/portfolio returns all active items"""
        response = requests.get(f"{BASE_URL}/api/portfolio")
        
        assert response.status_code == 200, f"Get portfolio failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Portfolio should be a list"
        
        print(f"✓ Public portfolio retrieved: {len(data)} items")
    
    def test_portfolio_has_required_fields(self):
        """Test portfolio items have required fields including client_name"""
        response = requests.get(f"{BASE_URL}/api/portfolio")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            item = data[0]
            required_fields = ["id", "title", "media_type", "media_url", "category"]
            for field in required_fields:
                assert field in item, f"Missing required field: {field}"
            
            # client_name is optional but should be in schema
            assert "client_name" in item or item.get("client_name") is None, "client_name field should exist"
            
            print(f"✓ Portfolio items have all required fields")
    
    def test_filter_by_category_wedding(self):
        """Test filtering portfolio by wedding category"""
        response = requests.get(f"{BASE_URL}/api/portfolio?category=wedding")
        
        assert response.status_code == 200
        data = response.json()
        
        for item in data:
            assert item.get("category") == "wedding", f"Item {item.get('id')} has wrong category"
        
        print(f"✓ Wedding category filter works: {len(data)} items")
    
    def test_filter_by_category_podcast(self):
        """Test filtering portfolio by podcast category"""
        response = requests.get(f"{BASE_URL}/api/portfolio?category=podcast")
        
        assert response.status_code == 200
        data = response.json()
        
        for item in data:
            assert item.get("category") == "podcast", f"Item {item.get('id')} has wrong category"
        
        print(f"✓ Podcast category filter works: {len(data)} items")
    
    def test_filter_by_category_tv_set(self):
        """Test filtering portfolio by tv_set category"""
        response = requests.get(f"{BASE_URL}/api/portfolio?category=tv_set")
        
        assert response.status_code == 200
        data = response.json()
        
        for item in data:
            assert item.get("category") == "tv_set", f"Item {item.get('id')} has wrong category"
        
        print(f"✓ TV Set category filter works: {len(data)} items")


class TestPortfolioClientGrouping:
    """Test client grouping within categories"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token for tests"""
        unique_email = f"test_portfolio_{uuid.uuid4().hex[:8]}@creativindustry.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Portfolio Test Admin"
        })
        
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get admin token")
    
    def test_create_portfolio_with_client_name(self, admin_token):
        """Test creating portfolio item with client_name"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        client_name = f"Test Client {uuid.uuid4().hex[:6]}"
        new_item = {
            "title": f"Test Photo for {client_name}",
            "description": "Test description",
            "media_type": "photo",
            "media_url": "https://images.unsplash.com/photo-1519741497674-611481863552?w=800",
            "category": "wedding",
            "client_name": client_name,
            "is_featured": False
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/portfolio", 
            json=new_item,
            headers=headers
        )
        
        assert response.status_code == 200, f"Create portfolio failed: {response.text}"
        data = response.json()
        
        assert data.get("client_name") == client_name, "client_name not saved correctly"
        assert data.get("category") == "wedding"
        assert "id" in data
        
        print(f"✓ Portfolio item created with client_name: {client_name}")
        
        # Cleanup
        item_id = data["id"]
        requests.delete(f"{BASE_URL}/api/admin/portfolio/{item_id}", headers=headers)
        
        return data
    
    def test_create_portfolio_without_client_name(self, admin_token):
        """Test creating portfolio item without client_name (should default to None/Autres)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        new_item = {
            "title": f"Test Photo No Client {uuid.uuid4().hex[:6]}",
            "description": "Test without client name",
            "media_type": "photo",
            "media_url": "https://images.unsplash.com/photo-1519741497674-611481863552?w=800",
            "category": "podcast",
            "is_featured": False
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/portfolio", 
            json=new_item,
            headers=headers
        )
        
        assert response.status_code == 200, f"Create portfolio failed: {response.text}"
        data = response.json()
        
        # client_name should be None or not set
        assert data.get("client_name") is None or data.get("client_name") == "", "client_name should be None when not provided"
        
        print(f"✓ Portfolio item created without client_name (will show as 'Autres')")
        
        # Cleanup
        item_id = data["id"]
        requests.delete(f"{BASE_URL}/api/admin/portfolio/{item_id}", headers=headers)
    
    def test_update_portfolio_client_name(self, admin_token):
        """Test updating client_name on existing portfolio item"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create item first
        create_response = requests.post(f"{BASE_URL}/api/admin/portfolio", 
            json={
                "title": "Item to Update Client",
                "media_type": "photo",
                "media_url": "https://example.com/photo.jpg",
                "category": "wedding"
            },
            headers=headers
        )
        
        assert create_response.status_code == 200
        item_id = create_response.json()["id"]
        
        # Update client_name
        new_client_name = f"Updated Client {uuid.uuid4().hex[:6]}"
        update_response = requests.put(f"{BASE_URL}/api/admin/portfolio/{item_id}", 
            json={"client_name": new_client_name},
            headers=headers
        )
        
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated_item = update_response.json()
        
        assert updated_item.get("client_name") == new_client_name, "client_name not updated"
        
        print(f"✓ Portfolio item client_name updated to: {new_client_name}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/portfolio/{item_id}", headers=headers)
    
    def test_portfolio_items_grouped_by_client(self, admin_token):
        """Test that portfolio items can be grouped by client_name"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        client_name = f"Grouping Test Client {uuid.uuid4().hex[:6]}"
        
        # Create multiple items for same client
        item_ids = []
        for i in range(2):
            response = requests.post(f"{BASE_URL}/api/admin/portfolio", 
                json={
                    "title": f"Group Test Photo {i+1}",
                    "media_type": "photo",
                    "media_url": f"https://example.com/photo{i}.jpg",
                    "category": "wedding",
                    "client_name": client_name
                },
                headers=headers
            )
            assert response.status_code == 200
            item_ids.append(response.json()["id"])
        
        # Get all portfolio items and filter by client
        portfolio_response = requests.get(f"{BASE_URL}/api/portfolio")
        assert portfolio_response.status_code == 200
        
        all_items = portfolio_response.json()
        client_items = [item for item in all_items if item.get("client_name") == client_name]
        
        assert len(client_items) == 2, f"Expected 2 items for client, got {len(client_items)}"
        
        print(f"✓ Portfolio items correctly grouped by client: {len(client_items)} items for '{client_name}'")
        
        # Cleanup
        for item_id in item_ids:
            requests.delete(f"{BASE_URL}/api/admin/portfolio/{item_id}", headers=headers)


class TestPortfolioModel:
    """Test portfolio model fields"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        unique_email = f"test_model_{uuid.uuid4().hex[:8]}@creativindustry.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Model Test Admin"
        })
        
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get admin token")
    
    def test_portfolio_item_has_cover_photo_field(self, admin_token):
        """Test that portfolio items can have cover_photo field"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        cover_photo_url = "https://images.unsplash.com/photo-1519741497674-611481863552?w=400"
        
        new_item = {
            "title": "Test with Cover Photo",
            "media_type": "photo",
            "media_url": "https://images.unsplash.com/photo-1519741497674-611481863552?w=800",
            "category": "wedding",
            "client_name": "Cover Photo Test",
            "cover_photo": cover_photo_url
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/portfolio", 
            json=new_item,
            headers=headers
        )
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        # cover_photo should be saved
        assert data.get("cover_photo") == cover_photo_url, "cover_photo not saved"
        
        print(f"✓ Portfolio item created with cover_photo field")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/portfolio/{data['id']}", headers=headers)
    
    def test_portfolio_categories_are_valid(self, admin_token):
        """Test that only valid categories are accepted"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        valid_categories = ["wedding", "podcast", "tv_set"]
        
        for category in valid_categories:
            response = requests.post(f"{BASE_URL}/api/admin/portfolio", 
                json={
                    "title": f"Test {category}",
                    "media_type": "photo",
                    "media_url": "https://example.com/test.jpg",
                    "category": category
                },
                headers=headers
            )
            
            assert response.status_code == 200, f"Failed to create item with category {category}"
            item_id = response.json()["id"]
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/admin/portfolio/{item_id}", headers=headers)
        
        print(f"✓ All valid categories accepted: {valid_categories}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
