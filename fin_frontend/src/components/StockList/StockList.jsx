import { Link } from "react-router-dom";

const StockList = ({
  stocks,
  pageNumber,
  hasMore,
  isLoading,
  error,
  onPageChange,
}) => (
  <section className="mx-auto my-8 max-w-6xl px-6" aria-labelledby="stock-list-heading">
    <h2
      id="stock-list-heading"
      className="mb-4 text-center text-3xl font-semibold"
    >
      Stock List
    </h2>

    {isLoading ? (
      <p role="status" className="text-center">
        Loading stocks...
      </p>
    ) : error ? (
      <p role="alert" className="text-center text-red-700">
        {error}
      </p>
    ) : (
      <>
        {stocks.length === 0 ? (
          <p className="text-center">No stocks on this page.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="p-3 text-left">Symbol</th>
                  <th scope="col" className="p-3 text-left">Company</th>
                  <th scope="col" className="p-3 text-left">Price</th>
                  <th scope="col" className="p-3 text-left">Industry</th>
                  <th scope="col" className="p-3 text-left">Market cap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stocks.map((stock) => (
                  <tr key={stock.id}>
                    <td className="p-3 font-semibold">
                      <Link
                        to={`/company/${stock.symbol}/company-profile`}
                        className="text-blue-700 hover:underline"
                      >
                        {stock.symbol}
                      </Link>
                    </td>
                    <td className="p-3">{stock.companyName}</td>
                    <td className="p-3">{Number(stock.purchase).toFixed(2)}</td>
                    <td className="p-3">
                      {stock.industry && stock.industry !== "Unknown"
                        ? stock.industry
                        : "-"}
                    </td>
                    <td className="p-3">
                      {Number(stock.marketCap) > 0
                        ? Number(stock.marketCap).toLocaleString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            type="button"
            disabled={pageNumber <= 1 || isLoading}
            onClick={() => onPageChange(pageNumber - 1)}
            className="rounded bg-darkBlue px-4 py-2 text-white disabled:opacity-50"
          >
            Previous
          </button>
          <span>Page {pageNumber}</span>
          <button
            type="button"
            disabled={!hasMore || isLoading}
            onClick={() => onPageChange(pageNumber + 1)}
            className="rounded bg-darkBlue px-4 py-2 text-white disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </>
    )}
  </section>
);

export default StockList;
