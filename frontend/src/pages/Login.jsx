import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import {
  FiUser,
  FiPhone,
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiMail,
  FiHome,
} from "react-icons/fi";

import {
  MdAccountBalance,
  MdOutlineVerifiedUser,
  MdOutlineLanguage,
} from "react-icons/md";
import { authData as DEMO_CREDENTIALS, demoUsers as DEMO_USERS } from "../data/authData";


// ======================================================
// LOGIN COMPONENT
// ======================================================

const Login = () => {
  const navigate = useNavigate();

  // Current selected role
  const [role, setRole] = useState("citizen");

  // Login fields
  const [mobile, setMobile] = useState(
    DEMO_CREDENTIALS.citizen.mobile
  );

  const [otp, setOtp] = useState(
    DEMO_CREDENTIALS.citizen.otp
  );

  // UI states
  const [showOtp, setShowOtp] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");


  // ======================================================
  // CHANGE ROLE
  // ======================================================

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);

    setError("");
    setSuccess("");

    // Load demo credentials according to selected role
    setMobile(DEMO_CREDENTIALS[selectedRole].mobile);
    setOtp(DEMO_CREDENTIALS[selectedRole].otp);
  };


  // ======================================================
  // LOGIN
  // ======================================================

  const handleLogin = (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const credentials = DEMO_CREDENTIALS[role];

    // Check mobile number
    if (mobile !== credentials.mobile) {
      setError(
        `Invalid ${role === "citizen" ? "citizen" : "authority"} mobile number.`
      );
      return;
    }

    // Check OTP
    if (otp !== credentials.otp) {
      setError("Invalid OTP. Please enter the correct OTP.");
      return;
    }


    // ====================================================
    // LOGIN SUCCESS
    // ====================================================

    const loggedInUser = DEMO_USERS[role];

    // Save logged-in user
    localStorage.setItem(
      "nagrikSetuUser",
      JSON.stringify(loggedInUser)
    );

    // General authentication flag
    localStorage.setItem(
      "nagrikSetuAuth",
      "true"
    );

    // Save role separately
    localStorage.setItem(
      "nagrikSetuRole",
      role
    );

    setSuccess("Login successful. Redirecting...");


    // ====================================================
    // REDIRECT
    // ====================================================

    if (role === "authority") {

      /*
       * If your Admin Dashboard route is:
       * /admin
       *
       * keep this.
       */

      navigate("/authority-dashboard");

    } else {

      // Citizen goes to Home
      navigate("/");
    }
  };


  // ======================================================
  // SEND OTP
  // ======================================================

  const handleSendOtp = () => {
    setError("");
    setSuccess("");

    const credentials = DEMO_CREDENTIALS[role];

    setMobile(credentials.mobile);
    setOtp(credentials.otp);

    setSuccess(
      `Demo OTP sent successfully. Use OTP: ${credentials.otp}`
    );
  };


  return (
    <div className="min-h-screen bg-[#f5f7f9] text-[#07182d]">

      {/* ==================================================
          BREADCRUMB
      ================================================== */}

      <div className="max-w-[1400px] mx-auto px-5 md:px-8 pt-7">

        <div className="flex items-center gap-2 text-xs text-gray-600">

          <FiHome size={14} />

          <span>
            Home
          </span>

          <span>
            ›
          </span>

          <span className="font-semibold text-[#07182d]">
            Citizen Authentication
          </span>

        </div>

      </div>


      {/* ==================================================
          SECURITY BADGE
      ================================================== */}

      <div className="max-w-[1400px] mx-auto px-5 md:px-8 mt-4">

        <div className="flex justify-end">

          <div className="inline-flex items-center gap-2 bg-[#eef1f3] rounded-full px-4 py-2 text-[10px] tracking-wider font-semibold">

            <span className="w-2 h-2 rounded-full bg-emerald-500" />

            PUBLIC REDRESSAL GATEWAY • SECURE SSL 256-BIT

          </div>

        </div>

      </div>


      {/* ==================================================
          MAIN CONTENT
      ================================================== */}

      <main className="max-w-[1400px] mx-auto px-5 md:px-8 py-6">

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">


          {/* ==================================================
              LEFT LOGIN CARD
          ================================================== */}

          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">


            {/* ==================================================
                ROLE TABS
            ================================================== */}

            <div className="bg-gray-100 rounded-lg p-1 flex mb-6">

              {/* Citizen */}
              <button
                type="button"
                onClick={() => handleRoleChange("citizen")}
                className={`
                  flex-1
                  flex
                  items-center
                  justify-center
                  gap-2
                  py-3
                  rounded-md
                  text-sm
                  font-semibold
                  transition
                  ${
                    role === "citizen"
                      ? "bg-[#07182d] text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-200"
                  }
                `}
              >

                <FiUser size={17} />

                Citizen Login

              </button>


              {/* Authority */}
              <button
                type="button"
                onClick={() => handleRoleChange("authority")}
                className={`
                  flex-1
                  flex
                  items-center
                  justify-center
                  gap-2
                  py-3
                  rounded-md
                  text-sm
                  font-semibold
                  transition
                  ${
                    role === "authority"
                      ? "bg-[#07182d] text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-200"
                  }
                `}
              >

                <MdAccountBalance size={19} />

                Authority Login

              </button>

            </div>


            {/* ==================================================
                HEADING
            ================================================== */}

            <div className="mb-7">

              <p className="text-xs text-[#ff6422] uppercase font-bold tracking-wide">

                Welcome to NagrikSetu

              </p>

              <h1 className="text-3xl md:text-4xl font-semibold mt-2">

                Welcome Back

              </h1>

              <p className="text-gray-600 mt-2 leading-6">

                {role === "citizen"
                  ? "Sign in to report civic issues, track your complaints and be part of a cleaner, safer, and better city."
                  : "Sign in to access the authority dashboard and manage civic grievances assigned to your department."
                }

              </p>

            </div>


            {/* ==================================================
                LOGIN FORM
            ================================================== */}

            <form onSubmit={handleLogin}>


              {/* ==================================================
                  MOBILE NUMBER
              ================================================== */}

              <div className="mb-5">

                <div className="flex justify-between mb-2">

                  <label className="text-sm font-semibold">

                    Mobile Number

                  </label>

                  <span className="text-xs text-gray-500">

                    OTP Enabled

                  </span>

                </div>


                <div className="flex items-center border border-gray-200 rounded-lg px-4 h-12 focus-within:border-[#ff6422] transition">

                  <FiPhone
                    size={18}
                    className="text-gray-500 mr-3"
                  />

                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => {
                      setMobile(
                        e.target.value.replace(/\D/g, "")
                      );

                      setError("");
                      setSuccess("");
                    }}
                    maxLength={10}
                    placeholder="Enter mobile number"
                    className="w-full outline-none text-sm"
                  />

                </div>

              </div>


              {/* ==================================================
                  OTP
              ================================================== */}

              <div className="mb-4">

                <div className="flex justify-between mb-2">

                  <label className="text-sm font-semibold">

                    Login OTP

                  </label>


                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-xs text-[#c43d12] font-semibold hover:underline"
                  >

                    Send OTP

                  </button>

                </div>


                <div className="flex items-center border border-gray-200 rounded-lg px-4 h-12 focus-within:border-[#ff6422] transition">

                  <FiLock
                    size={18}
                    className="text-gray-500 mr-3"
                  />


                  <input
                    type={showOtp ? "text" : "password"}
                    value={otp}
                    onChange={(e) => {
                      setOtp(
                        e.target.value.replace(/\D/g, "")
                      );

                      setError("");
                      setSuccess("");
                    }}
                    maxLength={4}
                    placeholder="Enter OTP"
                    className="w-full outline-none text-sm tracking-[5px]"
                  />


                  <button
                    type="button"
                    onClick={() => setShowOtp(!showOtp)}
                    className="text-gray-500 hover:text-[#07182d]"
                  >

                    {showOtp ? (
                      <FiEyeOff size={18} />
                    ) : (
                      <FiEye size={18} />
                    )}

                  </button>

                </div>

              </div>


              {/* ==================================================
                  REMEMBER + FORGOT PASSWORD
              ================================================== */}

              <div className="flex items-center justify-between mb-5">

                <label className="flex items-center gap-2 text-sm cursor-pointer">

                  <input
                    type="checkbox"
                    defaultChecked
                    className="accent-[#ff6422]"
                  />

                  Remember me for 30 days

                </label>


                <Link
                  to="/forgot-password"
                  className="text-sm text-[#c43d12] font-semibold hover:underline"
                >

                  Forgot Password?

                </Link>

              </div>


              {/* ==================================================
                  ERROR MESSAGE
              ================================================== */}

              {error && (

                <div className="mb-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm p-3">

                  {error}

                </div>

              )}


              {/* ==================================================
                  SUCCESS MESSAGE
              ================================================== */}

              {success && (

                <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm p-3">

                  {success}

                </div>

              )}


              {/* ==================================================
                  LOGIN BUTTON
              ================================================== */}

              <button
                type="submit"
                className="w-full h-12 rounded-lg bg-[#ff6422] hover:bg-[#e95417] text-white font-semibold flex items-center justify-center gap-2 transition shadow-sm"
              >

                {role === "citizen"
                  ? "Sign In to Citizen Portal"
                  : "Sign In to Authority Portal"
                }

                <FiArrowRight size={18} />

              </button>

            </form>


            {/* ==================================================
                DIVIDER
            ================================================== */}

            <div className="flex items-center gap-4 my-6">

              <div className="h-px bg-gray-200 flex-1" />

              <span className="text-xs text-gray-500 font-semibold">
                OR
              </span>

              <div className="h-px bg-gray-200 flex-1" />

            </div>


            {/* ==================================================
                EMAIL LOGIN
            ================================================== */}

            <button
              type="button"
              className="w-full h-11 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition"
            >

              <FiMail size={17} />

              Sign in with One-Time Email Code

            </button>


            {/* ==================================================
                SIGNUP
            ================================================== */}

            {role === "citizen" && (

              <p className="text-center text-sm text-gray-600 mt-6">

                Don't have a citizen account?

                <Link
                  to="/signup"
                  className="text-[#c43d12] font-semibold ml-2 hover:underline"
                >

                  Create Account →

                </Link>

              </p>

            )}


            {/* ==================================================
                SECURITY INFORMATION
            ================================================== */}

            <div className="mt-6 bg-gray-100 rounded-lg px-4 py-3 flex items-center justify-center gap-2 text-xs text-gray-600">

              <MdOutlineVerifiedUser
                size={17}
                className="text-emerald-600"
              />

              100% Free Public Digital Rail • Aadhaar /
              DigiLocker / Email Verified

            </div>


            {/* ==================================================
                DEMO CREDENTIALS
            ================================================== */}

            <div className="mt-5 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">

              <p className="text-xs font-bold text-gray-700 mb-2">

                DEMO LOGIN CREDENTIALS

              </p>

              {role === "citizen" ? (

                <div className="text-xs text-gray-600 space-y-1">

                  <p>
                    <span className="font-semibold">
                      Mobile:
                    </span>{" "}
                    {DEMO_CREDENTIALS.citizen.mobile}
                  </p>

                  <p>
                    <span className="font-semibold">
                      OTP:
                    </span>{" "}
                    {DEMO_CREDENTIALS.citizen.otp}
                  </p>

                </div>

              ) : (

                <div className="text-xs text-gray-600 space-y-1">

                  <p>
                    <span className="font-semibold">
                      Authority Mobile:
                    </span>{" "}
                    {DEMO_CREDENTIALS.authority.mobile}
                  </p>

                  <p>
                    <span className="font-semibold">
                      Authority OTP:
                    </span>{" "}
                    {DEMO_CREDENTIALS.authority.otp}
                  </p>

                </div>

              )}

            </div>

          </section>


          {/* ==================================================
              RIGHT SIDE
          ================================================== */}

          <section className="space-y-5">


            {/* ==================================================
                HERO
            ================================================== */}

            <div className="relative rounded-xl overflow-hidden min-h-[390px] bg-gradient-to-br from-[#d9e6c5] via-[#f3d7a4] to-[#8bb6d8]">

              <div className="absolute inset-0 bg-gradient-to-t from-[#07182d] via-transparent to-transparent" />


              {/* Ward Rate */}

              <div className="absolute top-5 left-5 bg-white/90 backdrop-blur rounded-lg px-4 py-3 shadow-sm">

                <p className="text-[10px] text-[#ff6422] font-bold uppercase tracking-wider">

                  Ward Redressal Rate

                </p>

                <p className="text-xl font-bold">

                  94.2%

                  <span className="text-sm font-semibold ml-1">

                    Resolved &lt; 48hrs

                  </span>

                </p>

              </div>


              {/* Hero Text */}

              <div className="absolute bottom-7 left-6 right-6 text-white">

                <span className="inline-block bg-[#ff6422] rounded-full px-3 py-1 text-[10px] font-bold uppercase">

                  Citizen First Governance

                </span>

                <h2 className="text-2xl md:text-3xl font-bold mt-3">

                  Your Voice Bridges the Gap to Better Governance.

                </h2>

              </div>

            </div>


            {/* ==================================================
                FEATURE CARDS
            ================================================== */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <FeatureCard
                icon={<FiClock size={21} />}
                title="Real-Time Redressal"
                text="Track assigned ward engineers, inspection photos, and municipal vans down to the hour."
                iconClass="bg-[#07182d] text-white"
              />

              <FeatureCard
                icon={<FiCheckCircle size={21} />}
                title="Citizen Sign-Off"
                text="No civic complaint is marked closed without your direct OTP or digital endorsement."
                iconClass="bg-[#ff6422] text-white"
              />

              <FeatureCard
                icon={<MdOutlineVerifiedUser size={21} />}
                title="Open Ledger SLA"
                text="100% statutory transparency backed by public grievance records."
                iconClass="bg-emerald-800 text-white"
              />

            </div>

          </section>

        </div>


        {/* ==================================================
            BOTTOM STATS
        ================================================== */}

        <section className="mt-7 bg-white border border-gray-100 rounded-xl shadow-sm p-5">

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

            <Stat
              icon={<FiLock size={22} />}
              value="Zero Aadhaar Storage"
              text="UIDAI Masked Auth Only"
            />

            <Stat
              icon={<FiPhone size={22} />}
              value="1916 Civic Helpline"
              text="Toll-free 24x7 Support"
            />

            <Stat
              icon={<FiClock size={22} />}
              value="3.8 Hr SLA Median"
              text="For Critical Water/Power"
            />

            <Stat
              icon={<MdOutlineLanguage size={23} />}
              value="22 Indian Languages"
              text="Bhashini AI Translation"
            />

          </div>

        </section>

      </main>

    </div>
  );
};


// ======================================================
// FEATURE CARD
// ======================================================

const FeatureCard = ({
  icon,
  title,
  text,
  iconClass,
}) => {

  return (

    <div className="bg-white rounded-lg border border-gray-100 p-5">

      <div
        className={`
          w-9
          h-9
          rounded-lg
          flex
          items-center
          justify-center
          ${iconClass}
        `}
      >

        {icon}

      </div>


      <h3 className="font-semibold text-lg mt-4">

        {title}

      </h3>


      <p className="text-sm text-gray-600 leading-5 mt-2">

        {text}

      </p>

    </div>

  );
};


// ======================================================
// STAT COMPONENT
// ======================================================

const Stat = ({
  icon,
  value,
  text,
}) => {

  return (

    <div className="flex items-center gap-4">

      <div className="text-[#ff6422]">

        {icon}

      </div>


      <div>

        <p className="font-semibold">

          {value}

        </p>


        <p className="text-xs text-gray-500 mt-1">

          {text}

        </p>

      </div>

    </div>

  );
};


export default Login;