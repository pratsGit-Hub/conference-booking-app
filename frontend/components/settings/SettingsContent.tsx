"use client";

import {
  AlertCircle,
  Bell,
  Building2,
  CalendarDays,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Save,
  User,
  X,
} from "lucide-react";

import { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

/* =====================================================
   TYPES
===================================================== */

type CalendarView =
  | "DAY"
  | "WEEK"
  | "MONTH";

interface SettingsData {
  name: string;
  email: string;
  department: string;
  role: string;

  defaultLocation: string;
  defaultView: CalendarView;
  defaultDuration: string;

  bookingConfirmation: boolean;
  bookingCancellation: boolean;
  bookingReminder: boolean;
}

interface ProfileResponse {
  success: boolean;

  user?: {
    id: string;
    name: string;
    email: string;
    department?: string;
    role: "ADMIN" | "EMPLOYEE";

    defaultLocation?: string;
    defaultDuration: number;
    calendarView: CalendarView;
    timezone?: string;

    notifications?: {
      bookingConfirmation?: boolean;
      bookingCancellation?: boolean;
      bookingReminder?: boolean;
      roomAvailable?: boolean;
    };
  };

  message?: string;
}

/* =====================================================
   DEFAULT SETTINGS
===================================================== */

const defaultSettings: SettingsData = {
  name: "",
  email: "",
  department: "",
  role: "EMPLOYEE",

  defaultLocation: "",

  defaultView: "WEEK",

  defaultDuration: "1 hour",

  bookingConfirmation: true,
  bookingCancellation: true,
  bookingReminder: true,
};

/* =====================================================
   DURATION HELPERS
===================================================== */

function durationToLabel(duration: number): string {
  switch (duration) {
    case 15:
      return "15 minutes";

    case 30:
      return "30 minutes";

    case 45:
      return "45 minutes";

    case 60:
      return "1 hour";

    case 90:
      return "1.5 hours";

    case 120:
      return "2 hours";

    default:
      return `${duration} minutes`;
  }
}

function labelToDuration(value: string): number {
  switch (value) {
    case "15 minutes":
      return 15;

    case "30 minutes":
      return 30;

    case "45 minutes":
      return 45;

    case "1 hour":
      return 60;

    case "1.5 hours":
      return 90;

    case "2 hours":
      return 120;

    default: {
      const parsed = Number(
        value.replace(" minutes", "")
      );

      return Number.isFinite(parsed)
        ? parsed
        : 60;
    }
  }
}

/* =====================================================
   REUSABLE SECTION HEADER
===================================================== */

function SectionHeader({
  icon,
  title,
  description,
  iconClassName = "bg-[#EEF4FF] text-[#1D55B8]",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  iconClassName?: string;
}) {
  return (
    <div className="border-b border-[#E5ECF7] px-6 py-5 md:px-7">
      <div className="flex items-center gap-3">

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[#10275F]">
            {title}
          </h2>

          <p className="mt-0.5 text-sm text-[#64748B]">
            {description}
          </p>
        </div>

      </div>
    </div>
  );
}

/* =====================================================
   INPUT WRAPPER
===================================================== */

function InputWrapper({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#64748B]">
        {icon}
      </div>

      {children}
    </div>
  );
}

/* =====================================================
   COMPONENT
===================================================== */

export default function SettingsContent() {
  const [settings, setSettings] =
    useState<SettingsData>(
      defaultSettings
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  /* =====================================================
     CHANGE PASSWORD STATE
  ===================================================== */

  const [showPasswordModal, setShowPasswordModal] =
    useState(false);

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [passwordLoading, setPasswordLoading] =
    useState(false);

  const [passwordError, setPasswordError] =
    useState("");

  const [passwordSuccess, setPasswordSuccess] =
    useState("");

  /* =====================================================
     LOAD PROFILE
  ===================================================== */

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/users/me`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        const result: ProfileResponse =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Failed to load profile"
          );
        }

        if (!result.user) {
          throw new Error(
            "User profile was not returned"
          );
        }

        const user = result.user;

        setSettings({
          name: user.name || "",
          email: user.email || "",
          department:
            user.department || "",
          role: user.role,

          defaultLocation:
            user.defaultLocation || "",

          defaultView:
            user.calendarView || "WEEK",

          defaultDuration:
            durationToLabel(
              user.defaultDuration || 60
            ),

          bookingConfirmation:
            user.notifications
              ?.bookingConfirmation ?? true,

          bookingCancellation:
            user.notifications
              ?.bookingCancellation ?? true,

          bookingReminder:
            user.notifications
              ?.bookingReminder ?? true,
        });
      } catch (error) {
        console.error(
          "Load profile error:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load your profile."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  /* =====================================================
     UPDATE SETTING
  ===================================================== */

  function updateSetting<
    K extends keyof SettingsData
  >(
    key: K,
    value: SettingsData[K]
  ) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));

    setSaved(false);
    setSuccessMessage("");
  }

  /* =====================================================
     SAVE SETTINGS
  ===================================================== */

  async function handleSave() {
    try {
      setSaving(true);
      setSaved(false);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `${API_URL}/api/users/me`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name: settings.name.trim(),

            department:
              settings.department.trim(),

            defaultLocation:
              settings.defaultLocation.trim(),

            defaultDuration:
              labelToDuration(
                settings.defaultDuration
              ),

            calendarView:
              settings.defaultView,

            notifications: {
              bookingConfirmation:
                settings.bookingConfirmation,

              bookingCancellation:
                settings.bookingCancellation,

              bookingReminder:
                settings.bookingReminder,
            },
          }),
        }
      );

      const result: ProfileResponse =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Failed to save settings"
        );
      }

      setSaved(true);

      setSuccessMessage(
        "Your settings have been saved successfully."
      );

      setTimeout(() => {
        setSaved(false);
        setSuccessMessage("");
      }, 3000);
    } catch (error) {
      console.error(
        "Save settings error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to save your settings."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     CHANGE PASSWORD
  ===================================================== */

  function openPasswordModal() {
    setPasswordError("");
    setPasswordSuccess("");

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);

    setShowPasswordModal(true);
  }

  function closePasswordModal() {
    if (passwordLoading) {
      return;
    }

    setShowPasswordModal(false);

    setPasswordError("");
    setPasswordSuccess("");

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  }

  async function handleChangePassword(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setPasswordError("");
    setPasswordSuccess("");

    /* ---------- Client validation ---------- */

    if (!currentPassword) {
      setPasswordError(
        "Please enter your current password."
      );
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(
        "New password must be at least 8 characters."
      );
      return;
    }

    if (newPassword.length > 128) {
      setPasswordError(
        "New password cannot exceed 128 characters."
      );
      return;
    }

    if (!confirmPassword) {
      setPasswordError(
        "Please confirm your new password."
      );
      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setPasswordError(
        "New password and confirmation password do not match."
      );
      return;
    }

    if (
      currentPassword ===
      newPassword
    ) {
      setPasswordError(
        "New password must be different from your current password."
      );
      return;
    }

    try {
      setPasswordLoading(true);

      const response = await fetch(
        `${API_URL}/api/auth/change-password`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword,
          }),
        }
      );

      const result: {
        success: boolean;
        message?: string;
      } = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Unable to change password."
        );
      }

      setPasswordSuccess(
        "Password changed successfully. Redirecting to login..."
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        window.location.href =
          "/login";
      }, 1500);
    } catch (error) {
      console.error(
        "Change password error:",
        error
      );

      setPasswordError(
        error instanceof Error
          ? error.message
          : "Unable to change password."
      );
    } finally {
      setPasswordLoading(false);
    }
  }

  /* =====================================================
     LOGOUT
  ===================================================== */

  async function handleLogout() {
    try {
      await fetch(
        `${API_URL}/api/auth/logout`,
        {
          method: "POST",
          credentials: "include",
        }
      );
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    } finally {
      window.location.href =
        "/login";
    }
  }

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">

        <div className="text-center">

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
            <Loader2
              size={28}
              className="animate-spin text-[#1D55B8]"
            />
          </div>

          <p className="mt-4 text-sm font-medium text-[#64748B]">
            Loading your settings...
          </p>

        </div>

      </div>
    );
  }

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <>
      <div className="min-h-screen w-full p-5 md:p-8 lg:p-10">

        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <div className="mb-8">

          <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#E83B32]">
            Account
          </p>

          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[#10275F] md:text-4xl">
                Settings
              </h1>

              <p className="mt-2 text-[#64748B]">
                Manage your profile, booking
                preferences and notifications.
              </p>
            </div>

          </div>

        </div>

        {/* =================================================
            SETTINGS CONTENT
        ================================================= */}

        <div className="w-full space-y-6">

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">

              <AlertCircle
                size={20}
                className="mt-0.5 shrink-0"
              />

              <p>{error}</p>

            </div>
          )}

          {/* =================================================
              SUCCESS
          ================================================= */}

          {successMessage && (
            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-[#EEF4FF] px-4 py-4 text-sm font-medium text-[#17438F]">

              <Check
                size={20}
                className="mt-0.5 shrink-0"
              />

              <p>{successMessage}</p>

            </div>
          )}

          {/* =================================================
              PROFILE
          ================================================= */}

          <section className="overflow-hidden rounded-2xl border border-[#D5E2F7] bg-white shadow-sm">

            <SectionHeader
              icon={
                <User
                  size={20}
                />
              }
              title="Profile"
              description="Your account information"
            />

            <div className="grid gap-5 p-6 md:grid-cols-2 md:p-7">

              {/* Full Name */}

              <div>

                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-semibold text-[#10275F]"
                >
                  Full Name
                </label>

                <InputWrapper
                  icon={<User size={18} />}
                >
                  <input
                    id="name"
                    type="text"
                    value={settings.name}
                    onChange={(event) =>
                      updateSetting(
                        "name",
                        event.target.value
                      )
                    }
                    className="h-14 w-full rounded-xl border border-[#D5E2F7] bg-[#F6F9FF] pl-12 pr-4 text-sm text-[#10275F] outline-none transition placeholder:text-slate-400 hover:border-[#B8CCEC] focus:border-[#1D55B8] focus:bg-white focus:ring-4 focus:ring-[#1D55B8]/10"
                  />
                </InputWrapper>

              </div>

              {/* Work Email */}

              <div>

                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-[#10275F]"
                >
                  Work Email
                </label>

                <InputWrapper
                  icon={<Mail size={18} />}
                >
                  <input
                    id="email"
                    type="email"
                    value={settings.email}
                    disabled
                    className="h-14 w-full cursor-not-allowed rounded-xl border border-[#D5E2F7] bg-slate-100 pl-12 pr-4 text-sm text-[#64748B] outline-none"
                  />
                </InputWrapper>

                <p className="mt-2 text-xs text-[#64748B]">
                  Your company email cannot be
                  changed here.
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

                <InputWrapper
                  icon={<Building2 size={18} />}
                >
                  <input
                    id="department"
                    type="text"
                    value={
                      settings.department
                    }
                    onChange={(event) =>
                      updateSetting(
                        "department",
                        event.target.value
                      )
                    }
                    placeholder="e.g. Engineering"
                    className="h-14 w-full rounded-xl border border-[#D5E2F7] bg-[#F6F9FF] pl-12 pr-4 text-sm text-[#10275F] outline-none transition placeholder:text-slate-400 hover:border-[#B8CCEC] focus:border-[#1D55B8] focus:bg-white focus:ring-4 focus:ring-[#1D55B8]/10"
                  />
                </InputWrapper>

              </div>

              {/* Role */}

              <div>

                <label
                  htmlFor="role"
                  className="mb-2 block text-sm font-semibold text-[#10275F]"
                >
                  Account Role
                </label>

                <input
                  id="role"
                  type="text"
                  value={
                    settings.role ===
                    "ADMIN"
                      ? "Administrator"
                      : "Employee"
                  }
                  disabled
                  className="h-14 w-full cursor-not-allowed rounded-xl border border-[#D5E2F7] bg-slate-100 px-4 text-sm text-[#64748B] outline-none"
                />

                <p className="mt-2 text-xs text-[#64748B]">
                  Your role can only be changed
                  by an administrator.
                </p>

              </div>

            </div>

          </section>

          {/* =================================================
              BOOKING PREFERENCES
          ================================================= */}

          <section className="overflow-hidden rounded-2xl border border-[#D5E2F7] bg-white shadow-sm">

            <SectionHeader
              icon={
                <CalendarDays
                  size={20}
                />
              }
              title="Booking Preferences"
              description="Customize your default booking experience."
            />

            <div className="grid gap-5 p-6 md:grid-cols-3 md:p-7">

              {/* Default Location */}

              <div>

                <label
                  htmlFor="defaultLocation"
                  className="mb-2 block text-sm font-semibold text-[#10275F]"
                >
                  Default Location
                </label>

                <InputWrapper
                  icon={<MapPin size={18} />}
                >
                  <input
                    id="defaultLocation"
                    type="text"
                    value={
                      settings.defaultLocation
                    }
                    onChange={(event) =>
                      updateSetting(
                        "defaultLocation",
                        event.target.value
                      )
                    }
                    placeholder="Main Office"
                    className="h-14 w-full rounded-xl border border-[#D5E2F7] bg-[#F6F9FF] pl-12 pr-4 text-sm text-[#10275F] outline-none transition placeholder:text-slate-400 hover:border-[#B8CCEC] focus:border-[#1D55B8] focus:bg-white focus:ring-4 focus:ring-[#1D55B8]/10"
                  />
                </InputWrapper>

              </div>

              {/* Calendar View */}

              <div>

                <label
                  htmlFor="defaultView"
                  className="mb-2 block text-sm font-semibold text-[#10275F]"
                >
                  Default Calendar View
                </label>

                <select
                  id="defaultView"
                  value={
                    settings.defaultView
                  }
                  onChange={(event) =>
                    updateSetting(
                      "defaultView",
                      event.target
                        .value as CalendarView
                    )
                  }
                  className="h-14 w-full rounded-xl border border-[#D5E2F7] bg-[#F6F9FF] px-4 text-sm font-medium text-[#10275F] outline-none transition hover:border-[#B8CCEC] focus:border-[#1D55B8] focus:bg-white focus:ring-4 focus:ring-[#1D55B8]/10"
                >
                  <option value="DAY">
                    Day
                  </option>

                  <option value="WEEK">
                    Week
                  </option>

                  <option value="MONTH">
                    Month
                  </option>
                </select>

              </div>

              {/* Duration */}

              <div>

                <label
                  htmlFor="defaultDuration"
                  className="mb-2 block text-sm font-semibold text-[#10275F]"
                >
                  Default Duration
                </label>

                <select
                  id="defaultDuration"
                  value={
                    settings.defaultDuration
                  }
                  onChange={(event) =>
                    updateSetting(
                      "defaultDuration",
                      event.target.value
                    )
                  }
                  className="h-14 w-full rounded-xl border border-[#D5E2F7] bg-[#F6F9FF] px-4 text-sm font-medium text-[#10275F] outline-none transition hover:border-[#B8CCEC] focus:border-[#1D55B8] focus:bg-white focus:ring-4 focus:ring-[#1D55B8]/10"
                >
                  <option>
                    15 minutes
                  </option>

                  <option>
                    30 minutes
                  </option>

                  <option>
                    45 minutes
                  </option>

                  <option>
                    1 hour
                  </option>

                  <option>
                    1.5 hours
                  </option>

                  <option>
                    2 hours
                  </option>
                </select>

              </div>

            </div>

          </section>

          {/* =================================================
              NOTIFICATIONS
          ================================================= */}

          <section className="overflow-hidden rounded-2xl border border-[#D5E2F7] bg-white shadow-sm">

            <SectionHeader
              icon={
                <Bell size={20} />
              }
              title="Notifications"
              description="Choose which booking notifications you receive."
              iconClassName="bg-[#EEF4FF] text-[#1D55B8]"
            />

            <div className="divide-y divide-[#E5ECF7]">

              {/* Confirmation */}

              <label className="flex cursor-pointer items-center justify-between gap-5 px-6 py-5 transition hover:bg-[#F8FAFF] md:px-7">

                <div className="min-w-0">

                  <p className="font-semibold text-[#10275F]">
                    Booking Confirmation
                  </p>

                  <p className="mt-1 text-sm text-[#64748B]">
                    Receive a notification when a
                    booking is successfully created.
                  </p>

                </div>

                <input
                  type="checkbox"
                  checked={
                    settings.bookingConfirmation
                  }
                  onChange={(event) =>
                    updateSetting(
                      "bookingConfirmation",
                      event.target.checked
                    )
                  }
                  className="h-5 w-5 shrink-0 cursor-pointer accent-[#1D55B8]"
                />

              </label>

              {/* Cancellation */}

              <label className="flex cursor-pointer items-center justify-between gap-5 px-6 py-5 transition hover:bg-[#F8FAFF] md:px-7">

                <div className="min-w-0">

                  <p className="font-semibold text-[#10275F]">
                    Booking Cancellation
                  </p>

                  <p className="mt-1 text-sm text-[#64748B]">
                    Receive a notification when a
                    booking is cancelled.
                  </p>

                </div>

                <input
                  type="checkbox"
                  checked={
                    settings.bookingCancellation
                  }
                  onChange={(event) =>
                    updateSetting(
                      "bookingCancellation",
                      event.target.checked
                    )
                  }
                  className="h-5 w-5 shrink-0 cursor-pointer accent-[#1D55B8]"
                />

              </label>

              {/* Reminder */}

              <label className="flex cursor-pointer items-center justify-between gap-5 px-6 py-5 transition hover:bg-[#F8FAFF] md:px-7">

                <div className="min-w-0">

                  <p className="font-semibold text-[#10275F]">
                    Booking Reminder
                  </p>

                  <p className="mt-1 text-sm text-[#64748B]">
                    Receive reminders before your
                    upcoming meetings.
                  </p>

                </div>

                <input
                  type="checkbox"
                  checked={
                    settings.bookingReminder
                  }
                  onChange={(event) =>
                    updateSetting(
                      "bookingReminder",
                      event.target.checked
                    )
                  }
                  className="h-5 w-5 shrink-0 cursor-pointer accent-[#1D55B8]"
                />

              </label>

            </div>

          </section>

          {/* =================================================
              SECURITY
          ================================================= */}

          <section className="overflow-hidden rounded-2xl border border-[#D5E2F7] bg-white shadow-sm">

            <SectionHeader
              icon={
                <Lock size={20} />
              }
              title="Security"
              description="Manage your account security."
              iconClassName="bg-[#F6F9FF] text-[#10275F]"
            />

            <div className="flex flex-col gap-4 p-6 md:p-7">

              <div>

                <p className="text-sm font-semibold text-[#10275F]">
                  Password
                </p>

                <p className="mt-1 text-sm text-[#64748B]">
                  Change your account password regularly
                  to keep your account secure.
                </p>

              </div>

              <div>

                <button
                  type="button"
                  onClick={
                    openPasswordModal
                  }
                  className="rounded-xl border border-[#D5E2F7] bg-white px-5 py-3 text-sm font-semibold text-[#10275F] transition hover:border-[#B8CCEC] hover:bg-[#EEF4FF] hover:text-[#1D55B8]"
                >
                  Change Password
                </button>

              </div>

            </div>

          </section>

          {/* =================================================
              ACTIONS
          ================================================= */}

          <div className="flex flex-col gap-3 pb-6 sm:flex-row sm:items-center sm:justify-between">

            <button
              type="button"
              onClick={handleLogout}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[#F5B9B5] bg-white px-5 text-sm font-semibold text-[#E83B32] transition hover:bg-[#FFF3F2]"
            >
              <LogOut size={18} />

              Logout
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="
                flex
                h-12
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-[#102D72]
                px-7
                text-sm
                font-bold
                text-white
                shadow-lg
                shadow-[#102D72]/20
                transition
                hover:bg-[#0C245C]
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >

              {saving ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />

                  Saving...
                </>
              ) : saved ? (
                <>
                  <Check size={18} />

                  Saved
                </>
              ) : (
                <>
                  <Save size={18} />

                  Save Changes
                </>
              )}

            </button>

          </div>

        </div>

      </div>

      {/* =====================================================
          CHANGE PASSWORD MODAL
      ===================================================== */}

      {showPasswordModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#071B45]/60 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closePasswordModal();
            }
          }}
        >

          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#D5E2F7] bg-white p-6 shadow-2xl md:p-7"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            {/* Modal Header */}

            <div className="mb-6 flex items-start justify-between gap-4">

              <div>

                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D55B8]">
                  <Lock size={21} />
                </div>

                <h2 className="text-xl font-bold text-[#10275F]">
                  Change Password
                </h2>

                <p className="mt-1 text-sm text-[#64748B]">
                  Update your account password.
                </p>

              </div>

              <button
                type="button"
                onClick={
                  closePasswordModal
                }
                disabled={passwordLoading}
                aria-label="Close"
                className="rounded-lg p-2 text-[#64748B] transition hover:bg-[#EEF4FF] hover:text-[#10275F] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={20} />
              </button>

            </div>

            {/* Password Form */}

            <form
              onSubmit={
                handleChangePassword
              }
              className="space-y-5"
            >

              {/* Current Password */}

              <div>

                <label
                  htmlFor="currentPassword"
                  className="mb-2 block text-sm font-semibold text-[#10275F]"
                >
                  Current Password
                </label>

                <div className="relative">

                  <input
                    id="currentPassword"
                    type={
                      showCurrentPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      currentPassword
                    }
                    onChange={(event) =>
                      setCurrentPassword(
                        event.target.value
                      )
                    }
                    autoComplete="current-password"
                    placeholder="Enter your current password"
                    disabled={
                      passwordLoading
                    }
                    className="h-13 w-full rounded-xl border border-[#D5E2F7] bg-[#F6F9FF] px-4 pr-12 text-sm text-[#10275F] outline-none transition placeholder:text-slate-400 hover:border-[#B8CCEC] focus:border-[#1D55B8] focus:bg-white focus:ring-4 focus:ring-[#1D55B8]/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowCurrentPassword(
                        (value) =>
                          !value
                      )
                    }
                    disabled={
                      passwordLoading
                    }
                    aria-label={
                      showCurrentPassword
                        ? "Hide current password"
                        : "Show current password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#64748B] transition hover:bg-[#EEF4FF] hover:text-[#10275F] disabled:opacity-50"
                  >
                    {showCurrentPassword ? (
                      <EyeOff
                        size={18}
                      />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>

                </div>

              </div>

              {/* New Password */}

              <div>

                <label
                  htmlFor="newPassword"
                  className="mb-2 block text-sm font-semibold text-[#10275F]"
                >
                  New Password
                </label>

                <div className="relative">

                  <input
                    id="newPassword"
                    type={
                      showNewPassword
                        ? "text"
                        : "password"
                    }
                    value={newPassword}
                    onChange={(event) =>
                      setNewPassword(
                        event.target.value
                      )
                    }
                    autoComplete="new-password"
                    placeholder="Enter your new password"
                    disabled={
                      passwordLoading
                    }
                    className="h-13 w-full rounded-xl border border-[#D5E2F7] bg-[#F6F9FF] px-4 pr-12 text-sm text-[#10275F] outline-none transition placeholder:text-slate-400 hover:border-[#B8CCEC] focus:border-[#1D55B8] focus:bg-white focus:ring-4 focus:ring-[#1D55B8]/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowNewPassword(
                        (value) =>
                          !value
                      )
                    }
                    disabled={
                      passwordLoading
                    }
                    aria-label={
                      showNewPassword
                        ? "Hide new password"
                        : "Show new password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#64748B] transition hover:bg-[#EEF4FF] hover:text-[#10275F] disabled:opacity-50"
                  >
                    {showNewPassword ? (
                      <EyeOff
                        size={18}
                      />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>

                </div>

                <p className="mt-2 text-xs text-[#64748B]">
                  Password must contain 8 to 128
                  characters.
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

                  <input
                    id="confirmPassword"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      confirmPassword
                    }
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value
                      )
                    }
                    autoComplete="new-password"
                    placeholder="Confirm your new password"
                    disabled={
                      passwordLoading
                    }
                    className="h-13 w-full rounded-xl border border-[#D5E2F7] bg-[#F6F9FF] px-4 pr-12 text-sm text-[#10275F] outline-none transition placeholder:text-slate-400 hover:border-[#B8CCEC] focus:border-[#1D55B8] focus:bg-white focus:ring-4 focus:ring-[#1D55B8]/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (value) =>
                          !value
                      )
                    }
                    disabled={
                      passwordLoading
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirmation password"
                        : "Show confirmation password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#64748B] transition hover:bg-[#EEF4FF] hover:text-[#10275F] disabled:opacity-50"
                  >
                    {showConfirmPassword ? (
                      <EyeOff
                        size={18}
                      />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>

                </div>

              </div>

              {/* Password Error */}

              {passwordError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0"
                  />

                  <p>
                    {passwordError}
                  </p>

                </div>
              )}

              {/* Password Success */}

              {passwordSuccess && (
                <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-[#EEF4FF] px-4 py-3 text-sm text-[#17438F]">

                  <Check
                    size={18}
                    className="mt-0.5 shrink-0"
                  />

                  <p>
                    {passwordSuccess}
                  </p>

                </div>
              )}

              {/* Modal Actions */}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={
                    closePasswordModal
                  }
                  disabled={
                    passwordLoading
                  }
                  className="h-12 rounded-xl border border-[#D5E2F7] px-5 text-sm font-semibold text-[#10275F] transition hover:bg-[#EEF4FF] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    passwordLoading
                  }
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#102D72] px-5 text-sm font-bold text-white shadow-lg shadow-[#102D72]/20 transition hover:bg-[#0C245C] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />

                      Changing...
                    </>
                  ) : (
                    <>
                      <Lock size={17} />

                      Change Password
                    </>
                  )}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}
    </>
  );
}