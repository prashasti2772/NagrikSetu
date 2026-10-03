import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  FiUser,
  FiPhone,
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiMapPin,
  FiClock,
  FiArrowRight,
  FiCheckCircle,
  FiShield,
  FiHome,
  FiHelpCircle,
} from "react-icons/fi";

import {
  MdAccountBalance,
  MdFingerprint,
  MdOutlineStorage,
  MdOutlineHowToVote,
} from "react-icons/md";
import {
  signupWards,
  signupVerificationBadge,
  signUpDefaults,
} from "../data/authData";

const SignUp = () => {
  const navigate = useNavigate();

  const [role, setRole] = useState("citizen");
  const isCitizen = role === "citizen";

  const [form, setForm] = useState({ ...signUpDefaults });

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [accepted, setAccepted] = useState(false);

  const [error, setError] = useState("");

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    setError("");

    if (!form.name || !form.mobile || !form.ward) {
      setError("Please fill all required fields.");
      return;
    }

    if (form.mobile.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!accepted) {
      setError(
        `Please accept the ${isCitizen ? "Citizen Charter" : "Official Conduct Charter"} and Terms of Service.`
      );
      return;
    }

    const registeredAccount = {
      ...form,
      role,
      id: `${isCitizen ? "CIT" : "AUTH"}-${Date.now()}`,
    };

    localStorage.setItem(
      "nagrikSetuRegisteredUser",
      JSON.stringify(registeredAccount)
    );

    alert(`${isCitizen ? "Citizen" : "Official staff"} account created successfully.`);

    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#f5f7f9] text-[#07182d]">

      {/* Breadcrumb */}
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 pt-7">

        <div className="flex items-center gap-2 text-xs text-gray-600">

          <FiHome size={14} />

          <span>Home</span>

          <span>›</span>

          <span className="text-[#c43d12] font-semibold">
            {isCitizen ? "Citizen Registration" : "Official Staff Registration"}
          </span>

        </div>

      </div>

      {/* Main */}
      <main className="max-w-[1400px] mx-auto px-5 md:px-8 py-6">

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

          {/* Form */}
          <section className="xl:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm p-6 md:p-8">

            {/* Role */}
            <div className="bg-gray-100 rounded-lg p-1 flex mb-6">

              <button
                type="button"
                onClick={() => setRole("citizen")}
                className={`flex-1 py-3 rounded-md flex justify-center items-center gap-2 text-sm font-semibold ${
                  role === "citizen"
                    ? "bg-[#07182d] text-white"
                    : "text-gray-700"
                }`}
              >
                <FiUser size={17} />
                Citizen Account
              </button>

              <button
                type="button"
                onClick={() => setRole("authority")}
                className={`flex-1 py-3 rounded-md flex justify-center items-center gap-2 text-sm font-semibold ${
                  role === "authority"
                    ? "bg-[#07182d] text-white"
                    : "text-gray-700"
                }`}
              >
                <MdAccountBalance size={19} />
                Official / Nodal Staff
              </button>

            </div>

            {/* Heading */}
            <div className="mb-6">

              <p className="text-xs text-[#ff6422] uppercase font-bold tracking-wide">
                {isCitizen ? "Urban Grievance Redressal" : "Municipal Authority Enrollment"}
              </p>

              <h1 className="text-3xl md:text-4xl font-semibold mt-2">
                {isCitizen ? "Create Citizen Account" : "Create Official Account"}
              </h1>

              <p className="text-gray-600 mt-2">
                {isCitizen
                  ? "Join residents in your ward for fast, accountable civic redressal and transparent city services."
                  : "Register your municipal role to manage ward operations, review civic grievances, and coordinate accountable public services."}
              </p>

            </div>

            <form onSubmit={handleSubmit}>

              {/* Name */}
              <Input
                label={isCitizen ? "Full Legal Name" : "Official Full Name"}
                placeholder={isCitizen ? "e.g. Rajesh Kumar Sharma" : "e.g. Municipal Officer Name"}
                icon={<FiUser size={18} />}
                value={form.name}
                onChange={(value) =>
                  updateField("name", value)
                }
                required
              />

              {/* Email + Mobile */}
              <div className="grid md:grid-cols-2 gap-4">

                <Input
                  label="Email Address"
                  placeholder="rajesh.sharma@example.in"
                  icon={<FiMail size={18} />}
                  value={form.email}
                  onChange={(value) =>
                    updateField("email", value)
                  }
                />

                <Input
                  label="Mobile Number"
                  placeholder="+91 98765 43210"
                  icon={<FiPhone size={18} />}
                  value={form.mobile}
                  onChange={(value) =>
                    updateField(
                      "mobile",
                      value.replace(/\D/g, "")
                    )
                  }
                  maxLength={10}
                  required
                />

              </div>

              {/* Ward */}
              <div className="mt-4">

                <div className="flex justify-between mb-2">

                  <label className="text-sm font-semibold">
                    {isCitizen ? "Residential Ward / Administrative Zone" : "Assigned Ward / Administrative Zone"}
                  </label>

                  <button
                    type="button"
                    className="text-xs text-[#c43d12] font-semibold flex items-center gap-1"
                  >
                    <FiMapPin size={13} />
                    {isCitizen ? "Locate my Ward" : "Select assigned ward"}
                  </button>

                </div>

                <div className="flex items-center border border-gray-200 rounded-lg px-4 h-12 focus-within:border-[#ff6422]">

                  <FiMapPin
                    size={18}
                    className="text-gray-500 mr-3"
                  />

                  <select
                    value={form.ward}
                    onChange={(e) =>
                      updateField("ward", e.target.value)
                    }
                    className="w-full bg-transparent outline-none text-sm"
                  >

                    <option value="">
                      {isCitizen ? "Select your municipal ward / zone..." : "Select your assigned ward / zone..."}
                    </option>

                    {signupWards.map((ward) => (
                      <option key={ward} value={ward}>
                        {ward}
                      </option>
                    ))}

                  </select>

                </div>

              </div>

              {/* Password */}
              <div className="grid md:grid-cols-2 gap-4 mt-4">

                <PasswordInput
                  label="Password"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  show={showPassword}
                  setShow={setShowPassword}
                  onChange={(value) =>
                    updateField("password", value)
                  }
                />

                <PasswordInput
                  label="Confirm Password"
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  show={showConfirmPassword}
                  setShow={setShowConfirmPassword}
                  onChange={(value) =>
                    updateField("confirmPassword", value)
                  }
                />

              </div>

              {/* Security Strength */}
              <div className="bg-gray-100 rounded-lg p-3 mt-4">

                <div className="flex justify-between text-xs">

                  <span>
                    Security Strength:
                  </span>

                  <span className="text-emerald-600 font-semibold">
                    Strong (Municipal Grade AES-256)
                  </span>

                </div>

                <div className="grid grid-cols-3 gap-1 mt-2">

                  <div className="h-1 bg-[#ff6422] rounded-full" />
                  <div className="h-1 bg-[#ff6422] rounded-full" />
                  <div className="h-1 bg-emerald-400 rounded-full" />

                </div>

              </div>

              {/* Terms */}
              <label className="flex gap-3 mt-5 text-sm text-gray-600 cursor-pointer">

                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) =>
                    setAccepted(e.target.checked)
                  }
                  className="mt-1 accent-[#ff6422]"
                />

                <span>
                  I agree to the{" "}
                  <span className="text-[#c43d12] font-semibold">
                    {isCitizen ? "Citizen Charter" : "Official Conduct Charter"}
                  </span>
                  ,{" "}
                  <span className="text-[#c43d12] font-semibold">
                    Terms of Service
                  </span>
                  , and consent to identity verification.
                  {isCitizen
                    ? " My residential contact information remains encrypted and protected under Digital Data Protection regulations."
                    : " My official contact information will be used for municipal operations and protected under Digital Data Protection regulations."}
                </span>

              </label>

              {/* Error */}
              {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Create */}
              <button
                type="submit"
                className="w-full mt-5 h-12 bg-[#ff6422] hover:bg-[#e95417] text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition"
              >
                {isCitizen ? "Create Citizen Account" : "Create Official Account"}
                <FiArrowRight size={18} />
              </button>

              {/* Guarantee */}
              <div className="bg-gray-100 rounded-lg p-3 mt-3 text-xs text-gray-600 flex items-center justify-center gap-2">

                <FiShield
                  size={16}
                  className="text-emerald-600"
                />

                {isCitizen
                  ? "Account provides instant access to 48-Hour Municipal Response Guarantee."
                  : "Official account access is scoped to your assigned municipal role and jurisdiction."}

              </div>

            </form>

            {/* Authenticate */}
            <div className="flex items-center gap-4 my-6">

              <div className="h-px bg-gray-200 flex-1" />

              <span className="text-xs text-gray-500 font-semibold">
                OR AUTHENTICATE WITH
              </span>

              <div className="h-px bg-gray-200 flex-1" />

            </div>

            <div className="grid md:grid-cols-2 gap-3">

              <button
                type="button"
                className="h-11 bg-gray-100 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-200"
              >
                <MdFingerprint size={20} />
                Aadhaar e-KYC
              </button>

              <button
                type="button"
                className="h-11 bg-gray-100 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-200"
              >
                <MdOutlineStorage size={20} />
                DigiLocker Sync
              </button>

            </div>

            <p className="text-center text-sm text-gray-600 mt-6">

              Already have a registered profile?

              <Link
                to="/login"
                className="text-[#c43d12] font-semibold ml-2"
              >
                Sign In to Dashboard →
              </Link>

            </p>

          </section>

          {/* Right Side */}
          <aside className="xl:col-span-2 space-y-5">

            {/* Governance Card */}
            <div className="bg-[#07182d] text-white rounded-xl p-7 relative overflow-hidden">

              <div className="relative z-10">

                <span className="inline-block bg-[#493b38] text-white rounded-full px-3 py-1 text-[10px] font-bold uppercase">
                  {isCitizen ? "Citizen Governance Hub" : "Municipal Authority Hub"}
                </span>

                <h2 className="text-2xl md:text-3xl font-semibold mt-5">
                  {isCitizen ? "Cleaner Cities," : "Stronger Ward Services,"}
                  <span className="text-[#ffc6b0]">
                    {isCitizen ? " Happier People" : " Accountable Governance"}
                  </span>
                </h2>

                <p className="text-gray-400 mt-2">
                  {isCitizen
                    ? "Transform passive complaints into active municipal accountability with real-time ward tracking."
                    : "Coordinate municipal response, monitor grievance progress, and keep ward-level services accountable."}
                </p>

                <div className="grid grid-cols-2 gap-2 mt-6">

                  <div className="bg-[#223a55] rounded-lg p-4">
                    <p className="text-2xl font-bold">
                      {isCitizen ? "94.8%" : "24/7"}
                    </p>

                    <p className="text-xs text-gray-300">
                      {isCitizen ? "48h SLA Fulfillment" : "Operational Coverage"}
                    </p>
                  </div>

                  <div className="bg-[#223a55] rounded-lg p-4">
                    <p className="text-2xl font-bold text-emerald-400">
                      {isCitizen ? "142,390+" : "48"}
                    </p>

                    <p className="text-xs text-gray-300">
                      {isCitizen ? "Issues Resolved" : "Connected Wards"}
                    </p>
                  </div>

                </div>

              </div>

              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff6422] to-emerald-400" />

            </div>

            {/* Why Join */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">

              <h2 className="text-xl font-semibold">
                {isCitizen ? "Why Join NagrikSetu?" : "Authority Workspace"}
              </h2>

              <div className="mt-6 space-y-6">

                <Benefit
                  icon={<FiClock size={20} />}
                  title={isCitizen ? "Guaranteed SLA Tracking" : "Grievance Oversight"}
                  text={isCitizen ? "Statutory 48-hour response countdown on all lodged grievances." : "Review incoming reports and monitor statutory service-level deadlines."}
                  iconClass="bg-[#ffe0d4] text-[#ff6422]"
                />

                <Benefit
                  icon={<FiCheckCircle size={20} />}
                  title={isCitizen ? "Citizen-Mandated Sign-Off" : "Verified Resolution Workflow"}
                  text={isCitizen ? "Dockets cannot be arbitrarily marked resolved until you verify the fix." : "Record field evidence and follow the required resolution and audit steps."}
                  iconClass="bg-emerald-100 text-emerald-600"
                />

                <Benefit
                  icon={<MdOutlineHowToVote size={21} />}
                  title={isCitizen ? "Community Voting & Upvoting" : "Ward Coordination"}
                  text={isCitizen ? "Collaborate with neighbors and prioritize civic issues." : "Coordinate assigned teams and prioritize issues across your jurisdiction."}
                  iconClass="bg-blue-100 text-blue-600"
                />

              </div>

              {/* Testimonial */}
              <div className="bg-gray-100 rounded-lg p-5 mt-6">

                <p className="text-[10px] font-bold uppercase">
                  {isCitizen ? signupVerificationBadge : "OFFICIAL AUTHORITY ACCESS"}
                </p>

                <p className="text-sm italic mt-3 text-gray-700">
                  {isCitizen
                    ? '"The tracking system makes it genuinely transparent."'
                    : '"The authority workspace keeps ward response and follow-up in one place."'}
                </p>

                <div className="flex justify-between mt-4 text-xs">

                  <span>
                    {isCitizen ? "Smt. Ananya Deshmukh" : "Municipal Nodal Officer"}
                  </span>

                  <span className="text-emerald-600 font-semibold">
                    {isCitizen ? "Grievance #NKS-8821 Resolved" : "Official Enrollment"}
                  </span>

                </div>

              </div>

            </div>

            {/* Help */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 flex items-center gap-4">

              <div className="w-10 h-10 rounded-full bg-[#fff0e9] text-[#ff6422] flex items-center justify-center">
                <FiHelpCircle size={20} />
              </div>

              <div className="flex-1">

                <p className="font-medium text-sm">
                  {isCitizen ? "Need help signing up?" : "Need help with official access?"}
                </p>

                <p className="text-xs text-gray-500">
                  Call Municipal Helpline 1916
                </p>

              </div>

              <button className="text-xs text-[#c43d12] font-semibold">
                Support FAQs
              </button>

            </div>

          </aside>

        </div>

        {/* Security */}
        <div className="mt-6 bg-gray-100 rounded-xl px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">

          <div className="flex items-center gap-3">

            <FiShield
              size={21}
              className="text-[#c43d12]"
            />

            <div>
              <p className="text-sm font-semibold">
                State Cyber Security Directorate Compliant
              </p>

              <p className="text-xs text-gray-500">
                256-bit SSL encryption & citizen-exclusive
                grievance authorization.
              </p>
            </div>

          </div>

          <span className="bg-gray-200 rounded-md px-3 py-2 text-xs font-semibold">
            ISO 27001
          </span>

        </div>

      </main>

    </div>
  );
};


/* ---------------- Components ---------------- */

const Input = ({
  label,
  placeholder,
  icon,
  value,
  onChange,
  required,
  maxLength,
}) => {
  return (
    <div className="mb-4">

      <label className="text-sm font-semibold block mb-2">
        {label}
        {required && (
          <span className="text-[#c43d12] ml-1">
            *
          </span>
        )}
      </label>

      <div className="flex items-center border border-gray-200 rounded-lg px-4 h-12 focus-within:border-[#ff6422] transition">

        <span className="text-gray-500 mr-3">
          {icon}
        </span>

        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="w-full outline-none text-sm"
        />

      </div>

    </div>
  );
};


const PasswordInput = ({
  label,
  placeholder,
  value,
  show,
  setShow,
  onChange,
}) => {
  return (
    <div>

      <label className="text-sm font-semibold block mb-2">
        {label}
      </label>

      <div className="flex items-center border border-gray-200 rounded-lg px-4 h-12 focus-within:border-[#ff6422]">

        <FiLock
          size={18}
          className="text-gray-500 mr-3"
        />

        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full outline-none text-sm"
        />

        <button
          type="button"
          onClick={() => setShow(!show)}
          className="text-gray-500"
        >
          {show ? (
            <FiEyeOff size={18} />
          ) : (
            <FiEye size={18} />
          )}
        </button>

      </div>

    </div>
  );
};


const Benefit = ({
  icon,
  title,
  text,
  iconClass,
}) => {
  return (
    <div className="flex gap-4">

      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}
      >
        {icon}
      </div>

      <div>

        <h3 className="font-medium">
          {title}
        </h3>

        <p className="text-sm text-gray-600 leading-5 mt-1">
          {text}
        </p>

      </div>

    </div>
  );
};

export default SignUp;