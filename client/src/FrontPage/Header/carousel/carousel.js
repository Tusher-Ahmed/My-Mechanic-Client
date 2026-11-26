import { UncontrolledCarousel } from "reactstrap";
import "./carousel.css";
import s2 from "../../../img/54.png";
import s3 from "../../../img/11.jpg";
import s4 from "../../../img/12.jpg";
const items = [
  {
    src: s2,
    // altText: "Slide 1",
    // caption: "Slide 1",
    // header: "Slide 1 Header",
    key: "1",
  },
  {
    src: s3,
    // altText: "Slide 2",
    // caption: "Slide 2",
    // header: "Slide 2 Header",
    key: "2",
  },
  {
    src: s4,
    // altText: "Slide 3",
    // caption: "Slide 3",
    // header: "Slide 3 Header",
    key: "3",
  },
];

const Carousel = () => <UncontrolledCarousel items={items} />;

export default Carousel;
