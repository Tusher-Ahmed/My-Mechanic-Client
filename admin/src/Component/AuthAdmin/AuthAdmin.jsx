import React from "react";
import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./AuthAdmin.css";
export default function AdminLogin() {
  const myStorage = window.localStorage;
  const [failure, setFailure] = useState(false);
  const [admin, setAdmin] = useState({
    email: "",
    password: "",
  });
  //console.log(currentuser);
  const history = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAdmin({
      ...admin,
      [name]: value,
    });
  };
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    const { email, password } = admin;
    try {
      if (email && password) {
        const res = await axios
          .post("http://localhost:8080/api/admin/login", admin)
          .then((res) => res);
        myStorage.setItem("Aemail", res.data.email);
        history("/home");
        window.location.reload(false);
        setFailure(false);
      } else {
        setFailure(true);
      }
    } catch (err) {
      setFailure(true);
    }
  };

  return (
    <div className="LoginAdmin">
      <div className="logo mb-3">Admin Login</div>
      <form className="formStyle">
        <input
          type="email"
          placeholder="Email"
          name="email"
          className="form-control"
          value={admin.email}
          onChange={handleChange}
        />
        <br />

        <input
          type="password"
          class="form-control"
          name="password"
          value={admin.password}
          onChange={handleChange}
          placeholder="Password"
        ></input>
        <br />
        <button className="btn btnR" onClick={handleAdminLogin}>
          Login
        </button>
        <br />
        {failure && <span className="failure">Something went wrong!</span>}
      </form>
    </div>
  );
}
