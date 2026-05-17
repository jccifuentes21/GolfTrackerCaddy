import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, useSignIn } from "@clerk/clerk-react";
import { useToast } from "../hooks/useToast";
import styles from "../styles/pages/auth.module.scss";
import { Navigate } from "react-router-dom";

interface UserForm {
  email: string;
  password: string;
}

// SignInPage handles both primary sign-in and the optional second-factor step.
// Clerk owns the actual auth protocol; this component owns form state and UX feedback.
export default function SignInPage() {
  const { signIn, isLoaded, setActive } = useSignIn();

  // useAuth answers "does a session already exist?" so signed-in users skip this screen.
  const { isSignedIn, isLoaded: isaAuthLoaded } = useAuth();

  const navigate = useNavigate();
  const toast = useToast();
  const [userForm, setUserForm] = useState<UserForm>({
    email: "",
    password: "",
  });
  const [code, setCode] = useState("");
  const [secondFactor, setSecondFactor] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Clerk returns a status instead of assuming every sign-in is complete.
      // That lets the UI branch into MFA or other future auth steps.
      const result = await signIn!.create({
        identifier: userForm.email,
        password: userForm.password,
      });
      if (result.status === "complete") {
        await setActive!({ session: result.createdSessionId });
        navigate("/");
      } else if (result.status === "needs_second_factor") {
        await signIn!.prepareSecondFactor({ strategy: "email_code" });
        setSecondFactor(true);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(
        err.errors?.[0]?.message ?? "Something went wrong. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSecondFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // The code was prepared with prepareSecondFactor; this call attempts to finish it.
      const result = await signIn!.attemptSecondFactor({
        strategy: "email_code",
        code,
      });
      if (result.status === "complete") {
        await setActive!({ session: result.createdSessionId });
        // navigate('/')
      } else {
        toast.error("Verification incomplete. Try again.");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message ?? "Invalid code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      // OAuth leaves the app and returns through /sso-callback, which App.tsx routes to Clerk.
      await signIn!.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message ?? "Could not connect to Google.");
    }
  };

  // Wait for both auth hooks so we do not flash the sign-in form for an existing session.
  if (!isaAuthLoaded || !isLoaded) return null;
  if (isSignedIn) return <Navigate to="/" replace />;

  if (secondFactor) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.brand}>
            <img src="/favicon.svg" alt="The Loop" className={styles.mark} />
            <h1 className={styles.productName}>The Loop</h1>
          </div>

          <form onSubmit={handleSecondFactor} className={styles.form}>
            <p className={styles.verifyHeading}>Check your inbox</p>
            <p className={styles.verifySubtext}>
              We sent a verification code to <strong>{userForm.email}</strong>.
              Enter it to finish signing in.
            </p>

            <div className={styles.field}>
              <label htmlFor="code" className={styles.label}>
                Verification code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className={styles.input}
                placeholder="000000"
                required
              />
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
              data-loading={loading || undefined}
            >
              {loading ? "Verifying..." : "Verify"}
            </button>

            <button
              type="button"
              className={styles.resendBtn}
              onClick={() =>
                signIn!.prepareSecondFactor({ strategy: "email_code" })
              }
            >
              Resend code
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <img src="/favicon.svg" alt="The Loop" className={styles.mark} />
          <h1 className={styles.productName}>The Loop</h1>
          <p className={styles.tagline}>Play well. Know why.</p>
        </div>

        <form onSubmit={handleEmailSignIn} className={styles.form}>
          <button
            type="button"
            className={styles.googleBtn}
            onClick={handleGoogleSignIn}
          >
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={userForm.email}
              onChange={(e) =>
                setUserForm((prev) => ({ ...prev, email: e.target.value }))
              }
              className={styles.input}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className={styles.field}>
            <div className={styles.fieldHeader}>
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
              <Link to="/forgot-password" className={styles.forgotLink}>
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={userForm.password}
              onChange={(e) =>
                setUserForm((prev) => ({ ...prev, password: e.target.value }))
              }
              className={styles.input}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
            data-loading={loading || undefined}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className={styles.toggle}>
          New here? <Link to="/sign-up">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
