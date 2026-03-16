export type CouponType = "Generic" | "Targeted";

export interface Coupon {
    id: string; // The Firestore document ID
    couponCode: string;
    couponName?: string;
    couponDescription?: string;
    couponType: CouponType;
    isGeneric: boolean;
    maxUsageLimit: number; // Total uses allowed
    currentUsageCount: number; // Current total uses
    per_user_limit: number; // Uses allowed per single user
    usedByUserIds: string[]; // Array of UIDs that used this coupon
    tray_visibility: boolean;
    targetedUserIds: string[]; // UIDs allowed to use it
    targetedDoctorIds: string[]; // Doctor IDs it applies to
    couponExpiry: string; // "YYYY-MM-DD"
    couponValue: number; // The discount amount
    isPercentage?: boolean; // If not present, assume flat amount
}

export interface CouponValidationResult {
    isValid: boolean;
    error?: string;
    discountAmount?: number;
}
