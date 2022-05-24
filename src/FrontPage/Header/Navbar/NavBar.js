import { useState } from "react";
import Register from "./AuthUserComponent/register.js";
import Login from "./AuthUserComponent/login.js";
import { FcAutomotive } from "react-icons/fc";
import { useHistory } from "react-router-dom";

import { NavLink } from "react-router-dom";
import { FaUser, FaAlignJustify, FaAlignCenter } from "react-icons/fa";
import { Collapse, Navbar, NavbarBrand, Nav, NavItem } from "reactstrap";
import "./nav.css";
const NavigationBarPage = (props) => {
  const history = useHistory();
  const myStorage = window.localStorage;
  const [currentuser, setCurrentUser] = useState(myStorage.getItem("email"));
  const [currentMechanic, setCurrentMechanic] = useState(
    myStorage.getItem("Memail")
  );
  const [isOpen, setIsOpen] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const toggle = () => setIsOpen(!isOpen);
  const handleRegister = (e) => {
    e.preventDefault();
    setShowLogin(false);
    setShowRegister(true);
  };
  const handleLogin = (e) => {
    setShowRegister(false);
    setShowLogin(true);
  };
  const handleLogout = (e) => {
    myStorage.removeItem("email");
    setCurrentUser(null);
    history.push("/");
    window.location.reload(false);
  };
  const handleMechanicLogout = (e) => {
    myStorage.removeItem("Memail");
    setCurrentMechanic(null);
    history.push("/");
    window.location.reload(false);
  };
  return (
    <div>
      <Navbar className="NavBack" expand="md">
        <div className="container">
          <NavbarBrand href="/">
            <span style={{ color: "#fff", fontFamily: "Lobster" }}>My </span>
            <span className="navbrand">Mechanic</span>
          </NavbarBrand>
          {/* <NavbarToggler onClick={toggle} /> */}
          <button
            aria-label="Toggle navigation"
            type="button"
            className="navbar-toggler"
          >
            <span onClick={toggle}>
              {isOpen && (
                <FaAlignCenter style={{ color: "#fff", border: "none" }} />
              )}
              {!isOpen && (
                <FaAlignJustify style={{ color: "#fff", border: "none" }} />
              )}
            </span>
          </button>
          <Collapse isOpen={isOpen} navbar>
            <Nav navbar style={{ marginLeft: "auto" }}>
              {currentMechanic ? (
                <>
                  <NavItem>
                    <NavLink to="/map" className="NavLink nav-link">
                      Map
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      exact
                      to="/"
                      onClick={handleMechanicLogout}
                      className="NavLink nav-link"
                    >
                      Logout
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      exact
                      to="/mechanicProfile"
                      className="NavLink nav-link"
                    >
                      <FcAutomotive />
                    </NavLink>
                  </NavItem>
                </>
              ) : currentuser ? (
                <>
                  <NavItem>
                    <NavLink to="/map" className="NavLink nav-link">
                      Map
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      exact
                      to="/"
                      onClick={handleLogout}
                      className="NavLink nav-link"
                    >
                      Logout
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      exact
                      to="/userProfile"
                      className="NavLink nav-link"
                    >
                      <FaUser />
                    </NavLink>
                  </NavItem>
                </>
              ) : (
                <>
                  <NavItem>
                    <NavLink to="/map" className="NavLink nav-link">
                      Map
                    </NavLink>
                  </NavItem>

                  <NavItem>
                    <NavLink
                      to="/"
                      onClick={handleLogin}
                      className="NavLink nav-link"
                    >
                      Login
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      to="/"
                      onClick={handleRegister}
                      className="NavLink nav-link"
                    >
                      Register
                    </NavLink>
                  </NavItem>
                </>
              )}
            </Nav>
          </Collapse>
        </div>
      </Navbar>
      {showRegister && <Register setShowRegister={setShowRegister} />}
      {showLogin && (
        <Login
          setShowLogin={setShowLogin}
          myStorage={myStorage}
          setCurrentUser={setCurrentUser}
        />
      )}
    </div>
  );
};
export default NavigationBarPage;
