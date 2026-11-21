import PortalLayout from './PortalLayout';

/** Halaman area jamaah memakai layout portal (sidebar kaca + topbar). */
export default function CustomerLayout({ title, children }) {
    return (
        <PortalLayout title={title}>
            <div className="animate-fade-up">{children}</div>
        </PortalLayout>
    );
}
