import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Process recurring transactions daily at midnight UTC
crons.daily(
  "process-recurring-transactions",
  { hourUTC: 0, minuteUTC: 0 },
  api.transactions.processRecurring
);

export default crons;
