/** Props dashboard jamaah, disusun oleh Customer\DashboardController. */

export interface DashboardStats {
    umrah: number;
    tiket: number;
    visa: number;
    outstanding: number;
    documents_pending: number;
}

export interface ActiveTrip {
    code: string;
    package: string;
    image: string;
    status: string;
    status_label: string;
    departure_date: string;
    days_left: number;
    total: number;
    paid: number;
    overdue: boolean;
    url: string;
}

export interface Installment {
    id: number;
    label: string;
    code: string;
    due_date: string | null;
    amount: number;
    overdue: boolean;
    url: string;
}

export interface DashboardNotification {
    id: string;
    title: string;
    category: string;
    read: boolean;
    time: string;
}

export interface DashboardProps {
    stats: DashboardStats;
    activeTrip: ActiveTrip | null;
    installments: Installment[];
    notifications: DashboardNotification[];
}
