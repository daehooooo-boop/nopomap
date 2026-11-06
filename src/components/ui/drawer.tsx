"use client";

// shadcn/ui Drawer (vaul 기반)와 같은 구조. 레지스트리 접속이 막혀 있어 직접 작성함
import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";

export function Drawer(props: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root {...props} />;
}

export const DrawerTitle = DrawerPrimitive.Title;
export const DrawerDescription = DrawerPrimitive.Description;
export const DrawerClose = DrawerPrimitive.Close;

export function DrawerContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Overlay className="fixed inset-0 z-40 bg-black/30" />
      <DrawerPrimitive.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] w-full max-w-xl flex-col rounded-t-2xl border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] outline-none",
          className,
        )}
        {...props}
      >
        <div aria-hidden className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-line" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPrimitive.Portal>
  );
}
