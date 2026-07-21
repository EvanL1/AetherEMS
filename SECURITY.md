# Security Policy

AetherEMS may commission and control physical energy equipment. Treat device
addresses, credentials, certificates, site databases, telemetry, and control
policies as sensitive.

Report vulnerabilities privately through this repository's GitHub Security
Advisories. Do not place vulnerability details, real site data, credentials,
or device identifiers in public issues or logs.

Every change must preserve these properties:

- installation never commissions or enables a site;
- control is deny-by-default, explicitly confirmed, permission checked, and
  audited by AetherEdge;
- declarative Pack assets cannot bypass AetherEdge application boundaries;
- AetherEdge dependency identity and release provenance fail closed;
- AI clients do not enter deterministic protection or hard real-time loops.

Kernel, protocol, SHM, or generic runtime vulnerabilities should also be
reported to the upstream AetherEdge repository.
