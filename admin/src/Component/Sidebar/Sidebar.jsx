import React from "react";
import {
  LineStyle,
  TrendingUp,
  PermIdentity,
  Email,
  DirectionsWalk,
} from "@material-ui/icons";
import { Link } from "react-router-dom";
// import CarRepairIcon from "@mui/icons-material/CarRepair";
import "./sidebar.css";
export default function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sidebarWrapper">
        <div className="sidebarMenu">
          <div className="sidebarTitle">Dashboard</div>
          <ul className="sidebarList">
            <li className="sidebarListItem">
              <Link to="/home">
                <LineStyle className="sidebarIcon" />
                Home
              </Link>
            </li>
          </ul>
        </div>
        <div className="sidebarMenu">
          <div className="sidebarTitle">Quick Menu</div>
          <ul className="sidebarList">
            <li className="sidebarListItem">
              <Link to="/users">
                <PermIdentity className="sidebarIcon" />
                Users
              </Link>
            </li>

            <li className="sidebarListItem">
              <Link to="/mechanics">
                <DirectionsWalk className="sidebarIcon" />
                Mechanics
              </Link>
            </li>

            <li className="sidebarListItem">
              <Link to="/orders">
                <TrendingUp className="sidebarIcon" />
                Orders
              </Link>
            </li>
          </ul>
        </div>
        <div className="sidebarMenu">
          <div className="sidebarTitle">Notification</div>
          <ul className="sidebarList">
            <li className="sidebarListItem">
              <Link to="/messages">
                <Email className="sidebarIcon" />
                Messages
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
