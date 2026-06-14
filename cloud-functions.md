/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const cors = require("cors")({ origin: true });

const axios = require("axios").default;

const Razorpay = require("razorpay");

var instance = new Razorpay({
  key_id: "rzp_live_znKpMWksb4GGN5",
  key_secret: "Px5R93oB4PCrSSpIO4tcg8Hi",
});

const { CloudTasksClient } = require("@google-cloud/tasks").v2;

const { StreamClient } = require("@stream-io/node-sdk");

const OneSignal = require("@onesignal/node-onesignal");
const configuration = OneSignal.createConfiguration({
  userKey: "<YOUR_USER_KEY_TOKEN>",
  appKey: "<YOUR_APP_KEY_TOKEN>",
});

const apiKey = "3y6pvueyxmyv";
const secret =
  "v6ntx95ghvn25avqs7fdwnn6tpnvrzg4uxxyng6gbn3ymkh6hqmk4an8ajmmc76f";
const client = new StreamClient(apiKey, secret);

const baseUrl2 = "3.111.71.73:6996";

const apiDomainUri = "https://www.zohoapis.in";

admin.initializeApp();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

var specialitiesDetails = [
  { name: "General Physician (M.B.B.S)", description: "Primary Healthcare" },

  { name: "Dental Practitioner", description: "Teeth, Gums, Mouth Problems" },
  {
    name: "Anaesthesiology",
    description: "Pre-Surgical Medical Check up, Pain Management",
  },
  {
    name: "Cardiology",
    description: "Heart Diseases, Blood Pressure Management.",
  },
  {
    name: "Cardiothoracic and Vascular Surgery",
    description: "Heart Surgery, Blood Vessel Surgery.",
  },
  {
    name: "Critical Care Medicine",
    description: "Intensive medical Care, ICU expert",
  },
  { name: "Dermatology", description: "Skin, Hair and Nail Problems" },
  { name: "Emergency Medicine", description: "Experts of Casualty Care" },
  { name: "Endocrinology", description: "Hormonal Diseases, Diabetes Expert" },
  {
    name: "ENT",
    description: "Ear, Nose and Throat Problems, Speech and Swallow Problems",
  },
  { name: "Family Medicine", description: "Advanced Primary Healthcare" },
  {
    name: "Gastroenterology",
    description: "Stomach, Intestines, and Related Organs Disorders",
  },
  {
    name: "Gastrointestinal Surgery",
    description: "Surgical Treatment Stomach, Intestines, and Related Organs",
  },
  {
    name: "General Surgery",
    description: "Surgical Treatment Of Abdomen, Skin, and Soft Tissues",
  },
  { name: "Haematology", description: "Disorders of Blood" },
  { name: "Nephrology", description: "Kidneys and Urinary Tract Disorders" },
  {
    name: "Neurosurgery",
    description: "Surgical Treatment of Brain, Spinal Cord, and Nerves",
  },
  {
    name: "Neurology",
    description: "Nervous System, The Brain, Spinal Cord, and Nerves Disorders",
  },
  {
    name: "Obstetrics and Gynaecology",
    description:
      "Pregnancy, Childbirth and Female Reproductive System Disorders",
  },
  { name: "Oncology", description: "Diagnosis and Treatment Of Cancer." },
  { name: "Ophthalmology", description: "Eye and Vision Disorders" },
  {
    name: "Orthopaedic Surgery",
    description: "Surgical Treatment of Bones, Joints, Muscles, Ligaments.",
  },
  {
    name: "Paediatrics",
    description:
      "Comprehensive Healthcare for Newborns, Children and Young Adults.",
  },
  {
    name: "Paediatric Surgery",
    description: "Surgical Treatment of Conditions In Children.",
  },
  {
    name: "Pain and Palliative Medicine",
    description: "Pain Management, Comfort Care In Terminal Illness",
  },
  { name: "Pathology", description: "Experts In Lab Test and Biopsy Reports." },
  {
    name: "Physical Medicine and Rehabilitation",
    description: "Improving Function in Physical Impairments, Pain Management",
  },
  {
    name: "Plastic and Reconstructive Surgery",
    description: "Surgical Repair Of Physical Deformities, Cosmetic Surgery.",
  },
  {
    name: "Psychiatry",
    description: "Mental, Emotional, and Behavioral Disorders.",
  },
  {
    name: "Pulmonology & Respiratory Medicine",
    description: "Lung, Sleep Disorders",
  },
  {
    name: "Radio-Diagnosis",
    description: "Experts In X-RAY, CT Scan, and MRI",
  },
  {
    name: "Radio-Therapy",
    description: "Experts In Cancer Treatment with Radiation Therapy",
  },
  {
    name: "Rheumatology",
    description: "Inflammation and Pain In The Joints, Muscles, and Bones",
  },
  {
    name: "Social and Preventive Medicine",
    description:
      "Experts in Preventing Illness and Promoting Health of Community",
  },
  { name: "Surgical Oncology", description: "Surgical Treatment Of Cancer" },
  {
    name: "Transfusion medicine",
    description: "Experts In Blood Transfusion Techniques.",
  },
  {
    name: "Urology",
    description: "Expert of Urinary Tract, Male Reproductive System.",
  },
  {
    name: "Psychology",
    description: "Mental Health",
  },
];

var days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Added for accessing tokens
exports.generateCallToken = onRequest(
  { region: "asia-southeast1" },
  async (req, res) => {
    var body = req.body;
    var uid = body.uid;
    var roomId = body.roomId;

    var data = await admin.firestore().collection("Users").doc(uid).get();

    var username = await data.get("username");
    var profileImage = await data.get("profileImage");

    try {
      const newUser = {
        id: uid,
        role: "user",
        custom: {
          type: "patient",
        },
        name: username,
        image: profileImage,
      };

      client
        .upsertUsers({
          users: {
            [newUser.id]: newUser,
          },
        })
        .catch(async (error) => {
          await client.restoreUsers({
            user_ids: [uid],
          });
          console.log("user restored");
        });
      var token = client.createCallToken(uid, [`default:${roomId}`]);
      console.log(token);
      await admin
        .firestore()
        .collection("Users")
        .doc(uid)
        .update({ stream_token: token });
      res.send(token);
    } catch (e) {
      res.send(e);
    }
  }
);

exports.automationVerifyDoctor = onRequest(
  { region: "asia-southeast1" },
  async (req, res) => {
    var data = await admin
      .firestore()
      .collection("Users")
      .where("type", "==", "DOCTOR")
      .get();

    var doctors = data.docs;
    if (doctors == null || doctors.length == 0) {
      res.send("No Doctors available");
    }

    doctors.forEach(async (doctor) => {
      var uid = await doctor.get("uid");
      await admin
        .firestore()
        .collection("Users")
        .doc(uid)
        .update({ isAccountVerified: true });
    });

    res.status(200).send("All doctors have been updated");
  }
);

//? Messages Notification
exports.sendMessageNotifications = functions
  .region("asia-southeast1")
  .firestore.database()
  .document("Consultations/{consultationId}/Chats/{messageId}")
  .onCreate(async (snapshot, context) => {
    var snapData = snapshot.data();

    var userId = snapData["receiverId"];

    var userDetails = await admin
      .firestore()
      .collection("Users")
      .doc(userId)
      .get();

    var receiverFcmToken = await userDetails.get("fcmToken");

    var messageSenderUserId = snapData["senderId"];
    var messageSenderUserData = await admin
      .firestore()
      .collection("Users")
      .doc(messageSenderUserId)
      .get();

    var senderName = await messageSenderUserData.get("name");
    var senderType = await messageSenderUserData.get("type");

    var senderNotifName =
      senderType == "PATIENT" ? senderName : `Dr. ${senderName}`;

    var notificationPayload = {
      token: receiverFcmToken,

      data: {
        title: `New Message from ${senderNotifName}`,
        body: "New Message",
        notification_type: "chat_message",
      },
      notification: {
        title: `New Message from ${senderNotifName}`,
        body: "New Message",
      },
      apns: {
        payload: {
          aps: {
            sound: "default", // Replace with the actual sound file name and extension
          },
        },
      },
      // // Set Android priority to "high"
    };
    admin
      .messaging()
      .send(notificationPayload)
      .then((value) => {
        console.log(value);
      })
      .catch((error) => {
        console.log(error);
      });
  });

// exports.onConsultationAdded = functions
//   .region("asia-southeast1")
//   .firestore.document("Consultations/{consultationId}")
//   .onCreate(async (snapshot, context) => {
//     var consultationId = context.params.consultationId;

//     var consultationData = snapshot.data();

//     var participants = consultationData["participants"];

//     var doctorId = participants[1];
//     var patientId = participants[0];

//     var doctorData = await admin
//       .firestore()
//       .collection("Users")
//       .doc(doctorId)
//       .get();
//     var patientData = await admin
//       .firestore()
//       .collection("Users")
//       .doc(patientId)
//       .get();

//     var doctorPushToken = doctorData.get("fcmToken");
//     var patientPushToken = patientData.get("fcmToken");

//     var doctorName = doctorData.get("name");
//     var patientName = patientData.get("name");

//     const projectId = "soocherv2";
//     const location = "asia-south1";
//     const queue = "consultation-notification-scheduler";

//     const taskClient = new CloudTasksClient({ fallback: "rest" });
//     const queuePath = taskClient.queuePath(projectId, location, queue);

//     const url = `https://asia-southeast1-soocherv2.cloudfunctions.net/onScheduledNotificationCallback`;

//     const payload = {
//       consultationId: consultationId,
//       doctorPushToken: doctorPushToken,
//       patientPushToken: patientPushToken,
//     };

//     let date = new Date();

//     var consultationTime = consultationData["consultationTime"];

//     var scheduleInSeconds = Math.floor(consultationTime / 1000 - 300);

//     const task = {
//       httpRequest: {
//         httpMethod: "POST",
//         url,
//         body: Buffer.from(JSON.stringify(payload)).toString("base64"),
//         headers: {
//           "Content-Type": "application/json",
//         },
//       },
//       scheduleTime: {
//         seconds: scheduleInSeconds,
//       },
//     };

//     console.log(task.scheduleTime.seconds);

//     const request = {
//       parent: queuePath,
//       task: task,
//     };

//     const [response] = await taskClient.createTask({
//       parent: queuePath,
//       task: task,
//     });

//     const jobName = await response.name;
//     console.log(jobName);

//     await admin
//       .firestore()
//       .collection("Consultations")
//       .doc(consultationId)
//       .update({ jobName: jobName });
//   });

// Notification for booked appointment
exports.sendBookedAppointmentNotification = functions
  .region("asia-southeast1")
  .firestore.database()
  .document("Consultations/{consultationId}")
  .onCreate(async (snapshot, context) => {
    var snapshotData = snapshot.data();
    var participants = snapshotData["participants"];

    var doctorId = participants[1];
    var patientId = participants[0];

    // await axios.post(
    //   `http://${baseUrl2}/api/v1/consultation/add`,
    //   snapshotData
    // );
    var doctorSnap = await admin
      .firestore()
      .collection("Users")
      .doc(doctorId)
      .get();

    var patientSnap = await admin
      .firestore()
      .collection("Users")
      .doc(patientId)
      .get();

    var scheduledDate = snapshotData["consultationTime"];
    const milliseconds = scheduledDate; // Example timestamp

    // Convert milliseconds to seconds
    const seconds = milliseconds / 1000;

    // Define the time zone offset (+05:30)
    const timezone_offset_minutes = 5 * 60 + 30;
    const timezone_offset = timezone_offset_minutes * 60 * 1000;

    // Create a Date object
    const dateObject = new Date(seconds * 1000 + timezone_offset); // Unix epoch starts from 1970-01-01

    // Extract date, day, and time
    const date = dateObject.toISOString().split("T")[0];
    const day = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true,
    }).format(dateObject);
    const time = dateObject.toISOString().split("T")[1].split(".")[0];

    var phoneNumberArray = [];
    if (
      doctorSnap.get("phoneNumber") != null ||
      doctorSnap.get("phoneNumber") != "" ||
      doctorSnap.get("phoneNumber") != undefined
    ) {
      phoneNumberArray.push(doctorSnap.get("phoneNumber"));
    }

    if (
      patientSnap.get("phoneNumber") != null ||
      patientSnap.get("phoneNumber") != "" ||
      patientSnap.get("phoneNumber") != undefined
    ) {
      phoneNumberArray.push(patientSnap.get("phoneNumber"));
    }

    // if (phoneNumberArray.length != 0) {
    //   phoneNumberArray.forEach(async (phoneNumber) => {
    //     await sendWhatsappNotification(
    //       phoneNumber.split("+")[1],
    //       "consultation_booking_success",
    //       [
    //         {
    //           parameter_name: "consultation_time",
    //           type: "text",
    //           text: day,
    //         },
    //         {
    //           parameter_name: "patient_name",
    //           type: "text",
    //           text: patientSnap.get("name"),
    //         },
    //         {
    //           parameter_name: "doctor_name",
    //           type: "text",
    //           text: `Dr. ${doctorSnap.get("name")} `,
    //         },
    //       ]
    //     );
    //   });
    // }

    // await sendWhatsappNotification(
    //   "919539656390",
    //   "consultation_booking_success",
    //   [
    //     {
    //       parameter_name: "consultation_time",
    //       type: "text",
    //       text: day,
    //     },
    //     {
    //       parameter_name: "patient_name",
    //       type: "text",
    //       text: patientSnap.get("name"),
    //     },
    //     {
    //       parameter_name: "doctor_name",
    //       type: "text",
    //       text: `Dr. ${doctorSnap.get("name")} `,
    //     },
    //   ]
    // );

    // await addDataToZoho("Deals", [
    //   {
    //     Deal_Name:
    //       patientSnap.data()["name"] +
    //         "Consultation with " +
    //         doctorSnap.data()["specialization"] !=
    //       "Psychology"
    //         ? "Dr. " + snapshotData["doctorName"]
    //         : snapshotData["doctorName"],
    //     Contact_Name: {
    //       id: await getRecordIdByName(
    //         "Contacts",
    //         "Firebase_Id",
    //         doctorSnap.data()["uid"]
    //       ),
    //     },
    //     Patient_Name: {
    //       id: await getRecordIdByName(
    //         "Patients",
    //         "Firebase_Id",
    //         patientSnap.data()["uid"]
    //       ),
    //     },
    //     Scheduled_Start_Time: convertDateToZohoFormat(
    //       new Date(snapshotData["consultationTime"])
    //     ),
    //     Actual_Start_Time: convertDateToZohoFormat(
    //       new Date(snapshotData["actualStartTime"])
    //     ),
    //     Actual_End_Time: convertDateToZohoFormat(
    //       new Date(snapshotData["actualEndTime"])
    //     ),
    //     Chat_Expiration: "No",
    //     Consultation_Duration:
    //       doctorSnap.data()["specialization"] == "Psychology" ? 50 : 15,
    //     Specialty: doctorSnap.data()["specialization"],
    //   },
    // ]);

    var doctorFCMToken = await doctorSnap.get("fcmToken");
    var patientFCMToken = await patientSnap.get("fcmToken");

    var doctorName = "Dr." + snapshotData["doctorName"];
    var patientName = snapshotData["patientName"];

    // var notificationPayload = {
    //   token: doctorFCMToken,

    //   data: {
    //     title: `New Consultation Scheduled`,
    //     body: `${patientName} has booked a slot on ${day}`,
    //     notification_type: "consultation_booking",
    //   },
    //   notification: {
    //     title: `New Consultation Scheduled`,
    //     body: `${patientName} has booked a slot on ${day}`,
    //   },
    //   apns: {
    //     payload: {
    //       aps: {
    //         sound: "default", // Replace with the actual sound file name and extension
    //       },
    //     },
    //   },
    //   // // Set Android priority to "high"
    // };

    // admin
    //   .messaging()
    //   .send(notificationPayload)
    //   .then((value) => {
    //     console.log(value);
    //   })
    //   .catch((error) => {
    //     console.log(error);
    //   });

    // admin
    //   .messaging()
    //   .sendToTopic("backend", notificationPayload)
    //   .then((value) => {
    //     console.log(value);
    //   })
    //   .catch((error) => {
    //     console.log(error);
    //   });

    const projectId = "soocherv2";
    const location = "asia-south1";
    const queue = "consultation-notification-scheduler";

    const taskClient = new CloudTasksClient({ fallback: "rest" });
    const queuePath = taskClient.queuePath(projectId, location, queue);

    const url = `https://asia-southeast1-soocherv2.cloudfunctions.net/onScheduledNotificationCallback`;

    const payload = {
      consultationId: context.params.consultationId,
      doctorPushToken: doctorFCMToken,
      patientPushToken: patientFCMToken,
      consultationTime: day,
    };

    var consultationTime = snapshotData["consultationTime"];

    var scheduleInSeconds = Math.floor(consultationTime / 1000 - 300);

    const task = {
      httpRequest: {
        httpMethod: "POST",
        url,
        body: Buffer.from(JSON.stringify(payload)).toString("base64"),
        headers: {
          "Content-Type": "application/json",
        },
      },
      scheduleTime: {
        seconds: scheduleInSeconds,
      },
    };

    console.log(task.scheduleTime.seconds);

    const request = {
      parent: queuePath,
      task: task,
    };

    const [response] = await taskClient.createTask({
      parent: queuePath,
      task: task,
    });

    const jobName = await response.name;
    console.log(jobName);

    await admin
      .firestore()
      .collection("Consultations")
      .doc(context.params.consultationId)
      .update({ jobName: jobName });

    // Add to sql db
  });

exports.cancelledConsultNotification = functions
  .region("asia-southeast1")
  .firestore.database()
  .document("Consultations/{consultationId}")
  .onUpdate(async (snapshot, context) => {
    var updatedSnapshot = snapshot.after.data();
    var consultationId = context.params.consultationId;

    var patientId = updatedSnapshot["participants"][0];
    let doctorCancelled = updatedSnapshot["cancelledByDoctor"];

    if (doctorCancelled == true) {
      // get user data.
      var patientSnap = await admin
        .firestore()
        .collection("Users")
        .doc(patientId)
        .get();

      var patientFCM = patientSnap.get("fcmToken");

      // Notification Body

      var notificationPayload = {
        token: patientFCM,

        data: {
          title: `Consultation Cancelled By Doctor`,
          body: `Doctor has Cancelled the consultation since he's unavailable. We Apologize for any inconvinience caused.`,
          notification_type: "consultation_cancelled",
          consultationId: consultationId,
        },
        notification: {
          title: `Consultation Cancelled By Doctor 😞`,
          body: `Doctor has Cancelled the consultation since he's unavailable. We Apologize for any inconvinience caused.`,
        },
        apns: {
          payload: {
            aps: {
              sound: "default", // Replace with the actual sound file name and extension
            },
          },
        },
        // // Set Android priority to "high"
      };

      // send push notification.

      admin
        .messaging()
        .send(notificationPayload)
        .then((value) => {
          console.log(value);
        })
        .catch((error) => {
          console.log(error);
        });
    }

    await axios.post(
      `http://${baseUrl2}/api/v1/consultation/update`,
      updatedSnapshot
    );
  });

//? Feed Push Notifications
exports.feedNewPostNotification = functions
  .region("asia-southeast1")
  .firestore.database()
  .document("Feed/{feedId}")
  .onCreate(async (snapshot, context) => {
    var postData = snapshot.data();
    var posterId = postData["posterId"];

    var posterData = await admin
      .firestore()
      .collection("Users")
      .doc(posterId)
      .get();

    var username =
      (await posterData.get("type")) == "DOCTOR"
        ? `Dr. ${await posterData.get("name")}`
        : await posterData.get("name");

    if (posterData.get("type") == "DOCTOR") {
      await axios.post(`http://${baseUrl2}/api/v1/feed/add`, postData);

      var notificationTitle = `New Post by ${username}`;
      var notificationDetails = postData["title"];

      //if post type forum ?? Send only to Doctors;
      if (postData["postType"] == "forum") {
        var notificationPayload = {
          topic: "doctors",
          data: {
            title: notificationTitle,
            body: notificationDetails,
            notification_type: "feed_post",
          },
          notification: {
            title: notificationTitle,
            body: notificationDetails,
          },
          apns: {
            payload: {
              aps: {
                sound: "default", // Replace with the actual sound file name and extension
              },
            },
          },
          // // Set Android priority to "high"
        };

        admin
          .messaging()
          .send(notificationPayload)
          .then((response) => {
            console.log(response);
          })
          .catch((error) => {
            console.log(error);
          });
      } else {
        var notificationPayload = {
          topic: "all_users",
          data: {
            title: notificationTitle,
            body: notificationDetails,
            notification_type: "feed_post",
          },
          notification: {
            title: notificationTitle,
            body: notificationDetails,
          },
          apns: {
            payload: {
              aps: {
                sound: "default", // Replace with the actual sound file name and extension
              },
            },
          },
          // // Set Android priority to "high"
        };

        admin
          .messaging()
          .send(notificationPayload)
          .then((response) => {
            console.log(response);
          })
          .catch((error) => {
            console.log(error);
          });
      }
    }
  });

exports.sendUpvotesNotifications = functions
  .region("asia-southeast1")
  .firestore.database()
  .document("Feed/{feedId}")
  .onUpdate(async (snap, context) => {
    var prevSnap = snap.before.data();
    var updatedSnap = snap.after.data();

    var posterId = updatedSnap["posterId"];

    var posterDetails = await admin
      .firestore()
      .collection("Users")
      .doc(posterId)
      .get();

    var posterFCMToken = await posterDetails.get("fcmToken");

    //check if the number is increased.
    if (prevSnap["upvotes"].length < updatedSnap["upvotes"].length) {
      // there's an upvote
      var notificationTitle =
        prevSnap["upvotes"].length == 0
          ? "Congratulations on your 1st upvote on your post"
          : "You've got a new upvote on a post.";
      var notificationBody = `You have a total of ${updatedSnap["upvotes"].length} on your post : ${updatedSnap["title"]}`;

      var notificationPayload = {
        token: posterFCMToken,

        data: {
          title: notificationTitle,
          body: notificationBody,
          notification_type: "upvotes",
        },
        notification: {
          title: notificationTitle,
          body: notificationBody,
        },
        apns: {
          payload: {
            aps: {
              sound: "default", // Replace with the actual sound file name and extension
            },
          },
        },
        // // Set Android priority to "high"
      };

      admin
        .messaging()
        .send(notificationPayload)
        .then((value) => {
          console.log(value);
        })
        .catch((error) => {
          console.log(error);
        });
    }

    if (updatedSnap["posterType"] == "DOCTOR") {
      await axios.post(`http://${baseUrl2}/api/v1/feed/update`, updatedSnap);
    }
  });

exports.onDeleteFeedPost = functions
  .region("asia-southeast1")
  .firestore.database()
  .document("Feed/{feedId}")
  .onDelete(async (snap, context) => {
    var feedData = snap.data();
    if (feedData["posterType"] == "DOCTOR") {
      await axios.post(`http://${baseUrl2}/api/v1/feed/delete`, feedData);
    }
  });

exports.onConsultationDelete = functions
  .region("asia-southeast1")
  .firestore.database()
  .document("Consultations/{consultationId}")
  .onDelete(async (snap, context) => {
    var consultationData = snap.data();

    await axios.post(
      `http://${baseUrl2}/api/v1/consultation/delete`,
      consultationData
    );
  });

//? Add Specialities
exports.updateSpeciality = functions
  .region("asia-southeast1")
  .firestore.database()
  .document("/Users/{uid}")
  .onCreate(async (snapshot, context) => {
    var uid = context.params.uid;
    var specialities = [];

    days.forEach((day) => {
      admin
        .firestore()
        .collection("Users")
        .doc(uid)
        .collection("Available Slots")
        .doc(day)
        .set({
          isActive: false,
          availableSlots: [],
        });
    });

    if (snapshot.get("type") == "DOCTOR") {
      await admin
        .firestore()
        .collection("/Specialities")
        .doc("available")
        .get()
        .then(async (splSnap) => {
          specialities = splSnap.get("specialityName");
          var index = specialities.findIndex((item) => {
            return item.name == snapshot.get("specialization");
          });
          if (index == -1) {
            var ogListIndex = specialitiesDetails.findIndex((item) => {
              return item.name == snapshot.get("specialization");
            });
            specialities.push(specialitiesDetails[ogListIndex]);
            await admin
              .firestore()
              .collection("/Specialities")
              .doc("available")
              .set({ specialityName: specialities });
          }
        });

      var docState = snapshot.get("currentState");
      var docCity = snapshot.get("currentCity");

      await admin
        .firestore()
        .collection("/Specialities")
        .doc("states")
        .get()
        .then(async (stateSnap) => {
          var data = stateSnap.data();
          var states = [];
          // console.log(data);
          for (let key in data) {
            states.push(key);
          }
          // console.log(states);
          if (states.indexOf(docState) == -1) {
            data[docState] = [docCity];
            await admin
              .firestore()
              .collection("/Specialities")
              .doc("states")
              .update(data);
          } else {
            var cities = data[docState];
            // console.log(cities);
            if (cities.indexOf(docCity) == -1) {
              cities.push(docCity);
              data[docState] = cities;
              await admin
                .firestore()
                .collection("/Specialities")
                .doc("states")
                .update(data);
            }
          }
        });
    }
  });

// Notifications for Post Replies

exports.postReplis = functions
  .region("asia-southeast1")
  .firestore.database()
  .document("Replies/{postId}/{replyPathId}/{replyId}")
  .onCreate(async (snapshot, context) => {
    var postId = context.params.postId;
    var replyPathId = context.params.replyPathId;
    var replyMessageId = context.params.replyId;

    var replyData = snapshot.data();

    var posterId = replyData["posterId"];

    var poster = await admin
      .app()
      .firestore()
      .collection("Users")
      .doc(posterId)
      .get();

    var posterFCM = poster.get("fcmToken");

    var notificationPayload = {
      token: posterFCM,

      data: {
        title: `${replyData["replierName"]} has replied to your post`,
        body: replyData["replyMessage"],
        notification_type: "post_reply",
      },
      notification: {
        title: `${replyData["replierName"]} has replied to your post`,
        body: replyData["replyMessage"],
      },
      apns: {
        payload: {
          aps: {
            sound: "default", // Replace with the actual sound file name and extension
          },
        },
      },
      // // Set Android priority to "high"
    };

    // send push notification.

    admin
      .messaging()
      .send(notificationPayload)
      .then((value) => {
        console.log(value);
      })
      .catch((error) => {
        console.log(error);
      });
  });

// Notification Scheduler

// exports.onScheduledNotificationCallback = functions
//   .region("asia-southeast1")
//   .https.onRequest(async (req, res) => {
//     const payload = req.body;
//     console.log(payload);

//     const doctorPushToken = payload.doctorPushToken;
//     const patientPushToken = payload.patientPushToken;
//     const consultationId = payload.consultationId;
//     const consultationTime = payload.consultationTime;

//     var consultationData = await admin
//       .firestore()
//       .collection("Consultations")
//       .doc(consultationId)
//       .get();

//     var participants = consultationData.get("participants");

//     var patientId = participants[0];
//     var doctorId = participants[1];

//     var doctorSnap = await admin
//       .firestore()
//       .collection("Users")
//       .doc(doctorId)
//       .get();

//     var patientSnap = await admin
//       .firestore()
//       .collection("Users")
//       .doc(patientId)
//       .get();

//     var doctorName = doctorSnap.get("name");
//     var patientName = patientSnap.get("name");
//     var doctorPhoneNumber = doctorSnap.get("phoneNumber");
//     var patientPhoneNumber = patientSnap.get("phoneNumber");

//     if (
//       doctorPhoneNumber != null ||
//       doctorPhoneNumber != undefined ||
//       doctorPhoneNumber != ""
//     ) {
//       await sendWhatsappNotification(
//         doctorPhoneNumber.split("+")[1],
//         "consultation_reminder",
//         [
//           {
//             parameter_name: "consultation_time",
//             type: "text",
//             text: consultationTime,
//           },
//           {
//             parameter_name: "username",
//             type: "text",
//             text: doctorName,
//           },
//         ]
//       );
//     }

//     if (
//       patientPhoneNumber != null ||
//       patientPhoneNumber != undefined ||
//       patientPhoneNumber != ""
//     ) {
//       await sendWhatsappNotification(
//         patientPhoneNumber.split("+")[1],
//         "consultation_reminder",
//         [
//           {
//             parameter_name: "consultation_time",
//             type: "text",
//             text: consultationTime,
//           },
//           {
//             parameter_name: "username",
//             type: "text",
//             text: patientName,
//           },
//         ]
//       );
//     }

//     // Send whatsapp notification to Reshma
//     // 919539656390
//     await sendWhatsappNotification("919539656390", "consultation_reminder", [
//       {
//         parameter_name: "consultation_time",
//         type: "text",
//         text: consultationTime,
//       },
//       {
//         parameter_name: "username",
//         type: "text",
//         text: `Reshma. ${patientName} has a consultation with ${doctorName}`,
//       },
//     ]);

//     var doctorNotificationPayload = {
//       token: doctorPushToken,

//       data: {
//         title: `Consultation Reminder`,
//         body: "Consultation is scheduled in 5 minutes",
//         notification_type: "consultations_reminder",
//       },
//       notification: {
//         title: `Consultation Reminder`,
//         body: "Consultation is scheduled in 5 minutes",
//       },
//       apns: {
//         payload: {
//           aps: {
//             sound: "default", // Replace with the actual sound file name and extension
//           },
//         },
//       },
//       // // Set Android priority to "high"
//     };

//     var patientNotificationPayload = {
//       token: patientPushToken,

//       data: {
//         title: `Consultation Reminder`,
//         body: "Consultation is scheduled in 5 minutes",
//         notification_type: "consultations_reminder",
//       },
//       notification: {
//         title: `Consultation Reminder`,
//         body: "Consultation is scheduled in 5 minutes",
//       },
//       apns: {
//         payload: {
//           aps: {
//             sound: "default", // Replace with the actual sound file name and extension
//           },
//         },
//       },
//       // // Set Android priority to "high"
//     };

//     admin
//       .messaging()
//       .send(doctorNotificationPayload)
//       .then((value) => {
//         console.log(value);
//       })
//       .catch((error) => {
//         console.log(error);
//       });

//     admin
//       .messaging()
//       .send(patientNotificationPayload)
//       .then((value) => {
//         console.log(value);
//         res.status(200).send(value);
//       })
//       .catch((error) => {
//         console.log(error);
//         res.status(200).send(error);
//       });

//     // schedule notification for both doctor and patient here.
//   });

exports.onGenerateRazorpayOrderId = functions
  .region("asia-southeast1")
  .https.onRequest((req, res) => {
    var amount = req.body.amount;

    var options = {
      amount: amount, // amount in the smallest currency unit
      currency: "INR",
    };

    instance.orders.create(options, function (err, order) {
      res.send(order);
    });
  });

exports.onPhoneNumberRequest = functions
  .region("asia-southeast1")
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      var uid = req.body.uid;

      var phoneNumber = (await admin.app().auth().getUser(uid)).phoneNumber;

      await admin
        .app()
        .firestore()
        .collection("Users")
        .doc(uid)
        .update({ phoneNumber: phoneNumber.toString() });

      res.status(200).send(phoneNumber);
    });
  });

// ? Cloud functions for Prisma Client API

//? User profile create.
exports.onUserProfileCreate = functions
  .region("asia-southeast1")
  .firestore.database()
  .document("Users/{uid}")
  .onCreate(async (snapshot, context) => {
    var uid = context.params.uid;
    var data = snapshot.data();
    var type = data.type;

    if (type == "DOCTOR") {
      await axios
        .post(`http://${baseUrl2}/api/v1/users/add-doctor`, {
          uid: uid,
        })
        .catch((err) => {
          console.log(err);
        });

      // ZOHO: IMPLEMENT ZOHO FUNCTION HERE
      await addDataToZoho("Contacts", [
        {
          First_Name: data.name.split(" ")[0] ?? data.name,
          Last_Name:
            data.name.split(" ")[data.name.split(" ").length - 1] ?? "",
          State_of_Residence: data.currentState,
          Firebase_Id: uid,
        },
      ]);
    } else {
      console.log("User is not a doctor");
      // ZOHO: IMPLEMENT ZOHO FUNCTION HERE
      await addDataToZoho("Patients", [
        {
          Name: data.name,
          State_of_Residence: data.currentState,
          Gender_1: data.gender,
          Firebase_Id: uid,
        },
      ]);
    }
  });

//? User update
exports.onUserProfileUpdate = functions
  .region("asia-southeast1")
  .firestore.database()
  .document("Users/{uid}")
  .onUpdate(async (snapshot, context) => {
    var uid = context.params.uid;
    var data = snapshot.after.data();
    if (data.type == "DOCTOR") {
      await axios
        .post(`http://${baseUrl2}/api/v1/users/update-doctor`, data)
        .catch((err) => {
          console.log(err);
        });
    }
  });

//? On user delete

exports.onUserDelete = functions
  .region("asia-southeast1")
  .firestore.database()
  .document("Users/{uid}")
  .onDelete(async (snapshot, context) => {
    var uid = context.params.uid;
    var data = snapshot.data();
    if (data.type == "DOCTOR") {
      await axios
        .post(`http://${baseUrl2}/api/v1/users/delete-single-doctor`, {
          uid: uid,
        })
        .catch((err) => {
          console.log(err);
        });
    }
  });

async function getZohoAuthToken() {
  const zohoAccountUrl = "https://accounts.zoho.in";
  const clientId = "1000.X8WCWD5A5YL7UIGKIIUCSWEXHO55SY";
  const clientSecret = "b25e9fdde05d6a09c75b5acf9f1fbc97744c2a9e4d";
  const zoid = "ZohoCRM.60037219423";

  var requestUrl = `${zohoAccountUrl}/oauth/v2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials&scope=ZohoCRM.org.ALL,ZohoCRM.settings.ALL,ZohoCRM.users.ALL,ZohoCRM.templates.email.READ,ZohoCRM.templates.inventory.READ,ZohoCRM.modules.ALL&soid=${zoid}`;

  var response = await axios.post(requestUrl);

  const authToken = response.data.access_token;

  return authToken;
}

async function addDataToZoho(modoule_name_api, data) {
  const authToken = await getZohoAuthToken();

  if (authToken != null || authToken != undefined) {
    var requestUrl = `${apiDomainUri}/crm/v7/${modoule_name_api}`;
    try {
      await axios.post(
        requestUrl,
        { data: data },
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${authToken}`,
          },
        }
      );
    } catch (e) {
      console.log(e);
    }
  }
}

async function getRecordIdByName(moduleName, fieldName, value) {
  const authToken = await getAccessToken();
  const url = `${apiDomainUri}/crm/v7/${moduleName}/search?criteria=(${fieldName}:equals:${encodeURIComponent(
    value
  )})`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Zoho-oauthtoken ${authToken}`,
      },
    });

    if (response.data && response.data.data && response.data.data.length > 0) {
      return response.data.data[0].id;
    } else {
      throw new Error(
        `No record found in ${moduleName} with ${fieldName} = ${value}`
      );
    }
  } catch (error) {
    console.error("Error fetching record ID:", error.message);
  }
}

async function convertDateToZohoFormat(date) {
  try {
    // Check if the input is a valid date
    if (!(date instanceof Date) || isNaN(date)) {
      throw new Error("Invalid date input");
    }

    // Get the ISO string format (YYYY-MM-DDTHH:mm:ss.sssZ)
    const isoString = date.toISOString();

    // Extract date and time parts (without milliseconds and Z)
    const datePart = isoString.substring(0, 10);
    const timePart = isoString.substring(11, 19);

    // Add the Indian Standard Time offset (+05:30)
    const formattedDate = `${datePart}T${timePart}+05:30`;

    return formattedDate;
  } catch (error) {
    console.error("Error converting date format:", error.message);
    return null;
  }
}

async function sendWhatsappNotification(phoneNumber, templateName, parameters) {
  const authToken =
    "EAALK8jtaRngBOzJpTixZCAgVYRwYC9rZAnSSWaKZCMy92LV5ZA3Lg8hp3k6C6EkCtv4U0yCMx5KFlZB5xMVdTkzAIiH74qrZA4DoEvx7h3eJ16uNCtT6sgO3knmSNXOZBqDUcna3rt6HFJq7X2o2ZADZCSu1D43ptC8Kt3e6CZCDve68fyIfBGDhLSQqkXv25FVAZDZD";
  const phoneNumberId = "636921236172504";
  const apiUrl = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
  var requestBody = {
    messaging_product: "whatsapp",
    to: phoneNumber,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: "en",
      },
      components: [
        {
          type: "body",
          parameters: parameters,
        },
      ],
    },
  };

  try {
    var response = await axios.post(apiUrl, requestBody, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    console.log(response);
  } catch (error) {
    console.log(error);
  }
}

//? Add Consultation

// //? Video Call Init Notif
// exports.initiateVideoCallOnReciever = functions
//   .region("asia-southeast1")
//   .firestore.database()
//   .document("VideoCallRooms/{callId}")
//   .onCreate(async (snapshot, context) => {
//     var callId = context.params.callId;
//     var data = snapshot.data();

//     var senderUid = data["fromUid"];
//     var recieverUid = data["toUid"];
//     var channelName = data["channelName"];

//     console.log(recieverUid);
//     var recieverUserData = await admin
//       .firestore()
//       .collection("Users")
//       .doc(recieverUid)
//       .get();

//     var recieverFcmToken = await recieverUserData.get("fcmToken");

//     console.log(recieverUserData);
//     console.log(recieverFcmToken);

//     // Send FCM Message
//     var notificationPayload = {
//       token: recieverFcmToken,

//       data: {
//         title: "New Call Request",
//         body: "Incoming Call",
//         notification_type: "Call",
//       },
//       // Set Android priority to "high"
//       android: {
//         notification: {
//           title: "New Call Request",
//           body: "Incoming Call",
//         },
//         priority: "high",
//       },
//       // Add APNS (Apple) config
//       apns: {
//         payload: {
//           alert: {
//             title: "New Call Request",
//             body: "Incoming Call",
//           },
//           aps: {
//             contentAvailable: true,
//           },
//         },
//         headers: {
//           "apns-push-type": "background",
//           "apns-priority": "5", // Must be `5` when `contentAvailable` is set to true.
//           "apns-topic": "com.soocher.soocher", // bundle identifier
//         },
//       },
//     };
//     admin
//       .messaging()
//       .send(notificationPayload)
//       .then((value) => {
//         console.log(value);
//       })
//       .catch((error) => {
//         console.log(error);
//       });
//   });
