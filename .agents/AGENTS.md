# Agent Guidelines

## Password and Credential Policy
- **CRITICAL**: Never hardcode or guess passwords.
- Always check `.env.local` at the root of the project to retrieve usernames and passwords.
- Based on `.env.local`:
  - Counter B1:
    - Username: `b1` (or corresponding email `b1@frydaddy.pos`)
    - Password: `FryB1@2026!` (retrieved from `VITE_COUNTER_B1_PASSWORD`)
  - Counter B2:
    - Username: `b2` (or corresponding email `b2@frydaddy.pos`)
    - Password: `FryB2@2026!` (retrieved from `VITE_COUNTER_B2_PASSWORD`)

## Question Handling Policy
- When the user asks a question or mentions a question, do not update, edit, or modify any code/files—simply answer the question directly.

