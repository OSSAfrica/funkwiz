# Offline Personal classroom

[Documentation index](README.md) · [Project overview](../README.md)

Run Funkwiz on a teacher’s computer and let students join through the same Wi-Fi
or router. The router does not need an internet connection. This option supports
**Personal mode only**, with one local teacher account. School workspaces and
invitations remain features of a separate School installation.

**Looking for everyday teaching instructions?** Start with
[Run a classroom quiz without internet](OFFLINE_TEACHER_GUIDE.md). This technical
guide is for the person installing Funkwiz and maintaining the laptop.

## Prepare while online

Install Git, Bun (the version in `package.json`) and a supported Node.js version
(Node 24 is used in CI). Clone the repository and install its dependencies:

```sh
git clone https://github.com/OSSAfrica/funkwiz.git
cd funkwiz
bun install --frozen-lockfile
bun run classroom --prepare
```

The command asks for the teacher’s email address. Enter the address that person
will use to sign in; no email delivery is needed. To skip the prompt, supply
`--email` followed by the actual address. Replace any sample email in a command
before using it.

Connect the teacher’s computer to the classroom router before preparing. The
launcher detects private IPv4 addresses and asks which network to use if several
are available. You can select one explicitly:

```sh
bun run classroom --prepare --email you@example.com --host 192.168.1.20
```

Use an address actually assigned to your computer; the example address is not a
default. The email identifies your local account and does not need email delivery.
It does not create or reuse a cloud account. The launcher generates independent
secrets, builds the app and applies migrations to a local database. No Cloudflare
login, API token, paid account or deployment is required.

## Start a classroom

```sh
bun run classroom
```

Open the **Teacher** address printed in the terminal, such as
`http://192.168.1.20:3000/login`. Use this address on the teacher’s screen as well
as student devices. For the first session, choose **Set up teacher account**, use
the email chosen during preparation, and choose a password. Read the private
setup code in a second terminal in the project directory:

```sh
bun run classroom:code
```

Keep that code private and store it in a password manager. It authorizes initial
teacher setup and private-code password recovery. Returning login needs only
email and password. Google sign-in and email delivery are disabled for classroom
hosting, including when credentials exist in a different development profile.

Create questions or import a quiz JSON file, choose **Host live**, and display the
lobby. Students connect to the same network, scan the lobby QR code and enter a
nickname. They need no account or app installation. The banner also shows a typed
join address; students enter the game code there. Keep the host running through
the quiz and save/export reports before shutting down.

## Starting again without internet

Once prepared, start with the same command. The launcher uses installed tools and
reuses the prepared app when its source and network settings are unchanged. Fonts,
music, graphics and report resources are served from the teacher’s computer.
Internet is not required for local sign-in, editing, live questions or reports.
The local runtime may attempt nonessential tool update checks; failure to reach
the internet must not prevent play.

If the IP address changes, restart the launcher. It detects that the previous
address is unavailable, selects/asks for a new address and refreshes the build.
Use the newly printed teacher address and a fresh lobby QR code. A changed origin
can require signing in again. Do not change networks during an active game.

To use a different port or network:

```sh
bun run classroom --host 192.168.1.20 --port 3300
```

An explicit host must be an assigned private IPv4 address. IPv6-only networks,
public IP addresses and `.local` hostnames are not supported in this first version.
After updating Funkwiz, prepare the updated version while online and rehearse it
before class. `--rebuild` forces the prepared app to refresh.

## Local data and backups

All classroom files live in the Git-ignored `.classroom/` directory:

| Path            | Contents                                           |
| --------------- | -------------------------------------------------- |
| `settings.json` | Local teacher identity, origin and private secrets |
| `state/`        | Persistent local database and live-room storage    |
| `dist/`         | Prepared app and bundled assets                    |

Stop the launcher before copying `.classroom/` for a complete backup. Protect the
backup because it contains credentials and learner reports. Do not delete the
directory to resolve connection problems. It is separate from development data,
`.deploy/` production targets and every cloud installation. Cloud quizzes and
reports do not automatically sync; use quiz JSON export/import to transfer content.
Changing `--email` cannot change an existing classroom account.

## Network checklist

- Use the same local network on every device. School/guest Wi-Fi can isolate
  clients; ask the network administrator or use a dedicated classroom router.
- Allow the selected port through the teacher computer’s firewall on the trusted
  classroom network. Router port forwarding is unnecessary.
- Keep the computer awake, plugged in and connected. Closing the host stops play;
  students’ browsers alone cannot host the classroom.
- This version uses HTTP on a trusted LAN. Traffic is not encrypted, so use a
  classroom-specific password and avoid untrusted/public Wi-Fi. Production cloud
  sign-in still requires HTTPS; the launcher does not weaken cloud origin checks.
- Pilot with a few real phones before a full class. Browser automation on one
  computer does not establish router capacity or reliable 100-player performance.

## Validation scope

Automated browser verification at a private IPv4 address passed with separate
teacher/student sessions and non-classroom browser requests blocked. It covered
teacher login, quiz editing (including ID creation on HTTP), the LAN lobby link,
WebSocket answers, student reconnection, reveal and results. After restarting the
host, the quiz, live room and report persisted; PDF, CSV and JSON downloads worked
and the mobile report fitted the viewport. No external browser requests or
browser exceptions were recorded.

Policy tests cover LAN address validation, exact trusted origins, Personal-only
HTTP opt-in, disabled online identity/email providers and classroom/cloud target
separation. A physical-router rehearsal with internet disconnected remains
necessary for the school’s actual network and devices. These checks do not
establish reliable 100-player performance over a classroom router.

Implementation uses [local Workers bindings](https://developers.cloudflare.com/workers/local-development/bindings-per-env/)
and [local D1 migrations](https://developers.cloudflare.com/workers/wrangler/commands/d1/).
