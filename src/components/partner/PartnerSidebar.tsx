/**
 * Partner panel sidebar (AdminLTE tree menu). Partner Panel feature —
 * structurally copies `AdminSidebar.tsx`'s outer markup (the
 * `.main-sidebar > .sidebar > .user-panel` + `.sidebar-menu` shape AdminLTE
 * requires), but with a deliberately minimal nav: Dashboard, Add Product,
 * Logout — per the requirement's own "simple and focused" instruction, not
 * the full admin nav.
 */
export function PartnerSidebar({ name }: { name: string }) {
  return (
    <aside className="main-sidebar">
      <section className="sidebar">
        <div className="user-panel">
          <div className="pull-left image">
            <img src="/admin-assets/dist/img/user.png" className="img-circle" alt="User Image" />
          </div>
          <div className="pull-left info">
            <p>{name}</p>
            <a href="#">
              <i className="fa fa-circle text-success"></i> Online
            </a>
          </div>
        </div>

        <ul className="sidebar-menu" data-widget="tree">
          <li className="header">PARTNER NAVIGATION</li>

          <li>
            <a href="/partner/dashboard">
              <i className="fa fa-dashboard"></i> <span>Dashboard</span>
            </a>
          </li>

          <li>
            <a href="/partner/add-product">
              <i className="fa fa-plus-square"></i> <span>Add Product</span>
            </a>
          </li>

          <li>
            <a href="/partner/user-logout">
              <i className="fa fa-sign-out"></i> <span>Logout</span>
            </a>
          </li>
        </ul>
      </section>
    </aside>
  );
}
