# Security

Funkwiz is self-hosted. Operators are responsible for their Cloudflare account,
credentials, backups, sender configuration and any student data they collect.
The current supported code is the `main` branch; there are no versioned security
support guarantees yet.

## Reporting a vulnerability

Please avoid public issues containing exploit details, passwords, reset links,
student names or reports. Use **Security → Report a vulnerability** on the
[GitHub repository](https://github.com/OSSAfrica/funkwiz/security/advisories/new)
when private vulnerability reporting is available. If it is unavailable, open a
minimal issue asking for a private reporting channel without disclosing details.

Include the affected revision, reproduction steps using fictional data, expected
behavior and impact. Never send real student data or credentials.

## Operating an installation

- Generate independent authentication and teacher setup secrets for every instance.
- Configure the exact HTTPS origin and your own allowed teacher email.
- Keep the private setup code in a password manager: it also enables password recovery.
- Store production secrets in Cloudflare, and keep local configuration out of Git.
- Review access to saved learner reports and export only the data you need.
- Report exposed credentials privately and revoke them; removing a file does not
  remove its previous versions from Git history.

See [deployment](docs/DEPLOY.md) and [authentication](docs/AUTH.md) for setup.
