"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    if (!localStorage.getItem("token")) {
      localStorage.setItem("token", "dummy-token-user1");
      localStorage.setItem("user", JSON.stringify({ id: 1, username: "user1", email: "user1@gmail.com", full_name: "User1", role: "admin" }));
    }
    router.replace("/dashboard");
  }, [router]);
  return null;
}
