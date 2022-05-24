import React, { useState } from "react";
import axios from "axios";
import "./Contact.css";
export default function Contact() {
  const [messages, setMessages] = useState({
    email: "",
    subject: "",
    message: "",
  });
  const [success, setSuccess] = useState(false);
  const [failure, setFailure] = useState(false);
  const handleChange = (e) => {
    e.preventDefault();
    const { name, value } = e.target;
    setMessages({
      ...messages,
      [name]: value,
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { email, subject, message } = messages;
    console.log(email, subject, message);
    try {
      if (email && subject && message) {
        await axios
          .post("http://localhost:8080/api/message", {
            email: messages.email,
            subject: messages.subject,
            message: messages.message,
          })
          .then((res) => {
            setSuccess(true);
            setFailure(false);
          })
          .catch((err) => console.log(err));
      } else {
        setSuccess(false);
        setFailure(true);
      }
      setMessages({
        email: "",
        subject: "",
        message: "",
      });
    } catch (err) {
      console.log(err);
      setSuccess(false);
      setFailure(true);
    }
  };
  return (
    <div className="container ">
      <h2 className="heading">contact us</h2>
      <form className="formDesign" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Enter your email..."
          name="email"
          required
          className="form-control"
          onChange={handleChange}
          value={messages.email}
          style={{ border: "none", borderBottom: "1px solid #000" }}
        />
        <br />
        <input
          type="text"
          placeholder="Enter subject..."
          name="subject"
          required
          value={messages.subject}
          className="form-control"
          onChange={handleChange}
          style={{ border: "none", borderBottom: "1px solid #000" }}
        />
        <br />
        <textarea
          name="message"
          value={messages.message}
          placeholder="Write your message..."
          className="form-control"
          onChange={handleChange}
          required
          style={{ border: "1px solid #000", outline: "none", height: "150px" }}
        ></textarea>
        <br />
        <button className="btnsend" type="submit">
          Send
        </button>
      </form>
      {success && (
        <p
          style={{
            color: "green",
            display: "flex",
            justifyContent: "center",
            marginTop: "10px",
          }}
        >
          Message Sent!
        </p>
      )}
      {failure && (
        <p
          style={{
            color: "red",
            display: "flex",
            justifyContent: "center",
            marginTop: "10px",
          }}
        >
          Something went wrong, try again!
        </p>
      )}
    </div>
  );
}
