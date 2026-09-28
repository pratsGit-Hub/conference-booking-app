"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  User,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

const ALLOWED_EMAIL_DOMAIN = "@dangote.com";

export default function SignupPage() {
  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* =====================================================
     COMPANY EMAIL VALIDATION
  ===================================================== */

  function isDangoteEmail(email: string) {
    return email
      .trim()
      .toLowerCase()
      .endsWith(ALLOWED_EMAIL_DOMAIN);
  }

  /* =====================================================
     SUBMIT
  ===================================================== */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    /* =================================================
       NORMALIZE EMAIL
    ================================================= */

    const normalizedEmail =
      formData.email.trim().toLowerCase();

    /* =================================================
       CLIENT VALIDATION
    ================================================= */

    if (!formData.name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    /* ---------- Company email ---------- */

    if (!normalizedEmail) {
      setError(
        "Please enter your work email address."
      );
      return;
    }

    if (!isDangoteEmail(normalizedEmail)) {
      setError(
        "Only @dangote.com email addresses are allowed."
      );
      return;
    }

    /* ---------- Password ---------- */

    if (formData.password.length < 8) {
      setError(
        "Password must contain at least 8 characters."
      );
      return;
    }

    /* ---------- Confirm password ---------- */

    if (
      formData.password !==
      formData.confirmPassword
    ) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setIsLoading(true);

      /* =================================================
         BACKEND REGISTRATION
      ================================================= */

      const response = await fetch(
        `${API_URL}/api/auth/register`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          credentials: "include",

          body: JSON.stringify({
            name: formData.name.trim(),
            email: normalizedEmail,
            department:
              formData.department.trim() ||
              undefined,
            password: formData.password,
          }),
        }
      );

      const data = await response.json();

      /* =================================================
         HANDLE ERROR
      ================================================= */

      if (!response.ok) {
        setError(
          data.message ||
            "Unable to create your account."
        );

        return;
      }

      /* =================================================
         SUCCESS
      ================================================= */

      setSuccess(
        "Account created successfully. Redirecting..."
      );

      /*
       * The backend creates all public signup users
       * as EMPLOYEE.
       *
       * The frontend does NOT send a role.
       */

      window.location.href = "/dashboard";

    } catch (error) {
      console.error(
        "Signup error:",
        error
      );

      setError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#071B45]">

      <div className="grid min-h-screen lg:grid-cols-[45%_55%]">

        {/* =====================================================
            LEFT BRAND PANEL
        ===================================================== */}

        <section className="relative hidden overflow-hidden bg-[#10275F] lg:flex">

          <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-[#0A1F4D]" />

          <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-[#0B2151]" />

          <div className="absolute left-0 top-0 h-full w-1 bg-[#E83B32]" />

          <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">

            {/* Logo */}

            <div>
              <img
                src="/dangote-logo.png"
                alt="Dangote"
                className="h-auto w-52 object-contain"
              />
            </div>

            {/* Main message */}

            <div className="max-w-md">

              <div className="mb-6 h-1 w-14 bg-[#E83B32]" />

              <h2 className="text-5xl font-bold leading-[1.05] tracking-tight text-white xl:text-6xl">
                Great
                <br />
                Teams
                <br />
                Need Great
                <br />
                Spaces.
              </h2>

              <p className="mt-7 max-w-sm text-lg leading-8 text-blue-100/80">
                Create your account and start
                booking conference rooms
                effortlessly.
              </p>

              <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">

                <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
                  Collaborate
                </span>

                <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
                  Innovate
                </span>

                <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
                  Grow
                </span>

              </div>

            </div>

            {/* Footer */}

            <div className="flex items-center gap-3 text-sm text-blue-100/70">

              <span className="h-6 w-1 bg-[#E83B32]" />

              <span>
                Building a stronger tomorrow together.
              </span>

            </div>

          </div>

        </section>

        {/* =====================================================
            RIGHT SIGNUP PANEL
        ===================================================== */}

        <section className="flex min-h-screen items-center justify-center bg-[#F4F7FC] px-5 py-10 sm:px-8">

          <div className="w-full max-w-[520px]">

            {/* Mobile logo */}

            <div className="mb-8 flex justify-center lg:hidden">

              <img
                src="/dangote-logo.png"
                alt="Dangote"
                className="w-48"
              />

            </div>

            {/* Card */}

            <div className="rounded-[28px] bg-white p-7 shadow-[0_25px_70px_rgba(7,27,69,0.12)] sm:p-10">

              {/* Heading */}

              <div className="mb-7">

                <div className="mb-4 h-1 w-12 bg-[#E83B32]" />

                <h1 className="text-3xl font-bold tracking-tight text-[#10275F]">
                  Create Your Account
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Join the Dangote Conference Room
                  Booking system
                </p>

              </div>

              {/* Form */}

              <form
                onSubmit={handleSubmit}
                className="space-y-4"
              >

                {/* Full Name */}

                <div>

                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-semibold text-[#10275F]"
                  >
                    Full Name
                  </label>

                  <div className="relative">

                    <User
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#10275F]/60"
                    />

                    <input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(event) => {
                        setFormData({
                          ...formData,
                          name: event.target.value,
                        });

                        if (error) {
                          setError("");
                        }
                      }}
                      placeholder="Enter your full name"
                      required
                      autoComplete="name"
                      className="h-14 w-full rounded-xl border border-[#D5DEEF] bg-[#F8FAFD] pl-12 pr-4 text-sm text-[#10275F] outline-none transition placeholder:text-slate-400 focus:border-[#10275F] focus:bg-white focus:ring-4 focus:ring-[#10275F]/5"
                    />

                  </div>

                </div>

                {/* Work Email */}

                <div>

                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-[#10275F]"
                  >
                    Work Email
                  </label>

                  <div className="relative">

                    <Mail
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#10275F]/60"
                    />

                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(event) => {
                        setFormData({
                          ...formData,
                          email:
                            event.target.value,
                        });

                        if (error) {
                          setError("");
                        }
                      }}
                      placeholder="you@dangote.com"
                      required
                      autoComplete="email"
                      className="h-14 w-full rounded-xl border border-[#D5DEEF] bg-[#F8FAFD] pl-12 pr-4 text-sm text-[#10275F] outline-none transition placeholder:text-slate-400 focus:border-[#10275F] focus:bg-white focus:ring-4 focus:ring-[#10275F]/5"
                    />

                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    Use your official @dangote.com email address.
                  </p>

                </div>

                {/* Department */}

                <div>

                  <label
                    htmlFor="department"
                    className="mb-2 block text-sm font-semibold text-[#10275F]"
                  >
                    Department
                  </label>

                  <div className="relative">

                    <Building2
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#10275F]/60"
                    />

                    <input
                      id="department"
                      type="text"
                      value={formData.department}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          department:
                            event.target.value,
                        })
                      }
                      placeholder="e.g. Engineering"
                      className="h-14 w-full rounded-xl border border-[#D5DEEF] bg-[#F8FAFD] pl-12 pr-4 text-sm text-[#10275F] outline-none transition placeholder:text-slate-400 focus:border-[#10275F] focus:bg-white focus:ring-4 focus:ring-[#10275F]/5"
                    />

                  </div>

                </div>

                {/* Password */}

                <div>

                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-[#10275F]"
                  >
                    Password
                  </label>

                  <div className="relative">

                    <LockKeyhole
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#10275F]/60"
                    />

                    <input
                      id="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={formData.password}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          password:
                            event.target.value,
                        })
                      }
                      placeholder="Create a password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="h-14 w-full rounded-xl border border-[#D5DEEF] bg-[#F8FAFD] pl-12 pr-12 text-sm text-[#10275F] outline-none transition placeholder:text-slate-400 focus:border-[#10275F] focus:bg-white focus:ring-4 focus:ring-[#10275F]/5"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          !showPassword
                        )
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#10275F]"
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>

                  </div>

                </div>

                {/* Confirm Password */}

                <div>

                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-semibold text-[#10275F]"
                  >
                    Confirm Password
                  </label>

                  <div className="relative">

                    <LockKeyhole
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#10275F]/60"
                    />

                    <input
                      id="confirmPassword"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        formData.confirmPassword
                      }
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          confirmPassword:
                            event.target.value,
                        })
                      }
                      placeholder="Confirm your password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="h-14 w-full rounded-xl border border-[#D5DEEF] bg-[#F8FAFD] pl-12 pr-12 text-sm text-[#10275F] outline-none transition placeholder:text-slate-400 focus:border-[#10275F] focus:bg-white focus:ring-4 focus:ring-[#10275F]/5"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          !showConfirmPassword
                        )
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#10275F]"
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>

                  </div>

                </div>

                {/* Error */}

                {error && (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                    {error}
                  </div>
                )}

                {/* Success */}

                {success && (
                  <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium text-green-600">
                    {success}
                  </div>
                )}

                {/* Submit */}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="group mt-2 flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#10275F] text-sm font-bold text-white shadow-lg shadow-[#10275F]/20 transition hover:bg-[#0B2151] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                >

                  <span>
                    {isLoading
                      ? "Creating Account..."
                      : "Create Account"}
                  </span>

                  {!isLoading && (
                    <ArrowRight
                      size={19}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  )}

                </button>

              </form>

              {/* Login */}

              <p className="mt-7 text-center text-sm text-slate-500">

                Already have an account?{" "}

                <Link
                  href="/login"
                  className="font-bold text-[#10275F] hover:text-[#E83B32]"
                >
                  Sign in
                </Link>

              </p>

            </div>

            {/* Copyright */}

            <p className="mt-6 text-center text-xs text-slate-400">
              © 2026 Dangote Group. All rights reserved.
            </p>

          </div>

        </section>

      </div>

    </main>
  );
}