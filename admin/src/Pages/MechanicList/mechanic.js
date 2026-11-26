import React, { useState, useEffect } from "react";
import axios from "axios";
import "./mechanic.css";
import { Link } from "react-router-dom";
export default function Mechanic() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8080/api/mechanic")
      .then((res) => res.json())
      .then((data) => {
        data.sort((a, b) => (a.username > b.username ? 1 : -1));
        setRows([...data]);
      });
  }, []);
  const handleDelete = async (e, id) => {
    e.preventDefault();
    try {
      await axios
        .delete(`http://localhost:8080/api/mechanic/` + id)
        .then((res) => res);
    } catch (err) {
      console.log(err);
    }
  };
  //console.log(rows);
  return (
    <div
      className="mechanicList"
      style={{ margin: "20px", width: "100%", overflow: "hidden" }}
    >
      <Link to="/createMechanic">
        <button className="createbtn">Create New Mechanic</button>
      </Link>

      <table
        className="table table-bordered"
        style={{ width: "100%", margin: "60px 0px" }}
      >
        <thead style={{ backgroundColor: "#000", color: "#fff" }}>
          <tr>
            <td>ID</td>
            <td>Username</td>
            <td>Email</td>
            <td>Actions</td>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr>
              <td>{item["_id"]}</td>
              <td>{item["username"]}</td>
              <td>{item["email"]}</td>
              <td>
                <Link to={"/mechanics/" + item["_id"]}>
                  <button className="btn1">Edit</button>
                </Link>
                <button
                  className="btn2"
                  onClick={(e) => handleDelete(e, item["_id"])}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
