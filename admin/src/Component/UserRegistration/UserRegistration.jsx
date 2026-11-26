import React from "react";
import { useState } from "react";
import axios from "axios";
import "./UserRegistration.css";

export default function Register() {
  const [success, setSuccess] = useState(false);
  const [failure, setFailure] = useState(false);
  const [user, setUser] = useState({
    username: "",
    email: "",
    password: "",
  });
  const handleChange = (e) => {
    console.log(e.target.value);
    const { name, value } = e.target;
    setUser({
      ...user,
      [name]: value,
    });
  };
  const handleRegister = async (e) => {
    e.preventDefault();
    const { username, email, password } = user;
    try {
      if (username && email && password) {
        await axios
          .post("http://localhost:8080/api/user", user)
          .then((res) => console.log(res));
        setFailure(false);
        setSuccess(true);
      } else {
        setSuccess(false);
        setFailure(true);
      }
    } catch (err) {
      setSuccess(false);
      setFailure(true);
    }
    setUser({
      username: "",
      email: "",
      password: "",
    });
  };
  return (
    <div className="RegisterUser">
      <div className="logo mb-3">User Register</div>
      <form className="formStyle">
        <input
          type="text"
          placeholder="Username"
          name="username"
          value={user.username}
          onChange={handleChange}
          className="form-control"
        />

        <br />
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
          type="text"
          class="form-control"
          name="password"
          value={user.password}
          onChange={handleChange}
          placeholder="Password"
        ></input>
        <br />
        <button className="btn btnR" onClick={handleRegister}>
          Register
        </button>
        <br />
        {success && <span className="successN">Successful created user!</span>}
        {failure && <span className="failure">Something went wrong!</span>}
      </form>
    </div>
  );
}
