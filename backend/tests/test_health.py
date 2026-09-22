def test_health_check(client):
    response = client.get("/api/health")

    assert response.status_code == 200

    body = response.get_json()

    assert body["success"] is True
    assert body["data"]["status"] == "healthy"
    assert body["data"]["service"] == "LearnLoop API"
    assert body["data"]["database"] == "connected"
    assert body["message"] == "Backend and database are running"
    assert body["errors"] == []