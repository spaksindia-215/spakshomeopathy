/**
 * Admin panel sidebar (AdminLTE tree menu). Ported from
 * `admin/inc/sidebar.blade.php`. All 10 visible sidebar items are
 * reproduced in source order — blueprint §4.2/§1.2 note the sidebar
 * exposes only these; the ~92 other admin routes are reachable by URL only
 * (LIVE-orphan) and correctly have no sidebar entry.
 *
 * UNVERIFIED AGAINST PRODUCTION (M1 Gate Report OI-1b) — see AdminHeader.tsx.
 *
 * ADDED (CR-003, docs/CR-003-HERBAL-ECOMMERCE-SECTION.md §10, owner
 * amendment 2026-08-30): ONE new top-level item, "Herbs Store", appended
 * AFTER all 10 ported items — not interleaved among them, so the ported
 * source order above is unchanged and unambiguous. This is the only
 * addition to this file for the Herbs Store feature.
 *
 * ADDED (Mother Tincture admin-add feature): a second new top-level item,
 * "Mother Tincture", appended AFTER "Herbs Store" — same append-only
 * posture, same reasoning: keeps every prior addition's order unchanged.
 *
 * ADDED (CR-006 Phase 4, docs/CR-006-PHASE-4-PLAN.md §9, owner-confirmed
 * 2026-09-12): a third new top-level item, "Homeopathy List", appended
 * AFTER "Mother Tincture" — same append-only posture. Links the
 * GENUINELY NEW `homeopathyMaster` (`tbl_homeopathy`) CRUD screens (no
 * Laravel precedent to match either way — see
 * `homeopathyMasterRepository.ts`'s header), not to be confused with the
 * pre-existing "Category List" item above, which manages the SEPARATE
 * `categories` collection.
 *
 * FIXED (production launch cleanup): "Setting > Logout" now points at
 * `/admin/user-logout`, not the public `/logout` — both destroyed the
 * session identically, but `/logout`'s redirect target (`/home`, the
 * public storefront) left a signed-out admin looking at the public site
 * instead of the login screen. See `user-logout/route.ts`'s own header.
 */
export function AdminSidebar() {
  return (
    <aside className="main-sidebar">
      {/* sidebar: style can be found in sidebar.less */}
      <section className="sidebar">
        {/* Sidebar user panel */}
        <div className="user-panel">
          <div className="pull-left image">
            <img src="/admin-assets/dist/img/user.png" className="img-circle" alt="User Image" />
          </div>
          <div className="pull-left info">
            <p>Spaks</p>
            <a href="#">
              <i className="fa fa-circle text-success"></i> Online
            </a>
          </div>
        </div>

        {/* search form */}
        <form action="#" method="get" className="sidebar-form">
          <div className="input-group">
            <input type="text" name="q" className="form-control" placeholder="Search..." />
            <span className="input-group-btn">
              <button type="submit" name="search" id="search-btn" className="btn btn-flat">
                <i className="fa fa-search"></i>
              </button>
            </span>
          </div>
        </form>
        {/* /.search form */}

        {/* sidebar menu: style can be found in sidebar.less */}
        <ul className="sidebar-menu" data-widget="tree">
          <li className="header">MAIN NAVIGATION</li>

          <li className="active">
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> <span>Dashboard</span>
              <span className="pull-right-container"></span>
            </a>
          </li>

          <li className="treeview">
            <a href="#">
              <i className="fa fa-table"></i>
              <span>Manage Products</span>
              <span className="pull-right-container">
                <i className="fa fa-angle-left pull-right"></i>
              </span>
            </a>
            <ul className="treeview-menu">
              <li>
                <a href="/admin/add-product">
                  <i className="fa fa-circle-o"></i> Add Products
                </a>
              </li>
              <li>
                <a href="/admin/product-list">
                  <i className="fa fa-circle-o"></i> Product List
                </a>
              </li>
              <li>
                <a href="/admin/review-list">
                  <i className="fa fa-circle-o"></i> Review List
                </a>
              </li>
            </ul>
          </li>

          <li className="treeview">
            <a href="#">
              <i className="fa fa-table"></i>
              <span>Manage Category</span>
              <span className="pull-right-container">
                <i className="fa fa-angle-left pull-right"></i>
              </span>
            </a>
            <ul className="treeview-menu">
              <li>
                <a href="/admin/add-hurbcat">
                  <i className="fa fa-circle-o"></i> Add Category
                </a>
              </li>
              <li>
                <a href="/admin/cat-list">
                  <i className="fa fa-circle-o"></i> Category List
                </a>
              </li>
            </ul>
          </li>

          <li className="treeview">
            <a href="#">
              <i className="fa fa-table"></i>
              <span>Manage Post</span>
              <span className="pull-right-container">
                <i className="fa fa-angle-left pull-right"></i>
              </span>
            </a>
            <ul className="treeview-menu">
              <li>
                <a href="/admin/add-post">
                  <i className="fa fa-circle-o"></i> Add Post
                </a>
              </li>
              <li>
                <a href="/admin/post-list">
                  <i className="fa fa-circle-o"></i> Post List
                </a>
              </li>
            </ul>
          </li>

          <li>
            <a href="/admin/manage-buyers">
              <i className="fa fa-th"></i> <span>Manage Users</span>
              <span className="pull-right-container"></span>
            </a>
          </li>

          <li>
            <a href="/admin/order-list">
              <i className="fa fa-th"></i> <span>Manage Orders</span>
              <span className="pull-right-container"></span>
            </a>
          </li>

          <li>
            <a href="/admin/enquires-list">
              <i className="fa fa-th"></i> <span>Manage Enquires</span>
              <span className="pull-right-container"></span>
            </a>
          </li>

          <li>
            <a href="/admin/appointment-list">
              <i className="fa fa-th"></i> <span>Manage Appointment</span>
              <span className="pull-right-container"></span>
            </a>
          </li>

          <li className="treeview">
            <a href="">
              <i className="fa fa-cog"></i>
              <span>Setting</span>
              <span className="pull-right-container">
                <i className="fa fa-angle-left pull-right"></i>
              </span>
            </a>
            <ul className="treeview-menu">
              <li>
                <a href="/admin/change-password">
                  <i className="fa fa-circle-o"></i> Change Password
                </a>
              </li>
              <li>
                <a href="/admin/user-logout">
                  <i className="fa fa-circle-o"></i> Logout
                </a>
              </li>
            </ul>
          </li>

          {/* CR-003 addition — see file header. */}
          <li className="treeview">
            <a href="#">
              <i className="fa fa-leaf"></i>
              <span>Herbs Store</span>
              <span className="pull-right-container">
                <i className="fa fa-angle-left pull-right"></i>
              </span>
            </a>
            <ul className="treeview-menu">
              <li>
                <a href="/admin/add-herb">
                  <i className="fa fa-circle-o"></i> Add Herb Product
                </a>
              </li>
              <li>
                <a href="/admin/herbs-list">
                  <i className="fa fa-circle-o"></i> Herbs List
                </a>
              </li>
              <li>
                <a href="/admin/wellness-categories">
                  <i className="fa fa-circle-o"></i> Wellness Categories
                </a>
              </li>
            </ul>
          </li>

          {/* Mother Tincture admin-add feature addition — see file header. */}
          <li className="treeview">
            <a href="#">
              <i className="fa fa-tint"></i>
              <span>Mother Tincture</span>
              <span className="pull-right-container">
                <i className="fa fa-angle-left pull-right"></i>
              </span>
            </a>
            <ul className="treeview-menu">
              <li>
                <a href="/admin/add-mother-tincture">
                  <i className="fa fa-circle-o"></i> Add Mother Tincture
                </a>
              </li>
            </ul>
          </li>

          {/* CR-006 Phase 4 addition — see file header. */}
          <li className="treeview">
            <a href="#">
              <i className="fa fa-heartbeat"></i>
              <span>Homeopathy List</span>
              <span className="pull-right-container">
                <i className="fa fa-angle-left pull-right"></i>
              </span>
            </a>
            <ul className="treeview-menu">
              <li>
                <a href="/admin/add-homeopathy">
                  <i className="fa fa-circle-o"></i> Add Homeopathy Entry
                </a>
              </li>
              <li>
                <a href="/admin/homeopathy-list">
                  <i className="fa fa-circle-o"></i> Homeopathy List
                </a>
              </li>
            </ul>
          </li>

          {/* CR-006 Phase 7 addition — see docs/CR-006-PHASE-7-PLAN.md.
              Media Library and Redirects added CR-006 Phase 8 — see
              docs/CR-006-PHASE-8-PLAN.md. */}
          <li className="treeview">
            <a href="#">
              <i className="fa fa-file-text-o"></i>
              <span>Content</span>
              <span className="pull-right-container">
                <i className="fa fa-angle-left pull-right"></i>
              </span>
            </a>
            <ul className="treeview-menu">
              <li>
                <a href="/admin/pages-list">
                  <i className="fa fa-circle-o"></i> Pages
                </a>
              </li>
              <li>
                <a href="/admin/media-library">
                  <i className="fa fa-circle-o"></i> Media Library
                </a>
              </li>
              <li>
                <a href="/admin/redirects-list">
                  <i className="fa fa-circle-o"></i> Redirects
                </a>
              </li>
            </ul>
          </li>

          {/* CR-006 Phase 9 addition — see docs/CR-006-PHASE-9-PLAN.md. */}
          <li className="treeview">
            <a href="#">
              <i className="fa fa-shield"></i>
              <span>System</span>
              <span className="pull-right-container">
                <i className="fa fa-angle-left pull-right"></i>
              </span>
            </a>
            <ul className="treeview-menu">
              <li>
                <a href="/admin/audit-log">
                  <i className="fa fa-circle-o"></i> Audit Log
                </a>
              </li>
              <li>
                <a href="/admin/admin-users-list">
                  <i className="fa fa-circle-o"></i> Admin Users
                </a>
              </li>
            </ul>
          </li>
        </ul>
      </section>
      {/* /.sidebar */}
    </aside>
  );
}
