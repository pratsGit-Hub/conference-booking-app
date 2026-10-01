import "dotenv/config";
import nodemailer from "nodemailer";

import { Booking } from "../models/Booking.js";
import { User } from "../models/User.js";

/* =====================================================
   EMAIL CONFIGURATION
===================================================== */

const SMTP_HOST =
  process.env.SMTP_HOST || "";

const SMTP_PORT =
  Number(process.env.SMTP_PORT) || 587;

const SMTP_SECURE =
  process.env.SMTP_SECURE === "true";

const SMTP_USER =
  process.env.SMTP_USER || "";

const SMTP_PASS =
  process.env.SMTP_PASS || "";

const EMAIL_FROM =
  process.env.EMAIL_FROM ||
  SMTP_USER;

/* =====================================================
   TRANSPORTER
===================================================== */

const transporter =
  SMTP_HOST &&
  SMTP_USER &&
  SMTP_PASS
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,

        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      })
    : null;

/* =====================================================
   TYPES
===================================================== */

interface PopulatedBooking {
  _id: unknown;

  title: string;

  date: string;

  startTime: string;

  endTime: string;

  description?: string;

  status: string;

  user:
    | {
        _id: unknown;

        name: string;

        email: string;

        notifications?: {
          bookingConfirmation?: boolean;
          bookingCancellation?: boolean;
          bookingReminder?: boolean;
        };
      }
    | null;

  room:
    | {
        _id: unknown;

        name: string;

        location: string;
      }
    | null;
}

/* =====================================================
   EMAIL ENABLED CHECK
===================================================== */

export function isEmailConfigured(): boolean {
  return Boolean(transporter);
}

/* =====================================================
   VERIFY SMTP CONNECTION
===================================================== */

export async function verifyEmailConnection(): Promise<void> {
  if (!transporter) {
    console.warn(
      "Email service is not configured. SMTP credentials are missing."
    );

    return;
  }

  try {
    await transporter.verify();

    console.log(
      `SMTP connection verified successfully for ${SMTP_USER}`
    );
  } catch (error) {
    console.error(
      "SMTP connection verification failed:",
      error
    );
  }
}

/* =====================================================
   FORMAT DATE
===================================================== */

function formatBookingDate(
  dateString: string
): string {
  const [year, month, day] =
    dateString
      .split("-")
      .map(Number);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  return date.toLocaleDateString(
    "en-IN",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }
  );
}

/* =====================================================
   HTML ESCAPE
===================================================== */

function escapeHtml(
  value: string
): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =====================================================
   SEND EMAIL
===================================================== */

async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  if (!transporter) {
    console.warn(
      "Email is not configured. Skipping email:",
      subject
    );

    return;
  }

  await transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    text,
    html,
  });
}

/* =====================================================
   PASSWORD RESET EMAIL
===================================================== */

export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: {
  to: string;
  name: string;
  resetUrl: string;
}): Promise<void> {
  try {
    if (!transporter) {
      console.warn(
        "Email is not configured. Skipping password reset email."
      );

      return;
    }

    const safeName =
      escapeHtml(name || "Employee");

    const safeResetUrl =
      escapeHtml(resetUrl);

    const subject =
      "Reset Your Conference Room Booking Password";

    const html = `
      <div
        style="
          font-family: Arial, sans-serif;
          background:#f5f7f9;
          padding:32px;
        "
      >
        <div
          style="
            max-width:650px;
            margin:auto;
            background:white;
            border-radius:12px;
            overflow:hidden;
            border:1px solid #e5e7eb;
          "
        >

          <!-- HEADER -->

          <div
            style="
              background:#10275F;
              padding:24px;
            "
          >
            <h1
              style="
                margin:0;
                color:white;
                font-size:24px;
              "
            >
              Password Reset
            </h1>
          </div>

          <!-- CONTENT -->

          <div style="padding:30px;">

            <p
              style="
                font-size:16px;
                color:#333;
              "
            >
              Hello ${safeName},
            </p>

            <p
              style="
                font-size:15px;
                line-height:1.6;
                color:#555;
              "
            >
              We received a request to reset your
              Conference Room Booking account password.
            </p>

            <p
              style="
                font-size:15px;
                line-height:1.6;
                color:#555;
              "
            >
              Click the button below to create a new password.
            </p>

            <!-- RESET BUTTON -->

            <div
              style="
                text-align:center;
                margin:30px 0;
              "
            >
              <a
                href="${safeResetUrl}"
                style="
                  display:inline-block;
                  background:#10275F;
                  color:white;
                  text-decoration:none;
                  padding:14px 26px;
                  border-radius:10px;
                  font-weight:bold;
                  font-size:15px;
                "
              >
                Reset Password
              </a>
            </div>

            <!-- EXPIRY -->

            <p
              style="
                font-size:14px;
                line-height:1.6;
                color:#666;
              "
            >
              This password reset link will expire in
              <strong>15 minutes</strong>.
            </p>

            <!-- SECURITY MESSAGE -->

            <p
              style="
                font-size:14px;
                line-height:1.6;
                color:#666;
              "
            >
              If you did not request a password reset,
              you can safely ignore this email.
            </p>

            <hr
              style="
                border:none;
                border-top:1px solid #eee;
                margin:28px 0;
              "
            />

            <p
              style="
                font-size:12px;
                line-height:1.5;
                color:#999;
              "
            >
              This is an automated email from the
              Conference Room Booking System.
            </p>

          </div>

        </div>
      </div>
    `;

    /* =================================================
       PLAIN TEXT EMAIL
    ================================================= */

    const text = `
Hello ${name || "Employee"},

We received a request to reset your Conference Room Booking account password.

Reset your password using the link below:

${resetUrl}

This password reset link will expire in 15 minutes.

If you did not request a password reset, you can safely ignore this email.

Conference Room Booking System
`;

    await sendEmail({
      to,
      subject,
      html,
      text,
    });

    console.log(
      `Password reset email sent to ${to}`
    );
  } catch (error) {
    console.error(
      "Password reset email error:",
      error
    );
  }
}

/* =====================================================
   GET BOOKING
===================================================== */

async function getBooking(
  bookingId: unknown
): Promise<PopulatedBooking | null> {
  const booking =
    await Booking.findById(bookingId)
      .populate(
        "user",
        "name email notifications"
      )
      .populate(
        "room",
        "name location"
      )
      .lean();

  return booking as unknown as
    | PopulatedBooking
    | null;
}

/* =====================================================
   BOOKING EMAIL CONTENT
===================================================== */

function createBookingDetailsHtml(
  booking: PopulatedBooking
): string {
  const userName =
    escapeHtml(
      booking.user?.name ||
        "Employee"
    );

  const roomName =
    escapeHtml(
      booking.room?.name ||
        "Conference Room"
    );

  const location =
    escapeHtml(
      booking.room?.location ||
        ""
    );

  const title =
    escapeHtml(
      booking.title
    );

  const date =
    formatBookingDate(
      booking.date
    );

  return `
    <div style="font-family: Arial, sans-serif; background:#f5f7f9; padding:32px;">
      <div style="max-width:650px; margin:auto; background:white; border-radius:12px; overflow:hidden;">

        <div style="background:#10275F; padding:24px;">
          <h1 style="margin:0; color:white; font-size:24px;">
            Conference Room Booking
          </h1>
        </div>

        <div style="padding:30px;">

          <p style="font-size:16px; color:#333;">
            Hello ${userName},
          </p>

          <p style="font-size:15px; color:#555;">
            Here are the details of your conference room booking.
          </p>

          <div style="margin-top:24px; border:1px solid #e5e7eb; border-radius:10px; overflow:hidden;">

            <div style="padding:16px; border-bottom:1px solid #e5e7eb;">
              <strong>Meeting</strong>
              <div style="margin-top:5px; color:#555;">
                ${title}
              </div>
            </div>

            <div style="padding:16px; border-bottom:1px solid #e5e7eb;">
              <strong>Room</strong>
              <div style="margin-top:5px; color:#555;">
                ${roomName}
              </div>
            </div>

            <div style="padding:16px; border-bottom:1px solid #e5e7eb;">
              <strong>Location</strong>
              <div style="margin-top:5px; color:#555;">
                ${location}
              </div>
            </div>

            <div style="padding:16px; border-bottom:1px solid #e5e7eb;">
              <strong>Date</strong>
              <div style="margin-top:5px; color:#555;">
                ${date}
              </div>
            </div>

            <div style="padding:16px;">
              <strong>Time</strong>
              <div style="margin-top:5px; color:#555;">
                ${booking.startTime} - ${booking.endTime}
              </div>
            </div>

          </div>

        </div>

        <div style="background:#f8fafc; padding:18px 30px;">
          <p style="margin:0; font-size:12px; color:#888;">
            This is an automated email from the Conference Room Booking System.
          </p>
        </div>

      </div>
    </div>
  `;
}

/* =====================================================
   BOOKING CREATED
===================================================== */

export async function
sendBookingCreatedEmails(
  bookingId: unknown
): Promise<void> {
  try {
    if (!transporter) {
      return;
    }

    const booking =
      await getBooking(
        bookingId
      );

    if (!booking) {
      console.error(
        "Booking email: booking not found"
      );

      return;
    }

    if (!booking.user) {
      console.error(
        "Booking email: user not found"
      );

      return;
    }

    const user =
      booking.user;

    const userEmail =
      user.email;

    const userName =
      user.name;

    const roomName =
      booking.room?.name ||
      "Conference Room";

    const date =
      formatBookingDate(
        booking.date
      );

    const subject =
      `Booking Confirmed - ${roomName} - ${booking.date}`;

    const html =
      createBookingDetailsHtml(
        booking
      );

    const text = `
Hello ${userName},

Your conference room booking has been confirmed.

Meeting: ${booking.title}
Room: ${roomName}
Date: ${date}
Time: ${booking.startTime} - ${booking.endTime}

Thank you.
Conference Room Booking System
`;

    /* =================================================
       USER EMAIL
    ================================================= */

    const userEmailEnabled =
      user.notifications
        ?.bookingConfirmation !== false;

    if (
      userEmail &&
      userEmailEnabled
    ) {
      await sendEmail({
        to: userEmail,
        subject,
        html,
        text,
      });

      console.log(
        `Booking confirmation email sent to ${userEmail}`
      );
    }

    /* =================================================
       ADMIN EMAILS
    ================================================= */

    const admins =
      await User.find({
        role: "ADMIN",
        email: {
          $exists: true,
          $ne: "",
        },
      })
        .select(
          "name email"
        )
        .lean();

    const adminEmails =
      admins
        .map(
          (admin) =>
            admin.email
        )
        .filter(
          Boolean
        );

    await Promise.all(
      adminEmails.map(
        async (adminEmail) => {
          await sendEmail({
            to: adminEmail,
            subject:
              `New Room Booking - ${roomName}`,
            html,
            text,
          });

          console.log(
            `Booking notification sent to admin ${adminEmail}`
          );
        }
      )
    );
  } catch (error) {
    console.error(
      "Booking created email error:",
      error
    );
  }
}

/* =====================================================
   BOOKING UPDATED — ADMIN
===================================================== */

export async function
sendBookingUpdatedEmails(
  bookingId: unknown,
  previousBooking: {
    oldRoomName: string;
    oldDate: string;
    oldStartTime: string;
    oldEndTime: string;
  }
): Promise<void> {
  try {
    if (!transporter) {
      return;
    }

    /* ---------------------------------------------
       GET UPDATED BOOKING
    --------------------------------------------- */

    const booking =
      await getBooking(
        bookingId
      );

    if (!booking) {
      console.error(
        "Booking update email: booking not found"
      );

      return;
    }

    if (!booking.user) {
      console.error(
        "Booking update email: user not found"
      );

      return;
    }

    const user =
      booking.user;

    const roomName =
      booking.room?.name ||
      "Conference Room";

    const newDate =
      formatBookingDate(
        booking.date
      );

    const oldDate =
      formatBookingDate(
        previousBooking.oldDate
      );

    const subject =
      `Booking Updated - ${roomName} - ${booking.date}`;

    /* ---------------------------------------------
       UPDATED BOOKING DETAILS
    --------------------------------------------- */

    const html = `
      <div
        style="
          font-family:Arial,sans-serif;
          background:#f5f7f9;
          padding:32px;
        "
      >

        <div
          style="
            max-width:650px;
            margin:auto;
            background:white;
            border-radius:12px;
            overflow:hidden;
            border:1px solid #e5e7eb;
          "
        >

          <!-- HEADER -->

          <div
            style="
              background:#10275F;
              padding:24px;
            "
          >
            <h1
              style="
                margin:0;
                color:white;
                font-size:24px;
              "
            >
              Booking Updated
            </h1>
          </div>

          <!-- CONTENT -->

          <div
            style="
              padding:30px;
            "
          >

            <p
              style="
                font-size:16px;
                color:#333;
              "
            >
              Hello ${escapeHtml(
                user.name
              )},
            </p>

            <p
              style="
                font-size:15px;
                line-height:1.6;
                color:#555;
              "
            >
              Your conference room booking has been
              updated by an administrator.
            </p>

            <!-- NEW BOOKING -->

            <div
              style="
                margin-top:24px;
                border:1px solid #e5e7eb;
                border-radius:10px;
                overflow:hidden;
              "
            >

              <div
                style="
                  background:#f8fafc;
                  padding:14px 16px;
                  border-bottom:1px solid #e5e7eb;
                "
              >
                <strong>
                  Updated Booking Details
                </strong>
              </div>

              <div
                style="
                  padding:16px;
                  border-bottom:1px solid #e5e7eb;
                "
              >
                <strong>Meeting</strong>

                <div
                  style="
                    margin-top:5px;
                    color:#555;
                  "
                >
                  ${escapeHtml(
                    booking.title
                  )}
                </div>
              </div>

              <div
                style="
                  padding:16px;
                  border-bottom:1px solid #e5e7eb;
                "
              >
                <strong>Room</strong>

                <div
                  style="
                    margin-top:5px;
                    color:#555;
                  "
                >
                  ${escapeHtml(
                    roomName
                  )}
                </div>
              </div>

              <div
                style="
                  padding:16px;
                  border-bottom:1px solid #e5e7eb;
                "
              >
                <strong>Location</strong>

                <div
                  style="
                    margin-top:5px;
                    color:#555;
                  "
                >
                  ${escapeHtml(
                    booking.room?.location ||
                      ""
                  )}
                </div>
              </div>

              <div
                style="
                  padding:16px;
                  border-bottom:1px solid #e5e7eb;
                "
              >
                <strong>Date</strong>

                <div
                  style="
                    margin-top:5px;
                    color:#555;
                  "
                >
                  ${newDate}
                </div>
              </div>

              <div
                style="
                  padding:16px;
                "
              >
                <strong>Time</strong>

                <div
                  style="
                    margin-top:5px;
                    color:#555;
                  "
                >
                  ${booking.startTime}
                  -
                  ${booking.endTime}
                </div>
              </div>

            </div>

            <!-- PREVIOUS DETAILS -->

            <div
              style="
                margin-top:24px;
                padding:20px;
                background:#fff7ed;
                border:1px solid #fed7aa;
                border-radius:10px;
              "
            >

              <strong
                style="
                  color:#9a3412;
                "
              >
                Previous Booking Details
              </strong>

              <div
                style="
                  margin-top:14px;
                  font-size:14px;
                  line-height:1.8;
                  color:#555;
                "
              >
                <div>
                  <strong>Room:</strong>
                  ${escapeHtml(
                    previousBooking.oldRoomName
                  )}
                </div>

                <div>
                  <strong>Date:</strong>
                  ${oldDate}
                </div>

                <div>
                  <strong>Time:</strong>
                  ${escapeHtml(
                    previousBooking.oldStartTime
                  )}
                  -
                  ${escapeHtml(
                    previousBooking.oldEndTime
                  )}
                </div>
              </div>

            </div>

            <p
              style="
                margin-top:24px;
                font-size:14px;
                line-height:1.6;
                color:#666;
              "
            >
              Please review the updated booking details
              and make a note of the new meeting schedule.
            </p>

          </div>

          <!-- FOOTER -->

          <div
            style="
              background:#f8fafc;
              padding:18px 30px;
            "
          >
            <p
              style="
                margin:0;
                font-size:12px;
                color:#888;
              "
            >
              This is an automated email from the
              Conference Room Booking System.
            </p>
          </div>

        </div>

      </div>
    `;

    /* ---------------------------------------------
       PLAIN TEXT EMAIL
    --------------------------------------------- */

    const text = `
Hello ${user.name},

Your conference room booking has been updated by an administrator.

UPDATED BOOKING DETAILS

Meeting: ${booking.title}
Room: ${roomName}
Location: ${booking.room?.location || ""}
Date: ${newDate}
Time: ${booking.startTime} - ${booking.endTime}

PREVIOUS BOOKING DETAILS

Room: ${previousBooking.oldRoomName}
Date: ${oldDate}
Time: ${previousBooking.oldStartTime} - ${previousBooking.oldEndTime}

Please review the updated booking details.

Conference Room Booking System
`;

    /* =================================================
       USER EMAIL
    ================================================= */

    const userEmailEnabled =
      user.notifications
        ?.bookingConfirmation !== false;

    if (
      user.email &&
      userEmailEnabled
    ) {
      await sendEmail({
        to: user.email,
        subject,
        html,
        text,
      });

      console.log(
        `Booking update email sent to ${user.email}`
      );
    }

    /* =================================================
       ADMIN EMAILS
    ================================================= */

    const admins =
      await User.find({
        role: "ADMIN",
        email: {
          $exists: true,
          $ne: "",
        },
      })
        .select(
          "name email"
        )
        .lean();

    await Promise.all(
      admins
        .filter(
          (admin) =>
            Boolean(
              admin.email
            )
        )
        .map(
          async (admin) => {
            await sendEmail({
              to: admin.email,
              subject:
                `Booking Updated by Administrator - ${roomName}`,
              html,
              text,
            });

            console.log(
              `Booking update email sent to admin ${admin.email}`
            );
          }
        )
    );
  } catch (error) {
    console.error(
      "Booking update email error:",
      error
    );
  }
}

/* =====================================================
   BOOKING CANCELLED
===================================================== */

export async function
sendBookingCancelledEmails(
  bookingId: unknown,
  cancelledBy?: string
): Promise<void> {
  try {
    if (!transporter) {
      return;
    }

    const booking =
      await getBooking(
        bookingId
      );

    if (!booking) {
      console.error(
        "Cancellation email: booking not found"
      );

      return;
    }

    if (!booking.user) {
      return;
    }

    const user =
      booking.user;

    const roomName =
      booking.room?.name ||
      "Conference Room";

    const date =
      formatBookingDate(
        booking.date
      );

    const cancelledByText =
      cancelledBy
        ? `Cancelled by: ${escapeHtml(
            cancelledBy
          )}`
        : "";

    const subject =
      `Booking Cancelled - ${roomName} - ${booking.date}`;

    const html = `
      ${createBookingDetailsHtml(
        booking
      )}

      <div style="max-width:650px; margin:16px auto 0; padding:20px; background:#fff1f2; border:1px solid #fecdd3; border-radius:10px;">
        <strong style="color:#be123c;">
          This booking has been cancelled.
        </strong>

        ${
          cancelledByText
            ? `
              <p style="margin:8px 0 0; color:#555;">
                ${cancelledByText}
              </p>
            `
            : ""
        }
      </div>
    `;

    const text = `
Hello ${user.name},

Your conference room booking has been cancelled.

Meeting: ${booking.title}
Room: ${roomName}
Date: ${date}
Time: ${booking.startTime} - ${booking.endTime}

${cancelledBy ? `Cancelled by: ${cancelledBy}` : ""}

Conference Room Booking System
`;

    /* =================================================
       USER
    ================================================= */

    const userEmailEnabled =
      user.notifications
        ?.bookingCancellation !== false;

    if (
      user.email &&
      userEmailEnabled
    ) {
      await sendEmail({
        to: user.email,
        subject,
        html,
        text,
      });

      console.log(
        `Cancellation email sent to ${user.email}`
      );
    }

    /* =================================================
       ADMINS
    ================================================= */

    const admins =
      await User.find({
        role: "ADMIN",
        email: {
          $exists: true,
          $ne: "",
        },
      })
        .select(
          "name email"
        )
        .lean();

    await Promise.all(
      admins
        .filter(
          (admin) =>
            Boolean(
              admin.email
            )
        )
        .map(
          async (admin) => {
            await sendEmail({
              to: admin.email,
              subject,
              html,
              text,
            });

            console.log(
              `Cancellation email sent to admin ${admin.email}`
            );
          }
        )
    );
  } catch (error) {
    console.error(
      "Booking cancellation email error:",
      error
    );
  }
}

/* =====================================================
   BOOKING REMINDER
===================================================== */

export async function
sendBookingReminderEmail(
  bookingId: unknown
): Promise<void> {
  try {
    if (!transporter) {
      return;
    }

    const booking =
      await getBooking(
        bookingId
      );

    if (!booking) {
      return;
    }

    if (
      booking.status ===
      "CANCELLED"
    ) {
      return;
    }

    if (!booking.user) {
      return;
    }

    const user =
      booking.user;

    /* ---------------------------------------------
       USER REMINDER PREFERENCE
    --------------------------------------------- */

    if (
      user.notifications
        ?.bookingReminder === false
    ) {
      console.log(
        `Reminder email disabled for ${user.email}`
      );

      return;
    }

    const roomName =
      booking.room?.name ||
      "Conference Room";

    const date =
      formatBookingDate(
        booking.date
      );

    const subject =
      `Meeting Reminder - ${roomName} - ${booking.startTime}`;

    const html = `
      <div style="font-family:Arial,sans-serif;background:#f5f7f9;padding:32px;">
        <div style="max-width:650px;margin:auto;background:white;border-radius:12px;overflow:hidden;">

          <div style="background:#10275F;padding:24px;">
            <h1 style="margin:0;color:white;font-size:24px;">
              Meeting Reminder
            </h1>
          </div>

          <div style="padding:30px;">

            <p style="font-size:16px;color:#333;">
              Hello ${escapeHtml(user.name)},
            </p>

            <p style="font-size:15px;color:#555;">
              This is a reminder that your conference room booking starts in approximately one hour.
            </p>

            <div style="margin-top:24px;padding:20px;background:#f8fafc;border-radius:10px;">

              <p>
                <strong>Meeting:</strong>
                ${escapeHtml(booking.title)}
              </p>

              <p>
                <strong>Room:</strong>
                ${escapeHtml(roomName)}
              </p>

              <p>
                <strong>Date:</strong>
                ${date}
              </p>

              <p>
                <strong>Time:</strong>
                ${booking.startTime} - ${booking.endTime}
              </p>

            </div>

            <p style="margin-top:24px;color:#555;">
              Please make sure you arrive on time.
            </p>

          </div>

          <div style="background:#f8fafc;padding:18px 30px;">
            <p style="margin:0;font-size:12px;color:#888;">
              This is an automated email from the Conference Room Booking System.
            </p>
          </div>

        </div>
      </div>
    `;

    const text = `
Hello ${user.name},

Reminder: your conference room booking starts in approximately one hour.

Meeting: ${booking.title}
Room: ${roomName}
Date: ${date}
Time: ${booking.startTime} - ${booking.endTime}

Please make sure you arrive on time.

Conference Room Booking System
`;

    await sendEmail({
      to: user.email,
      subject,
      html,
      text,
    });

    console.log(
      `Reminder email sent to ${user.email}`
    );
  } catch (error) {
    console.error(
      "Booking reminder email error:",
      error
    );
  }
}