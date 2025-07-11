import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import styles from './root.module.css';

export const Route = createRootRoute({
  component: () => (
    <>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <Link to="/" className={styles.logo}>
              <h1>RallyUXR</h1>
              <p>Economic Impact UX Monitoring</p>
            </Link>
            <nav className={styles.nav}>
              <Link to="/" className={styles.navLink} activeProps={{ className: styles.activeLink }}>
                Dashboard
              </Link>
              <Link to="/create" className={styles.navLink} activeProps={{ className: styles.activeLink }}>
                New Experiment
              </Link>
              <Link to="/settings" className={styles.navLink} activeProps={{ className: styles.activeLink }}>
                Settings
              </Link>
            </nav>
          </div>
        </header>
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
      <TanStackRouterDevtools />
    </>
  ),
});