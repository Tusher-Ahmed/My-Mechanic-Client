import React, { useEffect, useState } from "react";
import axios from "axios";
import "./order.css";
export default function Order() {
  const [order, setOrder] = useState([]);
  useEffect(() => {
    fetch("http://localhost:8080/api/order")
      .then((res) => res.json())
      .then((data) => {
        data.sort((a, b) => (a.date > b.date ? -1 : 1));
        setOrder([...data]);
      });
  }, []);
  const handleDelete = async (e, id) => {
    e.preventDefault();
    try {
      await axios
        .delete(`http://localhost:8080/api/order/` + id)
        .then((res) => res);
    } catch (err) {
      console.log(err);
    }
  };
  return (
    <div className="OrderList">
      <table className="table table-bordered">
        <thead style={{ backgroundColor: "#000", color: "#fff" }}>
          <tr>
            <th scope="col">Order Id</th>
            <th scope="col">Shop Name</th>
            <th scope="col">Mechanic Email</th>
            <th scope="col">User Email</th>
            <th scope="col">TotalPrice </th>
            <th scope="col">Date</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {order.map((item) => (
            <tr>
              <td>{item["_id"]}</td>
              <td>{item["shopname"]}</td>
              <td>{item["mechanicEmail"]}</td>
              <td>{item["userEmail"]}</td>
              <td>{item["totalPrice"]} /=</td>
              <td>{item["date"]}</td>
              <td>
                <button
                  className="btnDelete"
                  onClick={(e) => handleDelete(e, item["_id"])}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
