from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    jwt_required,
    get_jwt_identity,
    create_access_token,
    create_refresh_token,
)
from flask import jsonify, request
import bcrypt
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)

jwt = JWTManager(app)

client = MongoClient(os.getenv("MONGODB_URI"))
db = client.task_manager


@app.route("/tasks", methods=["GET"])
@jwt_required()
def get_tasks():
    user_id = get_jwt_identity()
    tasks = list(db.tasks.find({"user_id": user_id}))
    for task in tasks:
        task["_id"] = str(task["_id"])
        task["remaining_days"] = (
            (task.get("dueDate") - datetime.now()).days
            if task.get("dueDate")
            else "Not available"
        )
        task["dateFormatted"] = (
            task.get("dueDate").strftime("%dth %B %Y")
            if task.get("dueDate")
            else "Due date not given"
        )

    return jsonify(tasks)


@app.route("/tasks", methods=["POST"])
@jwt_required()
def create_task():
    user_id = get_jwt_identity()
    data = request.get_json()

    if "title" not in data or not data["title"].strip():
        raise ValueError("Title is required")

    if "description" not in data or not data["description"].strip():
        raise ValueError("Description is required")

    valid_statuses = ["to do", "in progress", "done"]
    if "status" not in data or data["status"].lower() not in valid_statuses:
        raise ValueError("Invalid status")

    if "dueDate" not in data:
        raise ValueError("Due date is required")
    try:
        due_date = datetime.strptime(data["dueDate"].split("T")[0], "%Y-%m-%d")
    except ValueError:
        raise ValueError("Invalid due date format. Expected format: YYYY-MM-DD")

    task = {
        "title": data["title"],
        "description": data["description"],
        "status": data["status"],
        "dueDate": due_date,
        "user_id": user_id,
    }

    db.tasks.insert_one(task)
    return jsonify({"message": "Task created successfully"})


@app.route("/tasks/<task_id>", methods=["PUT"])
@jwt_required()
def update_task(task_id):
    user_id = get_jwt_identity()
    data = request.get_json()
    valid_statuses = ["to do", "in progress", "done"]
    if "status" not in data or data["status"].lower() not in valid_statuses:
        raise ValueError("Invalid status")

    result = db.tasks.update_one(
        {"_id": ObjectId(task_id), "user_id": user_id}, {"$set": data}
    )
    if result.modified_count == 0:
        return jsonify({"message": "Task not found or unauthorized"}), 404
    return jsonify({"message": "Task updated successfully"})


@app.route("/tasks/<task_id>", methods=["DELETE"])
@jwt_required()
def delete_task(task_id):
    user_id = get_jwt_identity()
    result = db.tasks.delete_one({"_id": ObjectId(task_id), "user_id": user_id})
    if result.deleted_count == 0:
        return jsonify({"message": "Task not found or unauthorized"}), 404
    return jsonify({"message": "Task deleted successfully"})


@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data["username"]
    password = data["password"]

    hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

    user = {"username": username, "password": hashed_password}

    db.users.insert_one(user)
    return jsonify({"message": "User registered successfully"})


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    password = data["password"].encode("utf-8")

    user = db.users.find_one({"username": data["username"]})
    if user:
        hashed_password = user["password"]
        if bcrypt.checkpw(password, hashed_password):
            access_token = create_access_token(identity=str(user["_id"]))
            refresh_token = create_refresh_token(identity=str(user["_id"]))
            return jsonify(access_token=access_token, refresh_token=refresh_token)

    return jsonify({"message": "Invalid credentials"}), 401


@app.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity, fresh=False)
    return jsonify(access_token=access_token)


if __name__ == "__main__":
    app.run()
