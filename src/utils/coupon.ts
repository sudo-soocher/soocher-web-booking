import { Coupon, CouponValidationResult } from "@/types/coupon";

/**
 * Validates a coupon against user, doctor, and usage constraints.
 */
export const validateCoupon = (
    coupon: Coupon,
    userId: string,
    doctorId: string,
    currentTotalAmount: number
): CouponValidationResult => {
    // 1. Check Expiry
    const expiryDate = new Date(coupon.couponExpiry).getTime();
    if (isNaN(expiryDate) || expiryDate < Date.now()) {
        return { isValid: false, error: "Coupon has expired" };
    }

    // 2. Check Doctor Targeting
    if (coupon.targetedDoctorIds && coupon.targetedDoctorIds.length > 0 && !coupon.targetedDoctorIds.includes(doctorId)) {
        return { isValid: false, error: "Coupon is not valid for this doctor" };
    }

    // 3. Type-based Logic (Generic vs Targeted)
    if (coupon.couponType === "Targeted") {
        // Targeted checks
        if (coupon.targetedUserIds && !coupon.targetedUserIds.includes(userId)) {
            return { isValid: false, error: "This coupon is not available for your account" };
        }

        // Global usage limit
        if (coupon.currentUsageCount >= coupon.maxUsageLimit) {
            return { isValid: false, error: "Coupon usage limit reached" };
        }
    }

    // 4. Per User Limit
    // usedByUserIds is an array of strings (UIDs)
    const userUsage = (coupon.usedByUserIds || []).filter(id => id === userId).length;
    if (userUsage >= coupon.per_user_limit) {
        return { isValid: false, error: `You have reached the usage limit for this coupon (${coupon.per_user_limit})` };
    }

    // 5. Calculate Discount
    let discountAmount = 0;
    if (coupon.isPercentage) {
        discountAmount = (currentTotalAmount * coupon.couponValue) / 100;
    } else {
        discountAmount = coupon.couponValue;
    }

    // Ensure discount doesn't exceed total
    discountAmount = Math.min(discountAmount, currentTotalAmount);

    return { isValid: true, discountAmount };
};
