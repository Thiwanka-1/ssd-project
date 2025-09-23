import { useState } from "react";
import axios from "axios";
import { EyeIcon, EyeOffIcon, CheckCircleIcon } from "lucide-react";

const AddStudent = () => {
  // FORM DATA
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    department: "",
  });

  // Field errors => { name: "", email: "", password: "", phone: "", department: "" }
  const [errors, setErrors] = useState({});
  // Server error for backend issues
  const [serverError, setServerError] = useState("");
  // For toggling password visibility
  const [passwordVisible, setPasswordVisible] = useState(false);
  // Success popup
  const [successPopup, setSuccessPopup] = useState(false);
  const [newStudentId, setNewStudentId] = useState("");

  // 1) Handle input changes with immediate restrictions
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Restrict certain inputs
    if (name === "name" || name === "department") {
      // Letters & spaces only
      if (!/^[a-zA-Z\s]*$/.test(value)) return;
    }

    if (name === "phone") {
      // Up to 10 digits only
      if (!/^\d{0,10}$/.test(value)) return;
    }

    // Basic updates
    setFormData({ ...formData, [name]: value });
  };

  // 2) Validate onBlur => show error immediately after user leaves field
  const handleBlur = (e) => {
    const { name, value } = e.target;
    let fieldError = "";

    switch (name) {
      case "name":
        if (!value.trim()) {
          fieldError = "Name is required.";
        } else if (value.trim().length < 2) {
          fieldError = "Name must be at least 2 characters.";
        }
        break;

      case "email":
        if (!value.trim()) {
          fieldError = "Email is required.";
        } else {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            fieldError = "Please enter a valid email.";
          }
        }
        break;

      case "password":
        if (!value.trim()) {
          fieldError = "Password is required.";
        } else if (value.length < 8) {
          fieldError = "Password must be at least 8 characters.";
        }
        break;

      case "phone":
        if (!value.trim()) {
          fieldError = "Phone number is required.";
        } else if (value.length < 10) {
          fieldError = "Phone number must be 10 digits.";
        }
        break;

      case "department":
        if (!value.trim()) {
          fieldError = "Department is required.";
        }
        break;

      default:
        break;
    }

    // Update errors state
    setErrors((prev) => ({ ...prev, [name]: fieldError }));
  };

  // 3) Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    // Final check if any field is still invalid
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
      setServerError("Phone number must be at least 10 digits.");
      return;
    }
    if (formData.password.length < 8) {
      setServerError("Password must be at least 8 characters.");
      return;
    }

    // If any error messages in 'errors' state => stop
    const hasError = Object.values(errors).some((err) => err !== "");
    if (hasError) {
      setServerError("Please fix the field errors before submitting.");
      return;
    }

    try {
      const res = await axios.post("/api/students/add", formData, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });
      setNewStudentId(res.data.student_id);
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
      setServerError(error.response?.data?.message || "Error adding student.");
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
          Add Student
        </h2>

        {/* Server error */}
        {serverError && (
          <p className="text-red-500 text-center mb-4">{serverError}</p>
        )}

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
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
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
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
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
                {passwordVisible ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
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
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
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
            {errors.department && (
              <p className="text-red-500 text-sm mt-1">{errors.department}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-300 text-lg font-semibold"
          >
            Add Student
          </button>
        </form>
      </div>

      {/* Success Popup */}
      {successPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white rounded-xl p-6 text-center shadow-lg w-96">
            <CheckCircleIcon size={50} className="text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-800">
              Student Added Successfully
            </h3>
            <p className="text-gray-600 mt-2">
              Student ID:{" "}
              <span className="font-bold text-gray-900">{newStudentId}</span>
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

export default AddStudent;
