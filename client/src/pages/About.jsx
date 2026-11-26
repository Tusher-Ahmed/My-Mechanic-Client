import { motion } from "motion/react";
import { Code2, HelpCircle, Users } from "lucide-react";
import author from "../assets/author.webp";
import { Reveal } from "../components/ui";
import { ease, fadeUp, stagger } from "../lib/motion";

const qa = [
  {
    icon: Users,
    q: "Who can use the site?",
    a: '"My Mechanic" is the title of my project. Basically this project is for four wheeler car users and mechanics, where the user can register and visit the site to know the details about car mechanics or garages around him.',
  },
  {
    icon: Code2,
    q: "Which technology did I use to develop the site?",
    a: "To develop the whole website I used React JS, Node JS, Express JS, MongoDB, Mongoose, OpenStreetMap (MapLibre), Tailwind CSS, Motion and other essential technologies.",
  },
  {
    icon: HelpCircle,
    q: "Purpose of the site?",
    a: 'I will tell you a story then you will understand the concept easily. Suppose you are going somewhere, suddenly your car breaks down and you don\'t know the place much and there\'s no one nearby to help you. In this situation what will you do? Your solution is here – go to "My Mechanic", find a mechanic or garage near you with the best prices, solve your problem without any risk with the best mechanic and continue your beautiful journey!',
  },
];

export default function About() {
  return (
    <div className="container-page py-16 lg:py-24">
      <div className="grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, ease }}
          className="relative mx-auto w-full max-w-sm"
        >
          <div className="absolute -inset-4 rotate-3 rounded-[2.5rem] bg-linear-to-br from-brand-300 to-accent-300 opacity-60" />
          <img src={author} alt="Tusher Ahmed" className="relative aspect-[3/4] w-full rounded-[2rem] object-cover shadow-2xl" width="600" height="800" />
        </motion.div>

        <motion.div initial="hidden" animate="show" variants={stagger(0.08)}>
          <motion.span variants={fadeUp} className="eyebrow">
            About
          </motion.span>
          <motion.h1 variants={fadeUp} className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Hi! My name is Tusher Ahmed.
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-4 text-lg text-slate-600">
            Here are some frequently asked questions about this project.
          </motion.p>
        </motion.div>
      </div>

      <div className="mt-16 grid gap-5 md:grid-cols-3">
        {qa.map(({ icon: Icon, q, a }, i) => (
          <Reveal key={q} delay={i * 0.06} className="card p-6 sm:p-8">
            <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <Icon className="size-6" />
            </span>
            <h2 className="mt-5 text-lg font-semibold">{q}</h2>
            <p className="mt-2 leading-relaxed text-slate-600">{a}</p>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
