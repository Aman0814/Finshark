import { Link } from "react-router-dom";
import "./Cart.css";
import AddPortfolio from "../Portfolio/AddPortfolio/AddPortfolio";

const Cart = ({ id, searchResult, onPortfolioCreate }) => {
  return (
    <div
      className="flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row"
      key={id}
      id={id}
    >
      <Link
        to={`/company/${searchResult.symbol}/company-profile`}
        className="font-bold text-center text-veryDarkViolet md:text-left"
      >
        {searchResult.name} ({searchResult.symbol})
      </Link>

      <p className="text-veryDarkBlue">
        {searchResult.currency}
      </p>

      <p className="font-bold text-veryDarkBlue">
        {searchResult.exchangeShortName} - {searchResult.stockExchange}
      </p>

      <AddPortfolio
        onPortfolioCreate={onPortfolioCreate}
        symbol={searchResult.symbol}
      />
    </div>
  );
};

export default Cart;