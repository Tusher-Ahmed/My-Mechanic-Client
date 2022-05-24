import axios from "axios";
import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";

import "../FrontPage/UserAccount/userAccount.css";
const MechanicAccount = (props) => {
  const myStorage = window.localStorage;
  const history = useHistory();
  const crntMechanic = myStorage.getItem("Memail");
  const [mechanic, setMechanic] = useState({
    _id: "",
    shopname: "",
    username: "",
    email: "",
    phone: "",
  });
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    fetch(`http://localhost:8080/api/mechanic`)
      .then((res) => res.json())
      .then((data) => {
        const userA = data.filter((item) => item.email === crntMechanic);
        // console.log(userA);
        setMechanic({
          _id: userA[0]._id,
          username: userA[0].username,
          shopname: userA[0].shopname,
          email: userA[0].email,
          phone: userA[0].phone,
        });
      })
      .catch((err) => console.log(err.message));
  }, [crntMechanic]);
  const [order, setOrder] = useState(true);
  const [setting, setSeting] = useState(false);
  const [notification, setNotification] = useState(false);
  const [update, setUpdate] = useState({
    username: "",
    password: "",
  });
  const [orderList, setOrderList] = useState({
    MOrder: [],
  });
  useEffect(() => {
    fetch(`http://localhost:8080/api/order`)
      .then((res) => res.json())
      .then((data) => {
        const datas = data.filter(
          (item) => item.mechanicEmail === crntMechanic
        );
        datas.sort((a, b) => (a.date > b.date ? -1 : 1));
        //console.log(datas);
        setOrderList({
          MOrder: datas,
        });
      })
      .catch((err) => console.log(err.message));
  }, [crntMechanic]);
  const handleNotification = (e) => {
    e.preventDefault();
    setOrder(false);
    setNotification(true);
    setSeting(false);
  };
  const handleOrder = async (e) => {
    e.preventDefault();
    setNotification(false);
    setOrder(true);
    setSeting(false);
  };
  const handleSetting = (e) => {
    e.preventDefault();
    setNotification(false);
    setOrder(false);
    setSeting(true);
  };
  const handleUpdate = (e) => {
    e.preventDefault();
    const { name, value } = e.target;
    setUpdate({
      ...update,
      [name]: value,
    });
    setTimeout(() => {
      myStorage.removeItem("email");
    }, 2000);
  };
  const handleUpdateForm = async (e, id) => {
    e.preventDefault();
    try {
      if (id) {
        await axios
          .put(`http://localhost:8080/api/mechanic/`, {
            id,
            username: update.username,
            password: update.password,
          })
          .then((res) => {
            setSuccess(true);
            myStorage.removeItem("Memail");
            history.push("/");
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
  const handleAccept = async (e, id) => {
    e.preventDefault();
    try {
      if (id) {
        await axios
          .put(`http://localhost:8080/api/order/`, {
            id,
            status: true,
          })
          .then((res) => res);
      }
    } catch (err) {
      console.log(err);
    }
  };
  const acceptOrder = orderList.MOrder.filter((item) => item.status === true);
  const length = acceptOrder.length;
  //console.log(length);
  return (
    <div className="container h-100">
      <div className="row">
        <div className="col-md-3 leftSide">
          <div
            className="head"
            style={{ padding: "15px 0", borderBottom: "1px solid #000" }}
          >
            <div style={{ padding: "15px 0" }}>{mechanic.shopname}</div>
            <h3>{mechanic.username}</h3>
            <h5>Email:{mechanic.email}</h5>
            <h5>Phone No:+880{mechanic.phone}</h5>
          </div>

          <div className="userList">
            <li onClick={handleOrder}>Order</li>
            <li onClick={handleNotification}>
              Accepted Order
              <span
                style={{
                  marginTop: "-5px",
                  backgroundColor: "red",
                  fontSize: "9px",
                  color: "white",
                  padding: "3px",
                  borderRadius: "20px",
                  position: "absolute",
                  marginLeft: "2px",
                }}
              >
                {length}
              </span>
            </li>
            <li onClick={handleSetting}>Setting</li>
          </div>
        </div>
        <div className="col-md-9 rightSide mt-5">
          {order && (
            <div>
              <h2>Recieved order</h2>
              <hr />

              {orderList.MOrder.map((item) => (
                <div
                  className="box"
                  style={{
                    textAlign: "left",
                    padding: "15px",
                    border: "1px solid #000",
                    margin: "10px 0",
                  }}
                >
                  <h5 style={{ margin: "10px 0 20px 0" }}>
                    Order Id: {item._id}
                  </h5>

                  <h5>User Email: {item.userEmail}</h5>

                  <h5>Ordered Services:</h5>
                  {item.services.map((s) => (
                    <>
                      <li style={{ textAlign: "left" }}>
                        <span>Service Name : {s[0]["serviceName"]}</span>
                        <span style={{ marginLeft: "1.5rem", color: "green" }}>
                          Price : {s[0]["price"]}
                        </span>
                      </li>
                    </>
                  ))}
                  <h5 style={{ marginTop: "8px" }}>
                    Total price:
                    <span style={{ color: "blue" }}>{item.totalPrice}</span>
                  </h5>

                  <h5>Order issue Date: {item.date}</h5>
                  {!item.status && (
                    <>
                      <button
                        onClick={(e) => handleAccept(e, item._id)}
                        style={{
                          backgroundColor: "Green",
                          color: "#fff",
                          padding: "5px 25px",
                          border: "1px solid green",
                        }}
                      >
                        Accept
                      </button>
                    </>
                  )}
                  {item.status && (
                    <h6
                      style={{
                        color: "#fff",
                        border: "1px solid red",
                        padding: "3px 5px",
                        backgroundColor: "black",
                      }}
                    >
                      Order was accepted by you
                    </h6>
                  )}
                </div>
              ))}
            </div>
          )}

          {notification && (
            <div>
              <h4
                style={{
                  textAlign: "center",
                  margin: "20px 0",
                  fontSize: "25px",
                  textTransform: "uppercase",
                }}
              >
                Accepted Order
              </h4>
              {acceptOrder.map((item) => (
                <div
                  className="box box1"
                  style={{
                    textAlign: "left",
                    padding: "15px",
                    border: "1px solid #000",
                    margin: "10px 0",
                  }}
                >
                  <h5>Shop name: {item.shopname}</h5>
                  <h5>Order Id: {item._id}</h5>
                  <h5>Mechanic Name: {item.mechanicUsername}</h5>
                  <h5>User Email: {item.userEmail}</h5>
                  <h5>
                    Customer Phone No:
                    <a href={`+88${item.userPhone}`}>+880 {item.userPhone}</a>
                  </h5>
                  <h5>Order Services:</h5>
                  {item.services.map((s) => (
                    <>
                      <li style={{ textAlign: "left" }}>
                        <span>Service Name : {s[0]["serviceName"]}</span>
                        <span style={{ marginLeft: "1.5rem", color: "green" }}>
                          Price : {s[0]["price"]}
                        </span>
                      </li>
                    </>
                  ))}
                  <h5 style={{ marginTop: "8px" }}>
                    Total price:
                    <span style={{ color: "blue" }}>{item.totalPrice}</span>
                  </h5>
                  <h5>Order Date: {item.date}</h5>
                </div>
              ))}
            </div>
          )}
          {setting && (
            <div>
              <div>Change Account Information</div>
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
          )}
        </div>
      </div>
    </div>
  );
};
export default MechanicAccount;
