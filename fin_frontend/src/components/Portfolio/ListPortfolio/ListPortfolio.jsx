import CardPortfolio from "../CardPortfolio/CardPortfolio";

const ListPortfolio = ({ portfolioValues, onPortfolioDelete }) => {
  return (
    <section id="portfolio">
      <h2 className="mb-3 mt-3 text-3xl font-semibold text-center md:text-4xl">
        My Portfolio
      </h2>

      <div className="mx-auto mb-8 max-w-5xl px-6">
        {portfolioValues.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {portfolioValues.map((portfolioValue) => (
              <CardPortfolio
                key={portfolioValue.symbol}
                portfolioValue={portfolioValue}
                onPortfolioDelete={onPortfolioDelete}
              />
            ))}
          </div>
        ) : (
          <h3 className="mb-3 mt-3 text-xl font-semibold text-center md:text-xl">
            Your portfolio is empty.
          </h3>
        )}
      </div>
    </section>
  );
};

export default ListPortfolio;
