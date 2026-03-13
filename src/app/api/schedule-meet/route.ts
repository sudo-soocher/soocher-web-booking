import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            consultationId,
            consultationTime,
            doctorName,
            patientName,
            patientEmail,
            specialization
        } = body;

        // Check for strictly required fields for the scheduler
        const missing = [];
        if (!consultationId) missing.push("consultationId");
        if (!consultationTime) missing.push("consultationTime");
        if (!doctorName) missing.push("doctorName");
        if (!patientName) missing.push("patientName");
        if (!patientEmail) missing.push("patientEmail");

        if (missing.length > 0) {
            console.error(">>> [TRIGGER ERROR] Missing fields:", missing);
            return NextResponse.json(
                { error: "Missing required fields", missing },
                { status: 400 }
            );
        }

        // Format date and time for the scheduler API manually to avoid locale variations
        const d = new Date(consultationTime);

        // Use Intl.DateTimeFormat to get parts in the correct timezone (Asia/Kolkata)
        const dateParts = new Intl.DateTimeFormat('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            timeZone: 'Asia/Kolkata'
        }).formatToParts(d);
        const day = dateParts.find(p => p.type === 'day')?.value;
        const month = dateParts.find(p => p.type === 'month')?.value;
        const year = dateParts.find(p => p.type === 'year')?.value;
        const dateStr = `${day}/${month}/${year}`;

        const timeParts = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit', minute: '2-digit', hour12: true,
            timeZone: 'Asia/Kolkata'
        }).formatToParts(d);
        const hour = timeParts.find(p => p.type === 'hour')?.value;
        const minute = timeParts.find(p => p.type === 'minute')?.value;
        const dayPeriodRaw = timeParts.find(p => p.type === 'dayPeriod')?.value || (d.getHours() >= 12 ? 'PM' : 'AM');
        const dayPeriod = dayPeriodRaw.toUpperCase().replace(/\./g, '');
        const timeStr = `${hour}:${minute} ${dayPeriod}`;

        // Get URL from MEET_SCHEDULER_API as requested
        const schedulerUrl = process.env.MEET_SCHEDULER_API || "http://localhost:8001/schedule-meet";
        const apiKey = process.env.MEET_SCHEDULER_API_KEY;

        const payload = {
            date: dateStr,
            time: timeStr,
            user_mail: patientEmail.trim(),
            user_name: patientName.trim(),
            doctors_name: doctorName.trim(),
            department_name: specialization?.trim() || "General Health"
        };

        console.log(">>> [TRIGGER] Scheduled Meet API Call triggered");
        console.log(">>> [TRIGGER] Target URL:", schedulerUrl);
        console.log(">>> [TRIGGER] Payload:", JSON.stringify(payload, null, 2));

        const response = await fetch(schedulerUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-KEY": apiKey || "",
            },
            body: JSON.stringify(payload),
        });

        console.log(">>> [TRIGGER] Response Status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(">>> [TRIGGER ERROR] Body:", errorText);
            throw new Error(`Scheduler API failed (${response.status}): ${errorText}`);
        }

        const result = await response.json();
        console.log(">>> [TRIGGER DATA] Response:", JSON.stringify(result, null, 2));

        if (!result.status || !result.data?.meet_link) {
            throw new Error(result.message || "Failed to get Meet link from scheduler");
        }

        return NextResponse.json({
            meetLink: result.data.meet_link,
            message: result.message
        });
    } catch (err: unknown) {
        const error = err as { message?: string };
        console.error("Error creating Meet link via scheduler:", error?.message || error);
        return NextResponse.json(
            { error: "Failed to create Meet link", details: error?.message },
            { status: 500 }
        );
    }
}
