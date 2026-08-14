"use client";

import React, { forwardRef, useState } from "react";
import { Button as NextUIButton, ButtonProps as NextUIButtonProps } from "@heroui/react";
import { ButtonSpinner } from "@/components/ui/ButtonSpinner";

type HeroUIClickHandler = NonNullable<NextUIButtonProps["onClick"]>;
type HeroUIClickEvent = Parameters<HeroUIClickHandler>[0];

export interface ButtonProps extends Omit<NextUIButtonProps, "onPress" | "onClick"> {
  onPress?: () => void | Promise<void>;
  onClick?: (e: HeroUIClickEvent) => void | Promise<void>;
}

/**
 * NextUI Button wrapper that handles async onPress/onClick and surfaces
 * a loading state automatically. Matches the soocher-web pattern.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const { onPress, onClick, isLoading: externalIsLoading, children, spinnerPlacement: _spinnerPlacement, ...rest } = props;
  const [internalIsLoading, setInternalIsLoading] = useState(false);
  const isLoading = externalIsLoading ?? internalIsLoading;

  const handlePress = async () => {
    if (!onPress) return;
    try {
      setInternalIsLoading(true);
      await onPress();
    } finally {
      setInternalIsLoading(false);
    }
  };

  const handleClick = async (e: HeroUIClickEvent) => {
    if (!onClick) return;
    try {
      setInternalIsLoading(true);
      await onClick(e);
    } finally {
      setInternalIsLoading(false);
    }
  };

  const isPrimarySolid =
    rest.color === "primary" &&
    !rest.variant ||
    (rest.color === "primary" && rest.variant === "solid");

  return (
    <NextUIButton
      ref={ref}
      {...rest}
      isLoading={false}
      isDisabled={isLoading || rest.isDisabled}
      aria-busy={isLoading}
      onPress={onPress ? handlePress : undefined}
      onClick={onClick ? handleClick : undefined}
      className={isPrimarySolid ? `text-white ${rest.className ?? ""}` : rest.className}
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
