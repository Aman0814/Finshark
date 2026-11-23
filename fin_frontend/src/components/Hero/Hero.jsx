
import { Link } from "react-router-dom";
import hero from "./hero.png";

const Hero = () => {
  return (
    <section id="hero" className="overflow-hidden bg-gradient-to-b from-white to-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col-reverse items-center px-6 py-12 md:py-16 lg:flex-row lg:px-10">
        <div className="flex flex-col items-center space-y-7 py-8 text-center lg:w-1/2 lg:items-start lg:text-left">
          <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            Fundamental market intelligence
          </span>
          <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Financial data with no news.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
            Search relevant financial documents without fear mongering and fake
            news.
          </p>
          <div>
            <Link
              to="/search"
              className="inline-flex rounded-xl bg-slate-950 px-7 py-4 text-base font-bold text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-darkBlue"
            >
              Explore the market
            </Link>
          </div>
        </div>
        <div className="w-full max-w-xl lg:w-1/2">
          <img src={hero} alt="Financial data illustration" className="h-auto w-full" />
        </div>
      </div>
    </section>
  );
};

export default Hero;
