import React, { useEffect, useState } from "react";
import axios from "axios";
import "./email.css";
export default function Email() {
  const [messages, setMessages] = useState([]);
  useEffect(() => {
    fetch(`http://localhost:8080/api/message`)
      .then((res) => res.json())
      .then((data) => {
        data.sort((a, b) => (a.date > b.date ? -1 : 1));
        setMessages([...data]);
      });
  }, []);
  const handleDelete = async (e, id) => {
    e.preventDefault();
    try {
      await axios
        .delete(`http://localhost:8080/api/message/` + id)
        .then((res) => res);
    } catch (err) {
      console.log(err);
    }
  };
  return (
    <div className="emailInfo">
      <div>
        {messages.map((item) => (
          <div className="boxMessage">
            <p>Email:{item["email"]}</p>
            <p>Subject:{item["subject"]}</p>
            <p>Message:{item["message"]}</p>
            <p>Date:{item["date"]}</p>
            <button
              onClick={(e) => handleDelete(e, item["_id"])}
              style={{
                backgroundColor: "red",
                color: "#fff",
                padding: "5px 35px",
                borderRadius: "20px",
                border: "none",
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
