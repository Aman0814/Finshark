
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useAuth } from "../../Context/AuthContext";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

const validation = Yup.object().shape({
  email: Yup.string()
    .email("Please enter a valid email")
    .required("Email is required"),
  userName: Yup.string().required("Username is required"),
  password: Yup.string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters")
    .matches(/[a-z]/, {
      message: "Password must include a lowercase letter",
      excludeEmptyString: true,
    })
    .matches(/[A-Z]/, {
      message: "Password must include an uppercase letter",
      excludeEmptyString: true,
    })
    .matches(/[0-9]/, {
      message: "Password must include a number",
      excludeEmptyString: true,
    })
    .matches(/[^a-zA-Z0-9]/, {
      message: "Password must include a symbol",
      excludeEmptyString: true,
    }),
});

const RegisterPage = () => {
  const { registerUser } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(validation),
  });

  const handleRegister = (form) => {
    registerUser(form.email, form.userName, form.password);
  };

  return (
    <section className="min-h-[calc(100vh-80px)] bg-slate-50 px-6 py-12">
      <div className="mx-auto flex max-w-md flex-col items-center justify-center">
        <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <div className="space-y-6 p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-slate-950">
              Create your account
            </h1>

            <form
              className="space-y-4 md:space-y-6"
              onSubmit={handleSubmit(handleRegister)}
            >
              <div>
                <label
                  htmlFor="email"
                  className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                  Email
                </label>

                <input
                  type="email"
                  id="email"
                  className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  placeholder="Email"
                  {...register("email")}
                />

                {errors.email && (
                  <p className="mt-2 text-sm font-medium text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="username"
                  className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                  Username
                </label>

                <input
                  type="text"
                  id="username"
                  className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  placeholder="Username"
                  {...register("userName")}
                />

                {errors.userName && (
                  <p className="mt-2 text-sm font-medium text-red-600">{errors.userName.message}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                  Password
                </label>

                <input
                  type="password"
                  id="password"
                  placeholder="••••••••"
                  className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  {...register("password")}
                />

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Use at least 6 characters with uppercase and lowercase
                  letters, a number, and a symbol.
                </p>

                {errors.password && (
                  <p className="mt-2 text-sm font-medium text-red-600">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full text-white bg-lightGreen hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
              >
                Sign up
              </button>

              <p className="text-sm font-light text-gray-500 dark:text-gray-400">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-medium text-primary-600 hover:underline dark:text-primary-500"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RegisterPage;
