export const playSound = (type: "notification" | "message") => {
  const audio = new Audio(
    type === "notification" ? "/sounds/notification.mp3" : "/sounds/message.mp3"
  );
  audio.volume = 0.5;
  audio.play().catch((err) => console.log("Audio play failed:", err));
};
