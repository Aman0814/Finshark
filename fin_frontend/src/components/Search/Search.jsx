

const Search = ({
  onSearchSubmit,
  search,
  handleSearchChange,
  isSearching,
}) => {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-darkBlue">Market discovery</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Find a company</h1>
        </div>
        <form
          className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm md:flex-row"
          onSubmit={onSearchSubmit}
        >
          <input
            type="search"
            className="flex-1 p-3 border-2 rounded-lg placeholder-black focus:outline-none"
            id="search-input"
            aria-label="Search companies"
            placeholder="Search companies"
            value={search || ""}
            onChange={handleSearchChange}
          />
          <button
            type="submit"
            disabled={isSearching || !search.trim()}
            className="rounded-lg bg-lightGreen px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </form>
      </div>
    </section>
  );
};

export default Search;
