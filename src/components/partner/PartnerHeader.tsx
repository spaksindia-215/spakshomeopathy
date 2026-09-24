/**
 * Partner panel header (AdminLTE navbar). Partner Panel feature —
 * structurally copies `AdminHeader.tsx`'s markup (same AdminLTE navbar
 * shape) but with a "Partner Panel" label and a logout link pointed at
 * `/partner/user-logout` instead of the admin one. No user-dropdown
 * "Profile" link — the partner panel has no equivalent page (kept minimal,
 * per the requirement's "simple and focused" instruction).
 */
export function PartnerHeader({ name }: { name: string }) {
  return (
    <header className="main-header">
      <a href="/partner/dashboard" className="logo">
        <span className="logo-mini">
          <b>S</b>P
        </span>
        <span className="logo-lg">
          <b>Spaks</b>Partner
        </span>
      </a>
      <nav className="navbar navbar-static-top">
        <a href="#" className="sidebar-toggle" data-toggle="push-menu" role="button">
          <span className="sr-only">Toggle navigation</span>
        </a>

        <div className="navbar-custom-menu">
          <ul className="nav navbar-nav">
            <li className="dropdown user user-menu">
              <a href="#" className="dropdown-toggle" data-toggle="dropdown">
                <img
                  src="/admin-assets/dist/img/user.png"
                  className="user-image"
                  alt="User Image"
                />
                <span className="hidden-xs">{name}</span>
              </a>
              <ul className="dropdown-menu">
                <li className="user-header">
                  <img
                    src="/admin-assets/dist/img/user.png"
                    className="user-image"
                    alt="User Image"
                  />
                  <p>Partner Panel</p>
                </li>
                <li className="user-body"></li>
                <li className="user-footer">
                  <div className="pull-right">
                    <a href="/partner/user-logout" className="btn btn-default btn-flat">
                      Sign out
                    </a>
                  </div>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}
