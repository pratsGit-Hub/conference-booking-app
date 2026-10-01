"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Mail,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

const ALLOWED_EMAIL_DOMAIN = "@dangote.com";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  /* =====================================================
     EMAIL VALIDATION
  ===================================================== */

  function isDangoteEmail(emailAddress: string) {
    return emailAddress
      .trim()
      .toLowerCase()
      .endsWith(ALLOWED_EMAIL_DOMAIN);
  }

  /* =====================================================
     FORGOT PASSWORD
  ===================================================== */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess(false);

    const normalizedEmail =
      email.trim().toLowerCase();

    /* ---------- Validate email ---------- */

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

    setIsLoading(true);

    try {
      /* =================================================
         FORGOT PASSWORD REQUEST
      ================================================= */

      const response = await fetch(
        `${API_URL}/api/auth/forgot-password`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials: "include",

          body: JSON.stringify({
            email: normalizedEmail,
          }),
        }
      );

      const data =
        await response.json();

      /* =================================================
         REQUEST FAILED
      ================================================= */

      if (!response.ok) {
        setError(
          data.message ||
            "Unable to process your request. Please try again."
        );

        return;
      }

      /* =================================================
         REQUEST SUCCESSFUL

         Backend intentionally returns a generic
         response so we don't reveal whether an
         account exists for the email.
      ================================================= */

      setSuccess(true);
    } catch (error) {
      console.error(
        "Forgot password error:",
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
                Reset your Conference Room
                Booking password securely and
                get back to managing your meetings.
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
            RIGHT FORGOT PASSWORD PANEL
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

              {!success ? (
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
                      Forgot Password?
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      Enter your official work email
                      address and we'll send you a
                      secure link to reset your password.
                    </p>

                  </div>

                  {/* Form */}

                  <form
                    onSubmit={handleSubmit}
                    className="space-y-5"
                  >

                    {/* Email */}

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
                          value={email}
                          onChange={(event) => {
                            setEmail(
                              event.target.value
                            );

                            if (error) {
                              setError("");
                            }
                          }}
                          placeholder="you@dangote.com"
                          required
                          autoComplete="email"
                          disabled={isLoading}
                          className="h-14 w-full rounded-xl border border-[#D5DEEF] bg-[#F8FAFD] pl-12 pr-4 text-sm text-[#10275F] outline-none transition placeholder:text-slate-400 focus:border-[#10275F] focus:bg-white focus:ring-4 focus:ring-[#10275F]/5 disabled:cursor-not-allowed disabled:opacity-60"
                        />

                      </div>

                      <p className="mt-2 text-xs text-slate-400">
                        Use your official @dangote.com
                        email address.
                      </p>

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
                          ? "Sending..."
                          : "Send Reset Link"}
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
                      For security, we will show the
                      same confirmation message whether
                      or not an account exists for the
                      email address.
                    </p>
                  </div>
                </>
              ) : (
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

                  {/* Success heading */}

                  <div className="mt-6 text-center">

                    <h1 className="text-3xl font-bold tracking-tight text-[#10275F]">
                      Check Your Email
                    </h1>

                    <p className="mt-4 text-sm leading-6 text-slate-500">
                      If an account exists for{" "}
                      <span className="font-semibold text-[#10275F]">
                        {email.trim().toLowerCase()}
                      </span>
                      , a password reset link has been
                      sent.
                    </p>

                  </div>

                  {/* Instructions */}

                  <div className="mt-6 rounded-xl bg-[#F4F7FC] px-5 py-4">

                    <p className="text-sm leading-6 text-slate-600">
                      Please check your inbox and follow
                      the reset link. The link will expire
                      after 15 minutes.
                    </p>

                  </div>

                  {/* Back to login */}

                  <Link
                    href="/login"
                    className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#10275F] text-sm font-bold text-white shadow-lg shadow-[#10275F]/20 transition hover:bg-[#0B2151] hover:shadow-xl"
                  >
                    <ArrowLeft size={18} />
                    Back to Login
                  </Link>

                  {/* Didn't receive email */}

                  <p className="mt-5 text-center text-xs leading-5 text-slate-400">
                    Didn't receive an email? Check your
                    spam or junk folder.
                  </p>
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