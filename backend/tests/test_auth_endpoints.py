"""
Automated tests for Authentication endpoints (/api/v1/auth).
Tests signup, login, validation, and /me session retrieval.
"""

import uuid
import requests

BASE_URL = "http://localhost:8000/api/v1/auth"


def test_auth_full_flow():
    unique_id = uuid.uuid4().hex[:8]
    test_email = f"ayur_expert_{unique_id}@ayugranth.org"
    test_password = "VaidyaSecure2026!"
    full_name = "Dr. Shashi Bhushan"
    organization = "National Institute of Ayurveda"
    role = "Ayurvedic Researcher"

    print(f"\n[TEST 1] Registering new user: {test_email}")
    signup_res = requests.post(
        f"{BASE_URL}/signup",
        json={
            "email": test_email,
            "password": test_password,
            "full_name": full_name,
            "organization": organization,
            "role": role,
        },
    )
    assert signup_res.status_code == 201, f"Signup failed: {signup_res.status_code} {signup_res.text}"
    signup_data = signup_res.json()
    assert "access_token" in signup_data, "Missing access_token in signup response"
    assert signup_data["user"]["email"] == test_email.lower(), "Email mismatch in signup"
    assert signup_data["user"]["full_name"] == full_name, "Name mismatch"
    print("[PASS] Signup succeeded with token and profile returned")

    print("\n[TEST 2] Verifying duplicate email rejection")
    dup_res = requests.post(
        f"{BASE_URL}/signup",
        json={
            "email": test_email,
            "password": test_password,
            "full_name": full_name,
        },
    )
    assert dup_res.status_code == 400, f"Expected 400 for duplicate email, got: {dup_res.status_code}"
    print("[PASS] Duplicate email correctly rejected with 400 Bad Request")

    print("\n[TEST 3] Testing Login with invalid password")
    bad_login_res = requests.post(
        f"{BASE_URL}/login",
        json={
            "email": test_email,
            "password": "WrongPassword999!",
        },
    )
    assert bad_login_res.status_code == 401, f"Expected 401, got: {bad_login_res.status_code}"
    print("[PASS] Invalid credentials correctly rejected with 401 Unauthorized")

    print("\n[TEST 4] Testing Login with valid credentials")
    good_login_res = requests.post(
        f"{BASE_URL}/login",
        json={
            "email": test_email,
            "password": test_password,
        },
    )
    assert good_login_res.status_code == 200, f"Expected 200, got: {good_login_res.status_code} {good_login_res.text}"
    login_data = good_login_res.json()
    token = login_data["access_token"]
    assert token, "Empty token returned on login"
    assert login_data["user"]["email"] == test_email.lower(), "User data not returned on login"
    print("[PASS] Login succeeded with JWT token issued")

    print("\n[TEST 5] Testing GET /auth/me with Bearer token")
    me_res = requests.get(
        f"{BASE_URL}/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200, f"Expected 200, got: {me_res.status_code} {me_res.text}"
    me_data = me_res.json()
    assert me_data["email"] == test_email.lower(), "Profile email mismatch"
    assert me_data["full_name"] == full_name, "Profile full name mismatch"
    assert me_data["organization"] == organization, "Organization mismatch"
    print("[PASS] /auth/me successfully returned authenticated profile")

    print("\n[TEST 6] Testing GET /auth/me without token")
    no_auth_res = requests.get(f"{BASE_URL}/me")
    assert no_auth_res.status_code == 401, f"Expected 401, got: {no_auth_res.status_code}"
    print("[PASS] Unauthorized request correctly rejected")

    print("\n=======================================================")
    print("ALL 6 AUTH BACKEND TESTS PASSED SUCCESSFULLY!")
    print("=======================================================")


if __name__ == "__main__":
    test_auth_full_flow()
