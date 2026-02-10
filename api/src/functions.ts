import { app } from "@azure/functions";
import { healthHandler } from "./health";
import { initializeHandler } from "./handlers/initialize";
import { profileHandler } from "./handlers/profile";
import { usersHandler } from "./handlers/users";
import { authLoginHandler } from "./handlers/auth-login";
import { authRegisterHandler } from "./handlers/auth-register";
import { authForgotPasswordHandler } from "./handlers/auth-forgot-password";
import { authResetPasswordHandler } from "./handlers/auth-reset-password";
import { authVerifyEmailHandler } from "./handlers/auth-verify-email";
import { authResendVerificationHandler } from "./handlers/auth-resend-verification";
import { authSendInvitationHandler } from "./handlers/auth-send-invitation";
import { authAcceptInvitationHandler } from "./handlers/auth-accept-invitation";
import { usersApproveHandler } from "./handlers/users-approve";
import { usersSuspendHandler } from "./handlers/users-suspend";
import { usersDeleteHandler } from "./handlers/users-delete";
import { usersUpdateHandler } from "./handlers/users-update";
import { projectsDeleteHandler } from "./handlers/projects-delete";
import { sitesDeleteHandler } from "./handlers/sites-delete";
import { sitesHandler } from "./handlers/sites";
import { projectsHandler } from "./handlers/projects";
import { contactsHandler } from "./handlers/contacts";
import { businessesHandler } from "./handlers/businesses";

// Register health check first to test if app is loading
app.http("health", {
  methods: ["GET"],
  route: "health",
  handler: healthHandler,
});

// Register all HTTP functions
app.http("initialize", {
  methods: ["GET", "OPTIONS"],
  route: "initialize",
  handler: initializeHandler,
});

app.http("profile", {
  methods: ["GET", "OPTIONS"],
  route: "profile",
  handler: profileHandler,
});

app.http("users", {
  methods: ["GET", "POST", "OPTIONS"],
  route: "users",
  handler: usersHandler,
});

app.http("auth-login", {
  methods: ["POST", "OPTIONS"],
  route: "auth/login",
  handler: authLoginHandler,
});

app.http("auth-register", {
  methods: ["POST", "OPTIONS"],
  route: "auth/register",
  handler: authRegisterHandler,
});

app.http("auth-forgot-password", {
  methods: ["POST", "OPTIONS"],
  route: "auth/forgot-password",
  handler: authForgotPasswordHandler,
});

app.http("auth-reset-password", {
  methods: ["POST", "OPTIONS"],
  route: "auth/reset-password",
  handler: authResetPasswordHandler,
});

app.http("auth-verify-email", {
  methods: ["POST", "OPTIONS"],
  route: "auth/verify-email",
  handler: authVerifyEmailHandler,
});

app.http("auth-resend-verification", {
  methods: ["POST", "OPTIONS"],
  route: "auth/resend-verification",
  handler: authResendVerificationHandler,
});

app.http("auth-send-invitation", {
  methods: ["POST", "OPTIONS"],
  route: "auth/send-invitation",
  handler: authSendInvitationHandler,
});

app.http("auth-accept-invitation", {
  methods: ["POST", "OPTIONS"],
  route: "auth/accept-invitation",
  handler: authAcceptInvitationHandler,
});

app.http("users-approve", {
  methods: ["POST", "OPTIONS"],
  route: "users/approve",
  handler: usersApproveHandler,
});

app.http("users-suspend", {
  methods: ["POST", "OPTIONS"],
  route: "users/suspend",
  handler: usersSuspendHandler,
});

app.http("users-delete", {
  methods: ["DELETE", "OPTIONS"],
  route: "users/delete",
  handler: usersDeleteHandler,
});

app.http("users-update", {
  methods: ["PUT", "OPTIONS"],
  route: "users/update",
  handler: usersUpdateHandler,
});

app.http("projects-delete", {
  methods: ["DELETE", "OPTIONS"],
  route: "projects/delete",
  handler: projectsDeleteHandler,
});

app.http("sites-delete", {
  methods: ["DELETE", "OPTIONS"],
  route: "sites/delete",
  handler: sitesDeleteHandler,
});

app.http("sites", {
  methods: ["GET", "POST", "PUT", "OPTIONS"],
  route: "sites",
  handler: sitesHandler,
});

app.http("projects", {
  methods: ["GET", "POST", "PUT", "OPTIONS"],
  route: "projects",
  handler: projectsHandler,
});

app.http("contacts", {
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  route: "contacts",
  handler: contactsHandler,
});

app.http("businesses", {
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  route: "businesses",
  handler: businessesHandler,
});

export { app };

