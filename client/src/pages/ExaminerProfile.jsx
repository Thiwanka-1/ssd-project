import { useSelector, useDispatch } from 'react-redux';
import { useState, useRef, useEffect } from 'react';
import { getDownloadURL, getStorage, ref, uploadBytesResumable } from 'firebase/storage';
import { app } from '../firebase';
import {
  updateUserStart,
  updateUserSuccess,
  updateUserFailure,
  deleteUserStart,
  deleteUserSuccess,
  deleteUserFailure,
  signOut,
} from '../redux/user/userSlice';
import Sidebar from '../components/Sidebar';
import axios from 'axios';

export default function ExaminerProfile() {
  const dispatch = useDispatch();
  const fileRef = useRef(null);

  // Image states
  const [image, setImage] = useState(undefined);
  const [imagePercent, setImagePercent] = useState(0);
  const [imageError, setImageError] = useState(false);

  // Form states
  const [formData, setFormData] = useState({});
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  // Redux states
  const { currentUser, loading, error } = useSelector((state) => state.user);

  // 1) If an image is selected, upload it
  useEffect(() => {
    if (image) {
      handleFileUpload(image);
    }
  }, [image]);

  // 2) Upload image to Firebase
  const handleFileUpload = (imageFile) => {
    const storage = getStorage(app);
    const fileName = new Date().getTime() + imageFile.name;
    const storageRef = ref(storage, fileName);
    const uploadTask = uploadBytesResumable(storageRef, imageFile);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setImagePercent(Math.round(progress));
      },
      (err) => {
        setImageError(true);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          setFormData((prev) => ({ ...prev, profilePicture: downloadURL }));
        });
      }
    );
  };

  // 3) Validate fields
  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (formData.username && formData.username.length < 8) {
      newErrors.username = 'Username must be at least 8 characters long';
    }
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }
    return newErrors;
  };

  // 4) Handle input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  // 5) Submit updated user data
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setUpdateSuccess(false);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      dispatch(updateUserStart());
      const res = await axios.post(`/api/user/update/${currentUser._id}`, formData, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      });
      const data = res.data;

      if (data.success === false) {
        dispatch(updateUserFailure(data));
        return;
      }

      dispatch(updateUserSuccess(data));
      setUpdateSuccess(true);
    } catch (err) {
      dispatch(updateUserFailure(err));
    }
  };

  // 6) Delete account
  const handleDeleteAccount = async () => {
    try {
      dispatch(deleteUserStart());
      const res = await axios.delete(`/api/user/delete/${currentUser._id}`, {
        withCredentials: true,
      });
      const data = res.data;

      if (data.success === false) {
        dispatch(deleteUserFailure(data));
        return;
      }
      dispatch(deleteUserSuccess(data));
    } catch (err) {
      dispatch(deleteUserFailure(err));
    }
  };

  // 7) Sign out
  const handleSignOut = async () => {
    try {
      await axios.get('/api/auth/signout', { withCredentials: true });
      dispatch(signOut());
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="flex flex-col md:flex-row ">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 md:ml-64 p-6">
        <div className="max-w-2xl mx-auto  p-6">
          <h1 className="text-2xl font-bold text-center mb-6">Examiner Profile</h1>

          {/* Display error or success */}
          {error && (
            <p className="text-red-600 text-center mb-4">Something went wrong!</p>
          )}
          {updateSuccess && (
            <p className="text-green-600 text-center mb-4">
              User updated successfully!
            </p>
          )}

          {/* Profile Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Profile Picture */}
            <div className="flex flex-col items-center">
              <input
                type="file"
                ref={fileRef}
                hidden
                accept="image/*"
                onChange={(e) => setImage(e.target.files[0])}
              />
              <img
                src={formData.profilePicture || currentUser.profilePicture}
                alt="profile"
                className="h-24 w-24 rounded-full object-cover cursor-pointer ring-2 ring-blue-500 ring-offset-2 transition hover:opacity-90"
                onClick={() => fileRef.current.click()}
              />
              <p className="text-sm mt-2">
                {imageError ? (
                  <span className="text-red-700">
                    Error uploading image (max size 2 MB)
                  </span>
                ) : imagePercent > 0 && imagePercent < 100 ? (
                  <span className="text-slate-700">
                    Uploading: {imagePercent}%
                  </span>
                ) : imagePercent === 100 ? (
                  <span className="text-green-700">
                    Image uploaded successfully
                  </span>
                ) : (
                  ''
                )}
              </p>
            </div>

            {/* Examiner ID (read-only) */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Examiner ID
              </label>
              <input
                defaultValue={currentUser.user_id}
                type="text"
                id="examinerId"
                placeholder="Examiner ID"
                className="w-full bg-gray-100 rounded-lg p-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                readOnly
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Username
              </label>
              <input
                defaultValue={currentUser.username}
                type="text"
                id="username"
                placeholder="Username"
                className="w-full bg-gray-100 rounded-lg p-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={handleChange}
              />
              {errors.username && (
                <p className="text-red-500 text-sm mt-1">{errors.username}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Email
              </label>
              <input
                defaultValue={currentUser.email}
                type="email"
                id="email"
                placeholder="Email"
                className="w-full bg-gray-100 rounded-lg p-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={handleChange}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="Enter new password"
                  className="w-full bg-gray-100 rounded-lg p-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-sm text-blue-600"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            {/* Update Button */}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-70"
            >
              {loading ? 'Loading...' : 'Update'}
            </button>
          </form>

          {/* Additional Actions */}
          <div className="flex justify-between items-center mt-8">
            <button
              onClick={handleDeleteAccount}
              className="text-red-600 hover:text-red-800 transition"
            >
              Delete Account
            </button>
            <button
              onClick={handleSignOut}
              className="text-red-600 hover:text-red-800 transition"
            >
              Sign Out
            </button>
          </div>

          {/* Error / Success Messages */}
          {error && (
            <p className="text-red-600 text-center mt-5">
              Something went wrong!
            </p>
          )}
          {updateSuccess && (
            <p className="text-green-700 text-center mt-5">
              User updated successfully!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
