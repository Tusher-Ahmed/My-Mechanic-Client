// Request validation schemas (Zod). Every route validates its body / params / query with these
// before touching the database. Unknown fields are stripped, types are enforced, lengths capped.
import { z } from "zod";
import { VEHICLE_TYPES } from "../models/vehicle.js";
import { ORDER_STATUSES } from "../models/Order.js";

/* ---------- building blocks ---------- */
const emptyToUndefined = (v) => (v === "" || v === null ? undefined : v);
const trimmed = (min, max, label) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(min, min <= 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

export const objectId = (label = "id") => z.string({ error: `Invalid ${label}` }).regex(/^[a-f\d]{24}$/i, `Invalid ${label}`);

export const email = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .max(254, "Email is too long")
  .pipe(z.email("Please enter a valid email"));

export const phone = z
  .string({ error: "Phone number is required" })
  .trim()
  .regex(/^\+?[0-9\s-]{7,20}$/, "Please enter a valid phone number");

/** 8–72 chars (bcrypt only uses the first 72 bytes), at least one letter and one number. */
export const password = z
  .string({ error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

const loginPassword = z.string({ error: "Password is required" }).min(1, "Password is required").max(200);

const name = trimmed(3, 50, "Name");
const nid = z.string({ error: "NID number is required" }).trim().regex(/^[0-9]{10,17}$/, "NID must be 10 to 17 digits");
const shopname = trimmed(3, 100, "Shop name");
const tradeLicense = z
  .string({ error: "Trade licence number is required" })
  .trim()
  .min(5, "Trade licence number looks too short")
  .max(40, "Trade licence number is too long")
  .regex(/^[A-Za-z0-9][A-Za-z0-9/\- ]*$/, "Trade licence number can contain letters, digits, / and -");
const address = z.preprocess(emptyToUndefined, z.string().trim().max(200, "Address is too long").optional());
const latitude = z.coerce.number({ error: "Latitude must be a number" }).min(-90).max(90);
const longitude = z.coerce.number({ error: "Longitude must be a number" }).min(-180).max(180);

const service = z.object({
  _id: objectId("service id").optional(),
  serviceName: trimmed(1, 80, "Service name"),
  price: z.coerce.number({ error: "Price must be a number" }).min(0, "Price can't be negative").max(10_000_000, "Price is too high"),
});
const services = z.array(service).max(50, "At most 50 services");

const vehicleTypes = z
  .array(z.enum(VEHICLE_TYPES, { error: "Invalid car type" }))
  .min(1, "Select at least one car type you service")
  .max(VEHICLE_TYPES.length)
  .transform((list) => [...new Set(list)]);

export const vehicle = z.object(
  {
    type: z.enum(VEHICLE_TYPES, { error: "Choose a valid car type" }),
    make: trimmed(1, 40, "Car make"),
    model: z
      .string({ error: "Car model is required (e.g. Axio)" })
      .trim()
      .min(1, "Car model is required (e.g. Axio)")
      .max(60, "Car model is too long"),
    year: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({ error: "Year must be a number" })
        .int()
        .min(1960, "Year looks too old")
        .max(new Date().getFullYear() + 1, "Year can't be in the future")
        .optional()
    ),
    plate: z.preprocess(emptyToUndefined, z.string().trim().max(24, "Number plate is too long").optional()),
  },
  { error: "Tell us which car needs service" }
);
const vehicles = z.array(vehicle).max(5, "You can save up to 5 cars");

const inspectionFee = z.coerce
  .number({ error: "Inspection fee is required – what you charge to find an unknown problem" })
  .min(0, "Inspection fee can't be negative")
  .max(100_000, "Inspection fee is too high");

const travelPricing = z.object({
  base: z.coerce.number().min(0, "Base charge can't be negative").max(100_000),
  perKm: z.coerce.number().min(0, "Per-km charge can't be negative").max(10_000),
  freeWithinKm: z.coerce.number().min(0).max(100),
  maxDistanceKm: z.coerce.number().min(1, "Service radius must be at least 1 km").max(500),
});

/* ---------- params / query ---------- */
export const idParams = z.object({ id: objectId() });
export const roleParams = z.object({ role: z.enum(["user", "mechanic", "admin"], { error: "Not found" }) });
export const registerRoleParams = z.object({ role: z.enum(["user", "mechanic"], { error: "Not found" }) });

export const mechanicsQuery = z.object({
  q: z.string().trim().max(80, "Search text is too long").optional(),
  vehicleType: z.string().max(40).optional(), // unknown values are ignored by the route
});
export const ordersQuery = z.object({ status: z.string().max(20).optional() });

/* ---------- auth ---------- */
export const login = z.object({ email, password: loginPassword });

export const registerUser = z.object({ username: name, email, phone, password });
export const registerMechanic = z.object({
  tradeLicense,
  inspectionFee,
  username: name,
  email,
  phone,
  password,
  nid,
  shopname,
  address,
  latitude,
  longitude,
  services: services.optional(),
  vehicleTypes: vehicleTypes.optional(),
  travelPricing: travelPricing.optional(),
});

const passwordChange = {
  currentPassword: z.string().max(200).optional(),
  newPassword: password.optional(),
};
export const updateMe = {
  user: z.object({ username: name.optional(), phone: phone.optional(), vehicles: vehicles.optional(), ...passwordChange }),
  mechanic: z.object({
    tradeLicense: tradeLicense.optional(),
    inspectionFee: inspectionFee.optional(),
    username: name.optional(),
    phone: phone.optional(),
    shopname: shopname.optional(),
    address,
    latitude: latitude.optional(),
    longitude: longitude.optional(),
    services: services.optional(),
    vehicleTypes: vehicleTypes.optional(),
    travelPricing: travelPricing.optional(),
    ...passwordChange,
  }),
  admin: z.object({ username: name.optional(), ...passwordChange }),
};

/* ---------- orders / messages / notifications ---------- */
const geoPoint = z.object({
  latitude: z.number({ error: "Latitude must be a number" }).min(-90).max(90),
  longitude: z.number({ error: "Longitude must be a number" }).min(-180).max(180),
  accuracy: z.number().min(0).max(100_000).optional(),
});

/** Customer live location update: either a position, or { share: false } to stop sharing. */
export const locationUpdate = z.union([
  z.object({ share: z.literal(false) }),
  geoPoint.extend({ share: z.literal(true).optional() }),
]);

export const createOrder = z.object({
  serviceMode: z.enum(["home", "garage"]).optional(),
  shareLocation: z.boolean().optional(),
  location: geoPoint.optional(),
  mechanicId: objectId("shop"),
  serviceIds: z.array(objectId("service")).max(50).default([]),
  inspection: z.boolean().optional(),
  followUpOf: objectId("order").optional(),
  vehicle,
  saveVehicle: z.boolean().optional(),
  note: z.preprocess(emptyToUndefined, z.string().trim().max(500, "Note is too long (max 500 characters)").optional()),
});
export const findings = z.object({
  note: z.string().trim().min(3, "Write what you found (at least a few words)").max(1000, "Findings are too long"),
  serviceIds: z.array(objectId("service")).max(50).default([]),
});

export const orderStatus = z.object({
  findings: findings.optional(),
  status: z.enum(ORDER_STATUSES, { error: "Invalid status" }),
  reason: z.preprocess(emptyToUndefined, z.string().trim().min(3, "Please give a short reason").max(300, "Reason is too long (max 300 characters)").optional()),
  etaMinutes: z.number().int().min(5, "Arrival time must be at least 5 minutes").max(480, "Arrival time can be at most 8 hours").optional(),
});
export const etaUpdate = z.object({
  etaMinutes: z.number({ error: "Choose an arrival time" }).int().min(5).max(480),
});
export const verifyCode = z.object({ code: z.string({ error: "Enter the 4-digit code" }).trim().regex(/^\d{4}$/, "The code has 4 digits") });

export const contactMessage = z.object({
  email,
  subject: trimmed(1, 150, "Subject"),
  message: trimmed(1, 3000, "Message"),
});

/* ---------- subscriptions ---------- */
export const checkout = z.object({ plan: z.enum(["monthly", "yearly"], { error: "Choose a plan" }) });
export const demoPay = z.object({ outcome: z.enum(["success", "cancel"], { error: "Invalid outcome" }) });
export const tranParams = z.object({ tranId: z.string().regex(/^MMS-[A-Z0-9-]{6,40}$/, "Invalid transaction") });
const planPrice = z.object({
  label: z.string().trim().min(1).max(30),
  days: z.coerce.number().int().min(1).max(730),
  price: z.coerce.number().min(0).max(1_000_000),
  introPrice: z.coerce.number().min(0).max(1_000_000),
});
export const planSettings = z.object({
  plans: z.object({ monthly: planPrice, yearly: planPrice }),
  renewalDiscountPercent: z.coerce.number().min(0).max(90),
});
export const approval = z
  .object({
    status: z.enum(["approved", "rejected"], { error: "Status must be approved or rejected" }),
    reason: z.string().trim().max(300, "Reason is too long").optional(),
  })
  .refine((v) => v.status !== "rejected" || (v.reason?.length ?? 0) >= 3, { message: "Please give a reason for rejecting", path: ["reason"] });

export const grantSubscription = z.object({
  plan: z.enum(["monthly", "yearly"]).optional(),
  endsAt: z.union([z.iso.datetime({ offset: true }), z.null()]),
});

/* ---------- admin ---------- */
export const adminUserCreate = z.object({ username: name, email, phone, password, vehicles: vehicles.optional() });
export const adminUserUpdate = z.object({
  username: name.optional(),
  email: email.optional(),
  phone: phone.optional(),
  vehicles: vehicles.optional(),
  password: z.preprocess(emptyToUndefined, password.optional()),
});
export const adminMechanicCreate = registerMechanic;
export const adminMechanicUpdate = z.object({
  tradeLicense: tradeLicense.optional(),
  inspectionFee: inspectionFee.optional(),
  username: name.optional(),
  email: email.optional(),
  phone: phone.optional(),
  nid: nid.optional(),
  shopname: shopname.optional(),
  address,
  latitude: latitude.optional(),
  longitude: longitude.optional(),
  services: services.optional(),
  vehicleTypes: vehicleTypes.optional(),
  travelPricing: travelPricing.optional(),
  password: z.preprocess(emptyToUndefined, password.optional()),
});
export const adminAdminCreate = z.object({ username: name, email, password });
export const adminAdminUpdate = z.object({
  username: name.optional(),
  email: email.optional(),
  password: z.preprocess(emptyToUndefined, password.optional()),
});
