import Carousel from "./carousel/carousel";
import Services from "../Services/Services";
import Accordion from "./Accordion/Accordion";
import Footer from "../Footer/mainFooter/footerIndex";

const Header = () => {
  return (
    <div>
      <Carousel />
      <Services />
      <Accordion />
      <Footer />
    </div>
  );
};

export default Header;
