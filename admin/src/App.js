// import { Routes, Route } from "react-router-dom";
import "./app.css";
import AdminLogin from "./Component/AuthAdmin/AuthAdmin.jsx";
import PageRoute from "./pageRoute";
function App() {
  const myStorage = window.localStorage;

  const crntAdmin = myStorage.getItem("Aemail");

  return (
    <div>
      {crntAdmin && <PageRoute />}
      {!crntAdmin && <AdminLogin />}
    </div>
  );
}

export default App;
