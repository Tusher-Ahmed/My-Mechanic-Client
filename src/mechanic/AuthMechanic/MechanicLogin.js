import React from "react";
import { useState } from "react";
import axios from "axios";
import { FaTimes } from "react-icons/fa";
import "./MechanicLogin.css";
export default function MechanicLogin({
  setShowMLogin,
  myStorage,
  setCurrentMechanic,
}) {
  const mStorage = window.localStorage;

  const [currentuser, setCurrentUser] = useState(mStorage.getItem("email"));
  const [failure, setFailure] = useState(false);
  const [mechanic, setMechanic] = useState({
    email: "",
    password: "",
  });
  console.log(currentuser);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setMechanic({
      ...mechanic,
      [name]: value,
    });
  };
  const handleMechanicLogin = async (e) => {
    e.preventDefault();
    const { email, password } = mechanic;
    try {
      if (email && password) {
        const res = await axios
          .post("http://localhost:8080/api/mechanic/login", mechanic)
          .then((res) => res);
        myStorage.setItem("Memail", res.data.email);
        setCurrentMechanic(res.data.email);
        mStorage.removeItem("email");
        window.location.reload(false);
        setCurrentUser(null);
        setShowMLogin(false);
        setFailure(false);
      } else {
        setFailure(true);
      }
    } catch (err) {
      setFailure(true);
    }
  };

  return (
    <div className="LoginMechanic">
      <div className="logo mb-3">Mechanic Login</div>
      <form className="formStyle">
        <input
          type="email"
          placeholder="Email"
          name="email"
          className="form-control"
          value={mechanic.email}
          onChange={handleChange}
        />
        <br />

        <input
          type="password"
          class="form-control"
          name="password"
          value={mechanic.password}
          onChange={handleChange}
          placeholder="Password"
        ></input>
        <br />
        <button className="btn btnR" onClick={handleMechanicLogin}>
          Login
        </button>
        <br />
        {failure && <span className="failure">Something went wrong!</span>}
      </form>
      <FaTimes className="crossR" onClick={() => setShowMLogin(false)} />
    </div>
  );
}
