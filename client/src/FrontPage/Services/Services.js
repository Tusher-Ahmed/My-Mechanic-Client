import React from "react";
import ServiceDB from "./ServiceDB.js";
import ServiceMap from "./ServiceMap.js";
import "./Services.css";
const Services = () => {
  let service = [...ServiceDB];
  let TotalService = service.map((item) => (
    <ServiceMap
      id={item.id}
      img={item.img}
      title={item.title}
      details={item.details}
    />
  ));

  return (
    <div className="container mt-4 mb-4">
      <h2
        className=" mb-4 "
        style={{ textTransform: "uppercase", fontSize: "1.5rem" }}
      >
        Services
      </h2>
      <div className="row">{TotalService}</div>
    </div>
  );
};

export default Services;
