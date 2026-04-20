import { createBrowserRouter } from 'react-router';
import { Navigate } from 'react-router';
import { StartupCheck } from './pages/StartupCheck';

// Import all other pages and components
import { Landing } from './pages/Landing';
import { UnifiedLogin } from './pages/UnifiedLogin';
import { BackendHealthCheck } from './pages/BackendHealthCheck';
import { DatabaseSetup } from './pages/DatabaseSetup';
import { AdminDebugHelper } from './pages/AdminDebugHelper';
import { SettingsDebug } from './pages/SettingsDebug';
import { AdminInitializer } from './pages/AdminInitializer';
import { SuperAdminInitializer } from './pages/SuperAdminInitializer';
import { AdminCredentialsViewer } from './pages/AdminCredentialsViewer';
import { FixSuperAdminRole } from './pages/FixSuperAdminRole';
import { KioskModeEnhanced } from './pages/KioskModeEnhanced';
import { MyQRCode } from './pages/MyQRCode';
import { GeofenceSettings } from './pages/GeofenceSettings';
import { ViewAccounts } from './pages/ViewAccounts';
import { SimpleDebug } from './pages/SimpleDebug';
import { DirectLogin } from './pages/DirectLogin';
import { DatabaseInitializer } from './pages/DatabaseInitializer';
import { DeploymentGuide } from './pages/DeploymentGuide';
import { LoginAutoFix } from './pages/LoginAutoFix';
import { ManualDeploymentGuide } from './pages/ManualDeploymentGuide';
import { LoginDiagnostic } from './pages/LoginDiagnostic';
import { LoginCredentialTester } from './pages/LoginCredentialTester';
import { DiagnosticHub } from './pages/DiagnosticHub';
import { QuickStart } from './pages/QuickStart';
import { OneClickFix } from './pages/OneClickFix';
import { DatabaseSchemaFixer } from './pages/DatabaseSchemaFixer';
import { TableStructureDiagnostic } from './pages/TableStructureDiagnostic';
import { DirectDatabaseTest } from './pages/DirectDatabaseTest';
import { ManualLoginTest } from './pages/ManualLoginTest';
import { LoginTest } from './pages/LoginTest';
import { QuickLoginFix } from './pages/QuickLoginFix';
import { ViewDatabaseCredentials } from './pages/ViewDatabaseCredentials';
import { DatabaseDiagnostic } from './pages/DatabaseDiagnostic';
import { TableSchemaViewer } from './pages/TableSchemaViewer';
import { SuperAdminDiagnostic } from './pages/SuperAdminDiagnostic';
import { SuperAdminSQLFixer } from './pages/SuperAdminSQLFixer';
import { ClearStorageUtility } from './pages/ClearStorageUtility';
import { AttendanceDatabaseDiagnostic } from './components/AttendanceDatabaseDiagnostic';
import { AdminQRCodeSetup } from './pages/AdminQRCodeSetup';
import { AdminKioskDiagnostic } from './pages/AdminKioskDiagnostic';
import { GenerateAdminQRCodes } from './pages/GenerateAdminQRCodes';
import { SetupAdminQRColumn } from './pages/SetupAdminQRColumn';
import { AdminDatabaseDiagnostic } from './pages/AdminDatabaseDiagnostic';
import { KioskAdminTest } from './pages/KioskAdminTest';

// Employee Portal
import { EmployeeAuthWrapper } from './components/EmployeeAuthWrapper';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { EmployeeSchedule } from './pages/EmployeeSchedule';
import { EmployeeAttendance } from './pages/EmployeeAttendance';
import { EmployeeLeave } from './pages/EmployeeLeave';
import { ForgotTimeInOut } from './pages/ForgotTimeInOut';
import { Settings } from './pages/Settings';

// Admin Portal
import { AdminAuthWrapper } from './components/AdminAuthWrapper';
import { AdminDashboard } from './pages/AdminDashboard';
import { Members } from './pages/Members';
import { RegisterEmployee } from './pages/RegisterEmployee';
import { ManageSchedule } from './pages/ManageSchedule';
import { AttendanceHistory } from './pages/AttendanceHistory';
import { LeaveRequests } from './pages/LeaveRequests';
import { AdminLeave } from './pages/AdminLeave';
import { AdminTimeCorrectionRequests } from './pages/AdminTimeCorrectionRequests';
import { QRScanner } from './pages/QRScanner';

// Super Admin Portal
import { SuperAdminAuthWrapper } from './components/SuperAdminAuthWrapper';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { AdminManagement } from './pages/AdminManagement';
import { RegisterAdmin } from './pages/RegisterAdmin';
import { SuperAdminMembers } from './pages/SuperAdminMembers';
import { SuperAdminSchedule } from './pages/SuperAdminSchedule';
import { SuperAdminAttendance } from './pages/SuperAdminAttendance';
import { SuperAdminEmployeeAttendance } from './pages/SuperAdminEmployeeAttendance';
import { SuperAdminLeaveRequests } from './pages/SuperAdminLeaveRequests';
import { ResetLeaveBalances } from './pages/ResetLeaveBalances';
import { InitializeSuperAdmin } from './pages/InitializeSuperAdmin';
import { SuperAdminDebug } from './pages/SuperAdminDebug';
import { SuperAdminPasswordFixer } from './pages/SuperAdminPasswordFixer';
import { ScheduleDiagnostic } from './pages/ScheduleDiagnostic';
import { ScheduleSaveTest } from './pages/ScheduleSaveTest';
import { ScheduleQuickFix } from './pages/ScheduleQuickFix';
import { ScheduleDebugPanel } from './pages/ScheduleDebugPanel';

// Error Boundary
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotFound } from './pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <UnifiedLogin />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/portals',
    element: <Landing />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/login',
    element: <UnifiedLogin />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/health',
    element: <BackendHealthCheck />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/setup',
    element: <DatabaseSetup />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/admin-debug-helper',
    element: <AdminDebugHelper />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/settings-debug',
    element: <SettingsDebug />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/admin-initializer',
    element: <AdminInitializer />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/super-admin-initializer',
    element: <SuperAdminInitializer />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/super-admin/initialize',
    element: <SuperAdminInitializer />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/admin-credentials',
    element: <AdminCredentialsViewer />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/employee',
    element: <EmployeeAuthWrapper />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <EmployeeDashboard />,
      },
      {
        path: 'qr-code',
        element: <MyQRCode />,
      },
      {
        path: 'schedule',
        element: <EmployeeSchedule />,
      },
      {
        path: 'attendance',
        element: <EmployeeAttendance />,
      },
      {
        path: 'leave',
        element: <EmployeeLeave />,
      },
      {
        path: 'forgot-time',
        element: <ForgotTimeInOut />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
    ],
  },
  {
    path: '/admin/login',
    element: <Navigate to="/login" replace />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/admin',
    element: <AdminAuthWrapper />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <AdminDashboard />,
      },
      {
        path: 'qr-code',
        element: <MyQRCode />,
      },
      {
        path: 'team',
        element: <Members />,
      },
      {
        path: 'employees',
        element: <Members />,
      },
      {
        path: 'register',
        element: <RegisterEmployee />,
      },
      {
        path: 'schedule',
        element: <ManageSchedule />,
      },
      {
        path: 'attendance',
        element: <AttendanceHistory />,
      },
      {
        path: 'leaves',
        element: <LeaveRequests />,
      },
      {
        path: 'admin-leave',
        element: <AdminLeave />,
      },
      {
        path: 'time-correction-requests',
        element: <AdminTimeCorrectionRequests />,
      },
      {
        path: 'scanner',
        element: <QRScanner />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
    ],
  },
  {
    path: '/super-admin/login',
    element: <Navigate to="/login" replace />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/super-admin-debug',
    element: <SuperAdminDebug />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/super-admin-password-fixer',
    element: <SuperAdminPasswordFixer />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/fix-super-admin-role',
    element: <FixSuperAdminRole />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/super-admin',
    element: <SuperAdminAuthWrapper />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <SuperAdminDashboard />,
      },
      {
        path: 'qr-code',
        element: <MyQRCode />,
      },
      {
        path: 'admins',
        element: <AdminManagement />,
      },
      {
        path: 'register-admin',
        element: <RegisterAdmin />,
      },
      {
        path: 'employees',
        element: <SuperAdminMembers />,
      },
      {
        path: 'register',
        element: <RegisterEmployee />,
      },
      {
        path: 'schedule',
        element: <SuperAdminSchedule />,
      },
      {
        path: 'schedule-diagnostic',
        element: <ScheduleDiagnostic />,
      },
      {
        path: 'schedule-test',
        element: <ScheduleSaveTest />,
      },
      {
        path: 'schedule-fix',
        element: <ScheduleQuickFix />,
      },
      {
        path: 'schedule-debug',
        element: <ScheduleDebugPanel />,
      },
      {
        path: 'attendance',
        element: <SuperAdminAttendance />,
      },
      {
        path: 'employee-attendance',
        element: <SuperAdminEmployeeAttendance />,
      },
      {
        path: 'leaves',
        element: <SuperAdminLeaveRequests />,
      },
      {
        path: 'reset-leave-balance',
        element: <ResetLeaveBalances />,
      },
      {
        path: 'scanner',
        element: <QRScanner />,
      },
      {
        path: 'geofence',
        element: <GeofenceSettings />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
      {
        path: 'fix-role',
        element: <FixSuperAdminRole />,
      },
      {
        path: 'initialize',
        element: <InitializeSuperAdmin />,
      },
      {
        path: 'debug',
        element: <SuperAdminDebug />,
      },
      {
        path: 'view-accounts',
        element: <ViewAccounts />,
      },
      {
        path: 'password-fixer',
        element: <SuperAdminPasswordFixer />,
      },
      {
        path: 'diagnostic',
        element: <ScheduleDiagnostic />,
      },
      {
        path: 'sql-fixer',
        element: <SuperAdminSQLFixer />,
      },
      {
        path: 'clear-storage',
        element: <ClearStorageUtility />,
      },
      {
        path: 'generate-admin-qr',
        element: <GenerateAdminQRCodes />,
      },
      {
        path: 'setup-admin-qr-column',
        element: <SetupAdminQRColumn />,
      },
    ],
  },
  {
    path: '/kiosk',
    element: <KioskModeEnhanced />,
  },
  {
    path: '/my-qrcode',
    element: <MyQRCode />,
  },
  {
    path: '/geofence-settings',
    Component: GeofenceSettings,
  },
  {
    path: '/view-accounts',
    Component: ViewAccounts,
  },
  {
    path: '/simple-debug',
    Component: SimpleDebug,
  },
  {
    path: '/direct-login',
    Component: DirectLogin,
  },
  {
    path: '/database-initializer',
    Component: DatabaseInitializer,
  },
  {
    path: '/deployment-guide',
    element: <DeploymentGuide />,
  },
  {
    path: '/login-auto-fix',
    element: <LoginAutoFix />,
  },
  {
    path: '/manual-deployment-guide',
    element: <ManualDeploymentGuide />,
  },
  {
    path: '/login-diagnostic',
    element: <LoginDiagnostic />,
  },
  {
    path: '/login-credential-tester',
    element: <LoginCredentialTester />,
  },
  {
    path: '/diagnostic-hub',
    element: <DiagnosticHub />,
  },
  {
    path: '/quick-start',
    element: <QuickStart />,
  },
  {
    path: '/one-click-fix',
    element: <OneClickFix />,
  },
  {
    path: '/schema-fixer',
    element: <DatabaseSchemaFixer />,
  },
  {
    path: '/table-structure-diagnostic',
    element: <TableStructureDiagnostic />,
  },
  {
    path: '/direct-database-test',
    element: <DirectDatabaseTest />,
  },
  {
    path: '/manual-login-test',
    element: <ManualLoginTest />,
  },
  {
    path: '/login-test',
    element: <LoginTest />,
  },
  {
    path: '/quick-login-fix',
    element: <QuickLoginFix />,
  },
  {
    path: '/view-db-credentials',
    element: <ViewDatabaseCredentials />,
  },
  {
    path: '/database-diagnostic',
    element: <DatabaseDiagnostic />,
  },
  {
    path: '/table-schema-viewer',
    element: <TableSchemaViewer />,
  },
  {
    path: '/super-admin-diagnostic',
    element: <SuperAdminDiagnostic />,
  },
  {
    path: '/super-admin-sql-fixer',
    element: <SuperAdminSQLFixer />,
  },
  {
    path: '/clear-storage',
    element: <ClearStorageUtility />,
  },
  {
    path: '/attendance-diagnostic',
    element: <AttendanceDatabaseDiagnostic />,
  },
  {
    path: '/admin-qr-setup',
    element: <AdminQRCodeSetup />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/admin-kiosk-diagnostic',
    element: <AdminKioskDiagnostic />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/admin-database-diagnostic',
    element: <AdminDatabaseDiagnostic />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/kiosk-admin-test',
    element: <KioskAdminTest />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '*',
    Component: NotFound,
  },
]);
