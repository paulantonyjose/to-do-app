import pytest
from flask import json
from app import app, db
from datetime import datetime, timedelta


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def auth_headers(client):
    # Register a test user
    user_data = {"username": "testuser", "password": "testpassword"}
    client.post("/register", json=user_data)

    # Log in the test user and get the access token
    response = client.post("/login", json=user_data)
    access_token = json.loads(response.data)["access_token"]

    # Return the authorization headers
    return {"Authorization": f"Bearer {access_token}"}


def test_get_tasks(client, auth_headers):
    # Create a test task
    task_data = {
        "title": "Test Task",
        "description": "This is a test task",
        "status": "to do",
        "dueDate": datetime.now().strftime("%Y-%m-%d"),
        "user_id": "test_user_id",
    }
    db.tasks.insert_one(task_data)

    response = client.get("/tasks", headers=auth_headers)
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data) == 1
    assert data[0]["title"] == "Test Task"
    assert data[0]["remaining_days"] == 0
    assert data[0]["dateFormatted"] == datetime.now().strftime("%dth %B %Y")


def test_create_task_valid_data(client, auth_headers):
    task_data = {
        "title": "Test Task",
        "description": "This is a test task",
        "status": "to do",
        "dueDate": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
    }
    response = client.post("/tasks", json=task_data, headers=auth_headers)
    assert response.status_code == 200
    assert json.loads(response.data)["message"] == "Task created successfully"


def test_create_task_missing_title(client, auth_headers):
    task_data = {
        "description": "This is a test task",
        "status": "to do",
        "dueDate": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
    }
    response = client.post("/tasks", json=task_data, headers=auth_headers)
    assert response.status_code == 500
    assert "Title is required" in str(response.data)


def test_create_task_invalid_status(client, auth_headers):
    task_data = {
        "title": "Test Task",
        "description": "This is a test task",
        "status": "invalid",
        "dueDate": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
    }
    response = client.post("/tasks", json=task_data, headers=auth_headers)
    assert response.status_code == 500
    assert "Invalid status" in str(response.data)


def test_update_task_valid_data(client, auth_headers):
    # Create a test task
    task_data = {
        "title": "Test Task",
        "description": "This is a test task",
        "status": "to do",
        "dueDate": datetime.now().strftime("%Y-%m-%d"),
        "user_id": "test_user_id",
    }
    task_id = db.tasks.insert_one(task_data).inserted_id

    update_data = {"status": "in progress"}
    response = client.put(f"/tasks/{task_id}", json=update_data, headers=auth_headers)
    assert response.status_code == 200
    assert json.loads(response.data)["message"] == "Task updated successfully"


def test_update_task_invalid_status(client, auth_headers):
    # Create a test task
    task_data = {
        "title": "Test Task",
        "description": "This is a test task",
        "status": "to do",
        "dueDate": datetime.now().strftime("%Y-%m-%d"),
        "user_id": "test_user_id",
    }
    task_id = db.tasks.insert_one(task_data).inserted_id

    update_data = {"status": "invalid"}
    response = client.put(f"/tasks/{task_id}", json=update_data, headers=auth_headers)
    assert response.status_code == 500
    assert "Invalid status" in str(response.data)


def test_delete_task(client, auth_headers):
    # Create a test task
    task_data = {
        "title": "Test Task",
        "description": "This is a test task",
        "status": "to do",
        "dueDate": datetime.now().strftime("%Y-%m-%d"),
        "user_id": "test_user_id",
    }
    task_id = db.tasks.insert_one(task_data).inserted_id

    response = client.delete(f"/tasks/{task_id}", headers=auth_headers)
    assert response.status_code == 200
    assert json.loads(response.data)["message"] == "Task deleted successfully"


def test_register_valid_data(client):
    user_data = {"username": "newuser", "password": "newpassword"}
    response = client.post("/register", json=user_data)
    assert response.status_code == 200
    assert json.loads(response.data)["message"] == "User registered successfully"


def test_login_valid_credentials(client):
    user_data = {"username": "testuser", "password": "testpassword"}
    response = client.post("/login", json=user_data)
    assert response.status_code == 200
    assert "access_token" in json.loads(response.data)
    assert "refresh_token" in json.loads(response.data)


def test_login_invalid_credentials(client):
    user_data = {"username": "testuser", "password": "wrongpassword"}
    response = client.post("/login", json=user_data)
    assert response.status_code == 401
    assert json.loads(response.data)["message"] == "Invalid credentials"
