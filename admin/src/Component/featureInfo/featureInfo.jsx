import React, { useEffect, useState } from "react";
import { ArrowUpward } from "@material-ui/icons";
import "./featureInfo.css";
export default function FeatureInfo() {
  const [countUser, setCountUser] = useState(0);
  const [countMechanic, setCountMechanic] = useState(0);
  const [countOrder, setCountOrder] = useState(0);

  useEffect(() => {
    fetch("http://localhost:8080/api/user")
      .then((res) => res.json())
      .then((data) => {
        setCountUser(data.length);
      });
  }, []);
  useEffect(() => {
    fetch("http://localhost:8080/api/mechanic")
      .then((res) => res.json())
      .then((data) => {
        setCountMechanic(data.length);
      });
  }, []);
  useEffect(() => {
    fetch("http://localhost:8080/api/order")
      .then((res) => res.json())
      .then((data) => {
        setCountOrder(data.length);
      });
  }, []);
  return (
    <div className="feature">
      <div className="featureItem">
        <h6 className="featureTitle"> Total Users</h6>
        <p>
          {countUser}
          <span className="arrow">
            <ArrowUpward />
          </span>
        </p>
      </div>
      <div className="featureItem">
        <h6 className="featureTitle"> Total Mechanic</h6>
        <p>
          {countMechanic}
          <span className="arrow">
            <ArrowUpward />
          </span>
        </p>
      </div>
      <div className="featureItem">
        <h6 className="featureTitle"> Total Order</h6>
        <p>
          {countOrder}
          <span className="arrow">
            <ArrowUpward />
          </span>
        </p>
      </div>
    </div>
  );
}
