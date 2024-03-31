import React, { useState, useEffect } from "react";
import { Route, Routes, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import TextField from "@mui/material/TextField";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import "./index.css";
import DOMPurify from "dompurify";
import { formatISO } from "date-fns";

function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("To Do");
  const [dueDate, setDueDate] = useState(null);
  const [filter, setFilter] = useState("All");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response.status === 401 && !error.config._retry) {
        error.config._retry = true;
        const refresh_token = localStorage.getItem("refresh_token");

        const response = await axios.post(
          "http://localhost:8000/refresh",
          {},
          { headers: { Authorization: `Bearer ${refresh_token}` } }
        );
        if (response.status === 200) {
          localStorage.setItem("access_token", response.data.access_token);

          return response;
        }
      }
      return Promise.reject(error);
    }
  );

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      setIsLoggedIn(true);
      fetchTasks(token);
    }
  }, []);

  const handleDateChange = (date) => {
    if (date) {
      setDueDate(date);
    } else {
      setDueDate(null);
    }
  };

  const fetchTasks = async (token) => {
    try {
      const response = await axios.get("http://localhost:8000/tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const sanitizedData = response.data.map((task) => ({
        title: DOMPurify.sanitize(task.title),
        description: DOMPurify.sanitize(task.description),
        status: DOMPurify.sanitize(task.status),
        dueDate: new Date(DOMPurify.sanitize(task.dueDate)),
        dateFormatted: DOMPurify.sanitize(task.dateFormatted),
        _id: DOMPurify.sanitize(task._id),
      }));
      setTasks(sanitizedData);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const createTask = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("access_token");
      const sanitizedTitle = DOMPurify.sanitize(title);
      const sanitizedDescription = DOMPurify.sanitize(description);
      const sanitizedStatus = DOMPurify.sanitize(status);
      const sanitizedDueDate = formatISO(new Date(DOMPurify.sanitize(dueDate)));
      await axios.post(
        "http://localhost:8000/tasks",
        {
          title: sanitizedTitle,
          description: sanitizedDescription,
          status: sanitizedStatus,
          dueDate: sanitizedDueDate,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTitle("");
      setDescription("");
      setStatus("To Do");
      setDueDate(null);
      fetchTasks(token);
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const token = localStorage.getItem("access_token");
      await axios.put(
        `http://localhost:8000/tasks/${taskId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTasks(token);
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(`http://localhost:8000/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchTasks(token);
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const register = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:8000/register", {
        username,
        password,
      });
      setUsername("");
      setPassword("");
      alert("User registered successfully");
    } catch (error) {
      console.error("Error registering user:", error);
    }
  };

  const login = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:8000/login", {
        username,
        password,
      });
      localStorage.setItem("access_token", response.data.access_token);
      localStorage.setItem("refresh_token", response.data.refresh_token);

      setIsLoggedIn(true);
      setUsername("");
      setPassword("");
      fetchTasks(response.data.access_token);
      navigate("/tasks");
    } catch (error) {
      console.error("Error logging in:", error);
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");

    setIsLoggedIn(false);
    setTasks([]);
    navigate("/");
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === "All") return true;
    return task.status === filter;
  });

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className=" ml-6 flex space-x-8">
                {isLoggedIn ? (
                  <>
                    <Link
                      to="/tasks"
                      className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-md font-medium leading-5 text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:outline-none focus:text-gray-700 focus:border-gray-300 transition duration-150 ease-in-out"
                    >
                      Tasks
                    </Link>
                    <button
                      onClick={logout}
                      className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-md font-medium leading-5 text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:outline-none focus:text-gray-700 focus:border-gray-300 transition duration-150 ease-in-out"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-md font-medium leading-5 text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:outline-none focus:text-gray-700 focus:border-gray-300 transition duration-150 ease-in-out"
                    >
                      Register
                    </Link>
                    <Link
                      to="/login"
                      className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-md font-medium leading-5 text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:outline-none focus:text-gray-700 focus:border-gray-300 transition duration-150 ease-in-out"
                    >
                      Login
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-10">
        <Routes>
          <Route
            path="/"
            element={
              <h1 className="text-3xl font-bold text-center">
                Welcome to the to-do app
              </h1>
            }
          />
          <Route
            path="/tasks"
            element={
              isLoggedIn ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <h1 className="text-3xl font-bold mb-4">To-do app</h1>
                  <form onSubmit={createTask} className="mb-8">
                    <div className="mb-4">
                      <label
                        htmlFor="title"
                        className="block text-md font-medium text-gray-700"
                      >
                        Title
                      </label>
                      <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md h-12 px-3"
                      />
                    </div>
                    <div className="mb-4">
                      <label
                        htmlFor="description"
                        className="block text-md font-medium text-gray-700"
                      >
                        Description
                      </label>
                      <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md h-24 px-3 py-2"
                      ></textarea>
                    </div>
                    <div className="mb-4">
                      <label
                        htmlFor="status"
                        className="block text-md font-medium text-gray-700"
                      >
                        Status
                      </label>
                      <select
                        id="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm h-12"
                      >
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Done">Done</option>
                      </select>
                    </div>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <div className="mb-4">
                        <label
                          htmlFor="dueDate"
                          className="block text-md font-medium text-gray-700"
                        >
                          Due Date
                        </label>
                        <DatePicker
                          value={dueDate}
                          onChange={handleDateChange}
                          desktopModeMediaQuery="@media (min-width: 768px)"
                          textField={(params) => (
                            <TextField
                              {...params}
                              variant="standard"
                              InputLabelProps={{ shrink: true }}
                              className="mt-1 block w-full sm:text-sm rounded-md border-hidden	"
                            />
                          )}
                          inputFormat="yyyy-MM-dd"
                          disableMaskedInput
                        />
                      </div>
                    </LocalizationProvider>
                    <button
                      type="submit"
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-md font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Create Task
                    </button>
                  </form>
                  <div className="mb-4">
                    <label
                      htmlFor="filter"
                      className="block text-md font-medium text-gray-700"
                    >
                      Filter by status
                    </label>
                    <select
                      id="filter"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm h-12"
                    >
                      <option value="All">All</option>
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>
                  <ul className="divide-y divide-gray-200">
                    {filteredTasks.map((task) => (
                      <li key={task._id} className="py-4">
                        <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-3">
                          <div className="flex-1 space-y-1">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                              <h3 className="text-lg font-medium">
                                {task.title}
                              </h3>
                            </div>
                            <p className="text-lg text-gray-500">
                              {task.description}
                            </p>
                            <div>
                              <p className="  inline-flex items-center px-2.5 py-0.5 box-full text-sm font-medium bg-gray-200 text-gray-700	">
                                {task.status}
                              </p>

                              <p className="text-md text-gray-500">
                                <b>Due date: </b>
                                {task.dateFormatted}
                              </p>
                            </div>
                            {task.dueDate && (
                              <p className="text-md text-gray-500">
                                <b>Remaining Days:</b>{" "}
                                {Math.ceil(
                                  (new Date(task.dueDate) - new Date()) /
                                    (1000 * 60 * 60 * 24)
                                )}
                              </p>
                            )}
                          </div>
                          <div className="mt-4 sm:mt-0 sm:ml-4">
                            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                              <button
                                onClick={() =>
                                  updateTaskStatus(task._id, "To Do")
                                }
                                className="inline-flex items-center justify-center px-2.5 py-1.5 border border-transparent text-sm font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                To Do
                              </button>
                              <button
                                onClick={() =>
                                  updateTaskStatus(task._id, "In Progress")
                                }
                                className="inline-flex items-center justify-center px-2.5 py-1.5 border border-transparent text-sm font-medium rounded text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                              >
                                In Progress
                              </button>
                              <button
                                onClick={() =>
                                  updateTaskStatus(task._id, "Done")
                                }
                                className="inline-flex items-center justify-center px-2.5 py-1.5 border border-transparent text-sm font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                              >
                                Done
                              </button>
                              <button
                                onClick={() => deleteTask(task._id)}
                                className="inline-flex items-center justify-center px-2.5 py-1.5 border border-transparent text-sm font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>{" "}
                </div>
              ) : (
                <p className="text-center text-gray-500">
                  Please log in to view tasks.
                </p>
              )
            }
          />
          <Route
            path="/register"
            element={
              <div className="max-w-md mx-auto mt-8">
                <h1 className="text-2xl font-bold mb-4">Register</h1>
                <form onSubmit={register} className="space-y-4">
                  <div>
                    <label
                      htmlFor="username"
                      className="block text-md font-medium text-gray-700"
                    >
                      Username
                    </label>
                    <input
                      type="text"
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md h-12"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-md font-medium text-gray-700"
                    >
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md h-12"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Register
                  </button>
                </form>
              </div>
            }
          />
          <Route
            path="/login"
            element={
              <div className="max-w-md mx-auto mt-8">
                <h1 className="text-2xl font-bold mb-4">Login</h1>
                <form onSubmit={login} className="space-y-4">
                  <div>
                    <label
                      htmlFor="username"
                      className="block text-md font-medium text-gray-700"
                    >
                      Username
                    </label>
                    <input
                      type="text"
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md h-12"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-md font-medium text-gray-700"
                    >
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md h-12"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Login
                  </button>
                </form>
              </div>
            }
          />
        </Routes>
      </div>
    </div>
  );
}

export default App;
