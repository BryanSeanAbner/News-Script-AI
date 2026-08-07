"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

interface User {
  id: number;
  username: string;
  full_name?: string;
  email: string;
  role: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M1.75 2.5h12.5a.25.25 0 01.25.25v10.5a.25.25 0 01-.25.25H1.75a.25.25 0 01-.25-.25V2.75a.25.25 0 01.25-.25zM1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25V2.75A1.75 1.75 0 0014.25 1H1.75zM9 9H7a.75.75 0 000 1.5h2a.75.75 0 000-1.5zM7 6a.75.75 0 000 1.5h5a.75.75 0 000-1.5H7zm-.75 3.75a.75.75 0 01.75-.75h5a.75.75 0 010 1.5H7a.75.75 0 01-.75-.75z" />
      </svg>
    ),
  },
  {
    href: "/editor",
    label: "Buat Naskah",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064l6.286-6.286z" />
      </svg>
    ),
  },
  {
    href: "/history",
    label: "Riwayat Naskah",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M1.643 3.143L.427 1.927A.25.25 0 000 2.104V5.75c0 .138.112.25.25.25h3.646a.25.25 0 00.177-.427L2.715 4.215a6.5 6.5 0 11-1.18 4.458.75.75 0 10-1.493.154 8.001 8.001 0 101.6-5.684zM7.75 4a.75.75 0 01.75.75v2.992l2.028.812a.75.75 0 01-.557 1.392l-2.5-1A.75.75 0 017 8.25v-3.5A.75.75 0 017.75 4z" />
      </svg>
    ),
  },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    let token = localStorage.getItem("token");
    let userData = localStorage.getItem("user");
    if (!token || !userData) {
      token = "dummy-token-user1";
      const dummyUser: User = { id: 1, username: "user1", email: "user1@gmail.com", full_name: "User1", role: "admin" };
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(dummyUser));
      setUser(dummyUser);
    } else {
      try {
        setUser(JSON.parse(userData));
      } catch {
        const dummyUser: User = { id: 1, username: "user1", email: "user1@gmail.com", full_name: "User1", role: "admin" };
        setUser(dummyUser);
      }
    }
  }, [router]);

  const getInitials = (u: User) => {
    if (u.full_name) return u.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    return u.username.slice(0, 2).toUpperCase();
  };

  return (
    <div>
      {/* Top Header */}
      <header className="gh-header">
        <Link href="/dashboard" className="gh-header-logo" style={{ textDecoration: "none" }}>
          <svg height="20" viewBox="0 0 16 16" fill="currentColor" style={{ color: "white" }}>
            <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" />
          </svg>
          <span>NewsScript AI</span>
        </Link>

        <div className="gh-header-actions" />
      </header>

      {/* Sidebar */}
      <aside className="gh-sidebar">
        <div className="gh-sidebar-section">
          <div className="gh-sidebar-section-title">Menu</div>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`gh-sidebar-item ${pathname === item.href ? "active" : ""}`}
              style={{ textDecoration: "none" }}
            >
              <span className="gh-sidebar-item-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        {user?.role === "admin" && (
          <div className="gh-sidebar-section" style={{ marginTop: "var(--space-4)", borderTop: "1px solid var(--color-border-default)", paddingTop: "var(--space-3)" }}>
            <div className="gh-sidebar-section-title">Admin</div>
            <Link
              href="/users"
              className={`gh-sidebar-item ${pathname === "/users" ? "active" : ""}`}
              style={{ textDecoration: "none" }}
            >
              <span className="gh-sidebar-item-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M5.5 3.5a2 2 0 100 4 2 2 0 000-4zM2 5.5a3.5 3.5 0 115.898 2.549 5.507 5.507 0 013.034 4.084.75.75 0 11-1.482.235 4.001 4.001 0 00-7.9 0 .75.75 0 01-1.482-.236A5.507 5.507 0 013.102 8.05 3.49 3.49 0 012 5.5zM11 4a.75.75 0 100 1.5 1.5 1.5 0 01.666 2.844.75.75 0 00-.416.672v.352a.75.75 0 00.574.73c1.2.289 2.162 1.2 2.522 2.372a.75.75 0 101.434-.44 5.01 5.01 0 00-2.56-3.012A3 3 0 0011 4z" />
                </svg>
              </span>
              Anggota Tim
            </Link>
          </div>
        )}

        {user && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "var(--space-3)", borderTop: "1px solid var(--color-border-default)", background: "var(--color-canvas-default)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <div className="gh-avatar gh-avatar-sm">{getInitials(user)}</div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: "var(--font-size-small)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.full_name || user.username}
                </div>
                <div style={{ fontSize: "11px", color: "var(--color-fg-muted)" }}>
                  <span className={`gh-label gh-label-${user.role === "admin" ? "danger" : user.role === "editor" ? "accent" : "neutral"}`} style={{ fontSize: "10px", padding: "0 4px", lineHeight: "14px" }}>
                    {user.role}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="gh-main">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="gh-mobile-nav">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`gh-mobile-nav-item ${pathname === item.href ? "active" : ""}`}
          >
            <span className="gh-mobile-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
        {user?.role === "admin" && (
          <Link
            href="/users"
            className={`gh-mobile-nav-item ${pathname === "/users" ? "active" : ""}`}
          >
            <span className="gh-mobile-nav-icon">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                <path d="M5.5 3.5a2 2 0 100 4 2 2 0 000-4zM2 5.5a3.5 3.5 0 115.898 2.549 5.507 5.507 0 013.034 4.084.75.75 0 11-1.482.235 4.001 4.001 0 00-7.9 0 .75.75 0 01-1.482-.236A5.507 5.507 0 013.102 8.05 3.49 3.49 0 002 5.5z" />
              </svg>
            </span>
            <span>Tim</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
