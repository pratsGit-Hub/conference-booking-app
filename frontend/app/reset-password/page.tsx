"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();

  const token = searchParams.get("token");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const [invalidToken, setInvalidToken] =
    useState(false);

  /* =====================================================
     CHECK RESET TOKEN
  ===================================================== */

  useEffect(() => {
    if (!token) {
      setInvalidToken(true);
    }
  }, [token]);

  /* =====================================================
     RESET PASSWORD
  ===================================================== */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    /* ---------- Check token ---------- */

    if (!token) {
      setInvalidToken(true);

      setError(
        "This password reset link is invalid or incomplete."
      );

      return;
    }

    /* ---------- Validate password ---------- */

    if (newPassword.length < 8) {
      setError(
        "Password must be at least 8 characters long."
      );

      return;
    }

    if (newPassword.length > 128) {
      setError(
        "Password cannot exceed 128 characters."
      );

      return;
    }

    /* ---------- Confirm password ---------- */

    if (
      newPassword !==
      confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );

      return;
    }

    setIsLoading(true);

    try {
      /* =================================================
         RESET PASSWORD REQUEST
      ================================================= */

      const response = await fetch(
        `${API_URL}/api/auth/reset-password`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials: "include",

          body: JSON.stringify({
            token,
            newPassword,
            confirmPassword,
          }),
        }
      );

      const data =
        await response.json();

      /* =================================================
         RESET FAILED
      ================================================= */

      if (!response.ok) {
        setError(
          data.message ||
            "Unable to reset your password. Please try again."
        );

        return;
      }

      /* =================================================
         RESET SUCCESSFUL
      ================================================= */

      setSuccess(true);
    } catch (error) {
      console.error(
        "Reset password error:",
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
                Secure.
                <br />
                Simple.
                <br />
                Reliable.
              </h2>

              <p className="mt-7 max-w-sm text-lg leading-8 text-blue-100/80">
                Create a new password and securely
                regain access to your Conference Room
                Booking account.
              </p>

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
            RIGHT RESET PASSWORD PANEL
        ===================================================== */}

        <section className="flex min-h-screen items-center justify-center bg-[#F4F7FC] px-5 py-10 sm:px-8">

          <div className="w-full max-w-[480px]">

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

              {success ? (
                <>
                  {/* Success icon */}

                  <div className="flex justify-center">

                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                      <CheckCircle2
                        size={34}
                        className="text-green-600"
                      />
                    </div>

                  </div>

                  {/* Success message */}

                  <div className="mt-6 text-center">

                    <h1 className="text-3xl font-bold tracking-tight text-[#10275F]">
                      Password Reset
                    </h1>

                    <p className="mt-4 text-sm leading-6 text-slate-500">
                      Your password has been reset
                      successfully.
                    </p>

                  </div>

                  <div className="mt-6 rounded-xl bg-[#F4F7FC] px-5 py-4">
                    <p className="text-sm leading-6 text-slate-600">
                      You can now sign in using your
                      new password.
                    </p>
                  </div>

                  {/* Login button */}

                  <Link
                    href="/login"
                    className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#10275F] text-sm font-bold text-white shadow-lg shadow-[#10275F]/20 transition hover:bg-[#0B2151] hover:shadow-xl"
                  >
                    Go to Login
                    <ArrowRight size={18} />
                  </Link>
                </>
              ) : invalidToken ? (
                <>
                  {/* Invalid token */}

                  <div className="flex justify-center">

                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                      <LockKeyhole
                        size={30}
                        className="text-[#E83B32]"
                      />
                    </div>

                  </div>

                  <div className="mt-6 text-center">

                    <h1 className="text-3xl font-bold tracking-tight text-[#10275F]">
                      Invalid Reset Link
                    </h1>

                    <p className="mt-4 text-sm leading-6 text-slate-500">
                      This password reset link is
                      invalid or has expired.
                    </p>

                  </div>

                  <div className="mt-6 rounded-xl bg-[#F4F7FC] px-5 py-4">
                    <p className="text-sm leading-6 text-slate-600">
                      Please request a new password
                      reset link and try again.
                    </p>
                  </div>

                  {/* Request new link */}

                  <Link
                    href="/forgot-password"
                    className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#10275F] text-sm font-bold text-white shadow-lg shadow-[#10275F]/20 transition hover:bg-[#0B2151] hover:shadow-xl"
                  >
                    Request New Reset Link
                    <ArrowRight size={18} />
                  </Link>

                  {/* Login */}

                  <Link
                    href="/login"
                    className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-[#10275F] hover:text-[#E83B32]"
                  >
                    <ArrowLeft size={16} />
                    Back to Login
                  </Link>
                </>
              ) : (
                <>
                  {/* Back to login */}

                  <Link
                    href="/login"
                    className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-[#10275F] transition hover:text-[#E83B32]"
                  >
                    <ArrowLeft size={17} />
                    Back to Login
                  </Link>

                  {/* Heading */}

                  <div className="mb-8">

                    <div className="mb-4 h-1 w-12 bg-[#E83B32]" />

                    <h1 className="text-3xl font-bold tracking-tight text-[#10275F]">
                      Reset Password
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      Create a new password for your
                      Conference Room Booking account.
                    </p>

                  </div>

                  {/* Form */}

                  <form
                    onSubmit={handleSubmit}
                    className="space-y-5"
                  >

                    {/* New Password */}

                    <div>

                      <label
                        htmlFor="newPassword"
                        className="mb-2 block text-sm font-semibold text-[#10275F]"
                      >
                        New Password
                      </label>

                      <div className="relative">

                        <LockKeyhole
                          size={18}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-[#10275F]/60"
                        />

                        <input
                          id="newPassword"
                          type={
                            showNewPassword
                              ? "text"
                              : "password"
                          }
                          value={newPassword}
                          onChange={(event) => {
                            setNewPassword(
                              event.target.value
                            );

                            if (error) {
                              setError("");
                            }
                          }}
                          placeholder="Enter new password"
                          required
                          minLength={8}
                          maxLength={128}
                          autoComplete="new-password"
                          disabled={isLoading}
                          className="h-14 w-full rounded-xl border border-[#D5DEEF] bg-[#F8FAFD] pl-12 pr-12 text-sm text-[#10275F] outline-none transition placeholder:text-slate-400 focus:border-[#10275F] focus:bg-white focus:ring-4 focus:ring-[#10275F]/5 disabled:cursor-not-allowed disabled:opacity-60"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowNewPassword(
                              !showNewPassword
                            )
                          }
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#10275F]"
                          aria-label={
                            showNewPassword
                              ? "Hide new password"
                              : "Show new password"
                          }
                        >
                          {showNewPassword ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>

                      </div>

                      <p className="mt-2 text-xs text-slate-400">
                        Password must be between 8 and
                        128 characters.
                      </p>

                    </div>

                    {/* Confirm Password */}

                    <div>

                      <label
                        htmlFor="confirmPassword"
                        className="mb-2 block text-sm font-semibold text-[#10275F]"
                      >
                        Confirm New Password
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
                          value={confirmPassword}
                          onChange={(event) => {
                            setConfirmPassword(
                              event.target.value
                            );

                            if (error) {
                              setError("");
                            }
                          }}
                          placeholder="Confirm new password"
                          required
                          minLength={8}
                          maxLength={128}
                          autoComplete="new-password"
                          disabled={isLoading}
                          className="h-14 w-full rounded-xl border border-[#D5DEEF] bg-[#F8FAFD] pl-12 pr-12 text-sm text-[#10275F] outline-none transition placeholder:text-slate-400 focus:border-[#10275F] focus:bg-white focus:ring-4 focus:ring-[#10275F]/5 disabled:cursor-not-allowed disabled:opacity-60"
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
                              ? "Hide confirmed password"
                              : "Show confirmed password"
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

                    {/* Submit */}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="group flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#10275F] text-sm font-bold text-white shadow-lg shadow-[#10275F]/20 transition hover:bg-[#0B2151] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                    >

                      <span>
                        {isLoading
                          ? "Resetting Password..."
                          : "Reset Password"}
                      </span>

                      {!isLoading && (
                        <ArrowRight
                          size={19}
                          className="transition-transform group-hover:translate-x-1"
                        />
                      )}

                    </button>

                  </form>

                  {/* Security note */}

                  <div className="mt-6 rounded-xl bg-[#F4F7FC] px-4 py-3">

                    <p className="text-xs leading-5 text-slate-500">
                      For your security, your reset link
                      can only be used once and expires
                      after 15 minutes.
                    </p>

                  </div>
                </>
              )}

            </div>

            {/* Footer */}

            <p className="mt-6 text-center text-xs text-slate-400">
              © 2026 Dangote Group. All rights reserved.
            </p>

          </div>

        </section>

      </div>
    </main>
  );
}