import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function UpdateStudent() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch existing student data
  useEffect(() => {
    axios.get(`/api/students/get-std/${id}`)
      .then(res => {
        setFormData({
          name: res.data.name || "",
          email: res.data.email || "",
          phone: res.data.phone || "",
          department: res.data.department || "",
          password: "", // never prefill
        });
      })
      .catch(console.error);
  }, [id]);

  // Field‐by‐field validation logic
  const validateField = (name) => {
    const value = formData[name].trim();
    let message = "";

    switch (name) {
      case "name":
        if (!value) message = "Name is required.";
        else if (!/^[A-Za-z\s]+$/.test(value)) message = "Letters and spaces only.";
        break;
      case "email":
        if (!value) message = "Email is required.";
        else if (!/\S+@\S+\.\S+/.test(value)) message = "Invalid email.";
        break;
      case "phone":
        if (!/^\d{10}$/.test(value)) message = "Phone must be 10 digits.";
        break;
      case "department":
        if (!value) message = "Please select a department.";
        break;
      case "password":
        if (value && value.length < 6) message = "Min 6 characters.";
        break;
      default:
    }

    setErrors(prev => ({ ...prev, [name]: message }));
  };

  // Unified onChange, filters name & phone
  const handleChange = (e) => {
    const { name, value } = e.target;
    // filter name
    if (name === "name" && !/^[A-Za-z\s]*$/.test(value)) return;
    // filter phone digits only, max 10
    if (name === "phone" && !/^\d{0,10}$/.test(value)) return;

    setFormData(prev => ({ ...prev, [name]: value }));
    // live‐remove error if fixed
    if (errors[name]) validateField(name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // validate all
    ["name","email","phone","department","password"].forEach(validateField);
    if (Object.values(errors).some(msg => msg)) return;

    setLoading(true);
    try {
      await axios.put(`/api/students/update-std/${id}`, formData);
      alert("Student updated successfully!");
      navigate("/admin-std-view");
    } catch (err) {
      console.error(err);
      alert("Update failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow mt-10">
      <h2 className="text-3xl font-bold text-center mb-8 text-blue-700">
        Update Student
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-gray-700 mb-1">Name</label>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            onBlur={() => validateField("name")}
            className={`w-full p-3 border rounded-md focus:outline-none ${
              errors.name ? "border-red-500" : "focus:ring-2 focus:ring-blue-400"
            }`}
            placeholder="Letters & spaces only"
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="block text-gray-700 mb-1">Email</label>
          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={() => validateField("email")}
            className={`w-full p-3 border rounded-md focus:outline-none ${
              errors.email ? "border-red-500" : "focus:ring-2 focus:ring-blue-400"
            }`}
            placeholder="you@example.com"
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-gray-700 mb-1">Phone</label>
          <input
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            onBlur={() => validateField("phone")}
            className={`w-full p-3 border rounded-md focus:outline-none ${
              errors.phone ? "border-red-500" : "focus:ring-2 focus:ring-blue-400"
            }`}
            placeholder="10 digits"
            inputMode="numeric"
          />
          {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
        </div>

        {/* Department */}
        <div>
          <label className="block text-gray-700 mb-1">Department</label>
          <select
            name="department"
            value={formData.department}
            onChange={handleChange}
            onBlur={() => validateField("department")}
            className={`w-full p-3 border rounded-md focus:outline-none ${
              errors.department ? "border-red-500" : "focus:ring-2 focus:ring-blue-400"
            }`}
          >
            <option value="">Select Department</option>
            <option value="IM">IM</option>
            <option value="IT">IT</option>
            <option value="ISC">ISC</option>
            <option value="SE">SE</option>
          </select>
          {errors.department && (
            <p className="text-red-500 text-sm mt-1">{errors.department}</p>
          )}
        </div>

        {/* Password (optional) */}
        <div>
          <label className="block text-gray-700 mb-1">New Password (optional)</label>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              onBlur={() => validateField("password")}
              className={`w-full p-3 border rounded-md focus:outline-none ${
                errors.password ? "border-red-500" : "focus:ring-2 focus:ring-blue-400"
              } pr-10`}
              placeholder="Min 6 chars"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute inset-y-0 right-3 text-gray-600"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md font-semibold transition disabled:opacity-70"
        >
          {loading ? "Updating..." : "Update Student"}
        </button>
      </form>
    </div>
  );
}
