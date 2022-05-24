import { Card, CardImg, CardTitle, CardText, CardBody } from "reactstrap";

const ServiceMap = (props) => {
  return (
    <div className="col-md-4 mb-3" key={props.id}>
      <Card>
        <CardImg
          top
          width="100%"
          src={props.img}
          alt="Card image cap"
          className="sImage"
        />
        <CardBody>
          <CardTitle tag="h5">{props.title}</CardTitle>
          <CardText>{props.details}</CardText>
        </CardBody>
      </Card>
    </div>
  );
};
export default ServiceMap;
