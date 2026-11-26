import Home from "./Pages/Home/Home.jsx";
import Topbar from "./Component/Topbar/Topbar.jsx";
import Sidebar from "./Component/Sidebar/Sidebar.jsx";
import { Routes, Route } from "react-router-dom";
import User from "./Pages/UserList/user.jsx";
import UpdateUser from "./Component/updateUser/updateUser.js";
import Mechanic from "./Pages/MechanicList/mechanic.js";
import UpdateMechanic from "./Component/UpdateMechanic/UpdateMechanic.js";
import MechanicRegister from "./Component/MechanicRegistration/MechanicRegistration.jsx";
import UserRegistration from "./Component/UserRegistration/UserRegistration.jsx";
import Order from "./Component/Order/Order.jsx";
import Email from "./Component/Emailnfo/email.jsx";

import React from "react";

export default function PageRoute() {
  return (
    <div>
      <Topbar />
      <div className="containerf">
        <Sidebar />
        <Routes>
          <Route exact path="/home" element={<Home />} />
          <Route exact path="/users" element={<User />} />
          <Route exact path="/users/:id" element={<UpdateUser />} />
          <Route exact path="/mechanics" element={<Mechanic />} />
          <Route exact path="/mechanics/:id" element={<UpdateMechanic />} />
          <Route exact path="/createMechanic" element={<MechanicRegister />} />
          <Route exact path="/createUser" element={<UserRegistration />} />
          <Route exact path="/orders" element={<Order />} />
          <Route exact path="/messages" element={<Email />} />
        </Routes>
      </div>
    </div>
  );
}
