# Recurring Records Manager Extension - Airtable

Last Edited By: Suman Raj Sharma
Created: November 26, 2025 10:47 AM
Last Edited Time: November 26, 2025 10:52 AM
Created By: Suman Raj Sharma

# Product Requirements Document: LoopTable (Recurring Records Manager)

**Version:** 1.0 (MVP)
**Date:** November 26, 2025
**Status:** Ready for Development
**Type:** Airtable Extension (Hybrid: React Frontend + Node.js Backend)

---

## 1. Executive Summary

**LoopTable** is a "Set and Forget" automation tool for Airtable. It solves a critical platform limitation: the inability to schedule recurring record creation (daily, weekly, monthly) without writing code or using external automation platforms like Zapier.

It operates as a **Hybrid App**:

1. **Frontend (Extension):** A visual dashboard inside Airtable to configure schedules.
2. **Backend (Engine):** A persistent Node.js/Redis server that executes the schedules via the Airtable API, ensuring reliability even when the user is offline.

---

## 2. User Flows

### 2.1 The "Setup" Flow

1. User installs the Extension in their Base.
2. User selects a "Template Record" (e.g., *Invoice Template*).
3. User sets frequency: "Every Monday at 9:00 AM".
4. User configures rules: "Shift the 'Due Date' by +7 Days relative to creation."
5. User clicks "Activate."
6. **Backend Action:** Server receives the schedule + OAuth Token and queues the job.

### 2.2 The "Execution" Flow (Backend)

1. **Trigger:** Cron timer fires (Monday @ 9 AM).
2. **Fetch:** Worker retrieves the fresh "Template Record" data from Airtable.
3. **Sanitize:** Worker strips out Read-Only fields (Formulas, Rollups).
4. **Transform:** Worker applies Date Shifting logic.
5. **Write:** Worker creates the new record via API.
6. **Log:** Result is stored in the database; user sees "Success" in their dashboard next time they login.

---

## 3. Functional Requirements

### 3.1 Core Scheduler

- **FR-01 Frequency Options:**
    - Daily (Every X Days).
    - Weekly (Day selection: Mon, Wed, Fri).
    - Monthly (Date selection: 1st, 15th, Last Day).
    - Yearly.
- **FR-02 Timezone Handling:**
    - UI detects Browser Timezone (e.g., `Australia/Melbourne`).
    - Backend stores schedule in UTC.
    - Execution converts UTC -> Local Time to determine if it's "9 AM" for the user.
- **FR-03 End Conditions:** Never, After X runs, or On Date Y.

### 3.2 Record Duplication & Sanitization (Critical)

- **FR-04 Deep Copying:**
    - **Text/Select/Number:** Direct copy.
    - **Attachments:** Copy the `url` to upload to the new record.
    - **Linked Records:** Copy the array of `record_ids` (maintaining relationships).
- **FR-05 Read-Only Exclusion (The "Anti-Crash" Logic):**
    - The system **must** inspect field metadata before writing.
    - **Exclude** types: `formula`, `rollup`, `lookup`, `count`, `createdTime`, `lastModifiedTime`, `autoNumber`, `button`, `externalSyncSource`.
    - Attempting to write to these triggers an API error; they must be filtered out of the payload.

### 3.3 Smart Date Shifting

- **FR-06 Date Logic:**
    - **Static:** Copy date as-is (rare).
    - **Relative to Trigger:** `New Date = Execution Date + X Days`.
    - **Relative to Previous:** `New Date = Previous Record Date + Interval`.
- **FR-07 Safe Month Math:**
    - If a monthly task is set for the 31st, and the current month is February (28 days):
    - Logic: `Math.min(targetDay, daysInMonth)`. Result: Feb 28th.

---

## 4. Technical Architecture

### 4.1 Tech Stack

- **Frontend:** React, `@airtable/blocks` SDK, Tailwind CSS (via CDN or styled-components).
- **Backend:** Node.js (Express).
- **Queue:** BullMQ (Redis) - *Required for reliable cron jobs.*
- **Database:** PostgreSQL.
- **Hosting:** Railway/Render (Must support persistent Docker containers, not Serverless functions).

### 4.2 Security & Auth

- **SEC-01 OAuth 2.0:**
    - The app implements the "Sign in with Airtable" flow.
    - Scopes: `data.records:read`, `data.records:write`, `schema.bases:read`.
- **SEC-02 Token Encryption:**
    - **Requirement:** The `refresh_token` MUST be encrypted at rest in the database using `AES-256-GCM`.
    - **Key Management:** Encryption key stored in Environment Variables (`ENCRYPTION_KEY`).
- **SEC-03 Isolation:** One user's token can never be used to access another user's base.

---

## 5. Database Schema (PostgreSQL)

SQL

- `- Users (Linked to Airtable User ID)
CREATE TABLE users ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), airtable_user_id VARCHAR(255) UNIQUE NOT NULL, email VARCHAR(255), subscription_status VARCHAR(50) DEFAULT 'free', -- 'free', 'active', 'past_due' stripe_customer_id VARCHAR(255), created_at TIMESTAMP DEFAULT NOW()
);
-- Credentials (SENSITIVE)
CREATE TABLE credentials ( user_id UUID REFERENCES users(id), encrypted_refresh_token TEXT NOT NULL, iv TEXT NOT NULL, -- Initialization Vector for AES last_refreshed TIMESTAMP, PRIMARY KEY (user_id)
);
-- Schedules
CREATE TABLE schedules ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id), base_id VARCHAR(255) NOT NULL, table_id VARCHAR(255) NOT NULL, template_record_id VARCHAR(255) NOT NULL, -- Timing cron_expression VARCHAR(50) NOT NULL, -- "0 9 * * 1" timezone VARCHAR(100) NOT NULL, -- Configuration field_config JSONB DEFAULT '{}', -- Stores date shifting rules is_active BOOLEAN DEFAULT TRUE, -- Stats run_count INT DEFAULT 0, last_run_status VARCHAR(50), -- 'success', 'error' last_run_log TEXT
);`

---

## 6. Monetization Strategy

### 6.1 Gating Logic

- **Free Tier:**
    - Can create schedules, but they must be triggered manually via a "Run Now" button (Client-side execution).
    - Limit: 1 Active Automated Schedule.
- **Pro Tier ($9/mo):**
    - Unlimited Automated Schedules (Server-side execution).
    - "Smart Date" Logic enabled.

### 6.2 Implementation

- When `POST /api/schedule` is called:
    1. Check `users.subscription_status`.
    2. Count active schedules in `schedules` table.
    3. If `count >= 1` AND `status == 'free'`, return `403 Payment Required`.

---

## 7. Compliance & Marketplace Requirements

### 7.1 Legal Assets

- **Privacy Policy:** Must explicitly state: "We store an encrypted reference to your access token to perform background tasks. We do not store your record data persistently."
- **Terms of Service:** Standard SaaS limitation of liability.

### 7.2 Review Prep

- **Video Demo:** Create a loom video showing the "OAuth" flow and the "Record Creation" flow to prove you aren't scraping data.
- **Test Credentials:** Provide Airtable review team with a test login (or instructions on how to use it).

---

## 8. Implementation Roadmap

### Phase 1: The "Dumb" Frontend (Week 1)

- **Objective:** Build the UI.
- **Tasks:**
    - Initialize React Block.
    - Build "Select Record" component.
    - Build "Frequency Picker" component.
    - Mock the "Save" button (just `console.log` the config).

### Phase 2: The Backend Foundation (Week 2)

- **Objective:** Server & Auth.
- **Tasks:**
    - Setup Express + Postgres.
    - Implement `GET /auth/airtable` (OAuth Handshake).
    - Implement `AES-256` encryption helper functions.

### Phase 3: The Engine (Week 3)

- **Objective:** BullMQ & Logic.
- **Tasks:**
    - Setup Redis.
    - Write the `worker.ts` function.
    - Implement the "Field Type Check" (Sanitization).
    - Implement the "Date Math" logic.

### Phase 4: Integration & Payments (Week 4)

- **Objective:** Connect Frontend to Backend.
- **Tasks:**
    - Frontend sends payload to `POST /api/schedule`.
    - Add Stripe Checkout link in the Settings panel.
    - Deploy to Railway/Render.

### Phase 5: Testing & Submission (Week 5)

- **Tasks:**
    - Test Edge Case: Delete the template record -> Ensure server degrades gracefully (pauses schedule + logs error).
    - Test Edge Case: February 29th.
    - Submit to Airtable Marketplace.

---

### End of PRD

**Note to Developer:** Start by setting up the **PostgreSQL** database and the **React** scaffolding. Do not attempt to write the Cron logic inside the React Extension; strictly separate concerns between Client (UI) and Server (Engine).