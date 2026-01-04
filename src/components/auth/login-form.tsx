"use client";

import {
  GithubIcon,
  LoaderIcon,
  MessageCircleIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { authClient } from "~/lib/auth-client";

const signInSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type ValidationError = {
  field: string;
  message: string;
};

export function LoginForm() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [loading, setLoading] = useState(false);

  const getFieldError = (field: string): string | undefined => {
    return validationErrors.find(e => e.field === field)?.message;
  };

  const handleAuthError = (error: { message?: string; status?: number; statusText?: string }) => {
    const errorMessage = error.message || error.statusText || "Authentication failed";
    const lowerErrorMessage = errorMessage.toLowerCase();

    let userMessage = errorMessage;
    if (lowerErrorMessage.includes("user not found")) {
      userMessage = "No account found. Please sign up.";
    }
    else if (lowerErrorMessage.includes("invalid")) {
      userMessage = "Invalid email or password.";
    }
    else if (lowerErrorMessage.includes("already exists")) {
      userMessage = "An account with this email already exists.";
    }
    
    toast.error(userMessage);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);
    setLoading(true);

    try {
      if (isLogin) {
        const result = signInSchema.safeParse({ email, password });
        if (!result.success) {
          const errors = result.error.issues.map(issue => ({
            field: issue.path[0] as string,
            message: issue.message,
          }));
          setValidationErrors(errors);
          setLoading(false);
          return;
        }

        const { data, error: authError } = await authClient.signIn.email({
          email,
          password,
        });

        if (authError) {
          handleAuthError(authError);
          setLoading(false);
          return;
        }

        if (data) {
          router.refresh();
          router.push("/");
        }
      }
      else {
        const result = signUpSchema.safeParse({ name, email, password });
        if (!result.success) {
          const errors = result.error.issues.map(issue => ({
            field: issue.path[0] as string,
            message: issue.message,
          }));
          setValidationErrors(errors);
          setLoading(false);
          return;
        }

        const { data, error: authError } = await authClient.signUp.email({
          email,
          password,
          name,
        });

        if (authError) {
          handleAuthError(authError);
          setLoading(false);
          return;
        }

        if (data) {
          router.refresh();
          router.push("/");
        }
      }
    }
    catch (err) {
      console.error("Auth error:", err);
      toast.error("Authentication failed. Please try again.");
      setLoading(false);
    }
  };

  const handleGitHubSignIn = async () => {
    try {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: "/",
      });
    }
    catch (err) {
      toast.error(err instanceof Error ? err.message : "GitHub sign-in failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <MessageCircleIcon className="text-primary size-5" />
          <span className="text-sm font-semibold">BobrChat</span>
        </div>
        <h1 className="text-lg font-semibold">
          {isLogin ? "Welcome back" : "Create an account"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isLogin
            ? "Sign in to continue to BobrChat"
            : "Get started with your own AI chat"}
        </p>
      </div>

      {/* GitHub Sign In */}
      <Button
        variant="outline"
        className="w-full"
        onClick={handleGitHubSignIn}
      >
        <GithubIcon className="size-4" />
        Continue with GitHub
      </Button>

      {/* Divider */}
      <div className="relative">
        <Separator />
        <span
          className={`
            bg-background text-muted-foreground absolute top-1/2 left-1/2
            -translate-x-1/2 -translate-y-1/2 px-2 text-xs
          `}
        >
          or
        </span>
      </div>

      <form onSubmit={handleEmailAuth} className="space-y-3">
        {!isLogin && (
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              required
              aria-invalid={!!getFieldError("name")}
              className={getFieldError("name")
                ? `border-destructive`
                : ""}
            />
            {getFieldError("name") && (
              <p className="text-destructive text-xs">{getFieldError("name")}</p>
            )}
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            aria-invalid={!!getFieldError("email")}
            className={getFieldError("email")
              ? `border-destructive`
              : ""}
          />
          {getFieldError("email") && (
            <p className="text-destructive text-xs">{getFieldError("email")}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            aria-invalid={!!getFieldError("password")}
            className={getFieldError("password")
              ? `border-destructive`
              : ""}
          />
          {getFieldError("password") && (
            <p className="text-destructive text-xs">{getFieldError("password")}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading
            ? (
                <>
                  <LoaderIcon className="size-4 animate-spin" />
                  Loading...
                </>
              )
            : isLogin
              ? "Sign In"
              : "Create Account"}
        </Button>
      </form>

      {/* Toggle Auth Mode */}
      <p className="text-muted-foreground text-center text-sm">
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <Button
           variant="link"
           size="sm"
           onClick={() => {
             setIsLogin(!isLogin);
           }}
           className="px-0"
         >
           {isLogin ? "Sign up" : "Sign in"}
         </Button>
      </p>
    </div>
  );
}
