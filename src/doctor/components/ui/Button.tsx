"use client";

import React, { forwardRef, useState } from "react";
import { Button as NextUIButton, ButtonProps as NextUIButtonProps } from "@heroui/react";

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
  const { onPress, onClick, isLoading: externalIsLoading, children, ...rest } = props;
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
        <>
          <span aria-hidden="true" className="app-shimmer h-4 w-28 rounded-full bg-white/35" />
          <span className="sr-only">Saving</span>
        </>
      ) : children}
    </NextUIButton>
  );
});

Button.displayName = "Button";
