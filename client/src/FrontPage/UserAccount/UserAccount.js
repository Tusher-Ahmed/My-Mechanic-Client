import axios from "axios";
import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import "./userAccount.css";
const UserAccount = (props) => {
  const myStorage = window.localStorage;
  const history = useHistory();
  const crntUser = myStorage.getItem("email");
  const [user, setUser] = useState({
    _id: "",
    username: "",
    email: "",
    phone: "",
  });
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    fetch(`http://localhost:8080/api/user`)
      .then((res) => res.json())
      .then((data) => {
        const userA = data.filter((item) => item.email === crntUser);
        // console.log(userA);
        setUser({
          _id: userA[0]._id,
          username: userA[0].username,
          email: userA[0].email,
          phone: userA[0].phone,
        });
      })
      .catch((err) => console.log(err.message));
  }, [crntUser]);
  const [order, setOrder] = useState(true);
  const [notification, setNotification] = useState(false);
  const [setting, setSeting] = useState(false);
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
        const datas = data.filter((item) => item.userEmail === crntUser);
        datas.sort((a, b) => (a.date > b.date ? -1 : 1));
        setOrderList({
          MOrder: datas,
        });
      })
      .catch((err) => console.log(err.message));
  }, [crntUser]);

  const handleOrder = async (e) => {
    e.preventDefault();

    // console.log(orderList);
    setOrder(true);

    setNotification(false);
    setSeting(false);
  };

  const handleNotification = (e) => {
    e.preventDefault();
    setOrder(false);

    setNotification(true);
    setSeting(false);
  };
  const handleSetting = (e) => {
    e.preventDefault();

    setOrder(false);

    setNotification(false);
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
          .put(`http://localhost:8080/api/user/`, {
            id,
            username: update.username,
            password: update.password,
          })
          .then((res) => {
            setSuccess(true);
            myStorage.removeItem("email");
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
  const handleDeleteOrder = async (e, id) => {
    e.preventDefault();
    try {
      await axios
        .delete(`http://localhost:8080/api/order/` + id)
        .then((res) => res);
    } catch (err) {
      console.log(err);
    }
  };
  const acceptOrder = orderList.MOrder.filter((item) => item.status === true);
  // console.log(acceptOrder);
  return (
    <div className="container h-100">
      <div className="row">
        <div className="col-md-3 leftSide">
          <div
            className="head"
            style={{ padding: "15px 0", borderBottom: "1px solid #000" }}
          >
            <h3>{user.username}</h3>
            <h5>Email:{user.email}</h5>
            <h5>Phone no:+880{user.phone}</h5>
          </div>

          <div className="userList">
            <li onClick={handleOrder}>Order</li>
            <li onClick={handleNotification}>Acceped Order</li>
            <li onClick={handleSetting}>Setting</li>
          </div>
        </div>
        <div className="col-md-9 rightSide mt-5">
          {order && (
            <div>
              <h2>Your order</h2>
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
                  <h5>Shop name: {item.shopname}</h5>
                  <h5>Order Id: {item._id}</h5>
                  <h5>Mechanic Name: {item.mechanicUsername}</h5>
                  <h5>Mechanic Email: {item.mechanicEmail}</h5>
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
                  {!item.status && (
                    <>
                      <button onClick={(e) => handleDeleteOrder(e, item._id)}>
                        Delete
                      </button>
                    </>
                  )}
                  {item.status && (
                    <>
                      <p
                        style={{
                          color: "#fff",
                          backgroundColor: "green",
                          border: "1px solid red",
                          padding: "3px 5px",
                        }}
                      >
                        Order accepted
                      </p>
                    </>
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
                  <h5>Mechanic Email: {item.mechanicEmail}</h5>
                  <h5>
                    Mechanic Phone No:{" "}
                    <a href={`+88${item.mechanicPhone}`}>
                      +880{item.mechanicPhone}
                    </a>
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
          )}
        </div>
      </div>
    </div>
  );
};
export default UserAccount;
