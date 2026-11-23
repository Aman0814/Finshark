
import Table from "../../components/Table/Table";
import RatioList from "../../components/RatioList/RatioList";
import { TestDataCompany } from "../../components/Table/testData";

const data = TestDataCompany;

const tableConfig = [
  {
    label: "symbol",
    render: (company) => company.symbol,
  },
];

const DesignGuide = () => {
  return (
    <>
      <h1>
        Design guide- This is the design guide for Fin Shark. These are
        reusable components of the app with brief instructions on how to use
        them.
      </h1>

      <RatioList config={tableConfig} data={data} />

      <Table config={tableConfig} data={data} />

      <h3>
        Table - Table takes in a configuration object and company data as
        params. Use the config to style your table.
      </h3>
    </>
  );
};

export default DesignGuide;
