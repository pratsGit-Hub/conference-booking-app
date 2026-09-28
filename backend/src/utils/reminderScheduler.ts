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

export function startReminderScheduler() {
  console.log(
    `Booking reminder scheduler started (${APP_TIMEZONE}).`
  );

  cron.schedule(
    "* * * * *",
    async () => {
      try {
        /* ---------------------------------------------
           CURRENT TIME
        --------------------------------------------- */

        const now =
          new Date();

        /* ---------------------------------------------
           CALCULATE TIME 1 HOUR FROM NOW
        --------------------------------------------- */

        const target =
          new Date(
            now.getTime() +
              60 * 60 * 1000
          );

        /* ---------------------------------------------
           CONVERT TARGET TO APP TIMEZONE
        --------------------------------------------- */

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

        const values:
          Record<string, string> = {};

        for (
          const part of parts
        ) {
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

        /* ---------------------------------------------
           FIND BOOKINGS STARTING IN ONE HOUR
        --------------------------------------------- */

        const bookings =
          await Booking.find({
            status:
              "UPCOMING",

            date:
              targetDate,

            startTime:
              targetTime,

            reminderSentAt:
              null,
          })
            .select(
              "_id user title date startTime endTime status reminderSentAt"
            )
            .lean();

        if (
          bookings.length ===
          0
        ) {
          return;
        }

        console.log(
          `Found ${bookings.length} booking(s) requiring a reminder for ${targetDate} ${targetTime}.`
        );

        /* ---------------------------------------------
           PROCESS EACH BOOKING
        --------------------------------------------- */

        for (
          const booking of bookings
        ) {
          /* -----------------------------------------
             ATOMIC CLAIM

             Prevent duplicate reminders if multiple
             scheduler executions/processes occur.
          ----------------------------------------- */

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

          if (!claimed) {
            continue;
          }

          try {
            /* ---------------------------------------
               SEND REMINDER EMAIL
            --------------------------------------- */

            await sendBookingReminderEmail(
              booking._id
            );

            /* ---------------------------------------
               CREATE IN-APP NOTIFICATION
            --------------------------------------- */

            if (
              booking.user
            ) {
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
            }

            console.log(
              `Reminder processed successfully for booking ${booking._id}`
            );
          } catch (error) {
            /* ---------------------------------------
               RESET CLAIM SO THE SYSTEM CAN RETRY
            --------------------------------------- */

            await Booking.updateOne(
              {
                _id:
                  booking._id,
              },

              {
                $set: {
                  reminderSentAt:
                    null,
                },
              }
            );

            console.error(
              `Failed to process reminder for booking ${booking._id}:`,
              error
            );
          }
        }
      } catch (error) {
        console.error(
          "Reminder scheduler error:",
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