# VSCE_PAT access token renewal

To renew the VSCE_PAT access token, follow these steps:
1. Generate a new Personal Access Token (PAT) here: https://sinedied.visualstudio.com/_usersSettings/tokens
  * Scopes: Custom defined → Show all scopes → Marketplace → Manage
2. Run `gh secret set VSCE_PAT --repo sinedied/lantern-vscode-extension`
  *  Paste the token into the interactive prompt
