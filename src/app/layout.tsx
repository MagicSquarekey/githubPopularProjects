import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LocaleProvider } from "@/components/LocaleProvider";

export const metadata: Metadata = {
  title: "githubPopularProjects — 发现 GitHub 热门项目 / Discover trending GitHub projects",
  description:
    "Browse GitHub trending repositories and search by language, stars, and keywords. Open source, self-hostable, cross-platform.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-full">
        <LocaleProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
