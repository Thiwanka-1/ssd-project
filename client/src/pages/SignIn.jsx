import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInFailure, signInStart, signInSuccess } from "../redux/user/userSlice";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";

export default function SignIn() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const { loading, error } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Validate fields
  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    }
    return newErrors;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      dispatch(signInStart());
      const res = await axios.post("/api/auth/signin", formData, {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      });
      const data = res.data;

      if (data.success === false) {
        dispatch(signInFailure(data));
        return;
      }

      // Ensure role is used correctly
      const userRole = data.role || "user";
      dispatch(signInSuccess(data));

      if (userRole === "admin") {
        navigate("/admin-profile");
      } else if (userRole === "examiner") {
        navigate("/profile");
      } else if (userRole === "student") {
        navigate("/student-profile");
      } else {
        console.error("Unknown role:", userRole);
      }
    } catch (error) {
      dispatch(signInFailure(error));
      console.error("Sign In Error:", error);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side: Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-center p-8 bg-gray-100">
        <div className="max-w-md w-full mx-auto">
          <h1 className="text-3xl text-center font-semibold my-7">Sign In</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email Field */}
            <input
              type="email"
              placeholder="Email"
              id="email"
              className="bg-white p-3 rounded-lg border border-gray-300"
              onChange={handleChange}
            />
            {errors.email && <p className="text-red-500">{errors.email}</p>}

            {/* Password Field */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                id="password"
                className="bg-white p-3 rounded-lg border border-gray-300 w-full"
                onChange={handleChange}
              />
              {errors.password && <p className="text-red-500">{errors.password}</p>}

              {/* Toggle Show/Hide Password */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-sm text-blue-600"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {/* Submit Button */}
            <button
              disabled={loading}
              className="bg-blue-600 text-white p-3 rounded-lg uppercase hover:opacity-95 disabled:opacity-80"
            >
              {loading ? "Loading..." : "Sign In"}
            </button>
          </form>

          {/* Error Message */}
          <p className="text-red-700 mt-5">
            {error ? error.message || "Something went wrong!" : ""}
          </p>
        </div>
      </div>

      {/* Right side: Background Image (hidden on small screens if desired) */}
      <div
        className="hidden md:block md:w-1/2 bg-cover bg-center"
        style={{
          backgroundImage: `url("https://img.freepik.com/free-photo/business-team-meeting_23-2151937269.jpg?t=st=1742725718~exp=1742729318~hmac=3bbe884517684eba1bb49150c2aa751e0936d430d4f4428c7d77d10b36eb27ee&w=740")`,
        }}
      />
    </div>
  );
}
