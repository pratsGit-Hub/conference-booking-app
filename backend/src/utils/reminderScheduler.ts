import "dotenv/config";
import cron from "node-cron";

import { Booking } from "../models/Booking.js";
import { createNotificationIfEnabled } from "./notificationService.js";
import { sendBookingReminderEmail } from "./emailService.js";

const APP_TIMEZONE =
  process.env.APP_TIMEZONE ||
  "Asia/Kolkata";

/* =====================================================
   START REMINDER SCHEDULER
===================================================== */

export function startReminderScheduler(): void {
  console.log(
    `Booking reminder scheduler started (${APP_TIMEZONE}).`
  );

  cron.schedule(
    "* * * * *",
    async () => {
      try {
        /* =================================================
           CURRENT TIME
        ================================================= */

        const now = new Date();

        /* =================================================
           TARGET TIME = 1 HOUR FROM NOW
        ================================================= */

        const target = new Date(
          now.getTime() +
            60 * 60 * 1000
        );

        /* =================================================
           CONVERT TARGET TO APPLICATION TIMEZONE
        ================================================= */

        const formatter =
          new Intl.DateTimeFormat(
            "en-CA",
            {
              timeZone:
                APP_TIMEZONE,

              year: "numeric",

              month: "2-digit",

              day: "2-digit",

              hour: "2-digit",

              minute: "2-digit",

              hourCycle: "h23",
            }
          );

        const parts =
          formatter.formatToParts(
            target
          );

        const values: Record<
          string,
          string
        > = {};

        for (const part of parts) {
          if (
            part.type !==
            "literal"
          ) {
            values[part.type] =
              part.value;
          }
        }

        const targetDate =
          `${values.year}-${values.month}-${values.day}`;

        const targetTime =
          `${values.hour}:${values.minute}`;

        /* =================================================
           FIND BOOKINGS STARTING IN APPROXIMATELY 1 HOUR
        ================================================= */

        const bookings =
          await Booking.find({
            status: "UPCOMING",

            date: targetDate,

            startTime: targetTime,

            reminderSentAt: null,
          })
            .select(
              "_id user title date startTime endTime status reminderSentAt"
            )
            .lean();

        /* =================================================
           NO BOOKINGS
        ================================================= */

        if (
          bookings.length ===
          0
        ) {
          return;
        }

        console.log(
          `[Reminder Scheduler] Found ${bookings.length} booking(s) for ${targetDate} ${targetTime}.`
        );

        /* =================================================
           PROCESS BOOKINGS
        ================================================= */

        for (
          const booking of bookings
        ) {
          try {
            /* =================================================
               ATOMIC CLAIM

               Mark the reminder as claimed before sending.

               This prevents duplicate reminders when:
               - Multiple scheduler executions happen
               - Multiple backend instances run
               - A request overlaps another scheduler run
            ================================================= */

            const claimed =
              await Booking.findOneAndUpdate(
                {
                  _id:
                    booking._id,

                  status:
                    "UPCOMING",

                  reminderSentAt:
                    null,
                },

                {
                  $set: {
                    reminderSentAt:
                      new Date(),
                  },
                },

                {
                  new: true,
                }
              );

            /* =================================================
               SOMEONE ELSE ALREADY CLAIMED IT
            ================================================= */

            if (!claimed) {
              console.log(
                `[Reminder Scheduler] Booking ${booking._id} was already claimed.`
              );

              continue;
            }

            console.log(
              `[Reminder Scheduler] Processing booking ${booking._id}...`
            );

            /* =================================================
               SEND EMAIL REMINDER
            ================================================= */

            await sendBookingReminderEmail(
              booking._id
            );

            console.log(
              `[Reminder Scheduler] Email reminder sent for booking ${booking._id}.`
            );

            /* =================================================
               CREATE IN-APP NOTIFICATION
            ================================================= */

            if (
              booking.user
            ) {
              try {
                await createNotificationIfEnabled(
                  {
                    userId:
                      booking.user.toString(),

                    type:
                      "BOOKING_REMINDER",

                    title:
                      "Upcoming Meeting",

                    message:
                      `Your meeting "${booking.title}" starts in approximately one hour.`,

                    bookingId:
                      booking._id.toString(),
                  }
                );

                console.log(
                  `[Reminder Scheduler] In-app notification created for booking ${booking._id}.`
                );
              } catch (
                notificationError
              ) {
                /*
                 * Email was already sent successfully.
                 *
                 * Do NOT reset reminderSentAt here,
                 * otherwise the email could be sent again.
                 */

                console.error(
                  `[Reminder Scheduler] In-app notification failed for booking ${booking._id}:`,
                  notificationError
                );
              }
            }

            console.log(
              `[Reminder Scheduler] Reminder completed successfully for booking ${booking._id}.`
            );
          } catch (error) {
            /* =================================================
               EMAIL FAILED

               Reset reminderSentAt so the next scheduler run
               can retry the reminder.
            ================================================= */

            await Booking.updateOne(
              {
                _id:
                  booking._id,

                status:
                  "UPCOMING",
              },

              {
                $set: {
                  reminderSentAt:
                    null,
                },
              }
            );

            console.error(
              `[Reminder Scheduler] Failed to send/process reminder for booking ${booking._id}:`,
              error
            );

            console.log(
              `[Reminder Scheduler] Reminder claim reset. The system will retry on the next matching scheduler run.`
            );
          }
        }
      } catch (error) {
        console.error(
          "[Reminder Scheduler] Scheduler error:",
          error
        );
      }
    },

    {
      timezone:
        APP_TIMEZONE,

      noOverlap:
        true,

      name:
        "conference-booking-reminders",
    }
  );
}