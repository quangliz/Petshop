"""Tests for Pets API."""
import pytest


class TestPetsList:
    def test_list_pets_authenticated(self, client, auth_headers):
        res = client.get("/api/v1/pets/", headers=auth_headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_list_pets_unauthorized(self, client):
        res = client.get("/api/v1/pets/")
        assert res.status_code == 401


class TestPetCRUD:
    def test_create_pet(self, client, auth_headers):
        res = client.post("/api/v1/pets/", headers=auth_headers, json={
            "name": "Miu Test",
            "species": "cat",
            "breed": "British Shorthair",
            "age_months": 6,
            "weight_kg": 3.5,
            "gender": "female",
            "health_notes": "Khoẻ mạnh",
            "allergies": "Không có"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "Miu Test"
        assert data["species"] == "cat"
        assert data["breed"] == "British Shorthair"
        assert "id" in data

    def test_create_pet_minimal(self, client, auth_headers):
        """Create with only required fields."""
        res = client.post("/api/v1/pets/", headers=auth_headers, json={
            "name": "Lucky",
            "species": "dog",
        })
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "Lucky"
        assert data["species"] == "dog"

    def test_update_pet(self, client, auth_headers):
        pets = client.get("/api/v1/pets/", headers=auth_headers).json()
        if not pets:
            pytest.skip("No pets to update")

        pet_id = pets[0]["id"]
        res = client.put(f"/api/v1/pets/{pet_id}", headers=auth_headers, json={
            "weight_kg": 4.2,
            "health_notes": "Vừa tiêm vaccine"
        })
        assert res.status_code == 200
        assert res.json()["health_notes"] == "Vừa tiêm vaccine"

    def test_delete_pet(self, client, auth_headers):
        # Create then delete
        create_res = client.post("/api/v1/pets/", headers=auth_headers, json={
            "name": "DeleteMe",
            "species": "fish",
        })
        assert create_res.status_code == 200
        pet_id = create_res.json()["id"]

        del_res = client.delete(f"/api/v1/pets/{pet_id}", headers=auth_headers)
        assert del_res.status_code == 200

    def test_delete_nonexistent_pet(self, client, auth_headers):
        res = client.delete("/api/v1/pets/00000000-0000-0000-0000-000000000000", headers=auth_headers)
        assert res.status_code == 404

    def test_pet_response_fields(self, client, auth_headers):
        pets = client.get("/api/v1/pets/", headers=auth_headers).json()
        for pet in pets:
            required = ["id", "name", "species", "gender", "avatar_url"]
            for field in required:
                assert field in pet, f"Missing field: {field}"
