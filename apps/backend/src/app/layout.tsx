import type { ReactNode } from "react";

export const metadata = {
  title: "AG Beauty Salon - Backend",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

