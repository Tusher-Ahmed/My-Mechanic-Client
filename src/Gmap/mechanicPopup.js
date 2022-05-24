import { Link } from "react-router-dom";
import { Card, CardBody, CardTitle, CardText } from "reactstrap";
const MechanicPopup = (props) => {
  //console.log(props);
  return (
    <Card
      style={{
        width: "220px",
        height: "220px",
        border: "none",
        background: "none",
      }}
    >
      <CardBody key={props.email}>
        <CardTitle tag="h5">{props.shopname}</CardTitle>
        <CardText>
          name:{props.username}
          email: {props.email}
        </CardText>
        <Link to={`/store/${props.id}`}>Details</Link>
      </CardBody>
    </Card>
  );
};
export default MechanicPopup;
