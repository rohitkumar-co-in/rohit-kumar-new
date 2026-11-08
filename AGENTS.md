<!-- vibedoctor:start -->
## VibeDoctor — Automated Code Validation

This project is registered with VibeDoctor MCP. Use its tools as part of coding work in this repository.

- At the start of a coding session, call `vibedoctor_status` to review project health and known findings.
- Before editing unfamiliar code or refactoring, call `vibedoctor_graph` for context, impact, or an architecture overview.
- After code changes, call `vibedoctor_check` on the changed files and resolve high or critical findings before finishing.
- Use the security, imports, performance, or structure category when the relevant change calls for it.
- Use `vibedoctor_ask` to ask questions about project structure or health.
- If a finding is incorrect or accepted, record the reason with `vibedoctor_status` using `action: "note"`.

Pass file paths and their full contents to `vibedoctor_check`. Do not use this project's VibeDoctor tools for unrelated repositories.
<!-- vibedoctor:end -->
