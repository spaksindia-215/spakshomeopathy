/**
 * Admin panel header (AdminLTE navbar). Ported from
 * `admin/inc/header.blade.php`.
 *
 * UNVERIFIED AGAINST PRODUCTION (M1 Gate Report OI-1b): raw-HTML capture
 * requires admin credentials, which remain outstanding since M0. This is
 * ported from the local Blade source (contract precedence rank 4) and must
 * be re-verified against a real admin-session capture before M1's gate can
 * close its admin-layout testing checklist item.
 */
/**
 * Reproduces PHP's `date('d F, Y')` exactly (e.g. "01 August, 2026") —
 * zero-padded day, full month name, comma, year. `Intl.DateTimeFormat`'s
 * built-in patterns don't include the comma, so the string is assembled
 * manually.
 */
function formatAdminDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(d);
  const year = d.getFullYear();
  return `${day} ${month}, ${year}`;
}

export function AdminHeader() {
  const formattedDate = formatAdminDate(new Date());

  return (
    <header className="main-header">
      {/* Logo */}
      <a href="/home" className="logo">
        {/* mini logo for sidebar mini 50x50 pixels */}
        <span className="logo-mini">
          <b>S</b>H
        </span>
        {/* logo for regular state and mobile devices */}
        <span className="logo-lg">
          <b>Spaks</b>Homeopathy
        </span>
      </a>
      {/* Header Navbar: style can be found in header.less */}
      <nav className="navbar navbar-static-top">
        {/* Sidebar toggle button */}
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
                <span className="hidden-xs">Admin</span>
              </a>
              <ul className="dropdown-menu">
                {/* User image */}
                <li className="user-header">
                  <img
                    src="/admin-assets/dist/img/user.png"
                    className="user-image"
                    alt="User Image"
                  />

                  <p>
                    Admin Panel
                    <small>{formattedDate}</small>
                  </p>
                </li>
                {/* Menu Body */}
                <li className="user-body">{/* /.row */}</li>
                {/* Menu Footer */}
                <li className="user-footer">
                  <div className="pull-left">
                    <a href="/admin/user-profile" className="btn btn-default btn-flat">
                      Profile
                    </a>
                  </div>
                  <div className="pull-right">
                    <a href="/admin/user-logout" className="btn btn-default btn-flat">
                      Sign out
                    </a>
                  </div>
                </li>
              </ul>
            </li>
            {/* Control Sidebar Toggle Button */}
          </ul>
        </div>
      </nav>
    </header>
  );
}
