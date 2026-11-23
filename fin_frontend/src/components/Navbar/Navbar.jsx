
import { Link } from "react-router-dom";
import logo from "./logo.png";
import "./Navbar.css";
import { useAuth } from "../../Context/AuthContext";
import { useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";

const Navbar = () => {
  const { isLoggedIn, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-10">
          <Link to="/" aria-label="FINSTOCKS home" onClick={() => setMenuOpen(false)}>
            <img src={logo} alt="FINSTOCKS" className="h-10 w-auto" />
          </Link>
          <Link to="/search" className="hidden text-sm font-semibold text-slate-700 transition hover:text-darkBlue lg:block">
            Explore stocks
          </Link>
        </div>

        <div className="hidden items-center gap-5 md:flex">
          {isLoggedIn() ? (
            <>
              <span className="text-sm font-medium text-slate-600">Hi, {user?.userName}</span>
              <button type="button" onClick={logout} className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-darkBlue">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-semibold text-slate-700 hover:text-darkBlue">Login</Link>
              <Link to="/register" className="rounded-lg bg-lightGreen px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-95">
                Sign up
              </Link>
            </>
          )}
        </div>

        <button type="button" className="rounded-md p-2 text-slate-700 md:hidden" aria-expanded={menuOpen} aria-label="Toggle navigation" onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-slate-100 bg-white px-6 py-4 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-3">
            <Link to="/search" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50">Explore stocks</Link>
            {isLoggedIn() ? (
              <button type="button" onClick={() => { setMenuOpen(false); logout(); }} className="rounded-lg bg-slate-900 px-4 py-2.5 text-left font-semibold text-white">Logout</button>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50">Login</Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} className="rounded-lg bg-lightGreen px-4 py-2.5 font-semibold text-slate-950">Sign up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
