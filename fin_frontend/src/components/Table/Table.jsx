
const Table = ({ config, data }) => {
  const renderedRows = data.map((company, rowIndex) => {
    const rowKey = `${company.symbol || company.cik || "statement"}-${
      company.date || company.fillingDate || rowIndex
    }`;

    return (
      <tr key={rowKey}>
        {config.map((val, columnIndex) => {
          return (
            <td className="p-3" key={columnIndex}>
              {val.render(company)}
            </td>
          );
        })}
      </tr>
    );
  });

  const renderedHeaders = config.map((configItem, index) => {
    return (
      <th
        className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
        key={index}
      >
        {configItem.label}
      </th>
    );
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>{renderedHeaders}</tr>
        </thead>
        <tbody>{renderedRows}</tbody>
      </table>
    </div>
  );
};

export default Table;
