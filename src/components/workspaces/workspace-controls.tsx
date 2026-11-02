import { useEffect, useState, type FormEvent } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import {
  Building2,
  Check,
  Copy,
  LoaderCircle,
  Plus,
  Settings2,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { canManageMembers } from "@/lib/workspace-policy";
import { authClient } from "@/lib/auth-client";
import {
  cancelWorkspaceInvitation,
  changeWorkspaceMember,
  createWorkspace,
  getWorkspaceManagement,
  inviteWorkspaceTeacher,
  movePersonalLibrary,
  selectWorkspace,
  type WorkspaceState,
} from "@/lib/workspaces.functions";

const roleLabel = (role: string) =>
  role === "owner" ? "Owner" : role === "admin" ? "Admin" : "Teacher";
type Management = Awaited<ReturnType<typeof getWorkspaceManagement>>;

export function WorkspaceControls({ state }: { state: WorkspaceState }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState(false);
  const [moving, setMoving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function act(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await router.invalidate();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "That change did not complete. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "");
    await act(async () => {
      await createWorkspace({ data: { name } });
      setCreating(false);
    });
  }
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <Building2
        size={18}
        className="shrink-0 text-primary"
        aria-hidden="true"
      />
      {state.memberships.length > 0 && (
        <Select
          value={state.active?.id ?? ""}
          disabled={busy}
          onValueChange={(id) => void act(() => selectWorkspace({ data: id }))}
        >
          <SelectTrigger aria-label="Active workspace" className="w-44 sm:w-56">
            <SelectValue placeholder="Choose a workspace" />
          </SelectTrigger>
          <SelectContent>
            {state.memberships.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {state.active && (
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold">
          {roleLabel(state.active.role)}
        </span>
      )}
      {state.canCreate && (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => setCreating(true)}
        >
          <Plus size={15} /> New workspace
        </Button>
      )}
      {state.active && canManageMembers(state.active.role) && (
        <Button size="sm" variant="outline" onClick={() => setManaging(true)}>
          <Settings2 size={15} /> Manage workspace
        </Button>
      )}
      {state.active?.role === "owner" &&
        state.legacyQuizzes + state.legacyReports > 0 && (
          <Button size="sm" variant="secondary" onClick={() => setMoving(true)}>
            Move Personal library
          </Button>
        )}
      {busy && (
        <LoaderCircle
          className="animate-spin"
          size={16}
          aria-label="Updating workspace"
        />
      )}
      {error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {error}
        </p>
      )}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>A space for good questions</DialogTitle>
            <DialogDescription>
              Create a workspace for a department, team or club. Your quiz
              drafts stay private until you share them.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={create} className="space-y-4">
            <Label htmlFor="workspace-name">Workspace name</Label>
            <Input
              id="workspace-name"
              name="name"
              required
              maxLength={100}
              placeholder="The science crew"
              disabled={busy}
            />
            <Button disabled={busy} type="submit">
              {busy ? "Creating…" : "Create workspace"}
            </Button>
          </form>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={moving} onOpenChange={setMoving}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bring your existing work along</DialogTitle>
            <DialogDescription>
              Move {state.legacyQuizzes} quizzes and {state.legacyReports} game
              records into {state.active?.name}. IDs and results are preserved.
              Drafts stay private; workspace Admins can view the reports.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm">
            Keep a backup and finish any active Personal games first. This moves
            your library; it does not make a second copy.
          </p>
          {state.activeLegacyGames.length > 0 && (
            <div className="rounded-xl border p-3 text-sm">
              <p className="mb-2 font-bold">
                Finish these Personal games first:
              </p>
              {state.activeLegacyGames.map((game) => (
                <Link
                  key={game.code}
                  className="block underline"
                  to="/host/$code"
                  params={{ code: game.code }}
                >
                  {game.title}
                </Link>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3">
            <Switch
              id="confirm-library-move"
              checked={confirmed}
              onCheckedChange={setConfirmed}
            />
            <Label htmlFor="confirm-library-move">
              I have a backup and want to move this work
            </Label>
          </div>
          <Button
            disabled={busy || !confirmed}
            onClick={() =>
              void act(async () => {
                await movePersonalLibrary({ data: { confirmed: true } });
                setMoving(false);
              })
            }
          >
            Move library to this workspace
          </Button>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>
      {managing && state.active && (
        <WorkspaceManager
          key={state.active.id}
          name={state.active.name}
          onClose={() => setManaging(false)}
        />
      )}
    </div>
  );
}

function WorkspaceManager({
  name,
  onClose,
}: {
  name: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [data, setData] = useState<Management | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState<"admin" | "teacher">("teacher");
  const [sendEmail, setSendEmail] = useState(false);
  const [link, setLink] = useState("");
  const [linkInvitationId, setLinkInvitationId] = useState("");
  const [delivery, setDelivery] = useState("");
  const [copied, setCopied] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  useEffect(() => {
    let canceled = false;
    getWorkspaceManagement()
      .then((result) => {
        if (!canceled) setData(result);
      })
      .catch((cause) => {
        if (!canceled)
          setError(
            cause instanceof Error
              ? cause.message
              : "Workspace details could not be loaded.",
          );
      });
    return () => {
      canceled = true;
    };
  }, []);
  async function act(action: () => Promise<unknown>, close = false) {
    setBusy(true);
    setError("");
    try {
      await action();
      if (close) onClose();
      else setData(await getWorkspaceManagement());
      await router.invalidate();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "That change did not complete. Please refresh and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    await act(async () => {
      const result = await inviteWorkspaceTeacher({
        data: { email, role, emailDelivery: sendEmail },
      });
      setLink(result.url);
      setLinkInvitationId(result.id);
      setCopied(false);
      setDelivery(
        result.sent
          ? "Invitation email sent."
          : result.emailRequested
            ? "Email could not be sent. Share this private link instead."
            : "Your private invitation link is ready.",
      );
    });
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-3xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>
            Good company makes great classrooms. Manage your team and its access
            here.
          </DialogDescription>
        </DialogHeader>
        <p className="rounded-xl bg-secondary/60 p-3 text-sm">
          <ShieldCheck className="mr-2 inline" size={17} /> Admins and Owners
          can view every report in this workspace. Quiz drafts stay private
          until their author shares them.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {!data ? (
          <p role="status">Loading your team…</p>
        ) : (
          <Tabs defaultValue="members">
            <TabsList>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="invitations">Invitations</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="members" className="space-y-3">
              {data.members.map((person) => (
                <div
                  key={person.id}
                  className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold break-words">
                      {person.name}
                      {person.userId === data.actorId ? " (you)" : ""}
                    </p>
                    <p className="break-all text-sm text-muted-foreground">
                      {person.email}
                    </p>
                  </div>
                  <Select
                    value={person.role}
                    disabled={
                      busy || (person.role === "owner" && data.role !== "owner")
                    }
                    onValueChange={(next) =>
                      void act(
                        () =>
                          changeWorkspaceMember({
                            data: {
                              memberId: person.id,
                              role: next as "owner" | "admin" | "teacher",
                              remove: false,
                            },
                          }),
                        person.userId === data.actorId,
                      )
                    }
                  >
                    <SelectTrigger
                      className="w-32"
                      aria-label={`Role for ${person.email}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem
                        value="owner"
                        disabled={data.role !== "owner"}
                      >
                        Owner
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={
                      busy || (person.role === "owner" && data.role !== "owner")
                    }
                    onClick={() => setRemoving(person.id)}
                  >
                    Remove
                  </Button>
                  {removing === person.id && (
                    <div className="w-full space-y-2 rounded-lg bg-secondary p-3 text-sm">
                      <p>
                        Remove {person.name}’s access? Their existing drafts and
                        reports are preserved. Hosting access ends when
                        membership is removed.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busy}
                          onClick={() =>
                            void act(async () => {
                              await changeWorkspaceMember({
                                data: { memberId: person.id, remove: true },
                              });
                              setRemoving(null);
                            }, person.userId === data.actorId)
                          }
                        >
                          Remove access
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRemoving(null)}
                        >
                          Keep member
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>
            <TabsContent value="invitations" className="space-y-5">
              <form
                onSubmit={invite}
                className="space-y-3 rounded-xl border p-4"
              >
                <Label htmlFor="invited-email">Teacher email</Label>
                <Input
                  type="email"
                  id="invited-email"
                  name="email"
                  required
                  placeholder="colleague@school.example"
                  disabled={busy}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Label htmlFor="invitation-role">Role</Label>
                  <Select
                    value={role}
                    onValueChange={(value) =>
                      setRole(value as "admin" | "teacher")
                    }
                    disabled={busy}
                  >
                    <SelectTrigger id="invitation-role" className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="send-invite-email"
                    checked={sendEmail}
                    onCheckedChange={setSendEmail}
                    disabled={!data.emailEnabled || busy}
                  />
                  <Label htmlFor="send-invite-email">
                    Send an invitation email too
                  </Label>
                </div>
                {!data.emailEnabled && (
                  <p className="text-sm text-muted-foreground">
                    Email is not configured. You can share a private invitation
                    link directly.
                  </p>
                )}
                <Button type="submit" disabled={busy}>
                  {busy ? "Creating…" : "Create invitation"}
                </Button>
              </form>
              {link && (
                <div className="space-y-2 rounded-xl bg-secondary p-4">
                  <p role="status" className="font-bold">
                    {delivery}
                  </p>
                  <Label htmlFor="invitation-link">
                    Private invitation link
                  </Label>
                  <Input id="invitation-link" value={link} readOnly />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(link);
                        setCopied(true);
                      } catch {
                        setError("Select and copy the invitation link above.");
                      }
                    }}
                  >
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    {copied ? "Copied" : "Copy invitation"}
                  </Button>
                  <p className="text-sm">
                    Share only with the invited teacher. It expires after 48
                    hours and can be used once. Copy it before closing this
                    dialog.
                  </p>
                </div>
              )}
              {data.invitations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pending invitations. Your next teammate is a link away.
                </p>
              ) : (
                data.invitations.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                  >
                    <div className="min-w-0">
                      <p className="break-all font-semibold">{invite.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {roleLabel(invite.role)} ·{" "}
                        {new Date(invite.expiresAt).getTime() <= Date.now()
                          ? "Expired"
                          : "Pending"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void act(async () => {
                          await cancelWorkspaceInvitation({ data: invite.id });
                          if (linkInvitationId === invite.id) setLink("");
                        })
                      }
                    >
                      Revoke invitation
                    </Button>
                  </div>
                ))
              )}
            </TabsContent>
            <TabsContent value="activity" className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Recent workspace changes. Invitation secrets and learner answers
                are never included here.
              </p>
              {data.audit.map((event) => (
                <div className="rounded-xl border p-3 text-sm" key={event.id}>
                  <strong>{event.actor}</strong>
                  <span>
                    {" "}
                    · {event.action.replaceAll(".", " ").replaceAll("-", " ")}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function SchoolWelcome({
  state,
  name,
}: {
  state: WorkspaceState;
  name: string;
}) {
  const router = useRouter();
  return (
    <main className="min-h-dvh bg-background px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-2xl font-bold text-primary">
            <Zap fill="currentColor" /> funkwiz.
          </span>
          <Button
            variant="ghost"
            onClick={async () => {
              await authClient.signOut();
              await router.navigate({ to: "/login", search: {} });
            }}
          >
            Sign out
          </Button>
        </div>
        <section className="rounded-3xl border bg-secondary/30 p-6 sm:p-10 reveal-in">
          <span className="mb-4 inline-flex rounded-full bg-secondary p-3">
            <Users size={28} />
          </span>
          <p className="eyebrow">YOUR SCHOOL. YOUR PEOPLE.</p>
          <h1 className="mb-3 text-4xl">Make room for more “aha!” moments.</h1>
          <p className="mb-6 text-muted-foreground">
            Welcome, {name}.{" "}
            {state.canCreate
              ? "Create a space for your team or choose one you already belong to."
              : state.memberships.length
                ? "Choose your workspace to find your questions and classroom games."
                : "Open your private invitation link to join a workspace, or ask your school owner for an invitation."}
          </p>
          <WorkspaceControls state={state} />
        </section>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border p-5">
            <h2 className="mb-2 text-xl">Private until you share</h2>
            <p className="text-sm text-muted-foreground">
              Your drafts are yours. Share selected quizzes with colleagues when
              they’re ready.
            </p>
          </div>
          <div className="rounded-2xl border p-5">
            <h2 className="mb-2 text-xl">A clear view for your team</h2>
            <p className="text-sm text-muted-foreground">
              Workspace Admins and Owners can review all reports in their
              workspace. Students still join games without accounts.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
