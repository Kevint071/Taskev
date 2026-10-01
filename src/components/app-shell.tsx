"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { SideNav } from "./shell/side-nav";
import { TabBar } from "./shell/tab-bar";
import { useKeyboardOpen } from "./shell/use-keyboard-open";
import { UserMenu } from "./shell/user-menu";

export function AppShell({
  user,
  children,
}: {
  user: { email: string; name: string | null };
  children: ReactNode;
}) {
  const pathname = usePathname();
  // A single task is a focus screen: it pins its own composer to the bottom
  // edge, so the phone tab bar steps aside.
  const focusScreen = /^\/groups\/[^/]+\/tasks\/[^/]+/.test(pathname);
  const groupDetailScreen = /^\/groups\/[^/]+\/?$/.test(pathname);
  // The assistant is pinned to the window like the focus screen: the
  // transcript scrolls inside it, so the composer never moves with the page.
  // On desktop its conversation list also sits flush against the right edge.
  const chatScreen = pathname.startsWith("/asistente");
  // While the phone keyboard is up the tab bar would ride on top of it, so it
  // steps aside on the chat screen.
  const keyboardOpen = useKeyboardOpen(chatScreen);
  const hideTabBar = focusScreen || (chatScreen && keyboardOpen);

  // The focus screen is pinned to the window instead of sized with `h-dvh`:
  // installed Android apps resolve `dvh` too tall on a fresh load (until the
  // next rotation), which pushed the composer below the visible edge.
  return (
    <div
      className={`flex min-w-0 ${
        focusScreen || chatScreen ? "fixed inset-0" : "min-h-dvh flex-1"
      }`}
    >
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-70 focus:rounded-control focus:bg-raised focus:px-3 focus:py-2 focus:font-medium focus:text-ink focus:shadow-lg"
      >
        Saltar al contenido
      </a>

      <SideNav pathname={pathname} />

      <div className="flex min-w-0 min-h-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-end border-b border-line bg-surface/90 px-4 backdrop-blur md:px-10">
          <Link
            href="/"
            className="absolute left-4 top-1/2 flex h-7 -translate-y-1/2 items-center rounded-control md:hidden"
          >
            <Brand />
          </Link>
          <UserMenu user={user} />
        </header>

        <main
          id="contenido"
          tabIndex={-1}
          data-page-scroll={focusScreen || chatScreen ? undefined : ""}
          className={`flex min-w-0 w-full flex-1 flex-col gap-8 focus:outline-none ${
            focusScreen
              ? "min-h-0 overflow-y-auto overscroll-contain px-0 pt-0 pb-0"
              : chatScreen
                ? `min-h-0 overflow-y-auto overscroll-contain p-0 md:pb-0 ${
                    keyboardOpen
                      ? "pb-0"
                      : "pb-[calc(4rem+env(safe-area-inset-bottom))]"
                  }`
                : `mx-auto max-w-220 px-4 pb-28 md:px-10 md:pb-16 ${
                    groupDetailScreen ? "pt-4 md:pt-7" : "pt-6 md:pt-10"
                  }`
          }`}
        >
          {focusScreen ? (
            <div className="mx-auto flex w-full max-w-220 flex-1 flex-col gap-8 px-4 pt-3 pb-0 md:px-10 md:pt-10">
              {children}
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      <TabBar pathname={pathname} hidden={hideTabBar} />
    </div>
  );
}
