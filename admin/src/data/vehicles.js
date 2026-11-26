// Keep VEHICLE_TYPES in sync with server/src/models/vehicle.js
export const VEHICLE_TYPES = ["Sedan", "Hatchback", "SUV / Jeep", "Microbus / Van", "Pickup"];

/** Popular makes & models in Bangladesh – used as suggestions (free text is still allowed). */
export const MAKES = {
  Toyota: ["Axio", "Allion", "Premio", "Corolla", "Fielder", "Aqua", "Prius", "Yaris", "Noah", "Voxy", "Hiace", "Probox", "Harrier", "C-HR", "Rush", "Prado", "Land Cruiser", "Hilux"],
  Honda: ["Civic", "City", "Grace", "Fit", "Vezel", "HR-V", "CR-V"],
  Nissan: ["Sunny", "Bluebird Sylphy", "Note", "X-Trail", "Patrol", "Navara"],
  Mitsubishi: ["Lancer", "Outlander", "Eclipse Cross", "Pajero", "L200"],
  Suzuki: ["Alto", "Wagon R", "Celerio", "Swift", "Ciaz", "Ertiga", "Vitara"],
  Hyundai: ["Accent", "Elantra", "Creta", "Tucson", "Santa Fe"],
  Kia: ["Picanto", "Rio", "Seltos", "Sportage", "Sorento"],
  Mazda: ["Demio", "Axela", "Atenza", "CX-5"],
  Proton: ["Saga", "Persona", "X70"],
  Tata: ["Nano", "Indica", "Xenon"],
  Mahindra: ["Bolero", "Scorpio", "XUV500"],
  BMW: ["3 Series", "5 Series", "X1", "X5"],
  "Mercedes-Benz": ["C-Class", "E-Class", "GLA"],
  Audi: ["A4", "A6", "Q5"],
  Ford: ["EcoSport", "Ranger"],
};

export const vehicleLabel = (v) => (v ? [`${v.make} ${v.model}`, v.type, v.year, v.plate].filter(Boolean).join(" · ") : "");
export const vehicleKey = (v) => `${v.make}|${v.model}|${v.plate ?? ""}`.toLowerCase();
export const emptyVehicle = { type: "", make: "", model: "", year: "", plate: "" };

/** The visitor's car type from the map filter, remembered in this browser. */
const CAR_TYPE_KEY = "mm_car_type";
export const getPreferredCarType = () => {
  try {
    const t = localStorage.getItem(CAR_TYPE_KEY) || "";
    return VEHICLE_TYPES.includes(t) ? t : "";
  } catch {
    return "";
  }
};
export const setPreferredCarType = (t) => {
  try {
    t ? localStorage.setItem(CAR_TYPE_KEY, t) : localStorage.removeItem(CAR_TYPE_KEY);
  } catch {
    /* storage unavailable – ignore */
  }
};
