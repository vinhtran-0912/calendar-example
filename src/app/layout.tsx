import type { Metadata } from "next";
import "./globals.css";
import DndProviderWrapper from "./components/DndProvider";
import { Open_Sans } from "next/font/google";

const openSans = Open_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-open-sans",
});

export const metadata: Metadata = {
  title: "Calendar Example",
  description: "Calendar drag and drop example",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={openSans.variable}>
      <body className="font-sans antialiased">
        <DndProviderWrapper>{children}</DndProviderWrapper>
      </body>
    </html>
  );
}
