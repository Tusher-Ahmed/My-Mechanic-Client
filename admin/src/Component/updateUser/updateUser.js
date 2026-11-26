import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import "./updateUser.css";
export default function UpdatepdateUser() {
  const [success, setSuccess] = useState(false);
  const { id } = useParams();
  // console.log(id);
  const [user, setUser] = useState({
    _id: "",
    username: "",
    email: "",
  });
  const [update, setUpdate] = useState({
    username: "",
    password: "",
  });
  useEffect(() => {
    fetch(`http://localhost:8080/api/user`)
      .then((res) => res.json())
      .then((data) => {
        const userA = data.filter((item) => item._id === id);
        //console.log(userA);
        setUser({
          _id: userA[0]._id,
          username: userA[0].username,
          email: userA[0].email,
        });
      })
      .catch((err) => console.log(err.message));
  }, [id]);
  const handleUpdate = (e) => {
    e.preventDefault();
    const { name, value } = e.target;
    setUpdate({
      ...update,
      [name]: value,
    });
  };
  const handleUpdateForm = async (e, id) => {
    e.preventDefault();
    try {
      if (id) {
        await axios
          .put(`http://localhost:8080/api/user/`, {
            id,
            username: update.username,
            password: update.password,
          })
          .then((res) => {
            setSuccess(true);
          });
      }
    } catch (err) {
      console.log(err);
    }
    setUpdate({
      username: "",
      password: "",
    });
  };

  return (
    <div className="updateUser">
      <div>
        <div
          style={{
            textAlign: "center",
            fontSize: "25px",
            textTransform: "uppercase",
          }}
        >
          Change User Account Information
        </div>

        <div className="settinngForm">
          <form onSubmit={(e) => handleUpdateForm(e, user._id)}>
            <input
              style={{
                width: "100%",
                textAlign: "left",
                margin: "15px 0",
                border: "none",
                borderBottom: "1px solid #000",
              }}
              type="text"
              placeholder="username"
              value={update.username}
              onChange={handleUpdate}
              name="username"
            />

            <input
              style={{
                width: "100%",
                margin: "15px 0",
                border: "none",
                textAlign: "left",
                borderBottom: "1px solid #000",
              }}
              type="password"
              placeholder="password"
              value={update.password}
              onChange={handleUpdate}
              name="password"
            />
            <button
              className="btn"
              style={{
                margin: "35px auto",
                textAlign: "center",
                padding: "5px 25px",
                backgroundColor: "#000",
                color: "#fff",
              }}
            >
              Update
            </button>
          </form>
          {success && (
            <p
              style={{
                color: "green",
                fontSize: "14px",
                marginTop: "20px",
              }}
            >
              User information updated successfully!!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
