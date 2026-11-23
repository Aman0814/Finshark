
import Card from "../Card/Cart";

const CardList = ({ searchResults, onPortfolioCreate }) => {
  if (!searchResults || searchResults.length === 0) {
    return null;
  }

  return (
    <section
      className="mx-auto mb-10 max-w-5xl px-6"
      aria-label="Search results"
    >
      <div className="space-y-3">
        {searchResults.map((result) => (
          <Card
            id={result.symbol}
            key={result.symbol}
            searchResult={result}
            onPortfolioCreate={onPortfolioCreate}
          />
        ))}
      </div>
    </section>
  );
};

export default CardList;
