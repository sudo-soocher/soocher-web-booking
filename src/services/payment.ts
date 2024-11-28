import { loadScript } from "@/utils/script-loader";

interface PaymentOptions {
  amount: number;
  currency: string;
  doctorName: string;
  patientName: string;
  consultationId: string;
  onSuccess: (response: any) => void;
  onFailure: (error: any) => void;
}

export const initializeRazorpay = async (options: PaymentOptions) => {
  const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");

  if (!res) {
    alert("Razorpay SDK failed to load");
    return;
  }

  try {
    // Create order using our proxy API route
    const order = await createRazorpayOrder(options.amount, options.currency);

    const razorpayOptions = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: options.amount,
      currency: options.currency,
      name: "Soocher",
      description: `Consultation with ${options.doctorName}`,
      order_id: order.id,
      handler: function (response: any) {
        options.onSuccess(response);
      },
      prefill: {
        name: options.patientName,
      },
      notes: {
        consultationId: options.consultationId,
      },
      theme: {
        color: "#2A47CB",
      },
    };

    const paymentObject = new (window as any).Razorpay(razorpayOptions);
    paymentObject.open();
  } catch (error) {
    console.error("Error in initializeRazorpay:", error);
    options.onFailure(error);
  }
};

const createRazorpayOrder = async (amount: number, currency: string) => {
  try {
    // Call our proxy API route instead of directly calling Cloud Function
    const response = await fetch("/api/create-razorpay-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data || !data.id) {
      throw new Error("Invalid order response");
    }

    return data;
  } catch (error) {
    console.error("Error creating order:", error);
    throw error;
  }
};
