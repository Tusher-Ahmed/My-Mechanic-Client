import React from "react";
import author from "./author.jpg";
import "./About.css";
export default function About() {
  return (
    <div className="container" style={{ textAlign: "justify" }}>
      <h2 className="head">About</h2>
      <div className="row about1">
        <div className="col-md-4">
          <img src={author} alt="Tusher Ahmed" className="img" />
        </div>
        <div className="col-md-8">
          <div className="description">
            <h4 style={{ fontSize: "20px" }}>Hi! My name is Tusher Ahmed.</h4>
            <h6
              style={{
                fontSize: "16px",
                margin: "25px 0 15px 0",
                color: "blue",
              }}
            >
              Here some frequently asked questions:
            </h6>
            <h5 style={{ fontSize: "14px" }}>Who can use the site?</h5>
            <p style={{ fontSize: "12px" }}>
              "My Mechanic" this the title of my project . Basically this
              project is for four wheeler car user and mechanic.where the user
              can registered and visit site to know the details about car
              mechanic or garage around him.
            </p>
            <h5 style={{ fontSize: "14px" }}>
              Which technology i use to develop the site?
            </h5>
            <p style={{ fontSize: "12px" }}>
              To develop the whole website i use React jS, Node Js,Express
              JS,MongoDB,Mongoose,Google Map,CSS and other essential technology.
            </p>
          </div>
        </div>
      </div>
      <div className="inspiration">
        <h5 style={{ fontSize: "14px" }}>Purpose of the site?</h5>
        <p style={{ fontSize: "12px" }}>
          I will tell you a story then you will understand the concept easily,
          Suppose you are going somewhere ,suddenly your car breakdown and you
          don't know the place much and theres no one nearby to help you . In
          this situation what will you do? And your solution is here, go to "My
          Mechanic" and find mechanic or garage near you with best prices and
          solve your problem without any risk by the best mechanic and fullfill
          your beautiful journey!
        </p>
      </div>
    </div>
  );
}
