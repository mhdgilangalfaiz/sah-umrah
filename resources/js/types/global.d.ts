// Helper route() dari Ziggy (@routes di app.blade.php)
interface ZiggyRouter {
    current(name?: string): boolean;
}

declare function route(): ZiggyRouter;
declare function route(name: string, params?: unknown, absolute?: boolean): string;
