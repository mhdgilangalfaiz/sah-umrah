import AdminLayout from '@/Layouts/AdminLayout';
import NotificationList from '@/Components/NotificationList';

export default function Notifications(props) {
    return (
        <AdminLayout title="Notifikasi">
            <NotificationList {...props} indexRoute="admin.notifications" />
        </AdminLayout>
    );
}
