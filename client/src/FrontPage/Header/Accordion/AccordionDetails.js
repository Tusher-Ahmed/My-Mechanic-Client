import { useState } from "react";
import { Collapse, CardBody, Card } from "reactstrap";
import { FaMinus, FaPlus } from "react-icons/fa";
const AccordionDispaly = (props) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isOpen);
  return (
    <div key={props.id} className="container">
      <p
        id="AccodionId"
        type="button"
        onClick={toggle}
        style={{
          marginBottom: "1rem",
          textAlign: "left",
          border: "1px solid #ddd",
          padding: "10px",
          background: "#ddd",
          borderRadius: "5px",
        }}
      >
        <div className="row">
          <div className="col-11">
            <span>{props.FAQ}</span>
          </div>
          {/* <div className="col-1"> */}
          <span style={{ color: "#013e42" }}>
            {isOpen ? <FaPlus /> : <FaMinus />}
            {/* {isOpen ? "^" : "down"} */}
          </span>
          {/* </div> */}
        </div>
      </p>
      <Collapse isOpen={isOpen}>
        <Card
          className="mb-2"
          style={{ background: "#c7eff2", textAlign: "justify" }}
        >
          <CardBody>{props.details}</CardBody>
        </Card>
      </Collapse>
    </div>
  );
};
export default AccordionDispaly;
