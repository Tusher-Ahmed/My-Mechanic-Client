import React from "react";
import { useState } from "react";
import axios from "axios";
import { FaTimes } from "react-icons/fa";
import "./register.css";

export default function Register({ setShowRegister }) {
  const [success, setSuccess] = useState(false);
  const [failure, setFailure] = useState(false);
  const [user, setUser] = useState({
    username: "",
    email: "",
    phone: "",
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
    const { username, email, phone, password } = user;
    try {
      if (username && email && password && phone) {
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
          type="number"
          placeholder="Phone No"
          name="phone"
          className="form-control"
          value={user.phone}
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
        {success && (
          <span className="successN">Successful.You can login now!</span>
        )}
        {failure && <span className="failure">Something went wrong!</span>}
      </form>
      <FaTimes className="crossR" onClick={() => setShowRegister(false)} />
    </div>
  );
}
