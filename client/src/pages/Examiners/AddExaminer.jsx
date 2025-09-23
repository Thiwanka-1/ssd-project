import { useState } from "react";
import axios from "axios";
import { EyeIcon, EyeOffIcon, CheckCircleIcon } from "lucide-react";

const AddExaminer = () => {
  // Form data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    department: "",
  });

  // Field-level errors => { name, email, password, phone, department }
  const [fieldErrors, setFieldErrors] = useState({});
  // Server or backend error
  const [serverError, setServerError] = useState("");

  // For toggling password visibility
  const [passwordVisible, setPasswordVisible] = useState(false);
  // Success popup
  const [successPopup, setSuccessPopup] = useState(false);
  const [examinerId, setExaminerId] = useState("");

  // 1) Restrict certain inputs in real-time
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Restrict letters/spaces for name, department
    if (name === "name" || name === "department") {
      if (!/^[a-zA-Z\s]*$/.test(value)) return;
    }

    // Restrict digits for phone (max 10)
    if (name === "phone") {
      if (!/^\d{0,10}$/.test(value)) return;
    }

    setFormData({ ...formData, [name]: value });
  };

  // 2) Validate each field onBlur => immediate error messages
  const handleBlur = (e) => {
    const { name, value } = e.target;
    let errorMsg = "";

    switch (name) {
      case "name":
        if (!value.trim()) {
          errorMsg = "Name is required.";
        } else if (value.trim().length < 2) {
          errorMsg = "Name must be at least 2 characters.";
        }
        break;

      case "email":
        if (!value.trim()) {
          errorMsg = "Email is required.";
        } else {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errorMsg = "Please enter a valid email.";
          }
        }
        break;

      case "password":
        if (!value.trim()) {
          errorMsg = "Password is required.";
        } else if (value.length < 8) {
          errorMsg = "Password must be at least 8 characters.";
        }
        break;

      case "phone":
        if (!value.trim()) {
          errorMsg = "Phone number is required.";
        } else if (value.length < 10) {
          errorMsg = "Phone number must be 10 digits.";
        }
        break;

      case "department":
        if (!value.trim()) {
          errorMsg = "Department is required.";
        }
        break;

      default:
        break;
    }

    // Update field errors
    setFieldErrors((prev) => ({ ...prev, [name]: errorMsg }));
  };

  // 3) Final form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    // Basic checks for required fields
    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.phone ||
      !formData.department
    ) {
      setServerError("All fields are required.");
      return;
    }
    if (formData.phone.length < 10) {
      setServerError("Phone number must be 10 digits.");
      return;
    }
    if (formData.password.length < 8) {
      setServerError("Password must be at least 8 characters.");
      return;
    }

    // If any existing field errors, stop
    const hasError = Object.values(fieldErrors).some((err) => err !== "");
    if (hasError) {
      setServerError("Please fix the field errors before submitting.");
      return;
    }

    try {
      const res = await axios.post("/api/examiners/add", formData, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });

      // On success
      setExaminerId(res.data.examiner_id);
      setSuccessPopup(true);

      // Reset form
      setFormData({
        name: "",
        email: "",
        password: "",
        phone: "",
        department: "",
      });
    } catch (error) {
      setServerError(error.response?.data?.message || "Error adding examiner.");
    }
  };

  // 4) Close success popup
  const closePopup = () => {
    setSuccessPopup(false);
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Add Examiner
        </h2>

        {/* Server error */}
        {serverError && (
          <p className="text-red-500 text-center mb-4">{serverError}</p>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Name
            </label>
            <input
              type="text"
              name="name"
              placeholder="Enter name"
              className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-400"
              onChange={handleChange}
              onBlur={handleBlur}
              value={formData.name}
            />
            {fieldErrors.name && (
              <p className="text-red-500 text-sm mt-1">{fieldErrors.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              placeholder="Enter email"
              className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-400"
              onChange={handleChange}
              onBlur={handleBlur}
              value={formData.email}
            />
            {fieldErrors.email && (
              <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={passwordVisible ? "text" : "password"}
                name="password"
                placeholder="Min 8 characters"
                className="w-full border rounded-lg px-4 py-3 pr-10 focus:ring-2 focus:ring-blue-400"
                onChange={handleChange}
                onBlur={handleBlur}
                value={formData.password}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-3 flex items-center"
                onClick={() => setPasswordVisible(!passwordVisible)}
              >
                {passwordVisible ? (
                  <EyeOffIcon size={20} />
                ) : (
                  <EyeIcon size={20} />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-red-500 text-sm mt-1">{fieldErrors.password}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Phone
            </label>
            <input
              type="text"
              name="phone"
              placeholder="Enter phone number"
              className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-400"
              onChange={handleChange}
              onBlur={handleBlur}
              value={formData.phone}
            />
            {fieldErrors.phone && (
              <p className="text-red-500 text-sm mt-1">{fieldErrors.phone}</p>
            )}
          </div>

          {/* Department */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Department
            </label>
            <select
              name="department"
              className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-400"
              onChange={handleChange}
              onBlur={handleBlur}
              value={formData.department}
            >
              <option value="" disabled>
                Select department
              </option>
              <option value="IT">IT</option>
              <option value="IM">IM</option>
              <option value="SE">SE</option>
              <option value="ISC">ISC</option>
            </select>
            {fieldErrors.department && (
              <p className="text-red-500 text-sm mt-1">
                {fieldErrors.department}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-300 text-lg font-semibold"
          >
            Add Examiner
          </button>
        </form>
      </div>

      {/* Success Popup */}
      {successPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white rounded-xl p-6 text-center shadow-lg w-96">
            <CheckCircleIcon size={50} className="text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-800">
              Examiner Added Successfully
            </h3>
            <p className="text-gray-600 mt-2">
              Examiner ID:{" "}
              <span className="font-bold text-gray-900">{examinerId}</span>
            </p>
            <button
              onClick={closePopup}
              className="mt-4 bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition duration-300"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddExaminer;
