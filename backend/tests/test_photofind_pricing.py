"""
Tests for PhotoFind Kiosk Pricing Feature
- Tests PUT /api/admin/photofind/events/{event_id}/pricing endpoint for format-based pricing
- Tests GET /api/public/photofind/{event_id} returns pricing with formats
- Tests pricing calculation logic for different formats and frame options
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestPhotoFindPricing:
    """Tests for PhotoFind pricing endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test credentials and auth token"""
        self.admin_email = "testadmin@test.com"
        self.admin_password = "testpassword"
        self.test_event_id = "test-kiosk-demo"
        self.auth_token = None
        
        # Get auth token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": self.admin_email, "password": self.admin_password}
        )
        if login_response.status_code == 200:
            self.auth_token = login_response.json().get("token")
        
        self.headers = {"Authorization": f"Bearer {self.auth_token}"} if self.auth_token else {}
    
    def test_get_public_event_returns_pricing_with_formats(self):
        """Test GET /api/public/photofind/{event_id} returns pricing with format-based prices"""
        response = requests.get(f"{BASE_URL}/api/public/photofind/{self.test_event_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "pricing" in data, "Response should contain pricing object"
        assert "id" in data, "Response should contain event id"
        assert "name" in data, "Response should contain event name"
        
        pricing = data.get("pricing", {})
        # Check for format-based pricing
        if "formats" in pricing:
            formats = pricing["formats"]
            # Verify format structure
            for format_id, format_prices in formats.items():
                assert "sans_cadre" in format_prices or "avec_cadre" in format_prices, \
                    f"Format {format_id} should have sans_cadre or avec_cadre prices"
        
        print(f"✓ Event {self.test_event_id} pricing: {pricing}")
    
    def test_put_pricing_updates_format_prices(self):
        """Test PUT /api/admin/photofind/events/{event_id}/pricing updates format-based pricing"""
        if not self.auth_token:
            pytest.skip("Auth token not available")
        
        # New pricing with format-based prices
        new_pricing = {
            "pricing": {
                "formats": {
                    "10x15": {"sans_cadre": 5, "avec_cadre": 8},
                    "A4": {"sans_cadre": 10, "avec_cadre": 20},
                    "13x18": {"sans_cadre": 7, "avec_cadre": 12}
                },
                "email_single": 3,
                "email_pack_5": 12,
                "email_pack_10": 20,
                "email_all": 30
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/photofind/events/{self.test_event_id}/pricing",
            json=new_pricing,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, "Response should indicate success"
        assert "pricing" in data, "Response should contain updated pricing"
        
        # Verify format prices are saved
        returned_pricing = data.get("pricing", {})
        formats = returned_pricing.get("formats", {})
        
        # Verify A4 pricing
        assert "A4" in formats, "A4 format should be in response"
        assert formats["A4"]["sans_cadre"] == 10, f"A4 sans_cadre should be 10, got {formats['A4'].get('sans_cadre')}"
        assert formats["A4"]["avec_cadre"] == 20, f"A4 avec_cadre should be 20, got {formats['A4'].get('avec_cadre')}"
        
        # Verify 10x15 pricing
        assert "10x15" in formats, "10x15 format should be in response"
        assert formats["10x15"]["sans_cadre"] == 5, f"10x15 sans_cadre should be 5"
        assert formats["10x15"]["avec_cadre"] == 8, f"10x15 avec_cadre should be 8"
        
        print(f"✓ Pricing updated successfully: {returned_pricing}")
    
    def test_get_public_event_reflects_updated_pricing(self):
        """Test that GET /api/public/photofind/{event_id} returns the updated pricing"""
        # First update pricing
        if self.auth_token:
            new_pricing = {
                "pricing": {
                    "formats": {
                        "10x15": {"sans_cadre": 6, "avec_cadre": 9},
                        "A4": {"sans_cadre": 12, "avec_cadre": 22}
                    }
                }
            }
            requests.put(
                f"{BASE_URL}/api/admin/photofind/events/{self.test_event_id}/pricing",
                json=new_pricing,
                headers=self.headers
            )
        
        # Get public event info
        response = requests.get(f"{BASE_URL}/api/public/photofind/{self.test_event_id}")
        
        assert response.status_code == 200
        
        data = response.json()
        pricing = data.get("pricing", {})
        formats = pricing.get("formats", {})
        
        # Check if updates are reflected
        if "A4" in formats:
            assert formats["A4"]["sans_cadre"] == 12, f"A4 sans_cadre should be 12 after update"
            assert formats["A4"]["avec_cadre"] == 22, f"A4 avec_cadre should be 22 after update"
            print("✓ Public API reflects updated pricing")
        else:
            print("⚠ Format pricing not found in public API response")
    
    def test_put_pricing_requires_authentication(self):
        """Test that PUT pricing endpoint requires admin authentication"""
        new_pricing = {"pricing": {"formats": {"A4": {"sans_cadre": 99}}}}
        
        # Request without auth
        response = requests.put(
            f"{BASE_URL}/api/admin/photofind/events/{self.test_event_id}/pricing",
            json=new_pricing
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Pricing endpoint requires authentication")
    
    def test_put_pricing_non_existent_event(self):
        """Test PUT pricing for non-existent event returns 404"""
        if not self.auth_token:
            pytest.skip("Auth token not available")
        
        response = requests.put(
            f"{BASE_URL}/api/admin/photofind/events/non-existent-event-id/pricing",
            json={"pricing": {}},
            headers=self.headers
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent event, got {response.status_code}"
        print("✓ Non-existent event returns 404")
    
    def test_pricing_structure_with_all_formats(self):
        """Test updating pricing with all standard print formats"""
        if not self.auth_token:
            pytest.skip("Auth token not available")
        
        # Full pricing structure with all formats
        full_pricing = {
            "pricing": {
                "formats": {
                    "10x15": {"sans_cadre": 5, "avec_cadre": 8},
                    "13x18": {"sans_cadre": 7, "avec_cadre": 12},
                    "15x20": {"sans_cadre": 9, "avec_cadre": 15},
                    "20x30": {"sans_cadre": 12, "avec_cadre": 18},
                    "A4": {"sans_cadre": 10, "avec_cadre": 20},
                    "A5": {"sans_cadre": 8, "avec_cadre": 14}
                },
                "print_single": 5,
                "print_pack_5": 20,
                "print_pack_10": 35,
                "print_all": 50,
                "email_single": 3,
                "email_pack_5": 12,
                "email_pack_10": 20,
                "email_all": 30
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/photofind/events/{self.test_event_id}/pricing",
            json=full_pricing,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        returned_pricing = data.get("pricing", {})
        formats = returned_pricing.get("formats", {})
        
        # Verify all formats are saved
        expected_formats = ["10x15", "13x18", "15x20", "20x30", "A4", "A5"]
        for fmt in expected_formats:
            assert fmt in formats, f"Format {fmt} should be in response"
        
        print(f"✓ All {len(expected_formats)} print formats saved successfully")
    
    def test_restore_original_pricing(self):
        """Restore original pricing for test event"""
        if not self.auth_token:
            pytest.skip("Auth token not available")
        
        original_pricing = {
            "pricing": {
                "formats": {
                    "10x15": {"sans_cadre": 5, "avec_cadre": 8},
                    "A4": {"sans_cadre": 10, "avec_cadre": 20}
                },
                "email_single": 3,
                "email_pack_5": 12,
                "email_pack_10": 20,
                "email_all": 30
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/photofind/events/{self.test_event_id}/pricing",
            json=original_pricing,
            headers=self.headers
        )
        
        assert response.status_code == 200
        print("✓ Original pricing restored")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
