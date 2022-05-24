import { useParams } from "react-router-dom";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { BsX, BsCart4 } from "react-icons/bs";
import { Card, CardTitle, Button } from "reactstrap";
import "./mechanicStore.css";
const MechanicStore = (props) => {
  const { id } = useParams();
  // console.log(id);
  const myStorage = window.localStorage;
  const crntUser = myStorage.getItem("email");
  const [user, setUser] = useState({
    phone: "",
  });
  const [mechanicStore, setMechanicStore] = useState({
    _id: "",
    username: "",
    email: "",
    phone: "",
    shopname: "",
    latitude: "",
    longitude: "",
    services: [],
  });
  const [needService, setNeedService] = useState([]);
  const [toggle, setToggle] = useState(false);
  const [success, setSuccess] = useState(false);
  const [totalprice, setTotalPrice] = useState(null);
  useEffect(() => {
    fetch(`http://localhost:8080/api/user`)
      .then((res) => res.json())
      .then((data) => {
        const user = data.filter((item) => item.email === crntUser);
        setUser({
          phone: user[0].phone,
        });
      })
      .catch((err) => console.log(err.message));
  }, [crntUser]);
  useEffect(() => {
    fetch(`http://localhost:8080/api/mechanic`)
      .then((res) => res.json())
      .then((data) => {
        const mechaStore = data.filter((item) => item._id === id);
        setMechanicStore({
          _id: mechaStore[0]._id,
          username: mechaStore[0].username,
          email: mechaStore[0].email,
          phone: mechaStore[0].phone,
          shopname: mechaStore[0].shopname,
          latitude: mechaStore[0].latitude,
          longitude: mechaStore[0].longitude,
          services: mechaStore[0].services,
        });
      })
      .catch((err) => console.log(err.message));
  }, [id]);

  const handleAddToCart = (id) => {
    const service = mechanicStore.services.filter((item) => item._id === id);
    setNeedService([...needService, service]);
    setTotalPrice(totalprice + service[0]["price"]);
  };
  //console.log(needService);
  const handleCart = (e) => {
    e.preventDefault();
    setToggle(true);
  };

  const handleOrder = async (e, name, email, phone, id, shopname) => {
    e.preventDefault();
    // console.log(needService, "total cost :", totalPrice);

    try {
      if (
        name &&
        email &&
        id &&
        shopname &&
        needService &&
        totalprice &&
        crntUser
      ) {
        await axios
          .post("http://localhost:8080/api/order", {
            mechanicUsername: name,
            mechanicEmail: email,
            mechanicPhone: phone,
            userPhone: user.phone,
            mechanicId: id,
            shopname: shopname,
            services: needService,
            totalPrice: totalprice,
            userEmail: crntUser,
          })
          .then((res) => setSuccess(true));
      } else {
        setSuccess(false);
      }
    } catch (err) {
      setSuccess(false);
    }
    setNeedService([]);
    setTotalPrice(null);
    setToggle(false);
  };
  return (
    <div className="container">
      <div className="head">
        <p onClick={handleCart}>
          <BsCart4 />
          <span
            style={{
              fontSize: "14px",
              color: "red",
              position: "absolute",
              top: "2%",
            }}
          >
            {needService.length}
          </span>
        </p>
        <h2
          style={{
            fontSize: "32px",
            marginBottom: "20px",
            marginTop: "15px",
            padding: "20px",
            textTransform: "uppercase",
          }}
        >
          {mechanicStore.shopname}
        </h2>
        <h6>Mechanic Name: {mechanicStore.username}</h6>
      </div>
      <div className="services" style={{ padding: "40px 0" }}>
        <>
          <table className="table table-secondary">
            <thead className="table-dark">
              <tr>
                <td>Service Name</td>
                <td>Price</td>
                <td>Order now</td>
              </tr>
            </thead>
            <tbody>
              {mechanicStore.services.map((item) => (
                <tr key={item._id}>
                  <td>{item.serviceName}</td>
                  <td>{item.price}</td>
                  <td>
                    {crntUser ? (
                      <button
                        key={item._id}
                        onClick={() => handleAddToCart(item._id)}
                      >
                        Add Service
                      </button>
                    ) : (
                      <button
                        title="Login First"
                        onMouseOver={() => alert("Login first")}
                      >
                        Add Service
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      </div>
      {toggle && (
        <div className="cartCard" style={{ overflow: "hidden" }}>
          <Card body>
            <span className="cardCross" onClick={() => setToggle(false)}>
              <BsX />
            </span>
            <CardTitle>My Cart</CardTitle>

            {needService.map((item) => (
              <div
                className="row"
                key={item._id}
                style={{
                  marginBottom: "8px",
                  borderTop: "1px solid rgb(239 234 234)",
                  width: "auto",
                }}
              >
                <div className="col-6" style={{ textAlign: "left" }}>
                  {item[0]["serviceName"]}
                </div>
                <div className="col-6" style={{ textAlign: "right" }}>
                  {item[0]["price"]}
                </div>
              </div>
            ))}
            <div
              className="totalP"
              style={{
                marginTop: "10px",
                borderTop: "1px solid #000",
                marginBottom: "20px",
              }}
            >
              <div className="row">
                <div className="col-6" style={{ textAlign: "left" }}>
                  Total Price
                </div>
                <div className="col-6" style={{ textAlign: "right" }}>
                  {totalprice}
                </div>
              </div>
            </div>
            {totalprice && (
              <Button
                onClick={(e) =>
                  handleOrder(
                    e,
                    mechanicStore.username,
                    mechanicStore.email,
                    mechanicStore.phone,
                    mechanicStore._id,
                    mechanicStore.shopname
                  )
                }
              >
                Order Now
              </Button>
            )}

            {!crntUser && <Button disabled>Order Now</Button>}
          </Card>
        </div>
      )}
      {success && (
        <p style={{ color: "green", fontSize: "14px", bottom: "10px" }}>
          Order successfully placed!!
        </p>
      )}
    </div>
  );
};

export default MechanicStore;
