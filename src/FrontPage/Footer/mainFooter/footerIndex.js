import "./footerStyle.css";
import { useState } from "react";
import { FaFacebook, FaGithub, FaLinkedin, FaSkype } from "react-icons/fa";
import { FcAutomotive } from "react-icons/fc";
import MechanicLogin from "../../../mechanic/AuthMechanic/MechanicLogin";

import { Link } from "react-router-dom";
export default function FooterIndex() {
  const myStorage = window.localStorage;
  const [currentMechanic, setCurrentMechanic] = useState(
    myStorage.getItem("Memail")
  );
  const [showMLogin, setShowMLogin] = useState(false);
  const handleMechanicLogin = (e) => {
    setShowMLogin(true);
  };

  console.log(currentMechanic);

  return (
    <div
      style={{ backgroundColor: "#041531", color: "whitesmoke" }}
      className="container-fluid footerS"
    >
      <div className="row">
        <div className="col-md-4 p-3 text-center">
          <h4 className="footer-brand">
            My <span className="footBrand">Mechanic</span>{" "}
          </h4>
          <p className="p-3 fNote">
            <span>Save more. Stress less.</span>
            <br />
            <span>The future of car repairs starts today.</span>
          </p>
          <ul className="list-inline">
            <li className="list-inline-item p-2  ml-2">
              <a
                href="https://www.facebook.com/tusher.ahmed.1447342"
                target="_blank"
                rel="noopener noreferrer"
                className="social"
              >
                <FaFacebook />
              </a>
            </li>
            <li className="list-inline-item p-2 ml-2">
              <a
                href="https://www.linkedin.com/in/tusher-ahmed-6b9b70210/"
                target="_blank"
                rel="noopener noreferrer"
                className="social"
              >
                <FaLinkedin />
              </a>
            </li>
            <li className="list-inline-item p-2 ml-2">
              <a
                href="https://github.com/Tusher-Ahmed"
                target="_blank"
                rel="noopener noreferrer"
                className="social"
              >
                <FaGithub />
              </a>
            </li>
            <li className="list-inline-item p-2 ml-2">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="social"
              >
                <FaSkype />
              </a>
            </li>
          </ul>
        </div>

        <div className="col-md-4 p-3">
          <h6>Comapny</h6>
          <ul className="list-inline p-2">
            <li>
              <Link to="/about">About Us</Link>
            </li>
            <li>
              <Link to="/contact">Contact Us</Link>
            </li>
          </ul>
        </div>
        <div className="col-md-4 p-3">
          <h6>Earn With My Garage</h6>
          <ul className="list-inline p-2">
            {currentMechanic ? (
              <>
                <li>
                  <Link to="/mechanicProfile">
                    <FcAutomotive />
                    My profile
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/" onClick={handleMechanicLogin}>
                    Login
                  </Link>
                </li>
                <li>
                  <Link to="/mechanicRegister">Register</Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
      {showMLogin && (
        <MechanicLogin
          setShowMLogin={setShowMLogin}
          myStorage={myStorage}
          setCurrentMechanic={setCurrentMechanic}
        />
      )}
    </div>
  );
}
