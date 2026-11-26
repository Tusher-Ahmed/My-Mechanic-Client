import React from "react";
import "./Topbar.css";
import { Link, useNavigate } from "react-router-dom";

export default function Topbar() {
  const myStorage = window.localStorage;
  const history = useNavigate();

  const handleLogout = () => {
    myStorage.removeItem("Aemail");
    history("/");
    window.location.reload(false);
  };
  return (
    <div className="topbar">
      <div className="topbarWrapper">
        <div className="topLeft">
          <div className="logo">
            <span
              style={{
                color: "#fff",
                fontFamily: "Lobster",
                marginRight: "3px",
              }}
            >
              My
            </span>
            <span style={{ color: "rgb(4, 118, 116)", fontFamily: "Lobster" }}>
              Mechanic
            </span>
          </div>
        </div>
        <Link to="/" onClick={handleLogout}>
          Logout
        </Link>
      </div>
    </div>
  );
}
