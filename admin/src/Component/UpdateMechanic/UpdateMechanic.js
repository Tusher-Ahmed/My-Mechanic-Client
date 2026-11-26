import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import "./UpdateMechanic.css";
export default function UpdateMechanic() {
  const { id } = useParams();
  const [success, setSuccess] = useState(false);
  const [mechanic, setMechanic] = useState({
    _id: "",
    shopname: "",
    username: "",
    email: "",
    latitude: "",
    longitude: "",
    services: [{ serviceName: "", price: "" }],
  });

  useEffect(() => {
    fetch(`http://localhost:8080/api/mechanic`)
      .then((res) => res.json())
      .then((data) => {
        //console.log(data);
        const userA = data.filter((item) => item._id === id);
        //console.log(userA);

        setMechanic({
          _id: userA[0]._id,
          username: userA[0].username,
          shopname: userA[0].shopname,
          email: userA[0].email,
          latitude: userA[0].latitude,
          longitude: userA[0].longitude,
          services: userA[0].services,
        });
      })
      .catch((err) => console.log(err.message));
  }, [id]);

  const handleUpdate = (e) => {
    e.preventDefault();
    const { name, value } = e.target;
    setMechanic({
      ...mechanic,
      [name]: value,
    });
  };
  const handleUpdateForm = async (e, id) => {
    e.preventDefault();
    console.log(mechanic);
    try {
      await axios
        .put(`http://localhost:8080/api/mechanic/`, {
          id,
          username: mechanic.username,
          shopname: mechanic.shopname,
          email: mechanic.email,
          latitude: mechanic.latitude,
          longitude: mechanic.longitude,
          services: mechanic.services,
        })
        .then((res) => {
          setSuccess(true);
          console.log("hurray");
        });
    } catch (err) {
      console.log(err);
    }
  };
  return (
    <div className="updateMechanic">
      <div
        style={{
          textAlign: "center",
          margin: "10px 0",
          textTransform: "uppercase",
        }}
      >
        Change Account Information
      </div>
      <hr />

      <div className="settinngForm">
        <form onSubmit={(e) => handleUpdateForm(e, mechanic._id)}>
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
            value={mechanic.username}
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
            value={mechanic.password}
            onChange={handleUpdate}
            name="password"
          />
          <input
            style={{
              width: "100%",
              textAlign: "left",
              margin: "15px 0",
              border: "none",
              borderBottom: "1px solid #000",
            }}
            type="text"
            placeholder="latitude"
            value={mechanic.latitude}
            onChange={handleUpdate}
            name="latitude"
          />
          <input
            style={{
              width: "100%",
              textAlign: "left",
              margin: "15px 0",
              border: "none",
              borderBottom: "1px solid #000",
            }}
            type="text"
            placeholder="longitude"
            value={mechanic.longitude}
            onChange={handleUpdate}
            name="longitude"
          />
          <h5>Services</h5>
          {mechanic.services.map((item) => (
            <div key={item._id} className="row">
              <input
                type="text"
                className="col-md-8"
                value={item.serviceName}
                name="serviceName"
                onChange={handleUpdate}
                style={{
                  width: "100%",
                  textAlign: "left",
                  margin: "15px 0",
                  border: "none",
                  borderBottom: "1px solid #000",
                }}
              />
              <input
                type="text"
                className="col-md-4"
                value={item.price}
                name="price"
                onChange={handleUpdate}
                style={{
                  width: "100%",
                  textAlign: "left",
                  margin: "15px 0",
                  border: "none",
                  borderBottom: "1px solid #000",
                }}
              />
            </div>
          ))}
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
  );
}
