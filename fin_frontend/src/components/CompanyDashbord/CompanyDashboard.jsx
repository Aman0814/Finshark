
import { Outlet } from "react-router-dom";

const CompanyDashboard = ({ children, ticker }) => {
  return (
    <div className="min-w-0 flex-1 bg-slate-50">
      <div className="relative py-8">
        <div className="px-4 md:px-6 mx-auto w-full">
          <div>
            <div className="flex flex-wrap">
              {children}
            </div>

            <div className="flex flex-wrap">
              <Outlet context={ticker} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;
