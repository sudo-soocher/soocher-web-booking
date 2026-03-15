/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, forwardRef } from "react";
import { Button as NextUIButton, ButtonProps as NextUIButtonProps } from "@nextui-org/react";

export type ButtonProps = NextUIButtonProps;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
    const { onPress, onClick, isLoading: externalIsLoading, ...rest } = props;
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

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        if (externalIsLoading !== undefined) {
            if (onClick) onClick(e);
            return;
        }

        setInternalIsLoading(true);
        try {
            if (onClick) {
                const result = onClick(e) as any;
                if (result && typeof (result as any).then === 'function') {
                    await result;
                }
            }
        } finally {
            setTimeout(() => setInternalIsLoading(false), 300);
        }
    };

    const isLoading = externalIsLoading !== undefined ? externalIsLoading : internalIsLoading;

    return (
        <NextUIButton
            ref={ref}
            onPress={onPress ? handlePress : undefined}
            onClick={!onPress && onClick ? handleClick : onClick}
            isLoading={isLoading}
            {...rest}
        />
    );
});

Button.displayName = "Button";
