import { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { ToastViewport } from "@/components/ui/ToastViewport";
import { PermissionRoute } from "@/components/guards/PermissionRoute";
import { supervisorPolicies } from "@/config/supervisorPolicies";
import { LoginPage } from "@/modules/auth/LoginPage";
import { DashboardPage } from "@/modules/dashboard";
import { CustomersPage } from "@/modules/customers/CustomersPage";
import { Customer360Page } from "@/modules/customers/Customer360Page";
import { CustomerForm } from "@/modules/customers/CustomerForm";
import { ProductsPage } from "@/modules/products/ProductsPage";
import { SalesPage } from "@/modules/sales/SalesPage";
import { InvoiceDetailPage } from "@/modules/sales/InvoiceDetailPage";
import { NewSalePage } from "@/modules/sales/NewSalePage";
import { CollectionsPage } from "@/modules/collections/CollectionsPage";
import { ReturnsPage } from "@/modules/returns/ReturnsPage";
import { InventoryIndexPage } from "@/modules/inventory/InventoryIndexPage";
import { WarehouseInventoryPage } from "@/modules/inventory/WarehouseInventoryPage";
import { VanInventoryPage } from "@/modules/inventory/VanInventoryPage";
import { TransfersPage } from "@/modules/inventory/TransfersPage";
import { RequestsPage } from "@/modules/inventory/RequestsPage";
import { MovementsPage } from "@/modules/inventory/MovementsPage";
import { CashPage } from "@/modules/cash/CashPage";
import { CustodyPage } from "@/modules/custody/CustodyPage";
import { RoutesPage } from "@/modules/routes/RoutesPage";
import { VisitsPage } from "@/modules/visits/VisitsPage";
import { GpsPage } from "@/modules/gps/GpsPage";
import { TrackingOverviewPage } from "@/modules/gps/TrackingOverviewPage";
import { TargetsPage } from "@/modules/targets/TargetsPage";
import { SupervisorPlansPage } from "@/modules/targets/SupervisorPlansPage";
import { CreditPage } from "@/modules/credit/CreditPage";
import { ApprovalsPage } from "@/modules/approvals/ApprovalsPage";
import { ApprovalDetailPage } from "@/modules/approvals/ApprovalDetailPage";
import { ProfitabilityPage } from "@/modules/profitability/ProfitabilityPage";
import { ProfitabilityDashboard } from "@/modules/profitability/ProfitabilityDashboard";
import { ProductProfitabilityPage } from "@/modules/profitability/ProductProfitabilityPage";
import { ReportsPage } from "@/modules/reports/ReportsPage";
import { CommissionPage } from "@/modules/commission/CommissionPage";
import { PolicyCenterPage } from "@/modules/policy/PolicyCenterPage";
import { AuditPage } from "@/modules/audit/AuditPage";
import { DistributionOfficerPage } from "@/modules/distribution-officer/DistributionOfficerPage";
import { DistributorPage } from "@/modules/distributor/DistributorPage";
import { ArchivePage } from "@/modules/archive/ArchivePage";
import { MessagesPage } from "@/modules/messages/MessagesPage";
import { LeavesPage } from "@/modules/leaves/LeavesPage";
import { UsersPage } from "@/modules/users/UsersPage";
import { OrganizationPage } from "@/modules/organization/OrganizationPage";
import { TerritoryManagementPage } from "@/modules/organization/TerritoryManagementPage";
import { CostCentersPage } from "@/modules/organization/CostCentersPage";
import { OrganizationDashboard } from "@/modules/organization/OrganizationDashboard";
import { RepManagementPage } from "@/modules/organization/RepManagementPage";
import { RepReassignmentPage } from "@/modules/organization/RepReassignmentPage";
import { SupervisorManagementPage } from "@/modules/organization/SupervisorManagementPage";
import { CustomerAssignmentPage } from "@/modules/organization/CustomerAssignmentPage";
import { CustomerTransferPage } from "@/modules/organization/CustomerTransferPage";
import { AssignmentHistoryPage } from "@/modules/organization/AssignmentHistoryPage";
import { AuditLogPage as OrganizationAuditLogPage } from "@/modules/organization/AuditLogPage";
import { SettingsPage } from "@/modules/settings/SettingsPage";
import { DailyPlanPage } from "@/modules/rep/DailyPlanPage";
import { VisitWorkspace } from "@/modules/rep/VisitWorkspace";
import { TargetOrganizationsPage } from "@/modules/rep/TargetOrganizationsPage";
import { DailyClosingPage } from "@/modules/rep/DailyClosingPage";
import { SyncCenterPage } from "@/modules/rep/SyncCenterPage";
import { LoadingPage } from "@/modules/rep/LoadingPage";
import { DashboardPage as RepDashboardPage } from "@/modules/rep/DashboardPage";
import { CustomersPage as RepCustomersPage, Customer360Page as RepCustomer360Page } from "@/modules/rep/CustomersPage";
import { VanInventoryPage as RepVanInventoryPage } from "@/modules/rep/VanInventoryPage";
import { CustodyPage as RepCustodyPage } from "@/modules/rep/CustodyPage";
import { ReportsPage as RepReportsPage } from "@/modules/rep/ReportsPage";
import { MessagesPage as RepMessagesPage } from "@/modules/messages/MessagesPage";
import { ReceivingPage } from "@/modules/rep/ReceivingPage";
import { StockRequestsPage } from "@/modules/rep/StockRequestsPage";
import { StockTransfersPage } from "@/modules/rep/StockTransfersPage";
import { RepGpsPage } from "@/modules/rep/RepGpsPage";
import { ProductsPage as RepProductsPage } from "@/modules/rep/ProductsPage";
import { CashBoxPage as RepCashBoxPage } from "@/modules/rep/CashBoxPage";
import { DataScopeTestPage } from "@/modules/dev/DataScopeTestPage";
import { SupervisorHomePage } from "@/modules/supervisor/pages/dashboard/SupervisorHomePage";
import { PlanningDashboard } from "@/modules/planning/PlanningDashboard";
import { TeamPage } from "@/modules/supervisor/pages/team/TeamPage";
import { RepDetailPage } from "@/modules/supervisor/pages/team/RepDetailPage";
import { TeamPerformancePage } from "@/modules/supervisor/pages/team/TeamPerformancePage";
import { TeamNotesPage } from "@/modules/supervisor/pages/team/TeamNotesPage";
import { DailyPlanningPage } from "@/modules/supervisor/pages/planning/DailyPlanningPage";
import { CustomerAssignmentsPage } from "@/modules/supervisor/pages/planning/CustomerAssignmentsPage";
import { RoutePlansPage } from "@/modules/supervisor/pages/planning/RoutePlansPage";
import { TeamGpsPage } from "@/modules/supervisor/pages/field/TeamGpsPage";
import { LiveTrackingPage } from "@/modules/supervisor/pages/field/LiveTrackingPage";
import { TeamTripsPage } from "@/modules/supervisor/pages/field/TeamTripsPage";
import { TeamVisitsPage } from "@/modules/supervisor/pages/field/TeamVisitsPage";
import { RouteDeviationsPage } from "@/modules/supervisor/pages/field/RouteDeviationsPage";
import { FieldMonitoringPage } from "@/modules/supervisor/pages/field/FieldMonitoringPage";
import { TeamCustomersPage } from "@/modules/supervisor/pages/customers/TeamCustomersPage";
import { CustomerTransfersPage } from "@/modules/supervisor/pages/customers/CustomerTransfersPage";
import { SuspendedCustomersPage } from "@/modules/supervisor/pages/customers/SuspendedCustomersPage";
import { TargetCustomersPage } from "@/modules/supervisor/pages/customers/TargetCustomersPage";
import { DebtsAgingPage } from "@/modules/supervisor/pages/customers/DebtsAgingPage";
import { DebtsPage } from "@/modules/supervisor/pages/customers/DebtsPage";
import { TeamInventoryPage } from "@/modules/supervisor/pages/inventory/TeamInventoryPage";
import { TeamInventoryRequestsPage } from "@/modules/supervisor/pages/inventory/TeamInventoryRequestsPage";
import { TeamInventoryTransfersPage } from "@/modules/supervisor/pages/inventory/TeamInventoryTransfersPage";
import { TeamReceivingPage } from "@/modules/supervisor/pages/inventory/TeamReceivingPage";
import { PrepareGoodsPage } from "@/modules/supervisor/pages/inventory/PrepareGoodsPage";
import { TeamCashPage } from "@/modules/supervisor/pages/cash/TeamCashPage";
import { CashMovementsPage } from "@/modules/supervisor/pages/cash/CashMovementsPage";
import { CashDepositsPage } from "@/modules/supervisor/pages/cash/CashDepositsPage";
import { CashReconciliationPage } from "@/modules/supervisor/pages/cash/CashReconciliationPage";
import { AssetsPage } from "@/modules/supervisor/pages/assets/AssetsPage";
import { AssetRequestsPage } from "@/modules/supervisor/pages/assets/AssetRequestsPage";
import { RequestsPage as SupervisorRequestsPage } from "@/modules/supervisor/pages/requests/RequestsPage";
import { ActivityPage } from "@/modules/supervisor/pages/activity/ActivityPage";

export default function App() {
  return (
    <BrowserRouter>
      <ToastViewport />
      <Suspense fallback={<LoadingState label="جارٍ تحميل التطبيق..." />}>
        <Routes>
          <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<PermissionRoute permission="dashboard.view" roles={["REPRESENTATIVE","SUPERVISOR","SALES_MANAGER","DISTRIBUTION_OFFICER","DISTRIBUTOR","WAREHOUSE","FINANCE","GENERAL_MANAGER","SYSTEM_ADMIN","AUDITOR","HR"]}><DashboardPage /></PermissionRoute>} />
            <Route path="planning" element={<PermissionRoute permission="routes.view"><PlanningDashboard /></PermissionRoute>} />
            <Route path="customers" element={<PermissionRoute permission="customers.view"><CustomersPage /></PermissionRoute>} />
            <Route path="customers/new" element={<PermissionRoute permission="customers.create"><CustomerForm /></PermissionRoute>} />
            <Route path="customers/:id" element={<PermissionRoute permission="customers.view"><Customer360Page /></PermissionRoute>} />
            <Route path="products" element={<PermissionRoute permission="products.view"><ProductsPage /></PermissionRoute>} />
            <Route path="sales" element={<PermissionRoute permission="sales.view"><SalesPage /></PermissionRoute>} />
            <Route path="sales/new" element={<PermissionRoute permission="sales.create"><NewSalePage /></PermissionRoute>} />
            <Route path="sales/:id" element={<PermissionRoute permission="sales.view"><InvoiceDetailPage /></PermissionRoute>} />
            <Route path="collections" element={<PermissionRoute permission="collections.view"><CollectionsPage /></PermissionRoute>} />
            <Route path="returns" element={<PermissionRoute permission="returns.view"><ReturnsPage /></PermissionRoute>} />
            <Route path="inventory" element={<PermissionRoute permission="inventory.view"><InventoryIndexPage /></PermissionRoute>} />
            <Route path="inventory/warehouse" element={<PermissionRoute permission="inventory.view" roles={["GENERAL_MANAGER", "SALES_MANAGER", "SUPERVISOR"]}><WarehouseInventoryPage /></PermissionRoute>} />
            <Route path="inventory/van" element={<PermissionRoute permission="inventory.view"><VanInventoryPage /></PermissionRoute>} />
            <Route path="inventory/transfers" element={<PermissionRoute permission="inventory.view"><TransfersPage /></PermissionRoute>} />
            <Route path="inventory/requests" element={<PermissionRoute permission="inventory.view"><RequestsPage /></PermissionRoute>} />
            <Route path="inventory/movements" element={<PermissionRoute permission="inventory.view"><MovementsPage /></PermissionRoute>} />
            <Route path="cash" element={<PermissionRoute permission="cash.view"><CashPage /></PermissionRoute>} />
            <Route path="custody" element={<PermissionRoute permission="custody.view"><CustodyPage /></PermissionRoute>} />
            <Route path="routes" element={<PermissionRoute permission="routes.view"><RoutesPage /></PermissionRoute>} />
            <Route path="visits" element={<PermissionRoute permission="visits.view"><VisitsPage /></PermissionRoute>} />
            <Route path="gps" element={<PermissionRoute permission="gps.view"><GpsPage /></PermissionRoute>} />
            <Route path="gps/tracking-overview" element={<PermissionRoute permission="gps.view" roles={["GENERAL_MANAGER","SALES_MANAGER"]}><TrackingOverviewPage /></PermissionRoute>} />
            <Route path="targets" element={<PermissionRoute permission="targets.view"><TargetsPage /></PermissionRoute>} />
            <Route path="targets/supervisor-plans" element={<PermissionRoute permission="targets.view" roles={["GENERAL_MANAGER","SALES_MANAGER"]}><SupervisorPlansPage /></PermissionRoute>} />
            <Route path="credit" element={<PermissionRoute permission="credit.view"><CreditPage /></PermissionRoute>} />
            <Route path="approvals" element={<PermissionRoute permission="approvals.view"><ApprovalsPage /></PermissionRoute>} />
            <Route path="approvals/:id" element={<PermissionRoute permission="approvals.view"><ApprovalDetailPage /></PermissionRoute>} />
<Route path="profitability" element={<PermissionRoute permission="profitability.view"><ProfitabilityPage /></PermissionRoute>} />
<Route path="profitability-dashboard" element={<PermissionRoute permission="profitability.view"><ProfitabilityDashboard /></PermissionRoute>} />
<Route path="product-profitability" element={<PermissionRoute permission="profitability.view"><ProductProfitabilityPage /></PermissionRoute>} />
<Route path="commission" element={<PermissionRoute permission="commission.view"><CommissionPage /></PermissionRoute>} />
            <Route path="policy" element={<PermissionRoute permission="policy.manage" roles={["SYSTEM_ADMIN"]}><PolicyCenterPage /></PermissionRoute>} />
<Route path="audit" element={<PermissionRoute permission="audit.view"><AuditPage /></PermissionRoute>} />
<Route path="distribution-officer" element={<PermissionRoute permission="distributor.manage"><DistributionOfficerPage /></PermissionRoute>} />
<Route path="distributor" element={<PermissionRoute permission="distributor.view"><DistributorPage /></PermissionRoute>} />
<Route path="reports" element={<PermissionRoute permission="reports.view"><ReportsPage /></PermissionRoute>} />
            <Route path="archive" element={<PermissionRoute permission="archive.view"><ArchivePage /></PermissionRoute>} />
            <Route path="messages" element={<PermissionRoute permission="messages.view"><MessagesPage /></PermissionRoute>} />
            <Route path="leaves" element={<PermissionRoute permission="leaves.view"><LeavesPage /></PermissionRoute>} />
            <Route path="users" element={<PermissionRoute permission="users.view"><UsersPage /></PermissionRoute>} />
            <Route path="organization" element={<PermissionRoute permission="organization.manage" roles={["GENERAL_MANAGER","SALES_MANAGER"]}><OrganizationDashboard /></PermissionRoute>} />
            <Route path="organization/dashboard" element={<PermissionRoute permission="organization.manage" roles={["GENERAL_MANAGER","SALES_MANAGER"]}><OrganizationDashboard /></PermissionRoute>} />
            <Route path="organization/territories" element={<PermissionRoute permission="organization.manage" roles={["GENERAL_MANAGER","SALES_MANAGER"]}><TerritoryManagementPage /></PermissionRoute>} />
            <Route path="organization/reps" element={<PermissionRoute permission="organization.manage" roles={["GENERAL_MANAGER","SALES_MANAGER"]}><RepManagementPage /></PermissionRoute>} />
            <Route path="organization/supervisors" element={<PermissionRoute permission="organization.manage" roles={["GENERAL_MANAGER","SALES_MANAGER"]}><SupervisorManagementPage /></PermissionRoute>} />
            <Route path="organization/assignments" element={<PermissionRoute permission="organization.manage" roles={["GENERAL_MANAGER","SALES_MANAGER"]}><CustomerAssignmentPage /></PermissionRoute>} />
            <Route path="organization/transfers" element={<PermissionRoute permission="organization.manage" roles={["GENERAL_MANAGER","SALES_MANAGER"]}><CustomerTransferPage /></PermissionRoute>} />
            <Route path="organization/history" element={<PermissionRoute permission="organization.manage" roles={["GENERAL_MANAGER","SALES_MANAGER"]}><AssignmentHistoryPage /></PermissionRoute>} />
            <Route path="organization/audit" element={<PermissionRoute permission="organization.manage" roles={["GENERAL_MANAGER","SALES_MANAGER"]}><OrganizationAuditLogPage /></PermissionRoute>} />
            <Route path="organization/cost-centers" element={<PermissionRoute permission="organization.manage" roles={["GENERAL_MANAGER","SALES_MANAGER"]}><CostCentersPage /></PermissionRoute>} />
            <Route path="settings" element={<PermissionRoute permission="settings.view"><SettingsPage /></PermissionRoute>} />
            <Route path="rep/plan" element={<PermissionRoute permission="trips.view"><DailyPlanPage /></PermissionRoute>} />
            <Route path="rep/visit/:customerId" element={<PermissionRoute permission="visits.create"><VisitWorkspace /></PermissionRoute>} />
            <Route path="rep/targets-org" element={<PermissionRoute permission="targets.org.view"><TargetOrganizationsPage /></PermissionRoute>} />
            <Route path="rep/closing" element={<PermissionRoute permission="closing.view"><DailyClosingPage /></PermissionRoute>} />
            <Route path="rep/sync" element={<PermissionRoute permission="sync.view"><SyncCenterPage /></PermissionRoute>} />
            <Route path="rep/loading" element={<PermissionRoute permission="loading.view"><LoadingPage /></PermissionRoute>} />
            <Route path="rep/dashboard" element={<PermissionRoute permission="dashboard.view" roles={["REPRESENTATIVE"]}><RepDashboardPage /></PermissionRoute>} />
            <Route path="rep/customers" element={<PermissionRoute permission="customers.view"><RepCustomersPage /></PermissionRoute>} />
            <Route path="rep/customer/:id" element={<PermissionRoute permission="customers.view"><RepCustomer360Page /></PermissionRoute>} />
            <Route path="rep/van" element={<PermissionRoute permission="inventory.view"><RepVanInventoryPage /></PermissionRoute>} />
            <Route path="rep/custody" element={<PermissionRoute permission="custody.view"><RepCustodyPage /></PermissionRoute>} />
            <Route path="rep/reports" element={<PermissionRoute permission="reports.view"><RepReportsPage /></PermissionRoute>} />
            <Route path="rep/messages" element={<PermissionRoute permission="messages.view"><RepMessagesPage /></PermissionRoute>} />
            <Route path="rep/receiving" element={<PermissionRoute permission="inventory.view"><ReceivingPage /></PermissionRoute>} />
            <Route path="rep/stock-requests" element={<PermissionRoute permission="inventory.request"><StockRequestsPage /></PermissionRoute>} />
            <Route path="rep/stock-transfers" element={<PermissionRoute permission="inventory.view"><StockTransfersPage /></PermissionRoute>} />
            <Route path="rep/gps" element={<PermissionRoute permission="gps.view"><RepGpsPage /></PermissionRoute>} />
            <Route path="rep/products" element={<PermissionRoute permission="products.view"><RepProductsPage /></PermissionRoute>} />
            <Route path="rep/cash" element={<PermissionRoute permission="cash.view"><RepCashBoxPage /></PermissionRoute>} />
            <Route path="dev/scope-test" element={<PermissionRoute permission="audit.view" roles={["SYSTEM_ADMIN"]} condition={import.meta.env.DEV}><DataScopeTestPage /></PermissionRoute>} />
            <Route path="supervisor/" element={<PermissionRoute permission="supervisor.team"><SupervisorHomePage /></PermissionRoute>} />
            <Route path="supervisor/dashboard" element={<PermissionRoute permission="supervisor.team"><SupervisorHomePage /></PermissionRoute>} />
            <Route path="supervisor/team" element={<PermissionRoute permission="supervisor.team"><TeamPage /></PermissionRoute>} />
            <Route path="supervisor/team/performance" element={<PermissionRoute permission="supervisor.team"><TeamPerformancePage /></PermissionRoute>} />
            <Route path="supervisor/team/notes" element={<PermissionRoute permission="supervisor.team"><TeamNotesPage /></PermissionRoute>} />
            <Route path="supervisor/activity" element={<PermissionRoute permission="supervisor.activity"><ActivityPage /></PermissionRoute>} />
            <Route path="supervisor/team/:repId" element={<PermissionRoute permission="supervisor.team"><RepDetailPage /></PermissionRoute>} />
            <Route path="supervisor/planning/routes" element={<PermissionRoute permission="supervisor.planning"><RoutePlansPage /></PermissionRoute>} />
            <Route path="supervisor/planning/daily" element={<PermissionRoute permission="supervisor.planning"><DailyPlanningPage /></PermissionRoute>} />
            <Route path="supervisor/planning/targets" element={<PermissionRoute permission="supervisor.planning"><TargetsPage /></PermissionRoute>} />
            <Route path="supervisor/planning/assignments" element={<PermissionRoute permission="supervisor.planning"><CustomerAssignmentsPage /></PermissionRoute>} />
            <Route path="supervisor/gps" element={<PermissionRoute permission="supervisor.field"><TeamGpsPage /></PermissionRoute>} />
            <Route path="supervisor/gps/live" element={<PermissionRoute permission="supervisor.field"><LiveTrackingPage /></PermissionRoute>} />
            <Route path="supervisor/gps/trips" element={<PermissionRoute permission="supervisor.field"><TeamTripsPage /></PermissionRoute>} />
            <Route path="supervisor/gps/visits" element={<PermissionRoute permission="supervisor.field"><TeamVisitsPage /></PermissionRoute>} />
            <Route path="supervisor/gps/deviations" element={<PermissionRoute permission="supervisor.field"><RouteDeviationsPage /></PermissionRoute>} />
            <Route path="supervisor/field" element={<PermissionRoute permission="supervisor.field"><FieldMonitoringPage /></PermissionRoute>} />
            <Route path="supervisor/customers" element={<PermissionRoute permission="supervisor.customers"><TeamCustomersPage /></PermissionRoute>} />
            <Route path="supervisor/customers/:id" element={<PermissionRoute permission="supervisor.customers"><Customer360Page /></PermissionRoute>} />
            <Route path="supervisor/customers/transfers" element={<PermissionRoute permission="supervisor.customers"><CustomerTransfersPage /></PermissionRoute>} />
            <Route path="supervisor/customers/suspended" element={<PermissionRoute permission="supervisor.customers"><SuspendedCustomersPage /></PermissionRoute>} />
            <Route path="supervisor/customers/targets" element={<PermissionRoute permission="supervisor.customers"><TargetCustomersPage /></PermissionRoute>} />
            <Route path="supervisor/debts/aging" element={<PermissionRoute permission="supervisor.customers"><DebtsAgingPage /></PermissionRoute>} />
            <Route path="supervisor/debts" element={<PermissionRoute permission="supervisor.customers"><DebtsPage /></PermissionRoute>} />
            <Route path="supervisor/inventory" element={<PermissionRoute permission="supervisor.inventory" condition={supervisorPolicies.features.supervisorWarehouse}><TeamInventoryPage /></PermissionRoute>} />
            <Route path="supervisor/inventory/requests" element={<PermissionRoute permission="supervisor.inventory" condition={supervisorPolicies.features.supervisorWarehouse}><TeamInventoryRequestsPage /></PermissionRoute>} />
            <Route path="supervisor/inventory/transfers" element={<PermissionRoute permission="supervisor.inventory" condition={supervisorPolicies.features.supervisorWarehouse}><TeamInventoryTransfersPage /></PermissionRoute>} />
            <Route path="supervisor/inventory/receiving" element={<PermissionRoute permission="supervisor.inventory" condition={supervisorPolicies.features.supervisorWarehouse}><TeamReceivingPage /></PermissionRoute>} />
            <Route path="supervisor/inventory/prepare" element={<PermissionRoute permission="supervisor.inventory" condition={supervisorPolicies.features.supervisorWarehouse}><PrepareGoodsPage /></PermissionRoute>} />
            <Route path="supervisor/cash" element={<PermissionRoute permission="supervisor.cash" condition={supervisorPolicies.features.supervisorCashBox}><TeamCashPage /></PermissionRoute>} />
            <Route path="supervisor/cash/movements" element={<PermissionRoute permission="supervisor.cash" condition={supervisorPolicies.features.supervisorCashBox}><CashMovementsPage /></PermissionRoute>} />
            <Route path="supervisor/cash/deposits" element={<PermissionRoute permission="supervisor.cash" condition={supervisorPolicies.features.supervisorCashBox}><CashDepositsPage /></PermissionRoute>} />
            <Route path="supervisor/cash/reconciliation" element={<PermissionRoute permission="supervisor.cash" condition={supervisorPolicies.features.supervisorCashBox}><CashReconciliationPage /></PermissionRoute>} />
            <Route path="supervisor/assets" element={<PermissionRoute permission="supervisor.assets"><AssetsPage /></PermissionRoute>} />
            <Route path="supervisor/assets/requests" element={<PermissionRoute permission="supervisor.assets"><AssetRequestsPage /></PermissionRoute>} />
            <Route path="supervisor/messages" element={<PermissionRoute permission="supervisor.comms"><MessagesPage /></PermissionRoute>} />
            <Route path="supervisor/requests" element={<PermissionRoute permission="supervisor.requests"><SupervisorRequestsPage /></PermissionRoute>} />
            <Route path="supervisor/planning" element={<Navigate to="/supervisor/planning/routes" replace />} />
            <Route path="supervisor/comms" element={<Navigate to="/supervisor/messages" replace />} />
            <Route path="*" element={<ErrorState message="الصفحة غير موجودة" />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}