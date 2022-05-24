import "./App.css";
import { BrowserRouter } from "react-router-dom";
import MainFrontPage from "./FrontPage/mainFrontPage.js";
import Navbar from "./FrontPage/Header/Navbar/NavBar.js";
import { Route } from "react-router-dom";
import GMap from "./Gmap/gmap.js";
import UserAccount from "./FrontPage/UserAccount/UserAccount.js";
import MechanicStore from "./mechanic/MechanicStore";
import MechanicRegister from "./mechanic/AuthMechanic/MechanicRegister";
import MechanicAccount from "./mechanic/mechanicAccount";
import Contact from "./Contact/Contact";
import About from "./About/About";
function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Navbar />
        <>
          <Route exact path="/" render={() => <MainFrontPage />} />
          <Route exact path="/map" render={() => <GMap />} />
          <Route exact path="/userProfile" render={() => <UserAccount />} />
          <Route
            exact
            path="/mechanicProfile"
            render={() => <MechanicAccount />}
          />
          <Route exact path="/store/:id" render={() => <MechanicStore />} />
          <Route
            exact
            path="/mechanicRegister"
            render={() => <MechanicRegister />}
          />
          <Route path="/contact" render={() => <Contact />} />
          <Route path="/about" render={() => <About />} />
        </>
      </BrowserRouter>
    </div>
  );
}

export default App;
