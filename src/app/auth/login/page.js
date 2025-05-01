"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result.ok) {
      alert("Login up successfull");
    } else {
      setError(result.message);
    }
  };

  // const handleSubmit = async () => {
  //   const res = await fetch("/api/user/login", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ email, password }),
  //   });
  //   const data = await res.json();

  //   if (res.ok) {
  //     localStorage.setItem("token", data.token);
  //     alert("Login up successfull");
  //   } else {
  //     setError(data.message);
  //   }
  // };

  return (
    <div className="text-white">
      <input
        type="text"
        placeholder="email"
        onChange={(e) => setEmail(e.currentTarget.value)}
      ></input>
      <input
        type="password"
        placeholder="password"
        onChange={(e) => setPassword(e.currentTarget.value)}
      ></input>
      <button onClick={handleSubmit}>Login</button>
      {error && <p>{error}</p>}
    </div>
  );
}
