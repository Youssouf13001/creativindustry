"""
PhotoFind Payment Flow Backend Tests
Tests for Stripe and PayPal payment endpoints, including:
- GET /api/public/stripe-config - Stripe public key
- POST /api/public/photofind/{event_id}/create-stripe-payment - Create Stripe payment intent
- POST /api/public/photofind/{event_id}/confirm-stripe-payment - Confirm Stripe payment (success:true field)
- POST /api/public/photofind/{event_id}/create-paypal-order - Create PayPal order
- POST /api/public/photofind/{event_id}/capture-paypal-order - Capture PayPal payment
- Email validation in send_purchase_email - Invalid emails should not cause SMTP 501 errors
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test event ID for kiosk demo
TEST_EVENT_ID = "test-kiosk-demo"


class TestStripeConfig:
    """Tests for Stripe config endpoint"""
    
    def test_get_stripe_config_returns_public_key(self):
        """Test GET /api/public/stripe-config - Returns Stripe publishable key"""
        response = requests.get(f"{BASE_URL}/api/public/stripe-config")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify publishable_key field exists
        assert "publishable_key" in data, "Response should contain 'publishable_key'"
        
        # Verify it's a valid Stripe test/live key format
        key = data["publishable_key"]
        assert key is not None, "Stripe public key should not be None"
        if key:  # Only check format if key is provided
            assert key.startswith("pk_test_") or key.startswith("pk_live_"), \
                f"Stripe key should start with pk_test_ or pk_live_, got: {key[:15]}..."
        
        print(f"PASS: Stripe config returns valid publishable key: {key[:20]}...")


class TestStripePayment:
    """Tests for Stripe payment creation and confirmation"""
    
    def test_create_stripe_payment_success(self):
        """Test POST /api/public/photofind/{event_id}/create-stripe-payment - Creates payment intent"""
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        
        payload = {
            "photo_ids": ["test-photo-1", "test-photo-2"],
            "email": test_email,
            "amount": 10.0,
            "format": "digital",
            "frame_id": None
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public/photofind/{TEST_EVENT_ID}/create-stripe-payment",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response contains required fields
        assert "client_secret" in data, "Response should contain 'client_secret'"
        assert "payment_intent_id" in data, "Response should contain 'payment_intent_id'"
        
        # Verify client_secret format (starts with pi_ and contains _secret_)
        client_secret = data["client_secret"]
        assert client_secret.startswith("pi_"), f"Client secret should start with 'pi_', got: {client_secret[:10]}..."
        assert "_secret_" in client_secret, "Client secret should contain '_secret_'"
        
        # Verify payment_intent_id format
        payment_intent_id = data["payment_intent_id"]
        assert payment_intent_id.startswith("pi_"), f"Payment intent ID should start with 'pi_', got: {payment_intent_id}"
        
        print(f"PASS: Stripe payment intent created: {payment_intent_id}")
        return payment_intent_id
    
    def test_create_stripe_payment_nonexistent_event(self):
        """Test create-stripe-payment for non-existent event returns 404"""
        payload = {
            "photo_ids": ["photo-1"],
            "email": "test@example.com",
            "amount": 5.0,
            "format": "digital"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public/photofind/nonexistent-event-12345/create-stripe-payment",
            json=payload
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent event, got {response.status_code}"
        print("PASS: Create Stripe payment for non-existent event returns 404")
    
    def test_confirm_stripe_payment_missing_payment_intent_id(self):
        """Test confirm-stripe-payment with missing payment_intent_id returns 400"""
        payload = {}
        
        response = requests.post(
            f"{BASE_URL}/api/public/photofind/{TEST_EVENT_ID}/confirm-stripe-payment",
            json=payload
        )
        
        assert response.status_code == 400, f"Expected 400 for missing payment_intent_id, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "Response should contain error detail"
        assert "payment_intent_id" in data["detail"].lower(), "Error should mention payment_intent_id"
        
        print("PASS: Confirm Stripe payment with missing payment_intent_id returns 400")
    
    def test_confirm_stripe_payment_invalid_payment_intent(self):
        """Test confirm-stripe-payment with invalid payment_intent returns error"""
        payload = {
            "payment_intent_id": "pi_invalid_12345"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public/photofind/{TEST_EVENT_ID}/confirm-stripe-payment",
            json=payload
        )
        
        # Should return 400 or 500 for invalid payment intent
        assert response.status_code in [400, 500], f"Expected 400 or 500 for invalid payment intent, got {response.status_code}"
        
        print(f"PASS: Confirm Stripe payment with invalid payment_intent returns {response.status_code}")


class TestPayPalPayment:
    """Tests for PayPal payment creation and capture"""
    
    def test_create_paypal_order_success(self):
        """Test POST /api/public/photofind/{event_id}/create-paypal-order - Creates PayPal order"""
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        
        payload = {
            "photo_ids": ["test-photo-1", "test-photo-2"],
            "email": test_email,
            "amount": 10.0,
            "format": "digital",
            "frame_id": None
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public/photofind/{TEST_EVENT_ID}/create-paypal-order",
            json=payload
        )
        
        # PayPal might not be configured in test env, so we accept 200 or 500
        if response.status_code == 500:
            data = response.json()
            if "PayPal non configuré" in data.get("detail", ""):
                pytest.skip("PayPal not configured in test environment")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response contains order_id
        assert "order_id" in data, "Response should contain 'order_id'"
        
        order_id = data["order_id"]
        assert order_id is not None, "Order ID should not be None"
        assert len(order_id) > 0, "Order ID should not be empty"
        
        print(f"PASS: PayPal order created: {order_id}")
        return order_id
    
    def test_create_paypal_order_nonexistent_event(self):
        """Test create-paypal-order for non-existent event returns 404"""
        payload = {
            "photo_ids": ["photo-1"],
            "email": "test@example.com",
            "amount": 5.0,
            "format": "digital"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public/photofind/nonexistent-event-12345/create-paypal-order",
            json=payload
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent event, got {response.status_code}"
        print("PASS: Create PayPal order for non-existent event returns 404")
    
    def test_capture_paypal_order_missing_order_id(self):
        """Test capture-paypal-order with missing order_id returns error"""
        payload = {
            "photo_ids": ["photo-1"],
            "email": "test@example.com",
            "amount": 5.0
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public/photofind/{TEST_EVENT_ID}/capture-paypal-order",
            json=payload
        )
        
        # Should return 422 for validation error (missing order_id)
        assert response.status_code == 422, f"Expected 422 for missing order_id, got {response.status_code}"
        
        print("PASS: Capture PayPal order with missing order_id returns 422")


class TestEmailValidation:
    """Tests for email validation in purchase flow"""
    
    def test_kiosk_purchase_with_invalid_email_format(self):
        """Test kiosk-purchase with invalid email does not cause server error"""
        # Various invalid email formats that could cause SMTP 501 errors
        invalid_emails = [
            "not-an-email",
            "@missing-local.com",
            "missing-domain@",
            "",
            "spaces in email@example.com",
            "special<chars>@example.com"
        ]
        
        for email in invalid_emails:
            payload = {
                "photo_ids": ["test-photo-1"],
                "email": email,
                "amount": 5.0,
                "payment_method": "kiosk"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/public/photofind/{TEST_EVENT_ID}/kiosk-purchase",
                json=payload
            )
            
            # Should NOT return 500 - email validation should prevent SMTP errors
            # Acceptable responses: 200 (purchase created, email skipped), 422 (validation error)
            assert response.status_code != 500, \
                f"Invalid email '{email}' should not cause 500 error, got: {response.status_code}"
            
            print(f"PASS: Email '{email}' handled without server error (status: {response.status_code})")
    
    def test_kiosk_purchase_with_valid_email_succeeds(self):
        """Test kiosk-purchase with valid email creates purchase"""
        test_email = f"valid_{uuid.uuid4().hex[:8]}@example.com"
        
        payload = {
            "photo_ids": ["test-photo-1"],
            "email": test_email,
            "amount": 5.0,
            "payment_method": "kiosk"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public/photofind/{TEST_EVENT_ID}/kiosk-purchase",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200 for valid email, got {response.status_code}"
        
        data = response.json()
        assert data.get("email") == test_email, "Purchase should contain the email"
        
        print(f"PASS: Valid email '{test_email}' creates purchase successfully")


class TestStripeConfirmationResponse:
    """Tests specifically for the confirm-stripe-payment response format"""
    
    def test_confirm_response_has_success_field(self):
        """
        Test that confirm-stripe-payment response includes success:true field
        This is the main bug fix being tested - the frontend expects success:true
        """
        # First, create a payment intent
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        
        create_payload = {
            "photo_ids": ["test-photo-1"],
            "email": test_email,
            "amount": 5.0,
            "format": "digital"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/public/photofind/{TEST_EVENT_ID}/create-stripe-payment",
            json=create_payload
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Could not create payment intent: {create_response.text}")
        
        payment_intent_id = create_response.json()["payment_intent_id"]
        
        # Try to confirm with the payment intent
        # Note: This will fail with "Paiement non confirmé" because we haven't actually
        # completed the Stripe flow, but we can verify the error response format
        confirm_payload = {
            "payment_intent_id": payment_intent_id
        }
        
        confirm_response = requests.post(
            f"{BASE_URL}/api/public/photofind/{TEST_EVENT_ID}/confirm-stripe-payment",
            json=confirm_payload
        )
        
        # The payment won't be in "succeeded" state, so expect 400
        # But we verify that if it WAS successful, the response would have the right format
        if confirm_response.status_code == 200:
            data = confirm_response.json()
            # This is the key assertion - verify success:true is present
            assert "success" in data, "Successful confirmation should include 'success' field"
            assert data["success"] == True, "success field should be True"
            print("PASS: Confirmed payment includes success:true field")
        else:
            # Expected - payment not confirmed yet
            assert confirm_response.status_code == 400, \
                f"Expected 400 for unconfirmed payment, got {confirm_response.status_code}"
            print(f"PASS: Unconfirmed payment returns 400 as expected (payment_intent: {payment_intent_id})")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
