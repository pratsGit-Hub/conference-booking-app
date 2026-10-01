"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
  Loader2,
  AlertCircle,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

/* =====================================================
   RESET PASSWORD CONTENT
===================================================== */

function ResetPasswordContent() {
  const searchParams = useSearchParams();

  const token = searchParams.get("token");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  /* =====================================================
     SUBMIT
  ===================================================== */

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!token) {
      setError(
        "This password reset link is invalid or incomplete."
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters long."
      );
      return;
    }

    if (password.length > 128) {
      setError(
        "Password cannot be longer than 128 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(
        `${API_URL}/api/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            token,
            newPassword: password,
            confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to reset your password."
        );
      }

      setSuccess(true);
    } catch (error) {
      console.error(
        "Reset password error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to reset your password."
      );
    } finally {
      setIsLoading(false);
    }
  }

  /* =====================================================
     INVALID TOKEN
  ===================================================== */

  if (!token) {
    return (
      <div className="min-h-screen bg-[#F4F7FC]">

        <div className="flex min-h-screen">

          {/* LEFT */}

          <div className="relative hidden w-1/2 overflow-hidden bg-[#102D72] lg:flex">

            <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#193B88]" />

            <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-[#0C245C]" />

            <div className="relative z-10 flex w-full flex-col justify-between p-16">

              <div>
                <div className="inline-flex items-center justify-center bg-[#18367F] px-10 py-7">
                  <span className="text-2xl font-black tracking-tight text-white">
                    DANGOTE
                  </span>
                </div>

                <div className="mt-28">

                  <div className="mb-7 h-1 w-14 bg-[#E83B32]" />

                  <h1 className="max-w-lg text-6xl font-bold leading-[1.05] text-white">
                    Secure.
                    <br />
                    Simple.
                    <br />
                    Reliable.
                  </h1>

                  <p className="mt-8 max-w-md text-lg leading-8 text-blue-100">
                    Reset your Conference Room
                    Booking password securely
                    and get back to managing
                    your meetings.
                  </p>

                </div>
              </div>

              <div className="flex items-center gap-3 text-sm text-blue-200">
                <span className="h-6 w-1 bg-[#E83B32]" />
                Building a stronger tomorrow together.
              </div>

            </div>

          </div>

          {/* RIGHT */}

          <div className="flex min-h-screen w-full items-center justify-center p-6 lg:w-1/2 lg:p-12">

            <div className="w-full max-w-lg">

              <div className="rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(16,45,114,0.12)] md:p-10">

                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#102D72] transition hover:text-[#E83B32]"
                >
                  <ArrowLeft size={17} />
                  Back to Login
                </Link>

                <div className="mt-8">

                  <div className="mb-5 h-1 w-12 bg-[#E83B32]" />

                  <h2 className="text-3xl font-bold tracking-tight text-[#102D72]">
                    Invalid Reset Link
                  </h2>

                  <p className="mt-3 leading-7 text-[#64748B]">
                    This password reset link is
                    missing or invalid. Please
                    request a new password reset
                    link.
                  </p>

                </div>

                <Link
                  href="/forgot-password"
                  className="
                    mt-8
                    inline-flex
                    h-12
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-[#102D72]
                    px-5
                    text-sm
                    font-bold
                    text-white
                    shadow-lg
                    transition
                    hover:bg-[#0C245C]
                  "
                >
                  Request New Reset Link
                  <ArrowRight size={17} />
                </Link>

              </div>

              <p className="mt-7 text-center text-xs text-[#94A3B8]">
                © 2026 Dangote Group. All rights reserved.
              </p>

            </div>

          </div>

        </div>

      </div>
    );
  }

  /* =====================================================
     SUCCESS
  ===================================================== */

  if (success) {
    return (
      <div className="min-h-screen bg-[#F4F7FC]">

        <div className="flex min-h-screen">

          {/* LEFT */}

          <div className="relative hidden w-1/2 overflow-hidden bg-[#102D72] lg:flex">

            <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#193B88]" />

            <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-[#0C245C]" />

            <div className="relative z-10 flex w-full flex-col justify-between p-16">

              <div>
                <div className="inline-flex items-center justify-center bg-[#18367F] px-10 py-7">
                  <span className="text-2xl font-black tracking-tight text-white">
                    DANGOTE
                  </span>
                </div>

                <div className="mt-28">

                  <div className="mb-7 h-1 w-14 bg-[#E83B32]" />

                  <h1 className="max-w-lg text-6xl font-bold leading-[1.05] text-white">
                    Secure.
                    <br />
                    Simple.
                    <br />
                    Reliable.
                  </h1>

                  <p className="mt-8 max-w-md text-lg leading-8 text-blue-100">
                    Your account security is
                    important to us.
                  </p>

                </div>
              </div>

              <div className="flex items-center gap-3 text-sm text-blue-200">
                <span className="h-6 w-1 bg-[#E83B32]" />
                Building a stronger tomorrow together.
              </div>

            </div>

          </div>

          {/* RIGHT */}

          <div className="flex min-h-screen w-full items-center justify-center p-6 lg:w-1/2 lg:p-12">

            <div className="w-full max-w-lg">

              <div className="rounded-3xl bg-white p-8 text-center shadow-[0_20px_60px_rgba(16,45,114,0.12)] md:p-10">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-green-600">
                  <CheckCircle2 size={34} />
                </div>

                <h2 className="mt-6 text-3xl font-bold tracking-tight text-[#102D72]">
                  Password Reset Successfully
                </h2>

                <p className="mt-3 leading-7 text-[#64748B]">
                  Your password has been updated.
                  You can now sign in using your
                  new password.
                </p>

                <Link
                  href="/login"
                  className="
                    mt-8
                    inline-flex
                    h-12
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-[#102D72]
                    px-5
                    text-sm
                    font-bold
                    text-white
                    shadow-lg
                    transition
                    hover:bg-[#0C245C]
                  "
                >
                  Back to Login
                  <ArrowRight size={17} />
                </Link>

              </div>

              <p className="mt-7 text-center text-xs text-[#94A3B8]">
                © 2026 Dangote Group. All rights reserved.
              </p>

            </div>

          </div>

        </div>

      </div>
    );
  }

  /* =====================================================
     RESET FORM
  ===================================================== */

  return (
    <div className="min-h-screen bg-[#F4F7FC]">

      <div className="flex min-h-screen">

        {/* LEFT */}

        <div className="relative hidden w-1/2 overflow-hidden bg-[#102D72] lg:flex">

          <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#193B88]" />

          <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-[#0C245C]" />

          <div className="relative z-10 flex w-full flex-col justify-between p-16">

            <div>

              <div className="inline-flex items-center justify-center bg-[#18367F] px-10 py-7">
                <span className="text-2xl font-black tracking-tight text-white">
                  DANGOTE
                </span>
              </div>

              <div className="mt-28">

                <div className="mb-7 h-1 w-14 bg-[#E83B32]" />

                <h1 className="max-w-lg text-6xl font-bold leading-[1.05] text-white">
                  Secure.
                  <br />
                  Simple.
                  <br />
                  Reliable.
                </h1>

                <p className="mt-8 max-w-md text-lg leading-8 text-blue-100">
                  Create a new secure password
                  and get back to managing your
                  meetings.
                </p>

              </div>

            </div>

            <div className="flex items-center gap-3 text-sm text-blue-200">
              <span className="h-6 w-1 bg-[#E83B32]" />
              Building a stronger tomorrow together.
            </div>

          </div>

        </div>

        {/* RIGHT */}

        <div className="flex min-h-screen w-full items-center justify-center p-6 lg:w-1/2 lg:p-12">

          <div className="w-full max-w-lg">

            <div className="rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(16,45,114,0.12)] md:p-10">

              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#102D72] transition hover:text-[#E83B32]"
              >
                <ArrowLeft size={17} />
                Back to Login
              </Link>

              <div className="mt-8">

                <div className="mb-5 h-1 w-12 bg-[#E83B32]" />

                <h2 className="text-3xl font-bold tracking-tight text-[#102D72]">
                  Reset Password
                </h2>

                <p className="mt-3 leading-7 text-[#64748B]">
                  Enter a new password for your
                  Conference Room Booking account.
                </p>

              </div>

              {/* ERROR */}

              {error && (

                <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">

                  <AlertCircle
                    size={19}
                    className="mt-0.5 shrink-0 text-[#E83B32]"
                  />

                  <p>{error}</p>

                </div>

              )}

              <form
                onSubmit={handleSubmit}
                className="mt-7 space-y-5"
              >

                {/* PASSWORD */}

                <div>

                  <label
                    htmlFor="new-password"
                    className="mb-2 block text-sm font-bold text-[#10275F]"
                  >
                    New Password
                  </label>

                  <div className="relative">

                    <LockKeyhole
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#1D55B8]"
                    />

                    <input
                      id="new-password"
                      type="password"
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value
                        )
                      }
                      disabled={isLoading}
                      minLength={8}
                      maxLength={128}
                      autoComplete="new-password"
                      placeholder="Enter new password"
                      className="
                        h-12
                        w-full
                        rounded-xl
                        border
                        border-[#D5E2F7]
                        bg-white
                        pl-11
                        pr-4
                        text-sm
                        font-medium
                        text-[#10275F]
                        outline-none
                        transition
                        placeholder:text-[#94A3B8]
                        focus:border-[#1D55B8]
                        focus:ring-4
                        focus:ring-[#1D55B8]/10
                        disabled:cursor-not-allowed
                        disabled:bg-slate-50
                      "
                    />

                  </div>

                  <p className="mt-2 text-xs text-[#64748B]">
                    Use 8–128 characters.
                  </p>

                </div>

                {/* CONFIRM PASSWORD */}

                <div>

                  <label
                    htmlFor="confirm-password"
                    className="mb-2 block text-sm font-bold text-[#10275F]"
                  >
                    Confirm New Password
                  </label>

                  <div className="relative">

                    <LockKeyhole
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#1D55B8]"
                    />

                    <input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(
                          event.target.value
                        )
                      }
                      disabled={isLoading}
                      minLength={8}
                      maxLength={128}
                      autoComplete="new-password"
                      placeholder="Confirm new password"
                      className="
                        h-12
                        w-full
                        rounded-xl
                        border
                        border-[#D5E2F7]
                        bg-white
                        pl-11
                        pr-4
                        text-sm
                        font-medium
                        text-[#10275F]
                        outline-none
                        transition
                        placeholder:text-[#94A3B8]
                        focus:border-[#1D55B8]
                        focus:ring-4
                        focus:ring-[#1D55B8]/10
                        disabled:cursor-not-allowed
                        disabled:bg-slate-50
                      "
                    />

                  </div>

                </div>

                {/* SUBMIT */}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="
                    inline-flex
                    h-12
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-[#102D72]
                    px-5
                    text-sm
                    font-bold
                    text-white
                    shadow-lg
                    transition
                    hover:bg-[#0C245C]
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >

                  {isLoading ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Resetting Password...
                    </>
                  ) : (
                    <>
                      Reset Password
                      <ArrowRight size={17} />
                    </>
                  )}

                </button>

              </form>

            </div>

            <p className="mt-7 text-center text-xs text-[#94A3B8]">
              © 2026 Dangote Group. All rights reserved.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}

/* =====================================================
   PAGE
===================================================== */

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F4F7FC]">
          <div className="flex flex-col items-center gap-3 text-[#64748B]">
            <Loader2
              size={30}
              className="animate-spin text-[#1D55B8]"
            />

            <p className="text-sm font-medium">
              Loading password reset...
            </p>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}