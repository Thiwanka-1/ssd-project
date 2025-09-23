import React, { useState, useEffect, } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import { useSelector } from "react-redux";

export default function HomePage() {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { currentUser } = useSelector((state) => state.user);

  // Example handle button click (if user is logged in or not)
  const handleGetStarted = () => {
    if (!currentUser) {
      // If not logged in, navigate to sign-up
      navigate("/sign-up");
    } else {
      navigate("/");
    }
  };

  // Disable pointer events on Swiper if needed (like in your sample)
  useEffect(() => {
    const swiperContainer = document.querySelector('.swiper-container');
    if (swiperContainer) {
      swiperContainer.style.pointerEvents = isDropdownOpen ? 'none' : 'auto';
    }
  }, [isDropdownOpen]);

  return (
    <div className="bg-gray-100">
      {/* Hero / Slideshow Section */}
      <section className="relative h-[70vh] w-full">
        <Swiper
          spaceBetween={30}
          centeredSlides={true}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          modules={[Pagination, Autoplay]}
          className="absolute inset-0 w-full h-full z-0 swiper-container"
        >
          <SwiperSlide>
            <img
              src="https://img.freepik.com/free-photo/business-people-meeting-discussion-corporate-concept_53876-121054.jpg?t=st=1742724779~exp=1742728379~hmac=1541855c46254857ccca5d6d3cf9e788f25923dbb1f939222df971122ecddcd0&w=996"
              alt="Conference Room"
              className="object-cover w-full h-full"
            />
          </SwiperSlide>
          <SwiperSlide>
            <img
              src="https://img.freepik.com/free-photo/bar-graph-statistics-analysis-business-concept_53876-122743.jpg?t=st=1742724802~exp=1742728402~hmac=f9032fad6b4c1b36dd7729d3b3da8ba8596a068b4d671aca00348c496a5dba17&w=996"
              alt="Presentation in progress"
              className="object-cover w-full h-full"
            />
          </SwiperSlide>
          <SwiperSlide>
            <img
              src="https://img.freepik.com/free-photo/aerial-view-business-data-analysis-graph_53876-13390.jpg?t=st=1742724824~exp=1742728424~hmac=2aa0fce366893a6b80a8317cd3a30f5dce53a8aeabfc837359e5df7583ee1c2d&w=996"
              alt="Lecture Hall"
              className="object-cover w-full h-full"
            />
          </SwiperSlide>
          <SwiperSlide>
            <img
              src="https://img.freepik.com/free-photo/long-shot-business-people-meeting_23-2148427153.jpg?t=st=1742724915~exp=1742728515~hmac=fcf0b269baf4c1d217d0642edfc196bfec467aab1c5b12390b0cd1326664ff2e&w=996"
              alt="Lecture Hall 1"
              className="object-cover w-full h-full"
            />
          </SwiperSlide>
        </Swiper>

        {/* Overlay text */}
        <div className="relative z-10 flex flex-col justify-center items-center h-full text-white text-center px-4">
          <h1 className="text-5xl font-extrabold mb-4 drop-shadow-lg">AutoSched</h1>
          <p className="text-xl mb-6 max-w-2xl drop-shadow-lg">
            Streamline your presentation scheduling with automatic conflict checks, rescheduling, and real-time notifications.
          </p>
          <button
            onClick={handleGetStarted}
            className="bg-white text-blue-600 px-8 py-3 rounded-full shadow-md hover:bg-gray-200 transition duration-300 text-lg font-semibold"
          >
            Get Started
          </button>
        </div>

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-40 z-[1]" />
      </section>

      {/* Stats / Highlights Section */}
      <section className="py-16 bg-blue-50">
        <div className="container mx-auto text-center px-4">
          <h2 className="text-4xl font-bold mb-8">Manage Presentations at Scale</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-5xl font-bold text-blue-600">2,500+</h3>
              <p className="text-lg mt-2">Presentations Scheduled</p>
            </div>
            <div>
              <h3 className="text-5xl font-bold text-blue-600">100+</h3>
              <p className="text-lg mt-2">Lecture Halls</p>
            </div>
            <div>
              <h3 className="text-5xl font-bold text-blue-600">99%</h3>
              <p className="text-lg mt-2">Reduced Conflicts</p>
            </div>
            <div>
              <h3 className="text-5xl font-bold text-blue-600">24/7</h3>
              <p className="text-lg mt-2">Smart Rescheduling</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why AutoSched / Features Section */}
      <section className="container mx-auto py-16 px-4">
        <h2 className="text-4xl font-bold text-center mb-10">Why AutoSched?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition duration-300 pb-14 ">
            <img
              src="https://www.attorneyatwork.com/wp-content/uploads/2024/10/checking-conflicts.jpg"
              alt="Automatic Scheduling"
              className="w-full h-48 mx-auto mb-4 rounded-m object-cover"
            />
            <h3 className="text-2xl font-semibold mb-4">Automatic Conflict Checks</h3>
            <p className="text-gray-600">
              Instantly detect overlapping times for venues, examiners, and students to ensure a hassle-free schedule.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition duration-300 pb-14">
            <img
              src="https://www.schooltracs.com/assets/images/cover/reschedule.png"
              alt="Smart Rescheduling"
              className="w-full h-48 mx-auto mb-4 rounded-m object-cover"
            />
            <h3 className="text-2xl font-semibold mb-4">Smart Rescheduling</h3>
            <p className="text-gray-600">
              Need to change a time? Our system suggests the best new slot, automatically checking examiner & venue availability.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition duration-300 pb-14">
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSs6IAqAVqNLkJ-UM9O129QSt-YoQz6Pmp_VA&s"
              alt="Email Notifications"
              className="w-full h-48 mx-auto mb-4 rounded-m object-cover"
            />
            <h3 className="text-2xl font-semibold mb-4">Instant Notifications</h3>
            <p className="text-gray-600">
              Automatically send emails to examiners, students, and administrators when a presentation is created or rescheduled.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-gray-100 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-10">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition duration-300">
              <div className="text-5xl font-bold text-blue-600 mb-4">1</div>
              <h4 className="text-xl font-semibold mb-2">Create a Presentation</h4>
              <p className="text-gray-600">Enter title, date, and choose examiners & students.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition duration-300">
              <div className="text-5xl font-bold text-blue-600 mb-4">2</div>
              <h4 className="text-xl font-semibold mb-2">Auto-Schedule</h4>
              <p className="text-gray-600">Our system checks for conflicts and assigns a venue.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition duration-300">
              <div className="text-5xl font-bold text-blue-600 mb-4">3</div>
              <h4 className="text-xl font-semibold mb-2">Smart Rescheduling</h4>
              <p className="text-gray-600">Need a change? AutoSched finds the next best slot.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition duration-300">
              <div className="text-5xl font-bold text-blue-600 mb-4">4</div>
              <h4 className="text-xl font-semibold mb-2">Email Alerts</h4>
              <p className="text-gray-600">Everyone gets notified—examiners, students, & admins.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-300 text-white py-16 text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold mb-4">Simplify Your Scheduling</h2>
          <p className="text-xl mb-6">
            Let AutoSched handle the complexity, so you can focus on delivering great presentations.
          </p>
          <button
            onClick={handleGetStarted}
            className="bg-white text-blue-600 px-6 py-3 rounded-full font-semibold hover:bg-gray-200 transition duration-300"
          >
            Get Started Now
          </button>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-10">What Our Users Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-lg shadow-lg hover:shadow-xl transition duration-300">
              <p className="text-gray-600 mb-4">
                "AutoSched saved me so much time! No more double-booked venues."
              </p>
              <h4 className="font-semibold text-xl">- Sarah, Lecturer</h4>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg shadow-lg hover:shadow-xl transition duration-300">
              <p className="text-gray-600 mb-4">
                "Rescheduling used to be a nightmare, but now it's just a click away."
              </p>
              <h4 className="font-semibold text-xl">- Michael, Student</h4>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg shadow-lg hover:shadow-xl transition duration-300">
              <p className="text-gray-600 mb-4">
                "Our entire department uses it—makes coordinating presentations a breeze!"
              </p>
              <h4 className="font-semibold text-xl">- Dr. Lee, Department Head</h4>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-blue-600 text-white py-6 text-center">
        <p>&copy; {new Date().getFullYear()} AutoSched. All rights reserved.</p>
      </footer>
    </div>
  );
}
