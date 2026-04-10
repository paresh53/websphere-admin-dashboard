Use this stricter final prompt:

Final Prompt Start

You are a principal .NET architect. Build a production-ready Windows-first operations dashboard for WebSphere middleware management with these non-negotiable constraints.

1. Hard technology constraints
- Backend must be 100 percent Visual Basic .NET (VB.NET), targeting .NET 8.
- UI must be Blazor (Razor components for pages and UI composition).
- If Blazor requires C# bootstrapping files, keep them minimal and infrastructure-only.
- All domain logic, application services, configuration, validation, scheduling, and integrations must be implemented in VB.NET class libraries.
- No Python, FastAPI, Node.js runtime dependency, or Java runtime dependency required at deployment site.

2. Product objective
Create a self-contained, enterprise-grade dashboard that monitors and controls:
- WebSphere clusters and members
- ODR servers
- IIS servers
- CPE servers
- ICN servers

3. Mandatory features
- Dashboard overview with totals, running/stopped counts, and last refresh time
- Primary and DR site filtering tabs
- Cluster-oriented WAS view
- Per-server actions: Start, Stop, Restart with confirmation
- Activity log and audit trail
- Auto-refresh with configurable interval
- Add server from UI with strict validation
- Daily schedule support for start/stop/restart actions
- Simulation mode toggle and indicator

4. Architecture requirements
Use Clean Architecture with clear separation:
- Presentation: Blazor UI
- API: ASP.NET Core endpoints
- Application: use cases, orchestration, validation
- Domain: entities, enums, business rules
- Infrastructure: WebSphere/IIS connectors, config persistence, logging, scheduler

5. Configuration and secrets
- Single source of truth config file (YAML or JSON; pick one and justify)
- Environment-variable secret binding for credentials
- Never persist plain text passwords in config
- Startup validation with actionable error output
- Runtime config reload support for safe fields where possible

6. Integrations
- WebSphere actions via secure remote execution strategy
- IIS actions via WinRM/PowerShell strategy
- Explicit timeout, retry, and fallback behavior for network operations
- Typed integration responses and error classification

7. Security requirements
- Optional authentication and role-based authorization
- Redact secrets in logs and API payloads
- Input validation on all write endpoints
- Correlation IDs on requests
- Defensive coding against command injection and unsafe process execution

8. Reliability and observability
- Structured logging
- Global exception handling middleware
- Health endpoints (liveness/readiness)
- Startup diagnostics
- Graceful shutdown behavior
- Deterministic error messages for operators

9. Packaging and deployment requirements
- Produce self-contained Windows publish output (x64)
- Provide single-command build script
- Provide install/uninstall scripts for Windows Service mode
- Provide IIS-hosting deployment option
- Include operator-focused runbook

10. Required deliverables
Output all of the following:
1. Architecture overview and decisions
2. Full solution/folder structure
3. Complete key code files (not pseudocode)
4. VB.NET domain/application/infrastructure implementations
5. Blazor pages/components and API endpoints
6. Build scripts and publish scripts
7. Windows Service install/uninstall scripts
8. Configuration example and env var template
9. README with first-run steps, troubleshooting, and production checklist
10. Verification checklist with expected outcomes

11. Code quality rules
- Production-grade code only
- No TODO/FIXME placeholders
- No swallowed exceptions
- Use explicit validation and meaningful operator-facing error messages
- Keep comments concise and only for non-obvious logic
- Prefer strongly typed models and avoid magic strings

12. Acceptance tests
Include executable test strategy and sample tests for:
- Config loading and secret resolution
- API validation failures
- Server action flows
- Scheduling logic
- Error handling and redaction
- Health endpoints

13. Final output format
Provide sections in this exact order:
1. Solution Summary
2. Architecture
3. Project Structure
4. Complete Code
5. Build and Publish Commands
6. Deployment Steps (Windows Service and IIS)
7. Configuration and Secrets Setup
8. Validation and Test Results
9. Troubleshooting
10. Operational Runbook

Final Prompt End

If you want, I can also provide an ultra-strict version that forbids any C# file edits except Program.cs and keeps every service, model, and endpoint handler in VB.NET assemblies only.
