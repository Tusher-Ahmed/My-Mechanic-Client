import { useEffect, useState } from "react";
import ReactMapGL, {
  Marker,
  Popup,
  NavigationControl,
  GeolocateControl,
} from "react-map-gl";
import { FaMapMarkerAlt } from "react-icons/fa";
import MechanicPopup from "./mechanicPopup";
import axios from "axios";
const navControlStyle = {
  right: 10,
  bottom: 80,
};
const geolocateControlStyle = {
  right: 10,
  bottom: 40,
};
const GMap = () => {
  const [mechanics, setMechanics] = useState([]);
  const [currentPlaceId, setCurrentPlaceId] = useState(null);
  const [viewport, setViewport] = useState({
    width: "100wh",
    height: "90vh",
    padding: "10px",
    latitude: 23.7808875,
    longitude: 90.2792371,
    zoom: 12,
  });
  //const [showPopup, togglePopup] = useState(true);
  useEffect(() => {
    const getMechanic = async () => {
      try {
        await axios.get(process.env.REACT_APP_URL + `/mechanic`).then((res) => {
          //console.log(res.data);
          setMechanics(res.data);
        });
      } catch (error) {
        console.log(error);
      }
    };
    getMechanic();
  }, []);
  const handleOnClickMarker = (id) => {
    setCurrentPlaceId(id);
  };
  return (
    <div>
      <div>
        <div style={{ marginBottom: "10px" }}>
          <ReactMapGL
            {...viewport}
            mapboxApiAccessToken={process.env.REACT_APP_MAPBOX}
            onViewportChange={(nextViewport) => setViewport(nextViewport)}
            // mapStyle="mapbox://styles/safak/cknndpyfq268f17p53nmpwira"
            mapStyle="mapbox://styles/mapbox/streets-v11"
          >
            {mechanics.map((p) => (
              <>
                <Marker
                  latitude={p.latitude}
                  longitude={p.longitude}
                  offsetLeft={-20}
                  offsetTop={-10}
                >
                  <FaMapMarkerAlt
                    style={{
                      fontSize: viewport.zoom * 2,
                      color: "slateblue",
                      cursor: "pointer",
                    }}
                    onClick={() => handleOnClickMarker(p._id)}
                  />
                </Marker>
                {p._id === currentPlaceId && (
                  <Popup
                    latitude={p.latitude}
                    longitude={p.longitude}
                    closeButton={true}
                    closeOnClick={false}
                    onClose={() => setCurrentPlaceId(null)}
                    anchor="left"
                  >
                    <MechanicPopup
                      id={p._id}
                      username={p.username}
                      email={p.email}
                      shopname={p.shopname}
                    />
                  </Popup>
                )}
              </>
            ))}
            <NavigationControl style={navControlStyle} />
            <GeolocateControl
              style={geolocateControlStyle}
              positionOptions={{ enableHighAccuracy: true }}
              trackUserLocation={true}
              auto
            />
          </ReactMapGL>
        </div>
      </div>
    </div>
  );
};

export default GMap;
