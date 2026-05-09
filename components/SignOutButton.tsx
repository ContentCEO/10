export default function SignOutButton() {
  return (
    <form action="/api/auth/signout" method="post">
      <button type="submit" className="btn-ghost text-sm">Sign out</button>
    </form>
  );
}
