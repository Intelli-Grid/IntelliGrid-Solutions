
const Placeholder = ({ title }) => (
    <div className="flex flex-col items-center justify-center p-20 text-slate-500 border border-dashed border-slate-700/50 rounded-xl bg-slate-800/20">
        <div className="w-16 h-16 mb-4 rounded-full bg-slate-800 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-slate-600 animate-pulse"></div>
        </div>
        <h2 className="text-xl font-medium text-slate-300 mb-2">{title}</h2>
        <p className="max-w-md text-center text-sm">Use the Overview dashboard to monitor system status while we build out this module.</p>
    </div>
);

export const ToolQueue = () => <Placeholder title="Tool Queue (Pending)" />;
export const ReviewModeration = () => <Placeholder title="Review Queue (Pending)" />;
export const UserManagement = () => <Placeholder title="User Management" />;
export const Revenue = () => <Placeholder title="Revenue & Finance" />;
export const SystemHealth = () => <Placeholder title="System Health Monitoring" />;
export const AccessLogs = () => <Placeholder title="Security Access Logs" />;
