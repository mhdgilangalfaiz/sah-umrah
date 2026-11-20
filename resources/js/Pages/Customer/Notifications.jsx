import CustomerLayout from '@/Layouts/CustomerLayout';
import NotificationList from '@/Components/NotificationList';

export default function Notifications(props) {
    return (
        <CustomerLayout title="Notifikasi">
            <NotificationList {...props} indexRoute="notifications.index" />
        </CustomerLayout>
    );
}
