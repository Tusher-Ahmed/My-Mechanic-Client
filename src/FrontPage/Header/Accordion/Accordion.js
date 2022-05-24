import AccordionDetails from "./AccordionDetails";
import AccordionList from "./AccordionList";
const Accordion = () => {
  let Accord = [...AccordionList];
  const Accordions = Accord.map((item) => (
    <AccordionDetails id={item.id} FAQ={item.FAQ} details={item.details} />
  ));
  return (
    <div style={{ margin: "3rem 0" }}>
      <h1
        style={{
          textTransform: "uppercase",
          fontSize: "1.5rem",
          marginTop: "2rem",
          marginBottom: "2rem",
        }}
      >
        Frequently Asked Question
      </h1>
      {Accordions}
    </div>
  );
};

export default Accordion;
