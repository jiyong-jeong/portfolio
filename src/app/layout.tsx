import type { Metadata } from "next";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getMeta, getProfile } from "@/lib/data";
import "./globals.css";

const profile = getProfile();
const meta = getMeta();

export const metadata: Metadata = {
  metadataBase: meta.siteUrl ? new URL(meta.siteUrl) : undefined,
  title: {
    default: `${profile.name} · 포트폴리오`,
    template: `%s · ${profile.name} 포트폴리오`,
  },
  description: profile.tagline,
  openGraph: {
    title: `${profile.name} · 포트폴리오`,
    description: profile.tagline,
    type: "website",
    locale: "ko_KR",
  },
};

// 첫 페인트 전에 테마를 적용해 깜빡임을 막는다.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&d)){document.documentElement.classList.add('dark')}}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col antialiased">
        <Header name={profile.name} />
        <main className="flex-1">{children}</main>
        <Footer profile={profile} generatedAt={meta.generatedAt} />
      </body>
    </html>
  );
}
