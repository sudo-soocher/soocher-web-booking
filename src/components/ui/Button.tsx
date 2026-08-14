/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, forwardRef } from "react";
import { Button as NextUIButton, ButtonProps as NextUIButtonProps } from "@heroui/react";
import { ButtonSpinner } from "./ButtonSpinner";

export type ButtonProps = NextUIButtonProps;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
    const {
        onPress,
        onClick,
        isLoading: externalIsLoading,
        children,
        startContent,
        endContent,
        spinnerPlacement: _spinnerPlacement,
        ...rest
    } = props;
    const [internalIsLoading, setInternalIsLoading] = useState(false);

    const handlePress = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent> | React.KeyboardEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement> | any) => {
        if (externalIsLoading !== undefined) {
            if (onPress) onPress(e);
            return;
        }

        setInternalIsLoading(true);
        try {
            if (onPress) {
                const result = onPress(e) as any;
                if (result && typeof (result as any).then === 'function') {
                    await result;
                }
            }
        } finally {
            setTimeout(() => setInternalIsLoading(false), 300);
        }
    };

    // Typed from the prop itself rather than spelled out: HeroUI types onClick as
    // an intersection that also accepts a bare FocusableElement, which a
    // hand-written MouseEvent<HTMLButtonElement> signature does not satisfy.
    //
    // The body is void-returning because HeroUI expects that, but it still awaits
    // an async handler to drive the loading state — the promise is consumed here,
    // so nothing is left floating.
    const handleClick: NonNullable<ButtonProps["onClick"]> = (e) => {
        if (externalIsLoading !== undefined) {
            if (onClick) onClick(e);
            return;
        }

        void (async () => {
            setInternalIsLoading(true);
            try {
                if (onClick) {
                    const result = onClick(e) as any;
                    if (result && typeof (result as any).then === "function") {
                        await result;
                    }
                }
            } finally {
                setTimeout(() => setInternalIsLoading(false), 300);
            }
        })();
    };

    const isLoading = externalIsLoading !== undefined ? externalIsLoading : internalIsLoading;
    const isPrimarySolid =
        rest.color === "primary" && (!rest.variant || rest.variant === "solid");

    return (
        <NextUIButton
            {...rest}
            ref={ref}
            onPress={onPress ? handlePress : undefined}
            onClick={!onPress && onClick ? handleClick : onClick}
            isLoading={false}
            isDisabled={isLoading || rest.isDisabled}
            aria-busy={isLoading}
            startContent={isLoading ? undefined : startContent}
            endContent={isLoading ? undefined : endContent}
            className={isPrimarySolid ? `!text-white ${rest.className ?? ""}` : rest.className}
        >
            {isLoading ? (
                <span className="relative inline-flex min-h-6 min-w-5 items-center justify-center">
                    <span className="invisible" aria-hidden="true">{children}</span>
                    <ButtonSpinner className="absolute inset-0 m-auto" />
                </span>
            ) : children}
        </NextUIButton>
    );
});

Button.displayName = "Button";
