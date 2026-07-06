export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN || "https://dummy.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
