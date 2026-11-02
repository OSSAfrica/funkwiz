export function accountCopy(school: boolean) {
  if (school)
    return {
      eyebrow: "SCHOOL / ORGANIZATION",
      setupHeading: "Set up the first administrator",
      signInHeading: "Sign in to your team",
      setupDescription:
        "For email/password setup, the installation owner uses the email chosen during deployment and the private setup code to create the first administrator.",
      signInDescription:
        "Administrators and existing teachers sign in here. You do not need a setup code to log in.",
      setupLink: "Set up first administrator",
      codeLabel: "Administrator setup code",
      codePlaceholder: "The installation owner’s private code",
      codeHelp:
        "Only for the first administrator’s email/password signup. Invited teachers and returning users do not need this code.",
      createButton: "Create administrator account",
      signInNote:
        "New teacher? Open your private invitation link to create an account. Your administrator can send one; you do not need their setup code.",
    };
  return {
    eyebrow: "PERSONAL MODE",
    setupHeading: "Set up your personal account",
    signInHeading: "Welcome back, quiz maker.",
    setupDescription:
      "Create your own teacher account using your configured email and private setup code. This is a one-time step.",
    signInDescription:
      "Sign in with your email and password. Your setup code is not needed for normal login.",
    setupLink: "Set up teacher account",
    codeLabel: "Private setup code",
    codePlaceholder: "Your private teacher setup code",
    codeHelp:
      "Use the code from your private server configuration. You will not need it for normal login.",
    createButton: "Create teacher account",
    signInNote: "A private workspace for your teacher account.",
  };
}
