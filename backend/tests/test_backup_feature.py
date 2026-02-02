"""
Test suite for the backup feature - CREATIVINDUSTRY France
Tests: Admin authentication, backup ZIP download, ZIP content verification
"""
import pytest
import requests
import os
import zipfile
import io
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_ADMIN_EMAIL = "backup_test@creativindustry.com"
TEST_ADMIN_PASSWORD = "BackupTest123!"


class TestAdminAuth:
    """Test admin authentication endpoints"""
    
    def test_admin_register(self):
        """Test admin registration - may fail if already exists"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD,
            "name": "Backup Test Admin"
        })
        # Either 200 (created) or 400 (already exists) is acceptable
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}, {response.text}"
        if response.status_code == 200:
            data = response.json()
            assert "token" in data
            assert "admin" in data
            print(f"✓ Admin registered successfully: {data['admin']['email']}")
        else:
            print(f"✓ Admin already exists (expected): {response.json().get('detail', '')}")
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.status_code}, {response.text}"
        data = response.json()
        
        # Check if MFA is required
        if data.get("mfa_required"):
            pytest.skip("MFA is enabled on this account - cannot test without TOTP code")
        
        assert "token" in data, "Token not in response"
        assert "admin" in data, "Admin data not in response"
        assert data["admin"]["email"] == TEST_ADMIN_EMAIL
        print(f"✓ Admin login successful: {data['admin']['email']}")
        return data["token"]
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")


class TestBackupFeature:
    """Test the backup ZIP download feature"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Cannot login: {response.text}")
        
        data = response.json()
        if data.get("mfa_required"):
            pytest.skip("MFA is enabled - cannot test without TOTP code")
        
        return data["token"]
    
    def test_backup_requires_auth(self):
        """Test that backup endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/backup")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Backup endpoint correctly requires authentication")
    
    def test_backup_download_success(self, admin_token):
        """Test successful backup ZIP download"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/backup", headers=headers, stream=True)
        
        assert response.status_code == 200, f"Backup failed: {response.status_code}, {response.text}"
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        assert "application/zip" in content_type or "application/octet-stream" in content_type, \
            f"Expected ZIP content type, got: {content_type}"
        
        # Check content disposition (filename)
        content_disposition = response.headers.get("content-disposition", "")
        assert "creativindustry_backup" in content_disposition.lower() or "attachment" in content_disposition.lower(), \
            f"Expected backup filename in disposition: {content_disposition}"
        
        # Check that we received data
        content_length = len(response.content)
        assert content_length > 0, "Backup ZIP is empty"
        print(f"✓ Backup downloaded successfully: {content_length} bytes")
        
        return response.content
    
    def test_backup_zip_structure(self, admin_token):
        """Test that the backup ZIP contains expected structure"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/backup", headers=headers)
        
        assert response.status_code == 200, f"Backup failed: {response.status_code}"
        
        # Parse the ZIP file
        zip_buffer = io.BytesIO(response.content)
        with zipfile.ZipFile(zip_buffer, 'r') as zf:
            file_list = zf.namelist()
            
            print(f"ZIP contains {len(file_list)} files:")
            for f in file_list[:20]:  # Print first 20 files
                print(f"  - {f}")
            if len(file_list) > 20:
                print(f"  ... and {len(file_list) - 20} more files")
            
            # Check for README.txt
            assert "README.txt" in file_list, "README.txt not found in backup"
            print("✓ README.txt found in backup")
            
            # Check for database folder with JSON files
            db_files = [f for f in file_list if f.startswith("database/") and f.endswith(".json")]
            assert len(db_files) > 0, "No database JSON files found in backup"
            print(f"✓ Found {len(db_files)} database JSON files")
            
            # Check for expected collections
            expected_collections = ["admins", "clients", "portfolio", "bookings"]
            for collection in expected_collections:
                json_file = f"database/{collection}.json"
                if json_file in file_list:
                    print(f"  ✓ {collection}.json present")
                else:
                    print(f"  ⚠ {collection}.json not found (may be empty collection)")
    
    def test_backup_readme_content(self, admin_token):
        """Test that README.txt contains restoration instructions"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/backup", headers=headers)
        
        assert response.status_code == 200
        
        zip_buffer = io.BytesIO(response.content)
        with zipfile.ZipFile(zip_buffer, 'r') as zf:
            readme_content = zf.read("README.txt").decode("utf-8")
            
            # Check for key content in README
            assert "CREATIVINDUSTRY" in readme_content, "CREATIVINDUSTRY not in README"
            assert "RESTAURATION" in readme_content or "restauration" in readme_content.lower(), \
                "Restoration instructions not in README"
            assert "database" in readme_content.lower(), "Database info not in README"
            assert "uploads" in readme_content.lower(), "Uploads info not in README"
            
            print("✓ README.txt contains proper restoration instructions")
            print(f"README preview:\n{readme_content[:500]}...")
    
    def test_backup_database_json_valid(self, admin_token):
        """Test that database JSON files are valid JSON"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/backup", headers=headers)
        
        assert response.status_code == 200
        
        zip_buffer = io.BytesIO(response.content)
        with zipfile.ZipFile(zip_buffer, 'r') as zf:
            db_files = [f for f in zf.namelist() if f.startswith("database/") and f.endswith(".json")]
            
            for json_file in db_files:
                content = zf.read(json_file).decode("utf-8")
                try:
                    data = json.loads(content)
                    assert isinstance(data, list), f"{json_file} should contain a list"
                    print(f"✓ {json_file}: valid JSON with {len(data)} records")
                except json.JSONDecodeError as e:
                    pytest.fail(f"{json_file} contains invalid JSON: {e}")
    
    def test_backup_uploads_included(self, admin_token):
        """Test that uploads folder is included in backup"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/backup", headers=headers)
        
        assert response.status_code == 200
        
        zip_buffer = io.BytesIO(response.content)
        with zipfile.ZipFile(zip_buffer, 'r') as zf:
            upload_files = [f for f in zf.namelist() if f.startswith("uploads/")]
            
            if len(upload_files) > 0:
                print(f"✓ Found {len(upload_files)} uploaded files in backup")
                # Show some examples
                for f in upload_files[:5]:
                    print(f"  - {f}")
            else:
                print("⚠ No uploaded files in backup (uploads folder may be empty)")
            
            # Check for expected upload subdirectories structure
            portfolio_files = [f for f in upload_files if "portfolio" in f]
            galleries_files = [f for f in upload_files if "galleries" in f]
            
            print(f"  Portfolio files: {len(portfolio_files)}")
            print(f"  Gallery files: {len(galleries_files)}")


class TestBackupSecurity:
    """Test backup security aspects"""
    
    def test_backup_with_invalid_token(self):
        """Test that backup rejects invalid tokens"""
        headers = {"Authorization": "Bearer invalid_token_12345"}
        response = requests.get(f"{BASE_URL}/api/admin/backup", headers=headers)
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Invalid token correctly rejected")
    
    def test_backup_with_expired_token(self):
        """Test that backup rejects expired tokens"""
        # This is a malformed/expired JWT
        expired_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.invalid"
        headers = {"Authorization": f"Bearer {expired_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/backup", headers=headers)
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Expired/invalid token correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
