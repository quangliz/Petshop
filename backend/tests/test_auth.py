"""Tests for Auth API."""
import pytest


class TestRegister:
    def test_register_success_or_duplicate(self, client):
        res = client.post("/api/v1/auth/register", json={
            "email": "test_auth_unique@example.com",
            "password": "password123",
            "full_name": "Auth Tester"
        })
        assert res.status_code in (200, 400)
        if res.status_code == 200:
            data = res.json()
            assert data["email"] == "test_auth_unique@example.com"
            assert "id" in data

    def test_register_missing_fields(self, client):
        res = client.post("/api/v1/auth/register", json={"email": "x@x.com"})
        assert res.status_code == 422


class TestLogin:
    def test_login_success(self, client, auth_token):
        assert auth_token is not None
        assert len(auth_token) > 10

    def test_login_wrong_password(self, client):
        res = client.post("/api/v1/auth/login", data={
            "username": "test_runner@petshop.dev",
            "password": "wrongpassword"
        })
        assert res.status_code == 400

    def test_login_nonexistent_user(self, client):
        res = client.post("/api/v1/auth/login", data={
            "username": "nonexistent@xyz.com",
            "password": "password123"
        })
        assert res.status_code == 400


class TestMe:
    def test_get_me_authenticated(self, client, auth_headers):
        res = client.get("/api/v1/auth/me", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "id" in data
        assert "email" in data
        assert "full_name" in data
        assert "role" in data

    def test_get_me_unauthorized(self, client):
        res = client.get("/api/v1/auth/me")
        assert res.status_code == 401

    def test_update_me(self, client, auth_headers):
        res = client.put("/api/v1/auth/me", headers=auth_headers, json={
            "phone": "0123456789",
            "address": "123 Đường test, Quận 1, TP.HCM"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["phone"] == "0123456789"
        assert data["address"] == "123 Đường test, Quận 1, TP.HCM"
