import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer";

import {
  FiHome,
  FiChevronRight,
  FiShield,
  FiCheckCircle,
  FiEdit2,
  FiRefreshCw,
  FiEye,
  FiEyeOff,
  FiLock,
  FiClock,
  FiHeadphones,
  FiPhone,
  FiArrowLeft,
  FiArrowRight,
  FiMail,
  FiUser,
  FiAlertCircle,
} from "react-icons/fi";

import {
  MdOutlineSecurity,
  MdOutlinePassword,
  MdOutlineContactPhone,
} from "react-icons/md";
import { forgotPasswordDemo } from "../data/forgotPasswordData";

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [otp, setOtp] = useState(forgotPasswordDemo.initialOtp);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [timeLeft, setTimeLeft] = useState(forgotPasswordDemo.timeLeft);

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;

    const updatedOtp = [...otp];
    updatedOtp[index] = value;
    setOtp(updatedOtp);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (
      event.key === "Backspace" &&
      !otp[index] &&
      index > 0
    ) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleResetPassword = () => {
    if (otp.join("").length !== 6) {
      alert("Please enter the complete 6-digit OTP.");
      return;
    }

    if (password.length < 8) {
      alert("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    alert("Password reset successfully.");

    navigate("/signin");
  };

  const resendOtp = () => {
    setOtp(["", "", "", "", "", ""]);
    alert("OTP resent successfully.");
  };

  return (
    <div className="min-h-screen bg-[#f5f7f9] text-[#0b1220]">
      <Navbar />

      {/* Breadcrumb */}
      <div className="mx-auto flex w-full max-w-[1440px] items-center gap-2 px-6 pt-8 text-sm text-gray-500 md:px-10">
        <FiHome size={15} />

        <span>Home</span>

        <FiChevronRight size={14} />

        <span>Citizen Authentication</span>

        <FiChevronRight size={14} />

        <span className="font-semibold text-[#101828]">
          Reset Password & Access Recovery
        </span>
      </div>

      {/* Main */}
      <main className="mx-auto w-full max-w-[1440px] px-6 pb-20 pt-6 md:px-10">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_1fr]">

          {/* ================= LEFT CARD ================= */}
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

            <div className="p-6 md:p-8">

              {/* Header */}
              <div className="relative">

                <div className="mb-4 flex items-center justify-between">

                  <div className="inline-flex items-center gap-2 rounded-full bg-[#ffddd1] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#ff5b22]">
                    <FiShield size={14} />
                    Official Statutory Portal
                  </div>

                  <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-[#ff5b22] sm:flex">
                    <MdOutlinePassword size={22} />
                  </div>
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-[#0b1220] md:text-[32px]">
                  Reset Citizen Credentials
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 md:text-base">
                  Recover access to municipal grievance tracking, zonal
                  certificates, and tax filings.
                </p>
              </div>

              {/* Step Indicator */}
              <div className="mt-7 rounded-xl bg-gray-100 p-2">
                <div className="grid grid-cols-2 gap-2">

                  <div className="flex items-center gap-3 rounded-lg bg-white px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-300 text-white">
                      <FiCheckCircle size={18} />
                    </div>

                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                        Step 01
                      </p>

                      <p className="text-sm font-semibold text-[#101828]">
                        Verify Identity
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-lg bg-[#10253e] px-4 py-3 text-white">

                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ff6428] text-sm font-bold">
                      2
                    </div>

                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-300">
                        Step 02
                      </p>

                      <p className="text-sm font-semibold">
                        Verify & Reset
                      </p>
                    </div>

                  </div>

                </div>
              </div>

              {/* Registered Contact */}
              <div className="mt-7 rounded-xl bg-[#e9edf0] p-4">

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div className="flex items-start gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <MdOutlineSecurity size={20} />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        <span>{forgotPasswordDemo.email}</span>

                        <span className="rounded-full bg-white px-2 py-1 text-xs">
                          {forgotPasswordDemo.phone}
                        </span>
                      </div>

                      <p className="mt-1 text-xs leading-5 text-gray-600">
                        One-Time Passcode dispatched via NIC sovereign
                        gateway • Ref: {forgotPasswordDemo.reference}
                      </p>
                    </div>

                  </div>

                  <button
                    type="button"
                    className="flex items-center gap-2 text-sm font-semibold text-[#d94718]"
                  >
                    <FiEdit2 size={15} />
                    Change Contact
                  </button>

                </div>

              </div>

              {/* OTP */}
              <div className="mt-7">

                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">

                  <label className="flex items-center gap-2 text-sm font-bold text-[#101828]">
                    <MdOutlineContactPhone
                      className="text-[#ff5b22]"
                      size={18}
                    />
                    Enter 6-Digit Municipal OTP
                  </label>

                  <span className="inline-flex items-center gap-2 rounded-full bg-[#ffd8d5] px-3 py-1 text-xs font-semibold text-[#c9362e]">
                    <FiClock size={14} />
                    Expires in {timeLeft}
                  </span>

                </div>

                <div className="grid grid-cols-6 gap-2 sm:gap-3">

                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      value={digit}
                      maxLength={1}
                      inputMode="numeric"
                      onChange={(e) =>
                        handleOtpChange(index, e.target.value)
                      }
                      onKeyDown={(e) =>
                        handleOtpKeyDown(index, e)
                      }
                      className="h-14 w-full rounded-lg border border-transparent bg-[#edf0f2] text-center text-xl font-bold outline-none transition focus:border-[#ff6428] focus:bg-white focus:ring-2 focus:ring-orange-100"
                    />
                  ))}

                </div>

                <div className="mt-3 flex flex-col justify-between gap-2 text-xs text-gray-600 sm:flex-row">

                  <span>
                    Didn't receive SMS? Check spam folder or
                  </span>

                  <button
                    type="button"
                    onClick={resendOtp}
                    className="flex items-center gap-1 font-semibold text-[#d94718]"
                  >
                    <FiRefreshCw size={13} />
                    Resend OTP
                  </button>

                </div>

              </div>

              {/* Password fields */}
              <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2">

                {/* New Password */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-semibold">
                      New Secure Password
                    </label>

                    <span className="text-xs text-gray-500">
                      Min. 8 Chars
                    </span>
                  </div>

                  <div className="relative">

                    <MdOutlinePassword
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                      size={19}
                    />

                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      placeholder="Enter secure password"
                      className="h-12 w-full rounded-lg border border-transparent bg-[#edf0f2] pl-10 pr-11 text-sm outline-none focus:border-[#ff6428] focus:bg-white focus:ring-2 focus:ring-orange-100"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPassword ? (
                        <FiEyeOff size={18} />
                      ) : (
                        <FiEye size={18} />
                      )}
                    </button>

                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <div className="mb-2 flex items-center justify-between">

                    <label className="text-sm font-semibold">
                      Confirm Password
                    </label>

                    {confirmPassword &&
                      password === confirmPassword && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <FiCheckCircle size={13} />
                          Matches
                        </span>
                      )}

                  </div>

                  <div className="relative">

                    <FiLock
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                      size={18}
                    />

                    <input
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      value={confirmPassword}
                      onChange={(e) =>
                        setConfirmPassword(e.target.value)
                      }
                      placeholder="Re-enter password"
                      className="h-12 w-full rounded-lg border border-transparent bg-[#edf0f2] pl-10 pr-11 text-sm outline-none focus:border-[#ff6428] focus:bg-white focus:ring-2 focus:ring-orange-100"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          !showConfirmPassword
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showConfirmPassword ? (
                        <FiEyeOff size={18} />
                      ) : (
                        <FiEye size={18} />
                      )}
                    </button>

                  </div>
                </div>

              </div>

              {/* Password strength */}
              <div className="mt-4 rounded-lg bg-[#edf0f2] p-3">

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span>
                    Municipal Entropy Strength:
                  </span>

                  <span className="font-bold text-emerald-600">
                    Strong (256-bit hash)
                  </span>

                  <span className="font-bold text-emerald-600">
                    LEVEL 4 / 4
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-4 gap-1">

                  <div className="h-1.5 rounded-full bg-emerald-500" />
                  <div className="h-1.5 rounded-full bg-emerald-500" />
                  <div className="h-1.5 rounded-full bg-emerald-500" />
                  <div className="h-1.5 rounded-full bg-emerald-500" />

                </div>

                <p className="mt-2 text-xs leading-5 text-gray-600">
                  Passwords must contain 8+ characters, at least
                  one uppercase letter (A-Z), one numeric digit
                  (0-9), and one special symbol (@, #, $, !).
                </p>

              </div>

              {/* Revoke sessions */}
              <label className="mt-6 flex cursor-pointer items-start gap-3">

                <input
                  type="checkbox"
                  defaultChecked
                  className="mt-1 h-4 w-4 accent-[#ff6428]"
                />

                <span>
                  <span className="block text-sm font-semibold">
                    Revoke and log out of all other active browser
                    sessions
                  </span>

                  <span className="block text-xs leading-5 text-gray-500">
                    Recommended if you suspect unauthorized access
                    from a public kiosk or shared computer terminal.
                  </span>
                </span>

              </label>

              {/* Reset button */}
              <button
                type="button"
                onClick={handleResetPassword}
                className="mt-7 flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-[#ff6428] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#e9521c] active:scale-[0.99]"
              >
                Reset Password & Authenticate
                <FiArrowRight size={18} />
              </button>

              {/* Bottom navigation */}
              <div className="mt-6 flex flex-col justify-between gap-4 text-sm sm:flex-row">

                <Link
                  to="/login"
                  className="flex items-center gap-2 font-semibold text-[#101828] hover:text-[#ff5b22]"
                >
                  <FiArrowLeft size={16} />
                  Back to Citizen Sign In
                </Link>

                <button
                  type="button"
                  className="flex items-center gap-2 font-semibold text-[#101828] hover:text-[#ff5b22]"
                >
                  <FiHeadphones size={16} />
                  Ward Authority Recovery
                </button>

              </div>

            </div>
          </section>

          {/* ================= RIGHT SIDE ================= */}
          <aside className="space-y-5">

            {/* Security image/card */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

              <div className="relative h-48 overflow-hidden bg-[#10253e]">

                {/* Temporary image-style background */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#174f7c] via-[#123a5d] to-[#081b2d]" />

                <div className="absolute inset-0 opacity-20">
                  <div className="absolute right-8 top-5 text-[130px] text-white">
                    <MdOutlineSecurity />
                  </div>
                </div>

                <div className="absolute bottom-5 left-5 right-5 flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#ff6428]">
                    <FiShield size={24} />
                  </div>

                  <div className="text-white">

                    <p className="text-xs font-bold uppercase tracking-wide text-orange-200">
                      Citizen Identity Safeguard
                    </p>

                    <h2 className="text-xl font-bold">
                      National Security Standard
                    </h2>

                  </div>

                </div>

              </div>

              {/* Principles */}
              <div className="p-6">

                <h2 className="text-xl font-bold">
                  Account Recovery Principles
                </h2>

                <div className="mt-6 space-y-5">

                  <div className="flex gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <FiUser size={19} />
                    </div>

                    <div>
                      <h3 className="font-bold">
                        Zero-Trust Identity Mapping
                      </h3>

                      <p className="mt-1 text-sm leading-5 text-gray-600">
                        Recovery attempts cross-verify voter ID,
                        municipal house assessment numbers, and
                        mobile hashes prior to granting new key
                        issuance.
                      </p>
                    </div>

                  </div>

                  <div className="flex gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[#ff5b22]">
                      <FiMail size={19} />
                    </div>

                    <div>
                      <h3 className="font-bold">
                        Free Sovereign NIC OTP Rails
                      </h3>

                      <p className="mt-1 text-sm leading-5 text-gray-600">
                        Authentication tokens are dispatched via
                        official state gateways at zero SMS surcharge
                        or cellular tariff to citizens.
                      </p>
                    </div>

                  </div>

                  <div className="flex gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <FiLock size={19} />
                    </div>

                    <div>
                      <h3 className="font-bold">
                        Instant Device Flush
                      </h3>

                      <p className="mt-1 text-sm leading-5 text-gray-600">
                        Updating password credentials immediately
                        repudiates active OAuth refresh tokens on
                        mobile applications and unverified kiosks.
                      </p>
                    </div>

                  </div>

                </div>

              </div>
            </div>

            {/* Help card */}
            <div className="rounded-2xl border border-gray-200 bg-[#e9edf0] p-5">

              <div className="flex items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[#ff5b22]">
                  <FiHeadphones size={20} />
                </div>

                <div className="flex-1">

                  <h3 className="font-bold">
                    Unable to Access Registered Contact?
                  </h3>

                  <p className="mt-2 text-sm leading-5 text-gray-600">
                    If your registered mobile number or email is
                    defective, visit your nearest Municipal Zonal
                    Ward Office with physical photo identity or
                    reach our 24/7 hotline.
                  </p>

                  <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div>
                      <p className="flex items-center gap-2 text-lg font-bold">
                        <FiPhone
                          className="text-[#ff5b22]"
                          size={20}
                        />
                        1916
                      </p>

                      <p className="ml-7 text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Toll-Free Civic Control
                      </p>
                    </div>

                    <button
                      type="button"
                      className="text-sm font-bold text-[#d94718]"
                    >
                      Find Ward Desk ↗
                    </button>

                  </div>

                </div>

              </div>

            </div>

          </aside>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ForgotPassword;