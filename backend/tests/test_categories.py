from fastapi.testclient import TestClient

def test_get_categories(client: TestClient):
    res = client.get("/api/v1/categories")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if len(data) > 0:
        assert "id" in data[0]
        assert "name" in data[0]
        assert "slug" in data[0]
