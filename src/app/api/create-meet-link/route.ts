import { NextResponse } from "next/server";
import { google } from "googleapis";
import path from "path";

// Path to the service account file
const SERVICE_ACCOUNT_PATH = path.join(process.cwd(), "service_account.json");

export async function POST(request: Request) {
    try {
        const {
            consultationId,
            consultationTime,
            doctorName,
            patientName,
            durationMinutes,
        } = await request.json();

        if (!consultationId || !consultationTime || !doctorName || !patientName) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Authenticate using the service account
        const auth = new google.auth.GoogleAuth({
            keyFile: SERVICE_ACCOUNT_PATH,
            scopes: ["https://www.googleapis.com/auth/calendar"],
        });

        const calendar = google.calendar({ version: "v3", auth });

        const startTime = new Date(consultationTime);
        const endTime = new Date(
            consultationTime + (durationMinutes || 15) * 60 * 1000
        );

        // Create a Google Calendar event with a Meet conference
        const event = {
            summary: `Consultation: ${patientName} with Dr. ${doctorName}`,
            description: `Soocher online consultation.\nConsultation ID: ${consultationId}`,
            start: {
                dateTime: startTime.toISOString(),
                timeZone: "Asia/Kolkata",
            },
            end: {
                dateTime: endTime.toISOString(),
                timeZone: "Asia/Kolkata",
            },
            conferenceData: {
                createRequest: {
                    requestId: consultationId,
                    conferenceSolutionKey: { type: "hangoutsMeet" },
                },
            },
            attendees: [],
        };

        const response = await calendar.events.insert({
            calendarId: "primary",
            conferenceDataVersion: 1,
            requestBody: event,
        });

        const meetLink =
            response.data.conferenceData?.entryPoints?.find(
                (ep) => ep.entryPointType === "video"
            )?.uri || null;

        const eventId = response.data.id || null;

        return NextResponse.json({ meetLink, eventId });
    } catch (error: any) {
        console.error("Error creating Meet link:", error?.message || error);
        return NextResponse.json(
            { error: "Failed to create Meet link", details: error?.message },
            { status: 500 }
        );
    }
}
