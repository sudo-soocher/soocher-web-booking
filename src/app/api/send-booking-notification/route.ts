import { NextResponse } from "next/server";
import admin from "firebase-admin";
import path from "path";
import fs from "fs";

// Initialize Firebase Admin only once
if (!admin.apps.length) {
    const serviceAccountPath = path.join(process.cwd(), "service_account.json");
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

export async function POST(request: Request) {
    try {
        const {
            fcmToken,
            patientName,
            doctorName,
            consultationTime,
            meetLink,
        } = await request.json();

        if (!fcmToken) {
            return NextResponse.json(
                { error: "No FCM token provided — skipping notification" },
                { status: 200 }
            );
        }

        // Format the time nicely
        const formattedTime = new Date(consultationTime).toLocaleString("en-IN", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata",
        });

        const notificationBody = meetLink
            ? `Your appointment with Dr. ${doctorName} is confirmed for ${formattedTime}. Join via Google Meet: ${meetLink}`
            : `Your appointment with Dr. ${doctorName} is confirmed for ${formattedTime}. Open the Soocher app to join.`;

        const message: admin.messaging.Message = {
            token: fcmToken,
            notification: {
                title: "Booking Confirmed 🎉",
                body: notificationBody,
            },
            data: {
                type: "booking_confirmed",
                doctorName,
                patientName,
                consultationTime: String(consultationTime),
                meetLink: meetLink || "",
            },
            android: {
                notification: {
                    channelId: "booking_notifications",
                    priority: "high",
                    sound: "default",
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: "default",
                        badge: 1,
                    },
                },
            },
        };

        const result = await admin.messaging().send(message);
        console.log("FCM notification sent successfully:", result);

        return NextResponse.json({ success: true, messageId: result });
    } catch (error: any) {
        console.error("Error sending FCM notification:", error?.message || error);
        // Don't fail the whole booking if notification fails
        return NextResponse.json(
            { success: false, error: error?.message },
            { status: 200 }
        );
    }
}
