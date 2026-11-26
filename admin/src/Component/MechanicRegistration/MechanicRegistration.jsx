import { useState } from "react";
import { BsXLg, BsGeoAltFill } from "react-icons/bs";
import axios from "axios";
import { Card, CardTitle, CardText } from "reactstrap";
import "./MechanicRegistration.css";
const MechanicRegister = () => {
  const [success, setSuccess] = useState(false);
  const [failure, setFailure] = useState(false);
  const [services, setServices] = useState([]);
  const [getLatitude, setGetLatitude] = useState();
  const [getLongitude, setGetLongitude] = useState();
  const [toggle, setToggle] = useState(false);
  const [register, setRegister] = useState({
    username: "",
    email: "",
    password: "",
    shopname: "",
    latitude: "",
    longitude: "",
  });

  const [service, setService] = useState({
    serviceName: "",
    price: "",
  });
  const handleInput = (e) => {
    const { name, value } = e.target;
    setRegister({
      ...register,
      [name]: value,
    });
  };
  const handleServiceInput = (e) => {
    const { name, value } = e.target;
    setService({
      ...service,
      [name]: value,
    });
    // console.log(service);
  };
  const handleService = (e) => {
    e.preventDefault();
    setServices((services) => [...services, service]);
    setService({
      serviceName: "",
      price: "",
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { username, email, password, shopname, latitude, longitude } =
      register;
    console.log(services);
    try {
      if (username && email && password && shopname && latitude && longitude) {
        await axios
          .post("http://localhost:8080/api/mechanic", {
            username: register.username,
            email: register.email,
            password: register.password,
            shopname: register.shopname,
            latitude: register.latitude,
            longitude: register.longitude,
            services: [...services],
          })
          .then((res) => console.log(res));
        setFailure(false);
        setSuccess(true);
      } else {
        setSuccess(false);
        setFailure(true);
      }
    } catch (err) {
      setSuccess(false);
      setFailure(true);
    }

    setRegister({
      username: "",
      email: "",
      password: "",
      shopname: "",
      latitude: "",
      longitude: "",
    });
    setService({
      serviceName: "",
      price: "",
    });
    setServices([]);
    //navigate("/");
  };
  const deleteServiceItem = (item) => {
    const service = services.filter((items) => items["servicename"] !== item);
    setServices(service);
  };
  const getLocation = (e) => {
    e.preventDefault();
    navigator.geolocation.getCurrentPosition((position) => {
      setGetLatitude(position.coords.latitude);
      setGetLongitude(position.coords.longitude);
    });
    setToggle(true);
  };
  const toggleButton = () => {
    setToggle(false);
  };
  return (
    <div className="Containerf">
      <div className="MechanicRegister">
        <div className="heading">
          <h2>Mechanic Registration</h2>
        </div>
        <button className="btn mechaLocation" onClick={getLocation}>
          <BsGeoAltFill
            style={{
              color: "red",
              fontSize: "12px",
              marginRight: "4px",
              top: "3%",
            }}
          />
          Get Location
        </button>
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6 leftSide">
              <input
                type="text"
                placeholder="Username"
                name="username"
                value={register.username}
                onChange={handleInput}
                required
              />
              <input
                type="text"
                placeholder="Email"
                name="email"
                value={register.email}
                onChange={handleInput}
                required
              />
              <input
                type="password"
                placeholder="Password"
                name="password"
                value={register.password}
                onChange={handleInput}
                required
              />
              <input
                type="text"
                placeholder="Shop Name"
                name="shopname"
                value={register.shopname}
                onChange={handleInput}
                required
              />
              <input
                type="number"
                placeholder="Latitude"
                value={register.latitude}
                name="latitude"
                onChange={handleInput}
                required
              />
              <input
                type="number"
                placeholder="Longitude"
                name="longitude"
                value={register.longitude}
                onChange={handleInput}
                required
              />
            </div>
            <div className="col-md-6 rightSide">
              <button
                onClick={handleService}
                style={{
                  marginBottom: "15px",
                  marginTop: "30px",
                  padding: "8px 25px",
                  border: "none",
                  borderRadius: "5px",
                  backgroundColor: "black",
                  color: "#fff",
                  fontSize: "14px",
                }}
              >
                Add Service
              </button>
              <div className="container" style={{ display: "block" }}>
                <div className="row">
                  <div className="col-8">
                    <input
                      type="text"
                      style={{ width: "100%" }}
                      placeholder="Service Name"
                      name="serviceName"
                      value={service.serviceName}
                      onChange={handleServiceInput}
                    />
                  </div>
                  <div className="col-4">
                    <input
                      type="text"
                      style={{ width: "100%" }}
                      name="price"
                      value={service.price}
                      placeholder="Price"
                      onChange={handleServiceInput}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ margin: "20px auto", padding: "10px 0px" }}>
            <table className="table table-bordered table-hover">
              <thead style={{ backgroundColor: "black", color: "#fff" }}>
                <tr>
                  <td>ServiceName</td>
                  <td>price</td>
                  <td style={{ width: "20px" }}>#</td>
                </tr>
              </thead>
              <tbody className="table-secondary">
                {services.map((item) => (
                  <>
                    <tr>
                      <td>{item["serviceName"]}</td>
                      <td>{item["price"]}</td>
                      <td
                        style={{
                          width: "20px",
                          backgroundColor: "#fff",
                          cursor: "pointer",
                        }}
                        onClick={() => deleteServiceItem(item["servicename"])}
                      >
                        <button
                          style={{
                            color: "red",
                            cursor: "pointer",
                            border: "none",
                            backgroundColor: "#fff",
                          }}
                        >
                          <BsXLg />
                        </button>
                      </td>
                    </tr>
                  </>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="btn"
            style={{
              marginTop: "20px",
              padding: "7px 25px",
              backgroundColor: "#000",
              color: "#fff",
              border: "none",
            }}
          >
            Register
          </button>
          <br />
          {success && (
            <span className="successN">
              Successfully Created Mechanic Account!
            </span>
          )}
          {failure && <span className="failure">Something went wrong!</span>}
        </form>
      </div>
      {toggle && (
        <div className="locationcard">
          <Card body>
            <CardTitle>
              <h4 style={{ fontSize: "1rem", color: "#19011c" }}>
                Your current location
              </h4>
              {!getLatitude && (
                <p style={{ color: "red", fontSize: "12px" }}>
                  Wait it will take some time...
                </p>
              )}
            </CardTitle>
            <span className="toggleButton" onClick={toggleButton}>
              <BsXLg />
            </span>
            <CardText className="text-left">
              <label>Latitude</label>
              <br />
              <input
                type="text"
                value={getLatitude}
                style={{ width: "100%" }}
                disabled
              />
            </CardText>
            <CardText className="text-left">
              <label>Longitude</label>
              <br />
              <input
                type="text"
                style={{ width: "100%" }}
                value={getLongitude}
                disabled
              />
            </CardText>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MechanicRegister;
