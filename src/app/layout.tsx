import type { Metadata } from "next";
import "./globals.css";
import DndProviderWrapper from "./components/dnd-provider";
import { Open_Sans } from "next/font/google";

const openSans = Open_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-open-sans",
});

export const metadata: Metadata = {
  title: "Vim Calendar - Home",
  description: "Welcome to Vim Calendar - Home",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={openSans.variable} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <DndProviderWrapper>{children}</DndProviderWrapper>
      </body>
    </html>
  );
}
