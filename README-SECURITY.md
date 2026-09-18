# Security UI: hidden, ready to reactivate

Security > Role & Permissions is temporarily hidden for every role.
The frontend UI is hidden and custom Role/CRUD permission enforcement is
temporarily disabled in frontend and backend. Signed-in users are no longer
blocked by custom permission grants. Login/JWT authentication and existing
controller/repository role and school restrictions remain active. Dependencies,
permission records and backend APIs are retained.

## Reactivate

1. Open `src/security/features.ts`.
2. Change both `SECURITY_UI_ENABLED` and `CRUD_PERMISSIONS_ENABLED` to `true`.
3. In backend `appsettings.json`, set `Security:CrudPermissionsEnabled` to `true`.
   Check environment-specific settings and `Security__CrudPermissionsEnabled`
   environment variables for overrides. Restart/redeploy the backend.
4. Run `npm.cmd run build` and restart/redeploy the frontend.
5. Sign in as a user allowed to read `security.roles` (or Super Admin).
   Open Management > Security > Role & Permissions and verify the page.
6. Verify another module and login still work. Existing authorization still
   applies; this flag does not grant permissions.

No dependencies need reinstalling and no database migration is required.
To disable it again, set all three flags to `false` and rebuild/restart both apps.

## Implementation and preserved dependencies

- `src/security/features.ts`: UI visibility and custom permission flags.
- `src/Super_Admin_Dashboard/Sidebar.tsx`: hides the Security menu when false.
- `src/Super_Admin_Dashboard/Dashboard.tsx`: blocks navigation to and rendering
  of the hidden page, even if navigation is triggered programmatically.
- `src/Super_Admin_Dashboard/PermissionManagement.tsx`: retained page implementation.
- `src/security/Permissions.tsx`: retained provider, permission hooks and
  `security.roles` mapping; still required by other modules. When CRUD checks
  are disabled, it skips `/api/permissions/me` and permits frontend operations
  only for a token with a RoleId. Server JWT validation still applies.
- `src/App.tsx`: retained PermissionProvider integration.
- Backend project:
  `C:\Users\USER\source\repos\SchoolManagement\SchoolManagement\SchoolManagement.csproj`.
  `Service/CrudPermissionFilter.cs` bypasses custom grants after its existing
  authentication check when the backend flag is false, including unmapped routes.
  `Service/PermissionService.cs` uses the same flag for explicit permission
  filters and refuses unauthenticated principals. The default is true if the
  backend setting is absent. PermissionsController, JWT setup and data remain
  retained. Hiding the menu does not disable permission-management endpoints
  or their existing Super Admin restrictions.

## Prompt for a future AI

“Read README-SECURITY.md and reactivate the Security / Role & Permissions UI
by setting SECURITY_UI_ENABLED and CRUD_PERMISSIONS_ENABLED to true in
src/security/features.ts and Security:CrudPermissionsEnabled to true in backend
appsettings.json. Preserve authentication, role/school restrictions, dependencies
and other modules. Build and restart both apps. Verify the menu, page, CRUD
grants, denied operations and rejection of unauthenticated API calls.”
