import React from "react";
import { useState } from "react";
import axios from "axios";
import { FaTimes } from "react-icons/fa";
import "./login.css";

export default function Login({ setShowLogin, myStorage, setCurrentUser }) {
  const [failure, setFailure] = useState(false);
  const [user, setUser] = useState({
    email: "",
    password: "",
  });
  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser({
      ...user,
      [name]: value,
    });
  };
  const handleUserLogin = async (e) => {
    e.preventDefault();
    const { email, password } = user;
    try {
      if (email && password) {
        const res = await axios
          .post("http://localhost:8080/api/user/login", user)
          .then((res) => res);
        myStorage.setItem("email", res.data.email);
        setCurrentUser(res.data.email);
        window.location.reload(false);
        setShowLogin(false);
        setFailure(false);
      } else {
        setFailure(true);
      }
    } catch (err) {
      setFailure(true);
    }
  };
  return (
    <div className="LoginUser">
      <div className="logo mb-3">User Login</div>
      <form className="formStyle">
        <input
          type="email"
          placeholder="Email"
          name="email"
          className="form-control"
          value={user.email}
          onChange={handleChange}
        />
        <br />

        <input
          type="password"
          class="form-control"
          name="password"
          value={user.password}
          onChange={handleChange}
          placeholder="Password"
        ></input>
        <br />
        <button className="btn btnR" onClick={handleUserLogin}>
          Login
        </button>
        <br />
        {failure && <span className="failure">Something went wrong!</span>}
      </form>
      <FaTimes className="crossR" onClick={() => setShowLogin(false)} />
    </div>
  );
}
