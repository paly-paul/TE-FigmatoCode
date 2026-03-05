"use client";

import { useState } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import {
  SocialLoginDivider,
  SocialLoginButtons,
} from "@/components/auth/SocialButtons";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function SignupPage() {
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: connect to auth API
    console.log(form);
    window.location.href = "/signup/confirmation";
  }

  return (
    <AuthLayout
      showFooter
      footerText="Already have an account?"
      footerLinkLabel="Login"
      footerLinkHref="/login"
    >
      {/* Heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Create An Account
        </h1>
        <p className="text-sm text-gray-500">
          Continue with your Email ID, Name &amp; Password
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          name="email"
          placeholder="Enter email ID here..."
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          required
        />

        {/* First Name & Last Name row */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First Name"
            type="text"
            name="firstName"
            placeholder="Enter first name here..."
            value={form.firstName}
            onChange={handleChange}
            autoComplete="given-name"
            required
          />
          <Input
            label="Last Name"
            type="text"
            name="lastName"
            placeholder="Enter last name here..."
            value={form.lastName}
            onChange={handleChange}
            autoComplete="family-name"
            required
          />
        </div>

        <Input
          label="Password"
          name="password"
          isPassword
          showInfoIcon
          placeholder="Enter password here..."
          value={form.password}
          onChange={handleChange}
          autoComplete="new-password"
          required
        />

        <Button type="submit" className="mt-1">
          Create Account
        </Button>
      </form>

      <SocialLoginDivider />
      <SocialLoginButtons />
    </AuthLayout>
  );
}
