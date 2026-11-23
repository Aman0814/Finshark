import { Link } from "react-router-dom";
import DeletePortfolio from "../DeletePortfolio/DeletePortfolio";

const CardPortfolio = ({ portfolioValue, onPortfolioDelete }) => {
  return (
    <div className="flex min-h-36 flex-col items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <Link
        to={`/company/${portfolioValue.symbol}/company-profile`}
        className="pt-6 text-xl font-bold"
      >
        {portfolioValue.symbol}
      </Link>

      <DeletePortfolio
        portfolioValue={portfolioValue.symbol}
        onPortfolioDelete={onPortfolioDelete}
      />
    </div>
  );
};

export default CardPortfolio;
